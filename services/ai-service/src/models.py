import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean, JSON
from .database import Base, DATABASE_URL

SCHEMA_NAME = "ai" if DATABASE_URL.startswith("postgresql") else None

# ====================================================================
# SQLALCHEMY ORM MODELS
# ====================================================================
class AIGenerationJobDB(Base):
    __tablename__ = "generation_jobs"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, default="lec-001", index=True)
    document_id = Column(String(50), nullable=False, index=True)
    chapters = Column(JSON, nullable=False)
    bloom_matrix = Column(JSON, nullable=False)
    total_requested = Column(Integer, nullable=False, default=0)
    total_generated = Column(Integer, default=0)
    status = Column(String(20), default="queued", index=True) # queued, processing, completed, failed
    llm_provider = Column(String(50), default="gemini")
    model_version = Column(String(50), default="gemini-1.5-pro")
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)


class BloomPresetDB(Base):
    __tablename__ = "bloom_presets"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    nhan_biet_pct = Column(Integer, default=40)
    thong_hieu_pct = Column(Integer, default=40)
    van_dung_pct = Column(Integer, default=20)
    phan_tich_pct = Column(Integer, default=0)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ====================================================================
# PYDANTIC SCHEMAS
# ====================================================================
class GenerateRequest(BaseModel):
    document_id: Optional[str] = None
    documentId: Optional[str] = None
    chapters: List[str]
    bloom_matrix: Optional[Dict[str, int]] = None
    bloomMatrix: Optional[Dict[str, int]] = None

    def get_document_id(self) -> str:
        return self.documentId or self.document_id or "tb-001"

    def get_bloom_matrix(self) -> Dict[str, int]:
        return self.bloomMatrix or self.bloom_matrix or {"nhanBiet": 4, "thongHieu": 4, "vanDung": 2, "phanTich": 0}
