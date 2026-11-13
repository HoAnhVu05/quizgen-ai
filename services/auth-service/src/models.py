from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base, DATABASE_URL

# Xác định schema PostgreSQL nếu dùng PostgreSQL
SCHEMA_NAME = "auth" if DATABASE_URL.startswith("postgresql") else None

# ====================================================================
# SQLALCHEMY ORM MODELS
# ====================================================================
class UniversityDB(Base):
    __tablename__ = "universities"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    city = Column(String(100), default="Hà Nội")
    website = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    faculties = relationship("FacultyDB", back_populates="university", cascade="all, delete-orphan")


class FacultyDB(Base):
    __tablename__ = "faculties"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True)
    university_id = Column(
        String(50), 
        ForeignKey(f"{SCHEMA_NAME}.universities.id" if SCHEMA_NAME else "universities.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    code = Column(String(20), nullable=False)
    name = Column(String(200), nullable=False)
    dean_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    university = relationship("UniversityDB", back_populates="faculties")


class UserDB(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False, default="")
    academic_title = Column(String(20), default="")
    university = Column(String(150), nullable=False, default="")
    department = Column(String(150), nullable=False, default="")
    role = Column(String(30), default="lecturer") # lecturer, head_of_department, admin
    is_active = Column(Boolean, default=True)
    status = Column(String(20), default="active") # active, locked
    lock_type = Column(String(20), nullable=True) # temporary, permanent
    lock_reason = Column(Text, nullable=True)
    locked_until = Column(DateTime, nullable=True)
    locked_at = Column(DateTime, nullable=True)
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
    token_hash = Column(String(255), nullable=False, index=True)
    token_type = Column(String(20), default="refresh") # access, refresh
    device_info = Column(String(255), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("UserDB", back_populates="tokens")


# ====================================================================
# PYDANTIC SCHEMAS (API REQUEST / RESPONSE)
# ====================================================================
class UniversityResponse(BaseModel):
    id: str
    code: str
    name: str
    city: Optional[str] = None
    website: Optional[str] = None

    class Config:
        from_attributes = True


class FacultyResponse(BaseModel):
    id: str
    university_id: Optional[str] = None
    code: str
    name: str
    dean_name: Optional[str] = None

    class Config:
        from_attributes = True


class LecturerBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = ""
    academic_title: Optional[str] = ""
    university: Optional[str] = ""
    department: Optional[str] = ""
    role: Optional[str] = "lecturer"


class LecturerCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = ""
    academic_title: Optional[str] = ""
    university: Optional[str] = ""
    department: Optional[str] = ""
    role: Optional[str] = "lecturer"


class UpdateProfileRequest(BaseModel):
    full_name: str
    academic_title: Optional[str] = "TS."
    university: str
    department: str
    role: Optional[str] = "lecturer"


class LecturerResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str = ""
    academic_title: Optional[str] = ""
    university: str = ""
    department: str = ""
    role: str = "lecturer"
    is_active: bool = True
    status: Optional[str] = "active"
    lock_type: Optional[str] = None
    lock_reason: Optional[str] = None
    locked_until: Optional[datetime] = None
    locked_at: Optional[datetime] = None
    profile_completed: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int
    user: LecturerResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str
