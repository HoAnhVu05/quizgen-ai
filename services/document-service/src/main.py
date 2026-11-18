import os
import time
import asyncio
import threading
import hashlib
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any
from uuid import uuid4

logger = logging.getLogger("document-service")

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile, Depends, Query, status, Body, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
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
STORAGE_DIR = Path(os.getenv("DOCUMENT_STORAGE_DIR", "./data/uploads"))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# [SCRUM-99] Bộ điều phối hàng đợi tác vụ bóc tách (Max 3 tác vụ chạy đồng thời)
# Ngăn chặn quá tải CPU/RAM khi người dùng tải lên đồng loạt 20-50 tài liệu
MAX_CONCURRENT_PIPELINES = int(os.getenv("MAX_CONCURRENT_PIPELINES", "3"))
pipeline_semaphore = threading.Semaphore(MAX_CONCURRENT_PIPELINES)


def _format_file_size(byte_count: int) -> str:
    """Chuyển đổi số bytes thành chuỗi dung lượng dễ đọc (B, KB, MB)"""
    if byte_count < 1024:
        return f"{byte_count} B"
    if byte_count < 1024 * 1024:
        return f"{byte_count / 1024:.1f} KB"
    return f"{byte_count / (1024 * 1024):.1f} MB"


PAYMENT_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "payment-service", "data", "payment.db"))
AUTH_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "auth-service", "data", "auth.db"))

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
                        return row["plan_code"]
                else:
                    return row["plan_code"]
        except Exception:
            pass

    # 2. Kiểm tra plan_tier trong auth.db
    if os.path.exists(AUTH_DB_PATH):
        try:
            conn = sqlite3.connect(AUTH_DB_PATH, timeout=3.0)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT role, plan_tier FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                if row["role"] == "admin":
                    return "PRO_YEAR"
                if row["plan_tier"]:
                    return row["plan_tier"]
        except Exception:
            pass

    return "FREE"


@app.on_event("startup")
def startup_db():
    """Tự động khởi tạo bảng cơ sở dữ liệu nếu chưa tồn tại"""
    try:
        Base.metadata.create_all(bind=engine)
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
                pages = DocumentParser.parse_pdf(content)
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
    finally:
        pipeline_semaphore.release()

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
                    text_snippet=c["text"]
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
    if ext not in ["pdf", "docx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Định dạng tệp '.{ext}' không được hỗ trợ. Chỉ chấp nhận .pdf và .docx",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp rỗng (0 bytes). Vui lòng chọn tệp có nội dung hợp lệ.",
        )

    max_bytes = max_upload_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Kích thước tệp ({_format_file_size(len(content))}) vượt quá giới hạn cho phép {max_upload_mb} MB của gói {plan_tier}.",
        )

    # [SCRUM-99] Tính toán SHA-256 để chống trùng lặp dữ liệu (Deduplication)
    file_hash = hashlib.sha256(content).hexdigest()
    existing_doc = db.query(DocumentDB).filter(
        DocumentDB.user_id == user_id,
        DocumentDB.file_hash == file_hash,
        DocumentDB.status != "error"
    ).first()
    if existing_doc:
        return {
            "message": "Tài liệu này đã tồn tại trong tài khoản của bạn (đang sẵn sàng hoặc đang được xử lý).",
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
    Hỗ trợ gói Enterprise / Khoa & Bộ môn và giảng viên.
    """
    doc = db.query(DocumentDB).filter(DocumentDB.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài liệu.")

    # Tự do chuyển đổi trạng thái Riêng tư / Chia sẻ cho tài liệu trong kho
    caller_id = current_user_info.get("id") or current_user_info.get("user_id") if current_user_info else None
    if caller_id and not doc.user_id:
        doc.user_id = caller_id

    target_shared = payload.get("is_shared", not bool(doc.is_shared))
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
        "message": "Đã chia sẻ giáo trình lên Ngân hàng Dùng chung UTH!" if doc.is_shared else "Đã chuyển giáo trình về chế độ Riêng tư."
    }


# =========================================================================
# Q-GROUP & INVITATION PERSISTENCE (CENTRALIZED MULTI-ACCOUNT SYNC)
# =========================================================================
QGROUPS_FILE = STORAGE_DIR.parent / "qgroups.json"
QGROUP_INVITATIONS_FILE = STORAGE_DIR.parent / "qgroup_invitations.json"
FRIEND_REQUESTS_FILE = STORAGE_DIR.parent / "friend_requests.json"

DEFAULT_QGROUPS = [
    {
        "id": "qg-1",
        "code": "QGRP-OS2026",
        "name": "Bộ Môn Mạng & Hệ Điều Hành",
        "department": "Khoa Công nghệ Thông tin",
        "description": "Không gian làm việc chung của giảng viên bộ môn: trao đổi ngân hàng câu hỏi, chia sẻ giáo trình và thống nhất ma trận đề thi kỳ này.",
        "ownerEmail": "vuha3608@ut.edu.vn",
        "ownerName": "TS. Hồ Anh Vũ",
        "joinPolicy": "approval_required",
        "memberCount": 4,
        "members": ["vuha3608@ut.edu.vn", "nguyentann0804@gmail.com", "ducngocong@ut.edu.vn", "lecturer@quizgen.ai"],
        "pendingRequests": [
            {
                "id": "req-1",
                "email": "thanhnt@ut.edu.vn",
                "name": "ThS. Nguyễn Tiến Thành",
                "title": "Giảng viên",
                "requestedAt": "17/11/2026 10:15"
            }
        ],
        "messages": [
            {
                "id": "msg-1",
                "senderEmail": "vuha3608@ut.edu.vn",
                "senderName": "TS. Hồ Anh Vũ",
                "senderTitle": "Trưởng bộ môn",
                "avatarColor": "bg-teal-600",
                "text": "Chào quý Thầy/Cô! Kỳ này bộ môn chúng ta thống nhất dùng chung giáo trình Chuẩn Operating System Concepts 10th để sinh đề thi trắc nghiệm nhé.",
                "timestamp": "09:15",
                "attachment": {
                    "type": "textbook",
                    "id": "tb-002",
                    "name": "2018-Operating System Concepts-10th.pdf",
                    "size": "29.7 MB",
                    "totalPages": 1278,
                    "authorName": "TS. Hồ Anh Vũ"
                }
            }
        ]
    },
    {
        "id": "qg-2",
        "code": "QGRP-LLCT2026",
        "name": "Tổ Bộ Môn Lý Luận Chính Trị",
        "department": "Khoa Lý luận Chính trị",
        "description": "Tập trung biên soạn ngân hàng đề thi trắc nghiệm môn Tư tưởng Hồ Chí Minh và Triết học Mác - Lênin.",
        "ownerEmail": "hanbich1506@gmail.com",
        "ownerName": "ThS. Hân Bích",
        "joinPolicy": "open",
        "memberCount": 3,
        "members": ["hanbich1506@gmail.com", "hieuhieu2211@gmail.com", "lecturer@quizgen.ai"],
        "pendingRequests": [],
        "messages": []
    }
]

_CACHED_QGROUPS = None
_CACHED_INVITATIONS = None
_CACHED_FRIEND_REQUESTS = None

def deduplicate_qgroups(groups: list) -> list:
    seen = set()
    unique = []
    for g in groups:
        if not isinstance(g, dict):
            continue
        # Deduplicate primarily by group code, or by id
        key = str(g.get("code") or g.get("id") or "").strip()
        if not key:
            continue
        if key not in seen:
            seen.add(key)
            unique.append(g)
    return unique

def load_server_qgroups() -> list:
    if not QGROUPS_FILE.exists():
        save_server_qgroups(DEFAULT_QGROUPS)
        return DEFAULT_QGROUPS
    try:
        with open(QGROUPS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list) and len(data) > 0:
                return deduplicate_qgroups(data)
    except Exception:
        pass
    return DEFAULT_QGROUPS

def save_server_qgroups(groups: list):
    cleaned = deduplicate_qgroups(groups)
    try:
        QGROUPS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(QGROUPS_FILE, "w", encoding="utf-8") as f:
            json.dump(cleaned, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Error saving qgroups to server storage: {e}")

def load_server_invitations() -> list:
    global _CACHED_INVITATIONS
    if _CACHED_INVITATIONS is not None:
        return _CACHED_INVITATIONS
    if not QGROUP_INVITATIONS_FILE.exists():
        _CACHED_INVITATIONS = []
        return []
    try:
        with open(QGROUP_INVITATIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                _CACHED_INVITATIONS = data
                return _CACHED_INVITATIONS
    except Exception:
        pass
    _CACHED_INVITATIONS = []
    return []

def save_server_invitations(invitations: list):
    global _CACHED_INVITATIONS
    _CACHED_INVITATIONS = invitations
    try:
        QGROUP_INVITATIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(QGROUP_INVITATIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(invitations, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Error saving invitations: {e}")

@app.get("/qgroups")
@app.get("/documents/qgroups")
def get_qgroups(email: Optional[str] = Query(None), request: Request = None):
    groups = load_server_qgroups()
    user_email = email
    if not user_email and request:
        user_email = request.headers.get("x-user-email")
    if user_email:
        clean = user_email.strip().lower()
        return [
            g for g in groups
            if clean == (g.get("ownerEmail") or "").strip().lower()
            or clean == (g.get("directPartnerEmail") or "").strip().lower()
            or clean in [str(m).strip().lower() for m in g.get("members", [])]
        ]
    return groups

@app.post("/qgroups")
@app.post("/documents/qgroups")
async def save_qgroups_endpoint(request: Request):
    payload = await request.json()
    if isinstance(payload, list):
        current = load_server_qgroups()
        current_map = {(g.get("id") or g.get("code")): g for g in current if (g.get("id") or g.get("code"))}
        for g in payload:
            gid = g.get("id") or g.get("code")
            if gid:
                current_map[gid] = g
            else:
                current.append(g)
        new_list = list(current_map.values())
        save_server_qgroups(new_list)
        return {"status": "success", "count": len(new_list), "data": new_list}
    elif isinstance(payload, dict):
        if "groups" in payload and isinstance(payload["groups"], list):
            current = load_server_qgroups()
            current_map = {(g.get("id") or g.get("code")): g for g in current if (g.get("id") or g.get("code"))}
            for g in payload["groups"]:
                gid = g.get("id") or g.get("code")
                if gid:
                    current_map[gid] = g
                else:
                    current.append(g)
            new_list = list(current_map.values())
            save_server_qgroups(new_list)
            return {"status": "success", "count": len(new_list), "data": new_list}
        else:
            current = load_server_qgroups()
            idx = next((i for i, g in enumerate(current) if g.get("id") == payload.get("id") or g.get("code") == payload.get("code")), -1)
            if idx >= 0:
                current[idx] = payload
            else:
                current.insert(0, payload)
            save_server_qgroups(current)
            return {"status": "success", "data": current}
    return {"status": "error", "message": "Invalid payload format"}

@app.post("/qgroups/{group_id}/messages")
@app.post("/documents/qgroups/{group_id}/messages")
async def add_qgroup_message(group_id: str, request: Request):
    msg = await request.json()
    msg_id = str(msg.get("id") or "").strip()
    groups = load_server_qgroups()
    now_ms = int(time.time() * 1000)
    for g in groups:
        if str(g.get("id")) == str(group_id) or str(g.get("code")) == str(group_id):
            if "messages" not in g or not isinstance(g["messages"], list):
                g["messages"] = []
            # Chống trùng lặp tin nhắn nếu msg_id đã tồn tại
            if msg_id and any(str(m.get("id")) == msg_id for m in g["messages"]):
                return {"status": "success", "message": msg, "duplicate": True}
            g["messages"].append(msg)
            g["updatedAt"] = now_ms
            save_server_qgroups(groups)
            return {"status": "success", "message": msg}
    # Nếu chưa tìm thấy nhóm cụ thể, tạo hoặc lưu vào nhóm đầu tiên phù hợp
    return {"status": "error", "message": "Không tìm thấy nhóm tương ứng"}

@app.post("/qgroups/{group_id}/read")
@app.post("/documents/qgroups/{group_id}/read")
async def mark_qgroup_read(group_id: str, request: Request):
    payload = await request.json()
    user_email = str(payload.get("userEmail") or "").strip().lower()
    if not user_email:
        return {"status": "error", "message": "userEmail is required"}
    groups = load_server_qgroups()
    changed = False
    for g in groups:
        if str(g.get("id")) == str(group_id) or str(g.get("code")) == str(group_id):
            for m in g.get("messages", []):
                read_by = m.get("readBy", [])
                if not isinstance(read_by, list):
                    read_by = []
                if user_email not in [r.lower() for r in read_by]:
                    read_by.append(user_email)
                    m["readBy"] = read_by
                    changed = True
            break
    if changed:
        save_server_qgroups(groups)
    return {"status": "success", "changed": changed}

@app.delete("/qgroups/{group_id}")
@app.delete("/documents/qgroups/{group_id}")
def delete_qgroup_endpoint(group_id: str):
    """Xóa bỏ hoàn toàn một nhóm chat hoặc cuộc trò chuyện trực tiếp 1-1"""
    groups = load_server_qgroups()
    cleaned = [g for g in groups if str(g.get("id")) != str(group_id) and str(g.get("code")) != str(group_id)]
    save_server_qgroups(cleaned)
    return {"status": "success", "message": f"Đã xóa nhóm {group_id}", "remaining": len(cleaned)}

@app.post("/qgroups/{group_id}/join-by-code")
@app.post("/documents/qgroups/{group_id}/join-by-code")
async def join_qgroup_by_code(group_id: str, request: Request):
    payload = await request.json()
    user_email = (payload.get("userEmail") or "").strip().lower()
    user_name = payload.get("userName") or "Giảng viên"
    user_title = payload.get("userTitle") or "ThS."
    
    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id) or str(g.get("code", "")).upper() == str(group_id).upper()), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm tương ứng")
    
    members = target.get("members", [])
    if any(m.lower() == user_email for m in members):
        return {"status": "already_member", "message": "Bạn đã là thành viên của nhóm này", "group": target}
    
    policy = target.get("joinPolicy", "open")
    now_ms = int(time.time() * 1000)
    
    if policy == "invite_only":
        return {
            "status": "invite_only",
            "message": "Nhóm này đang đặt chế độ Riêng tư (Chỉ tham gia khi được Trưởng nhóm mời trực tiếp).",
            "group": target
        }
    
    if policy == "approval_required":
        reqs = target.get("pendingRequests", [])
        if any(r.get("email", "").lower() == user_email for r in reqs):
            return {
                "status": "pending_exists",
                "message": "Bạn đã gửi yêu cầu tham gia trước đó. Vui lòng chờ Trưởng nhóm phê duyệt.",
                "group": target
            }
        req_id = f"req-{now_ms}"
        req_item = {
            "id": req_id,
            "email": user_email,
            "name": user_name,
            "title": user_title,
            "requestedAt": time.strftime("%H:%M %d/%m")
        }
        reqs.append(req_item)
        target["pendingRequests"] = reqs
        target["updatedAt"] = now_ms
        save_server_qgroups(groups)
        return {
            "status": "pending_approval",
            "message": f"Đã gửi yêu cầu tham gia tới Trưởng nhóm {target.get('ownerName', '')}! Vui lòng chờ phê duyệt.",
            "group": target
        }
    
    # Policy == 'open'
    members.append(user_email)
    target["members"] = members
    target["memberCount"] = len(members)
    target["updatedAt"] = now_ms
    
    msgs = target.get("messages", [])
    msgs.append({
        "id": f"msg-{now_ms}",
        "senderEmail": "system",
        "senderName": "Hệ Thống Q-Group",
        "isSystem": True,
        "timestamp": time.strftime("%H:%M"),
        "text": f"👋 {user_name} ({user_email}) đã tham gia nhóm qua mã phòng."
    })
    target["messages"] = msgs
    save_server_qgroups(groups)
    return {
        "status": "joined",
        "message": f"Chào mừng bạn gia nhập nhóm {target.get('name', '')}!",
        "group": target
    }

@app.post("/qgroups/{group_id}/respond-join-request")
@app.post("/documents/qgroups/{group_id}/respond-join-request")
async def respond_join_request(group_id: str, request: Request):
    payload = await request.json()
    req_id = payload.get("requestId")
    target_email = (payload.get("targetEmail") or "").strip().lower()
    action = payload.get("action")  # "approve" or "reject"
    admin_name = payload.get("adminName") or "Trưởng nhóm"
    
    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id)), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
    
    reqs = target.get("pendingRequests", [])
    matched_req = next((r for r in reqs if r.get("id") == req_id or r.get("email", "").lower() == target_email), None)
    if not matched_req:
        return {"status": "error", "message": "Không tìm thấy yêu cầu tham gia"}
    
    target["pendingRequests"] = [r for r in reqs if r.get("id") != matched_req.get("id")]
    now_ms = int(time.time() * 1000)
    target["updatedAt"] = now_ms
    
    if action == "approve":
        members = target.get("members", [])
        eff_email = matched_req.get("email", "").lower()
        if eff_email and eff_email not in [m.lower() for m in members]:
            members.append(eff_email)
            target["members"] = members
            target["memberCount"] = len(members)
        
        msgs = target.get("messages", [])
        msgs.append({
            "id": f"msg-{now_ms}",
            "senderEmail": "system",
            "senderName": "Hệ Thống Q-Group",
            "isSystem": True,
            "timestamp": time.strftime("%H:%M"),
            "text": f"🎉 Trưởng nhóm {admin_name} đã phê duyệt cho {matched_req.get('name', 'Thành viên')} ({eff_email}) gia nhập nhóm!"
        })
        target["messages"] = msgs
    
    save_server_qgroups(groups)
    return {"status": "success", "action": action, "group": target}

@app.post("/qgroups/{group_id}/members")
@app.post("/documents/qgroups/{group_id}/members")
async def add_qgroup_member(group_id: str, request: Request):
    payload = await request.json()
    new_email = (payload.get("email") or payload.get("userEmail") or payload.get("targetEmail") or "").strip().lower()
    member_name = payload.get("name") or payload.get("userName") or payload.get("fullName") or new_email
    inviter_name = payload.get("inviterName") or "Đồng nghiệp"
    client_group = payload.get("group")

    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id) or str(g.get("code")) == str(group_id)), None)
    if not target and client_group and isinstance(client_group, dict):
        target = client_group
        groups.insert(0, target)

    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")

    members = target.get("members", [])
    if new_email and new_email not in [str(m).strip().lower() for m in members]:
        members.append(new_email)
        target["members"] = members
        target["memberCount"] = len(members)
        now_ms = int(time.time() * 1000)
        target["updatedAt"] = now_ms
        msgs = target.get("messages", [])
        msgs.append({
            "id": f"msg-{now_ms}",
            "senderEmail": "system",
            "senderName": "Hệ Thống Q-Group",
            "isSystem": True,
            "timestamp": time.strftime("%H:%M"),
            "text": f"🎉 {inviter_name} đã thêm {member_name} ({new_email}) vào kênh #{target.get('name', 'kênh')}."
        })
        target["messages"] = msgs
        save_server_qgroups(groups)

    return {"status": "success", "group": target}

@app.patch("/qgroups/{group_id}")
@app.patch("/documents/qgroups/{group_id}")
async def patch_qgroup(group_id: str, request: Request):
    payload = await request.json()
    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id) or str(g.get("code")) == str(group_id)), None)
    if not target and payload.get("group") and isinstance(payload.get("group"), dict):
        target = payload.get("group")
        groups.insert(0, target)

    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")

    for key, value in payload.items():
        if key in ("members", "memberCount", "name", "description", "department", "joinPolicy", "muted", "pinned"):
            target[key] = value

    now_ms = int(time.time() * 1000)
    target["updatedAt"] = now_ms
    save_server_qgroups(groups)
    return {"status": "success", "group": target}

@app.post("/qgroups/{group_id}/kick-member")
@app.post("/documents/qgroups/{group_id}/kick-member")
async def kick_qgroup_member(group_id: str, request: Request):
    payload = await request.json()
    target_email = (payload.get("targetEmail") or "").strip().lower()
    target_name = payload.get("targetName") or target_email
    admin_name = payload.get("adminName") or "Trưởng nhóm"
    
    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id)), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
    
    owner = (target.get("ownerEmail") or "").lower()
    if target_email == owner:
        return {"status": "error", "message": "Không thể loại Trưởng nhóm khỏi phòng"}
    
    members = target.get("members", [])
    new_members = [m for m in members if m.lower() != target_email]
    target["members"] = new_members
    target["memberCount"] = len(new_members)
    now_ms = int(time.time() * 1000)
    target["updatedAt"] = now_ms
    
    msgs = target.get("messages", [])
    msgs.append({
        "id": f"msg-{now_ms}",
        "senderEmail": "system",
        "senderName": "Hệ Thống Q-Group",
        "isSystem": True,
        "timestamp": time.strftime("%H:%M"),
        "text": f"⚠️ Trưởng nhóm {admin_name} đã loại {target_name} ({target_email}) khỏi nhóm."
    })
    target["messages"] = msgs
    save_server_qgroups(groups)
    return {"status": "success", "group": target}

@app.post("/qgroups/{group_id}/transfer-owner")
@app.post("/documents/qgroups/{group_id}/transfer-owner")
async def transfer_qgroup_owner(group_id: str, request: Request):
    """Chuyển giao quyền Trưởng nhóm cho thành viên khác (kèm tùy chọn rời nhóm)"""
    payload = await request.json()
    current_owner_email = (payload.get("currentOwnerEmail") or "").strip().lower()
    new_owner_email = (payload.get("newOwnerEmail") or "").strip().lower()
    new_owner_name = payload.get("newOwnerName") or new_owner_email
    current_owner_name = payload.get("currentOwnerName") or "Trưởng nhóm"
    also_leave = bool(payload.get("alsoLeave", False))

    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id) or str(g.get("code", "")).upper() == str(group_id).upper()), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")

    if target.get("ownerEmail", "").strip().lower() != current_owner_email:
        raise HTTPException(status_code=403, detail="Chỉ Trưởng nhóm hiện tại mới có quyền nhượng quyền")

    target["ownerEmail"] = new_owner_email
    target["ownerName"] = new_owner_name
    now_ms = int(time.time() * 1000)
    target["updatedAt"] = now_ms

    msgs = target.get("messages", [])
    if also_leave:
        members = target.get("members", [])
        new_members = [m for m in members if m.lower() != current_owner_email]
        target["members"] = new_members
        target["memberCount"] = len(new_members)
        msgs.append({
            "id": f"msg-{now_ms}",
            "senderEmail": "system",
            "senderName": "Hệ Thống Q-Group",
            "isSystem": True,
            "timestamp": time.strftime("%H:%M"),
            "text": f"👑 {current_owner_name} đã nhượng quyền Trưởng nhóm cho {new_owner_name} ({new_owner_email}) và rời khỏi nhóm."
        })
    else:
        msgs.append({
            "id": f"msg-{now_ms}",
            "senderEmail": "system",
            "senderName": "Hệ Thống Q-Group",
            "isSystem": True,
            "timestamp": time.strftime("%H:%M"),
            "text": f"👑 {current_owner_name} đã nhượng quyền Trưởng nhóm cho {new_owner_name} ({new_owner_email})."
        })
    target["messages"] = msgs
    save_server_qgroups(groups)
    return {"status": "success", "group": target}

@app.post("/qgroups/{group_id}/disband")
@app.post("/documents/qgroups/{group_id}/disband")
async def disband_qgroup(group_id: str, request: Request):
    """Giải tán nhóm hoàn toàn (chỉ Trưởng nhóm mới có quyền)"""
    payload = await request.json()
    owner_email = (payload.get("ownerEmail") or "").strip().lower()

    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id) or str(g.get("code", "")).upper() == str(group_id).upper()), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")

    if target.get("ownerEmail", "").strip().lower() != owner_email:
        raise HTTPException(status_code=403, detail="Chỉ Trưởng nhóm mới có quyền giải tán nhóm")

    cleaned = [g for g in groups if str(g.get("id")) != str(group_id) and str(g.get("code", "")).upper() != str(group_id).upper()]
    save_server_qgroups(cleaned)
    return {"status": "success", "message": f"Đã giải tán nhóm {target.get('name')}"}

@app.post("/qgroups/{group_id}/leave")
@app.post("/documents/qgroups/{group_id}/leave")
async def leave_qgroup(group_id: str, request: Request):
    payload = await request.json()
    user_email = (payload.get("userEmail") or "").strip().lower()
    user_name = payload.get("userName") or user_email
    
    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id)), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
    
    members = target.get("members", [])
    new_members = [m for m in members if m.lower() != user_email]
    target["members"] = new_members
    target["memberCount"] = len(new_members)
    now_ms = int(time.time() * 1000)
    target["updatedAt"] = now_ms
    
    msgs = target.get("messages", [])
    msgs.append({
        "id": f"msg-{now_ms}",
        "senderEmail": "system",
        "senderName": "Hệ Thống Q-Group",
        "isSystem": True,
        "timestamp": time.strftime("%H:%M"),
        "text": f"🚪 {user_name} ({user_email}) đã rời khỏi nhóm."
    })
    target["messages"] = msgs
    save_server_qgroups(groups)
    return {"status": "success", "group": target}

@app.post("/qgroups/{group_id}/transfer-owner")
@app.post("/documents/qgroups/{group_id}/transfer-owner")
async def transfer_qgroup_owner(group_id: str, request: Request):
    """Chuyển giao quyền Trưởng nhóm cho thành viên khác (kèm tùy chọn rời nhóm)"""
    payload = await request.json()
    current_owner_email = (payload.get("currentOwnerEmail") or "").strip().lower()
    new_owner_email = (payload.get("newOwnerEmail") or "").strip().lower()
    new_owner_name = payload.get("newOwnerName") or new_owner_email
    current_owner_name = payload.get("currentOwnerName") or "Trưởng nhóm"
    also_leave = bool(payload.get("alsoLeave", False))

    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id) or str(g.get("code", "")).upper() == str(group_id).upper()), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")

    if target.get("ownerEmail", "").strip().lower() != current_owner_email:
        raise HTTPException(status_code=403, detail="Chỉ Trưởng nhóm hiện tại mới có quyền nhượng quyền")

    target["ownerEmail"] = new_owner_email
    target["ownerName"] = new_owner_name
    now_ms = int(time.time() * 1000)
    target["updatedAt"] = now_ms

    msgs = target.get("messages", [])
    if also_leave:
        members = target.get("members", [])
        new_members = [m for m in members if m.lower() != current_owner_email]
        target["members"] = new_members
        target["memberCount"] = len(new_members)
        msgs.append({
            "id": f"msg-{now_ms}",
            "senderEmail": "system",
            "senderName": "Hệ Thống Q-Group",
            "isSystem": True,
            "timestamp": time.strftime("%H:%M"),
            "text": f"👑 {current_owner_name} đã nhượng quyền Trưởng nhóm cho {new_owner_name} ({new_owner_email}) và rời khỏi nhóm."
        })
    else:
        msgs.append({
            "id": f"msg-{now_ms}",
            "senderEmail": "system",
            "senderName": "Hệ Thống Q-Group",
            "isSystem": True,
            "timestamp": time.strftime("%H:%M"),
            "text": f"👑 {current_owner_name} đã nhượng quyền Trưởng nhóm cho {new_owner_name} ({new_owner_email})."
        })
    target["messages"] = msgs
    save_server_qgroups(groups)
    return {"status": "success", "group": target}

@app.post("/qgroups/{group_id}/disband")
@app.post("/documents/qgroups/{group_id}/disband")
async def disband_qgroup(group_id: str, request: Request):
    """Giải tán nhóm hoàn toàn (chỉ Trưởng nhóm mới có quyền)"""
    payload = await request.json()
    owner_email = (payload.get("ownerEmail") or "").strip().lower()

    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id) or str(g.get("code", "")).upper() == str(group_id).upper()), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")

    if target.get("ownerEmail", "").strip().lower() != owner_email:
        raise HTTPException(status_code=403, detail="Chỉ Trưởng nhóm mới có quyền giải tán nhóm")

    cleaned = [g for g in groups if str(g.get("id")) != str(group_id) and str(g.get("code", "")).upper() != str(group_id).upper()]
    save_server_qgroups(cleaned)
    return {"status": "success", "message": f"Đã giải tán nhóm {target.get('name')}"}

@app.post("/qgroups/{group_id}/settings")
@app.post("/documents/qgroups/{group_id}/settings")
async def update_qgroup_settings(group_id: str, request: Request):
    payload = await request.json()
    name = payload.get("name")
    department = payload.get("department")
    description = payload.get("description")
    join_policy = payload.get("joinPolicy")  # 'open' | 'approval_required' | 'invite_only'
    admin_name = payload.get("adminName") or "Trưởng nhóm"
    
    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id)), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
    
    old_policy = target.get("joinPolicy", "open")
    if name:
        target["name"] = name
    if department is not None:
        target["department"] = department
    if description is not None:
        target["description"] = description
    
    policy_changed = False
    if join_policy and join_policy != old_policy:
        target["joinPolicy"] = join_policy
        policy_changed = True
    
    now_ms = int(time.time() * 1000)
    target["updatedAt"] = now_ms
    
    if policy_changed:
        policy_names = {
            "open": "Công khai (Bất kỳ ai có mã đều vào ngay)",
            "approval_required": "Cần phê duyệt (Trưởng nhóm duyệt mới được vào)",
            "invite_only": "Riêng tư (Chỉ khi được mời trực tiếp)"
        }
        policy_label = policy_names.get(join_policy, join_policy)
        msgs = target.get("messages", [])
        msgs.append({
            "id": f"msg-{now_ms}",
            "senderEmail": "system",
            "senderName": "Hệ Thống Q-Group",
            "isSystem": True,
            "timestamp": time.strftime("%H:%M"),
            "text": f"⚙️ Trưởng nhóm {admin_name} đã cập nhật chế độ tham gia: **{policy_label}**"
        })
        target["messages"] = msgs
        
    save_server_qgroups(groups)
    return {"status": "success", "group": target}

@app.get("/dashboard/summary")
@app.get("/documents/dashboard/summary")
def get_dashboard_summary(
    user_id: Optional[str] = Query(None),
    current_user_info: Optional[Dict[str, Any]] = Depends(get_optional_user_info),
    db: Session = Depends(get_db)
):
    target_uid = user_id or (current_user_info.get("sub") if current_user_info else None)
    my_docs_count = 0
    if target_uid:
        target_uids = [target_uid]
        if target_uid in ["usr-lec-001", "usr-lec-003", "lec-001"]:
            target_uids = ["usr-lec-001", "usr-lec-003", "lec-001"]
        my_docs_count = db.query(DocumentDB).filter(DocumentDB.user_id.in_(target_uids)).count()
    shared_docs = db.query(DocumentDB).filter(DocumentDB.is_shared == 1).all()

    return {
        "status": "success",
        "data": {
            "stats": {
                "textbooksIndexed": my_docs_count,
                "totalShared": len(shared_docs)
            },
            "sharedDocuments": [
                {
                    "id": d.id,
                    "name": d.name,
                    "totalPages": d.total_pages or 100,
                    "uploadedAt": d.created_at.strftime("%d/%m/%Y") if d.created_at else "Hôm nay",
                    "subject": "Khoa Chuyên Ngành"
                }
                for d in shared_docs
            ]
        }
    }

@app.get("/qgroups/invitations")
@app.get("/documents/qgroups/invitations")
def get_qgroup_invitations(email: Optional[str] = None, type: Optional[str] = None, role: Optional[str] = None):
    invs = load_server_invitations()
    query_type = type or role or "received"
    if email:
        clean_email = email.strip().lower()
        if query_type == "sent":
            invs = [
                i for i in invs
                if i.get("inviterEmail", "").strip().lower() == clean_email
            ]
        elif query_type == "all":
            invs = [
                i for i in invs
                if i.get("targetEmail", "").strip().lower() == clean_email or
                   i.get("inviterEmail", "").strip().lower() == clean_email
            ]
        else:
            invs = [
                i for i in invs
                if i.get("targetEmail", "").strip().lower() == clean_email or
                   i.get("targetEmail", "").strip().lower().replace("@gmai.com", "@gmail.com") == clean_email or
                   clean_email.replace("@gmai.com", "@gmail.com") in i.get("targetEmail", "").strip().lower()
            ]
    return invs

@app.post("/qgroups/invitations")
@app.post("/documents/qgroups/invitations")
async def create_qgroup_invitation(request: Request):
    payload = await request.json()
    invs = load_server_invitations()
    target_email = payload.get("targetEmail", "").strip()
    if target_email.endswith("@gmai.com"):
        target_email = target_email.replace("@gmai.com", "@gmail.com")
        payload["targetEmail"] = target_email

    invs = [i for i in invs if not (i.get("groupId") == payload.get("groupId") and i.get("targetEmail", "").lower() == target_email.lower())]
    invs.insert(0, payload)
    save_server_invitations(invs)
    return {"status": "success", "invitation": payload}

@app.post("/qgroups/invitations/{inv_id}/respond")
@app.post("/documents/qgroups/invitations/{inv_id}/respond")
async def respond_qgroup_invitation(inv_id: str, request: Request):
    payload = await request.json()
    action = payload.get("action")
    user_email = (payload.get("userEmail") or "").strip().lower()
    user_name = payload.get("userName") or "Giảng viên"

    invs = load_server_invitations()
    target_inv = next((i for i in invs if i.get("id") == inv_id), None)
    if not target_inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    target_inv["status"] = "accepted" if action == "accept" else "rejected"
    save_server_invitations(invs)

    if action == "accept":
        groups = load_server_qgroups()
        target_group = next((g for g in groups if g.get("id") == target_inv.get("groupId")), None)
        if target_group:
            members = target_group.get("members", [])
            eff_email = user_email or target_inv.get("targetEmail", "").lower()
            if eff_email and eff_email not in [m.lower() for m in members]:
                members.append(eff_email)
                target_group["members"] = members
                target_group["memberCount"] = len(members)
                msgs = target_group.get("messages", [])
                inviter_name = target_inv.get("inviterName") or "Trưởng nhóm"
                msgs.append({
                    "id": f"msg-{int(time.time()*1000)}",
                    "senderEmail": "system",
                    "senderName": "Hệ Thống Q-Group",
                    "isSystem": True,
                    "timestamp": time.strftime("%H:%M"),
                    "text": f"🎉 {user_name} ({eff_email}) đã chấp nhận lời mời của {inviter_name} và chính thức tham gia kênh #{target_group.get('name', 'kênh')}!"
                })
                target_group["messages"] = msgs
                save_server_qgroups(groups)

    return {"status": "success", "invitation": target_inv}


# =========================================================================
# FRIEND REQUESTS (CROSS-ACCOUNT PERSISTENCE)
# =========================================================================

def load_friend_requests() -> list:
    global _CACHED_FRIEND_REQUESTS
    if _CACHED_FRIEND_REQUESTS is not None:
        return _CACHED_FRIEND_REQUESTS
    if not FRIEND_REQUESTS_FILE.exists():
        _CACHED_FRIEND_REQUESTS = []
        return []
    try:
        with open(FRIEND_REQUESTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                _CACHED_FRIEND_REQUESTS = data
                return _CACHED_FRIEND_REQUESTS
    except Exception:
        pass
    _CACHED_FRIEND_REQUESTS = []
    return []

def save_friend_requests(requests: list):
    global _CACHED_FRIEND_REQUESTS
    _CACHED_FRIEND_REQUESTS = requests
    try:
        FRIEND_REQUESTS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(FRIEND_REQUESTS_FILE, "w", encoding="utf-8") as f:
            json.dump(requests, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Error saving friend_requests: {e}")

@app.get("/friend-requests")
@app.get("/documents/friend-requests")
def get_friend_requests(email: Optional[str] = None, type: Optional[str] = None):
    """Lấy danh sách lời mời kết bạn theo email người nhận hoặc người gửi"""
    reqs = load_friend_requests()
    if email:
        clean = email.strip().lower()
        if type == "sent":
            reqs = [r for r in reqs if r.get("senderEmail", "").strip().lower() == clean]
        elif type == "all":
            reqs = [r for r in reqs if r.get("targetEmail", "").strip().lower() == clean or r.get("senderEmail", "").strip().lower() == clean]
        else:
            reqs = [r for r in reqs if r.get("targetEmail", "").strip().lower() == clean]
    return reqs

@app.delete("/friend-requests/{req_id}")
@app.delete("/documents/friend-requests/{req_id}")
def cancel_friend_request(req_id: str):
    """Hủy/thu hồi lời mời kết bạn"""
    reqs = load_friend_requests()
    cleaned = [r for r in reqs if str(r.get("id")) != str(req_id)]
    save_friend_requests(cleaned)
    return {"status": "success", "message": f"Đã thu hồi lời mời kết bạn {req_id}"}

@app.post("/friend-requests")
@app.post("/documents/friend-requests")
async def create_friend_request(request: Request):
    """Gửi lời mời kết bạn từ tài khoản A tới email B"""
    payload = await request.json()
    reqs = load_friend_requests()
    sender = payload.get("senderEmail", "").strip().lower()
    target = payload.get("targetEmail", "").strip().lower()
    if not sender or not target:
        return {"status": "error", "message": "senderEmail và targetEmail là bắt buộc"}
    if sender == target:
        return {"status": "error", "message": "Không thể kết bạn với chính mình"}

    # Kiểm tra nếu đã là bạn bè (đã có phòng DM 1-1)
    groups = load_server_qgroups()
    is_already_friend = any(
        g.get("isDirect") and {sender, target}.issubset({str(m).strip().lower() for m in g.get("members", [])})
        for g in groups
    )
    if is_already_friend:
        return {"status": "already_friend", "message": "Hai Thầy/Cô đã là đồng nghiệp kết nối thành công trước đó."}

    # Tránh duplicate: xóa req cũ cùng cặp sender-target nếu có
    reqs = [r for r in reqs if not (
        r.get("senderEmail", "").strip().lower() == sender and
        r.get("targetEmail", "").strip().lower() == target
    )]
    reqs.insert(0, payload)
    save_friend_requests(reqs)
    return {"status": "success", "request": payload}

@app.post("/friend-requests/{req_id}/respond")
@app.post("/documents/friend-requests/{req_id}/respond")
async def respond_friend_request(req_id: str, request: Request):
    """Chấp nhận hoặc từ chối lời mời kết bạn"""
    payload = await request.json()
    action = payload.get("action")  # "accept" | "reject"
    user_email = payload.get("userEmail", "").strip().lower()
    user_name = payload.get("userName", "Giảng viên")

    reqs = load_friend_requests()
    target_req = next((r for r in reqs if r.get("id") == req_id), None)
    if not target_req:
        raise HTTPException(status_code=404, detail="Lời mời kết bạn không tìm thấy")

    target_req["status"] = "accepted" if action == "accept" else "rejected"
    # Đồng thời cập nhật mọi lời mời pending giữa cùng cặp người dùng này để xóa sạch trạng thái chờ
    sender_email = target_req.get("senderEmail", "").strip().lower()
    target_email = target_req.get("targetEmail", "").strip().lower()
    for r in reqs:
        s = r.get("senderEmail", "").strip().lower()
        t = r.get("targetEmail", "").strip().lower()
        if (s == sender_email and t == target_email) or (s == target_email and t == sender_email):
            r["status"] = "accepted" if action == "accept" else "rejected"
    save_friend_requests(reqs)

    if action == "accept":
        # Tạo cuộc trò chuyện DM 1-1 trên backend
        sender_email = target_req.get("senderEmail", "").lower()
        sender_name = target_req.get("senderName", "Giảng viên")
        dm_id = f"dm-{int(time.time()*1000)}"
        dm_code = f"DM-{dm_id[-6:].upper()}"
        groups = load_server_qgroups()
        # Kiểm tra DM đã tồn tại chưa
        existing_dm = next((g for g in groups if g.get("isDirect") and
            set([str(m).strip().lower() for m in g.get("members", [])]) == {sender_email.strip().lower(), user_email.strip().lower()}), None)
        if not existing_dm:
            new_dm = {
                "id": dm_id,
                "code": dm_code,
                "name": f"{sender_name} & {user_name}",
                "department": "Bạn bè • Tin nhắn riêng",
                "description": f"Cuộc trò chuyện giữa {user_name} và {sender_name}",
                "ownerEmail": sender_email,
                "ownerName": sender_name,
                "joinPolicy": "open",
                "memberCount": 2,
                "members": [sender_email, user_email],
                "pendingRequests": [],
                "isDirect": True,
                "directPartnerEmail": user_email,
                "directPartnerName": user_name,
                "updatedAt": int(time.time() * 1000),
                "messages": [{
                    "id": f"msg-{int(time.time()*1000)}",
                    "senderEmail": "system",
                    "senderName": "Hệ Thống QuizGen AI",
                    "isSystem": True,
                    "timestamp": time.strftime("%H:%M"),
                    "text": f"🎉 {user_name} và {sender_name} đã trở thành bạn bè! Hãy gửi lời chào và bắt đầu chia sẻ học liệu cùng nhau."
                }]
            }
            groups.insert(0, new_dm)
            save_server_qgroups(groups)

    return {"status": "success", "request": target_req}


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
        "uploadedAt": doc.created_at.strftime("%d/%m/%Y, %H:%M") if doc.created_at else "Hôm nay"
    }


@app.get("/{document_id}/download")
@app.get("/documents/{document_id}/download")
def download_document_file(document_id: str, db: Session = Depends(get_db)):
    """Tải xuống tệp giáo trình gốc (PDF/Word) từ máy chủ lưu trữ"""
    doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
    if not doc or not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tệp tài liệu gốc không tồn tại trên hệ thống lưu trữ.")

    media_type = "application/pdf" if doc.name.endswith(".pdf") else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(
        path=doc.file_path,
        filename=doc.name,
        media_type=media_type
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
                "textSnippet": c.text_snippet[:400]
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
