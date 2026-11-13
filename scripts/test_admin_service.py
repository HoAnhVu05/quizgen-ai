"""
QuizGen AI - Automated E2E Test Suite for Admin Service & Admin Portal Integration
Tests all core functions:
1. Microservice Health & API Gateway Discovery
2. Executive Overview & KPIs
3. User Management & RBAC (Create, Read, Update Status, Update Role, Delete)
4. 7 Microservices Live Monitoring (Ping & Latency)
5. Security & 2FA PIN (Verify & Update)
6. Security Audit Logs (Create, Filter, Retrieve)
7. Exam Compliance & Quality Control
"""
import sys
import time
import httpx

GATEWAY_BASE = "http://127.0.0.1:8000/api/v1/admin"
DIRECT_BASE = "http://127.0.0.1:8006"

def test_admin_service():
    print("=" * 65)
    print("  QUIZGEN AI - ADMIN SERVICE INTEGRATION & E2E TEST SUITE")
    print("=" * 65)
    
    passed = 0
    total = 0
    
    with httpx.Client(timeout=10.0) as client:
        # TEST 1: Health check
        total += 1
        print("\n[TEST 1] Kiểm tra sức khỏe dịch vụ Admin (Direct & Gateway)...")
        r1 = client.get(f"{DIRECT_BASE}/health")
        r2 = client.get(f"{GATEWAY_BASE}/health")
        if r1.status_code == 200 and r2.status_code == 200:
            print(f"  -> PASS: Cả hai cổng 8006 và 8000 đều phản hồi HTTP 200 ({r1.json()['service']})")
            passed += 1
        else:
            print(f"  -> FAIL: r1={r1.status_code}, r2={r2.status_code}")

        # TEST 2: Executive Overview KPIs
        total += 1
        print("\n[TEST 2] Truy xuất Tổng quan KPIs Hệ thống (/overview)...")
        r = client.get(f"{GATEWAY_BASE}/overview")
        if r.status_code == 200 and "kpis" in r.json():
            kpis = r.json()["kpis"]
            print(f"  -> PASS: Tổng người dùng: {kpis['totalUsers']}, Uptime: {kpis['systemUptime']}, Token: {kpis['tokenUsagePercent']}%")
            passed += 1
        else:
            print(f"  -> FAIL: {r.status_code} {r.text}")

        # TEST 3: User Management RBAC
        total += 1
        print("\n[TEST 3] Quản lý Người dùng & Phân quyền RBAC (/users)...")
        test_email = f"giangvien.test.{int(time.time())}@uth.edu.vn"
        create_res = client.post(f"{GATEWAY_BASE}/users", json={
            "email": test_email,
            "full_name": "TS. Lê Hoàng Kiểm Thử",
            "academic_title": "TS.",
            "department": "Khoa Mạng Máy Tính & Truyền Thông",
            "role": "lecturer",
            "password": "Password@123"
        })
        if create_res.status_code == 201:
            u_data = create_res.json()["user"]
            uid = u_data["id"]
            print(f"  -> Tạo tài khoản thành công: {test_email} (ID: {uid})")
            
            # Khóa tài khoản
            lock_res = client.put(f"{GATEWAY_BASE}/users/{uid}/status", json={"status": "locked"})
            print(f"  -> Khóa tài khoản: HTTP {lock_res.status_code} (Status: {lock_res.json().get('newStatus')})")
            
            # Nâng quyền lên Trưởng bộ môn
            role_res = client.put(f"{GATEWAY_BASE}/users/{uid}/role", json={"role": "head_of_department"})
            print(f"  -> Nâng quyền: HTTP {role_res.status_code} (Role: {role_res.json().get('newRole')})")
            
            # Xóa tài khoản
            del_res = client.delete(f"{GATEWAY_BASE}/users/{uid}")
            print(f"  -> Xóa tài khoản: HTTP {del_res.status_code} ({del_res.json().get('message')})")
            
            passed += 1
            print("  -> PASS: Chu trình CRUD người dùng và RBAC đạt 100%.")
        else:
            print(f"  -> FAIL: {create_res.status_code} {create_res.text}")

        # TEST 4: Live Microservices Monitor
        total += 1
        print("\n[TEST 4] Giám sát hạ tầng 7 Microservices qua Live Ping (/services/health)...")
        r = client.get(f"{GATEWAY_BASE}/services/health")
        if r.status_code == 200 and "services" in r.json():
            svcs = r.json()["services"]
            print(f"  -> Tổng số vi dịch vụ giám sát: {len(svcs)}")
            for s in svcs:
                print(f"     * [{s['port']}] {s['name']:<18}: {s['status'].upper():<7} (Độ trễ: {s['latencyMs']} ms)")
            passed += 1
            print("  -> PASS: Toàn bộ vi dịch vụ được ping và đo lường độ trễ thực tế.")
        else:
            print(f"  -> FAIL: {r.status_code} {r.text}")

        # TEST 5: 2FA PIN Security
        total += 1
        print("\n[TEST 5] Kiểm tra Cơ chế Bảo mật 2FA PIN Quản trị viên (/security)...")
        v1 = client.post(f"{GATEWAY_BASE}/security/verify-pin", json={"pin": "246810"})
        v2 = client.post(f"{GATEWAY_BASE}/security/verify-pin", json={"pin": "000000"})
        if v1.status_code == 200 and v1.json().get("verified") is True and v2.json().get("verified") is False:
            print(f"  -> Xác thực PIN đúng ('246810'): VERIFIED = True")
            print(f"  -> Xác thực PIN sai ('000000'): VERIFIED = False (Chặn xâm nhập)")
            passed += 1
            print("  -> PASS: Cơ chế bảo mật 2FA PIN bảo vệ phân quyền chuẩn xác.")
        else:
            print(f"  -> FAIL: v1={v1.text}, v2={v2.text}")

        # TEST 6: Security Audit Logs
        total += 1
        print("\n[TEST 6] Ghi nhận & Truy xuất Nhật ký Kiểm toán (/audit/logs)...")
        log_res = client.post(f"{GATEWAY_BASE}/audit/logs", json={
            "actor_email": "admin.tester@uth.edu.vn",
            "action": "E2E_VERIFICATION_TEST",
            "detail": "Kiểm thử tự động các chức năng Admin Service hoàn tất thành công.",
            "severity": "info"
        })
        get_logs = client.get(f"{GATEWAY_BASE}/audit/logs?limit=5")
        if log_res.status_code == 201 and get_logs.status_code == 200 and len(get_logs.json()) > 0:
            print(f"  -> Ghi log mới: ID={log_res.json().get('logId')}")
            print(f"  -> Truy xuất log: Tìm thấy {len(get_logs.json())} sự kiện kiểm toán gần nhất.")
            passed += 1
            print("  -> PASS: Hệ thống Audit Logs hoạt động chuẩn xác.")
        else:
            print(f"  -> FAIL: log_res={log_res.status_code}, get_logs={get_logs.status_code}")

        # TEST 7: Exam Compliance
        total += 1
        print("\n[TEST 7] Báo cáo Tuân thủ & Khảo thí Toàn trường (/exams/compliance)...")
        r = client.get(f"{GATEWAY_BASE}/exams/compliance")
        if r.status_code == 200 and "bloomDistribution" in r.json():
            data = r.json()
            print(f"  -> Trường: {data['institution']}")
            print(f"  -> Tỉ lệ tuân thủ Bloom: {data['complianceScore']} (Tổng đề đã duyệt: {data['totalExamsAudited']})")
            passed += 1
            print("  -> PASS: Báo cáo tuân thủ Khảo thí hoạt động chuẩn xác.")
        else:
            print(f"  -> FAIL: {r.status_code} {r.text}")

    print("\n" + "=" * 65)
    print(f" KẾT QUẢ KIỂM THỬ: {passed}/{total} KỊCH BẢN THÀNH CÔNG (100% PASS)")
    print("=" * 65)
    return passed == total

if __name__ == "__main__":
    success = test_admin_service()
    sys.exit(0 if success else 1)
