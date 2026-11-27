import os
import time
import uuid
import sqlite3
import httpx
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, or_

from ..database import get_db, SessionLocal
from ..models import AdminAuditLogDB, AdminConfigDB
from ..auth import get_current_admin
from ..shared import (
    BASE_DIR,
    AUTH_DB_PATH,
    DOC_DB_PATH,
    EXAM_DB_PATH,
    PAYMENT_DB_PATH,
    ROOT_ADMIN_EMAIL,
    get_from_analytics_cache,
    set_to_analytics_cache,
    get_auth_connection,
    get_doc_connection,
    get_exam_connection,
    get_payment_connection,
    LockUserRequest,
    UpdateUserRoleRequest,
    CreateUserRequest,
    UpdatePinRequest,
    VerifyPinRequest,
    CreateAuditLogRequest,
    UpdateThemeRequest,
    GrantPlanRequest,
)

router = APIRouter()

@router.get("/users")
def list_real_users(
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """Lấy danh sách người dùng thực tế 100% từ auth.db kèm trạng thái khóa chi tiết"""
    with get_auth_connection() as conn:
        # Tự động mở khóa tài khoản tạm khóa đã hết hạn
        now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        conn.execute(
            "UPDATE users SET status='active', is_active=1, lock_type=NULL, lock_reason=NULL, locked_until=NULL WHERE lock_type='temporary' AND locked_until IS NOT NULL AND locked_until <= ?",
            (now_iso,)
        )
        conn.commit()

        for col in [
            "plan_tier VARCHAR(30) DEFAULT 'free'",
            "plan_expires_at TIMESTAMP",
            "custom_quota_exams INTEGER",
            "custom_quota_storage_mb INTEGER"
        ]:
            try:
                conn.execute(f"ALTER TABLE users ADD COLUMN {col}")
            except Exception:
                pass

        sql = "SELECT id, email, full_name, academic_title, university, department, role, is_active, status, lock_type, lock_reason, locked_until, locked_at, created_at, plan_tier, plan_expires_at, custom_quota_exams, custom_quota_storage_mb FROM users WHERE 1=1"
        params = []

        if role and role != "all":
            sql += " AND role = ?"
            params.append(role)
        if status and status != "all":
            if status == "locked":
                sql += " AND (status = 'locked' OR is_active = 0)"
            else:
                sql += " AND (status = 'active' OR status IS NULL) AND is_active = 1"
        if search:
            s = f"%{search.strip()}%"
            sql += " AND (full_name LIKE ? OR email LIKE ? OR department LIKE ?)"
            params.extend([s, s, s])

        sql += " ORDER BY created_at DESC"
        rows = conn.execute(sql, params).fetchall()

        role_labels = {
            "admin": "Quản trị Hệ thống",
            "head_of_department": "Trưởng bộ môn",
            "lecturer": "Giảng viên"
        }

        result = []
        for r in rows:
            u_status = r["status"] or ("active" if r["is_active"] else "locked")
            u_role = r["role"] or "lecturer"
            result.append({
                "id": r["id"],
                "email": r["email"],
                "fullName": r["full_name"],
                "academicTitle": r["academic_title"] or "TS.",
                "university": r["university"] or "Trường Đại học Giao thông Vận tải TP.HCM (UTH)",
                "department": r["department"] or "Khoa Công nghệ Thông tin",
                "role": u_role,
                "roleLabel": role_labels.get(u_role, "Giảng viên"),
                "status": u_status,
                "isActive": bool(r["is_active"]),
                "lockType": r["lock_type"],
                "lockReason": r["lock_reason"],
                "lockedUntil": r["locked_until"],
                "lockedAt": r["locked_at"],
                "createdAt": r["created_at"] or "Chưa rõ",
                "planTier": r["plan_tier"] or "free",
                "planExpiresAt": r["plan_expires_at"],
                "customQuotaExams": r["custom_quota_exams"],
                "customQuotaStorageMb": r["custom_quota_storage_mb"]
            })
        return result

@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_real_user(req: CreateUserRequest, db: Session = Depends(get_db)):
    """Tạo tài khoản người dùng thực tế trực tiếp vào auth.db"""
    clean_email = req.email.strip().lower()
    clean_actor = (req.actor_email or "").strip().lower()

    if req.role == "admin" and clean_actor != ROOT_ADMIN_EMAIL:
        raise HTTPException(
            status_code=403,
            detail="Chỉ tài khoản Quản trị viên chính gốc (quizgen.ai.team@gmail.com) mới có quyền khởi tạo tài khoản vai trò Admin."
        )

    with get_auth_connection() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (clean_email,)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Tài khoản email này đã tồn tại.")

        # Mã hóa mật khẩu tạm thời
        import bcrypt
        pwd_bytes = (req.password or "Admin@123456").encode('utf-8')[:72]
        pwd_hash = bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode('utf-8')

        uid = f"usr-{req.role[:3]}-{int(time.time())}"
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        conn.execute(
            """INSERT INTO users 
               (id, email, password_hash, full_name, academic_title, university, department, role, is_active, status, created_at, updated_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                uid, clean_email, pwd_hash, req.full_name.strip(), req.academic_title or "TS.",
                req.university or "Trường Đại học Giao thông Vận tải TP.HCM (UTH)",
                req.department or "Khoa Công nghệ Thông tin", req.role or "lecturer",
                1, "active", now_str, now_str
            )
        )
        conn.commit()

    # Ghi nhận Audit Log
    db.add(AdminAuditLogDB(
        actor_email="quizgen.ai.team@gmail.com",
        action="ADMIN_CREATE_USER",
        detail=f"Quản trị viên tạo người dùng thực tế mới: {clean_email} ({req.full_name}) vai trò {req.role}.",
        severity="info"
    ))
    db.commit()

    return {
        "status": "success",
        "message": f"Đã khởi tạo tài khoản {clean_email} thành công.",
        "user": {
            "id": uid,
            "email": clean_email,
            "fullName": req.full_name,
            "role": req.role,
            "status": "active"
        }
    }

@router.post("/users/{user_id}/lock")
def lock_user_endpoint(user_id: str, req: LockUserRequest, db: Session = Depends(get_db)):
    """
    Quản trị viên khóa tài khoản:
    - Loại khóa: 'temporary' (tạm khóa có ngày giờ) hoặc 'permanent' (khóa vĩnh viễn)
    - Nhập lý do bắt buộc
    - Lập tức thu hồi phiên đăng nhập để tài khoản bị khóa bị đăng xuất ngay lập tức
    """
    if not req.lock_reason or not req.lock_reason.strip():
        raise HTTPException(status_code=400, detail="Vui lòng nhập lý do khóa tài khoản.")

    with get_auth_connection() as conn:
        user = conn.execute("SELECT id, email, role FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

        if user["email"] == "quizgen.ai.team@gmail.com":
            raise HTTPException(status_code=400, detail="Không thể khóa Super Admin hệ thống.")

        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        locked_until_str = None
        if req.lock_type == "temporary" and req.locked_until:
            locked_until_str = req.locked_until.strip()

        # 1. Cập nhật trạng thái khóa
        conn.execute(
            """UPDATE users SET 
               status = 'locked', 
               is_active = 0, 
               lock_type = ?, 
               lock_reason = ?, 
               locked_until = ?, 
               locked_at = ?,
               updated_at = ?
               WHERE id = ?""",
            (req.lock_type, req.lock_reason.strip(), locked_until_str, now_str, now_str, user_id)
        )

        # 2. Thu hồi toàn bộ token của tài khoản để kích hoạt đăng xuất lập tức
        conn.execute("UPDATE user_tokens SET revoked = 1 WHERE user_id = ?", (user_id,))
        conn.commit()

        user_email = user["email"]

    lock_label = "Tạm khóa" if req.lock_type == "temporary" else "Khóa vĩnh viễn"
    time_label = f" đến {locked_until_str}" if locked_until_str else ""
    log_detail = f"Quản trị viên đã {lock_label} tài khoản {user_email}{time_label}. Lý do: {req.lock_reason.strip()}."

    db.add(AdminAuditLogDB(
        actor_email="quizgen.ai.team@gmail.com",
        action="ADMIN_LOCK_USER",
        detail=log_detail,
        severity="critical"
    ))
    db.commit()

    return {
        "status": "success",
        "message": f"Đã {lock_label.lower()} tài khoản {user_email} thành công.",
        "userId": user_id,
        "lockType": req.lock_type,
        "lockReason": req.lock_reason,
        "lockedUntil": locked_until_str
    }

@router.post("/users/{user_id}/unlock")
def unlock_user_endpoint(user_id: str, db: Session = Depends(get_db)):
    """Quản trị viên mở khóa tài khoản bất cứ lúc nào"""
    with get_auth_connection() as conn:
        user = conn.execute("SELECT id, email FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        conn.execute(
            """UPDATE users SET 
               status = 'active', 
               is_active = 1, 
               lock_type = NULL, 
               lock_reason = NULL, 
               locked_until = NULL, 
               locked_at = NULL,
               updated_at = ?
               WHERE id = ?""",
            (now_str, user_id)
        )
        conn.commit()
        user_email = user["email"]

    db.add(AdminAuditLogDB(
        actor_email="quizgen.ai.team@gmail.com",
        action="ADMIN_UNLOCK_USER",
        detail=f"Quản trị viên đã mở khóa khôi phục quyền truy cập cho tài khoản {user_email}.",
        severity="info"
    ))
    db.commit()

    return {
        "status": "success",
        "message": f"Đã mở khóa tài khoản {user_email} thành công.",
        "userId": user_id
    }

@router.put("/users/{user_id}/role")
def update_user_role_endpoint(user_id: str, req: UpdateUserRoleRequest, db: Session = Depends(get_db)):
    """Nâng / Hạ quyền vai trò (Admin, Trưởng bộ môn, Giảng viên) trực tiếp trong auth.db"""
    clean_actor = (req.actor_email or "").strip().lower()

    with get_auth_connection() as conn:
        user = conn.execute("SELECT id, email, role FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

        user_email = user["email"].strip().lower()

        # Không thể hạ quyền Quản trị viên tối cao (quizgen.ai.team@gmail.com)
        if user_email == ROOT_ADMIN_EMAIL and req.role != "admin":
            raise HTTPException(status_code=400, detail="Không thể hạ quyền Quản trị viên tối cao.")

        # Quy tắc bảo mật: Chỉ Quản trị viên chính gốc mới được cấp vai trò Admin
        if req.role == "admin" and clean_actor != ROOT_ADMIN_EMAIL:
            raise HTTPException(
                status_code=403,
                detail="Chỉ tài khoản Quản trị viên chính gốc (quizgen.ai.team@gmail.com) mới có quyền cấp vai trò Quản trị viên (Admin)."
            )

        # Quy tắc bảo mật: Tài khoản được cấp quyền Admin không được phép thay đổi vai trò của Admin khác
        if user["role"] == "admin" and clean_actor != ROOT_ADMIN_EMAIL and user_email != clean_actor:
            raise HTTPException(
                status_code=403,
                detail="Chỉ Quản trị viên chính gốc mới có quyền thay đổi vai trò của Quản trị viên khác."
            )

        old_role = user["role"]
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        conn.execute("UPDATE users SET role = ?, updated_at = ? WHERE id = ?", (req.role, now_str, user_id))
        conn.commit()

    db.add(AdminAuditLogDB(
        actor_email=clean_actor or ROOT_ADMIN_EMAIL,
        action="ADMIN_UPDATE_USER_ROLE",
        detail=f"Thay đổi phân quyền tài khoản {user_email} từ '{old_role}' sang '{req.role}' (Bởi: {clean_actor or ROOT_ADMIN_EMAIL}).",
        severity="warning" if req.role == "admin" else "info"
    ))
    db.commit()

    return {
        "status": "success",
        "message": f"Đã cập nhật vai trò cho {user_email} thành {req.role}.",
        "userId": user_id,
        "newRole": req.role
    }

@router.post("/users/{user_id}/grant-plan")
def grant_user_plan_endpoint(user_id: str, req: GrantPlanRequest, db: Session = Depends(get_db)):
    """Cấp gói dịch vụ và tùy biến Quota đặc quyền cho người dùng, đồng bộ trực tiếp sang auth.db và payment.db"""
    clean_actor = (req.actor_email or "").strip().lower() or ROOT_ADMIN_EMAIL

    # Chuẩn hóa mã gói cước về 4 mã chuẩn của hệ thống: FREE, PRO_MONTH, PRO_YEAR, ENTERPRISE
    raw_tier = (req.plan_tier or "FREE").strip().upper()
    if raw_tier in ["PRO", "STANDARD", "PRO_MONTH"]:
        norm_tier = "PRO_MONTH"
    elif raw_tier in ["PRO_YEAR", "YEAR"]:
        norm_tier = "PRO_YEAR"
    elif raw_tier in ["ENTERPRISE"]:
        norm_tier = "ENTERPRISE"
    else:
        norm_tier = "FREE"

    now_dt = datetime.utcnow()
    now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")

    expires_at_str = None
    if norm_tier != "FREE" and req.duration_days > 0:
        exp_date = now_dt + timedelta(days=req.duration_days)
        expires_at_str = exp_date.strftime("%Y-%m-%d %H:%M:%S")

    # Nếu hạ về FREE, reset quota về mặc định gói trải nghiệm nếu chưa truyền custom
    custom_quota_exams = req.custom_quota_exams if norm_tier != "FREE" else (req.custom_quota_exams if req.custom_quota_exams is not None else 2)
    custom_quota_storage_mb = req.custom_quota_storage_mb if norm_tier != "FREE" else (req.custom_quota_storage_mb if req.custom_quota_storage_mb is not None else 100)

    with get_auth_connection() as conn:
        user = conn.execute("SELECT id, email, role, plan_tier FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

        user_email = user["email"].strip().lower()

        # Đảm bảo schema auth.db có đủ các cột
        for col in [
            "plan_tier VARCHAR(30) DEFAULT 'FREE'",
            "plan_expires_at TIMESTAMP",
            "custom_quota_exams INTEGER",
            "custom_quota_storage_mb INTEGER"
        ]:
            try:
                conn.execute(f"ALTER TABLE users ADD COLUMN {col}")
            except Exception:
                pass

        conn.execute(
            """UPDATE users 
               SET plan_tier = ?, plan_expires_at = ?, custom_quota_exams = ?, custom_quota_storage_mb = ?, updated_at = ?
               WHERE id = ?""",
            (norm_tier, expires_at_str, custom_quota_exams, custom_quota_storage_mb, now_str, user_id)
        )
        conn.commit()

    # [ĐỒNG BỘ ĐẶC QUYỀN SANG payment.db] - Đảm bảo User thực sự sở hữu Subscription và Quotas
    try:
        p_conn = get_payment_connection()
        if p_conn:
            p_cur = p_conn.cursor()
            # 1. Hủy mọi subscription đang active trước đó của user
            p_cur.execute(
                "UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'",
                (user_id,)
            )

            if norm_tier != "FREE":
                # Lấy thông tin plan tương ứng trong payment.db
                p_cur.execute("SELECT id, name FROM plans WHERE code = ? LIMIT 1", (norm_tier,))
                plan_row = p_cur.fetchone()
                if plan_row:
                    plan_id = plan_row["id"]
                else:
                    plan_id = "plan_pro_monthly" if norm_tier == "PRO_MONTH" else "plan_pro_yearly" if norm_tier == "PRO_YEAR" else "plan_enterprise"

                sub_id = f"sub_admin_{uuid.uuid4().hex[:12]}"
                p_cur.execute(
                    """INSERT INTO subscriptions (id, user_id, plan_id, plan_code, status, starts_at, expires_at, created_at, updated_at)
                       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)""",
                    (sub_id, user_id, plan_id, norm_tier, now_str, expires_at_str, now_str, now_str)
                )

                # Upsert user_quotas
                p_cur.execute("SELECT user_id FROM user_quotas WHERE user_id = ?", (user_id,))
                q_row = p_cur.fetchone()
                reset_date = (now_dt + timedelta(days=30)).strftime("%Y-%m-%d")
                if q_row:
                    p_cur.execute(
                        "UPDATE user_quotas SET plan_code = ?, updated_at = ? WHERE user_id = ?",
                        (norm_tier, now_str, user_id)
                    )
                else:
                    p_cur.execute(
                        """INSERT INTO user_quotas (user_id, plan_code, documents_used, questions_used_month, exams_used_month, quota_reset_date, updated_at)
                           VALUES (?, ?, 0, 0, 0, ?, ?)""",
                        (user_id, norm_tier, reset_date, now_str)
                    )
            else:
                # Trả về FREE trong user_quotas
                p_cur.execute("SELECT user_id FROM user_quotas WHERE user_id = ?", (user_id,))
                if p_cur.fetchone():
                    p_cur.execute("UPDATE user_quotas SET plan_code = 'FREE', updated_at = ? WHERE user_id = ?", (now_str, user_id))

            p_conn.commit()
            p_conn.close()
            print(f"[ADMIN-SERVICE] Đồng bộ đặc quyền thành công gói {norm_tier} sang payment.db cho {user_email}")
    except Exception as e:
        print(f"[ADMIN-SERVICE - WARNING] Lỗi đồng bộ sang payment.db: {e}")

    dur_text = f"{req.duration_days} ngày" if req.duration_days > 0 else "Vĩnh viễn"
    db.add(AdminAuditLogDB(
        actor_email=clean_actor,
        action="ADMIN_GRANT_PLAN",
        detail=f"Cấp gói '{norm_tier}' (Thời hạn: {dur_text}, Đề thi: {req.custom_quota_exams}, RAG: {req.custom_quota_storage_mb}MB) cho {user_email}. Lý do: {req.reason or 'N/A'}",
        severity="info"
    ))
    db.commit()

    return {
        "status": "success",
        "message": f"Đã cấp thành công gói {norm_tier} cho {user_email}.",
        "userId": user_id,
        "planTier": norm_tier,
        "planExpiresAt": expires_at_str,
        "customQuotaExams": req.custom_quota_exams,
        "customQuotaStorageMb": req.custom_quota_storage_mb
    }

@router.delete("/users/{user_id}")
def delete_user_endpoint(user_id: str, db: Session = Depends(get_db)):
    """Xóa vĩnh viễn tài khoản người dùng khỏi auth.db"""
    with get_auth_connection() as conn:
        user = conn.execute("SELECT id, email FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            return {"status": "success", "message": "Người dùng không còn tồn tại."}

        if user["email"] == "quizgen.ai.team@gmail.com":
            raise HTTPException(status_code=400, detail="Không thể xóa tài khoản Quản trị viên Tối cao.")

        user_email = user["email"]
        conn.execute("DELETE FROM user_tokens WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()

    db.add(AdminAuditLogDB(
        actor_email="quizgen.ai.team@gmail.com",
        action="ADMIN_DELETE_USER",
        detail=f"Xóa vĩnh viễn tài khoản {user_email} khỏi hệ thống CSDL.",
        severity="warning"
    ))
    db.commit()

    return {"status": "success", "message": f"Đã xóa tài khoản {user_email}."}

@router.get("/users/{user_id}/details")
def get_user_full_details(user_id: str, db: Session = Depends(get_db)):
    """
    Truy vấn toàn diện 360 độ dữ liệu và lịch sử hoạt động của một người dùng:
    - Hồ sơ cá nhân (Họ tên, email, học vị, khoa, trường, vai trò, trạng thái khóa)
    - Danh sách & số lượng file tài liệu/giáo trình đã tải lên (documents.db)
    - Lịch sử tạo câu hỏi trắc nghiệm & phân bổ Bloom (exam.db)
    - Lịch sử đóng gói & in/xuất đề thi (exam.db)
    - Lịch sử đăng nhập & phiên làm việc (auth.db user_tokens)
    - Nhật ký an ninh & kiểm toán liên quan đến tài khoản này (admin.db)
    """
    # 1. Lấy thông tin user từ auth.db
    with get_auth_connection() as a_conn:
        user_row = a_conn.execute(
            """SELECT id, email, full_name, academic_title, university, department, 
                      role, is_active, status, lock_type, lock_reason, locked_until, 
                      locked_at, created_at, updated_at 
               FROM users WHERE id = ? OR email = ?""",
            (user_id, user_id)
        ).fetchone()

        if not user_row:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

        user_data = dict(user_row)
        actual_user_id = user_data["id"]
        actual_email = user_data["email"]

        # Lấy lịch sử token / đăng nhập
        token_rows = a_conn.execute(
            """SELECT id, device_info, token_type, expires_at, revoked, created_at 
               FROM user_tokens WHERE user_id = ? 
               ORDER BY created_at DESC LIMIT 50""",
            (actual_user_id,)
        ).fetchall()

        login_history = []
        now_dt = datetime.utcnow()
        for tr in token_rows:
            tr_dict = dict(tr)
            is_revoked = bool(tr_dict.get("revoked"))
            exp_str = tr_dict.get("expires_at")
            is_expired = False
            if exp_str:
                try:
                    exp_dt = datetime.fromisoformat(exp_str)
                    if now_dt >= exp_dt:
                        is_expired = True
                except Exception:
                    pass

            session_status = "revoked" if is_revoked else ("expired" if is_expired else "active")
            login_history.append({
                "id": tr_dict["id"],
                "deviceInfo": tr_dict.get("device_info") or "Trình duyệt Web",
                "tokenType": tr_dict.get("token_type") or "refresh",
                "status": session_status,
                "createdAt": tr_dict.get("created_at") or "Vừa xong",
                "expiresAt": tr_dict.get("expires_at"),
                "revoked": is_revoked
            })

    # Các bí danh (aliases) có thể của user_id trong các service khác
    user_aliases = [
        actual_user_id,
        actual_email,
        actual_user_id.replace("usr-", ""),
        f"usr-{actual_user_id}",
        "lec-001" if "lec" in actual_user_id else actual_user_id
    ]
    user_aliases = list(set(user_aliases))
    placeholders = ",".join(["?"] * len(user_aliases))

    # 2. Lấy danh sách tài liệu từ documents.db
    documents_list = []
    total_pages_sum = 0
    try:
        d_conn = get_doc_connection()
        if d_conn:
            with d_conn:
                doc_rows = d_conn.execute(
                    f"""SELECT id, name, file_path, file_size, total_pages, chapters_count, 
                               status, progress, error_message, created_at, updated_at 
                        FROM documents 
                        WHERE user_id IN ({placeholders}) 
                        ORDER BY created_at DESC""",
                    user_aliases
                ).fetchall()

                for dr in doc_rows:
                    dr_dict = dict(dr)
                    pages = dr_dict.get("total_pages") or 0
                    total_pages_sum += pages
                    documents_list.append({
                        "id": dr_dict["id"],
                        "name": dr_dict["name"],
                        "filePath": dr_dict.get("file_path"),
                        "fileSize": dr_dict.get("file_size") or "Không rõ",
                        "totalPages": pages,
                        "chaptersCount": dr_dict.get("chapters_count") or 0,
                        "status": dr_dict.get("status") or "ready",
                        "progress": dr_dict.get("progress") or 100,
                        "errorMessage": dr_dict.get("error_message"),
                        "createdAt": dr_dict.get("created_at") or "Vừa xong",
                        "updatedAt": dr_dict.get("updated_at")
                    })
    except Exception as e:
        print(f"[ADMIN USER DETAILS] Error reading documents.db: {e}")

    # 3. Lấy lịch sử tạo câu hỏi & đề thi từ exam.db
    questions_list = []
    bloom_stats = {"Nhận biết": 0, "Thông hiểu": 0, "Vận dụng": 0, "Phân tích": 0}
    exams_list = []
    try:
        e_conn = get_exam_connection()
        if e_conn:
            with e_conn:
                # A. Câu hỏi
                q_rows = e_conn.execute(
                    f"""SELECT id, document_id, textbook_name, chapter, bloom_level, 
                               question_text, status, created_by, created_at 
                        FROM questions 
                        WHERE created_by IN ({placeholders}) 
                        ORDER BY created_at DESC LIMIT 100""",
                    user_aliases
                ).fetchall()

                for qr in q_rows:
                    qr_dict = dict(qr)
                    b_level = qr_dict.get("bloom_level") or "Thông hiểu"
                    if b_level in bloom_stats:
                        bloom_stats[b_level] += 1
                    questions_list.append({
                        "id": qr_dict["id"],
                        "documentId": qr_dict.get("document_id"),
                        "textbookName": qr_dict.get("textbook_name") or "Giáo trình",
                        "chapter": qr_dict.get("chapter") or "Toàn tài liệu",
                        "bloomLevel": b_level,
                        "questionText": qr_dict.get("question_text") or "",
                        "status": qr_dict.get("status") or "approved",
                        "createdAt": qr_dict.get("created_at") or "Vừa xong"
                    })

                # B. Đề thi đã đóng gói / in
                exam_rows = e_conn.execute(
                    f"""SELECT id, user_id, title, subject, faculty, university, 
                               duration_minutes, exam_codes, selected_question_ids, format, created_at 
                        FROM exams 
                        WHERE user_id IN ({placeholders}) 
                        ORDER BY created_at DESC""",
                    user_aliases
                ).fetchall()

                import json
                for er in exam_rows:
                    er_dict = dict(er)
                    q_ids = []
                    try:
                        q_ids = json.loads(er_dict.get("selected_question_ids") or "[]")
                    except Exception:
                        pass

                    e_codes = []
                    try:
                        e_codes = json.loads(er_dict.get("exam_codes") or "[]")
                    except Exception:
                        pass

                    exams_list.append({
                        "id": er_dict["id"],
                        "title": er_dict["title"],
                        "subject": er_dict.get("subject") or er_dict["title"],
                        "faculty": er_dict.get("faculty") or "Khoa CNTT",
                        "university": er_dict.get("university") or "ĐH Giao thông Vận tải TP.HCM",
                        "durationMinutes": er_dict.get("duration_minutes") or 60,
                        "examCodes": e_codes,
                        "questionCount": len(q_ids) if q_ids else 40,
                        "format": er_dict.get("format") or "pdf",
                        "createdAt": er_dict.get("created_at") or "Vừa xong"
                    })
    except Exception as e:
        print(f"[ADMIN USER DETAILS] Error reading exam.db: {e}")

    # 4. Lấy nhật ký kiểm toán liên quan từ admin.db
    user_audit_logs = db.query(AdminAuditLogDB).filter(
        or_(
            AdminAuditLogDB.actor_email == actual_email,
            AdminAuditLogDB.detail.contains(actual_email)
        )
    ).order_by(desc(AdminAuditLogDB.timestamp)).limit(50).all()

    audit_logs_list = [
        {
            "id": l.id,
            "timestamp": l.timestamp.strftime("%d/%m/%Y, %H:%M:%S") if l.timestamp else "Vừa xong",
            "actorEmail": l.actor_email,
            "action": l.action,
            "detail": l.detail,
            "severity": l.severity,
            "ipAddress": l.ip_address
        }
        for l in user_audit_logs
    ]

    # 5. Lấy thông tin gói cước và lịch sử thanh toán từ payment.db
    current_subscription = None
    orders_list = []
    try:
        p_conn = get_payment_connection()
        if p_conn:
            p_cur = p_conn.cursor()
            p_cur.execute("""
                SELECT s.*, p.name as plan_name, p.price_vnd, p.duration_days
                FROM subscriptions s
                JOIN plans p ON s.plan_id = p.id
                WHERE s.user_id = ? AND s.status = 'active'
                ORDER BY s.created_at DESC LIMIT 1
            """, (actual_user_id,))
            s_row = p_cur.fetchone()
            if s_row:
                current_subscription = dict(s_row)
            
            p_cur.execute("""
                SELECT * FROM orders
                WHERE user_id = ? OR user_email = ?
                ORDER BY created_at DESC LIMIT 50
            """, (actual_user_id, actual_email))
            orders_list = [dict(r) for r in p_cur.fetchall()]
            p_conn.close()
    except Exception as e:
        print(f"[ADMIN USER DETAILS] Error reading payment.db: {e}")

    role_labels = {
        "admin": "Quản trị viên (Super Admin)",
        "head_of_department": "Trưởng bộ môn (HOD)",
        "lecturer": "Giảng viên (Lecturer)"
    }

    return {
        "status": "success",
        "user": {
            "id": actual_user_id,
            "email": actual_email,
            "fullName": user_data["full_name"],
            "academicTitle": user_data.get("academic_title") or "TS.",
            "university": user_data.get("university") or "Trường Đại học Giao thông Vận tải TP.HCM (UTH)",
            "department": user_data.get("department") or "Khoa Công nghệ Thông tin",
            "role": user_data["role"],
            "roleLabel": role_labels.get(user_data["role"], "Giảng viên"),
            "status": user_data.get("status") or ("active" if user_data.get("is_active") else "locked"),
            "isActive": bool(user_data.get("is_active")),
            "lockType": user_data.get("lock_type"),
            "lockReason": user_data.get("lock_reason"),
            "lockedUntil": user_data.get("locked_until"),
            "lockedAt": user_data.get("locked_at"),
            "createdAt": user_data.get("created_at") or "Chưa rõ",
            "updatedAt": user_data.get("updated_at") or "Chưa rõ",
        },
        "stats": {
            "totalDocuments": len(documents_list),
            "totalDocumentPages": total_pages_sum,
            "totalQuestions": len(questions_list),
            "bloomBreakdown": bloom_stats,
            "totalExams": len(exams_list),
            "totalLogins": len(login_history),
            "totalAudits": len(audit_logs_list),
            "lastLoginAt": login_history[0]["createdAt"] if login_history else "Chưa ghi nhận"
        },
        "documents": documents_list,
        "questions": questions_list,
        "exams": exams_list,
        "loginHistory": login_history,
        "auditLogs": audit_logs_list,
        "subscription": current_subscription,
        "payments": orders_list
    }

# ─── Microservices Monitor (Live Pings) ──────────────────────────────────────
SERVICES_CONFIG = [
    {"name": "API Gateway", "port": 8000, "role": "Cổng định tuyến tập trung & Reverse Proxy", "technology": "FastAPI, Uvicorn"},
    {"name": "Auth Service", "port": 8001, "role": "Xác thực đa vai trò, Bcrypt & JWT Access/Refresh", "technology": "FastAPI, SQLite, Bcrypt"},
    {"name": "Document Service", "port": 8002, "role": "Trích xuất giáo trình PDF/DOCX & Lọc nhiễu Noise Filter", "technology": "PyMuPDF, python-docx"},
    {"name": "RAG Service", "port": 8003, "role": "Vector Search, MMR Diversity Re-rank & SLA Window", "technology": "ChromaDB, all-MiniLM-L6-v2"},
    {"name": "AI Service", "port": 8004, "role": "Sinh câu hỏi ma trận Bloom, Prompt Engineering (Zero Mock)", "technology": "Google Gemini 2.5 Flash"},
    {"name": "Exam Service", "port": 8005, "role": "Trộn 4 mã đề, Đóng gói xuất Word DOCX / PDF OMR 50 câu", "technology": "FastAPI, python-docx, ReportLab"},
    {"name": "Admin Service", "port": 8006, "role": "Quản trị RBAC, Giám sát 8 Services & Khóa/Mở khóa tài khoản", "technology": "FastAPI, SQLite, SQLAlchemy"},
    {"name": "Payment Service", "port": 8007, "role": "Quản lý Gói cước, Sinh mã VietQR TPBank & Kích hoạt thuê bao tự động", "technology": "FastAPI, SQLite, SePay API"}
]

