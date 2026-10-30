from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base, DATABASE_URL

SCHEMA_NAME = "documents" if DATABASE_URL.startswith("postgresql") else None

# ====================================================================
# SQLALCHEMY ORM MODELS
# ====================================================================
class DocumentDB(Base):
    __tablename__ = "documents"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, default="lec-001", index=True)
    name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(String(20), nullable=False)
    total_pages = Column(Integer, default=0)
    chapters_count = Column(Integer, default=0)
    status = Column(String(20), default="extracting", index=True) # extracting, embedding, ready, error
    progress = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    chapters = relationship("DocumentChapterDB", back_populates="document", cascade="all, delete-orphan")
    chunks = relationship("DocumentChunkDB", back_populates="document", cascade="all, delete-orphan")


class DocumentChapterDB(Base):
    __tablename__ = "document_chapters"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True)
    document_id = Column(
        String(50), 
        ForeignKey(f"{SCHEMA_NAME}.documents.id" if SCHEMA_NAME else "documents.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    chapter_index = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    page_start = Column(Integer, default=1)
    page_end = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("DocumentDB", back_populates="chapters")


class DocumentChunkDB(Base):
    __tablename__ = "document_chunks"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(100), primary_key=True)
    document_id = Column(
        String(50), 
        ForeignKey(f"{SCHEMA_NAME}.documents.id" if SCHEMA_NAME else "documents.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    page_number = Column(Integer, nullable=False)
    chapter = Column(String(255), nullable=False)
    char_count = Column(Integer, nullable=False, default=0)
    text_snippet = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("DocumentDB", back_populates="chunks")


# ====================================================================
# PYDANTIC SCHEMAS
# ====================================================================
class DocumentResponse(BaseModel):
    id: str
    name: str
    size: str
    totalPages: int
    chaptersCount: int
    status: str
    progress: int
    uploadedAt: str

    class Config:
        from_attributes = True

class ChunkResponse(BaseModel):
    chunkId: str
    pageNumber: int
    chapter: str
    textSnippet: str
