import os
import time
import sqlite3
import threading
from typing import Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy import select

from .database import engine, Base, SessionLocal
from .models import AdminAuditLogDB, AdminConfigDB

Base.metadata.create_all(bind=engine)

# Đường dẫn CSDL thực tế của các vi dịch vụ
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
AUTH_DB_PATH = os.path.join(BASE_DIR, "auth-service", "data", "auth.db")
DOC_DB_PATH = os.path.join(BASE_DIR, "document-service", "data", "documents.db")
EXAM_DB_PATH = os.path.join(BASE_DIR, "exam-service", "data", "exam.db")
PAYMENT_DB_PATH = os.path.join(BASE_DIR, "payment-service", "data", "payment.db")

# [SCRUM-99] In-memory TTL Caching Layer cho các tác vụ phân tích nặng
_ANALYTICS_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_LOCK = threading.Lock()
ANALYTICS_CACHE_TTL = 30  # 30 giây TTL

def get_from_analytics_cache(key: str) -> Optional[Any]:
    with _CACHE_LOCK:
        if key in _ANALYTICS_CACHE:
            entry = _ANALYTICS_CACHE[key]
            if time.time() - entry["timestamp"] < ANALYTICS_CACHE_TTL:
                return entry["data"]
            del _ANALYTICS_CACHE[key]
    return None

def set_to_analytics_cache(key: str, data: Any):
    with _CACHE_LOCK:
        _ANALYTICS_CACHE[key] = {
            "timestamp": time.time(),
            "data": data
        }

def get_auth_connection():
    os.makedirs(os.path.dirname(AUTH_DB_PATH), exist_ok=True)
    conn = sqlite3.connect(AUTH_DB_PATH, timeout=5.0)
    conn.row_factory = sqlite3.Row
    return conn

def get_doc_connection():
    if os.path.exists(DOC_DB_PATH):
        conn = sqlite3.connect(DOC_DB_PATH, timeout=5.0)
        conn.row_factory = sqlite3.Row
        return conn
    return None

def get_exam_connection():
    if os.path.exists(EXAM_DB_PATH):
        conn = sqlite3.connect(EXAM_DB_PATH, timeout=5.0)
        conn.row_factory = sqlite3.Row
        return conn
    return None

def get_payment_connection():
    if os.path.exists(PAYMENT_DB_PATH):
        conn = sqlite3.connect(PAYMENT_DB_PATH, timeout=5.0)
        conn.row_factory = sqlite3.Row
        return conn
    return None

ROOT_ADMIN_EMAIL = "quizgen.ai.team@gmail.com"

# ─── Pydantic Schemas ────────────────────────────────────────────────────────
class LockUserRequest(BaseModel):
    lock_type: str = "temporary"  # 'temporary' | 'permanent'
    lock_reason: str
    locked_until: Optional[str] = None  # ISO format string or datetime string

class UpdateUserRoleRequest(BaseModel):
    role: str  # 'admin' | 'head_of_department' | 'lecturer'
    actor_email: Optional[str] = None

class CreateUserRequest(BaseModel):
    email: str
    full_name: str
    academic_title: Optional[str] = "TS."
    university: Optional[str] = "Trường Đại học Giao thông Vận tải TP.HCM (UTH)"
    department: Optional[str] = "Khoa Công nghệ Thông tin"
    role: Optional[str] = "lecturer"
    password: Optional[str] = "Admin@123456"
    actor_email: Optional[str] = None

class UpdatePinRequest(BaseModel):
    current_pin: str
    new_pin: str

class VerifyPinRequest(BaseModel):
    pin: str

class CreateAuditLogRequest(BaseModel):
    actor_email: Optional[str] = None
    action: str
    detail: str
    severity: Optional[str] = "info"

class UpdateThemeRequest(BaseModel):
    theme_id: str
    actor_email: Optional[str] = None

class GrantPlanRequest(BaseModel):
    plan_tier: str = "pro"  # 'free' | 'standard' | 'pro' | 'enterprise'
    duration_days: int = 30  # 0 means permanent
    custom_quota_exams: Optional[int] = 100
    custom_quota_storage_mb: Optional[int] = 2048
    reason: Optional[str] = "Admin cấp đặc quyền"
    actor_email: Optional[str] = None

# ─── Khởi tạo cấu hình mặc định (Seed Config) ───────────────────────────────
def init_admin_config():
    db = SessionLocal()
    try:
        pin_config = db.execute(select(AdminConfigDB).filter_by(key="admin_2fa_pin")).scalar_one_or_none()
        if not pin_config:
            db.add(AdminConfigDB(key="admin_2fa_pin", value="246810", description="Mã 2FA PIN Quản trị viên"))
            db.commit()

        theme_cfg = db.execute(select(AdminConfigDB).filter_by(key="system_active_theme")).scalar_one_or_none()
        if not theme_cfg:
            db.add(AdminConfigDB(key="system_active_theme", value="default", description="Chủ đề hệ thống toàn trường"))
            db.commit()

        has_logs = db.query(AdminAuditLogDB).count() > 0
        if not has_logs:
            db.add(AdminAuditLogDB(
                actor_email="quizgen.ai.team@gmail.com",
                action="ADMIN_SERVICE_STARTUP",
                detail="Khởi tạo vi dịch vụ Quản trị Hệ thống (Admin Service) với dữ liệu CSDL thực tế 100%.",
                severity="info",
                ip_address="127.0.0.1 (Local Mesh)"
            ))
            db.commit()
    finally:
        db.close()

init_admin_config()

def init_database_views():
    """Tạo hoặc đồng bộ Views phân tích dữ liệu phục vụ Admin Portal [SCRUM-94/SCRUM-96]"""
    try:
        e_conn = get_exam_connection()
        if e_conn:
            with e_conn:
                e_conn.execute("""
                    CREATE VIEW IF NOT EXISTS v_bloom_distribution_stats AS
                    SELECT 
                        document_id,
                        COUNT(id) AS total_questions,
                        COUNT(CASE WHEN bloom_level IN ('Nhận biết', 'REMEMBER') THEN 1 END) AS remember_count,
                        COUNT(CASE WHEN bloom_level IN ('Thông hiểu', 'UNDERSTAND') THEN 1 END) AS understand_count,
                        COUNT(CASE WHEN bloom_level IN ('Vận dụng', 'APPLY') THEN 1 END) AS apply_count,
                        COUNT(CASE WHEN bloom_level IN ('Phân tích', 'ANALYZE') THEN 1 END) AS analyze_count
                    FROM questions
                    GROUP BY document_id;
                """)
    except Exception as e:
        print(f"[ADMIN VIEWS] Warning creating exam views: {e}")

init_database_views()

