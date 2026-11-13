import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer
from .database import Base

class AdminAuditLogDB(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(String(64), primary_key=True, default=lambda: f"audit-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:6]}")
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    actor_email = Column(String(255), nullable=False, default="admin@uth.edu.vn")
    action = Column(String(100), nullable=False)
    detail = Column(Text, nullable=False)
    severity = Column(String(20), default="info", nullable=False)  # 'info', 'warning', 'critical'
    ip_address = Column(String(50), default="127.0.0.1 (Admin Console)")

class AdminConfigDB(Base):
    __tablename__ = "admin_configs"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AdminManagedUserDB(Base):
    __tablename__ = "admin_managed_users"

    id = Column(String(64), primary_key=True, default=lambda: f"usr-{uuid.uuid4().hex[:8]}")
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    academic_title = Column(String(50), default="TS.")
    university = Column(String(255), default="Trường Đại học Giao thông Vận tải TP.HCM (UTH)")
    department = Column(String(255), default="Khoa Công nghệ Thông tin")
    role = Column(String(50), default="lecturer")  # 'admin', 'head_of_department', 'lecturer'
    status = Column(String(20), default="active")   # 'active', 'locked'
    password_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
