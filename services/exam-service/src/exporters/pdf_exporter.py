from __future__ import annotations
import os
import io
import re
import base64
import urllib.request
import unicodedata
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image as PILImage
from fpdf import FPDF

# Import ReportLab với cơ chế kiểm tra khả dụng an toàn
try:
    import reportlab
    from reportlab.lib.pagesizes import A4 as RL_A4
    from reportlab.lib.units import mm as RL_MM
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Image as RLImage,
        Table, TableStyle, PageBreak, KeepTogether, HRFlowable
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors as rl_colors
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    import pypdf
    REPORTLAB_AVAILABLE = True
except Exception:
    REPORTLAB_AVAILABLE = False
    rl_canvas = None
    RL_A4 = None
    RL_MM = None


def _resolve_image_stream(img_source: Any) -> Optional[Tuple[io.BytesIO, float, float]]:
    """
    Nhận diện và nạp dữ liệu ảnh từ URL, Base64 data URI hoặc file path cục bộ.
    Trả về (BytesIO stream, original_width_px, original_height_px) hoặc None nếu lỗi.
    """
    if not img_source:
        return None

    raw_bytes: Optional[bytes] = None

    try:
        # 1. Nếu là bytes hoặc BytesIO
        if isinstance(img_source, (bytes, bytearray)):
            raw_bytes = bytes(img_source)
        elif isinstance(img_source, io.BytesIO):
            raw_bytes = img_source.getvalue()
        elif isinstance(img_source, str):
            img_source = img_source.strip()
            if not img_source:
                return None

            # 2. Base64 Data URI (e.g. data:image/png;base64,...)
            if img_source.startswith("data:image/") and ";base64," in img_source:
                b64_part = img_source.split(";base64,")[1]
                raw_bytes = base64.b64decode(b64_part)
            # 3. Chuỗi Base64 dài thuần
            elif len(img_source) > 200 and not img_source.startswith("http") and not os.path.exists(img_source):
                try:
                    raw_bytes = base64.b64decode(img_source)
                except Exception:
                    pass

            # 4. Web URL (http/https)
            if not raw_bytes and (img_source.startswith("http://") or img_source.startswith("https://")):
                try:
                    req = urllib.request.Request(
                        img_source,
                        headers={"User-Agent": "QuizGenAI-PDFExporter/1.0"}
                    )
                    with urllib.request.urlopen(req, timeout=6) as resp:
                        raw_bytes = resp.read()
                except Exception:
                    pass

            # 5. File path cục bộ
            if not raw_bytes:
                repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
                candidates = [
                    img_source,
                    os.path.abspath(img_source),
                    os.path.join(repo_root, img_source.lstrip("/\\")),
                    os.path.join(repo_root, "services", "document-service", img_source.lstrip("/\\")),
                    os.path.join(repo_root, "services", "document-service", "data", img_source.lstrip("/\\")),
                    os.path.join(repo_root, "services", "document-service", "uploads", img_source.lstrip("/\\")),
                    os.path.join(repo_root, "uploads", img_source.lstrip("/\\")),
                    os.path.join(os.getcwd(), img_source.lstrip("/\\")),
                ]
                for p in candidates:
                    if os.path.isfile(p):
                        try:
                            with open(p, "rb") as f:
                                raw_bytes = f.read()
                            break
                        except Exception:
                            continue

        if not raw_bytes:
            return None

        pil_img = PILImage.open(io.BytesIO(raw_bytes))
        w_px, h_px = pil_img.size

        buf = io.BytesIO()
        if pil_img.format not in ("PNG", "JPEG", "JPG"):
            if pil_img.mode in ("RGBA", "LA", "P"):
                pil_img.save(buf, format="PNG")
            else:
                pil_img.convert("RGB").save(buf, format="JPEG", quality=95)
            buf.seek(0)
        else:
            buf = io.BytesIO(raw_bytes)

        return buf, float(w_px), float(h_px)
    except Exception:
        return None


# ==============================================================================
# REPORTLAB ENGINE: XUẤT ĐỀ THI & PHIẾU OMR 50 CÂU VECTOR CHUẨN A4
# ==============================================================================
class ReportLabExamExporter:
    _font_registered = False
    _active_font = "Helvetica"

    @classmethod
    def setup_fonts(cls) -> str:
        """Đăng ký font Unicode hỗ trợ tiếng Việt trong ReportLab."""
        if cls._font_registered:
            return cls._active_font

        font_candidates = [
            ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/ariali.ttf", "C:/Windows/Fonts/arialbi.ttf", "ArialUnicode"),
            ("C:/Windows/Fonts/tahoma.ttf", "C:/Windows/Fonts/tahomabd.ttf", None, None, "TahomaUnicode"),
            ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf", "DejaVuUnicode"),
            ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf", "LiberationUnicode")
        ]

        for reg, bold, italic, bolditalic, name in font_candidates:
            if os.path.exists(reg):
                try:
                    pdfmetrics.registerFont(TTFont(name, reg))
                    b_file = bold if bold and os.path.exists(bold) else reg
                    i_file = italic if italic and os.path.exists(italic) else reg
                    bi_file = bolditalic if bolditalic and os.path.exists(bolditalic) else b_file

                    pdfmetrics.registerFont(TTFont(f"{name}-Bold", b_file))
                    pdfmetrics.registerFont(TTFont(f"{name}-Italic", i_file))
                    pdfmetrics.registerFont(TTFont(f"{name}-BoldItalic", bi_file))
                    cls._font_registered = True
                    cls._active_font = name
                    return name
                except Exception:
                    continue

        cls._active_font = "Helvetica"
        return "Helvetica"

    @classmethod
    def draw_omr_50_canvas(
        cls,
        c: rl_canvas.Canvas,
        font_name: str,
        university: str = "TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM",
        faculty: str = "Khoa Công nghệ Thông tin",
        subject: str = "Môn học",
        exam_code: str = "101"
    ):
        """
        Vẽ Phiếu trả lời trắc nghiệm OMR 50 câu chuẩn khảo thí thi đại học bằng ReportLab Canvas.
        Khổ A4 (210mm x 297mm). Sử dụng hệ quy chiếu top-down chuẩn khảo thí.
        """
        mm = RL_MM

        def yt(y_mm: float) -> float:
            """Chuyển đổi tọa độ Y từ trên xuống thành tọa độ ReportLab Canvas từ dưới lên."""
            return (297.0 - y_mm) * mm

        # 1. 4 Điểm định vị quang học (Corner Registration Marks)
        c.setFillColor(rl_colors.black)
        c.rect(8 * mm, yt(8 + 3.5), 8 * mm, 3.5 * mm, fill=1, stroke=0)       # Top-Left
        c.rect(194 * mm, yt(8 + 3.5), 8 * mm, 3.5 * mm, fill=1, stroke=0)     # Top-Right
        c.rect(8 * mm, yt(285 + 3.5), 8 * mm, 3.5 * mm, fill=1, stroke=0)     # Bottom-Left
        c.rect(194 * mm, yt(285 + 3.5), 8 * mm, 3.5 * mm, fill=1, stroke=0)   # Bottom-Right

        # 2. Tiêu đề phiếu
        bold_font = f"{font_name}-Bold" if font_name != "Helvetica" else "Helvetica-Bold"
        italic_font = f"{font_name}-Italic" if font_name != "Helvetica" else "Helvetica-Oblique"

        c.setFont(bold_font, 10)
        c.drawString(12 * mm, yt(14), university.upper())
        c.setFont(font_name, 8)
        c.drawRightString(198 * mm, yt(14), "HỘI ĐỒNG KHẢO THÍ & BẢO ĐẢM CHẤT LƯỢNG")

        c.setFont(bold_font, 13)
        c.drawCentredString(105 * mm, yt(21), "PHIẾU TRẢ LỜI TRẮC NGHIỆM")
        c.setFont(italic_font, 8)
        c.drawCentredString(105 * mm, yt(25), "CHUẨN 50 CÂU THI ĐẠI HỌC VÀ KHẢO THÍ CHUẨN HÓA")

        # 3. Khung Thông tin cá nhân & Số báo danh & Mã đề (y = 29 đến 80 mm)
        c.setStrokeColor(rl_colors.HexColor("#334155"))
        c.setLineWidth(0.8)

        # 3.1 Khung Thông tin Thí sinh
        c.rect(12 * mm, yt(29 + 51), 112 * mm, 51 * mm, fill=0, stroke=1)
        c.setFont(bold_font, 8.5)
        c.drawString(14 * mm, yt(33.5), "THÔNG TIN THÍ SINH (Ghi bằng bút mực):")

        fields = [
            ("Họ và tên thí sinh:", "................................................................................"),
            ("Ngày sinh:", "....../....../...........     Giới tính:   Nam [  ]   Nữ [  ]"),
            ("Lớp / Phòng thi:", "....................................    Số bàn: ..................."),
            ("Môn thi:", f"{subject} ({faculty})"),
            ("Chữ ký Giám thị 1:", ".........................   Chữ ký Giám thị 2: .........................")
        ]
        curr_y = 39.0
        for lbl, val in fields:
            c.setFont(bold_font, 7.8)
            c.drawString(14 * mm, yt(curr_y), lbl)
            c.setFont(font_name, 7.8)
            c.drawString(45 * mm, yt(curr_y), val)
            curr_y += 6.0

        # 3.2 Khung Số báo danh (SBD 6 cột x 10 hàng)
        c.rect(128 * mm, yt(29 + 51), 42 * mm, 51 * mm, fill=0, stroke=1)
        c.setFont(bold_font, 8)
        c.drawCentredString(149 * mm, yt(33.5), "SỐ BÁO DANH")

        sbd_col_w = 42.0 / 6.0
        for col in range(6):
            c.rect((128 + col * sbd_col_w) * mm, yt(34 + 5.5), sbd_col_w * mm, 5.5 * mm, fill=0, stroke=1)

        c.setFont(font_name, 6.5)
        for r in range(10):
            row_y = 42.0 + r * 3.7
            for col in range(6):
                cx = (128 + col * sbd_col_w + sbd_col_w / 2.0) * mm
                cy = yt(row_y)
                c.circle(cx, cy, 1.5 * mm, fill=0, stroke=1)
                c.drawCentredString(cx, cy - 0.9 * mm, str(r))

        # 3.3 Khung Mã đề thi (3 cột x 10 hàng)
        c.rect(173 * mm, yt(29 + 51), 25 * mm, 51 * mm, fill=0, stroke=1)
        c.setFont(bold_font, 8)
        c.drawCentredString(185.5 * mm, yt(33.5), "MÃ ĐỀ")

        code_col_w = 25.0 / 3.0
        code_str = str(exam_code).zfill(3)[-3:]
        for col in range(3):
            c.rect((173 + col * code_col_w) * mm, yt(34 + 5.5), code_col_w * mm, 5.5 * mm, fill=0, stroke=1)
            c.setFont(bold_font, 8)
            c.drawCentredString((173 + col * code_col_w + code_col_w / 2.0) * mm, yt(38), code_str[col])

        c.setFont(font_name, 6.5)
        for r in range(10):
            row_y = 42.0 + r * 3.7
            for col in range(3):
                cx = (173 + col * code_col_w + code_col_w / 2.0) * mm
                cy = yt(row_y)
                is_selected = (str(r) == code_str[col])
                if is_selected:
                    c.setFillColor(rl_colors.HexColor("#cbd5e1"))
                    c.circle(cx, cy, 1.5 * mm, fill=1, stroke=1)
                    c.setFillColor(rl_colors.black)
                else:
                    c.circle(cx, cy, 1.5 * mm, fill=0, stroke=1)
                c.drawCentredString(cx, cy - 0.9 * mm, str(r))

        # 4. Khung hướng dẫn tô chì 2B (y = 82 đến 91 mm)
        c.rect(12 * mm, yt(82 + 9), 186 * mm, 9 * mm, fill=0, stroke=1)
        c.setFont(bold_font, 7.5)
        c.drawString(14 * mm, yt(85.5), "HƯỚNG DẪN TÔ ĐÁP ÁN: Dùng bút chì 2B tô kín vòng tròn đáp án được chọn. Tẩy sạch khi muốn đổi đáp án.")
        c.setFont(font_name, 7)
        c.drawString(14 * mm, yt(89.0), "Ví dụ:   [  ĐÚNG: ( ● )  ]     |     [  SAI: ( X )    ( / )    ( V )    ( - )  ]")

        # 5. Lưới 50 câu trắc nghiệm (y = 93 đến 278 mm) chia làm 2 cột
        col_w = 90.0
        cols_config = [
            (12, 1, 25),
            (108, 26, 50)
        ]
        labels = ["A", "B", "C", "D"]

        for col_x, start_q, end_q in cols_config:
            c.rect(col_x * mm, yt(93 + 185), col_w * mm, 185 * mm, fill=0, stroke=1)

            # Header cột
            c.setFillColor(rl_colors.HexColor("#e2e8f0"))
            c.rect(col_x * mm, yt(93 + 6), col_w * mm, 6 * mm, fill=1, stroke=1)
            c.setFillColor(rl_colors.black)

            c.setFont(bold_font, 8)
            c.drawCentredString((col_x + 10) * mm, yt(97), "CÂU")
            c.drawCentredString((col_x + 27) * mm, yt(97), "A")
            c.drawCentredString((col_x + 45) * mm, yt(97), "B")
            c.drawCentredString((col_x + 63) * mm, yt(97), "C")
            c.drawCentredString((col_x + 81) * mm, yt(97), "D")

            # 25 dòng câu hỏi
            row_h = 7.1
            for q_idx in range(start_q, end_q + 1):
                i = q_idx - start_q
                row_y = 99.0 + i * row_h

                if (i // 5) % 2 == 1:
                    c.setFillColor(rl_colors.HexColor("#f8fafc"))
                    c.rect(col_x * mm, yt(row_y + row_h), col_w * mm, row_h * mm, fill=1, stroke=0)
                    c.setFillColor(rl_colors.black)

                c.setStrokeColor(rl_colors.HexColor("#cbd5e1"))
                c.line(col_x * mm, yt(row_y + row_h), (col_x + col_w) * mm, yt(row_y + row_h))
                c.setStrokeColor(rl_colors.HexColor("#334155"))

                c.setFont(bold_font, 8)
                c.drawCentredString((col_x + 10) * mm, yt(row_y + 4.8), f"{q_idx:02d}.")

                bubble_x = [col_x + 27, col_x + 45, col_x + 63, col_x + 81]
                c.setFont(font_name, 7)
                for opt_idx in range(4):
                    bx = bubble_x[opt_idx] * mm
                    by = yt(row_y + 3.5)
                    c.circle(bx, by, 2.4 * mm, fill=0, stroke=1)
                    c.drawCentredString(bx, by - 0.9 * mm, labels[opt_idx])

        # 6. Chân trang OMR
        c.setFont(italic_font, 7)
        c.drawCentredString(
            105 * mm,
            yt(283),
            f"Mã nhận dạng OMR: *OMR-50-VN-{exam_code}* | Thí sinh giữ phiếu phẳng, không làm rách hoặc vấy bẩn vào các ô quang học."
        )

    @classmethod
    def generate_omr_50_pdf(
        cls,
        university: str = "TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM",
        faculty: str = "Khoa Công nghệ Thông tin",
        subject: str = "Môn học",
        exam_code: str = "101"
    ) -> bytes:
        """Sinh riêng tệp PDF 1 trang chỉ gồm duy nhất Phiếu trả lời trắc nghiệm OMR 50 câu bằng ReportLab."""
        font_name = cls.setup_fonts()
        buf = io.BytesIO()
        c = rl_canvas.Canvas(buf, pagesize=RL_A4)
        cls.draw_omr_50_canvas(c, font_name, university, faculty, subject, exam_code)
        c.showPage()
        c.save()
        buf.seek(0)
        return buf.getvalue()

    @classmethod
    def generate_pdf(
        cls,
        exam_title: str,
        subject: str,
        exam_code: str,
        questions: List[Dict[str, Any]],
        university: str = "TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM",
        faculty: str = "Khoa Công nghệ Thông tin",
        duration_minutes: int = 60,
        include_answer_key: bool = True,
        include_explanation: bool = False,
        include_omr_sheet: bool = False
    ) -> bytes:
        """
        Sinh tài liệu đề thi PDF hoàn chỉnh bằng ReportLab Platypus:
        - Tự động chèn hình vẽ sơ đồ vào ngay dưới nội dung câu hỏi
        - Căn chỉnh kích thước chuẩn lề in A4, giữ nguyên tỷ lệ khung hình
        - Bảng ma trận đáp án 5 cột
        - Ghép Phiếu trả lời trắc nghiệm OMR 50 câu chuẩn thi đại học
        """
        font_name = cls.setup_fonts()
        bold_font = f"{font_name}-Bold" if font_name != "Helvetica" else "Helvetica-Bold"
        italic_font = f"{font_name}-Italic" if font_name != "Helvetica" else "Helvetica-Oblique"

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=RL_A4,
            leftMargin=18 * RL_MM,
            rightMargin=18 * RL_MM,
            topMargin=15 * RL_MM,
            bottomMargin=15 * RL_MM
        )

        styles = getSampleStyleSheet()

        # Styles tùy biến
        style_u_left = ParagraphStyle(
            "ULeft",
            parent=styles["Normal"],
            fontName=bold_font,
            fontSize=10,
            leading=13,
            alignment=0,
            textColor=rl_colors.HexColor("#0f172a")
        )
        style_f_left = ParagraphStyle(
            "FLeft",
            parent=styles["Normal"],
            fontName=font_name,
            fontSize=9,
            leading=12,
            alignment=0,
            textColor=rl_colors.HexColor("#334155")
        )
        style_right_title = ParagraphStyle(
            "RTitle",
            parent=styles["Normal"],
            fontName=bold_font,
            fontSize=10,
            leading=13,
            alignment=2,
            textColor=rl_colors.HexColor("#0f172a")
        )
        style_right_sub = ParagraphStyle(
            "RSub",
            parent=styles["Normal"],
            fontName=font_name,
            fontSize=9,
            leading=12,
            alignment=2,
            textColor=rl_colors.HexColor("#334155")
        )
        style_right_note = ParagraphStyle(
            "RNote",
            parent=styles["Normal"],
            fontName=italic_font,
            fontSize=8,
            leading=11,
            alignment=2,
            textColor=rl_colors.HexColor("#64748b")
        )
        style_exam_title = ParagraphStyle(
            "ExamTitle",
            parent=styles["Normal"],
            fontName=bold_font,
            fontSize=13,
            leading=16,
            alignment=1,
            textColor=rl_colors.HexColor("#0f172a")
        )
        style_q = ParagraphStyle(
            "QuestionText",
            parent=styles["Normal"],
            fontName=font_name,
            fontSize=9.5,
            leading=13.5,
            spaceBefore=6,
            spaceAfter=3,
            textColor=rl_colors.HexColor("#0f172a")
        )
        style_caption = ParagraphStyle(
            "ImageCaption",
            parent=styles["Normal"],
            fontName=italic_font,
            fontSize=8.5,
            leading=11.5,
            alignment=1,
            textColor=rl_colors.HexColor("#64748b"),
            spaceBefore=2,
            spaceAfter=4
        )
        style_opt = ParagraphStyle(
            "OptionText",
            parent=styles["Normal"],
            fontName=font_name,
            fontSize=9,
            leading=12.5,
            leftIndent=15,
            spaceBefore=1,
            spaceAfter=1.5,
            textColor=rl_colors.HexColor("#1e293b")
        )

        story = []

        # 1. Header đối xứng 2 cột
        header_data = [
            [
                Paragraph(f"{university.upper()}<br/>{faculty.upper()}<br/>------------------------", style_u_left),
                Paragraph(f"ĐỀ THI KẾT THÚC HỌC PHẦN<br/>Môn thi: {subject}<br/>Mã đề: <b>{exam_code}</b> | Thời gian: {duration_minutes} phút<br/><i>(Thí sinh không được sử dụng tài liệu)</i>", style_right_title)
            ]
        ]
        # Khổ A4 rộng 595.28 pt, lề 36mm = 102pt -> chiều rộng bảng: 493 pt
        header_table = Table(header_data, colWidths=[250, 243])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 4 * RL_MM))

        # 2. Tiêu đề Đề thi
        story.append(Paragraph(exam_title.upper(), style_exam_title))
        story.append(Spacer(1, 2 * RL_MM))
        story.append(HRFlowable(width="100%", thickness=1, color=rl_colors.HexColor("#cbd5e1"), spaceBefore=1, spaceAfter=4 * RL_MM))

        # 3. Danh sách câu hỏi
        answer_keys = []
        MAX_IMG_W_PT = 380.0  # ~134 mm, chuẩn lề A4
        MAX_IMG_H_PT = 200.0  # ~70 mm

        for idx, q in enumerate(questions, 1):
            q_flowables = []
            q_text = q.get("question") or q.get("question_text") or ""
            q_flowables.append(Paragraph(f"<b>Câu {idx}:</b> {q_text}", style_q))

            # Tự động chèn hình vẽ sơ đồ vào ngay dưới nội dung câu hỏi
            img_ref = (
                q.get("imageUrl") or
                q.get("image_url") or
                q.get("imagePath") or
                q.get("image_path") or
                q.get("diagramUrl") or
                q.get("diagram_url") or
                q.get("image") or
                q.get("figureUrl") or
                q.get("figure_url")
            )
            if img_ref:
                res = _resolve_image_stream(img_ref)
                if res:
                    stream, orig_w, orig_h = res
                    aspect = orig_h / max(orig_w, 1.0)
                    calc_w = min(MAX_IMG_W_PT, orig_w)
                    calc_h = calc_w * aspect
                    if calc_h > MAX_IMG_H_PT:
                        calc_h = MAX_IMG_H_PT
                        calc_w = calc_h / aspect

                    try:
                        rl_img = RLImage(stream, width=calc_w, height=calc_h)
                        rl_img.hAlign = 'CENTER'
                        q_flowables.append(Spacer(1, 2 * RL_MM))
                        q_flowables.append(rl_img)

                        caption = (
                            q.get("imageCaption") or
                            q.get("image_caption") or
                            q.get("caption") or
                            q.get("diagramCaption") or
                            q.get("diagram_caption") or
                            ""
                        )
                        if caption:
                            q_flowables.append(Paragraph(f"({caption})", style_caption))
                        else:
                            q_flowables.append(Spacer(1, 2 * RL_MM))
                    except Exception:
                        pass

            # Các phương án lựa chọn
            options = q.get("options", [])
            for opt in options:
                opt_label = opt.get("label", "A")
                opt_text = opt.get("text", "")
                q_flowables.append(Paragraph(f"<b>{opt_label}.</b> {opt_text}", style_opt))

            q_flowables.append(Spacer(1, 2 * RL_MM))
            story.append(KeepTogether(q_flowables))

            # Thu thập thông tin đáp án đúng
            correct_id = q.get("correct_answer_id") or q.get("correctAnswerId")
            correct_opt = next((o for o in options if o.get("id") == correct_id), None)
            correct_label = correct_opt.get("label") if correct_opt else q.get("correctLabel", "A")
            answer_keys.append({
                "idx": idx,
                "label": correct_label,
                "explanation": q.get("explanation") or ""
            })

        # 4. Phụ lục: Bảng đáp án chuẩn
        if include_answer_key and answer_keys:
            story.append(PageBreak())
            story.append(Paragraph(f"BẢNG ĐÁP ÁN CHUẨN - MÃ ĐỀ {exam_code}", style_exam_title))
            story.append(Spacer(1, 4 * RL_MM))

            # Bảng ma trận 5 cột
            table_rows = [["Câu - ĐA"] * 5]
            curr_row = []
            for item in answer_keys:
                curr_row.append(f"Câu {item['idx']}: {item['label']}")
                if len(curr_row) == 5:
                    table_rows.append(curr_row)
                    curr_row = []
            if curr_row:
                while len(curr_row) < 5:
                    curr_row.append("")
                table_rows.append(curr_row)

            ans_table = Table(table_rows, colWidths=[98] * 5)
            ans_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), font_name),
                ('FONTSIZE', (0, 0), (-1, -1), 8.5),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BACKGROUND', (0, 0), (-1, 0), rl_colors.HexColor("#e2e8f0")),
                ('TEXTCOLOR', (0, 0), (-1, 0), rl_colors.HexColor("#0f172a")),
                ('FONTNAME', (0, 0), (-1, 0), bold_font),
                ('GRID', (0, 0), (-1, -1), 0.5, rl_colors.HexColor("#cbd5e1")),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [rl_colors.white, rl_colors.HexColor("#f8fafc")]),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(ans_table)

            if include_explanation:
                story.append(Spacer(1, 6 * RL_MM))
                story.append(Paragraph("HƯỚNG DẪN GIẢI CHI TIẾT & CĂN CỨ HỌC THUẬT", style_right_title))
                story.append(Spacer(1, 2 * RL_MM))
                for item in answer_keys:
                    if item.get("explanation"):
                        p_exp = Paragraph(f"<b>Câu {item['idx']} (Đáp án {item['label']}):</b> {item['explanation']}", style_q)
                        story.append(p_exp)

        doc.build(story)
        buf.seek(0)
        exam_bytes = buf.getvalue()

        # 5. Nếu có yêu cầu Phiếu OMR 50 câu: ghép phiếu OMR vào cuối PDF bằng pypdf
        if include_omr_sheet:
            try:
                omr_bytes = cls.generate_omr_50_pdf(
                    university=university,
                    faculty=faculty,
                    subject=subject,
                    exam_code=exam_code
                )
                writer = pypdf.PdfWriter()
                exam_reader = pypdf.PdfReader(io.BytesIO(exam_bytes))
                for page in exam_reader.pages:
                    writer.add_page(page)

                omr_reader = pypdf.PdfReader(io.BytesIO(omr_bytes))
                for page in omr_reader.pages:
                    writer.add_page(page)

                merged_buf = io.BytesIO()
                writer.write(merged_buf)
                merged_buf.seek(0)
                return merged_buf.getvalue()
            except Exception:
                return exam_bytes

        return exam_bytes


# ==============================================================================
# FPDF2 FALLBACK ENGINE (DUAL ENGINE ARCHITECTURE)
# ==============================================================================
class FPDFExamExporter:
    @classmethod
    def _setup_fonts(cls, pdf: FPDF) -> str:
        possible_font_paths = [
            ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf", "DejaVu"),
            ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf", "Liberation"),
            ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/ariali.ttf", "C:/Windows/Fonts/arialbi.ttf", "ArialCustom"),
            ("C:/Windows/Fonts/tahoma.ttf", "C:/Windows/Fonts/tahomabd.ttf", "C:/Windows/Fonts/tahoma.ttf", "C:/Windows/Fonts/tahomabd.ttf", "TahomaCustom"),
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
        if font_name in ("Helvetica", "Times", "Courier"):
            text = unicodedata.normalize("NFKD", text)
            return "".join([c for c in text if not unicodedata.combining(c)]).encode("ascii", "ignore").decode("ascii")
        return text

    @classmethod
    def draw_omr_50_sheet(cls, pdf: FPDF, font_name: str, university: str, faculty: str, subject: str, exam_code: str):
        pdf.add_page()
        pdf.set_fill_color(0, 0, 0)
        pdf.rect(8, 8, 8, 3.5, "F")
        pdf.rect(194, 8, 8, 3.5, "F")
        pdf.rect(8, 285, 8, 3.5, "F")
        pdf.rect(194, 285, 8, 3.5, "F")

        cls._set_font_safe(pdf, font_name, "B", 10)
        pdf.set_xy(12, 13)
        pdf.cell(108, 4.5, cls._sanitize_text(university.upper(), font_name), ln=0, align="L")
        cls._set_font_safe(pdf, font_name, "", 8)
        pdf.cell(78, 4.5, cls._sanitize_text("HỘI ĐỒNG KHẢO THÍ & BẢO ĐẢM CHẤT LƯỢNG", font_name), ln=1, align="R")

        cls._set_font_safe(pdf, font_name, "B", 13)
        pdf.cell(186, 6.5, cls._sanitize_text("PHIẾU TRẢ LỜI TRẮC NGHIỆM", font_name), ln=1, align="C")
        cls._set_font_safe(pdf, font_name, "I", 8)
        pdf.cell(186, 4, cls._sanitize_text("CHUẨN 50 CÂU THI ĐẠI HỌC VÀ KHẢO THÍ CHUẨN HÓA", font_name), ln=1, align="C")

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

        pdf.rect(128, 29, 42, 51)
        pdf.set_xy(128, 29.5)
        cls._set_font_safe(pdf, font_name, "B", 8)
        pdf.cell(42, 4, cls._sanitize_text("SỐ BÁO DANH", font_name), ln=1, align="C")
        sbd_col_w = 42.0 / 6.0
        for c in range(6):
            pdf.rect(128 + c * sbd_col_w, 34, sbd_col_w, 5.5)

        cls._set_font_safe(pdf, font_name, "", 6.5)
        for r in range(10):
            row_y = 41.5 + r * 3.7
            for c in range(6):
                cx = 128 + c * sbd_col_w + sbd_col_w / 2.0
                pdf.circle(cx, row_y, 1.5, style="D")
                pdf.set_xy(cx - 1.5, row_y - 1.5)
                pdf.cell(3.0, 3.0, str(r), align="C")

        pdf.rect(173, 29, 25, 51)
        pdf.set_xy(173, 29.5)
        cls._set_font_safe(pdf, font_name, "B", 8)
        pdf.cell(25, 4, cls._sanitize_text("MÃ ĐỀ", font_name), ln=1, align="C")

        code_col_w = 25.0 / 3.0
        code_str = str(exam_code).zfill(3)[-3:]
        for c in range(3):
            pdf.rect(173 + c * code_col_w, 34, code_col_w, 5.5)
            pdf.set_xy(173 + c * code_col_w, 34)
            cls._set_font_safe(pdf, font_name, "B", 8)
            pdf.cell(code_col_w, 5.5, code_str[c], align="C")

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

        pdf.set_draw_color(100, 100, 100)
        pdf.rect(12, 82, 186, 9)
        pdf.set_xy(14, 83)
        cls._set_font_safe(pdf, font_name, "B", 7.5)
        pdf.cell(182, 3.5, cls._sanitize_text("HƯỚNG DẪN TÔ ĐÁP ÁN: Dùng bút chì 2B tô kín vòng tròn đáp án được chọn.", font_name), ln=1)

        cols_config = [(12, 1, 25), (108, 26, 50)]
        labels = ["A", "B", "C", "D"]
        for col_x, start_q, end_q in cols_config:
            pdf.rect(col_x, 93, 90.0, 185)
            pdf.set_fill_color(230, 238, 250)
            pdf.rect(col_x, 93, 90.0, 6, "F")
            pdf.line(col_x, 99, col_x + 90.0, 99)

            cls._set_font_safe(pdf, font_name, "B", 8)
            pdf.set_xy(col_x + 2, 93.5)
            pdf.cell(16, 5, "CÂU", align="C")
            pdf.cell(18, 5, "A", align="C")
            pdf.cell(18, 5, "B", align="C")
            pdf.cell(18, 5, "C", align="C")
            pdf.cell(18, 5, "D", align="C")

            row_h = 7.1
            for q_idx in range(start_q, end_q + 1):
                i = q_idx - start_q
                row_y = 99 + i * row_h
                if (i // 5) % 2 == 1:
                    pdf.set_fill_color(248, 250, 253)
                    pdf.rect(col_x + 0.3, row_y, 89.4, row_h, "F")
                pdf.line(col_x, row_y + row_h, col_x + 90.0, row_y + row_h)
                cls._set_font_safe(pdf, font_name, "B", 8)
                pdf.set_xy(col_x + 2, row_y + 1)
                pdf.cell(16, 5, f"{q_idx:02d}.", align="C")

                bubble_centers = [col_x + 27, col_x + 45, col_x + 63, col_x + 81]
                cls._set_font_safe(pdf, font_name, "", 7)
                for opt_idx in range(4):
                    bx = bubble_centers[opt_idx]
                    by = row_y + 3.5
                    pdf.circle(bx, by, 2.4, style="D")
                    pdf.set_xy(bx - 2.4, by - 2.4)
                    pdf.cell(4.8, 4.8, labels[opt_idx], align="C")

        cls._set_font_safe(pdf, font_name, "I", 7)
        pdf.set_xy(12, 281)
        pdf.cell(186, 4, cls._sanitize_text(f"Mã nhận dạng OMR: *OMR-50-VN-{exam_code}* | Thí sinh giữ phiếu phẳng.", font_name), ln=1, align="C")

    @classmethod
    def generate_pdf(
        cls,
        exam_title: str,
        subject: str,
        exam_code: str,
        questions: List[Dict[str, Any]],
        university: str,
        faculty: str,
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

        cls._set_font_safe(pdf, font_name, "B", 10)
        pdf.cell(90, 5, cls._sanitize_text(university.upper(), font_name), ln=0, align="L")
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

        cls._set_font_safe(pdf, font_name, "B", 13)
        pdf.cell(175, 8, cls._sanitize_text(exam_title.upper(), font_name), ln=1, align="C")
        pdf.line(18, pdf.get_y(), 193, pdf.get_y())
        pdf.ln(5)

        answer_keys = []
        MAX_W_MM = 135.0
        MAX_H_MM = 72.0

        for idx, q in enumerate(questions, 1):
            q_text = q.get("question") or q.get("question_text") or ""
            options = q.get("options", [])
            correct_id = q.get("correct_answer_id") or q.get("correctAnswerId")

            cls._set_font_safe(pdf, font_name, "B", 10)
            pdf.write(5, cls._sanitize_text(f"Câu {idx}: ", font_name))
            cls._set_font_safe(pdf, font_name, "", 10)
            pdf.write(5, cls._sanitize_text(q_text, font_name))
            pdf.ln(6)

            # Tự động chèn hình vẽ sơ đồ vào ngay dưới nội dung câu hỏi (FPDF2)
            img_ref = (
                q.get("imageUrl") or
                q.get("image_url") or
                q.get("imagePath") or
                q.get("image_path") or
                q.get("diagramUrl") or
                q.get("diagram_url") or
                q.get("image") or
                q.get("figureUrl") or
                q.get("figure_url")
            )
            if img_ref:
                res = _resolve_image_stream(img_ref)
                if res:
                    stream, orig_w, orig_h = res
                    aspect = orig_h / max(orig_w, 1.0)
                    calc_w = min(MAX_W_MM, orig_w * 0.264583)  # px to mm
                    calc_h = calc_w * aspect
                    if calc_h > MAX_H_MM:
                        calc_h = MAX_H_MM
                        calc_w = calc_h / aspect

                    # Kiểm tra ngắt trang nếu hình tràn mép dưới A4
                    if pdf.get_y() + calc_h > 275:
                        pdf.add_page()

                    center_x = (210.0 - calc_w) / 2.0
                    try:
                        pdf.image(stream, x=center_x, y=pdf.get_y(), w=calc_w, h=calc_h)
                        pdf.set_y(pdf.get_y() + calc_h + 2)

                        caption = (
                            q.get("imageCaption") or
                            q.get("image_caption") or
                            q.get("caption") or
                            q.get("diagramCaption") or
                            q.get("diagram_caption") or
                            ""
                        )
                        if caption:
                            cls._set_font_safe(pdf, font_name, "I", 8.5)
                            pdf.cell(175, 4, cls._sanitize_text(f"({caption})", font_name), ln=1, align="C")
                            pdf.ln(2)
                    except Exception:
                        pass

            for opt in options:
                opt_label = opt.get("label", "A")
                opt_text = opt.get("text", "")
                pdf.set_x(25)
                cls._set_font_safe(pdf, font_name, "", 9.5)
                pdf.cell(165, 5, cls._sanitize_text(f"{opt_label}. {opt_text}", font_name), ln=1)

            pdf.ln(3)

            correct_opt = next((o for o in options if o.get("id") == correct_id), None)
            correct_label = correct_opt.get("label") if correct_opt else q.get("correctLabel", "A")
            answer_keys.append({
                "idx": idx,
                "label": correct_label,
                "explanation": q.get("explanation") or ""
            })

        if include_answer_key and answer_keys:
            pdf.add_page()
            cls._set_font_safe(pdf, font_name, "B", 13)
            pdf.cell(175, 8, cls._sanitize_text(f"BẢNG ĐÁP ÁN CHUẨN - MÃ ĐỀ {exam_code}", font_name), ln=1, align="C")
            pdf.ln(4)

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
                if len(chunk) < 5:
                    for _ in range(5 - len(chunk)):
                        pdf.cell(col_width, 6, "", border=1)
                pdf.ln(6)

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

        if include_omr_sheet:
            cls.draw_omr_50_sheet(pdf, font_name, university, faculty, subject, exam_code)

        out = pdf.output()
        if isinstance(out, (bytes, bytearray)):
            return bytes(out)
        return str(out).encode("latin-1")


# ==============================================================================
# MAIN FACADE: PDFExamExporter (DUAL-ENGINE ORCHESTRATOR)
# ==============================================================================
class PDFExamExporter:
    """
    Động cơ xuất đề thi PDF chất lượng cao:
    - Ưu tiên sử dụng ReportLab (Platypus & Canvas) cho độ sắc nét và tính năng chèn hình sơ đồ tối ưu.
    - Tự động dự phòng thông minh (Fallback) sang FPDF2 nếu môi trường phát sinh ngoại lệ.
    """
    @classmethod
    def generate_omr_50_pdf(
        cls,
        university: str = "TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM",
        faculty: str = "Khoa Công nghệ Thông tin",
        subject: str = "Môn học",
        exam_code: str = "101"
    ) -> bytes:
        if REPORTLAB_AVAILABLE:
            try:
                return ReportLabExamExporter.generate_omr_50_pdf(
                    university=university,
                    faculty=faculty,
                    subject=subject,
                    exam_code=exam_code
                )
            except Exception:
                pass

        # Fallback sang FPDF2
        pdf = FPDF(orientation="P", unit="mm", format="A4")
        pdf.set_auto_page_break(auto=False)
        pdf.set_margins(left=10, top=10, right=10)
        font_name = FPDFExamExporter._setup_fonts(pdf)
        FPDFExamExporter.draw_omr_50_sheet(pdf, font_name, university, faculty, subject, exam_code)
        out = pdf.output()
        return bytes(out) if isinstance(out, (bytes, bytearray)) else str(out).encode("latin-1")

    @classmethod
    def generate_pdf(
        cls,
        exam_title: str,
        subject: str,
        exam_code: str,
        questions: List[Dict[str, Any]],
        university: str = "TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM",
        faculty: str = "Khoa Công nghệ Thông tin",
        duration_minutes: int = 60,
        include_answer_key: bool = True,
        include_explanation: bool = False,
        include_omr_sheet: bool = False
    ) -> bytes:
        if REPORTLAB_AVAILABLE:
            try:
                return ReportLabExamExporter.generate_pdf(
                    exam_title=exam_title,
                    subject=subject,
                    exam_code=exam_code,
                    questions=questions,
                    university=university,
                    faculty=faculty,
                    duration_minutes=duration_minutes,
                    include_answer_key=include_answer_key,
                    include_explanation=include_explanation,
                    include_omr_sheet=include_omr_sheet
                )
            except Exception as e:
                pass

        # Fallback sang FPDF2
        return FPDFExamExporter.generate_pdf(
            exam_title=exam_title,
            subject=subject,
            exam_code=exam_code,
            questions=questions,
            university=university,
            faculty=faculty,
            duration_minutes=duration_minutes,
            include_answer_key=include_answer_key,
            include_explanation=include_explanation,
            include_omr_sheet=include_omr_sheet
        )
