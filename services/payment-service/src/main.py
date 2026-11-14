import os
import sys
import time
import uuid
import random
import sqlite3
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Request, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .email_sender import send_payment_success_email

# Ensure UTF-8 output on Windows
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

app = FastAPI(
    title="QuizGen AI - Payment & Subscription Service",
    description="Microservice Quản lý Gói cước, Sinh mã VietQR, Đối soát thanh toán & Tự động gửi Email Hóa đơn",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── CSDL PATHS & INITIALIZATION ─────────────────────────────────────────────
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
PAYMENT_DB_PATH = os.path.join(DATA_DIR, "payment.db")

AUTH_SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "auth-service", "data"))
AUTH_DB_PATH = os.path.join(AUTH_SERVICE_DIR, "auth.db")

def get_db_connection():
    conn = sqlite3.connect(PAYMENT_DB_PATH, timeout=5.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Bảng danh mục gói cước
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        price_vnd INTEGER NOT NULL DEFAULT 0,
        duration_days INTEGER NOT NULL DEFAULT 0,
        max_documents INTEGER NOT NULL DEFAULT 3,
        max_questions_month INTEGER NOT NULL DEFAULT 50,
        max_exams_month INTEGER NOT NULL DEFAULT 2,
        allow_qti_export BOOLEAN DEFAULT 0,
        allow_full_bloom BOOLEAN DEFAULT 0,
        features_json TEXT,
        is_popular BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Bảng gói đăng ký của người dùng
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        plan_code TEXT NOT NULL,
        status TEXT NOT NULL, -- 'active', 'expired', 'cancelled'
        starts_at TIMESTAMP NOT NULL,
        expires_at TIMESTAMP,
        auto_renew BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Bảng đơn hàng giao dịch
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_code TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        plan_code TEXT NOT NULL,
        plan_name TEXT NOT NULL,
        amount_vnd INTEGER NOT NULL,
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL, -- 'PENDING', 'COMPLETED', 'FAILED', 'EXPIRED'
        qr_url TEXT,
        transfer_content TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        bank_account TEXT NOT NULL,
        bank_account_name TEXT NOT NULL,
        paid_at TIMESTAMP,
        bank_reference TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
    );
    """)

    # 4. Bảng hạn mức sử dụng người dùng
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_quotas (
        user_id TEXT PRIMARY KEY,
        plan_code TEXT NOT NULL DEFAULT 'FREE',
        documents_used INTEGER DEFAULT 0,
        questions_used_month INTEGER DEFAULT 0,
        exams_used_month INTEGER DEFAULT 0,
        quota_reset_date DATE NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Seed Default Plans nếu chưa có
    cursor.execute("SELECT COUNT(*) FROM plans")
    if cursor.fetchone()[0] == 0:
        default_plans = [
            (
                "plan_free", "Gói Trải Nghiệm", "FREE", 0, 0,
                3, 50, 2, 0, 0,
                json.dumps([
                    "Tối đa 3 giáo trình lưu trữ (≤ 10MB/file)",
                    "Sinh 50 câu hỏi AI/tháng (Mức Bloom 1 & 2)",
                    "Xuất 2 đề thi Word/PDF mỗi tháng",
                    "Hỗ trợ đảo tối đa 2 mã đề thi hoán vị"
                ], ensure_ascii=False),
                0, 1
            ),
            (
                "plan_pro_monthly", "Gói PRO Giảng Viên (Tháng)", "PRO_MONTH", 199000, 30,
                999999, 1000, 999999, 1, 1,
                json.dumps([
                    "Không giới hạn số lượng giáo trình tải lên (≤ 50MB/file)",
                    "Sinh 1.000 câu hỏi trắc nghiệm AI mỗi tháng",
                    "Đầy đủ 4 cấp độ tư duy Bloom (Nhận biết → Phân tích)",
                    "Xuất bản chuẩn LMS Canvas / Moodle (QTI 2.1 & XML)",
                    "Đảo tối đa 8 mã đề và in ấn trực tiếp tờ đề A4",
                    "Ưu tiên xử lý và hỗ trợ kỹ thuật 24/7"
                ], ensure_ascii=False),
                1, 1
            ),
            (
                "plan_pro_yearly", "Gói PRO Giảng Viên (1 Năm)", "PRO_YEAR", 1990000, 365,
                999999, 1000, 999999, 1, 1,
                json.dumps([
                    "Toàn bộ quyền lợi của Gói PRO Giảng Viên",
                    "Tiết kiệm 20% chi phí so với trả từng tháng",
                    "Thời hạn sử dụng trọn vẹn 365 ngày",
                    "Tặng kèm bộ mẫu thể thức đề thi chuẩn các trường Đại học"
                ], ensure_ascii=False),
                0, 1
            ),
            (
                "plan_enterprise", "Gói Khoa & Bộ Môn", "ENTERPRISE", 4990000, 365,
                999999, 999999, 999999, 1, 1,
                json.dumps([
                    "Dành cho Trưởng bộ môn & Ban Chủ nhiệm Khoa",
                    "Chia sẻ ngân hàng câu hỏi dùng chung cho toàn Bộ môn",
                    "Không giới hạn giáo trình, câu hỏi và lượt xuất đề thi",
                    "Phân tích ma trận độ phủ đề thi khảo thí cấp trường",
                    "Hợp đồng, hóa đơn đỏ VAT và đào tạo chuyển giao trực tiếp"
                ], ensure_ascii=False),
                0, 1
            )
        ]
        cursor.executemany("""
        INSERT INTO plans (id, name, code, price_vnd, duration_days, max_documents, max_questions_month, max_exams_month, allow_qti_export, allow_full_bloom, features_json, is_popular, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, default_plans)

    conn.commit()
    conn.close()
    print("[PAYMENT-SERVICE] Database initialized successfully.")

init_db()

# ─── PYDANTIC SCHEMAS ────────────────────────────────────────────────────────
class OrderCreateRequest(BaseModel):
    plan_id: str
    user_id: str
    user_email: str
    user_name: str
    payment_method: Optional[str] = "VIETQR"

# ─── BANK CONFIGURATION (VIETQR NAPAS 247) ───────────────────────────────────
BANK_ID = os.getenv("VIETQR_BANK_ID", "MB") # MB Bank (Ngân hàng Quân đội)
BANK_ACCOUNT_NO = os.getenv("VIETQR_ACCOUNT_NO", "0987654321")
BANK_ACCOUNT_NAME = os.getenv("VIETQR_ACCOUNT_NAME", "QUIZGEN AI ACADEMIC")

# ─── API ENDPOINTS ───────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "payment-service",
        "port": 8007,
        "databaseConnected": True,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/plans")
def get_plans():
    """Lấy danh mục toàn bộ các gói cước đang mở bán."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM plans WHERE is_active = 1 ORDER BY price_vnd ASC")
    rows = cursor.fetchall()
    conn.close()
    
    plans = []
    for r in rows:
        p = dict(r)
        p["features"] = json.loads(p["features_json"]) if p.get("features_json") else []
        plans.append(p)
    return {"plans": plans}

@app.get("/subscription/my")
def get_my_subscription(user_id: str = Query(...)):
    """Lấy thông tin gói cước và hạn mức tài nguyên của người dùng."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Tìm subscription active
    cursor.execute("""
    SELECT s.*, p.name as plan_name, p.max_documents, p.max_questions_month, p.max_exams_month, p.allow_qti_export, p.allow_full_bloom
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.user_id = ? AND s.status = 'active'
    ORDER BY s.created_at DESC LIMIT 1
    """, (user_id,))
    sub_row = cursor.fetchone()
    
    # 2. Lấy hoặc tạo user_quota
    cursor.execute("SELECT * FROM user_quotas WHERE user_id = ?", (user_id,))
    quota_row = cursor.fetchone()
    if not quota_row:
        reset_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        cursor.execute("""
        INSERT INTO user_quotas (user_id, plan_code, documents_used, questions_used_month, exams_used_month, quota_reset_date)
        VALUES (?, 'FREE', 0, 0, 0, ?)
        """, (user_id, reset_date))
        conn.commit()
        cursor.execute("SELECT * FROM user_quotas WHERE user_id = ?", (user_id,))
        quota_row = cursor.fetchone()

    # Nếu chưa có gói mua nào, trả về gói FREE mặc định
    if not sub_row:
        cursor.execute("SELECT * FROM plans WHERE code = 'FREE' LIMIT 1")
        free_plan = cursor.fetchone()
        conn.close()
        return {
            "user_id": user_id,
            "plan_code": "FREE",
            "plan_name": free_plan["name"] if free_plan else "Gói Trải Nghiệm Miễn Phí",
            "status": "active",
            "is_free": True,
            "starts_at": None,
            "expires_at": None,
            "quotas": {
                "max_documents": free_plan["max_documents"] if free_plan else 3,
                "documents_used": quota_row["documents_used"],
                "max_questions_month": free_plan["max_questions_month"] if free_plan else 50,
                "questions_used_month": quota_row["questions_used_month"],
                "max_exams_month": free_plan["max_exams_month"] if free_plan else 2,
                "exams_used_month": quota_row["exams_used_month"],
                "allow_qti_export": bool(free_plan["allow_qti_export"]) if free_plan else False,
                "allow_full_bloom": bool(free_plan["allow_full_bloom"]) if free_plan else False
            }
        }
    
    sub_data = dict(sub_row)
    conn.close()
    
    # Kiểm tra hết hạn nếu có expires_at
    is_expired = False
    if sub_data.get("expires_at"):
        exp_time = datetime.fromisoformat(sub_data["expires_at"].replace("Z", ""))
        if datetime.now() > exp_time:
            is_expired = True

    return {
        "user_id": user_id,
        "subscription_id": sub_data["id"],
        "plan_id": sub_data["plan_id"],
        "plan_code": sub_data["plan_code"],
        "plan_name": sub_data["plan_name"],
        "status": "expired" if is_expired else sub_data["status"],
        "is_free": sub_data["plan_code"] == "FREE",
        "starts_at": sub_data["starts_at"],
        "expires_at": sub_data["expires_at"],
        "quotas": {
            "max_documents": sub_data["max_documents"],
            "documents_used": quota_row["documents_used"],
            "max_questions_month": sub_data["max_questions_month"],
            "questions_used_month": quota_row["questions_used_month"],
            "max_exams_month": sub_data["max_exams_month"],
            "exams_used_month": quota_row["exams_used_month"],
            "allow_qti_export": bool(sub_data["allow_qti_export"]),
            "allow_full_bloom": bool(sub_data["allow_full_bloom"])
        }
    }

@app.post("/orders/create")
def create_order(payload: OrderCreateRequest):
    """Khởi tạo đơn hàng nâng cấp và sinh mã VietQR động."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM plans WHERE id = ? AND is_active = 1", (payload.plan_id,))
    plan = cursor.fetchone()
    if not plan:
        conn.close()
        raise HTTPException(status_code=404, detail="Gói cước không tồn tại hoặc đã ngừng cung cấp.")
    
    order_id = f"ord_{uuid.uuid4().hex[:12]}"
    # Mã đơn hàng ngắn gọn dễ nhớ để người dùng chuyển khoản: QZ + 5 số ngẫu nhiên
    order_code = f"QZ{random.randint(10000, 99999)}"
    transfer_content = f"QUIZGEN {order_code}"
    
    amount = plan["price_vnd"]
    expires_at = (datetime.now() + timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S")
    
    # Sinh link mã VietQR chuẩn NAPAS 247
    qr_url = f"https://img.vietqr.io/image/{BANK_ID}-{BANK_ACCOUNT_NO}-compact2.png?amount={amount}&addInfo=QUIZGEN%20{order_code}&accountName={BANK_ACCOUNT_NAME.replace(' ', '%20')}"
    
    cursor.execute("""
    INSERT INTO orders (
        id, order_code, user_id, user_email, user_name, plan_id, plan_code, plan_name,
        amount_vnd, payment_method, status, qr_url, transfer_content,
        bank_name, bank_account, bank_account_name, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?)
    """, (
        order_id, order_code, payload.user_id, payload.user_email, payload.user_name,
        plan["id"], plan["code"], plan["name"], amount, payload.payment_method,
        qr_url, transfer_content, "MB Bank (Ngân hàng Quân đội)", BANK_ACCOUNT_NO, BANK_ACCOUNT_NAME, expires_at
    ))
    conn.commit()
    conn.close()
    
    return {
        "order_id": order_id,
        "order_code": order_code,
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "plan_code": plan["code"],
        "amount_vnd": amount,
        "transfer_content": transfer_content,
        "bank_info": {
            "bank_name": "MB Bank (Ngân hàng Quân đội)",
            "account_no": BANK_ACCOUNT_NO,
            "account_name": BANK_ACCOUNT_NAME
        },
        "qr_url": qr_url,
        "countdown_seconds": 900,
        "expires_at": expires_at
    }

@app.get("/orders/{order_id}/status")
def get_order_status(order_id: str):
    """Polling trạng thái đơn hàng (PENDING, COMPLETED, EXPIRED)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders WHERE id = ? OR order_code = ?", (order_id, order_id))
    order = cursor.fetchone()
    conn.close()
    
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng.")
    
    o = dict(order)
    # Kiểm tra hết hạn nếu đang PENDING
    if o["status"] == "PENDING":
        exp = datetime.fromisoformat(o["expires_at"].replace("Z", ""))
        if datetime.now() > exp:
            conn = get_db_connection()
            conn.execute("UPDATE orders SET status = 'EXPIRED' WHERE id = ?", (o["id"],))
            conn.commit()
            conn.close()
            o["status"] = "EXPIRED"

    return {
        "order_id": o["id"],
        "order_code": o["order_code"],
        "status": o["status"],
        "amount_vnd": o["amount_vnd"],
        "plan_name": o["plan_name"],
        "paid_at": o["paid_at"]
    }

def _activate_subscription(order: dict, bank_ref: str = "QR_AUTO_PAY"):
    """Hàm nội bộ kích hoạt gói cước và gửi email hóa đơn."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    UPDATE orders 
    SET status = 'COMPLETED', paid_at = ?, bank_reference = ?
    WHERE id = ?
    """, (now_str, bank_ref, order["id"]))
    
    # Lấy thông tin plan để tính ngày hết hạn
    cursor.execute("SELECT * FROM plans WHERE id = ?", (order["plan_id"],))
    plan = cursor.fetchone()
    duration = plan["duration_days"] if plan else 30
    expires_at = (datetime.now() + timedelta(days=duration)).strftime("%Y-%m-%d %H:%M:%S")
    
    # Vô hiệu hóa gói cũ nếu có
    cursor.execute("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'", (order["user_id"],))
    
    # Tạo subscription mới
    sub_id = f"sub_{uuid.uuid4().hex[:12]}"
    cursor.execute("""
    INSERT INTO subscriptions (id, user_id, plan_id, plan_code, status, starts_at, expires_at)
    VALUES (?, ?, ?, ?, 'active', ?, ?)
    """, (sub_id, order["user_id"], order["plan_id"], order["plan_code"], now_str, expires_at))
    
    # Cập nhật user_quotas
    cursor.execute("""
    INSERT INTO user_quotas (user_id, plan_code, documents_used, questions_used_month, exams_used_month, quota_reset_date)
    VALUES (?, ?, 0, 0, 0, ?)
    ON CONFLICT(user_id) DO UPDATE SET 
        plan_code = excluded.plan_code,
        updated_at = CURRENT_TIMESTAMP
    """, (order["user_id"], order["plan_code"], (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")))
    
    conn.commit()
    conn.close()

    # Cập nhật đồng bộ sang auth.db (nếu bảng users tồn tại)
    if os.path.exists(AUTH_DB_PATH):
        try:
            auth_conn = sqlite3.connect(AUTH_DB_PATH, timeout=5.0)
            # Kiểm tra xem có cột plan_tier chưa, nếu chưa thì thêm
            cursor_auth = auth_conn.cursor()
            cursor_auth.execute("PRAGMA table_info(users)")
            cols = [c[1] for c in cursor_auth.fetchall()]
            if "plan_tier" not in cols:
                cursor_auth.execute("ALTER TABLE users ADD COLUMN plan_tier TEXT DEFAULT 'FREE'")
            cursor_auth.execute("UPDATE users SET plan_tier = ? WHERE id = ? OR email = ?", 
                                (order["plan_code"], order["user_id"], order["user_email"]))
            auth_conn.commit()
            auth_conn.close()
            print(f"[PAYMENT-SERVICE] Đã cập nhật plan_tier = {order['plan_code']} cho user {order['user_email']} trong auth.db")
        except Exception as e:
            print(f"[PAYMENT-SERVICE - WARNING] Không thể đồng bộ sang auth.db: {str(e)}")

    # Gửi email hóa đơn tự động
    send_payment_success_email(
        to_email=order["user_email"],
        user_name=order["user_name"],
        order_code=order["order_code"],
        plan_name=order["plan_name"],
        amount_vnd=order["amount_vnd"],
        expires_at_str=datetime.now().strftime("%d/%m/%Y") + " đến " + (datetime.now() + timedelta(days=duration)).strftime("%d/%m/%Y"),
        payment_method="VietQR (Chuyển khoản 24/7)"
    )
    print(f"[PAYMENT-SERVICE] Kích hoạt thành công đơn hàng #{order['order_code']} cho {order['user_email']}.")

@app.post("/orders/{order_id}/confirm")
def confirm_order(order_id: str, background_tasks: BackgroundTasks):
    """Xác nhận đơn hàng thanh toán thành công (phục vụ đối soát hoặc nút xác nhận kiểm thử)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders WHERE id = ? OR order_code = ?", (order_id, order_id))
    order = cursor.fetchone()
    conn.close()
    
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng.")
    
    o = dict(order)
    if o["status"] == "COMPLETED":
        return {"message": "Đơn hàng đã được kích hoạt trước đó.", "status": "COMPLETED"}
        
    # Kích hoạt gói và gửi email trong background
    _activate_subscription(o, bank_ref="MANUAL_CONFIRMED")
    
    return {
        "message": f"Kích hoạt thành công gói {o['plan_name']}!",
        "order_code": o["order_code"],
        "status": "COMPLETED",
        "plan_code": o["plan_code"]
    }

@app.post("/webhook")
async def payment_webhook(request: Request):
    """
    Webhook tiếp nhận biến động số dư từ cổng thanh toán (SePay / PayOS / Casso).
    Khớp nội dung chuyển khoản cú pháp QUIZGEN QZxxxxx để duyệt tự động.
    """
    try:
        data = await request.json()
        print(f"[PAYMENT-WEBHOOK] Received callback: {data}")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Nhận diện chuỗi nội dung chuyển khoản
    content = str(data.get("content") or data.get("description") or data.get("transfer_content") or "")
    amount = int(data.get("transferAmount") or data.get("amount") or 0)
    
    import re
    match = re.search(r"QUIZGEN\s*(QZ\d+)", content, re.IGNORECASE)
    if not match:
        return {"status": "ignored", "message": "Nội dung chuyển khoản không chứa mã QuizGen hợp lệ."}
    
    order_code = match.group(1).upper()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders WHERE order_code = ?", (order_code,))
    order = cursor.fetchone()
    conn.close()
    
    if not order:
        return {"status": "not_found", "message": f"Không tìm thấy đơn hàng {order_code}."}
    
    o = dict(order)
    if o["status"] == "COMPLETED":
        return {"status": "already_completed", "message": "Đơn hàng đã được duyệt trước đó."}
        
    _activate_subscription(o, bank_ref=str(data.get("referenceCode") or data.get("id") or "WEBHOOK_MATCH"))
    return {"status": "success", "message": f"Đã duyệt tự động đơn hàng {order_code}."}

@app.get("/orders/history")
def get_order_history(user_id: Optional[str] = None):
    """Lịch sử giao dịch thanh toán."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    else:
        cursor.execute("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100")
    rows = cursor.fetchall()
    conn.close()
    return {"orders": [dict(r) for r in rows]}
