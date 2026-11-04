import os
import io
import unicodedata
from typing import List, Dict, Any, Optional
from fpdf import FPDF

class PDFExamExporter:
    """
    Động cơ kết xuất đề thi PDF chất lượng cao dùng fpdf2:
    - Định dạng thể thức chuẩn khảo thí
    - Hỗ trợ font Unicode tiếng Việt (DejaVu / Arial) với cơ chế fallback thông minh
    - Bảng ma trận đáp án chuẩn
    - (Tùy chọn) Phiếu tô trắc nghiệm OMR Bubble Sheet
    """

    @classmethod
    def _setup_fonts(cls, pdf: FPDF) -> str:
        """
        Tìm và nạp font Unicode hỗ trợ tiếng Việt trên Linux/Docker hoặc Windows.
        Trả về tên font được kích hoạt thành công.
        """
        possible_font_paths = [
            # Linux / Docker container paths
            ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVu"),
            ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", "Liberation"),
            # Windows paths
            ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf", "ArialCustom"),
            ("C:/Windows/Fonts/tahoma.ttf", "C:/Windows/Fonts/tahomabd.ttf", "TahomaCustom"),
        ]

        for reg_path, bold_path, font_family in possible_font_paths:
            if os.path.exists(reg_path):
                try:
                    pdf.add_font(font_family, "", reg_path)
                    if os.path.exists(bold_path):
                        pdf.add_font(font_family, "B", bold_path)
                    else:
                        pdf.add_font(font_family, "B", reg_path)
                    return font_family
                except Exception:
                    continue

        return "Helvetica"

    @classmethod
    def _sanitize_text(cls, text: str, font_name: str) -> str:
        """
        Khử dấu tiếng Việt nếu buộc phải fallback về font Helvetica cơ bản
        để tránh lỗi mã hóa ký tự Latin-1 của PDF chuẩn.
        """
        if font_name in ("Helvetica", "Times", "Courier"):
            text = unicodedata.normalize("NFKD", text)
            return "".join([c for c in text if not unicodedata.combining(c)]).encode("ascii", "ignore").decode("ascii")
        return text

    @classmethod
    def generate_pdf(
        cls,
        exam_title: str,
        subject: str,
        exam_code: str,
        questions: List[Dict[str, Any]],
        university: str = "ĐẠI HỌC QUỐC GIA",
        faculty: str = "Khoa Kinh tế & Quản trị",
        duration_minutes: int = 60,
        include_answer_key: bool = True,
        include_explanation: bool = False,
        include_omr_sheet: bool = False
    ) -> bytes:
        pdf = FPDF(orientation="P", unit="mm", format="A4")
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.set_margins(left=18, top=18, right=18)
        pdf.add_page()

        font_name = cls._setup_fonts(pdf)

        # 1. Header Đề thi
        pdf.set_font(font_name, "B", 10)
        # Cột trái
        pdf.cell(90, 5, cls._sanitize_text(university.upper(), font_name), ln=0, align="L")
        # Cột phải
        pdf.cell(85, 5, cls._sanitize_text("ĐỀ THI KẾT THÚC HỌC PHẦN", font_name), ln=1, align="R")

        pdf.set_font(font_name, "", 9)
        pdf.cell(90, 5, cls._sanitize_text(faculty.upper(), font_name), ln=0, align="L")
        pdf.cell(85, 5, cls._sanitize_text(f"Môn thi: {subject}", font_name), ln=1, align="R")

        pdf.cell(90, 5, "--------------------------------", ln=0, align="L")
        pdf.set_font(font_name, "B", 9)
        pdf.cell(85, 5, cls._sanitize_text(f"Mã đề: {exam_code} | Thời gian: {duration_minutes} phút", font_name), ln=1, align="R")

        pdf.set_font(font_name, "I", 8)
        pdf.cell(175, 4, cls._sanitize_text("(Thí sinh không được sử dụng tài liệu)", font_name), ln=1, align="R")

        pdf.ln(4)

        # 2. Tiêu đề chính giữa
        pdf.set_font(font_name, "B", 13)
        pdf.cell(175, 8, cls._sanitize_text(exam_title.upper(), font_name), ln=1, align="C")
        pdf.line(18, pdf.get_y(), 193, pdf.get_y())
        pdf.ln(5)

        # 3. Danh sách câu hỏi
        answer_keys = []
        for idx, q in enumerate(questions, 1):
            q_text = q.get("question") or q.get("question_text") or ""
            options = q.get("options", [])
            correct_id = q.get("correct_answer_id") or q.get("correctAnswerId")
            
            # Ghi câu hỏi
            pdf.set_font(font_name, "B", 10)
            prefix = cls._sanitize_text(f"Câu {idx}: ", font_name)
            pdf.write(5, prefix)
            pdf.set_font(font_name, "", 10)
            pdf.write(5, cls._sanitize_text(q_text, font_name))
            pdf.ln(6)

            # Ghi các lựa chọn
            for opt in options:
                opt_label = opt.get("label", "A")
                opt_text = opt.get("text", "")
                pdf.set_x(25)
                pdf.cell(165, 5, cls._sanitize_text(f"{opt_label}. {opt_text}", font_name), ln=1)

            pdf.ln(3)

            # Lưu thông tin đáp án đúng
            correct_opt = next((o for o in options if o.get("id") == correct_id), None)
            correct_label = correct_opt.get("label") if correct_opt else q.get("correctLabel", "A")
            answer_keys.append({
                "idx": idx,
                "label": correct_label,
                "explanation": q.get("explanation") or ""
            })

        # 4. Phụ lục: Bảng đáp án chuẩn
        if include_answer_key and answer_keys:
            pdf.add_page()
            pdf.set_font(font_name, "B", 13)
            pdf.cell(175, 8, cls._sanitize_text(f"BẢNG ĐÁP ÁN CHUẨN - MÃ ĐỀ {exam_code}", font_name), ln=1, align="C")
            pdf.ln(4)

            # Bảng ma trận 5 cột
            col_width = 35
            pdf.set_font(font_name, "B", 9)
            pdf.set_fill_color(230, 235, 245)
            for _ in range(5):
                pdf.cell(col_width, 7, cls._sanitize_text("Câu - ĐA", font_name), border=1, align="C", fill=True)
            pdf.ln(7)

            pdf.set_font(font_name, "", 9)
            for i in range(0, len(answer_keys), 5):
                chunk = answer_keys[i:i+5]
                for item in chunk:
                    text_cell = cls._sanitize_text(f"Câu {item['idx']}: {item['label']}", font_name)
                    pdf.cell(col_width, 6, text_cell, border=1, align="C")
                # Điền ô trống nếu dòng cuối không đủ 5 cột
                if len(chunk) < 5:
                    for _ in range(5 - len(chunk)):
                        pdf.cell(col_width, 6, "", border=1)
                pdf.ln(6)

            # Hướng dẫn giải chi tiết
            if include_explanation:
                pdf.ln(8)
                pdf.set_font(font_name, "B", 11)
                pdf.cell(175, 6, cls._sanitize_text("HƯỚNG DẪN GIẢI CHI TIẾT", font_name), ln=1)
                pdf.set_font(font_name, "", 9)
                for item in answer_keys:
                    if item.get("explanation"):
                        exp_str = cls._sanitize_text(f"Câu {item['idx']} (Đáp án {item['label']}): {item['explanation']}", font_name)
                        pdf.multi_cell(175, 5, exp_str)
                        pdf.ln(2)

        # 5. (Tùy chọn) Phiếu tô trắc nghiệm OMR Bubble Sheet
        if include_omr_sheet:
            pdf.add_page()
            pdf.set_font(font_name, "B", 13)
            pdf.cell(175, 8, cls._sanitize_text("PHIẾU TRẢ LỜI TRẮC NGHIỆM CHUẨN OMR", font_name), ln=1, align="C")
            pdf.ln(2)

            # Khung thông tin thí sinh
            pdf.rect(18, pdf.get_y(), 174, 28)
            curr_y = pdf.get_y() + 2
            pdf.set_xy(20, curr_y)
            pdf.set_font(font_name, "", 9)
            pdf.cell(85, 5, cls._sanitize_text("Họ và tên thí sinh: .....................................................", font_name), ln=0)
            pdf.cell(85, 5, cls._sanitize_text("Số báo danh: .............................", font_name), ln=1)
            
            pdf.set_x(20)
            pdf.cell(85, 5, cls._sanitize_text("Ngày sinh: .................... Lớp: .................................", font_name), ln=0)
            pdf.cell(85, 5, cls._sanitize_text(f"Mã đề thi: {exam_code}", font_name), ln=1)

            pdf.set_x(20)
            pdf.cell(85, 5, cls._sanitize_text(f"Môn thi: {subject}", font_name), ln=0)
            pdf.cell(85, 5, cls._sanitize_text("Chữ ký giám thị: .....................", font_name), ln=1)

            pdf.set_y(curr_y + 30)

            # Lưới tô tròn trắc nghiệm (chia 2 cột lớn, mỗi cột 20-30 câu)
            pdf.set_font(font_name, "B", 9)
            pdf.cell(175, 6, cls._sanitize_text("PHẦN TÔ ĐÁP ÁN (Dùng bút chì 2B tô kín vòng tròn lựa chọn)", font_name), ln=1, align="C")
            pdf.ln(3)

            start_y = pdf.get_y()
            num_questions = min(len(questions), 60)
            half = (num_questions + 1) // 2

            # Cột trái (1 đến half)
            for idx in range(1, half + 1):
                pdf.set_font(font_name, "", 8)
                pdf.set_xy(25, start_y + (idx - 1) * 6)
                pdf.cell(15, 5, f"{idx:02d}.", ln=0)
                for opt_char in ["A", "B", "C", "D"]:
                    pdf.cell(8, 5, f"({opt_char})", ln=0, align="C")

            # Cột phải (half + 1 đến num_questions)
            for idx in range(half + 1, num_questions + 1):
                pdf.set_font(font_name, "", 8)
                pdf.set_xy(110, start_y + (idx - half - 1) * 6)
                pdf.cell(15, 5, f"{idx:02d}.", ln=0)
                for opt_char in ["A", "B", "C", "D"]:
                    pdf.cell(8, 5, f"({opt_char})", ln=0, align="C")

        out = pdf.output()
        if isinstance(out, (bytes, bytearray)):
            return bytes(out)
        return str(out).encode("latin-1")
