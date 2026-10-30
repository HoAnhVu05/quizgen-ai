from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from .vector_store import RAGVectorStore

app = FastAPI(title="QuizGen AI - RAG Vector Service", version="1.0.0")
vector_store = RAGVectorStore()

class IndexChunksRequest(BaseModel):
    document_id: str
    chunks: List[dict]

class QueryContextRequest(BaseModel):
    query: str
    document_id: Optional[str] = None
    chapter: Optional[str] = None
    top_k: int = 5

@app.get("/health")
def health():
    return {"status": "healthy", "service": "rag-service"}

@app.post("/index-chunks")
def index_chunks(req: IndexChunksRequest):
    try:
        vector_store.add_chunks(req.document_id, req.chunks)
        return {
            "status": "success",
            "indexed_chunks_count": len(req.chunks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi index vectors: {str(e)}")

@app.post("/query-context")
def query_context(req: QueryContextRequest):
    try:
        chunks = vector_store.query_context(
            query_text=req.query,
            document_id=req.document_id,
            chapter=req.chapter,
            top_k=req.top_k
        )
        return {
            "query": req.query,
            "total_retrieved": len(chunks),
            "chunks": chunks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi truy vấn RAG: {str(e)}")


@app.delete("/documents/{document_id}")
def delete_document_vectors(document_id: str):
    try:
        deleted_count = vector_store.delete_by_document_id(document_id)
        return {
            "status": "success",
            "document_id": document_id,
            "deleted_chunks_count": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa vectors theo tài liệu: {str(e)}")
