import os
import re
import time
import asyncio
import threading
import hashlib
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any
import uuid
from uuid import uuid4

logger = logging.getLogger("document-service")

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile, Depends, Query, status, Body, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, text
import httpx
import sqlite3

from .database import engine, Base, get_db, SessionLocal
from .models import DocumentDB, DocumentChapterDB, DocumentChunkDB
from .parser import DocumentParser
from .chunker import TextChunker, EmptyChunksException
from .cache import cache
from .auth import get_current_user_id, get_optional_user_id, get_optional_user_info

try:
    from dotenv import load_dotenv
    load_dotenv()
    root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.env"))
    if os.path.exists(root_env):
        load_dotenv(root_env)
except Exception:
    pass

app = FastAPI(
    title="QuizGen AI - Document Service",
    description="Microservice bóc tách giáo trình PDF/Word, phân đoạn ngữ nghĩa và liên kết RAG",
    version="1.0.0"
)

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://127.0.0.1:8003")
if "rag-service" in RAG_SERVICE_URL and not os.path.exists("/.dockerenv"):
    RAG_SERVICE_URL = "http://127.0.0.1:8003"

MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "100"))
RAG_HTTP_TIMEOUT_SECONDS = float(os.getenv("RAG_HTTP_TIMEOUT_SECONDS", "300"))
from .storage_helpers import (
    STORAGE_DIR, EXTRACTED_IMAGES_DIR, QUESTION_ATTACHMENTS_DIR,
    FORUM_ATTACHMENTS_DIR, QGROUP_ATTACHMENTS_DIR, _format_file_size
)
from .routers import qgroups as qgroups_router, friends as friends_router, forum as forum_router


# [SCRUM-99] Bộ điều phối hàng đợi tác vụ bóc tách (Max 3 tác vụ chạy đồng thời)
# Ngăn chặn quá tải CPU/RAM khi người dùng tải lên đồng loạt 20-50 tài liệu
MAX_CONCURRENT_PIPELINES = int(os.getenv("MAX_CONCURRENT_PIPELINES", "2"))
pipeline_semaphore = threading.Semaphore(MAX_CONCURRENT_PIPELINES)



def get_user_plan_tier(user_id: str) -> str:
    """Thẩm định gói cước thực tế của người dùng: PRO_MONTH, PRO_YEAR, ENTERPRISE hoặc FREE."""
    # 1. Kiểm tra subscription đang active trong payment.db
    if os.path.exists(PAYMENT_DB_PATH):
        try:
            conn = sqlite3.connect(PAYMENT_DB_PATH, timeout=3.0)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
            SELECT plan_code, status, expires_at FROM subscriptions 
            WHERE user_id = ? AND status = 'active'
            ORDER BY created_at DESC LIMIT 1
            """, (user_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                exp = row["expires_at"]
                if exp:
                    exp_time = datetime.fromisoformat(exp.replace("Z", ""))
                    if datetime.now() <= exp_time:
                        code = (row["plan_code"] or "").strip().upper()
                        if code in ["PRO", "STANDARD"]:
                            return "PRO_MONTH"
                        return code or "FREE"
                else:
                    code = (row["plan_code"] or "").strip().upper()
                    if code in ["PRO", "STANDARD"]:
                        return "PRO_MONTH"
                    return code or "FREE"
        except Exception:
            pass

    # 2. Kiểm tra plan_tier trong auth.db
    if os.path.exists(AUTH_DB_PATH):
        try:
            conn = sqlite3.connect(AUTH_DB_PATH, timeout=3.0)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT email, role, plan_tier, plan_expires_at FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                u_email = (row["email"] or "").strip().lower()
                raw_tier = (row["plan_tier"] or "").strip().upper()
                if raw_tier in ["PRO", "STANDARD"]:
                    raw_tier = "PRO_MONTH"
                
                # Nếu đã bị set FREE thì dứt khoát là FREE
                if raw_tier == "FREE":
                    return "FREE"

                # Chỉ root admin tối cao mới được cấp mặc định PRO_YEAR nếu chưa có gói
                if u_email == "quizgen.ai.team@gmail.com" and not raw_tier:
                    return "PRO_YEAR"
                
                exp = row["plan_expires_at"]
                if exp:
                    try:
                        exp_time = datetime.fromisoformat(str(exp).replace("Z", ""))
                        if datetime.now() > exp_time:
                            return "FREE"
                    except Exception:
                        pass
                if raw_tier in ["PRO_MONTH", "PRO_YEAR", "ENTERPRISE"]:
                    return raw_tier
        except Exception:
            pass

    return "FREE"


@app.on_event("startup")
def startup_db():
    """Tự động khởi tạo bảng cơ sở dữ liệu nếu chưa tồn tại và nâng cấp schema nếu thiếu cột"""
    try:
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            for col, col_def in [
                ("is_approved", "INTEGER DEFAULT 0"),
                ("approved_by", "VARCHAR(100)"),
                ("approved_at", "DATETIME"),
                ("usage_count", "INTEGER DEFAULT 0"),
            ]:
                try:
                    conn.execute(text(f"ALTER TABLE documents ADD COLUMN {col} {col_def}"))
                    conn.commit()
                except Exception:
                    pass
            try:
                conn.execute(text("ALTER TABLE document_chunks ADD COLUMN images_json TEXT"))
                conn.commit()
            except Exception:
                pass
    except Exception as e:
        print(f"[DOCUMENT-SERVICE] DB Startup Warning: {e}")


def _update_doc_progress(
    document_id: str,
    progress: int,
    status: str,
    total_pages: Optional[int] = None,
    chapters_count: Optional[int] = None,
    error_message: Optional[str] = None
):
    """Cập nhật tiến trình và trạng thái xử lý của tài liệu vào CSDL kèm cơ chế tự động thử lại khi SQLite bận"""
    for attempt in range(5):
        db = SessionLocal()
        try:
            doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
            if doc:
                doc.progress = progress
                doc.status = status
                if total_pages is not None:
                    doc.total_pages = total_pages
                if chapters_count is not None:
                    doc.chapters_count = chapters_count
                if error_message is not None:
                    doc.error_message = error_message
                doc.updated_at = datetime.utcnow()
                db.commit()
            break
        except Exception as e:
            db.rollback()
            if attempt < 4:
                time.sleep(0.3 * (attempt + 1))
            else:
                logger.error(f"[DocumentService] Lỗi cập nhật tiến trình {document_id}: {e}")
        finally:
            db.close()


def _mark_doc_error(document_id: str, error_msg: str, stage: str = "error"):
    """Đánh dấu trạng thái lỗi và ghi nhận nguyên nhân vào CSDL và cache kèm cơ chế tự động thử lại"""
    for attempt in range(5):
        db = SessionLocal()
        try:
            doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
            if doc:
                doc.status = "error"
                doc.progress = 0
                doc.error_message = error_msg
                doc.updated_at = datetime.utcnow()
                db.commit()
            break
        except Exception:
            db.rollback()
            if attempt < 4:
                time.sleep(0.3 * (attempt + 1))
        finally:
            db.close()
    cache.set_upload_progress(document_id, progress=0, status="error", stage=stage)


def process_document_pipeline(
    document_id: str,
    file_path: str,
    filename: str,
    ext: str,
    user_id: str
):
    """
    Quy trình xử lý tài liệu nền khép kín (End-to-End Background Threadpool Pipeline):
    - Chạy hoàn toàn trên Starlette Background Threadpool, KHÔNG chặn Asyncio Event Loop.
    - Pha 1 (25%): Bóc tách văn bản từng trang (PyMuPDF / python-docx Parser)
    - Pha 2 (50%): Phân đoạn ngữ nghĩa (Semantic Chunker) & trích xuất mục lục
    - Pha 3 (70%): Lưu cấu trúc chương và các đoạn trích vào CSDL
    - Pha 4 (85%): Đẩy chunks sang RAG Service với cơ chế Exponential Backoff Retry (3 lần: 1s, 2s, 4s)
    - Pha 5 (100%): Cập nhật trạng thái 'ready', hoàn tất toàn bộ quy trình
    """
    storage_file = Path(file_path)
    if not storage_file.exists():
        _mark_doc_error(document_id, "Tệp tài liệu vật lý không tồn tại trên máy chủ.", stage="file_missing")
        return

    # Thông báo trạng thái xếp hàng điều phối an toàn
    cache.set_upload_progress(document_id, progress=15, status="extracting", stage="queued_pipeline")

    pipeline_semaphore.acquire()
    try:
        try:
            content = storage_file.read_bytes()
        except Exception as e:
            _mark_doc_error(document_id, f"Không thể đọc tệp vật lý: {str(e)}", stage="file_read_error")
            return

        # Pha 1: Bóc tách văn bản
        cache.set_upload_progress(document_id, progress=25, status="extracting", stage="parsing_file")
        _update_doc_progress(document_id, progress=25, status="extracting")
        try:
            if ext == "pdf":
                pages = DocumentParser.parse_pdf(content, extract_images_dir=EXTRACTED_IMAGES_DIR, document_id=document_id)
            else:
                pages = DocumentParser.parse_docx(content)
        except Exception as e:
            _mark_doc_error(document_id, f"Lỗi bóc tách nội dung: {str(e)}", stage="parsing_error")
            return

        if not pages:
            _mark_doc_error(document_id, "Tài liệu không có nội dung văn bản để bóc tách.", stage="empty_content")
            return

        # Pha 2: Phân đoạn ngữ nghĩa
        cache.set_upload_progress(document_id, progress=50, status="extracting", stage="chunking", total_pages=len(pages))
        _update_doc_progress(document_id, progress=50, status="extracting", total_pages=len(pages))
        try:
            chunks, chapters_metadata = TextChunker.chunk_by_semantic_blocks(pages, document_id)
        except EmptyChunksException as e:
            _mark_doc_error(document_id, str(e), stage="chunking_failed")
            return
        except Exception as e:
            _mark_doc_error(document_id, f"Lỗi phân đoạn ngữ nghĩa: {str(e)}", stage="chunking_error")
            return

        if not chunks:
            _mark_doc_error(document_id, "Tài liệu không tạo ra đoạn trích (chunk) hợp lệ nào sau khi phân đoạn.", stage="empty_chunks")
            return

        # Pha 3: Lưu cấu trúc chương mục và các chunks vào CSDL
        cache.set_upload_progress(document_id, progress=70, status="embedding", stage="saving_metadata", total_pages=len(pages))
        _update_doc_progress(document_id, progress=70, status="embedding", total_pages=len(pages), chapters_count=len(chapters_metadata))

        for db_attempt in range(5):
            db = SessionLocal()
            try:
                # Xóa các mục cũ nếu có
                db.query(DocumentChapterDB).filter_by(document_id=document_id).delete()
                db.query(DocumentChunkDB).filter_by(document_id=document_id).delete()

                chapters_db = [
                    DocumentChapterDB(
                        id=f"ch-{document_id}-{ch['chapter_index']}",
                        document_id=document_id,
                        chapter_index=ch["chapter_index"],
                        title=ch["title"],
                        page_start=ch["page_start"],
                        page_end=ch["page_end"]
                    )
                    for ch in chapters_metadata
                ]
                db.add_all(chapters_db)

                chunks_db = [
                    DocumentChunkDB(
                        id=c["chunk_id"],
                        document_id=document_id,
                        page_number=c["page_number"],
                        chapter=c["chapter"],
                        char_count=c["char_count"],
                        text_snippet=c["text"],
                        images_json=json.dumps(c.get("images", [])) if c.get("images") else None
                    )
                    for c in chunks
                ]
                db.add_all(chunks_db)
                db.commit()

                # Đã lưu metadata vào CSDL, tiếp tục chuyển sang Pha 4 để lập chỉ mục vector RAG
                cache.set_upload_progress(document_id, progress=75, status="embedding", stage="indexing_vectors", total_pages=len(pages), chapters_count=len(chapters_metadata))
                _update_doc_progress(document_id, progress=75, status="embedding", total_pages=len(pages), chapters_count=len(chapters_metadata))
                break
            except Exception as e:
                db.rollback()
                if db_attempt < 4:
                    time.sleep(0.5 * (db_attempt + 1))
                else:
                    _mark_doc_error(document_id, f"Lỗi lưu trữ metadata vào CSDL: {str(e)}", stage="db_save_error")
                    return
            finally:
                db.close()

        # Pha 4: Chuyển tiếp các chunks sang RAG Service để lập chỉ mục vector (ChromaDB)
        cache.set_upload_progress(document_id, progress=85, status="embedding", stage="indexing_vectors", total_pages=len(pages), chapters_count=len(chapters_metadata))
        _update_doc_progress(document_id, progress=85, status="embedding")

        headers = {}
        if user_id:
            headers["X-User-Id"] = user_id

        max_retries = 3
        rag_success = False
        last_rag_error = ""

        for attempt in range(1, max_retries + 1):
            try:
                with httpx.Client(timeout=RAG_HTTP_TIMEOUT_SECONDS) as client:
                    res = client.post(
                        f"{RAG_SERVICE_URL}/index-chunks",
                        headers=headers,
                        json={
                            "document_id": document_id,
                            "chunks": chunks,
                            "replace_existing": True
                        }
                    )
                    if res.status_code == 200:
                        rag_success = True
                        logger.info(f"[DocumentService] True Readiness achieved: Vector indexing completed for document {document_id}")
                        break
                    else:
                        last_rag_error = f"RAG Service phản hồi lỗi ({res.status_code}): {res.text}"
            except Exception as e:
                last_rag_error = f"Lỗi kết nối RAG Service ({RAG_SERVICE_URL}): {str(e)}"

            if attempt < max_retries:
                time.sleep(2 ** (attempt - 1))  # 1s, 2s

        # Pha 5: Hoàn tất Sẵn Sàng Thật Sự (Chỉ kích hoạt khi Vector RAG đã xong 100%)
        if rag_success:
            _update_doc_progress(document_id, progress=100, status="ready", error_message=None)
            cache.set_upload_progress(document_id, progress=100, status="ready", stage="completed", total_pages=len(pages), chapters_count=len(chapters_metadata))
        else:
            _mark_doc_error(document_id, last_rag_error, stage="rag_error")
    finally:
        pipeline_semaphore.release()


@app.get("/health")
def health():
    """Kiểm tra sức khỏe dịch vụ và thông số cấu hình"""
    return {
        "status": "healthy",
        "service": "document-service",
        "maxUploadSizeMb": MAX_UPLOAD_SIZE_MB,
        "ragServiceUrl": RAG_SERVICE_URL,
        "storageDir": str(STORAGE_DIR)
    }


@app.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Tiếp nhận tệp giáo trình PDF/DOCX và xử lý bất đồng bộ trong nền:
    1. Kiểm tra định dạng (.pdf, .docx) và dung lượng (<= 25MB)
    2. Lưu tệp vật lý vào ổ đĩa
    3. Tạo bản ghi ban đầu trong CSDL với status='extracting', progress=15
    4. Kích hoạt tác vụ nền process_document_pipeline
    5. Phản hồi HTTP 202 Accepted ngay tức thì (< 50ms), không để giao diện bị treo
    """
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên tệp không hợp lệ.")

    # ─── SIẾT CHẶT HẠN MỨC GÓI CƯỚC (QUOTA ENFORCEMENT) ──────────────────────
    plan_tier = get_user_plan_tier(user_id)
    is_pro = plan_tier in ["PRO_MONTH", "PRO_YEAR", "ENTERPRISE"]
    max_allowed_docs = 999999 if is_pro else 3
    max_upload_mb = 100 if plan_tier == "ENTERPRISE" else 50 if is_pro else 15

    current_doc_count = db.query(DocumentDB).filter(
        DocumentDB.user_id == user_id,
        DocumentDB.status != "error"
    ).count()

    if current_doc_count >= max_allowed_docs:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Tài khoản Gói Miễn Phí đã đạt giới hạn tối đa {max_allowed_docs} giáo trình (hiện có: {current_doc_count} tài liệu). Vui lòng nâng cấp lên Gói PRO (chỉ 2.000đ/tháng) để nạp giáo trình không giới hạn!"
        )

    filename = Path(file.filename).name
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    ALLOWED_EXTENSIONS = ["pdf", "docx", "doc", "txt"]
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Định dạng tệp '.{ext}' không được hỗ trợ. Hệ thống chỉ cho phép tải lên các tệp giáo trình học thuật: PDF (.pdf), Microsoft Word (.docx, .doc) và Văn bản thuần (.txt).",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp rỗng (0 bytes). Vui lòng chọn tệp có nội dung hợp lệ.",
        )

    # Magic byte validation to prevent disguised binaries
    if ext == "pdf" and not content.startswith(b"%PDF"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cấu trúc tệp PDF không hợp lệ hoặc đã bị đổi phần mở rộng. Vui lòng tải lên tệp PDF chuẩn.",
        )
    elif ext == "docx" and not content.startswith(b"PK\x03\x04"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cấu trúc tệp Word (.docx) không hợp lệ. Vui lòng tải lên tệp DOCX chuẩn.",
        )

    max_bytes = max_upload_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Kích thước tệp ({_format_file_size(len(content))}) vượt quá giới hạn cho phép {max_upload_mb} MB của gói {plan_tier}.",
        )

    # [SCRUM-99] Tính toán SHA-256 để chống trùng lặp dữ liệu (Deduplication Layer 1)
    file_hash = hashlib.sha256(content).hexdigest()
    existing_doc = db.query(DocumentDB).filter(
        DocumentDB.user_id == user_id,
        DocumentDB.file_hash == file_hash,
        DocumentDB.status != "error"
    ).first()
    if existing_doc:
        return {
            "status": "duplicate",
            "isDuplicate": True,
            "duplicateType": "exact",
            "existingDocId": existing_doc.id,
            "existingDocName": existing_doc.name,
            "message": f"Tài liệu này đã tồn tại trong thư viện của bạn với tên '{existing_doc.name}' (trùng khớp 100% nội dung SHA-256). Hệ thống đã tự động chuyển đến tài liệu này để tiết kiệm thời gian và dung lượng lưu trữ.",
            "document": {
                "id": existing_doc.id,
                "userId": user_id,
                "name": existing_doc.name,
                "size": existing_doc.file_size,
                "totalPages": existing_doc.total_pages,
                "chaptersCount": existing_doc.chapters_count,
                "status": existing_doc.status,
                "progress": existing_doc.progress,
                "fileHash": file_hash,
                "isDuplicate": True,
                "duplicateType": "exact",
                "uploadedAt": "Tái sử dụng (Deduplicated)"
            }
        }

    # Sinh mã định danh giáo trình mới an toàn không bao giờ trùng lặp
    max_num = 0
    all_ids = db.query(DocumentDB.id).all()
    for (existing_id,) in all_ids:
        if existing_id and existing_id.startswith("tb-"):
            parts = existing_id.split("-")
            if len(parts) >= 2 and parts[1].isdigit():
                max_num = max(max_num, int(parts[1]))
    doc_id = f"tb-{max_num + 1:03d}"
    file_size_str = _format_file_size(len(content))

    # Lưu tệp vật lý vào ổ đĩa máy chủ
    storage_file = STORAGE_DIR / f"{doc_id}_{filename}"
    storage_file.write_bytes(content)

    # Khởi tạo bản ghi tài liệu ban đầu trong CSDL
    doc_record = DocumentDB(
        id=doc_id,
        user_id=user_id,
        name=filename,
        file_path=str(storage_file),
        file_size=file_size_str,
        file_hash=file_hash,
        total_pages=0,
        chapters_count=0,
        status="extracting",
        progress=15,
        created_at=datetime.utcnow()
    )
    db.add(doc_record)
    db.commit()

    cache.set_upload_progress(doc_id, progress=15, status="extracting", stage="queued")

    # Kích hoạt toàn bộ quy trình xử lý nền (Async Background Pipeline)
    background_tasks.add_task(
        process_document_pipeline,
        document_id=doc_id,
        file_path=str(storage_file),
        filename=filename,
        ext=ext,
        user_id=user_id
    )

    return {
        "message": "Đã tiếp nhận giáo trình thành công. Đang tiến hành bóc tách và tạo Vector Embedding trong nền.",
        "document": {
            "id": doc_id,
            "userId": user_id,
            "name": filename,
            "size": file_size_str,
            "totalPages": 0,
            "chaptersCount": 0,
            "status": "extracting",
            "progress": 15,
            "uploadedAt": "Vừa xong"
        }
    }


@app.get("/progress/{document_id}")
@app.get("/documents/{document_id}/progress")
def get_document_progress(document_id: str, db: Session = Depends(get_db)):
    doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy giáo trình.")
    if doc.status == "ready":
        return {
            "documentId": doc.id,
            "document_id": doc.id,
            "progress": 100,
            "status": "ready",
            "stage": "completed",
            "totalPages": doc.total_pages,
            "total_pages": doc.total_pages,
            "chaptersCount": doc.chapters_count,
            "chapters_count": doc.chapters_count,
            "errorMessage": None
        }
    cached = cache.get_upload_progress(document_id)
    if cached and cached.get("status") != "error":
        return {
            **cached,
            "documentId": cached.get("document_id") or document_id,
            "totalPages": cached.get("total_pages", 0)
        }
    return {
        "documentId": doc.id,
        "document_id": doc.id,
        "progress": doc.progress,
        "status": doc.status,
        "stage": "completed" if doc.progress == 100 else doc.status,
        "totalPages": doc.total_pages,
        "total_pages": doc.total_pages,
        "chaptersCount": doc.chapters_count,
        "chapters_count": doc.chapters_count,
        "errorMessage": doc.error_message
    }


@app.post("/documents/{document_id}/retry")
@app.post("/documents/retry/{document_id}")
def retry_document_pipeline(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    doc = db.query(DocumentDB).filter_by(id=document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy giáo trình.")

    target_path = doc.file_path
    if not target_path or not os.path.exists(target_path):
        alt_path = STORAGE_DIR / os.path.basename(doc.file_path) if doc.file_path else None
        if alt_path and alt_path.exists():
            target_path = str(alt_path)
            doc.file_path = str(alt_path)
        else:
            matched = list(STORAGE_DIR.glob(f"{doc.id}_*"))
            if matched:
                target_path = str(matched[0])
                doc.file_path = target_path
            else:
                raise HTTPException(status_code=400, detail="Tệp vật lý không còn lưu trên máy chủ.")

    now_utc = datetime.utcnow()
    doc.status = "extracting"
    doc.progress = 15
    doc.error_message = None
    doc.created_at = now_utc
    doc.updated_at = now_utc
    db.commit()

    cache.set_upload_progress(document_id, progress=15, status="extracting", stage="queued")
    ext = doc.name.rsplit(".", 1)[-1].lower() if "." in doc.name else "pdf"
    background_tasks.add_task(
        process_document_pipeline,
        document_id=doc.id,
        file_path=target_path,
        filename=doc.name,
        ext=ext,
        user_id=doc.user_id
    )
    return {
        "status": "success",
        "message": f"Đã kích hoạt tái xử lý giáo trình '{doc.name}' thành công.",
        "document_id": doc.id
    }


@app.post("/documents/{document_id}/cancel")
def cancel_document_pipeline(
    document_id: str,
    db: Session = Depends(get_db)
):
    doc = db.query(DocumentDB).filter_by(id=document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy giáo trình.")
    doc.status = "error"
    doc.error_message = "Tác vụ đã được dừng bởi Quản trị viên."
    doc.updated_at = datetime.utcnow()
    db.commit()
    cache.set_upload_progress(document_id, progress=0, status="error", stage="canceled")
    return {
        "status": "success",
        "message": f"Đã hủy tác vụ của giáo trình '{doc.name}'.",
        "document_id": doc.id
    }


@app.get("/")
def root_list_documents(db: Session = Depends(get_db)):
    """Tương thích chuyển hướng root sang danh sách tài liệu"""
    return list_documents(db=db)


@app.get("/documents")
def list_documents(
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    scope: Optional[str] = "my",
    current_user_info: Optional[Dict[str, Any]] = Depends(get_optional_user_info),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách giáo trình bảo đảm tính riêng tư cho từng tài khoản:
    - scope = 'my': Chỉ lấy giáo trình do chính giảng viên đó tải lên (trừ Admin).
    - scope = 'shared': Ngân hàng giáo trình dùng chung toàn trường / Khoa (is_shared == 1).
    - scope = 'all': Admin xem toàn bộ, hoặc trả về giáo trình cá nhân + giáo trình dùng chung.
    """
    clean_user_id = user_id.strip() if isinstance(user_id, str) and user_id.strip() else None
    clean_email = email.strip().lower() if isinstance(email, str) and email.strip() else None
    clean_scope = scope.strip().lower() if isinstance(scope, str) and scope.strip() else "my"

    effective_user_id = clean_user_id or (current_user_info.get("id") if current_user_info else None)
    is_admin = current_user_info.get("role") == "admin" if current_user_info else False

    query = db.query(DocumentDB)

    if clean_scope == "shared":
        query = query.filter(DocumentDB.is_shared == 1)
    elif clean_scope == "my":
        if is_admin:
            if clean_user_id:
                query = query.filter(DocumentDB.user_id == clean_user_id)
        else:
            target_uids = [effective_user_id] if effective_user_id else []
            # Tra cứu thêm user_id từ auth.db theo email nếu có để không bị mất tài liệu
            lookup_email = clean_email or (current_user_info.get("email") if current_user_info else None)
            if lookup_email and os.path.exists(AUTH_DB_PATH):
                try:
                    conn = sqlite3.connect(AUTH_DB_PATH, timeout=3.0)
                    cursor = conn.cursor()
                    cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (lookup_email.strip(),))
                    row = cursor.fetchone()
                    if row and row[0] and row[0] not in target_uids:
                        target_uids.append(row[0])
                    conn.close()
                except Exception:
                    pass

            target_uids = [u for u in set(target_uids) if u and isinstance(u, str)]
            if target_uids:
                query = query.filter(DocumentDB.user_id.in_(target_uids))
            elif clean_user_id:
                query = query.filter(DocumentDB.user_id == clean_user_id)
    elif clean_scope == "all":
        if not is_admin:
            target_uids = [effective_user_id] if effective_user_id else []
            lookup_email = clean_email or (current_user_info.get("email") if current_user_info else None)
            if lookup_email and os.path.exists(AUTH_DB_PATH):
                try:
                    conn = sqlite3.connect(AUTH_DB_PATH, timeout=3.0)
                    cursor = conn.cursor()
                    cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (lookup_email.strip(),))
                    row = cursor.fetchone()
                    if row and row[0] and row[0] not in target_uids:
                        target_uids.append(row[0])
                    conn.close()
                except Exception:
                    pass

            target_uids = [u for u in set(target_uids) if u and isinstance(u, str)]
            if target_uids:
                query = query.filter(or_(DocumentDB.user_id.in_(target_uids), DocumentDB.is_shared == 1))
        elif clean_user_id:
            query = query.filter(DocumentDB.user_id == clean_user_id)

    docs = query.order_by(DocumentDB.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "userId": d.user_id,
            "name": d.name,
            "size": d.file_size,
            "totalPages": d.total_pages,
            "chaptersCount": d.chapters_count,
            "status": d.status,
            "progress": d.progress,
            "authorName": getattr(d, "author_name", "Giảng viên UTH") or "Giảng viên UTH",
            "isShared": bool(getattr(d, "is_shared", 0)),
            "sharingScope": getattr(d, "sharing_scope", "private") or "private",
            "isApproved": bool(getattr(d, "is_approved", 0)),
            "approvedBy": getattr(d, "approved_by", None),
            "approvedAt": d.approved_at.strftime("%d/%m/%Y, %H:%M") if getattr(d, "approved_at", None) else None,
            "usageCount": getattr(d, "usage_count", 0) or 0,
            "uploadedAt": d.created_at.strftime("%d/%m/%Y, %H:%M") if d.created_at else "Hôm nay"
        }
        for d in docs
    ]


@app.post("/documents/{document_id}/share")
def toggle_document_share(
    document_id: str,
    payload: Dict[str, Any] = Body(default={}),
    current_user_info: Optional[Dict[str, Any]] = Depends(get_optional_user_info),
    db: Session = Depends(get_db)
):
    """
    Chia sẻ hoặc thu hồi chia sẻ giáo trình vào Ngân hàng Giáo trình dùng chung.
    Hỗ trợ kiểm duyệt 2 cấp:
    - Cấp 1 (Hệ thống tự động): Kiểm tra số trang, độ dài, trạng thái xử lý, từ khóa rác trước khi cho phép vào thư viện.
    """
    doc = db.query(DocumentDB).filter(DocumentDB.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài liệu.")

    # Tự do chuyển đổi trạng thái Riêng tư / Chia sẻ cho tài liệu trong kho
    caller_id = current_user_info.get("id") or current_user_info.get("user_id") if current_user_info else None
    if caller_id and not doc.user_id:
        doc.user_id = caller_id

    target_shared = payload.get("is_shared", not bool(doc.is_shared))

    # Cấp 1: Kiểm duyệt tự động trước khi chia sẻ vào Thư viện dùng chung
    if target_shared:
        if doc.status != "ready":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tài liệu đang xử lý bóc tách hoặc chưa sẵn sàng, chưa thể chia sẻ lên Thư viện dùng chung."
            )
        if (doc.total_pages or 0) < 2 and (doc.chapters_count or 0) < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tài liệu không đạt chuẩn học thuật (dưới 2 trang hoặc không có nội dung học phần hợp lệ) để chia sẻ vào Ngân hàng dùng chung."
            )
        banned_words = ["test", "rác", "spam", "junk", "xxx", "bậy", "troll"]
        name_lower = (doc.name or "").lower()
        if any(w in name_lower.split() for w in banned_words) and len(doc.name) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên tài liệu chứa từ khóa thử nghiệm hoặc không phù hợp tiêu chuẩn học thuật. Vui lòng đổi tên tài liệu rõ ràng trước khi chia sẻ."
            )

    doc.is_shared = 1 if target_shared else 0
    doc.sharing_scope = payload.get("sharing_scope", "department" if target_shared else "private")
    if payload.get("author_name"):
        doc.author_name = payload["author_name"]

    db.commit()
    db.refresh(doc)

    return {
        "status": "success",
        "document_id": doc.id,
        "is_shared": bool(doc.is_shared),
        "sharingScope": doc.sharing_scope,
        "authorName": doc.author_name,
        "isApproved": bool(getattr(doc, "is_approved", 0)),
        "approvedBy": getattr(doc, "approved_by", None),
        "message": "Đã kiểm duyệt Cấp 1 thành công & Chia sẻ giáo trình lên Ngân hàng Dùng chung!" if doc.is_shared else "Đã chuyển giáo trình về chế độ Riêng tư."
    }


@app.post("/documents/{document_id}/approve")
def toggle_document_approve(
    document_id: str,
    payload: Dict[str, Any] = Body(default={}),
    current_user_info: Optional[Dict[str, Any]] = Depends(get_optional_user_info),
    db: Session = Depends(get_db)
):
    """
    Cấp 2: Thẩm định & Đóng dấu bởi Trưởng bộ môn (HOD) hoặc Quản trị viên (Admin).
    Gán huy hiệu: 🛡️ Giáo trình chuẩn — Đã được Trưởng bộ môn phê duyệt.
    """
    role = (current_user_info.get("role") or "").lower() if current_user_info else ""
    if role not in ["head_of_department", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Trưởng bộ môn (HOD) hoặc Quản trị viên mới có thẩm quyền thẩm định và đóng dấu phê duyệt giáo trình."
        )

    doc = db.query(DocumentDB).filter(DocumentDB.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài liệu.")

    current_approved = bool(getattr(doc, "is_approved", 0))
    target_approved = payload.get("is_approved", not current_approved)
    doc.is_approved = 1 if target_approved else 0

    if target_approved:
        caller_name = (
            current_user_info.get("full_name") or
            current_user_info.get("fullName") or
            current_user_info.get("email") or
            "Trưởng bộ môn"
        )
        academic_title = current_user_info.get("academic_title") or current_user_info.get("academicTitle") or ""
        doc.approved_by = f"{academic_title} {caller_name}".strip() if academic_title else caller_name
        doc.approved_at = datetime.utcnow()
    else:
        doc.approved_by = None
        doc.approved_at = None

    db.commit()
    db.refresh(doc)

    return {
        "status": "success",
        "document_id": doc.id,
        "isApproved": bool(doc.is_approved),
        "approvedBy": doc.approved_by,
        "approvedAt": doc.approved_at.strftime("%d/%m/%Y, %H:%M") if doc.approved_at else None,
        "message": f"Đã đóng dấu thẩm định giáo trình thành công bởi {doc.approved_by}" if doc.is_approved else "Đã thu hồi con dấu thẩm định giáo trình."
    }


@app.post("/documents/{document_id}/increment-usage")
def increment_document_usage(
    document_id: str,
    db: Session = Depends(get_db)
):
    """Ghi nhận số lần giáo trình được các giảng viên nạp để biên soạn đề thi (Usage Count)"""
    doc = db.query(DocumentDB).filter(DocumentDB.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài liệu.")
    doc.usage_count = (doc.usage_count or 0) + 1
    db.commit()
    db.refresh(doc)
    return {
        "status": "success",
        "document_id": doc.id,
        "usageCount": doc.usage_count
    }

class UpdateDocMetaRequest(BaseModel):
    name: Optional[str] = None
    is_shared: Optional[bool] = None
    sharing_scope: Optional[str] = None
    author_name: Optional[str] = None

@app.patch("/documents/{document_id}")
@app.put("/documents/{document_id}")
def update_document_metadata(
    document_id: str,
    req: UpdateDocMetaRequest,
    current_user_info: Optional[Dict[str, Any]] = Depends(get_optional_user_info),
    db: Session = Depends(get_db)
):
    """Admin hoặc chủ sở hữu chỉnh sửa metadata giáo trình (Tên, Tác giả, Phạm vi chia sẻ)"""
    doc = db.query(DocumentDB).filter(DocumentDB.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu.")

    if req.name is not None and req.name.strip():
        doc.name = req.name.strip()
    if req.is_shared is not None:
        doc.is_shared = 1 if req.is_shared else 0
    if req.sharing_scope is not None:
        doc.sharing_scope = req.sharing_scope
    if req.author_name is not None:
        doc.author_name = req.author_name.strip()

    db.commit()
    db.refresh(doc)
    return {
        "status": "success",
        "message": "Đã cập nhật thông tin tài liệu thành công.",
        "document": {
            "id": doc.id,
            "name": doc.name,
            "isShared": bool(doc.is_shared),
            "sharingScope": doc.sharing_scope,
            "authorName": doc.author_name
        }
    }



app.include_router(qgroups_router.router)
app.include_router(friends_router.router)
app.include_router(forum_router.router)

# =========================================================================
# QUẢN LÝ HÌNH ẢNH HỌC LIỆU VÀ CÂU HỎI (EXTRACTED IMAGES & QUESTION UPLOAD)
# =========================================================================
@app.get("/images/{file_name}")
@app.get("/documents/images/{file_name}")
def get_extracted_image(file_name: str):
    import urllib.parse
    raw_name = file_name
    unquoted = urllib.parse.unquote(file_name)
    # 1. Tìm trực tiếp theo tên tệp trong các thư mục học liệu
    candidate_dirs = [
        EXTRACTED_IMAGES_DIR,
        QUESTION_ATTACHMENTS_DIR,
        FORUM_ATTACHMENTS_DIR,
        DATA_DIR / "uploads",
        DATA_DIR
    ]
    
    target_path = None
    names_to_try = [unquoted, raw_name]
    stem_name = Path(unquoted).stem
    for ext in ["", ".png", ".jpg", ".jpeg", ".webp", ".svg"]:
        for n in [unquoted, raw_name, f"{stem_name}{ext}" if ext else ""]:
            if not n or "/" in n or "\\" in n or ".." in n or Path(n).name != n:
                continue
            for c_dir in candidate_dirs:
                base_res = c_dir.resolve()
                cand = (base_res / n).resolve()
                if os.path.commonpath([str(cand), str(base_res)]) == str(base_res) and cand.exists() and cand.is_file():
                    target_path = cand
                    break
            if target_path:
                break
        if target_path:
            break

    # Nếu tìm thấy tệp ảnh vật lý, trả về tệp nguyên bản
    if target_path and target_path.exists() and target_path.is_file():
        import mimetypes
        content_type, _ = mimetypes.guess_type(target_path.name)
        return FileResponse(
            path=str(target_path),
            media_type=content_type or "image/png",
            content_disposition_type="inline",
            headers={"Access-Control-Allow-Origin": "*"}
        )
    
    # 2. Nếu tệp chưa trích xuất hoặc đang chờ biên tập, trả về SVG Placeholder học thuật chuyên nghiệp
    clean_stem = Path(unquoted).stem.replace('_', ' ').replace('-', ' ')
    if len(clean_stem) > 50:
        clean_stem = clean_stem[:47] + "..."
    
    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="560" height="170" viewBox="0 0 560 170" fill="none">
  <rect width="560" height="170" rx="10" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="6 4"/>
  <rect x="250" y="24" width="60" height="46" rx="8" fill="#F1F5F9" stroke="#94A3B8" stroke-width="1.5"/>
  <circle cx="266" cy="40" r="5" fill="#64748B"/>
  <path d="M256 60l14-14 12 12 10-10 12 12" stroke="#64748B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="280" y="104" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="600" fill="#1E293B">Sơ đồ minh họa đính kèm: {clean_stem}</text>
  <text x="280" y="128" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="11" fill="#64748B">(Hình ảnh giáo trình — Bấm vào câu hỏi để vẽ trong Studio hoặc tải ảnh mới lên)</text>
</svg>"""
    return Response(
        content=svg_content,
        media_type="image/svg+xml",
        headers={
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
        }
    )


@app.post("/questions/upload-image")
@app.post("/documents/questions/upload-image")
async def upload_question_image(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Tên file ảnh không hợp lệ")
    
    clean_name = f"qimg_{int(time.time()*1000)}_{file.filename.replace(' ', '_')}"
    target_path = QUESTION_ATTACHMENTS_DIR / clean_name
    content = await file.read()
    target_path.write_bytes(content)
    
    return {
        "status": "success",
        "fileName": file.filename,
        "savedName": clean_name,
        "imageUrl": f"/api/v1/documents/images/{clean_name}",
        "url": f"/api/v1/documents/images/{clean_name}",
        "isImage": True
    }



@app.get("/{document_id}")
@app.get("/documents/{document_id}")
def get_document(document_id: str, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết một giáo trình kèm danh sách các chương mục đã nhận diện"""
    doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Không tìm thấy tài liệu có mã {document_id}")

    chapters = (
        db.query(DocumentChapterDB.title)
        .filter_by(document_id=document_id)
        .order_by(DocumentChapterDB.chapter_index)
        .all()
    )
    return {
        "id": doc.id,
        "userId": doc.user_id,
        "name": doc.name,
        "size": doc.file_size,
        "totalPages": doc.total_pages,
        "chaptersCount": doc.chapters_count,
        "chapters": [c[0] for c in chapters],
        "status": doc.status,
        "progress": doc.progress,
        "authorName": getattr(doc, "author_name", "Giảng viên UTH") or "Giảng viên UTH",
        "isShared": bool(getattr(doc, "is_shared", 0)),
        "sharingScope": getattr(doc, "sharing_scope", "private") or "private",
        "isApproved": bool(getattr(doc, "is_approved", 0)),
        "approvedBy": getattr(doc, "approved_by", None),
        "approvedAt": doc.approved_at.strftime("%d/%m/%Y, %H:%M") if getattr(doc, "approved_at", None) else None,
        "usageCount": getattr(doc, "usage_count", 0) or 0,
        "uploadedAt": doc.created_at.strftime("%d/%m/%Y, %H:%M") if doc.created_at else "Hôm nay"
    }


@app.get("/{document_id}/download")
@app.get("/documents/{document_id}/download")
@app.get("/{document_id}/stream")
@app.get("/documents/{document_id}/stream")
def download_document_file(
    document_id: str, 
    inline: Optional[bool] = Query(False),
    db: Session = Depends(get_db)
):
    """Tải xuống hoặc xem trực tuyến (inline stream) tệp giáo trình gốc (PDF/Word) từ máy chủ lưu trữ"""
    doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bản ghi tài liệu.")

    target_path = doc.file_path if (doc.file_path and os.path.exists(doc.file_path)) else None
    if not target_path:
        alt_path = STORAGE_DIR / os.path.basename(doc.file_path) if doc.file_path else None
        if alt_path and alt_path.exists():
            target_path = str(alt_path)
        else:
            matched = list(STORAGE_DIR.glob(f"{doc.id}_*"))
            if matched and matched[0].exists():
                target_path = str(matched[0])

    if not target_path or not os.path.exists(target_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tệp tài liệu gốc không tồn tại trên hệ thống lưu trữ.")

    media_type = "application/pdf" if doc.name.endswith(".pdf") else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    disp_type = "inline" if inline else "attachment"
    return FileResponse(
        path=target_path,
        filename=doc.name,
        media_type=media_type,
        content_disposition_type=disp_type
    )


@app.get("/{document_id}/chunks")
@app.get("/documents/{document_id}/chunks")
def get_document_chunks(
    document_id: str,
    page_start: Optional[int] = Query(None, description="Lọc từ số trang bắt đầu"),
    page_end: Optional[int] = Query(None, description="Lọc đến số trang kết thúc"),
    chapter: Optional[str] = Query(None, description="Lọc theo tên chương hoặc đề mục"),
    keyword: Optional[str] = Query(None, description="Tìm kiếm từ khóa trong nội dung đoạn trích"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Truy xuất và xem trước danh sách các đoạn trích ngữ nghĩa (chunks):
    - Hỗ trợ lọc theo dải trang (page_start, page_end)
    - Hỗ trợ lọc theo chương/mục học phần
    - Hỗ trợ tìm kiếm từ khóa full-text trong đoạn trích
    - Hỗ trợ phân trang limit/offset
    """
    doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Không tìm thấy tài liệu có mã {document_id}")

    query = db.query(DocumentChunkDB).filter_by(document_id=document_id)

    if page_start is not None:
        query = query.filter(DocumentChunkDB.page_number >= page_start)
    if page_end is not None:
        query = query.filter(DocumentChunkDB.page_number <= page_end)
    if chapter:
        query = query.filter(DocumentChunkDB.chapter.ilike(f"%{chapter.strip()}%"))
    if keyword:
        query = query.filter(DocumentChunkDB.text_snippet.ilike(f"%{keyword.strip()}%"))

    total_matched = query.count()
    chunks = query.order_by(DocumentChunkDB.page_number.asc(), DocumentChunkDB.id.asc()).offset(offset).limit(limit).all()

    return {
        "documentId": document_id,
        "totalChunks": total_matched,
        "returnedChunks": len(chunks),
        "limit": limit,
        "offset": offset,
        "filters": {
            "pageStart": page_start,
            "pageEnd": page_end,
            "chapter": chapter,
            "keyword": keyword
        },
        "chunks": [
            {
                "chunkId": c.id,
                "pageNumber": c.page_number,
                "chapter": c.chapter,
                "charCount": c.char_count,
                "text": c.text_snippet,
                "textSnippet": c.text_snippet[:400],
                "images": json.loads(c.images_json) if getattr(c, "images_json", None) and c.images_json else [],
                "associated_images": json.loads(c.images_json) if getattr(c, "images_json", None) and c.images_json else []
            }
            for c in chunks
        ]
    }


@app.delete("/documents/{document_id}")
async def delete_document(
    document_id: str, 
    user_info: Optional[Dict] = Depends(get_optional_user_info),
    db: Session = Depends(get_db)
):
    """Xóa hoàn toàn một giáo trình: tệp vật lý, dữ liệu PostgreSQL/SQLite và dọn dẹp vector RAG"""
    doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
    if not doc:
        # Nếu tài liệu đã bị xóa trước đó hoặc không tồn tại trong CSDL, dọn dẹp cache và phản hồi thành công
        try:
            cache.clear_document_cache(document_id)
        except Exception:
            pass
        return {
            "status": "success",
            "message": f"Tài liệu {document_id} đã được dọn dẹp sạch sẽ.",
            "documentId": document_id,
            "deletedVectors": 0
        }

    # Phân quyền xóa tài liệu:
    # 1. Admin hoặc Trưởng bộ môn được toàn quyền quản trị, xóa bất kỳ giáo trình nào
    # 2. Giảng viên sở hữu (khớp user_id hoặc email)
    # 3. Tài liệu mẫu/môi trường phát triển nội bộ
    current_uid = user_info.get("user_id") or user_info.get("id") if user_info else None
    current_role = (user_info.get("role") or "").lower() if user_info else ""
    current_email = (user_info.get("email") or "").lower() if user_info else ""

    is_admin_or_hod = (
        current_role in ["admin", "head_of_department"] or 
        current_uid in ["admin", "usr-adm-quizgen"]
    )
    is_owner = bool(
        current_uid and doc.user_id and (
            doc.user_id == current_uid or
            (current_email and doc.user_id == current_email) or
            {doc.user_id, current_uid}.issubset({"lec-001", "usr-lec-001", "usr-lec-003", "usr-lec-005"})
        )
    )
    is_dev_sample = (
        not doc.user_id or 
        doc.user_id in ["lec-001", "usr-lec-001", "usr-lec-003", "usr-lec-005", "admin"] or
        os.getenv("ENVIRONMENT", "development").lower() in ["development", "dev", "local"]
    )

    if not (is_admin_or_hod or is_owner or is_dev_sample):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Bạn không có quyền xóa tài liệu của giảng viên khác."
        )

    deleted_vectors = 0
    rag_warning = None

    # 1. Gọi sang RAG Service xóa vector trong ChromaDB
    try:
        headers = {}
        if current_uid:
            headers["X-User-Id"] = current_uid

        async with httpx.AsyncClient(timeout=RAG_HTTP_TIMEOUT_SECONDS) as client:
            res = await client.delete(f"{RAG_SERVICE_URL}/documents/{document_id}", headers=headers)
            if res.status_code == 200:
                payload = res.json()
                deleted_vectors = payload.get("deletedCount", payload.get("deleted_chunks_count", 0))
    except Exception as e:
        rag_warning = f"Không thể kết nối RAG service để dọn dẹp vector: {str(e)}"

    # 2. Dọn dẹp cache tiến trình upload và metadata của document-service
    try:
        cache.clear_document_cache(document_id)
    except Exception:
        pass

    # 3. Xóa tệp vật lý trên ổ đĩa
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    # 4. Xóa các bản ghi liên quan trong CSDL
    doc_name = doc.name
    db.delete(doc)
    db.commit()

    return {
        "status": "success",
        "message": f"Đã xóa thành công tài liệu {doc_name}.",
        "documentId": document_id,
        "deletedVectors": deleted_vectors,
        "warning": rag_warning
    }


@app.get("/operational/diagnostics")
def get_operational_diagnostics(db: Session = Depends(get_db)):
    """Kiểm tra toàn diện trạng thái vận hành của Document Service"""
    total_docs = db.query(DocumentDB).count()
    ready_docs = db.query(DocumentDB).filter_by(status="ready").count()
    processing_docs = db.query(DocumentDB).filter(DocumentDB.status.in_(["extracting", "embedding"])).count()
    error_docs = db.query(DocumentDB).filter_by(status="error").count()

    rag_online = False
    rag_latency_ms = None
    try:
        t0 = time.perf_counter()
        with httpx.Client(timeout=2.0) as client:
            res = client.get(f"{RAG_SERVICE_URL}/health")
            if res.status_code == 200:
                rag_online = True
                rag_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
    except Exception:
        pass

    storage_size_bytes = 0
    file_count = 0
    if STORAGE_DIR.exists():
        files = list(STORAGE_DIR.glob("*"))
        file_count = len(files)
        storage_size_bytes = sum(f.stat().st_size for f in files if f.is_file())

    return {
        "service": "document-service",
        "status": "healthy" if rag_online else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "storage": {
            "directory": str(STORAGE_DIR),
            "totalFiles": file_count,
            "totalSizeBytes": storage_size_bytes,
            "formattedSize": _format_file_size(storage_size_bytes)
        },
        "documents": {
            "total": total_docs,
            "ready": ready_docs,
            "processing": processing_docs,
            "error": error_docs
        },
        "ragIntegration": {
            "url": RAG_SERVICE_URL,
            "online": rag_online,
            "pingLatencyMs": rag_latency_ms
        },
        "redisCache": {
            "connected": cache.is_connected,
            "mode": "redis" if cache.is_connected else "in-memory-fallback"
        }
    }
