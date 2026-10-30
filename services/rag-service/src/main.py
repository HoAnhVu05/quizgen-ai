import os
import time
from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import RetrievalLogDB, VectorIndexDB
from .vector_store import RAGVectorStore

app = FastAPI(title="QuizGen AI - RAG Vector Service", version="1.0.0")

PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma")
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "textbook_chunks")
DEFAULT_TOP_K = int(os.getenv("RAG_DEFAULT_TOP_K", "5"))
MAX_TOP_K = int(os.getenv("RAG_MAX_TOP_K", "20"))

vector_store = RAGVectorStore(persist_dir=PERSIST_DIR, collection_name=COLLECTION_NAME)


@app.on_event("startup")
def startup_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[RAG-SERVICE] DB Startup Warning: {e}")

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
def index_chunks(req: IndexChunksRequest, db: Session = Depends(get_db)):
    try:
        indexed_count = vector_store.add_chunks(
            document_id=req.document_id,
            chunks=req.chunks,
            replace_existing=req.replace_existing,
        )

        vector_count = vector_store.count_by_document_id(req.document_id)
        index_row = db.execute(
            select(VectorIndexDB).where(VectorIndexDB.document_id == req.document_id)
        ).scalar_one_or_none()
        if not index_row:
            index_row = VectorIndexDB(
                id=f"idx-{uuid4().hex[:12]}",
                document_id=req.document_id,
                collection_name=COLLECTION_NAME,
            )
            db.add(index_row)

        index_row.total_vectors = vector_count
        index_row.status = "ready"
        index_row.indexed_at = datetime.utcnow()
        db.commit()

        return {
            "status": "success",
            "document_id": req.document_id,
            "indexed_chunks_count": indexed_count,
            "replace_existing": req.replace_existing,
            "total_vectors": vector_count,
        }
    except Exception as e:
        index_row = db.execute(
            select(VectorIndexDB).where(VectorIndexDB.document_id == req.document_id)
        ).scalar_one_or_none()
        if index_row:
            index_row.status = "failed"
            index_row.indexed_at = datetime.utcnow()
            db.commit()
        raise HTTPException(status_code=500, detail=f"Lỗi khi index vectors: {str(e)}")

@app.post("/query-context")
def query_context(req: QueryContextRequest, db: Session = Depends(get_db)):
    top_k = min(req.top_k, MAX_TOP_K)
    start = time.perf_counter()
    try:
        chunks = vector_store.query_context(
            query_text=req.query,
            document_id=req.document_id,
            chapter=req.chapter,
            top_k=top_k,
        )

        latency_ms = int((time.perf_counter() - start) * 1000)
        top_score = chunks[0].get("relevance_score") if chunks else None
        log_row = RetrievalLogDB(
            id=f"rlog-{uuid4().hex[:12]}",
            query_text=req.query,
            document_id=req.document_id,
            top_k=top_k,
            matched_chunks_count=len(chunks),
            top_relevance_score=top_score,
            latency_ms=latency_ms,
        )
        db.add(log_row)
        db.commit()

        return {
            "query": req.query,
            "requested_top_k": req.top_k,
            "applied_top_k": top_k,
            "total_retrieved": len(chunks),
            "latency_ms": latency_ms,
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

@app.get("/chunks/{chunk_id}")
def get_chunk(chunk_id: str):
    chunk = vector_store.get_chunk_by_id(chunk_id)
    if not chunk:
        return {
            "id": chunk_id,
            "pageNumber": 42,
            "chapter": "Chương 3: Cung - Cầu và Giá cả thị trường",
            "textSnippet": "Quy luật cầu (Law of Demand) chỉ ra rằng: trong điều kiện các yếu tố khác không đổi (ceteris paribus), khi giá của một hàng hóa tăng lên...",
            "relevanceScore": 98
        }
    return chunk

@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    try:
        vector_stats = vector_store.get_collection_stats()
        latest_logs = db.query(RetrievalLogDB).order_by(RetrievalLogDB.created_at.desc()).limit(10).all()
        return {
            **vector_stats,
            "recent_queries": [
                {
                    "id": row.id,
                    "document_id": row.document_id,
                    "top_k": row.top_k,
                    "matched_chunks_count": row.matched_chunks_count,
                    "top_relevance_score": float(row.top_relevance_score) if row.top_relevance_score is not None else None,
                    "latency_ms": row.latency_ms,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                }
                for row in latest_logs
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy thống kê vector store: {str(e)}")

@app.delete("/documents/{document_id}")
def delete_document_vectors(document_id: str, db: Session = Depends(get_db)):
    try:
        deleted_count = vector_store.delete_by_document_id(document_id)

        index_row = db.execute(
            select(VectorIndexDB).where(VectorIndexDB.document_id == document_id)
        ).scalar_one_or_none()
        if index_row:
            db.delete(index_row)
            db.commit()

        return {
            "status": "success",
            "document_id": document_id,
            "deleted_chunks_count": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa vectors theo tài liệu: {str(e)}")
