from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base, DATABASE_URL

# Xác định schema PostgreSQL nếu dùng PostgreSQL
SCHEMA_NAME = "auth" if DATABASE_URL.startswith("postgresql") else None

# ====================================================================
# SQLALCHEMY ORM MODELS
# ====================================================================
class UserDB(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    academic_title = Column(String(20), default="TS.")
    university = Column(String(150), nullable=False)
    department = Column(String(150), nullable=False)
    role = Column(String(20), default="lecturer")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tokens = relationship("UserTokenDB", back_populates="user", cascade="all, delete-orphan")


class UserTokenDB(Base):
    __tablename__ = "user_tokens"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True)
    user_id = Column(
        String(50), 
        ForeignKey(f"{SCHEMA_NAME}.users.id" if SCHEMA_NAME else "users.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    token_hash = Column(String(255), nullable=False)
    device_info = Column(String(255), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("UserDB", back_populates="tokens")


# ====================================================================
# PYDANTIC SCHEMAS (API REQUEST / RESPONSE)
# ====================================================================
class LecturerBase(BaseModel):
    email: EmailStr
    full_name: str
    academic_title: str  # e.g., "TS.", "PGS.TS.", "ThS."
    university: str
    department: str

class LecturerCreate(LecturerBase):
    password: str

class LecturerResponse(LecturerBase):
    id: str
    role: str = "lecturer"
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: LecturerResponse
