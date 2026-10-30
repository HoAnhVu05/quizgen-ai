from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
import httpx
from .parser import DocumentParser
from .chunker import TextChunker

app = FastAPI(title="QuizGen AI - Document Service", version="1.0.0")

RAG_SERVICE_URL = "http://rag-service:8003"

# In-memory document status storage
DOCUMENTS_DB = {}

async def forward_chunks_to_rag(document_id: str, chunks: List[dict]):
    """Đẩy các chunk sang RAG service để tính toán Vector Embeddings"""
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            res = await client.post(
                f"{RAG_SERVICE_URL}/index-chunks",
                json={"document_id": document_id, "chunks": chunks}
            )
            if res.status_code == 200:
                DOCUMENTS_DB[document_id]["status"] = "ready"
                DOCUMENTS_DB[document_id]["progress"] = 100
        except Exception as e:
            DOCUMENTS_DB[document_id]["status"] = "error"
            DOCUMENTS_DB[document_id]["error_message"] = str(e)

@app.get("/health")
def health():
    return {"status": "healthy", "service": "document-service"}

@app.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    filename = file.filename
    ext = filename.split(".")[-1].lower()
    
    if ext not in ["pdf", "docx"]:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tệp định dạng .pdf hoặc .docx")

    content = await file.read()
    doc_id = f"doc_{len(DOCUMENTS_DB) + 1:03d}"

    # 1. Parse text from pages
    if ext == "pdf":
        pages = DocumentParser.parse_pdf(content)
    else:
        pages = DocumentParser.parse_docx(content)

    # 2. Chunk text
    chunks = TextChunker.chunk_by_semantic_blocks(pages, doc_id)

    # 3. Store doc record
    DOCUMENTS_DB[doc_id] = {
        "document_id": doc_id,
        "filename": filename,
        "total_pages": len(pages),
        "total_chunks": len(chunks),
        "status": "embedding",
        "progress": 50
    }

    # 4. Trigger asynchronous embedding in background
    background_tasks.add_task(forward_chunks_to_rag, doc_id, chunks)

    return {
        "message": "Đã tải lên và bóc tách thành công. Đang tiến hành tạo Vector Embedding trong nền.",
        "document": DOCUMENTS_DB[doc_id]
    }

@app.get("/documents")
def list_documents():
    return list(DOCUMENTS_DB.values())

@app.get("/documents/{document_id}")
def get_document(document_id: str):
    if document_id not in DOCUMENTS_DB:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu.")
    return DOCUMENTS_DB[document_id]
