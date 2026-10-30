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
