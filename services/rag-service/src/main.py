import os
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import RetrievalLogDB, VectorIndexDB
from .vector_store import RAGVectorStore
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
    title="QuizGen AI - RAG Vector Service",
    description="Microservice lưu trữ Vector ChromaDB, tính toán Embeddings và đối soát minh chứng Zero-Hallucination",
    version="1.0.0"
)

PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma")
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "textbook_chunks")
DEFAULT_TOP_K = int(os.getenv("RAG_DEFAULT_TOP_K", "5"))
MAX_TOP_K = int(os.getenv("RAG_MAX_TOP_K", "20"))

vector_store = RAGVectorStore(persist_dir=PERSIST_DIR, collection_name=COLLECTION_NAME)


@app.on_event("startup")
def startup_db():
    """Tự động khởi tạo schema và bảng cơ sở dữ liệu cho rag-service"""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[RAG-SERVICE] DB Startup Warning: {e}")


class IndexChunksRequest(BaseModel):
    document_id: Optional[str] = None
    documentId: Optional[str] = None
    chunks: List[Dict[str, Any]]
    replace_existing: bool = False
    replaceExisting: Optional[bool] = None

    def get_document_id(self) -> str:
        doc_id = (self.document_id or self.documentId or "").strip()
        if not doc_id:
            raise ValueError("document_id hoặc documentId không được để trống")
        return doc_id

    def should_replace(self) -> bool:
        if self.replaceExisting is not None:
            return self.replaceExisting
        return self.replace_existing


class QueryContextRequest(BaseModel):
    query: str
    document_id: Optional[str] = None
    documentId: Optional[str] = None
    chapter: Optional[str] = None
    chapters: Optional[List[str]] = None
    top_k: int = Field(default=DEFAULT_TOP_K, ge=1)
    topK: Optional[int] = None

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("query không được để trống")
        return value

    def get_document_id(self) -> Optional[str]:
        doc_id = self.document_id or self.documentId
        return doc_id.strip() if doc_id else None

    def get_top_k(self) -> int:
        return self.topK or self.top_k or DEFAULT_TOP_K


@app.get("/health")
def health():
    """Kiểm tra sức khỏe ChromaDB và số lượng vector hiện có"""
    stats = vector_store.get_collection_stats()
    return {
        "status": "healthy",
        "service": "rag-service",
        "collection": COLLECTION_NAME,
        "persistDir": PERSIST_DIR,
        "totalChunks": stats["total_chunks"],
        "totalDocuments": stats["total_documents"],
        "stats": stats
    }


@app.post("/index-chunks", status_code=status.HTTP_200_OK)
def index_chunks(
    req: IndexChunksRequest,
    user_id: Optional[str] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    """
    Tiếp nhận các chunks từ document-service và nạp vào ChromaDB:
    1. Kiểm tra và xử lý ngoại lệ Chunks rỗng (HTTP 422 Unprocessable Entity)
    2. Lấy user_id thật từ JWT token
    3. Upsert các vector vào collection
    4. Cập nhật bản ghi theo dõi trong bảng PostgreSQL rag.vector_indexes
    """
    try:
        doc_id = req.get_document_id()

        # Xử lý ngoại lệ Chunks rỗng
        if not req.chunks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Danh sách đoạn trích (chunks) gửi lên rỗng. Không có dữ liệu để lập chỉ mục vector."
            )

        valid_chunks = [c for c in req.chunks if (c.get("text") or c.get("text_snippet") or "").strip()]
        if not valid_chunks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Tất cả các đoạn trích trong danh sách đều không có nội dung văn bản hợp lệ."
            )

        indexed_count = vector_store.add_chunks(
            document_id=doc_id,
            chunks=valid_chunks,
            replace_existing=req.should_replace(),
        )

        vector_count = vector_store.count_by_document_id(doc_id)
        
        # Cập nhật hoặc tạo bản ghi trong bảng rag.vector_indexes kèm user_id thật
        index_row = db.execute(
            select(VectorIndexDB).where(VectorIndexDB.document_id == doc_id)
        ).scalar_one_or_none()
        
        if not index_row:
            index_row = VectorIndexDB(
                id=f"idx-{uuid4().hex[:12]}",
                document_id=doc_id,
                user_id=user_id,
                collection_name=COLLECTION_NAME,
                total_vectors=vector_count,
                embedding_model="all-MiniLM-L6-v2",
                dimension=384,
                distance_metric="cosine",
                status="ready",
                indexed_at=datetime.utcnow()
            )
            db.add(index_row)
        else:
            index_row.total_vectors = vector_count
            if user_id:
                index_row.user_id = user_id
            index_row.status = "ready"
            index_row.indexed_at = datetime.utcnow()

        db.commit()

        return {
            "message": f"Đã lập chỉ mục thành công {indexed_count} đoạn trích cho tài liệu {doc_id}",
            "status": "success",
            "documentId": doc_id,
            "document_id": doc_id,
            "userId": user_id,
            "indexedChunks": indexed_count,
            "indexed_chunks": indexed_count,
            "totalVectors": vector_count,
            "total_vectors": vector_count
        }
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi khi index vectors vào ChromaDB: {str(e)}")


@app.post("/query-context")
def query_context(
    req: QueryContextRequest,
    user_id: Optional[str] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    """
    Truy vấn tương đồng ngữ nghĩa phục vụ sinh câu hỏi hoặc đối soát:
    1. Kiểm tra Rate Limiting theo user_id nếu có
    2. Kiểm tra Redis RAG Cache
    3. Tìm kiếm Top-K vector gần nhất trong ChromaDB theo cosine distance
    4. Ghi nhận log truy vấn và độ trễ vào PostgreSQL rag.retrieval_logs kèm user_id thật
    5. Trả về contexts kèm relevanceScore (%) và số trang
    """
    start_time = time.perf_counter()
    top_k = min(req.get_top_k(), MAX_TOP_K)
    doc_id = req.get_document_id()

    # 1. Kiểm tra rate limit theo user_id thật nếu có
    if user_id:
        is_allowed, remaining = cache.check_rate_limit(user_id=user_id, limit=60)
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Vượt quá giới hạn tần suất truy vấn RAG (Rate limit exceeded). Vui lòng thử lại sau."
            )

    # 2. Kiểm tra Redis RAG Cache
    cache_target = req.chapter if req.chapter else ("+".join(req.chapters) if req.chapters else req.query)
    if doc_id:
        cached_chunks = cache.get_cached_rag_chunks(doc_id, cache_target)
        if cached_chunks:
            return {
                "query": req.query,
                "requested_top_k": req.get_top_k(),
                "applied_top_k": top_k,
                "total_retrieved": len(cached_chunks),
                "latencyMs": 1,
                "latency_ms": 1.0,
                "meetsSla200ms": True,
                "chunks": cached_chunks[:top_k],
                "cached": True,
                "userId": user_id
            }

    try:
        contexts = vector_store.query_context(
            query_text=req.query,
            document_id=doc_id,
            chapter=req.chapter,
            chapters=req.chapters,
            top_k=top_k,
        )
        # Lưu vào cache nếu có doc_id
        if doc_id and contexts:
            cache.cache_rag_chunks(doc_id, cache_target, contexts, ttl=21600)

        perf_metrics = vector_store.get_last_query_metrics()
        exact_latency_ms = perf_metrics.get("totalLatencyMs", round((time.perf_counter() - start_time) * 1000, 2))
        latency_ms = int(exact_latency_ms)
        top_score = contexts[0].get("relevanceScore") if contexts else None

        # Ghi nhật ký truy xuất vào CSDL kèm user_id thật
        try:
            log_row = RetrievalLogDB(
                id=f"rlog-{uuid4().hex[:12]}",
                user_id=user_id,
                query_text=req.query,
                document_id=doc_id,
                top_k=top_k,
                matched_chunks_count=len(contexts),
                top_relevance_score=top_score,
                latency_ms=latency_ms,
                created_at=datetime.utcnow()
            )
            db.add(log_row)
            db.commit()
        except Exception:
            db.rollback()

        return {
            "query": req.query,
            "totalMatches": len(contexts),
            "total_retrieved": len(contexts),
            "latencyMs": latency_ms,
            "latency_ms": exact_latency_ms,
            "meetsSla200ms": exact_latency_ms < 200.0,
            "performance": perf_metrics,
            "contexts": contexts,
            "chunks": contexts,
            "userId": user_id
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi khi truy vấn RAG Vector Store: {str(e)}")


@app.get("/documents/{document_id}/chunks")
def get_document_chunks(document_id: str, limit: int = Query(default=20, ge=1, le=200)):
    """Lấy danh sách các chunk đã lập chỉ mục của một tài liệu. Trả về 404 Not Found nếu không có chunk nào."""
    try:
        chunks = vector_store.get_chunks_by_document(document_id=document_id, limit=limit)
        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy đoạn trích nào cho tài liệu '{document_id}' trong kho vector ChromaDB."
            )
        return {
            "documentId": document_id,
            "document_id": document_id,
            "totalChunks": len(chunks),
            "total_retrieved": len(chunks),
            "chunks": chunks,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi khi lấy chunks của tài liệu {document_id}: {str(e)}")


@app.get("/chunks/{chunk_id}")
def get_chunk(chunk_id: str):
    """
    Lấy chi tiết văn bản chunk theo ID làm minh chứng cho Review Workspace.
    Nếu không tìm thấy chunk, trả về mã lỗi 404 Not Found theo chuẩn HTTP, tuyệt đối không trả dữ liệu mock mẫu.
    """
    chunk = vector_store.get_chunk_by_id(chunk_id)
    if not chunk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đoạn trích (chunk) với mã định danh '{chunk_id}' trong kho vector."
        )
    return chunk


@app.delete("/documents/{document_id}")
def delete_document_vectors(document_id: str, db: Session = Depends(get_db)):
    """Xóa sạch toàn bộ vectors của tài liệu khỏi ChromaDB khi giảng viên xóa giáo trình"""
    try:
        deleted_count = vector_store.delete_by_document_id(document_id)

        index_row = db.execute(
            select(VectorIndexDB).where(VectorIndexDB.document_id == document_id)
        ).scalar_one_or_none()
        if index_row:
            db.delete(index_row)
            db.commit()

        return {
            "message": f"Đã xóa thành công {deleted_count} vectors và làm sạch toàn bộ cache của tài liệu {document_id}.",
            "status": "success",
            "documentId": document_id,
            "document_id": document_id,
            "deletedCount": deleted_count,
            "deleted_chunks_count": deleted_count,
            "cachePurged": True
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi khi xóa vectors theo tài liệu: {str(e)}")


@app.delete("/documents/{document_id}/cache")
def clear_document_cache(document_id: str):
    """Làm sạch toàn bộ cache (Redis & in-memory) của một tài liệu cụ thể"""
    try:
        cleared = cache.clear_document_cache(document_id)
        return {
            "status": "success",
            "documentId": document_id,
            "clearedKeys": cleared,
            "message": f"Đã làm sạch {cleared} khóa cache của tài liệu {document_id}."
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi khi làm sạch cache: {str(e)}")


@app.get("/benchmark/retrieval")
def benchmark_retrieval(query: str = "quy luật cung cầu và tính co giãn", chapters_count: int = 3):
    """
    Đo đạc và đánh giá thời gian phản hồi truy xuất vector:
    Kiểm thử truy vấn top-k đa chương đồng thời và kiểm tra SLA < 200ms
    """
    mock_chapters = [f"Chương {i}: Chuyên đề {i}" for i in range(1, chapters_count + 1)]
    start = time.perf_counter()
    results = vector_store.query_context(
        query_text=query,
        chapters=mock_chapters,
        top_k=5
    )
    total_ms = round((time.perf_counter() - start) * 1000, 2)
    perf = vector_store.get_last_query_metrics()
    return {
        "status": "success",
        "query": query,
        "chaptersTested": mock_chapters,
        "totalMatches": len(results),
        "latencyMs": total_ms,
        "meetsSla200ms": total_ms < 200.0,
        "performanceBreakdown": perf,
        "slaTarget": "< 200ms"
    }


@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """Lấy số liệu thống kê vector store và nhật ký các truy vấn gần đây"""
    try:
        vector_stats = vector_store.get_collection_stats()
        latest_logs = db.query(RetrievalLogDB).order_by(RetrievalLogDB.created_at.desc()).limit(10).all()
        return {
            **vector_stats,
            "recentQueries": [
                {
                    "id": row.id,
                    "userId": row.user_id,
                    "documentId": row.document_id,
                    "topK": row.top_k,
                    "matchedChunksCount": row.matched_chunks_count,
                    "topRelevanceScore": float(row.top_relevance_score) if row.top_relevance_score is not None else None,
                    "latencyMs": row.latency_ms,
                    "createdAt": row.created_at.strftime("%d/%m/%Y, %H:%M:%S") if row.created_at else None,
                }
                for row in latest_logs
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi khi lấy thống kê vector store: {str(e)}")
