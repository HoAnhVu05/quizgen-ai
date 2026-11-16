import httpx
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_flow():
    print("=" * 60)
    print("[*] KIỂM THỬ TÍCH HỢP ADMIN SERVICE & KHÓA/MỞ KHÓA TÀI KHOẢN")
    print("=" * 60)

    # 1. Kiểm tra /admin/overview
    res_overview = httpx.get(f"{BASE_URL}/admin/overview", timeout=5.0)
    assert res_overview.status_code == 200, f"Overview failed: {res_overview.text}"
    overview_data = res_overview.json()
    kpis = overview_data.get("kpis", {})
    print(f"[OK] Overview KPIs: Tổng người dùng = {kpis.get('totalUsers')}, Câu hỏi = {kpis.get('totalQuestionBank')}, Đề thi = {kpis.get('totalApprovedExams')}")

    # 2. Kiểm tra /admin/users
    res_users = httpx.get(f"{BASE_URL}/admin/users", timeout=5.0)
    assert res_users.status_code == 200, f"List users failed: {res_users.text}"
    users = res_users.json()
    assert len(users) > 0, "Users list is empty!"
    print(f"[OK] Đã tải danh sách người dùng thực tế từ auth.db: {len(users)} tài khoản.")

    # Tìm tài khoản lecturer để thử nghiệm khóa
    target_user = None
    for u in users:
        if u["email"] == "lecturer@vnu.edu.vn":
            target_user = u
            break
    assert target_user is not None, "Không tìm thấy tài khoản lecturer@vnu.edu.vn trong auth.db"
    target_id = target_user["id"]
    print(f"[*] Tài khoản mục tiêu: {target_user['fullName']} ({target_user['email']}), ID = {target_id}")

    # 3. Quản trị viên tiến hành KHÓA tài khoản (Tạm khóa có lý do & ngày giờ mở)
    lock_payload = {
        "lock_type": "temporary",
        "lock_reason": "Vi phạm quy định bảo mật đề thi học kỳ 1",
        "locked_until": "2026-11-15 18:00:00"
    }
    res_lock = httpx.post(f"{BASE_URL}/admin/users/{target_id}/lock", json=lock_payload, timeout=5.0)
    assert res_lock.status_code == 200, f"Lock failed: {res_lock.text}"
    print(f"[OK] Đã khóa tài khoản thành công: {res_lock.json().get('message')}")

    # 4. Kiểm tra tài khoản bị khóa khi ĐĂNG NHẬP (/auth/login)
    login_data = {
        "username": target_user["email"],
        "password": "Password123!"
    }
    res_login = httpx.post(f"{BASE_URL}/auth/login", data=login_data, timeout=5.0)
    print(f"[*] Kết quả đăng nhập của tài khoản bị khóa: HTTP {res_login.status_code}")
    assert res_login.status_code == 403, f"Expected 403 Forbidden, got {res_login.status_code}: {res_login.text}"
    err_detail = res_login.json().get("detail", "")
    print(f"[OK] Backend từ chối đăng nhập với thông điệp: \"{err_detail}\"")
    assert "tạm khóa" in err_detail or "khóa" in err_detail, "Error detail does not mention lock"
    assert "Vi phạm quy định bảo mật" in err_detail, "Error detail missing lock reason"

    # 5. Kiểm tra tài khoản bị khóa khi gọi /auth/me
    res_me = httpx.get(
        f"{BASE_URL}/auth/me",
        headers={"X-User-Email": target_user["email"]},
        timeout=5.0
    )
    print(f"[*] Kết quả kiểm tra phiên (/auth/me): HTTP {res_me.status_code}")
    assert res_me.status_code == 403, f"Expected 403, got {res_me.status_code}"
    print(f"[OK] /auth/me đã chặn tài khoản bị khóa thành công!")

    # 6. Quản trị viên MỞ KHÓA tài khoản bất cứ lúc nào (/admin/users/{id}/unlock)
    res_unlock = httpx.post(f"{BASE_URL}/admin/users/{target_id}/unlock", timeout=5.0)
    assert res_unlock.status_code == 200, f"Unlock failed: {res_unlock.text}"
    print(f"[OK] Quản trị viên đã mở khóa tài khoản thành công: {res_unlock.json().get('message')}")

    # 7. Kiểm tra sau khi mở khóa
    res_users_after = httpx.get(f"{BASE_URL}/admin/users", timeout=5.0)
    unlocked_user = next((u for u in res_users_after.json() if u["id"] == target_id), None)
    assert unlocked_user is not None
    assert unlocked_user["status"] == "active", f"Status should be active, got {unlocked_user['status']}"
    print(f"[OK] Trạng thái tài khoản đã chuyển lại thành: {unlocked_user['status']}")

    # 8. Kiểm tra /admin/exams/compliance
    res_comp = httpx.get(f"{BASE_URL}/admin/exams/compliance", timeout=5.0)
    assert res_comp.status_code == 200
    comp_json = res_comp.json()
    print(f"[OK] Dữ liệu khảo thí: {comp_json.get('totalExamsAudited')} đề thi, Bloom: {comp_json.get('bloomDistribution')}")

    print("\n[SUCCESS] TOÀN BỘ CÁC CHỨC NĂNG ADMIN & KHÓA TÀI KHOẢN ĐÃ VƯỢT QUA KIỂM THỬ 100%!")

if __name__ == "__main__":
    test_flow()
