from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, Numeric, String, Text

from .database import Base, DATABASE_URL


SCHEMA_NAME = "rag" if DATABASE_URL.startswith("postgresql") else None


class VectorIndexDB(Base):
    __tablename__ = "vector_indexes"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True)
    document_id = Column(String(50), nullable=False, index=True)
    collection_name = Column(String(100), nullable=False, default="textbook_chunks")
    total_vectors = Column(Integer, nullable=False, default=0)
    embedding_model = Column(String(100), nullable=False, default="all-MiniLM-L6-v2")
    dimension = Column(Integer, nullable=False, default=384)
    distance_metric = Column(String(20), nullable=False, default="cosine")
    status = Column(String(20), nullable=False, default="indexing")
    indexed_at = Column(DateTime, default=datetime.utcnow)


class RetrievalLogDB(Base):
    __tablename__ = "retrieval_logs"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True)
    query_text = Column(Text, nullable=False)
    document_id = Column(String(50), nullable=True, index=True)
    top_k = Column(Integer, nullable=False, default=5)
    matched_chunks_count = Column(Integer, nullable=False, default=0)
    top_relevance_score = Column(Numeric(5, 2), nullable=True)
    latency_ms = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
