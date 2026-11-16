import io
import csv
import zipfile
from datetime import datetime
from typing import List, Dict, Any, Optional

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

try:
    from .pdf_exporter import PDFExamExporter
    from .word_exporter import WordExamExporter
    from .qti_exporter import QTIExporter
    from ..shuffler import ExamShuffler
except ImportError:
    from exporters.pdf_exporter import PDFExamExporter
    from exporters.word_exporter import WordExamExporter
    from exporters.qti_exporter import QTIExporter
    from shuffler import ExamShuffler


class ExamBundleExporter:
    """
    Module đóng gói trọn bộ tài liệu khảo thí chuyên nghiệp (.zip):
      1. Bộ đề thi PDF cho tất cả các mã đề (kèm phiếu OMR tích hợp).
      2. Bộ đề thi Word (.docx) chuẩn khảo thí Bộ GD&ĐT cho tất cả các mã đề.
      3. Phiếu trả lời trắc nghiệm OMR 50 câu độc lập chuẩn thi đại học (PDF vector).
      4. Bảng ma trận đáp án tổng hợp so sánh chéo (.docx & .csv UTF-8 BOM).
      5. Gói chuẩn khảo thí số LMS IMS QTI 2.1 Content Package (.zip) cho Canvas/Moodle.
      6. Tệp hướng dẫn & thông tin khảo thí (README_HUONG_DAN_KHAO_THI.txt).
    """

    @classmethod
    def generate_exam_bundle_zip(
        cls,
        exam_title: str,
        subject: str,
        questions: List[Dict[str, Any]],
        university: str = "ĐẠI HỌC QUỐC GIA",
        faculty: str = "Khoa Kinh tế & Quản trị",
        duration_minutes: int = 60,
        exam_code_count: int = 4,
        base_exam_code: int = 101,
        shuffle_questions: bool = True,
        shuffle_options: bool = True,
        include_answer_key: bool = True,
        include_explanation: bool = True,
        include_omr_sheet: bool = True
    ) -> bytes:
        if not questions:
            raise ValueError("Danh sách câu hỏi không được rỗng.")

        # 1. Sinh các biến thể đề thi theo thuật toán Fisher-Yates
        shuffled_result = ExamShuffler.generate_variants(
            questions=questions,
            exam_code_count=exam_code_count,
            base_exam_code=base_exam_code,
            shuffle_questions=shuffle_questions,
            shuffle_options=shuffle_options
        )
        variants = shuffled_result.get("variants", [])
        total_questions = len(questions)
        exam_codes = [str(v["examCode"]) for v in variants]
        now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:

            # ---------------------------------------------------------
            # 2. Sinh các đề thi PDF cho từng mã đề
            # ---------------------------------------------------------
            for variant in variants:
                code = variant["examCode"]
                v_questions = variant["questions"]
                pdf_bytes = PDFExamExporter.generate_pdf(
                    exam_title=exam_title,
                    subject=subject,
                    exam_code=code,
                    questions=v_questions,
                    university=university,
                    faculty=faculty,
                    duration_minutes=duration_minutes,
                    include_answer_key=include_answer_key,
                    include_explanation=include_explanation,
                    include_omr_sheet=include_omr_sheet
                )
                zf.writestr(f"De_Thi_PDF/De_Thi_MaDe_{code}.pdf", pdf_bytes)

            # ---------------------------------------------------------
            # 3. Sinh các đề thi Word (.docx) cho từng mã đề
            # ---------------------------------------------------------
            for variant in variants:
                code = variant["examCode"]
                v_questions = variant["questions"]
                docx_bytes = WordExamExporter.generate_docx(
                    exam_title=exam_title,
                    subject=subject,
                    exam_code=code,
                    questions=v_questions,
                    university=university,
                    faculty=faculty,
                    duration_minutes=duration_minutes,
                    include_answer_key=include_answer_key,
                    include_explanation=include_explanation,
                    include_omr_sheet=include_omr_sheet
                )
                zf.writestr(f"De_Thi_Word/De_Thi_MaDe_{code}.docx", docx_bytes)

            # ---------------------------------------------------------
            # 4. Sinh Phiếu trả lời trắc nghiệm OMR 50 câu chuẩn độc lập (cả PDF và DOCX)
            # ---------------------------------------------------------
            omr_pdf_bytes = PDFExamExporter.generate_omr_50_pdf(
                university=university,
                faculty=faculty,
                subject=subject,
                exam_code=exam_codes[0] if exam_codes else "101"
            )
            zf.writestr("Phieu_Tra_Loi_OMR/Phieu_Tra_Loi_OMR_50_Cau_Chuan.pdf", omr_pdf_bytes)

            omr_docx_bytes = WordExamExporter.generate_omr_50_docx(
                university=university,
                faculty=faculty,
                subject=subject,
                exam_code=exam_codes[0] if exam_codes else "101"
            )
            zf.writestr("Phieu_Tra_Loi_OMR/Phieu_Tra_Loi_OMR_50_Cau_Chuan.docx", omr_docx_bytes)

            # ---------------------------------------------------------
            # 5. Sinh Bảng Ma Trận Đáp Án So Sánh Chéo (.docx & .csv)
            # ---------------------------------------------------------
            # 5a. File CSV Ma Trận Đáp Án (UTF-8 with BOM cho Microsoft Excel)
            csv_buffer = io.StringIO()
            csv_writer = csv.writer(csv_buffer)
            # Header
            header_row = ["Cau_Hoi"] + [f"Ma_De_{code}" for code in exam_codes]
            csv_writer.writerow(header_row)

            # Dữ liệu từng câu
            for q_idx in range(total_questions):
                row = [f"Câu {q_idx + 1}"]
                for v in variants:
                    ans_list = v.get("answerKey", [])
                    label = ans_list[q_idx]["correctOption"] if q_idx < len(ans_list) else "-"
                    row.append(label)
                csv_writer.writerow(row)

            # Thêm BOM UTF-8 (\ufeff)
            csv_bytes = ("\ufeff" + csv_buffer.getvalue()).encode("utf-8")
            zf.writestr("Dap_An_Va_Ma_Tran/Ma_Tran_Dap_An_Tong_Hop.csv", csv_bytes)

            # 5b. File Word Bảng Ma Trận Đáp Án Tổng Hợp
            matrix_doc_bytes = cls._generate_matrix_docx(
                exam_title=exam_title,
                subject=subject,
                university=university,
                faculty=faculty,
                variants=variants,
                exam_codes=exam_codes,
                total_questions=total_questions
            )
            zf.writestr("Dap_An_Va_Ma_Tran/Bang_Ma_Tran_Dap_An_Tong_Hop.docx", matrix_doc_bytes)

            # ---------------------------------------------------------
            # 6. Gói LMS Chuẩn IMS QTI 2.1 Content Package (.zip) & Moodle XML
            # ---------------------------------------------------------
            qti_zip_bytes = QTIExporter.export_qti21_package_zip(
                title=f"{subject} - {exam_title}",
                questions=questions
            )
            zf.writestr("Goi_LMS_QTI_2.1/Goi_LMS_QTI_2.1_Canvas.zip", qti_zip_bytes)

            moodle_xml = QTIExporter.export_canvas_moodle_xml(
                title=f"{subject} - {exam_title}",
                questions=questions
            )
            zf.writestr("Goi_LMS_QTI_2.1/moodle_canvas_quiz.xml", moodle_xml.encode("utf-8"))

            # ---------------------------------------------------------
            # 7. File Hướng Dẫn Khảo Thí & Bàn Giao (README)
            # ---------------------------------------------------------
            readme_text = f"""================================================================================
BỘ TÀI LIỆU KHẢO THÍ ĐA ĐỊNH DẠNG - QUIZGEN AI (SCRUM-56)
================================================================================
Trường / Đơn vị : {university.upper()}
Khoa / Bộ môn   : {faculty}
Môn thi         : {subject}
Tiêu đề đề thi  : {exam_title}
Thời gian làm   : {duration_minutes} phút
Số lượng câu hỏi: {total_questions} câu
Các mã đề       : {', '.join(exam_codes)}
Thời điểm tạo   : {now_str}
Tiêu chuẩn      : Khảo thí Đại học, OMR 50 câu quang học & IMS QTI 2.1 LMS
================================================================================

DANH MỤC TÀI NGUYÊN TRONG BỘ ĐỀ NÉN:

1. Thư mục [De_Thi_PDF/]:
   - Gồm {len(exam_codes)} tệp đề thi định dạng PDF sắc nét chuẩn in ấn laser.
   - Tích hợp phụ lục bảng đáp án và hướng dẫn giải ở trang phụ lục.
   - Tích hợp Phiếu tô trắc nghiệm OMR 50 câu chuẩn ở trang cuối cùng của mỗi đề thi.

2. Thư mục [De_Thi_Word/]:
   - Gồm {len(exam_codes)} tệp đề thi định dạng Microsoft Word (.docx).
   - Định dạng theo mẫu chuẩn bài thi kết thúc học phần, dễ dàng chỉnh sửa bổ sung.

3. Thư mục [Phieu_Tra_Loi_OMR/]:
   - Tệp [Phieu_Tra_Loi_OMR_50_Cau_Chuan.pdf]: Phiếu trả lời trắc nghiệm 50 câu độc lập.
   - Tương thích máy chấm thi trắc nghiệm quang học (OMR) và ứng dụng chấm thi tự động.
   - Lưu ý khi in phiếu: In khổ giấy A4, định lượng giấy tối thiểu 70 - 80 gsm, tỷ lệ in 100% (Actual size) để đảm bảo độ chính xác các tọa độ điểm mốc định vị 4 góc.

4. Thư mục [Dap_An_Va_Ma_Tran/]:
   - [Bang_Ma_Tran_Dap_An_Tong_Hop.docx]: Bảng so sánh ma trận đáp án chéo giữa các mã đề ({', '.join(exam_codes)}), kèm thống kê phân bổ tần suất lựa chọn A-B-C-D.
   - [Ma_Tran_Dap_An_Tong_Hop.csv]: Bảng đáp án phẳng UTF-8 BOM, sẵn sàng nạp trực tiếp vào phần mềm chấm thi tự động hoặc Microsoft Excel.

5. Thư mục [Goi_LMS_QTI_2.1/]:
   - [Goi_LMS_QTI_2.1_Canvas.zip]: Gói chuẩn IMS QTI 2.1 Content Package (chứa imsmanifest.xml, assessment.xml và các item XML) dùng để Import bài thi trực tiếp vào Canvas LMS, Blackboard, Brightspace.
   - [moodle_canvas_quiz.xml]: Tệp Moodle XML dùng để nạp vào Ngân hàng câu hỏi Moodle.

================================================================================
Hệ thống phát triển bởi Nhóm khảo thí QuizGen AI. Bản quyền thuộc về đề tài.
"""
            zf.writestr("README_HUONG_DAN_KHAO_THI.txt", readme_text.strip().encode("utf-8"))

        zip_buffer.seek(0)
        return zip_buffer.getvalue()

    @classmethod
    def _generate_matrix_docx(
        cls,
        exam_title: str,
        subject: str,
        university: str,
        faculty: str,
        variants: List[Dict[str, Any]],
        exam_codes: List[str],
        total_questions: int
    ) -> bytes:
        doc = Document()

        # Căn lề chuẩn
        for section in doc.sections:
            section.top_margin = Inches(0.75)
            section.bottom_margin = Inches(0.75)
            section.left_margin = Inches(0.75)
            section.right_margin = Inches(0.75)

        # Header 2 cột
        header_table = doc.add_table(rows=1, cols=2)
        header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell_l, cell_r = header_table.rows[0].cells
        
        p_l = cell_l.paragraphs[0]
        r1 = p_l.add_run(f"{university.upper()}\n")
        r1.bold = True
        r1.font.size = Pt(10)
        p_l.add_run(f"{faculty.upper()}\n-------------------")

        p_r = cell_r.paragraphs[0]
        p_r.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r2 = p_r.add_run("HỘI ĐỒNG KHẢO THÍ & ĐẢM BẢO CHẤT LƯỢNG\n")
        r2.bold = True
        r2.font.size = Pt(10)
        p_r.add_run(f"Môn thi: {subject}")

        doc.add_paragraph()

        # Tiêu đề bảng ma trận
        p_title = doc.add_paragraph()
        p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_title = p_title.add_run("BẢNG MA TRẬN ĐÁP ÁN TỔNG HỢP CÁC MÃ ĐỀ THI")
        r_title.bold = True
        r_title.font.size = Pt(13)

        p_sub = doc.add_paragraph()
        p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_sub = p_sub.add_run(f"Đề thi: {exam_title} | Tổng số câu: {total_questions} | Các mã đề: {', '.join(exam_codes)}")
        r_sub.italic = True
        r_sub.font.size = Pt(9.5)

        doc.add_paragraph()

        # Bảng Ma trận so sánh chéo
        col_count = len(exam_codes) + 1
        table = doc.add_table(rows=1, cols=col_count)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER

        # Dòng tiêu đề
        hdr_cells = table.rows[0].cells
        hdr_cells[0].text = "Câu hỏi"
        for i, code in enumerate(exam_codes, 1):
            hdr_cells[i].text = f"Mã {code}"

        for cell in hdr_cells:
            for p in cell.paragraphs:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for run in p.runs:
                    run.bold = True
                    run.font.size = Pt(9.5)

        # Thống kê tần suất lựa chọn để kiểm tra độ cân bằng
        freq_stats = {code: {"A": 0, "B": 0, "C": 0, "D": 0} for code in exam_codes}

        # Dữ liệu từng câu
        for q_idx in range(total_questions):
            row_cells = table.add_row().cells
            row_cells[0].text = f"Câu {q_idx + 1:02d}"
            row_cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

            for i, v in enumerate(variants, 1):
                ans_list = v.get("answerKey", [])
                opt = ans_list[q_idx]["correctOption"] if q_idx < len(ans_list) else "-"
                row_cells[i].text = opt
                row_cells[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
                v_code = str(v["examCode"])
                if opt in freq_stats[v_code]:
                    freq_stats[v_code][opt] += 1

        doc.add_paragraph()

        # Thống kê phân bổ đáp án
        p_stat_title = doc.add_paragraph()
        r_st = p_stat_title.add_run("THỐNG KÊ PHÂN BỔ TẦN SUẤT ĐÁP ÁN (KIỂM TRA TÍNH CÂN BẰNG KHẢO THÍ):")
        r_st.bold = True
        r_st.font.size = Pt(10)

        stat_table = doc.add_table(rows=1, cols=6)
        stat_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        st_hdr = stat_table.rows[0].cells
        st_hdr[0].text = "Mã đề"
        st_hdr[1].text = "Phương án A"
        st_hdr[2].text = "Phương án B"
        st_hdr[3].text = "Phương án C"
        st_hdr[4].text = "Phương án D"
        st_hdr[5].text = "Tổng số câu"

        for cell in st_hdr:
            for p in cell.paragraphs:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for r in p.runs:
                    r.bold = True
                    r.font.size = Pt(9)

        for code in exam_codes:
            st_row = stat_table.add_row().cells
            st_row[0].text = f"Mã {code}"
            st_row[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            counts = freq_stats[code]
            for idx, opt_char in enumerate(["A", "B", "C", "D"], 1):
                cnt = counts[opt_char]
                pct = (cnt / total_questions * 100) if total_questions else 0
                st_row[idx].text = f"{cnt} ({pct:.1f}%)"
                st_row[idx].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            st_row[5].text = str(total_questions)
            st_row[5].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()
