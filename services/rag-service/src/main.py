import os
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from .vector_store import RAGVectorStore

app = FastAPI(title="QuizGen AI - RAG Vector Service", version="1.0.0")

PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma")
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "textbook_chunks")
DEFAULT_TOP_K = int(os.getenv("RAG_DEFAULT_TOP_K", "5"))
MAX_TOP_K = int(os.getenv("RAG_MAX_TOP_K", "20"))

vector_store = RAGVectorStore(persist_dir=PERSIST_DIR, collection_name=COLLECTION_NAME)

class IndexChunksRequest(BaseModel):
    document_id: str
    chunks: List[Dict]
    replace_existing: bool = False

    @field_validator("document_id")
    @classmethod
    def validate_document_id(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("document_id không được để trống")
        return value

    @field_validator("chunks")
    @classmethod
    def validate_chunks(cls, value: List[Dict]) -> List[Dict]:
        if not value:
            raise ValueError("chunks không được rỗng")
        return value

class QueryContextRequest(BaseModel):
    query: str
    document_id: Optional[str] = None
    chapter: Optional[str] = None
    top_k: int = Field(default=DEFAULT_TOP_K, ge=1)

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("query không được để trống")
        return value

@app.get("/health")
def health():
    stats = vector_store.get_collection_stats()
    return {
        "status": "healthy",
        "service": "rag-service",
        "collection": COLLECTION_NAME,
        "persistDir": PERSIST_DIR,
        "totalChunks": stats["total_chunks"],
        "totalDocuments": stats["total_documents"],
    }

@app.post("/index-chunks")
def index_chunks(req: IndexChunksRequest):
    try:
        indexed_count = vector_store.add_chunks(
            document_id=req.document_id,
            chunks=req.chunks,
            replace_existing=req.replace_existing,
        )
        return {
            "status": "success",
            "document_id": req.document_id,
            "indexed_chunks_count": indexed_count,
            "replace_existing": req.replace_existing,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi index vectors: {str(e)}")

@app.post("/query-context")
def query_context(req: QueryContextRequest):
    top_k = min(req.top_k, MAX_TOP_K)
    try:
        chunks = vector_store.query_context(
            query_text=req.query,
            document_id=req.document_id,
            chapter=req.chapter,
            top_k=top_k,
        )
        return {
            "query": req.query,
            "requested_top_k": req.top_k,
            "applied_top_k": top_k,
            "total_retrieved": len(chunks),
            "chunks": chunks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi truy vấn RAG: {str(e)}")


@app.get("/documents/{document_id}/chunks")
def get_document_chunks(document_id: str, limit: int = Query(default=20, ge=1, le=200)):
    try:
        chunks = vector_store.get_chunks_by_document(document_id=document_id, limit=limit)
        return {
            "document_id": document_id,
            "total_retrieved": len(chunks),
            "chunks": chunks,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy chunks của tài liệu: {str(e)}")


@app.get("/stats")
def get_stats():
    try:
        return vector_store.get_collection_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy thống kê vector store: {str(e)}")


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
