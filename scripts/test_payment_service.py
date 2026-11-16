"""
Kiểm thử tự động cho Payment & Subscription Service [SCRUM-86]
Kiểm tra qua API Gateway (Port 8000 /api/v1/payment) và trực tiếp Port 8007:
1. Sức khỏe dịch vụ (/health)
2. Danh mục gói cước (/plans)
3. Hạn mức mặc định Free (/subscription/my)
4. Khởi tạo đơn hàng & Sinh mã VietQR (/orders/create)
5. Kiểm tra trạng thái đơn (/orders/{id}/status)
6. Xác nhận thanh toán & Nâng cấp gói cước (/orders/{id}/confirm)
7. Kiểm tra gói sau khi nâng cấp và email hóa đơn
"""
import sys
import os
import time
import httpx

GATEWAY_URL = "http://127.0.0.1:8000/api/v1/payment"
DIRECT_URL = "http://127.0.0.1:8007"

def test_payment_suite():
    print("=" * 70)
    print(" BẮT ĐẦU KIỂM THỬ TÍCH HỢP PAYMENT SERVICE [SCRUM-86]")
    print("=" * 70)
    
    # 1. Kiểm tra Direct Health
    print("[1] Kiểm tra sức khỏe Payment Service (Port 8007)...")
    res = httpx.get(f"{DIRECT_URL}/health", timeout=5.0)
    assert res.status_code == 200, f"Direct health failed: {res.text}"
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "payment-service"
    print(f"    ✓ [PASS] Port 8007 Healthy. CSDL connected = {data.get('databaseConnected')}")

    # 2. Kiểm tra qua API Gateway
    print("[2] Kiểm tra danh mục gói cước qua API Gateway (/api/v1/payment/plans)...")
    res = httpx.get(f"{GATEWAY_URL}/plans", timeout=5.0)
    assert res.status_code == 200, f"Get plans failed: {res.text}"
    plans = res.json().get("plans", [])
    assert len(plans) >= 4, f"Thiếu gói cước: {plans}"
    codes = [p["code"] for p in plans]
    print(f"    ✓ [PASS] Tải thành công {len(plans)} gói cước: {', '.join(codes)}")

    # 3. Kiểm tra hạn mức Free mặc định cho tài khoản
    test_user_id = "test-lec-scrum86"
    test_email = "lecturer.test@vnu.edu.vn"
    test_name = "ThS. Trần Minh Đức"
    print(f"[3] Kiểm tra hạn mức mặc định cho {test_email}...")
    res = httpx.get(f"{GATEWAY_URL}/subscription/my?user_id={test_user_id}", timeout=5.0)
    assert res.status_code == 200, f"Get sub failed: {res.text}"
    sub = res.json()
    assert sub["plan_code"] == "FREE"
    assert sub["is_free"] is True
    assert sub["quotas"]["max_documents"] == 3
    assert sub["quotas"]["max_questions_month"] == 50
    assert sub["quotas"]["max_exams_month"] == 2
    print(f"    ✓ [PASS] Tài khoản được cấp Gói Free mặc định (3 giáo trình, 50 câu/tháng, 2 đề/tháng).")

    # 4. Khởi tạo đơn hàng nâng cấp gói PRO Giảng Viên
    print("[4] Khởi tạo đơn hàng nâng cấp Gói PRO qua VietQR...")
    create_payload = {
        "plan_id": "plan_pro_monthly",
        "user_id": test_user_id,
        "user_email": test_email,
        "user_name": test_name,
        "payment_method": "VIETQR"
    }
    res = httpx.post(f"{GATEWAY_URL}/orders/create", json=create_payload, timeout=5.0)
    assert res.status_code == 200, f"Create order failed: {res.text}"
    order = res.json()
    order_id = order["order_id"]
    order_code = order["order_code"]
    amount = order["amount_vnd"]
    qr_url = order["qr_url"]
    transfer_content = order["transfer_content"]
    assert order_code.startswith("QZ")
    assert amount == 199000
    assert "vietqr.io" in qr_url
    print(f"    ✓ [PASS] Khởi tạo đơn hàng #{order_code} ({amount:,} VNĐ).")
    print(f"           - Nội dung chuyển khoản: {transfer_content}")
    print(f"           - Link VietQR: {qr_url[:60]}...")

    # 5. Kiểm tra trạng thái đơn đang PENDING
    print(f"[5] Kiểm tra trạng thái đơn hàng #{order_code}...")
    res = httpx.get(f"{GATEWAY_URL}/orders/{order_id}/status", timeout=5.0)
    assert res.status_code == 200
    status_data = res.json()
    assert status_data["status"] == "PENDING"
    print(f"    ✓ [PASS] Đơn hàng đang ở trạng thái PENDING sẵn sàng nhận thanh toán.")

    # 6. Xác nhận thanh toán & Kích hoạt gói cước
    print(f"[6] Giả lập hoàn tất thanh toán & kích hoạt gói...")
    res = httpx.post(f"{GATEWAY_URL}/orders/{order_id}/confirm", timeout=5.0)
    assert res.status_code == 200
    confirm_data = res.json()
    assert confirm_data["status"] == "COMPLETED"
    assert confirm_data["plan_code"] == "PRO_MONTH"
    print(f"    ✓ [PASS] {confirm_data['message']}")

    # 7. Thẩm tra gói cước mới và hạn mức sau khi nâng cấp
    print("[7] Thẩm tra lại hạn mức tài khoản sau nâng cấp...")
    res = httpx.get(f"{GATEWAY_URL}/subscription/my?user_id={test_user_id}", timeout=5.0)
    assert res.status_code == 200
    new_sub = res.json()
    assert new_sub["plan_code"] == "PRO_MONTH"
    assert new_sub["is_free"] is False
    assert new_sub["status"] == "active"
    assert new_sub["quotas"]["max_questions_month"] == 1000
    assert new_sub["quotas"]["allow_qti_export"] is True
    assert new_sub["quotas"]["allow_full_bloom"] is True
    print(f"    ✓ [PASS] Tài khoản đã chuyển sang: {new_sub['plan_name']}")
    print(f"           - Hạn mức câu hỏi mới: {new_sub['quotas']['max_questions_month']} câu/tháng")
    print(f"           - Mở khóa xuất QTI: {new_sub['quotas']['allow_qti_export']}")
    print(f"           - Hạn dùng: {new_sub['expires_at']}")

    print("=" * 70)
    print(" 🎯 7/7 KỊCH BẢN KIỂM THỬ PAYMENT SERVICE ĐẠT 100% PASS!")
    print("=" * 70)

if __name__ == "__main__":
    test_payment_suite()
