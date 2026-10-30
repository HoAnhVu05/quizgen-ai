import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List
from uuid import uuid4

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile, status
import httpx
from .parser import DocumentParser
from .chunker import TextChunker

app = FastAPI(title="QuizGen AI - Document Service", version="1.0.0")

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://rag-service:8003")
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "25"))
RAG_HTTP_TIMEOUT_SECONDS = float(os.getenv("RAG_HTTP_TIMEOUT_SECONDS", "120"))
STORAGE_DIR = Path(os.getenv("DOCUMENT_STORAGE_DIR", "./data/uploads"))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# In-memory document status storage
DOCUMENTS_DB: Dict[str, Dict] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _format_file_size(byte_count: int) -> str:
    if byte_count < 1024:
        return f"{byte_count} B"
    if byte_count < 1024 * 1024:
        return f"{byte_count / 1024:.1f} KB"
    return f"{byte_count / (1024 * 1024):.1f} MB"


def _to_public_document(record: Dict) -> Dict:
    # Public response uses camelCase so frontend can consume directly.
    return {
        "id": record["id"],
        "name": record["filename"],
        "size": _format_file_size(record["file_size_bytes"]),
        "totalPages": record["total_pages"],
        "chaptersCount": record["chapters_count"],
        "totalChunks": record["total_chunks"],
        "status": record["status"],
        "progress": record["progress"],
        "uploadedAt": record["uploaded_at"],
        "updatedAt": record["updated_at"],
        "errorMessage": record.get("error_message"),
    }


def _to_public_chunk(chunk: Dict) -> Dict:
    return {
        "chunkId": chunk["chunk_id"],
        "pageNumber": chunk["page_number"],
        "chapter": chunk["chapter"],
        "textSnippet": chunk["text"][:300],
        "charCount": chunk["char_count"],
    }


async def _index_chunks_to_rag(document_id: str, chunks: List[Dict]) -> None:
    async with httpx.AsyncClient(timeout=RAG_HTTP_TIMEOUT_SECONDS) as client:
        response = await client.post(
            f"{RAG_SERVICE_URL}/index-chunks",
            json={"document_id": document_id, "chunks": chunks},
        )
        if response.status_code != 200:
            raise RuntimeError(
                f"RAG service indexing failed: {response.status_code} - {response.text}"
            )


async def _process_document_pipeline(document_id: str, file_path: str, ext: str) -> None:
    record = DOCUMENTS_DB[document_id]
    try:
        with open(file_path, "rb") as f:
            content = f.read()

        record["status"] = "extracting"
        record["progress"] = 25
        record["updated_at"] = _now_iso()

        if ext == "pdf":
            pages = DocumentParser.parse_pdf(content)
        else:
            pages = DocumentParser.parse_docx(content)

        if not pages:
            raise RuntimeError("Tài liệu không có nội dung văn bản để bóc tách.")

        record["status"] = "extracting"
        record["progress"] = 45
        record["total_pages"] = len(pages)
        record["updated_at"] = _now_iso()

        chunks = TextChunker.chunk_by_semantic_blocks(pages, document_id)
        if not chunks:
            raise RuntimeError("Không thể tạo chunks từ tài liệu. Vui lòng kiểm tra định dạng nội dung.")
        chapters = sorted({c["chapter"] for c in chunks if c.get("chapter")})

        record["status"] = "embedding"
        record["progress"] = 70
        record["total_chunks"] = len(chunks)
        record["chapters_count"] = len(chapters)
        record["chapters"] = chapters
        record["chunks"] = chunks
        record["updated_at"] = _now_iso()

        await _index_chunks_to_rag(document_id, chunks)

        record["status"] = "ready"
        record["progress"] = 100
        record["updated_at"] = _now_iso()
    except Exception as exc:
        record["status"] = "error"
        record["error_message"] = str(exc)
        record["updated_at"] = _now_iso()


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
    file: UploadFile = File(...)
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

    doc_id = f"doc_{uuid4().hex[:8]}"
    uploaded_at = _now_iso()
    file_path = STORAGE_DIR / f"{doc_id}.{ext}"
    file_path.write_bytes(content)

    DOCUMENTS_DB[doc_id] = {
        "id": doc_id,
        "filename": filename,
        "file_size_bytes": len(content),
        "storage_path": str(file_path),
        "extension": ext,
        "total_pages": 0,
        "chapters_count": 0,
        "total_chunks": 0,
        "chapters": [],
        "chunks": [],
        "status": "uploading",
        "progress": 10,
        "uploaded_at": uploaded_at,
        "updated_at": uploaded_at,
        "error_message": None,
    }

    background_tasks.add_task(_process_document_pipeline, doc_id, str(file_path), ext)

    return {
        "message": "Đã tải lên thành công. Tài liệu đang được xử lý trong nền.",
        "document": _to_public_document(DOCUMENTS_DB[doc_id]),
    }


@app.get("/")
def root_list_documents():
    return list_documents()


@app.get("/documents")
def list_documents():
    records = sorted(
        DOCUMENTS_DB.values(),
        key=lambda item: item["uploaded_at"],
        reverse=True,
    )
    return [_to_public_document(r) for r in records]


@app.get("/documents/{document_id}")
def get_document(document_id: str):
    if document_id not in DOCUMENTS_DB:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu.")
    record = DOCUMENTS_DB[document_id]
    response = _to_public_document(record)
    response["chapters"] = record["chapters"]
    return response


@app.get("/documents/{document_id}/chunks")
def get_document_chunks(document_id: str, limit: int = 20):
    if document_id not in DOCUMENTS_DB:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu.")

    if limit < 1 or limit > 200:
        raise HTTPException(status_code=400, detail="Tham số limit phải trong khoảng 1-200.")

    record = DOCUMENTS_DB[document_id]
    chunks = record.get("chunks", [])[:limit]
    return {
        "documentId": document_id,
        "totalChunks": record.get("total_chunks", 0),
        "chunks": [_to_public_chunk(c) for c in chunks],
    }


@app.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    if document_id not in DOCUMENTS_DB:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu.")

    deleted_vectors = 0
    rag_delete_warning = None
    async with httpx.AsyncClient(timeout=RAG_HTTP_TIMEOUT_SECONDS) as client:
        try:
            rag_response = await client.delete(f"{RAG_SERVICE_URL}/documents/{document_id}")
            if rag_response.status_code == 200:
                deleted_vectors = rag_response.json().get("deleted_chunks_count", 0)
            else:
                rag_delete_warning = (
                    f"RAG service trả về {rag_response.status_code}, vector có thể chưa được xóa."
                )
        except Exception as exc:
            rag_delete_warning = f"Không thể kết nối RAG service để xóa vector: {str(exc)}"

    record = DOCUMENTS_DB.pop(document_id)
    storage_path = record.get("storage_path")
    if storage_path and os.path.exists(storage_path):
        os.remove(storage_path)

    return {
        "message": "Đã xóa tài liệu khỏi Document Service.",
        "documentId": document_id,
        "deletedVectors": deleted_vectors,
        "warning": rag_delete_warning,
    }
