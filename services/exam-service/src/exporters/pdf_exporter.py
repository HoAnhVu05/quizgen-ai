import os
import io
import unicodedata
from typing import List, Dict, Any, Optional
from fpdf import FPDF

class PDFExamExporter:
    """
    Động cơ kết xuất đề thi PDF chất lượng cao dùng fpdf2:
    - Định dạng thể thức chuẩn khảo thí đại học
    - Hỗ trợ font Unicode tiếng Việt (DejaVu / Arial) với cơ chế fallback thông minh
    - Bảng ma trận đáp án chuẩn
    - Tự động vẽ Phiếu trả lời trắc nghiệm OMR 50 câu chuẩn thi đại học
    """

    @classmethod
    def _setup_fonts(cls, pdf: FPDF) -> str:
        """
        Tìm và nạp font Unicode hỗ trợ tiếng Việt trên Linux/Docker hoặc Windows.
        Trả về tên font được kích hoạt thành công.
        """
        possible_font_paths = [
            # Linux / Docker container paths
            (
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf",
                "DejaVu"
            ),
            (
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf",
                "Liberation"
            ),
            # Windows paths
            (
                "C:/Windows/Fonts/arial.ttf",
                "C:/Windows/Fonts/arialbd.ttf",
                "C:/Windows/Fonts/ariali.ttf",
                "C:/Windows/Fonts/arialbi.ttf",
                "ArialCustom"
            ),
            (
                "C:/Windows/Fonts/tahoma.ttf",
                "C:/Windows/Fonts/tahomabd.ttf",
                "C:/Windows/Fonts/tahoma.ttf",
                "C:/Windows/Fonts/tahomabd.ttf",
                "TahomaCustom"
            ),
        ]

        for reg_path, bold_path, italic_path, bi_path, font_family in possible_font_paths:
            if os.path.exists(reg_path):
                try:
                    pdf.add_font(font_family, "", reg_path)
                    b_file = bold_path if os.path.exists(bold_path) else reg_path
                    i_file = italic_path if os.path.exists(italic_path) else reg_path
                    bi_file = bi_path if os.path.exists(bi_path) else b_file

                    pdf.add_font(font_family, "B", b_file)
                    pdf.add_font(font_family, "I", i_file)
                    pdf.add_font(font_family, "BI", bi_file)
                    return font_family
                except Exception:
                    continue

        return "Helvetica"

    @classmethod
    def _set_font_safe(cls, pdf: FPDF, font_name: str, style: str, size: float):
        """Đặt font an toàn với cơ chế fallback tự động nếu thiếu kiểu chữ."""
        try:
            pdf.set_font(font_name, style, size)
        except Exception:
            try:
                pdf.set_font(font_name, "", size)
            except Exception:
                fallback_style = style if style in ("", "B", "I") else ""
                pdf.set_font("Helvetica", fallback_style, size)

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
    def draw_omr_50_sheet(
        cls,
        pdf: FPDF,
        font_name: str,
        university: str = "ĐẠI HỌC QUỐC GIA",
        faculty: str = "Khoa Kinh tế & Quản trị",
        subject: str = "Kinh tế vi mô",
        exam_code: str = "101"
    ):
        """
        Vẽ Phiếu trả lời trắc nghiệm OMR 50 câu chuẩn khảo thí thi đại học.
        Bao gồm:
        - 4 điểm định vị quang học (Corner Registration Marks)
        - Khung thông tin thí sinh & chữ ký giám thị
        - Khung Số Báo Danh (SBD 6 cột x 10 hàng ô tròn)
        - Khung Mã Đề Thi (3 cột x 10 hàng ô tròn)
        - Khung hướng dẫn tô chì 2B
        - Lưới 50 câu trắc nghiệm (chia 2 cột lớn, 25 câu/cột, 4 ô tròn A, B, C, D)
        """
        pdf.add_page()

        # 1. Điểm định vị góc (Corner Timing / Registration Marks) cho máy quét OMR
        pdf.set_fill_color(0, 0, 0)
        pdf.rect(8, 8, 8, 3.5, "F")    # Top-Left
        pdf.rect(194, 8, 8, 3.5, "F")  # Top-Right
        pdf.rect(8, 285, 8, 3.5, "F")  # Bottom-Left
        pdf.rect(194, 285, 8, 3.5, "F")# Bottom-Right

        # 2. Tiêu đề phiếu
        cls._set_font_safe(pdf, font_name, "B", 10)
        pdf.set_xy(12, 13)
        pdf.cell(108, 4.5, cls._sanitize_text(university.upper(), font_name), ln=0, align="L")
        cls._set_font_safe(pdf, font_name, "", 8)
        pdf.cell(78, 4.5, cls._sanitize_text("HỘI ĐỒNG KHẢO THÍ & BẢO ĐẢM CHẤT LƯỢNG", font_name), ln=1, align="R")

        cls._set_font_safe(pdf, font_name, "B", 13)
        pdf.cell(186, 6.5, cls._sanitize_text("PHIẾU TRẢ LỜI TRẮC NGHIỆM", font_name), ln=1, align="C")
        cls._set_font_safe(pdf, font_name, "I", 8)
        pdf.cell(186, 4, cls._sanitize_text("CHUẨN 50 CÂU THI ĐẠI HỌC VÀ KHẢO THÍ CHUẨN HÓA", font_name), ln=1, align="C")

        # 3. Khung thông tin cá nhân & Số báo danh & Mã đề (y = 29 đến 80)
        # 3.1 Khung thông tin thí sinh (Bên trái: x=12, y=29, w=112, h=51)
        pdf.set_draw_color(60, 60, 60)
        pdf.set_line_width(0.3)
        pdf.rect(12, 29, 112, 51)
        
        pdf.set_xy(14, 30.5)
        cls._set_font_safe(pdf, font_name, "B", 8.5)
        pdf.cell(108, 4, cls._sanitize_text("THÔNG TIN THÍ SINH (Ghi bằng bút mực):", font_name), ln=1)

        cls._set_font_safe(pdf, font_name, "", 8)
        fields = [
            ("Họ và tên thí sinh:", "................................................................................"),
            ("Ngày sinh:", "....../....../...........     Giới tính:   Nam [  ]   Nữ [  ]"),
            ("Lớp / Phòng thi:", "....................................    Số bàn: ..................."),
            ("Môn thi:", cls._sanitize_text(f"{subject} ({faculty})", font_name)),
            ("Chữ ký Giám thị 1:", ".........................   Chữ ký Giám thị 2: .........................")
        ]
        curr_y = 35.5
        for label, val in fields:
            pdf.set_xy(14, curr_y)
            cls._set_font_safe(pdf, font_name, "B", 7.8)
            pdf.cell(32, 4, cls._sanitize_text(label, font_name), ln=0)
            cls._set_font_safe(pdf, font_name, "", 7.8)
            pdf.cell(76, 4, val, ln=1)
            curr_y += 5.8

        # 3.2 Khung Số báo danh (SBD - 6 chữ số: x=128, y=29, w=42, h=51)
        pdf.rect(128, 29, 42, 51)
        pdf.set_xy(128, 29.5)
        cls._set_font_safe(pdf, font_name, "B", 8)
        pdf.cell(42, 4, cls._sanitize_text("SỐ BÁO DANH", font_name), ln=1, align="C")

        # 6 ô viết tay số báo danh
        sbd_col_w = 42.0 / 6.0
        for c in range(6):
            pdf.rect(128 + c * sbd_col_w, 34, sbd_col_w, 5.5)

        # Lưới 6 cột x 10 hàng ô tròn tô số 0-9
        cls._set_font_safe(pdf, font_name, "", 6.5)
        for r in range(10):
            row_y = 41.5 + r * 3.7
            for c in range(6):
                cx = 128 + c * sbd_col_w + sbd_col_w / 2.0
                pdf.circle(cx, row_y, 1.5, style="D")
                pdf.set_xy(cx - 1.5, row_y - 1.5)
                pdf.cell(3.0, 3.0, str(r), align="C")

        # 3.3 Khung Mã đề thi (3 chữ số: x=173, y=29, w=25, h=51)
        pdf.rect(173, 29, 25, 51)
        pdf.set_xy(173, 29.5)
        cls._set_font_safe(pdf, font_name, "B", 8)
        pdf.cell(25, 4, cls._sanitize_text("MÃ ĐỀ", font_name), ln=1, align="C")

        # 3 ô viết tay mã đề
        code_col_w = 25.0 / 3.0
        code_str = str(exam_code).zfill(3)[-3:]
        for c in range(3):
            pdf.rect(173 + c * code_col_w, 34, code_col_w, 5.5)
            # In sẵn số mã đề vào ô viết tay
            pdf.set_xy(173 + c * code_col_w, 34)
            cls._set_font_safe(pdf, font_name, "B", 8)
            pdf.cell(code_col_w, 5.5, code_str[c], align="C")

        # Lưới 3 cột x 10 hàng ô tròn tô số mã đề
        cls._set_font_safe(pdf, font_name, "", 6.5)
        for r in range(10):
            row_y = 41.5 + r * 3.7
            for c in range(3):
                cx = 173 + c * code_col_w + code_col_w / 2.0
                is_selected = (str(r) == code_str[c])
                if is_selected:
                    pdf.set_fill_color(220, 225, 235)
                    pdf.circle(cx, row_y, 1.5, style="FD")
                else:
                    pdf.circle(cx, row_y, 1.5, style="D")
                pdf.set_xy(cx - 1.5, row_y - 1.5)
                pdf.cell(3.0, 3.0, str(r), align="C")

        # 4. Khung hướng dẫn tô chì 2B (y = 82 đến 91)
        pdf.set_draw_color(100, 100, 100)
        pdf.rect(12, 82, 186, 9)
        pdf.set_xy(14, 83)
        cls._set_font_safe(pdf, font_name, "B", 7.5)
        pdf.cell(182, 3.5, cls._sanitize_text("HƯỚNG DẪN TÔ ĐÁP ÁN: Dùng bút chì 2B tô kín vòng tròn đáp án được chọn. Tẩy sạch khi muốn đổi đáp án.", font_name), ln=1)

        pdf.set_xy(14, 86.8)
        cls._set_font_safe(pdf, font_name, "", 7)
        pdf.cell(182, 3.5, cls._sanitize_text("Ví dụ:   [  ĐÚNG: ( ● )  ]     |     [  SAI: ( X )    ( / )    ( V )    ( - )  ]", font_name), ln=1)

        # 5. Phần 50 câu trắc nghiệm (y = 93 đến 278)
        # Chia làm 2 cột lớn: Cột 1 (Câu 01 - 25), Cột 2 (Câu 26 - 50)
        col_w = 90.0
        cols_config = [
            (12, 1, 25),   # Left column: x=12, câu 1->25
            (108, 26, 50)  # Right column: x=108, câu 26->50
        ]

        for col_x, start_q, end_q in cols_config:
            # Khung bao cột
            pdf.rect(col_x, 93, col_w, 185)

            # Header cột
            pdf.set_fill_color(230, 238, 250)
            pdf.rect(col_x, 93, col_w, 6, "F")
            pdf.line(col_x, 99, col_x + col_w, 99)

            cls._set_font_safe(pdf, font_name, "B", 8)
            pdf.set_xy(col_x + 2, 93.5)
            pdf.cell(16, 5, "CÂU", align="C")
            pdf.cell(18, 5, "A", align="C")
            pdf.cell(18, 5, "B", align="C")
            pdf.cell(18, 5, "C", align="C")
            pdf.cell(18, 5, "D", align="C")

            # 25 dòng câu hỏi
            row_h = 7.1
            for q_idx in range(start_q, end_q + 1):
                i = q_idx - start_q
                row_y = 99 + i * row_h

                # Nền xen kẽ mỗi 5 câu giúp thí sinh không tô lệch hàng
                if (i // 5) % 2 == 1:
                    pdf.set_fill_color(248, 250, 253)
                    pdf.rect(col_x + 0.3, row_y, col_w - 0.6, row_h, "F")

                pdf.line(col_x, row_y + row_h, col_x + col_w, row_y + row_h)

                # Số thứ tự câu
                cls._set_font_safe(pdf, font_name, "B", 8)
                pdf.set_xy(col_x + 2, row_y + 1)
                pdf.cell(16, 5, f"{q_idx:02d}.", align="C")

                # 4 vòng tròn bong bóng OMR: A, B, C, D
                bubble_centers = [
                    col_x + 27,
                    col_x + 45,
                    col_x + 63,
                    col_x + 81
                ]
                bubble_r = 2.4
                labels = ["A", "B", "C", "D"]

                cls._set_font_safe(pdf, font_name, "", 7)
                for opt_idx in range(4):
                    bx = bubble_centers[opt_idx]
                    by = row_y + 3.5
                    pdf.set_draw_color(50, 50, 50)
                    pdf.set_line_width(0.25)
                    pdf.circle(bx, by, bubble_r, style="D")
                    pdf.set_xy(bx - bubble_r, by - bubble_r)
                    pdf.cell(bubble_r * 2.0, bubble_r * 2.0, labels[opt_idx], align="C")

        # 6. Chân trang OMR
        cls._set_font_safe(pdf, font_name, "I", 7)
        pdf.set_xy(12, 281)
        pdf.cell(186, 4, cls._sanitize_text(f"Mã nhận dạng OMR: *OMR-50-VN-{exam_code}* | Thí sinh giữ phiếu phẳng, không làm rách hoặc vấy bẩn vào các ô quang học.", font_name), ln=1, align="C")

    @classmethod
    def generate_omr_50_pdf(
        cls,
        university: str = "ĐẠI HỌC QUỐC GIA",
        faculty: str = "Khoa Kinh tế & Quản trị",
        subject: str = "Kinh tế vi mô",
        exam_code: str = "101"
    ) -> bytes:
        """Sinh riêng tệp PDF 1 trang chỉ gồm duy nhất Phiếu trả lời trắc nghiệm OMR 50 câu."""
        pdf = FPDF(orientation="P", unit="mm", format="A4")
        pdf.set_auto_page_break(auto=False)
        pdf.set_margins(left=10, top=10, right=10)
        font_name = cls._setup_fonts(pdf)
        cls.draw_omr_50_sheet(pdf, font_name, university, faculty, subject, exam_code)
        out = pdf.output()
        if isinstance(out, (bytes, bytearray)):
            return bytes(out)
        return str(out).encode("latin-1")

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
        cls._set_font_safe(pdf, font_name, "B", 10)
        # Cột trái
        pdf.cell(90, 5, cls._sanitize_text(university.upper(), font_name), ln=0, align="L")
        # Cột phải
        pdf.cell(85, 5, cls._sanitize_text("ĐỀ THI KẾT THÚC HỌC PHẦN", font_name), ln=1, align="R")

        cls._set_font_safe(pdf, font_name, "", 9)
        pdf.cell(90, 5, cls._sanitize_text(faculty.upper(), font_name), ln=0, align="L")
        pdf.cell(85, 5, cls._sanitize_text(f"Môn thi: {subject}", font_name), ln=1, align="R")

        pdf.cell(90, 5, "--------------------------------", ln=0, align="L")
        cls._set_font_safe(pdf, font_name, "B", 9)
        pdf.cell(85, 5, cls._sanitize_text(f"Mã đề: {exam_code} | Thời gian: {duration_minutes} phút", font_name), ln=1, align="R")

        cls._set_font_safe(pdf, font_name, "I", 8)
        pdf.cell(175, 4, cls._sanitize_text("(Thí sinh không được sử dụng tài liệu)", font_name), ln=1, align="R")

        pdf.ln(4)

        # 2. Tiêu đề chính giữa
        cls._set_font_safe(pdf, font_name, "B", 13)
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
            cls._set_font_safe(pdf, font_name, "B", 10)
            prefix = cls._sanitize_text(f"Câu {idx}: ", font_name)
            pdf.write(5, prefix)
            cls._set_font_safe(pdf, font_name, "", 10)
            pdf.write(5, cls._sanitize_text(q_text, font_name))
            pdf.ln(6)

            # Ghi các lựa chọn
            for opt in options:
                opt_label = opt.get("label", "A")
                opt_text = opt.get("text", "")
                pdf.set_x(25)
                cls._set_font_safe(pdf, font_name, "", 9.5)
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
            cls._set_font_safe(pdf, font_name, "B", 13)
            pdf.cell(175, 8, cls._sanitize_text(f"BẢNG ĐÁP ÁN CHUẨN - MÃ ĐỀ {exam_code}", font_name), ln=1, align="C")
            pdf.ln(4)

            # Bảng ma trận 5 cột
            col_width = 35
            cls._set_font_safe(pdf, font_name, "B", 9)
            pdf.set_fill_color(230, 235, 245)
            for _ in range(5):
                pdf.cell(col_width, 7, cls._sanitize_text("Câu - ĐA", font_name), border=1, align="C", fill=True)
            pdf.ln(7)

            cls._set_font_safe(pdf, font_name, "", 9)
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
                cls._set_font_safe(pdf, font_name, "B", 11)
                pdf.cell(175, 6, cls._sanitize_text("HƯỚNG DẪN GIẢI CHI TIẾT", font_name), ln=1)
                cls._set_font_safe(pdf, font_name, "", 9)
                for item in answer_keys:
                    if item.get("explanation"):
                        exp_str = cls._sanitize_text(f"Câu {item['idx']} (Đáp án {item['label']}): {item['explanation']}", font_name)
                        pdf.multi_cell(175, 5, exp_str)
                        pdf.ln(2)

        # 5. Tự động vẽ Phiếu trả lời trắc nghiệm OMR 50 câu chuẩn thi đại học
        if include_omr_sheet:
            cls.draw_omr_50_sheet(
                pdf=pdf,
                font_name=font_name,
                university=university,
                faculty=faculty,
                subject=subject,
                exam_code=exam_code
            )

        out = pdf.output()
        if isinstance(out, (bytes, bytearray)):
            return bytes(out)
        return str(out).encode("latin-1")
