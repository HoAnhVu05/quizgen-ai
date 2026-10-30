import os
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from uuid import uuid4

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select
import httpx

from .database import engine, Base, get_db, SessionLocal
from .models import DocumentDB, DocumentChapterDB, DocumentChunkDB
from .parser import DocumentParser
from .chunker import TextChunker

app = FastAPI(title="QuizGen AI - Document Service", version="1.0.0")

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://rag-service:8003")
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "25"))
RAG_HTTP_TIMEOUT_SECONDS = float(os.getenv("RAG_HTTP_TIMEOUT_SECONDS", "120"))
STORAGE_DIR = Path(os.getenv("DOCUMENT_STORAGE_DIR", "./data/uploads"))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def _format_file_size(byte_count: int) -> str:
    if byte_count < 1024:
        return f"{byte_count} B"
    if byte_count < 1024 * 1024:
        return f"{byte_count / 1024:.1f} KB"
    return f"{byte_count / (1024 * 1024):.1f} MB"


# Auto-create tables & seed default data on startup
@app.on_event("startup")
def startup_db():
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        existing = db.execute(select(DocumentDB).filter_by(id="tb-001")).scalar_one_or_none()
        if not existing:
            default_doc = DocumentDB(
                id="tb-001",
                user_id="lec-001",
                name="GiaoTrinh_KinhTeViMo_2025.pdf",
                file_path="/storage/textbooks/GiaoTrinh_KinhTeViMo_2025.pdf",
                file_size="14.2 MB",
                total_pages=320,
                chapters_count=12,
                status="ready",
                progress=100,
                created_at=datetime.utcnow()
            )
            db.add(default_doc)
            db.commit()

            # Seed chapters
            chapters = [
                DocumentChapterDB(id="ch-1", document_id="tb-001", chapter_index=1, title="Chương 1: Khái quát về kinh tế học vi mô", page_start=1, page_end=35),
                DocumentChapterDB(id="ch-2", document_id="tb-001", chapter_index=2, title="Chương 2: Lý thuyết hành vi người tiêu dùng", page_start=36, page_end=68),
                DocumentChapterDB(id="ch-3", document_id="tb-001", chapter_index=3, title="Chương 3: Cung - Cầu và Giá cả thị trường", page_start=69, page_end=115),
            ]
            db.add_all(chapters)

            # Seed chunks
            chunks = [
                DocumentChunkDB(
                    id="chunk-1",
                    document_id="tb-001",
                    page_number=42,
                    chapter="Chương 3: Cung - Cầu và Giá cả thị trường",
                    char_count=342,
                    text_snippet="Quy luật cầu (Law of Demand) chỉ ra rằng: trong điều kiện các yếu tố khác không đổi (ceteris paribus), khi giá của một hàng hóa hoặc dịch vụ tăng lên thì lượng cầu về hàng hóa hoặc dịch vụ đó sẽ giảm xuống và ngược lại. Mối quan hệ tỷ lệ nghịch này được thể hiện thông qua đường cầu dốc xuống từ trái sang phải trên đồ thị giá - lượng."
                ),
                DocumentChunkDB(
                    id="chunk-2",
                    document_id="tb-001",
                    page_number=45,
                    chapter="Chương 3: Cung - Cầu và Giá cả thị trường",
                    char_count=318,
                    text_snippet="Hàng hóa thay thế (Substitute goods) là những cặp hàng hóa thỏa mãn cùng một nhu cầu. Khi giá của mặt hàng X tăng lên, người tiêu dùng có xu hướng giảm tiêu thụ X và chuyển sang sử dụng mặt hàng thay thế Y, làm cho lượng cầu của hàng hóa Y tăng lên dù giá của Y không đổi."
                ),
                DocumentChunkDB(
                    id="chunk-3",
                    document_id="tb-001",
                    page_number=48,
                    chapter="Chương 3: Cung - Cầu và Giá cả thị trường",
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
    """Đẩy các chunk sang RAG service để tính toán Vector Embeddings và cập nhật DB"""
    db = SessionLocal()
    try:
        async with httpx.AsyncClient(timeout=RAG_HTTP_TIMEOUT_SECONDS) as client:
            res = await client.post(
                f"{RAG_SERVICE_URL}/index-chunks",
                json={"document_id": document_id, "chunks": chunks, "replace_existing": True}
            )
            doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
            if doc:
                if res.status_code == 200:
                    doc.status = "ready"
                    doc.progress = 100
                else:
                    doc.status = "error"
                    doc.error_message = f"RAG returned {res.status_code}"
                db.commit()
    except Exception as e:
        doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
        if doc:
            doc.status = "error"
            doc.error_message = str(e)
            db.commit()
    finally:
        db.close()


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "document-service",
        "maxUploadSizeMb": MAX_UPLOAD_SIZE_MB,
        "ragServiceUrl": RAG_SERVICE_URL,
    }


@app.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Tên tệp không hợp lệ.")

    filename = file.filename
    ext = filename.split(".")[-1].lower()
    if ext not in ["pdf", "docx"]:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tệp định dạng .pdf hoặc .docx")

    content = await file.read()
    max_size_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Kích thước tệp vượt quá giới hạn {MAX_UPLOAD_SIZE_MB} MB.",
        )

    count = db.query(DocumentDB).count()
    doc_id = f"tb-{count + 1:03d}"
    file_size_str = _format_file_size(len(content))

    # Lưu tệp vật lý vào storage
    storage_file = STORAGE_DIR / f"{doc_id}_{filename}"
    storage_file.write_bytes(content)

    # 1. Parse text from pages
    if ext == "pdf":
        pages = DocumentParser.parse_pdf(content)
    else:
        pages = DocumentParser.parse_docx(content)

    if not pages:
        raise HTTPException(status_code=400, detail="Tài liệu không có nội dung văn bản để bóc tách.")

    # 2. Chunk text
    chunks = TextChunker.chunk_by_semantic_blocks(pages, doc_id)
    unique_chapters = sorted({c["chapter"] for c in chunks if c.get("chapter")})

    # 3. Save document record in PostgreSQL
    doc_record = DocumentDB(
        id=doc_id,
        user_id="lec-001",
        name=filename,
        file_path=str(storage_file),
        file_size=file_size_str,
        total_pages=len(pages),
        chapters_count=len(unique_chapters),
        status="embedding",
        progress=50,
        created_at=datetime.utcnow()
    )
    db.add(doc_record)
    db.commit()

    # 4. Save chapters and chunks in DB
    chapters_db = [
        DocumentChapterDB(
            id=f"ch-{doc_id}-{idx + 1}",
            document_id=doc_id,
            chapter_index=idx + 1,
            title=ch_name
        )
        for idx, ch_name in enumerate(unique_chapters)
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

    # 5. Background indexing in RAG service
    background_tasks.add_task(forward_chunks_to_rag, doc_id, chunks)

    return {
        "message": "Đã tải lên và bóc tách thành công. Đang tiến hành tạo Vector Embedding trong nền.",
        "document": {
            "id": doc_id,
            "name": filename,
            "size": file_size_str,
            "totalPages": len(pages),
            "chaptersCount": len(unique_chapters),
            "status": "embedding",
            "progress": 50,
            "uploadedAt": "Vừa xong"
        }
    }


@app.get("/")
def root_list_documents(db: Session = Depends(get_db)):
    return list_documents(db=db)


@app.get("/documents")
def list_documents(db: Session = Depends(get_db)):
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
            "uploadedAt": d.created_at.strftime("%d/%m/%Y") if d.created_at else "Hôm nay"
        }
        for d in docs
    ]


@app.get("/documents/{document_id}")
def get_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu.")
    
    chapters = db.query(DocumentChapterDB.title).filter_by(document_id=document_id).all()
    return {
        "id": doc.id,
        "name": doc.name,
        "size": doc.file_size,
        "totalPages": doc.total_pages,
        "chaptersCount": doc.chapters_count,
        "chapters": [c[0] for c in chapters],
        "status": doc.status,
        "progress": doc.progress,
        "uploadedAt": doc.created_at.strftime("%d/%m/%Y") if doc.created_at else "Hôm nay"
    }


@app.get("/documents/{document_id}/chunks")
def get_document_chunks(document_id: str, limit: int = Query(default=20, ge=1, le=200), db: Session = Depends(get_db)):
    chunks = db.query(DocumentChunkDB).filter_by(document_id=document_id).limit(limit).all()
    return {
        "documentId": document_id,
        "totalChunks": len(chunks),
        "chunks": [
            {
                "chunkId": c.id,
                "pageNumber": c.page_number,
                "chapter": c.chapter,
                "textSnippet": c.text_snippet[:300]
            }
            for c in chunks
        ]
    }


@app.get("/documents/{document_id}/chapters")
def get_document_chapters(document_id: str, db: Session = Depends(get_db)):
    chapters = db.query(DocumentChapterDB).filter_by(document_id=document_id).order_by(DocumentChapterDB.chapter_index).all()
    if not chapters:
        chunk_chapters = db.query(DocumentChunkDB.chapter).filter_by(document_id=document_id).distinct().all()
        return [c[0] for c in chunk_chapters] if chunk_chapters else ["Chương 1: Khái quát", "Chương 2: Nội dung"]
    return [c.title for c in chapters]


@app.delete("/documents/{document_id}")
async def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.execute(select(DocumentDB).filter_by(id=document_id)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu để xóa.")

    deleted_vectors = 0
    rag_warning = None
    async with httpx.AsyncClient(timeout=RAG_HTTP_TIMEOUT_SECONDS) as client:
        try:
            res = await client.delete(f"{RAG_SERVICE_URL}/documents/{document_id}")
            if res.status_code == 200:
                deleted_vectors = res.json().get("deleted_chunks_count", 0)
        except Exception as e:
            rag_warning = f"Không thể kết nối RAG service để xóa vector: {str(e)}"

    # Xóa file vật lý
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()

    return {
        "message": "Đã xóa tài liệu khỏi Document Service.",
        "documentId": document_id,
        "deletedVectors": deleted_vectors,
        "warning": rag_warning
    }
