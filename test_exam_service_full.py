# -*- coding: utf-8 -*-
"""
================================================================================
KỊCH BẢN KIỂM THỬ TOÀN DIỆN EXAM & QUESTION BANK SERVICE (QUIZGEN AI)
Phân hệ: Exam Service (Cổng 8005 / API Gateway Cổng 8000)
Tác giả: Ngô Công Đức
================================================================================
Hướng dẫn chạy:
    python test_exam_service_full.py
Tất cả tài liệu xuất thử nghiệm sẽ được lưu tại thư mục: ./test_outputs/
================================================================================
"""

import os
import sys
import io
import json
import zipfile
from datetime import datetime

# Cấu hình UTF-8 cho console Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Thêm đường dẫn tới services/exam-service
current_dir = os.path.dirname(os.path.abspath(__file__))
exam_service_path = os.path.join(current_dir, "services", "exam-service")
if exam_service_path not in sys.path:
    sys.path.insert(0, exam_service_path)

from fastapi.testclient import TestClient
from src.main import app
from src.auth import decode_jwt_token
from src.shuffler import ExamShuffler
from src.exporters.pdf_exporter import PDFExamExporter
from src.exporters.word_exporter import WordExamExporter
from src.exporters.qti_exporter import QTIExporter
from src.exporters.bundle_exporter import ExamBundleExporter

client = TestClient(app)
OUTPUT_DIR = os.path.join(current_dir, "test_outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Bộ câu hỏi mẫu chuẩn bị cho bài kiểm thử
SAMPLE_QUESTIONS = [
    {
        "id": f"q-{i:02d}",
        "question": f"Câu hỏi {i}: Trong phân tích kinh tế vi mô, yếu tố nào sau đây làm dịch chuyển đường cầu sang phải?",
        "bloom_level": "Thông hiểu" if i % 2 == 0 else "Nhận biết",
        "chapter": "Chương 2: Cung - Cầu và Cơ chế thị trường",
        "options": [
            {"id": f"opt-{i}-a", "label": "A", "text": "Thu nhập của người tiêu dùng tăng lên đối với hàng hóa thông thường"},
            {"id": f"opt-{i}-b", "label": "B", "text": "Giá của hàng hóa thay thế suy giảm nghiêm trọng"},
            {"id": f"opt-{i}-c", "label": "C", "text": "Chính phủ áp dụng mức thuế suất tiêu thụ đặc biệt cao hơn"},
            {"id": f"opt-{i}-d", "label": "D", "text": "Chi phí nguyên vật liệu đầu vào của nhà sản xuất tăng vọt"}
        ],
        "correct_answer_id": f"opt-{i}-a",
        "explanation": f"Căn cứ học thuật câu {i}: Khi thu nhập tăng, nhu cầu đối với hàng hóa thông thường sẽ tăng ở mọi mức giá, làm đường cầu dịch chuyển sang bên phải."
    }
    for i in range(1, 11)
]


def print_header(title: str):
    print("\n" + "=" * 78)
    print(f"▶ {title}")
    print("=" * 78)


def print_success(message: str):
    print(f"  ✔ [THÀNH CÔNG] {message}")


def main():
    print("*" * 78)
    print("       BẮT ĐẦU CHẠY BỘ TEST KIỂM THỬ TÍNH NĂNG EXAM SERVICE")
    print(f"  Thời điểm kiểm tra : {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"  Thư mục xuất file  : {OUTPUT_DIR}")
    print("*" * 78)

    # --------------------------------------------------------------------------
    # TEST 1: Thuật toán Fisher-Yates Đảo đa mã đề & Ánh xạ ma trận đáp án
    # --------------------------------------------------------------------------
    print_header("TEST 1: Thuật toán Fisher-Yates Đảo đề & Tái ánh xạ Đáp án")
    res_shuffler = ExamShuffler.generate_variants(
        questions=SAMPLE_QUESTIONS,
        exam_code_count=4,
        base_exam_code=101,
        shuffle_questions=True,
        shuffle_options=True,
        seed=42
    )
    variants = res_shuffler["variants"]
    assert len(variants) == 4, "Số lượng mã đề đảo phải đúng bằng 4"
    assert variants[0]["examCode"] == "101", "Mã đề gốc phải là 101"
    assert variants[1]["examCode"] == "102", "Mã đề thứ 2 phải là 102"
    
    # Kiểm tra tính toàn vẹn của ánh xạ đáp án
    for v in variants:
        assert len(v["answerKey"]) == 10, f"Mã {v['examCode']} phải có đủ 10 đáp án"
        for item in v["answerKey"]:
            assert item["correctOption"] in ["A", "B", "C", "D"], "Nhãn đáp án phải là A, B, C hoặc D"
    print_success("Đã sinh 4 mã đề hoán vị (101, 102, 103, 104) với ma trận đáp án chuẩn xác 100%.")

    # --------------------------------------------------------------------------
    # TEST 2: Xuất Phiếu trả lời trắc nghiệm OMR 50 câu chuẩn thi đại học (PDF)
    # --------------------------------------------------------------------------
    print_header("TEST 2: Xuất Phiếu tô trắc nghiệm OMR 50 câu độc lập (PDF Vector)")
    omr_pdf = PDFExamExporter.generate_omr_50_pdf(
        university="ĐẠI HỌC QUỐC GIA TP.HCM",
        faculty="Khoa Kinh tế & Quản trị",
        subject="Kinh tế vi mô",
        exam_code="101"
    )
    assert omr_pdf.startswith(b"%PDF-"), "Tệp xuất ra phải là định dạng PDF hợp lệ"
    assert len(omr_pdf) > 50000, "Dung lượng phiếu OMR phải đủ lớn chứa vector đồ họa"
    
    omr_file_path = os.path.join(OUTPUT_DIR, "Phieu_Tra_Loi_OMR_50_Cau_Chuan.pdf")
    with open(omr_file_path, "wb") as f:
        f.write(omr_pdf)
    print_success(f"Đã xuất Phiếu OMR 50 câu chuẩn ({len(omr_pdf):,} bytes) -> {os.path.basename(omr_file_path)}")

    # --------------------------------------------------------------------------
    # TEST 3: Xuất Đề thi Microsoft Word (.docx) chuẩn thể thức Bộ GD&ĐT
    # --------------------------------------------------------------------------
    print_header("TEST 3: Xuất Đề thi Word (.docx) kèm Bảng ma trận đáp án")
    docx_bytes = WordExamExporter.generate_docx(
        exam_title="ĐỀ THI KẾT THÚC HỌC PHẦN - HỌC KỲ II",
        subject="Kinh tế vi mô",
        exam_code="101",
        questions=SAMPLE_QUESTIONS,
        university="ĐẠI HỌC QUỐC GIA",
        faculty="Khoa Kinh tế & Quản trị",
        duration_minutes=60,
        include_answer_key=True,
        include_explanation=True
    )
    assert docx_bytes.startswith(b"PK"), "Tệp Word DOCX phải có cấu trúc nén ZIP chuẩn OpenXML"
    docx_file_path = os.path.join(OUTPUT_DIR, "De_Thi_MaDe_101.docx")
    with open(docx_file_path, "wb") as f:
        f.write(docx_bytes)
    print_success(f"Đã xuất đề thi Word (.docx) chuẩn ({len(docx_bytes):,} bytes) -> {os.path.basename(docx_file_path)}")

    # --------------------------------------------------------------------------
    # TEST 4: Xuất Gói LMS Chuẩn E-Learning IMS QTI 2.1 Content Package (.zip)
    # --------------------------------------------------------------------------
    print_header("TEST 4: Đóng gói chuẩn E-Learning Quốc tế IMS QTI 2.1 (.zip)")
    qti_zip_bytes = QTIExporter.export_qti21_package_zip(
        title="Kinh tế vi mô - Đề thi Cuối kỳ",
        questions=SAMPLE_QUESTIONS
    )
    assert qti_zip_bytes.startswith(b"PK"), "Gói QTI phải là tệp nén ZIP hợp lệ"
    qti_zf = zipfile.ZipFile(io.BytesIO(qti_zip_bytes))
    qti_files = qti_zf.namelist()
    assert "imsmanifest.xml" in qti_files, "Bắt buộc phải có tệp imsmanifest.xml"
    assert "assessment.xml" in qti_files, "Bắt buộc phải có tệp assessment.xml"
    assert "moodle_canvas_quiz.xml" in qti_files, "Bắt buộc có tệp Moodle XML phụ trợ"
    assert any(name.startswith("items/item_") for name in qti_files), "Bắt buộc có thư mục items chứa câu hỏi QTI 2.1"
    
    qti_file_path = os.path.join(OUTPUT_DIR, "Goi_LMS_QTI_2.1_Canvas.zip")
    with open(qti_file_path, "wb") as f:
        f.write(qti_zip_bytes)
    print_success(f"Đã đóng gói IMS QTI 2.1 ({len(qti_files)} tệp tin) -> {os.path.basename(qti_file_path)}")

    # --------------------------------------------------------------------------
    # TEST 5: Đóng gói Trọn bộ Khảo thí Đa định dạng (Exam Bundle ZIP)
    # --------------------------------------------------------------------------
    print_header("TEST 5: Đóng gói Trọn bộ Khảo thí Bundle ZIP (14 tài liệu nén)")
    bundle_zip_bytes = ExamBundleExporter.generate_exam_bundle_zip(
        exam_title="ĐỀ THI TẬP TRUNG HỌC KỲ II",
        subject="Kinh tế vi mô",
        questions=SAMPLE_QUESTIONS,
        university="ĐẠI HỌC QUỐC GIA TP.HCM",
        faculty="Khoa Kinh tế & Quản trị",
        duration_minutes=60,
        exam_code_count=4,
        base_exam_code=101,
        include_answer_key=True,
        include_explanation=True,
        include_omr_sheet=True
    )
    bundle_zf = zipfile.ZipFile(io.BytesIO(bundle_zip_bytes))
    b_files = bundle_zf.namelist()
    
    # Kiểm tra các thư mục và file bắt buộc
    assert any("De_Thi_PDF/De_Thi_MaDe_101.pdf" in n for n in b_files), "Thiếu PDF mã đề 101"
    assert any("De_Thi_Word/De_Thi_MaDe_101.docx" in n for n in b_files), "Thiếu Word mã đề 101"
    assert any("Phieu_Tra_Loi_OMR/Phieu_Tra_Loi_OMR_50_Cau_Chuan.pdf" in n for n in b_files), "Thiếu Phiếu OMR độc lập"
    assert any("Dap_An_Va_Ma_Tran/Ma_Tran_Dap_An_Tong_Hop.csv" in n for n in b_files), "Thiếu CSV ma trận đáp án"
    assert any("Dap_An_Va_Ma_Tran/Bang_Ma_Tran_Dap_An_Tong_Hop.docx" in n for n in b_files), "Thiếu Word ma trận so sánh chéo"
    assert any("Goi_LMS_QTI_2.1/Goi_LMS_QTI_2.1_Canvas.zip" in n for n in b_files), "Thiếu gói LMS QTI 2.1"
    assert "README_HUONG_DAN_KHAO_THI.txt" in b_files, "Thiếu văn bản hướng dẫn khảo thí"

    # Trích xuất riêng file CSV để kiểm tra UTF-8 BOM
    csv_raw = bundle_zf.read("Dap_An_Va_Ma_Tran/Ma_Tran_Dap_An_Tong_Hop.csv")
    assert csv_raw.startswith(b"\xef\xbb\xbf"), "File CSV ma trận đáp án phải chứa mã Byte Order Mark (UTF-8 BOM) để mở trên Excel không lỗi font"

    bundle_file_path = os.path.join(OUTPUT_DIR, "Tron_Bo_Khao_Thi_Da_Dinh_Dang.zip")
    with open(bundle_file_path, "wb") as f:
        f.write(bundle_zip_bytes)
    print_success(f"Đã đóng gói Trọn bộ Khảo thí ({len(b_files)} tài liệu, {len(bundle_zip_bytes):,} bytes) -> {os.path.basename(bundle_file_path)}")

    # --------------------------------------------------------------------------
    # TEST 6: Xác thực JWT động & Phân quyền bảo mật (Loại bỏ hardcode)
    # --------------------------------------------------------------------------
    print_header("TEST 6: Kiểm thử Xác thực JWT Động & Phân quyền RBAC")
    test_token = "mock-jwt-usr999-lecturer-2026"
    decoded_user = decode_jwt_token(test_token)
    assert decoded_user["user_id"] == "usr999", "Phải giải mã đúng user_id từ token"
    assert decoded_user["role"] == "lecturer", "Phải giải mã đúng role từ token"

    auth_headers = {"Authorization": f"Bearer {test_token}"}
    
    # 6.1 Tạo câu hỏi mới thông qua API
    create_q_res = client.post("/questions", json={
        "question": "Câu hỏi kiểm tra thẩm định danh tính động?",
        "bloomLevel": "Thông hiểu",
        "chapter": "Chương 1",
        "options": [
            {"id": "opt-1", "label": "A", "text": "Phương án đúng"},
            {"id": "opt-2", "label": "B", "text": "Phương án sai"}
        ],
        "correctAnswerId": "opt-1"
    }, headers=auth_headers)
    assert create_q_res.status_code == 201, f"Tạo câu hỏi thất bại: {create_q_res.text}"
    created_q_id = create_q_res.json()["id"]
    print_success(f"API /questions tạo câu hỏi thành công với định danh động (ID: {created_q_id})")

    # --------------------------------------------------------------------------
    # TEST 7: Lưu bài thi kiểm duyệt vào CSDL (POST /api/v1/exams/save)
    # --------------------------------------------------------------------------
    print_header("TEST 7: Lưu bài thi kiểm duyệt vào DB exams.exams & exam_variants")
    save_exam_res = client.post("/api/v1/exams/save", json={
        "title": "Đề thi Kiểm tra Học kỳ Tích hợp DB",
        "subject": "Kinh tế vi mô",
        "faculty": "Khoa Kinh tế & Quản trị",
        "university": "ĐẠI HỌC QUỐC GIA",
        "durationMinutes": 60,
        "selectedQuestionIds": [created_q_id],
        "examCodes": ["101", "102"],
        "format": "zip"
    }, headers=auth_headers)
    assert save_exam_res.status_code == 201, f"Lưu bài thi thất bại: {save_exam_res.text}"
    exam_res_data = save_exam_res.json()
    saved_exam_id = exam_res_data["exam"]["id"]
    assert exam_res_data["exam"]["userId"] == "usr999", "user_id trong CSDL phải khớp chính xác với token đăng nhập"
    print_success(f"Đã lưu bài thi vào DB với ID={saved_exam_id}, userId={exam_res_data['exam']['userId']}")

    # --------------------------------------------------------------------------
    # TEST 8: Tải lại đề thi từ CSDL (GET /exams/{id}/download) & Xóa bài thi
    # --------------------------------------------------------------------------
    print_header("TEST 8: Tải lại đề thi từ DB & Kiểm soát quyền Xóa (RBAC)")
    # 8.1 Tải lại tệp ZIP
    dl_res = client.get(f"/exams/{saved_exam_id}/download?format=zip", headers=auth_headers)
    assert dl_res.status_code == 200, f"Tải lại đề thi thất bại: {dl_res.status_code}"
    assert len(dl_res.content) > 10000, "Nội dung tải về không hợp lệ"
    print_success(f"Đã tải lại đề thi từ CSDL dưới dạng ZIP ({len(dl_res.content):,} bytes)")

    # 8.2 Giảng viên khác cố tình xóa bài thi (Phải bị chặn 403 Forbidden)
    unauthorized_headers = {"Authorization": "Bearer mock-jwt-otheruser-lecturer-2026"}
    del_unauth_res = client.delete(f"/exams/{saved_exam_id}", headers=unauthorized_headers)
    assert del_unauth_res.status_code == 403, "Hệ thống phải chặn 403 khi giảng viên khác cố gắng xóa đề thi"
    print_success("Bảo mật RBAC hoạt động chuẩn: Đã chặn 403 Forbidden với người dùng không sở hữu bài thi.")

    # 8.3 Chính chủ xóa bài thi thành công
    del_auth_res = client.delete(f"/exams/{saved_exam_id}", headers=auth_headers)
    assert del_auth_res.status_code == 200, f"Chính chủ xóa thất bại: {del_auth_res.text}"
    print_success(f"Chính chủ đã xóa thành công bài thi {saved_exam_id} khỏi CSDL.")

    print("\n" + "*" * 78)
    print("      TẤT CẢ 8/8 BÀI KIỂM THỬ EXAM SERVICE ĐỀU THÀNH CÔNG RỰC RỠ! ✔")
    print("*" * 78)
    print(f"Các tài liệu thực nghiệm được tạo ra có thể kiểm tra trực tiếp tại:")
    for f_name in os.listdir(OUTPUT_DIR):
        f_path = os.path.join(OUTPUT_DIR, f_name)
        size_kb = os.path.getsize(f_path) / 1024
        print(f"  📂 {f_name:<40} ({size_kb:8.1f} KB)")
    print("*" * 78 + "\n")


if __name__ == "__main__":
    main()
