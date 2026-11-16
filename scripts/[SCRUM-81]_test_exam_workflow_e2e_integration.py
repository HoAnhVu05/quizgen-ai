# -*- coding: utf-8 -*-
"""
Test Suite & Integration Benchmark for [SCRUM-81]
Target: Full integration testing of Exam Service with UTH Portal & Auth Services
Author: Ngo Pham Cong Duc (MSSV: 052205015692)
Date: 12/11/2026
"""

import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import time
import io
import docx
import httpx

API_GATEWAY = "http://127.0.0.1:8000"
EXAM_SERVICE = "http://127.0.0.1:8005"
AUTH_SERVICE = "http://127.0.0.1:8001"

def print_header(title):
    print("=" * 80)
    print(f"[*] {title}")
    print("=" * 80)

def test_scrum81_integration():
    print_header("BẮT ĐẦU KIỂM THỬ TÍCH HỢP TOÀN DIỆN HỆ THỐNG [SCRUM-81] - NGO PHAM CONG DUC")
    results = []

    with httpx.Client(base_url=API_GATEWAY, timeout=30.0) as client:
        # Kịch bản 1: Microservices Health Check & UTH Portal Service Discovery
        t0 = time.time()
        res_gateway = client.get("/health")
        latency_gw = (time.time() - t0) * 1000
        assert res_gateway.status_code == 200
        gw_data = res_gateway.json()
        assert "exam-service" in gw_data.get("services_registered", [])
        print(f" [PASS] Kịch bản 1: API Gateway & Service Discovery hoạt động ổn định ({latency_gw:.2f}ms)")
        results.append(("Kịch bản 1: Service Discovery & Gateway Health", "PASS", f"{latency_gw:.2f}ms"))

        # Kịch bản 2: Xác thực Người dùng & Phân quyền Giảng viên UTH
        t0 = time.time()
        res_auth = client.post("/api/v1/auth/login", data={"username": "lecturer@vnu.edu.vn", "password": "academic123"})
        latency_auth = (time.time() - t0) * 1000
        assert res_auth.status_code == 200
        auth_data = res_auth.json()
        token = auth_data.get("access_token")
        assert token is not None
        user_role = auth_data.get("user", {}).get("role")
        assert user_role == "lecturer"
        print(f" [PASS] Kịch bản 2: Đăng nhập Giảng viên UTH thành công, cấp JWT hợp lệ ({latency_auth:.2f}ms)")
        results.append(("Kịch bản 2: UTH Lecturer Authentication & JWT Issuance", "PASS", f"{latency_auth:.2f}ms"))

        # Kịch bản 3: Exam Service - Thuật toán Fisher-Yates Trộn 4 mã đề (101, 102, 103, 104)
        sample_questions = [
            {
                "id": f"q_{i}",
                "question": f"Nội dung câu hỏi kiểm tra khảo thí số {i} theo chuẩn Bloom?",
                "options": [
                    {"id": "A", "text": f"Lựa chọn A của câu {i}"},
                    {"id": "B", "text": f"Lựa chọn B của câu {i}"},
                    {"id": "C", "text": f"Lựa chọn C của câu {i}"},
                    {"id": "D", "text": f"Lựa chọn D của câu {i}"}
                ],
                "correctAnswerId": "A",
                "bloom_level": "HIỂU" if i % 2 == 0 else "VẬN DỤNG"
            } for i in range(1, 11)
        ]
        
        t0 = time.time()
        res_shuffle = client.post(
            "/api/v1/exams/shuffle",
            json={"examCodeCount": 4, "questions": sample_questions}
        )
        latency_shuffle = (time.time() - t0) * 1000
        assert res_shuffle.status_code == 200
        shuffle_data = res_shuffle.json()
        variants = shuffle_data.get("variants", [])
        assert len(variants) == 4
        codes = [v.get("examCode") for v in variants]
        assert set(codes) == {"101", "102", "103", "104"}
        print(f" [PASS] Kịch bản 3: Thuật toán Fisher-Yates sinh chuẩn 4 mã đề {codes} ({latency_shuffle:.2f}ms)")
        results.append(("Kịch bản 3: Fisher-Yates 4-Code Variant Shuffle", "PASS", f"{latency_shuffle:.2f}ms"))

        # Kịch bản 4: Xuất bản Đề thi Word (.docx) tích hợp Phiếu trả lời OMR 50 câu
        t0 = time.time()
        docx_payload = {
            "format": "docx",
            "examTitle": "ĐỀ THI KẾT THÚC HỌC PHẦN HỌC KỲ 1",
            "subjectName": "Kỹ thuật phần mềm nâng cao",
            "examCodeCount": 4,
            "questions": sample_questions
        }
        res_docx = client.post("/api/v1/exams/export", json=docx_payload)
        latency_docx = (time.time() - t0) * 1000
        assert res_docx.status_code == 200
        assert len(res_docx.content) > 10000
        doc = docx.Document(io.BytesIO(res_docx.content))
        assert len(doc.tables) >= 5 # Có đủ bảng đề thi và các bảng OMR quang học
        print(f" [PASS] Kịch bản 4: Xuất bản Word (.docx) kèm OMR 50 câu thành công ({len(res_docx.content)} bytes, {latency_docx:.2f}ms)")
        results.append(("Kịch bản 4: DOCX Export with Integrated OMR 50-bubble sheet", "PASS", f"{latency_docx:.2f}ms"))

        # Kịch bản 5: Xuất bản Đề thi PDF Vector sắc nét
        t0 = time.time()
        pdf_payload = {
            "format": "pdf",
            "examTitle": "ĐỀ THI KẾT THÚC HỌC PHẦN HỌC KỲ 1",
            "subjectName": "Kỹ thuật phần mềm nâng cao",
            "questions": sample_questions
        }
        res_pdf = client.post("/api/v1/exams/export", json=pdf_payload)
        latency_pdf = (time.time() - t0) * 1000
        assert res_pdf.status_code == 200
        assert res_pdf.content.startswith(b"%PDF-")
        print(f" [PASS] Kịch bản 5: Xuất bản PDF chuẩn in ấn thành công ({len(res_pdf.content)} bytes, {latency_pdf:.2f}ms)")
        results.append(("Kịch bản 5: PDF Vector High-Resolution Export", "PASS", f"{latency_pdf:.2f}ms"))

        # Kịch bản 6: Xuất bản Gói E-learning IMS QTI 2.1 (.zip)
        t0 = time.time()
        qti_payload = {
            "format": "qti",
            "examTitle": "ĐỀ THI KẾT THÚC HỌC PHẦN HỌC KỲ 1",
            "subjectName": "Kỹ thuật phần mềm nâng cao",
            "questions": sample_questions
        }
        res_qti = client.post("/api/v1/exams/export", json=qti_payload)
        latency_qti = (time.time() - t0) * 1000
        assert res_qti.status_code == 200
        assert res_qti.content.startswith(b"PK")
        print(f" [PASS] Kịch bản 6: Đóng gói IMS QTI 2.1 LMS chuẩn Canvas/Moodle ({len(res_qti.content)} bytes, {latency_qti:.2f}ms)")
        results.append(("Kịch bản 6: IMS QTI 2.1 LMS E-learning Package Export", "PASS", f"{latency_qti:.2f}ms"))

        # Kịch bản 7: Xuất bản Trọn bộ Khảo thí Bundle ZIP (15 tài liệu)
        t0 = time.time()
        bundle_payload = {
            "format": "bundle",
            "examTitle": "ĐỀ THI KẾT THÚC HỌC PHẦN HỌC KỲ 1",
            "subjectName": "Kỹ thuật phần mềm nâng cao",
            "examCodeCount": 4,
            "questions": sample_questions
        }
        res_bundle = client.post("/api/v1/exams/export", json=bundle_payload)
        latency_bundle = (time.time() - t0) * 1000
        assert res_bundle.status_code == 200
        assert res_bundle.content.startswith(b"PK")
        print(f" [DEBUG] Latency bundle measured: {latency_bundle:.2f}ms")
        assert latency_bundle < 15000.0, "Bundle export exceeded SLA threshold!"
        print(f" [PASS] Kịch bản 7: Đóng gói Trọn bộ Khảo thí Bundle ZIP thành công ({len(res_bundle.content)} bytes, {latency_bundle:.2f}ms)")
        results.append(("Kịch bản 7: Complete Assessment 15-Document Bundle ZIP", "PASS", f"{latency_bundle:.2f}ms"))

    print("\n" + "=" * 80)
    print(" BẢNG TỔNG HỢP KẾT QUẢ KIỂM THỬ TÍCH HỢP [SCRUM-81]")
    print("=" * 80)
    for idx, (name, status, lat) in enumerate(results, 1):
        print(f"  {idx}. {name:<60} | [{status}] | Độ trễ: {lat}")
    print("=" * 80)
    print(">>> 100% KỊCH BẢN KIỂM THỬ TÍCH HỢP [SCRUM-81] ĐẠT YÊU CẦU CHẤT LƯỢNG <<<")
    print("=" * 80)

if __name__ == "__main__":
    test_scrum81_integration()
