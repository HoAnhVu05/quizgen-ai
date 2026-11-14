import os
import time
import asyncio
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from uuid import uuid4

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile, Depends, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
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

MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "25"))
RAG_HTTP_TIMEOUT_SECONDS = float(os.getenv("RAG_HTTP_TIMEOUT_SECONDS", "120"))
STORAGE_DIR = Path(os.getenv("DOCUMENT_STORAGE_DIR", "./data/uploads"))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


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
    """Cập nhật tiến trình và trạng thái xử lý của tài liệu vào CSDL"""
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
            db.commit()
    finally:
        db.close()


def _mark_doc_error(document_id: str, error_msg: str, stage: str = "error"):
    """Đánh dấu trạng thái lỗi và ghi nhận nguyên nhân vào CSDL và cache"""
    db = SessionLocal()
    try:
        doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
        if doc:
            doc.status = "error"
            doc.progress = 0
            doc.error_message = error_msg
            db.commit()
    finally:
        db.close()
    cache.set_upload_progress(document_id, progress=0, status="error", stage=stage)


async def process_document_pipeline(
    document_id: str,
    file_path: str,
    filename: str,
    ext: str,
    user_id: str
):
    """
    Quy trình xử lý tài liệu nền khép kín (End-to-End Async Document Pipeline):
    - Pha 1 (25%): Bóc tách văn bản từng trang (PDF/DOCX Parser)
    - Pha 2 (50%): Phân đoạn ngữ nghĩa (Semantic Chunker) & trích xuất mục lục
    - Pha 3 (70%): Lưu cấu trúc chương và các đoạn trích vào CSDL
    - Pha 4 (85%): Đẩy chunks sang RAG Service với cơ chế Exponential Backoff Retry (3 lần: 1s, 2s, 4s)
    - Pha 5 (100%): Cập nhật trạng thái 'ready', hoàn tất toàn bộ quy trình
    """
    storage_file = Path(file_path)
    if not storage_file.exists():
        _mark_doc_error(document_id, "Tệp tài liệu vật lý không tồn tại trên máy chủ.", stage="file_missing")
        return

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

    # Pha 3: Lưu cấu trúc chương mục và các chunks vào CSDL
    cache.set_upload_progress(document_id, progress=70, status="embedding", stage="saving_metadata", total_pages=len(pages))
    _update_doc_progress(document_id, progress=70, status="embedding", total_pages=len(pages), chapters_count=len(chapters_metadata))
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
    except Exception as e:
        db.rollback()
        _mark_doc_error(document_id, f"Lỗi lưu trữ metadata vào CSDL: {str(e)}", stage="db_save_error")
        return
    finally:
        db.close()

    # Pha 4: Chuyển tiếp các chunks sang RAG Service với cơ chế Exponential Backoff Retry (3 lần)
    cache.set_upload_progress(document_id, progress=85, status="embedding", stage="indexing_vectors", total_pages=len(pages))
    _update_doc_progress(document_id, progress=85, status="embedding")

    headers = {}
    if user_id:
        headers["X-User-Id"] = user_id

    max_retries = 3
    rag_success = False
    last_rag_error = ""

    for attempt in range(1, max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=RAG_HTTP_TIMEOUT_SECONDS) as client:
                res = await client.post(
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
                    break
                else:
                    last_rag_error = f"RAG Service phản hồi lỗi ({res.status_code}): {res.text}"
        except Exception as e:
            last_rag_error = f"Lỗi kết nối RAG Service ({RAG_SERVICE_URL}): {str(e)}"

        if attempt < max_retries:
            await asyncio.sleep(2 ** (attempt - 1))  # 1s, 2s

    # Pha 5: Hoàn tất
    if rag_success:
        _update_doc_progress(document_id, progress=100, status="ready", error_message=None)
        cache.set_upload_progress(document_id, progress=100, status="ready", stage="completed", total_pages=len(pages))
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

    max_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Kích thước tệp ({_format_file_size(len(content))}) vượt quá giới hạn cho phép {MAX_UPLOAD_SIZE_MB} MB.",
        )

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
    cached = cache.get_upload_progress(document_id)
    if cached:
        return {
            **cached,
            "documentId": cached.get("document_id") or document_id,
            "totalPages": cached.get("total_pages", 0)
        }
    doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy giáo trình.")
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


@app.get("/")
def root_list_documents(db: Session = Depends(get_db)):
    """Tương thích chuyển hướng root sang danh sách tài liệu"""
    return list_documents(db=db)


@app.get("/documents")
def list_documents(
    user_id: Optional[str] = Query(None, description="Lọc theo mã giảng viên sở hữu"),
    current_user_id: Optional[str] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    """Lấy danh sách giáo trình đã nạp trong hệ thống (hỗ trợ lọc theo user_id nếu có)"""
    query = db.query(DocumentDB)
    if user_id:
        query = query.filter(DocumentDB.user_id == user_id)

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
            "uploadedAt": d.created_at.strftime("%d/%m/%Y, %H:%M") if d.created_at else "Hôm nay"
        }
        for d in docs
    ]


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
            {doc.user_id, current_uid}.issubset({"lec-001", "usr-lec-001", "usr-lec-005"})
        )
    )
    is_dev_sample = (
        not doc.user_id or 
        doc.user_id in ["lec-001", "usr-lec-001", "usr-lec-005", "admin"] or
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
