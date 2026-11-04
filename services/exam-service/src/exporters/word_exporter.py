import io
from typing import List, Dict, Any, Optional
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

class WordExamExporter:
    @staticmethod
    def generate_docx(
        exam_title: str,
        subject: str,
        exam_code: str,
        questions: List[Dict[str, Any]],
        university: str = "ĐẠI HỌC QUỐC GIA",
        faculty: str = "Khoa Kinh tế & Quản trị",
        duration_minutes: int = 60,
        include_answer_key: bool = True,
        include_explanation: bool = False
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

        # Ghi vào bộ nhớ buffer và trả về dạng byte stream
        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()
