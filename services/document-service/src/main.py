import os
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from uuid import uuid4

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile, Depends, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
import httpx

from .database import engine, Base, get_db, SessionLocal
from .models import DocumentDB, DocumentChapterDB, DocumentChunkDB
from .parser import DocumentParser
from .chunker import TextChunker, EmptyChunksException
from .cache import cache
from .auth import get_current_user_id, get_optional_user_id

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


@app.on_event("startup")
def startup_db():
    """Tự động khởi tạo bảng cơ sở dữ liệu nếu chưa tồn tại"""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[DOCUMENT-SERVICE] DB Startup Warning: {e}")


async def forward_chunks_to_rag(document_id: str, chunks: List[dict], user_id: Optional[str] = None):
    """
    Tác vụ nền: Đẩy các đoạn trích sang RAG service để tính toán Vector Embeddings và cập nhật trạng thái.
    Xử lý an toàn trường hợp ngoại lệ chunks rỗng.
    """
    if not chunks:
        db = SessionLocal()
        try:
            doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
            if doc:
                doc.status = "error"
                doc.error_message = "Không có đoạn trích (chunks) nào để chuyển tiếp sang RAG service."
                cache.set_upload_progress(document_id, progress=0, status="error", stage="empty_chunks")
                db.commit()
        finally:
            db.close()
        return

    db = SessionLocal()
    try:
        headers = {}
        if user_id:
            headers["X-User-Id"] = user_id

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
            doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
            if doc:
                if res.status_code == 200:
                    doc.status = "ready"
                    doc.progress = 100
                    doc.error_message = None
                    cache.set_upload_progress(document_id, progress=100, status="ready", stage="completed", total_pages=doc.total_pages)
                else:
                    doc.status = "error"
                    doc.error_message = f"RAG Service phản hồi lỗi ({res.status_code}): {res.text}"
                    cache.set_upload_progress(document_id, progress=0, status="error", stage="rag_error")
                db.commit()
    except Exception as e:
        doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
        if doc:
            doc.status = "error"
            doc.error_message = f"Không thể kết nối RAG Service ({RAG_SERVICE_URL}): {str(e)}"
            cache.set_upload_progress(document_id, progress=0, status="error", stage="rag_unreachable")
            db.commit()
    finally:
        db.close()


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
    Tiếp nhận tệp giáo trình PDF/DOCX:
    1. Lấy user_id thực tế từ JWT token (loại bỏ hoàn toàn 'lec-001' hardcoded)
    2. Kiểm tra định dạng (.pdf, .docx) và dung lượng (<= 25MB)
    3. Lưu trữ tệp vật lý
    4. Bóc tách văn bản từng trang / đoạn
    5. Phân đoạn ngữ nghĩa (Semantic Chunking) và xử lý ngoại lệ Chunks rỗng
    6. Lưu cơ sở dữ liệu và kích hoạt tác vụ nền đẩy sang RAG Service
    """
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên tệp không hợp lệ.")

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

    # Sinh mã định danh giáo trình mới
    count = db.query(DocumentDB).count()
    doc_id = f"tb-{count + 1:03d}"
    file_size_str = _format_file_size(len(content))

    # Lưu tệp vật lý vào ổ cứng
    storage_file = STORAGE_DIR / f"{doc_id}_{filename}"
    storage_file.write_bytes(content)
    cache.set_upload_progress(doc_id, progress=20, status="extracting", stage="parsing_file")

    # 1. Bóc tách văn bản từ tệp
    try:
        if ext == "pdf":
            pages = DocumentParser.parse_pdf(content)
        else:
            pages = DocumentParser.parse_docx(content)
    except ValueError as e:
        if storage_file.exists():
            storage_file.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        if storage_file.exists():
            storage_file.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi hệ thống khi bóc tách tài liệu: {str(e)}")

    if not pages:
        if storage_file.exists():
            storage_file.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tài liệu không có nội dung văn bản để bóc tách.")

    # 2. Phân đoạn ngữ nghĩa và xử lý triệt để ngoại lệ Chunks rỗng
    try:
        chunks, chapters_metadata = TextChunker.chunk_by_semantic_blocks(pages, doc_id)
    except EmptyChunksException as e:
        if storage_file.exists():
            storage_file.unlink(missing_ok=True)
        cache.set_upload_progress(doc_id, progress=0, status="error", stage="chunking_failed")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        if storage_file.exists():
            storage_file.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi phân đoạn ngữ nghĩa tài liệu: {str(e)}"
        )

    if not chunks:
        if storage_file.exists():
            storage_file.unlink(missing_ok=True)
        cache.set_upload_progress(doc_id, progress=0, status="error", stage="empty_chunks")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tài liệu không tạo ra đoạn trích (chunk) hợp lệ nào sau khi phân đoạn. Vui lòng kiểm tra lại chất lượng văn bản của tài liệu."
        )

    # 3. Lưu bản ghi tài liệu vào CSDL với user_id thật từ JWT
    doc_record = DocumentDB(
        id=doc_id,
        user_id=user_id,
        name=filename,
        file_path=str(storage_file),
        file_size=file_size_str,
        total_pages=len(pages),
        chapters_count=len(chapters_metadata),
        status="embedding",
        progress=50,
        created_at=datetime.utcnow()
    )
    db.add(doc_record)
    db.commit()

    # 4. Lưu danh mục chương mục và các chunks
    chapters_db = [
        DocumentChapterDB(
            id=f"ch-{doc_id}-{ch['chapter_index']}",
            document_id=doc_id,
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
            document_id=doc_id,
            page_number=c["page_number"],
            chapter=c["chapter"],
            char_count=c["char_count"],
            text_snippet=c["text"]
        )
        for c in chunks
    ]
    db.add_all(chunks_db)
    db.commit()

    # 5. Kích hoạt tác vụ nền nạp vector vào RAG Service (kèm định danh user)
    cache.set_upload_progress(doc_id, progress=50, status="embedding", stage="dispatching_to_rag", total_pages=len(pages))
    background_tasks.add_task(forward_chunks_to_rag, doc_id, chunks, user_id=user_id)

    return {
        "message": "Đã tải lên và bóc tách thành công. Đang tiến hành tạo Vector Embedding trong nền.",
        "document": {
            "id": doc_id,
            "userId": user_id,
            "name": filename,
            "size": file_size_str,
            "totalPages": len(pages),
            "chaptersCount": len(chapters_metadata),
            "status": "embedding",
            "progress": 50,
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
    target_user = user_id or current_user_id
    if target_user:
        query = query.filter(DocumentDB.user_id == target_user)

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


@app.get("/documents/{document_id}/chunks")
def get_document_chunks(
    document_id: str, 
    limit: int = Query(default=20, ge=1, le=200), 
    db: Session = Depends(get_db)
):
    """Lấy danh sách các đoạn trích ngữ nghĩa để hiển thị lên Modal xem chi tiết ở Frontend"""
    chunks = db.query(DocumentChunkDB).filter_by(document_id=document_id).limit(limit).all()
    if not chunks:
        doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Không tìm thấy tài liệu có mã {document_id}")
    return {
        "documentId": document_id,
        "totalChunks": len(chunks),
        "chunks": [
            {
                "chunkId": c.id,
                "pageNumber": c.page_number,
                "chapter": c.chapter,
                "textSnippet": c.text_snippet[:400]
            }
            for c in chunks
        ]
    }


@app.delete("/documents/{document_id}")
async def delete_document(
    document_id: str, 
    current_user_id: Optional[str] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    """Xóa hoàn toàn một giáo trình: tệp vật lý, dữ liệu PostgreSQL và gọi RAG dọn dẹp vector"""
    doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài liệu để xóa.")

    # Kiểm tra quyền sở hữu nếu có người dùng đăng nhập
    if current_user_id and doc.user_id and doc.user_id != current_user_id and current_user_id != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xóa tài liệu của giảng viên khác.")

    deleted_vectors = 0
    rag_warning = None

    # 1. Gọi sang RAG Service xóa vector trong ChromaDB
    try:
        headers = {}
        if current_user_id:
            headers["X-User-Id"] = current_user_id

        async with httpx.AsyncClient(timeout=RAG_HTTP_TIMEOUT_SECONDS) as client:
            res = await client.delete(f"{RAG_SERVICE_URL}/documents/{document_id}", headers=headers)
            if res.status_code == 200:
                payload = res.json()
                deleted_vectors = payload.get("deletedCount", payload.get("deleted_chunks_count", 0))
    except Exception as e:
        rag_warning = f"Không thể kết nối RAG service để dọn dẹp vector: {str(e)}"

    # Dọn dẹp cache tiến trình upload và metadata của document-service
    try:
        cache.clear_document_cache(document_id)
    except Exception:
        pass

    # 2. Xóa tệp vật lý trên ổ đĩa
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    # 3. Xóa các bản ghi liên quan trong PostgreSQL
    db.delete(doc)
    db.commit()

    return {
        "message": f"Đã xóa thành công tài liệu {doc.name}.",
        "documentId": document_id,
        "deletedVectors": deleted_vectors,
        "warning": rag_warning
    }
