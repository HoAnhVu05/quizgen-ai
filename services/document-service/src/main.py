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
from .chunker import TextChunker
from .cache import cache

app = FastAPI(
    title="QuizGen AI - Document Service",
    description="Microservice bóc tách giáo trình PDF/Word, phân đoạn ngữ nghĩa và liên kết RAG",
    version="1.0.0"
)

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://rag-service:8003")
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
    """Tự động khởi tạo bảng cơ sở dữ liệu và nạp dữ liệu mẫu ban đầu nếu trống"""
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        existing = db.execute(select(DocumentDB).filter_by(id="tb-001")).scalar_one_or_none()
        if not existing:
            default_doc = DocumentDB(
                id="tb-001",
                user_id="lec-001",
                name="GiaoTrinh_KinhTeViMo_2025.pdf",
                file_path=str(STORAGE_DIR / "tb-001_GiaoTrinh_KinhTeViMo_2025.pdf"),
                file_size="14.2 MB",
                total_pages=184,
                chapters_count=5,
                status="ready",
                progress=100,
                created_at=datetime.utcnow()
            )
            db.add(default_doc)
            db.commit()

            # Seed danh mục chương mẫu
            chapters = [
                DocumentChapterDB(id="ch-tb-001-1", document_id="tb-001", chapter_index=1, title="Chương 1: Khái quát về Kinh tế học vi mô và Các nguyên lý nền tảng", page_start=1, page_end=35),
                DocumentChapterDB(id="ch-tb-001-2", document_id="tb-001", chapter_index=2, title="Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường", page_start=36, page_end=68),
                DocumentChapterDB(id="ch-tb-001-3", document_id="tb-001", chapter_index=3, title="Chương 3: Lý thuyết hành vi người tiêu dùng và Lợi ích biên", page_start=69, page_end=110),
                DocumentChapterDB(id="ch-tb-001-4", document_id="tb-001", chapter_index=4, title="Chương 4: Lý thuyết sản xuất, Chi phí và Tối đa hóa lợi nhuận", page_start=111, page_end=150),
                DocumentChapterDB(id="ch-tb-001-5", document_id="tb-001", chapter_index=5, title="Chương 5: Cấu trúc thị trường: Cạnh tranh hoàn hảo và Độc quyền", page_start=151, page_end=184),
            ]
            db.add_all(chapters)

            # Seed chunks mẫu
            chunks = [
                DocumentChunkDB(
                    id="chunk-1",
                    document_id="tb-001",
                    page_number=42,
                    chapter="Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường",
                    char_count=342,
                    text_snippet="Quy luật cầu (Law of Demand) chỉ ra rằng: trong điều kiện các yếu tố khác không đổi (ceteris paribus), khi giá của một hàng hóa hoặc dịch vụ tăng lên thì lượng cầu về hàng hóa hoặc dịch vụ đó sẽ giảm xuống và ngược lại. Mối quan hệ tỷ lệ nghịch này được thể hiện thông qua đường cầu dốc xuống từ trái sang phải trên đồ thị giá - lượng."
                ),
                DocumentChunkDB(
                    id="chunk-2",
                    document_id="tb-001",
                    page_number=45,
                    chapter="Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường",
                    char_count=318,
                    text_snippet="Hàng hóa thay thế (Substitute goods) là những cặp hàng hóa thỏa mãn cùng một nhu cầu. Khi giá của mặt hàng X tăng lên, người tiêu dùng có xu hướng giảm tiêu thụ X và chuyển sang sử dụng mặt hàng thay thế Y, làm cho lượng cầu của hàng hóa Y tăng lên dù giá của Y không đổi."
                ),
                DocumentChunkDB(
                    id="chunk-3",
                    document_id="tb-001",
                    page_number=48,
                    chapter="Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường",
                    char_count=295,
                    text_snippet="Hệ số co giãn của cầu theo giá (Price Elasticity of Demand - PED) đo lường mức độ phản ứng của lượng cầu trước sự thay đổi của giá cả. Nếu |PED| > 1, cầu được coi là co giãn nhiều (Elastic demand), việc giảm giá sẽ làm tăng tổng doanh thu (Total Revenue) của doanh nghiệp."
                )
            ]
            db.add_all(chunks)
            db.commit()
        db.close()
    except Exception as e:
        print(f"[DOCUMENT-SERVICE] DB Startup Warning: {e}")


async def forward_chunks_to_rag(document_id: str, chunks: List[dict]):
    """Tác vụ nền: Đẩy các đoạn trích sang RAG service để tính toán Vector Embeddings và cập nhật trạng thái"""
    db = SessionLocal()
    try:
        async with httpx.AsyncClient(timeout=RAG_HTTP_TIMEOUT_SECONDS) as client:
            res = await client.post(
                f"{RAG_SERVICE_URL}/index-chunks",
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
                db.commit()
    except Exception as e:
        doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
        if doc:
            doc.status = "error"
            doc.error_message = f"Không thể kết nối RAG Service ({RAG_SERVICE_URL}): {str(e)}"
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
    db: Session = Depends(get_db)
):
    """
    Tiếp nhận tệp giáo trình PDF/DOCX:
    1. Kiểm tra định dạng (.pdf, .docx) và dung lượng (<= 25MB)
    2. Lưu trữ tệp vật lý
    3. Bóc tách văn bản từng trang / đoạn
    4. Phân đoạn ngữ nghĩa (Semantic Chunking)
    5. Lưu cơ sở dữ liệu và kích hoạt tác vụ nền đẩy sang RAG Service
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Tên tệp không hợp lệ.")

    filename = file.filename
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ["pdf", "docx"]:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tệp định dạng .pdf hoặc .docx")

    content = await file.read()
    max_size_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_size_bytes:
        raise HTTPException(
            status_code=413,
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
        # Xóa tệp vật lý nếu bóc tách lỗi
        if storage_file.exists():
            storage_file.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if storage_file.exists():
            storage_file.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống khi bóc tách tài liệu: {str(e)}")

    if not pages:
        if storage_file.exists():
            storage_file.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Tài liệu không có nội dung văn bản để bóc tách.")

    # 2. Phân đoạn ngữ nghĩa và trích xuất cấu trúc chương mục
    chunks, chapters_metadata = TextChunker.chunk_by_semantic_blocks(pages, doc_id)

    # 3. Lưu bản ghi tài liệu vào PostgreSQL
    doc_record = DocumentDB(
        id=doc_id,
        user_id="lec-001",
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

    # 5. Kích hoạt tác vụ nền nạp vector vào RAG Service
    cache.set_upload_progress(doc_id, progress=50, status="embedding", stage="dispatching_to_rag", total_pages=len(pages))
    background_tasks.add_task(forward_chunks_to_rag, doc_id, chunks)

    return {
        "message": "Đã tải lên và bóc tách thành công. Đang tiến hành tạo Vector Embedding trong nền.",
        "document": {
            "id": doc_id,
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
def get_document_progress(document_id: str, db: Session = Depends(get_db)):
    cached = cache.get_upload_progress(document_id)
    if cached:
        return cached
    doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy giáo trình.")
    return {
        "document_id": doc.id,
        "progress": doc.progress,
        "status": doc.status,
        "stage": "completed" if doc.progress == 100 else doc.status,
        "total_pages": doc.total_pages
    }

@app.get("/")
def root_list_documents(db: Session = Depends(get_db)):
    """Tương thích chuyển hướng root sang danh sách tài liệu"""
    return list_documents(db=db)


@app.get("/documents")
def list_documents(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả giáo trình đã nạp trong hệ thống (sắp xếp mới nhất trước)"""
    docs = db.query(DocumentDB).order_by(DocumentDB.created_at.desc()).all()
    return [
        {
            "id": d.id,
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
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tài liệu có mã {document_id}")

    chapters = (
        db.query(DocumentChapterDB.title)
        .filter_by(document_id=document_id)
        .order_by(DocumentChapterDB.chapter_index)
        .all()
    )
    return {
        "id": doc.id,
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
        raise HTTPException(status_code=404, detail="Tệp tài liệu gốc không tồn tại trên hệ thống lưu trữ.")

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
async def delete_document(document_id: str, db: Session = Depends(get_db)):
    """Xóa hoàn toàn một giáo trình: tệp vật lý, dữ liệu PostgreSQL và gọi RAG dọn dẹp vector"""
    doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu để xóa.")

    deleted_vectors = 0
    rag_warning = None

    # 1. Gọi sang RAG Service xóa vector trong ChromaDB
    try:
        async with httpx.AsyncClient(timeout=RAG_HTTP_TIMEOUT_SECONDS) as client:
            res = await client.delete(f"{RAG_SERVICE_URL}/documents/{document_id}")
            if res.status_code == 200:
                payload = res.json()
                deleted_vectors = payload.get("deletedCount", payload.get("deleted_chunks_count", 0))
    except Exception as e:
        rag_warning = f"Không thể kết nối RAG service để dọn dẹp vector: {str(e)}"

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
