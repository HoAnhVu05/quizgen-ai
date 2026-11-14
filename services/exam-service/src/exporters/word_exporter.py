import io
import os
import re
import base64
import urllib.request
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image as PILImage
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

class WordExamExporter:
    @classmethod
    def _resolve_image_stream(cls, img_source: Any) -> Optional[Tuple[io.BytesIO, float, float]]:
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

                # 2. Base64 Data URI (ví dụ: data:image/png;base64,...)
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
                            headers={"User-Agent": "QuizGenAI-WordExporter/1.0"}
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

            # Kiểm tra và lấy kích thước gốc bằng Pillow
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

    @classmethod
    def _insert_question_diagram(cls, doc: Document, q: Dict[str, Any]):
        """
        Tự động chèn hình vẽ sơ đồ vào ngay dưới nội dung câu hỏi,
        căn giữa và điều chỉnh kích thước chuẩn lề in A4.
        """
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
        if not img_ref:
            return

        res = cls._resolve_image_stream(img_ref)
        if not res:
            return

        stream, orig_w, orig_h = res

        # Chuẩn kích thước in A4: Max width 4.8 in (12.2 cm), Max height 2.8 in (7.1 cm)
        MAX_W = 4.8
        MAX_H = 2.8
        aspect = orig_h / max(orig_w, 1.0)

        calc_w = min(MAX_W, orig_w / 96.0) if orig_w > 0 else MAX_W
        if calc_w > MAX_W:
            calc_w = MAX_W
        calc_h = calc_w * aspect
        if calc_h > MAX_H:
            calc_h = MAX_H
            calc_w = calc_h / aspect

        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(4)
        p_img.paragraph_format.space_after = Pt(2)
        r_img = p_img.add_run()
        r_img.add_picture(stream, width=Inches(calc_w), height=Inches(calc_h))

        caption = (
            q.get("imageCaption") or
            q.get("image_caption") or
            q.get("caption") or
            q.get("diagramCaption") or
            q.get("diagram_caption") or
            ""
        )
        if caption:
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_before = Pt(0)
            p_cap.paragraph_format.space_after = Pt(4)
            r_cap = p_cap.add_run(f"({caption})")
            r_cap.italic = True
            r_cap.font.size = Pt(8.5)
            r_cap.font.color.rgb = RGBColor(100, 116, 139)

    @classmethod
    def _set_cell_background(cls, cell, hex_color: str):
        """Đặt màu nền cho ô bảng trong Word."""
        try:
            tcPr = cell._tc.get_or_add_tcPr()
            shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
            tcPr.append(shd)
        except Exception:
            pass

    @classmethod
    def draw_omr_50_sheet(
        cls,
        doc: Document,
        university: str = "ĐẠI HỌC QUỐC GIA",
        faculty: str = "Khoa Công nghệ Thông tin",
        subject: str = "Môn học",
        exam_code: str = "101",
        is_new_page: bool = True
    ):
        """
        Vẽ Phiếu trả lời trắc nghiệm chuẩn 50 câu thi đại học vào tài liệu Word (.docx):
        - Header 2 cột: Tên trường/khoa và Hội đồng khảo thí & Mã đề
        - Tiêu đề nổi bật: PHIẾU TRẢ LỜI TRẮC NGHIỆM CHUẨN 50 CÂU
        - Khung thông tin cá nhân thí sinh (Ghi bằng bút mực)
        - Khung Số Báo Danh (SBD 6 chữ số) và Mã Đề thi (3 chữ số)
        - Hướng dẫn tô đáp án bằng bút chì 2B
        - Lưới 50 câu trắc nghiệm chia 2 cột lớn (Câu 01-25 và Câu 26-50), mỗi câu 4 ô tô [ A ] [ B ] [ C ] [ D ]
        - Chân trang định danh OMR quang học
        """
        if is_new_page:
            doc.add_page_break()

        # 1. Header bảng 2 cột
        header_table = doc.add_table(rows=1, cols=2)
        header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        c_left, c_right = header_table.rows[0].cells
        
        p_left = c_left.paragraphs[0]
        p_left.paragraph_format.space_before = Pt(0)
        p_left.paragraph_format.space_after = Pt(2)
        r_u = p_left.add_run(f"{university.upper()}\n")
        r_u.bold = True
        r_u.font.size = Pt(9.5)
        r_f = p_left.add_run(f"{faculty.upper()}")
        r_f.font.size = Pt(8.5)

        p_right = c_right.paragraphs[0]
        p_right.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_right.paragraph_format.space_before = Pt(0)
        p_right.paragraph_format.space_after = Pt(2)
        r_hd = p_right.add_run("HỘI ĐỒNG KHẢO THÍ & BẢO ĐẢM CHẤT LƯỢNG\n")
        r_hd.bold = True
        r_hd.font.size = Pt(9)
        r_md = p_right.add_run(f"MÃ ĐỀ THI: {exam_code}")
        r_md.bold = True
        r_md.font.size = Pt(9.5)

        # 2. Tiêu đề Phiếu trả lời trắc nghiệm
        p_title = doc.add_paragraph()
        p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_title.paragraph_format.space_before = Pt(4)
        p_title.paragraph_format.space_after = Pt(1)
        r_title = p_title.add_run("PHIẾU TRẢ LỜI TRẮC NGHIỆM")
        r_title.bold = True
        r_title.font.size = Pt(13)

        p_sub = doc.add_paragraph()
        p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_sub.paragraph_format.space_before = Pt(0)
        p_sub.paragraph_format.space_after = Pt(4)
        r_sub = p_sub.add_run("CHUẨN 50 CÂU THI ĐẠI HỌC VÀ KHẢO THÍ CHUẨN HÓA")
        r_sub.italic = True
        r_sub.font.size = Pt(8)

        # 3. Khung Thông tin Thí sinh & Số Báo Danh / Mã đề
        info_table = doc.add_table(rows=1, cols=2)
        info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        c_info, c_sbd = info_table.rows[0].cells
        c_info.width = Inches(4.3)
        c_sbd.width = Inches(2.7)

        # Khung thông tin cá nhân
        p_info = c_info.paragraphs[0]
        p_info.paragraph_format.space_before = Pt(0)
        p_info.paragraph_format.space_after = Pt(2)
        r_ih = p_info.add_run("THÔNG TIN THÍ SINH (Ghi bằng bút mực):\n")
        r_ih.bold = True
        r_ih.font.size = Pt(8.5)

        fields = [
            "• Họ và tên: ..........................................................................",
            "• Ngày sinh: ....../....../........   Giới tính: Nam [   ]  Nữ [   ]",
            "• Lớp / Phòng thi: ...........................   Số bàn: .............",
            f"• Môn thi: {subject} ({faculty})",
            "• Chữ ký GT 1: .....................  Chữ ký GT 2: ....................."
        ]
        for f in fields:
            p = c_info.add_paragraph()
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            r = p.add_run(f)
            r.font.size = Pt(8)

        # Khung SBD & Mã đề
        p_sbd = c_sbd.paragraphs[0]
        p_sbd.paragraph_format.space_before = Pt(0)
        p_sbd.paragraph_format.space_after = Pt(2)
        r_sh = p_sbd.add_run("SỐ BÁO DANH & MÃ ĐỀ:\n")
        r_sh.bold = True
        r_sh.font.size = Pt(8.5)

        p_sbd_box = c_sbd.add_paragraph()
        p_sbd_box.paragraph_format.space_before = Pt(1)
        p_sbd_box.paragraph_format.space_after = Pt(1)
        code_str = str(exam_code).zfill(3)[-3:]
        r_sb = p_sbd_box.add_run(f"SBD: [  ] [  ] [  ] [  ] [  ] [  ]  |  MÃ ĐỀ: [ {code_str[0]} ] [ {code_str[1]} ] [ {code_str[2]} ]\n")
        r_sb.font.size = Pt(8)
        r_sb.bold = True

        p_sbd_grid = c_sbd.add_paragraph()
        p_sbd_grid.paragraph_format.space_before = Pt(1)
        p_sbd_grid.paragraph_format.space_after = Pt(1)
        p_sbd_grid.add_run("Tô số: (0) (1) (2) (3) (4) (5) (6) (7) (8) (9)").font.size = Pt(7.5)

        # 4. Hướng dẫn tô chì 2B
        p_guide = doc.add_paragraph()
        p_guide.paragraph_format.space_before = Pt(3)
        p_guide.paragraph_format.space_after = Pt(3)
        r_gh = p_guide.add_run("HƯỚNG DẪN TÔ ĐÁP ÁN: ")
        r_gh.bold = True
        r_gh.font.size = Pt(7.5)
        r_gt = p_guide.add_run("Dùng bút chì 2B tô kín vòng tròn phương án chọn. [ ĐÚNG: ( ● ) ]   [ SAI: ( X )  ( / )  ( - ) ]")
        r_gt.font.size = Pt(7.5)

        # 5. Lưới 50 câu trắc nghiệm (chia 2 cột lớn: Câu 01-25 & Câu 26-50)
        grid = doc.add_table(rows=26, cols=10)
        grid.style = 'Table Grid'
        grid.alignment = WD_TABLE_ALIGNMENT.CENTER

        hdr = grid.rows[0].cells
        cls._set_cell_background(hdr[0], "E2E8F0")
        hdr[0].text = "CÂU"
        for j in range(1, 5):
            cls._set_cell_background(hdr[j], "E2E8F0")
            hdr[j].text = ["A", "B", "C", "D"][j-1]

        cls._set_cell_background(hdr[5], "E2E8F0")
        hdr[5].text = "CÂU"
        for j in range(6, 10):
            cls._set_cell_background(hdr[j], "E2E8F0")
            hdr[j].text = ["A", "B", "C", "D"][j-6]

        for j in range(10):
            p_h = hdr[j].paragraphs[0]
            p_h.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_h.paragraph_format.space_before = Pt(1)
            p_h.paragraph_format.space_after = Pt(1)
            if p_h.runs:
                p_h.runs[0].font.size = Pt(7.5)
                p_h.runs[0].bold = True

        labels = ["A", "B", "C", "D"]
        for i in range(25):
            row = grid.rows[i + 1].cells
            q_left = i + 1
            q_right = i + 26

            # Cột trái
            row[0].text = f"{q_left:02d}"
            p_l = row[0].paragraphs[0]
            p_l.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_l.paragraph_format.space_before = Pt(0.5)
            p_l.paragraph_format.space_after = Pt(0.5)
            if p_l.runs:
                p_l.runs[0].font.size = Pt(7.5)
                p_l.runs[0].bold = True

            for opt in range(4):
                row[opt + 1].text = f"[ {labels[opt]} ]"
                p_opt = row[opt + 1].paragraphs[0]
                p_opt.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_opt.paragraph_format.space_before = Pt(0.5)
                p_opt.paragraph_format.space_after = Pt(0.5)
                if p_opt.runs:
                    p_opt.runs[0].font.size = Pt(7)

            # Cột phải
            row[5].text = f"{q_right:02d}"
            p_r = row[5].paragraphs[0]
            p_r.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_r.paragraph_format.space_before = Pt(0.5)
            p_r.paragraph_format.space_after = Pt(0.5)
            if p_r.runs:
                p_r.runs[0].font.size = Pt(7.5)
                p_r.runs[0].bold = True

            for opt in range(4):
                row[opt + 6].text = f"[ {labels[opt]} ]"
                p_opt = row[opt + 6].paragraphs[0]
                p_opt.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_opt.paragraph_format.space_before = Pt(0.5)
                p_opt.paragraph_format.space_after = Pt(0.5)
                if p_opt.runs:
                    p_opt.runs[0].font.size = Pt(7)

        # 6. Chân phiếu OMR
        p_ft = doc.add_paragraph()
        p_ft.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_ft.paragraph_format.space_before = Pt(3)
        p_ft.paragraph_format.space_after = Pt(0)
        r_ft = p_ft.add_run(f"Mã nhận dạng OMR: *OMR-50-VN-{exam_code}* | Thí sinh giữ phiếu phẳng, không làm rách hoặc vấy bẩn.")
        r_ft.italic = True
        r_ft.font.size = Pt(7)

    @classmethod
    def generate_omr_50_docx(
        cls,
        university: str = "ĐẠI HỌC QUỐC GIA",
        faculty: str = "Khoa Công nghệ Thông tin",
        subject: str = "Môn học",
        exam_code: str = "101"
    ) -> bytes:
        """Sinh riêng tệp Word (.docx) 1 trang chỉ gồm duy nhất Phiếu trả lời trắc nghiệm OMR 50 câu."""
        doc = Document()
        for section in doc.sections:
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.6)
            section.right_margin = Inches(0.6)
        cls.draw_omr_50_sheet(
            doc=doc,
            university=university,
            faculty=faculty,
            subject=subject,
            exam_code=exam_code,
            is_new_page=False
        )
        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)
        return buf.getvalue()

    @classmethod
    def generate_docx(
        cls,
        exam_title: str,
        subject: str,
        exam_code: str,
        questions: List[Dict[str, Any]],
        university: str = "ĐẠI HỌC QUỐC GIA",
        faculty: str = "Khoa Công nghệ Thông tin",
        duration_minutes: int = 60,
        include_answer_key: bool = True,
        include_explanation: bool = False,
        include_omr_sheet: bool = True
    ) -> bytes:
        doc = Document()

        # Căn lề khổ giấy A4 chuẩn khảo thí 2.0 cm (0.75 in)
        for section in doc.sections:
            section.top_margin = Inches(0.75)
            section.bottom_margin = Inches(0.75)
            section.left_margin = Inches(0.75)
            section.right_margin = Inches(0.75)

        # Header bảng 2 cột đối xứng
        header_table = doc.add_table(rows=1, cols=2)
        header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell_left, cell_right = header_table.rows[0].cells
        
        # Cột trái: Thông tin Trường / Khoa
        p_left = cell_left.paragraphs[0]
        r1 = p_left.add_run(f"{university.upper()}\n")
        r1.bold = True
        r1.font.size = Pt(11)
        r2 = p_left.add_run(f"{faculty.upper()}\n-------------------")
        r2.font.size = Pt(10)

        # Cột phải: Thông tin Đề thi & Mã đề
        p_right = cell_right.paragraphs[0]
        p_right.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r3 = p_right.add_run(f"ĐỀ THI KẾT THÚC HỌC PHẦN\nMôn thi: {subject}\n")
        r3.bold = True
        r3.font.size = Pt(11)
        r4 = p_right.add_run(f"Mã đề thi: {exam_code} | Thời gian: {duration_minutes} phút\n")
        r4.font.size = Pt(10)
        r5 = p_right.add_run("(Thí sinh không được sử dụng tài liệu)")
        r5.italic = True
        r5.font.size = Pt(9)

        doc.add_paragraph()  # Giãn cách

        # Tiêu đề đề thi chính giữa
        p_title = doc.add_paragraph()
        p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_title = p_title.add_run(exam_title.upper())
        r_title.bold = True
        r_title.font.size = Pt(14)

        doc.add_paragraph("-------------------------------------------------------------------------------------------------------")

        # Danh sách câu hỏi
        answer_keys = []
        for idx, q in enumerate(questions, 1):
            p_q = doc.add_paragraph()
            p_q.paragraph_format.space_before = Pt(8)
            p_q.paragraph_format.space_after = Pt(4)
            
            r_num = p_q.add_run(f"Câu {idx}: ")
            r_num.bold = True
            q_text = q.get("question") or q.get("question_text") or ""
            p_q.add_run(q_text)

            # Tự động chèn hình vẽ sơ đồ vào ngay dưới nội dung câu hỏi
            cls._insert_question_diagram(doc, q)

            # Các phương án lựa chọn
            options = q.get("options", [])
            for opt in options:
                p_opt = doc.add_paragraph()
                p_opt.paragraph_format.left_indent = Inches(0.3)
                p_opt.paragraph_format.space_after = Pt(2)
                p_opt.add_run(f"{opt.get('label')}. {opt.get('text')}")

            # Xác định đáp án đúng
            correct_id = q.get("correct_answer_id") or q.get("correctAnswerId")
            correct_opt = next((o for o in options if o.get("id") == correct_id), None)
            correct_label = correct_opt.get("label") if correct_opt else q.get("correctLabel", "A")
            answer_keys.append({
                "idx": idx,
                "label": correct_label,
                "explanation": q.get("explanation") or ""
            })

        # Bảng đáp án chuẩn ở trang cuối
        if include_answer_key and answer_keys:
            doc.add_page_break()
            p_ans_title = doc.add_paragraph()
            p_ans_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r_ans = p_ans_title.add_run(f"BẢNG ĐÁP ÁN CHUẨN - MÃ ĐỀ {exam_code}")
            r_ans.bold = True
            r_ans.font.size = Pt(13)

            # Bảng ma trận 5 cột
            ans_table = doc.add_table(rows=1, cols=5)
            ans_table.alignment = WD_TABLE_ALIGNMENT.CENTER
            hdr_cells = ans_table.rows[0].cells
            for i in range(5):
                hdr_cells[i].text = "Câu - ĐA"

            row_cells = None
            for i, item in enumerate(answer_keys):
                col_idx = i % 5
                if col_idx == 0:
                    row_cells = ans_table.add_row().cells
                row_cells[col_idx].text = f"Câu {item['idx']}: {item['label']}"

            # Phần giải thích chi tiết nếu có yêu cầu
            if include_explanation:
                doc.add_paragraph()
                p_exp_header = doc.add_paragraph()
                r_exp = p_exp_header.add_run("HƯỚNG DẪN GIẢI CHI TIẾT & CĂN CỨ HỌC THUẬT")
                r_exp.bold = True
                r_exp.font.size = Pt(12)

                for item in answer_keys:
                    if item.get("explanation"):
                        p_item_exp = doc.add_paragraph()
                        r_item_title = p_item_exp.add_run(f"Câu {item['idx']} (Đáp án {item['label']}): ")
                        r_item_title.bold = True
                        p_item_exp.add_run(item["explanation"])

        # Phiếu trả lời trắc nghiệm chuẩn OMR 50 câu (giống file PDF)
        if include_omr_sheet:
            cls.draw_omr_50_sheet(
                doc=doc,
                university=university,
                faculty=faculty,
                subject=subject,
                exam_code=exam_code,
                is_new_page=True
            )

        # Ghi vào bộ nhớ buffer và trả về dạng byte stream
        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

