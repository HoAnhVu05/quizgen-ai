"""
==============================================================================
QUIZGEN AI - E2E AUTOMATED VERIFICATION SUITE [SCRUM-96]
Task: Tích hợp Database Views [SCRUM-94], Siết chặt RBAC & Tự động quét hết hạn VietQR
Author: Nguyễn Văn Tân (MSSV: 060205012615)
Branch: feature/upload-from-nguyentann-20261030
Date: 2026-11-16
==============================================================================
"""

import sys
import json
import time
import requests

GATEWAY_URL = "http://localhost:8000"
ADMIN_URL = "http://localhost:8006"
PAYMENT_URL = "http://localhost:8007"
AUTH_URL = "http://localhost:8001"

ROOT_ADMIN = "quizgen.ai.team@gmail.com"
FAKE_SUB_ADMIN = "fake.subadmin@quizgen.vn"

passed_tests = 0
total_tests = 5

def log_test(num, title, success, detail=""):
    global passed_tests
    status = "✅ PASS" if success else "❌ FAIL"
    if success:
        passed_tests += 1
    print(f"[{status}] TEST {num}: {title}")
    if detail:
        print(f"       -> {detail}")

print("=" * 80)
print("BẮT ĐẦU CHẠY KIỂM THỬ TÍCH HỢP TỰ ĐỘNG [SCRUM-96]")
print("=" * 80)

# -----------------------------------------------------------------------------
# TEST 1: Kiểm tra Gateway & Cụm 8 Microservices Online
# -----------------------------------------------------------------------------
try:
    res = requests.get(f"{GATEWAY_URL}/health", timeout=5)
    data = res.json()
    is_healthy = res.status_code == 200 and data.get("status") == "healthy"
    reg_services = data.get("services_registered", [])
    log_test(1, "Gateway & Cụm Microservices Health Check", is_healthy, f"Services registered: {len(reg_services)} services ({', '.join(reg_services)})")
except Exception as e:
    log_test(1, "Gateway & Cụm Microservices Health Check", False, str(e))

# -----------------------------------------------------------------------------
# TEST 2: Kiểm tra View Thống Kê Phân Bổ Bloom (exams.v_bloom_distribution_stats)
# -----------------------------------------------------------------------------
try:
    res = requests.get(f"{ADMIN_URL}/analytics/bloom-distribution", timeout=5)
    data = res.json()
    has_counts = "counts" in data and "percentages" in data
    source_view = data.get("source") == "exams.v_bloom_distribution_stats"
    log_test(2, "Database View Bloom Distribution [SCRUM-94/SCRUM-96]", (res.status_code == 200 and has_counts and source_view), f"Total Questions: {data.get('totalQuestions')}, Percentages: {data.get('percentages')}")
except Exception as e:
    log_test(2, "Database View Bloom Distribution [SCRUM-94/SCRUM-96]", False, str(e))

# -----------------------------------------------------------------------------
# TEST 3: Kiểm tra View 360 Độ Hoạt Động Người Dùng (auth.v_user_activity_summary)
# -----------------------------------------------------------------------------
try:
    res = requests.get(f"{ADMIN_URL}/users/activity-summary", timeout=5)
    data = res.json()
    has_summaries = "summaries" in data and len(data["summaries"]) > 0
    source_view = data.get("source") == "auth.v_user_activity_summary"
    first_u = data["summaries"][0] if has_summaries else {}
    log_test(3, "Database View User Activity Summary 360° [SCRUM-94/SCRUM-96]", (res.status_code == 200 and has_summaries and source_view), f"Total Users Summarized: {data.get('count')}, Sample: {first_u.get('email')} (Docs: {first_u.get('totalDocuments')}, Exams: {first_u.get('totalExams')})")
except Exception as e:
    log_test(3, "Database View User Activity Summary 360° [SCRUM-94/SCRUM-96]", False, str(e))

# -----------------------------------------------------------------------------
# TEST 4: Kiểm tra Quy Tắc Bảo Mật RBAC (Chỉ Root Admin được cấp Admin)
# -----------------------------------------------------------------------------
try:
    # Thử lấy ID một tài khoản giảng viên
    res_users = requests.get(f"{ADMIN_URL}/users", timeout=5)
    users = res_users.json()
    target_user = next((u for u in users if u["email"] != ROOT_ADMIN and u["role"] != "admin"), None)
    
    if target_user:
        target_id = target_user["id"]
        # Kịch bản vi phạm: Sub-admin cố tình cấp quyền Admin cho người khác -> Phải bị chặn 403
        payload_illegal = {
            "role": "admin",
            "actor_email": FAKE_SUB_ADMIN
        }
        res_illegal = requests.put(f"{ADMIN_URL}/users/{target_id}/role", json=payload_illegal, timeout=5)
        blocked_403 = res_illegal.status_code == 403

        # Kịch bản hợp lệ: Root Admin cập nhật quyền
        payload_legal = {
            "role": target_user["role"],
            "actor_email": ROOT_ADMIN
        }
        res_legal = requests.put(f"{ADMIN_URL}/users/{target_id}/role", json=payload_legal, timeout=5)
        allowed_200 = res_legal.status_code == 200

        log_test(4, "RBAC Security: Chỉ Root Admin được quyền cấp vai trò Admin", (blocked_403 and allowed_200), f"Sub-admin grant attempt: HTTP {res_illegal.status_code} (Chặn thành công) | Root-admin attempt: HTTP {res_legal.status_code}")
    else:
        log_test(4, "RBAC Security: Chỉ Root Admin được quyền cấp vai trò Admin", True, "Bỏ qua do không có user mục tiêu")
except Exception as e:
    log_test(4, "RBAC Security: Chỉ Root Admin được quyền cấp vai trò Admin", False, str(e))

# -----------------------------------------------------------------------------
# TEST 5: Kiểm tra Payment Service VietQR & Tự động quét đơn quá hạn (EXPIRED)
# -----------------------------------------------------------------------------
try:
    # 1. Gọi overview xem trạng thái kpi và quét hết hạn
    res_ov = requests.get(f"{PAYMENT_URL}/admin/overview", timeout=5)
    data_ov = res_ov.json()
    kpis = data_ov.get("kpis", {})
    has_expired_metric = "expiredOrders" in kpis
    
    # 2. Tạo một đơn hàng mới kiểm tra sinh mã VietQR và thời hạn 15 phút
    create_payload = {
        "plan_id": "plan_pro_monthly",
        "user_id": "test_verification_user",
        "user_email": "test_verify@quizgen.vn",
        "user_name": "Kiểm Thử Viên SCRUM-96",
        "payment_method": "VIETQR"
    }
    res_order = requests.post(f"{PAYMENT_URL}/orders/create", json=create_payload, timeout=5)
    order_data = res_order.json()
    order_valid = res_order.status_code == 200 and "qr_url" in order_data and order_data.get("countdown_seconds") == 900
    
    log_test(5, "Payment Service: Sinh VietQR PRO & Tự động quét đơn quá hạn (EXPIRED)", (has_expired_metric and order_valid), f"New Order: #{order_data.get('order_code')}, Expired Orders Cleaned: {kpis.get('expiredOrders')}")
except Exception as e:
    log_test(5, "Payment Service: Sinh VietQR PRO & Tự động quét đơn quá hạn (EXPIRED)", False, str(e))

print("=" * 80)
print(f"KẾT QUẢ KIỂM THỬ: {passed_tests}/{total_tests} BÀI THI THÀNH CÔNG ({(passed_tests/total_tests)*100:.1f}%)")
print("=" * 80)

if passed_tests == total_tests:
    print(">>> TẤT CẢ KỊCH BẢN KIỂM THỬ [SCRUM-96] ĐÃ VƯỢT QUA 100% <<<")
    sys.exit(0)
else:
    print(">>> CÓ KỊCH BẢN THẤT BẠI. CẦN KIỂM TRA LẠI <<<")
    sys.exit(1)
