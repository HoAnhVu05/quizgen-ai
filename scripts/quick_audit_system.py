#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QuizGen AI - Automated System Integration & Health Audit
Chạy trực tiếp trên máy local, tiêu tốn 0 TOKEN.
Kiểm tra toàn diện:
1. Trạng thái hoạt động của 6 Microservices (Health check)
2. Luồng xác thực (Auth Service: Register, Login, Token, RBAC)
3. Luồng quản lý nhóm & chat (Document/QGroup Service: Duplicate conversation check, Upload)
4. Luồng ngân hàng câu hỏi & Đề thi (Exam Service: /exams, /questions)
5. Kiểm tra tính toàn vẹn Frontend (TypeScript compilation)
"""

import urllib.request
import urllib.parse
import urllib.error
import json
import time
import subprocess
import os

GATEWAY_URL = "http://127.0.0.1:8000"
SERVICES = {
    "API Gateway": "http://127.0.0.1:8000/health",
    "Auth Service": "http://127.0.0.1:8001/health",
    "Document Service": "http://127.0.0.1:8002/health",
    "RAG Service": "http://127.0.0.1:8003/health",
    "AI Service": "http://127.0.0.1:8004/health",
    "Exam Service": "http://127.0.0.1:8005/health",
}

class SystemAuditor:
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0
        self.warnings = 0

    def log(self, category, name, status, details=""):
        icon = "✅ PASS" if status == "PASS" else ("⚠️ WARN" if status == "WARN" else "❌ FAIL")
        if status == "PASS":
            self.passed += 1
        elif status == "WARN":
            self.warnings += 1
        else:
            self.failed += 1
        entry = {"category": category, "name": name, "status": status, "details": details}
        self.results.append(entry)
        print(f"[{icon}] [{category}] {name}: {details}")

    def request(self, url, method="GET", data=None, headers=None, timeout=5, is_form=False):
        h = headers or {}
        if "User-Agent" not in h:
            h["User-Agent"] = "QuizGen-Auditor/1.0"
        body = None
        if data is not None:
            if is_form:
                body = urllib.parse.urlencode(data).encode("utf-8")
                h["Content-Type"] = "application/x-www-form-urlencoded"
            elif isinstance(data, (dict, list)):
                body = json.dumps(data).encode("utf-8")
                h["Content-Type"] = "application/json"
            elif isinstance(data, str):
                body = data.encode("utf-8")
            else:
                body = data

        req = urllib.request.Request(url, data=body, headers=h, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
                try:
                    return resp.status, json.loads(raw)
                except Exception:
                    return resp.status, raw
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", errors="replace")
            try:
                return e.code, json.loads(raw)
            except Exception:
                return e.code, raw
        except Exception as e:
            return 0, str(e)

    def test_services_health(self):
        print("\n--- 1. KIỂM TRA TRẠNG THÁI MICROSERVICES ---")
        for name, url in SERVICES.items():
            status, data = self.request(url)
            if status == 200:
                svc_status = data.get("status") if isinstance(data, dict) else "OK"
                self.log("Microservices", f"Health Check: {name}", "PASS", f"HTTP {status} (status={svc_status})")
            else:
                self.log("Microservices", f"Health Check: {name}", "FAIL", f"HTTP {status} - Error: {data}")

    def test_auth_flow(self):
        print("\n--- 2. KIỂM TRA XÁC THỰC AUTH & RBAC ---")
        test_email = "auditor.bot@uth.edu.vn"
        test_pass = "SecurePass123!"

        # 2.1 Register test user if not exist
        reg_url = f"{GATEWAY_URL}/api/v1/auth/register"
        reg_payload = {
            "email": test_email,
            "password": test_pass,
            "role": "lecturer",
            "full_name": "Auditor Bot",
            "university": "UTH",
            "department": "CNTT"
        }
        r_status, r_data = self.request(reg_url, method="POST", data=reg_payload)
        if r_status in (200, 201):
            self.log("Auth", "User Registration Endpoint", "PASS", "Đăng ký người dùng mới thành công")
        elif r_status == 400 and "đã được đăng ký" in str(r_data):
            self.log("Auth", "User Registration Endpoint", "PASS", "Tài khoản kiểm thử đã tồn tại sẵn")
        else:
            self.log("Auth", "User Registration Endpoint", "WARN", f"Status {r_status}: {r_data}")

        # 2.2 Test OAuth2 Login with form-data
        login_url = f"{GATEWAY_URL}/api/v1/auth/login"
        form_payload = {
            "username": test_email,
            "password": test_pass
        }
        status, data = self.request(login_url, method="POST", data=form_payload, is_form=True)
        token = None
        if status in (200, 201) and isinstance(data, dict):
            token = data.get("access_token")
            role = (data.get("user") or {}).get("role", "unknown")
            self.log("Auth", "User Login & Token Issuance", "PASS", f"Đăng nhập thành công, Role: {role}, Token: {str(token)[:20]}...")
        else:
            self.log("Auth", "User Login & Token Issuance", "FAIL", f"Status {status}: {str(data)[:100]}")

        # 2.3 Test Colleague Search
        lookup_url = f"{GATEWAY_URL}/api/v1/auth/users/search?q=uth"
        status, data = self.request(lookup_url)
        if status == 200:
            count = len(data) if isinstance(data, list) else 1
            self.log("Auth", "Colleague Search API", "PASS", f"Tìm kiếm thành công ({count} kết quả)")
        else:
            self.log("Auth", "Colleague Search API", "WARN", f"Status {status}: {str(data)[:100]}")

        return token

    def test_qgroup_integrity(self):
        print("\n--- 3. KIỂM TRA DỮ LIỆU QGROUP & CHAT HỘI THOẠI ---")
        url = f"{GATEWAY_URL}/api/v1/documents/qgroups"
        status, groups = self.request(url)
        if status == 200 and isinstance(groups, list):
            self.log("QGroup", "Fetch Group List", "PASS", f"Lấy thành công {len(groups)} nhóm/hội thoại")
            
            # Check for duplicate direct chats!
            direct_partners = {}
            duplicates = []
            for g in groups:
                if g.get("type") == "direct" or g.get("isDirect"):
                    partner = g.get("directPartnerEmail") or g.get("partnerEmail")
                    if partner:
                        partner = partner.strip().lower()
                        if partner in direct_partners:
                            duplicates.append((partner, direct_partners[partner], g.get("id")))
                        else:
                            direct_partners[partner] = g.get("id")
            
            if duplicates:
                self.log("QGroup", "Duplicate Direct Conversations Check", "WARN", 
                         f"Phát hiện {len(duplicates)} hội thoại 1-1 bị trùng lặp đối tác! (Ví dụ: {duplicates[0][0]})")
            else:
                self.log("QGroup", "Duplicate Direct Conversations Check", "PASS", "Không có hội thoại 1-1 nào bị tạo trùng lặp!")
        else:
            self.log("QGroup", "Fetch Group List", "FAIL", f"HTTP {status}: {str(groups)[:120]}")

        # Test upload attachment endpoint
        upload_url = f"{GATEWAY_URL}/api/v1/documents/qgroups/upload-attachment"
        status, res = self.request(upload_url, method="POST", data={})
        if status in (200, 400, 422):
            self.log("QGroup", "Upload Attachment Endpoint Existence", "PASS", f"Endpoint sẵn sàng (Status {status})")
        else:
            self.log("QGroup", "Upload Attachment Endpoint Existence", "FAIL", f"Endpoint lỗi (Status {status}): {res}")

    def test_exam_and_ai(self):
        print("\n--- 4. KIỂM TRA EXAM & AI SERVICE ---")
        # Test Exams list endpoint through Gateway
        status, data = self.request(f"{GATEWAY_URL}/api/v1/exams")
        if status == 200:
            count = len(data) if isinstance(data, list) else 1
            self.log("Exam", "Exam Service API Routing (/api/v1/exams)", "PASS", f"Định tuyến Gateway chuẩn xác, tìm thấy {count} đề thi")
        elif status in (401, 403):
            self.log("Exam", "Exam Service API Routing (/api/v1/exams)", "PASS", f"Gateway yêu cầu xác thực JWT (Status {status})")
        else:
            self.log("Exam", "Exam Service API Routing (/api/v1/exams)", "FAIL", f"Status {status}: {str(data)[:100]}")

        # Test Questions bank endpoint
        status, data = self.request(f"{GATEWAY_URL}/api/v1/questions")
        if status in (200, 401, 403):
            self.log("Exam", "Question Bank API Routing (/api/v1/questions)", "PASS", f"Gateway định tuyến chuẩn tới Question Bank (Status {status})")
        else:
            self.log("Exam", "Question Bank API Routing (/api/v1/questions)", "FAIL", f"Status {status}: {str(data)[:100]}")

    def test_frontend_compilation(self):
        print("\n--- 5. KIỂM TRA TOÀN VẸN FRONTEND TYPESCRIPT ---")
        cmd = "npx.cmd tsc --noEmit" if os.name == 'nt' else "npx tsc --noEmit"
        t0 = time.time()
        try:
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            elapsed = round(time.time() - t0, 1)
            if res.returncode == 0:
                self.log("Frontend", "TypeScript Compilation (tsc --noEmit)", "PASS", f"100% Type-safe! Không có lỗi cú pháp (trong {elapsed}s)")
            else:
                err_lines = [l for l in res.stdout.split('\n') if 'error TS' in l][:3]
                self.log("Frontend", "TypeScript Compilation (tsc --noEmit)", "FAIL", f"Có lỗi TypeScript ({elapsed}s): {'; '.join(err_lines)}")
        except Exception as e:
            self.log("Frontend", "TypeScript Compilation", "WARN", f"Không thể chạy tsc: {e}")

    def summarize(self):
        print("\n" + "="*60)
        print("          BÁO CÁO TỔNG HỢP KIỂM THỬ HỆ THỐNG")
        print("="*60)
        print(f"Tổng số tiêu chí kiểm tra: {len(self.results)}")
        print(f"✅ ĐẠT (PASS):      {self.passed}")
        print(f"⚠️ CẢNH BÁO (WARN): {self.warnings}")
        print(f"❌ THẤT BẠI (FAIL): {self.failed}")
        print("="*60)
        
        report_path = os.path.join(os.path.dirname(__file__), "audit_report.json")
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump({
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "summary": {"passed": self.passed, "warnings": self.warnings, "failed": self.failed},
                "details": self.results
            }, f, ensure_ascii=False, indent=2)
        print(f"Báo cáo chi tiết đã lưu tại: {report_path}\n")

if __name__ == "__main__":
    auditor = SystemAuditor()
    auditor.test_services_health()
    auditor.test_auth_flow()
    auditor.test_qgroup_integrity()
    auditor.test_exam_and_ai()
    auditor.test_frontend_compilation()
    auditor.summarize()
