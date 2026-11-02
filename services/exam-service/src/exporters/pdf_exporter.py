import io
from typing import List, Dict, Any
from fpdf import FPDF

class PDFExamExporter:
    @staticmethod
    def generate_pdf(
        exam_title: str,
        subject: str,
        exam_code: str,
        questions: List[Dict[str, Any]],
        include_answer_key: bool = True
    ) -> bytes:
        pdf = FPDF(orientation="P", unit="mm", format="A4")
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        
        # Note: Standard Helvetica font for academic layout
        pdf.set_font("Helvetica", style="B", size=13)
        pdf.cell(0, 7, text="DAI HOC QUOC GIA", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", style="", size=10)
        pdf.cell(0, 5, text="KHOA KINH TE & QUAN TRI", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)

        pdf.set_font("Helvetica", style="B", size=12)
        pdf.cell(0, 7, text=exam_title.upper(), align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", style="I", size=10)
        pdf.cell(0, 6, text=f"Mon thi: {subject} | Ma de thi: {exam_code} | Thoi gian: 60 phut", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)
        pdf.line(15, pdf.get_y(), 195, pdf.get_y())
        pdf.ln(5)

        answer_keys = []

        # Questions
        for idx, q in enumerate(questions, 1):
            q_text = q.get("question", "")
            bloom = q.get("bloomLevel") or q.get("bloom_level") or ""
            
            pdf.set_font("Helvetica", style="B", size=10)
            pdf.multi_cell(0, 5, text=f"Cau {idx} ({bloom}): {q_text}")
            pdf.ln(1)

            options = q.get("options", [])
            correct_id = q.get("correctAnswerId") or q.get("correct_answer_id")

            pdf.set_font("Helvetica", style="", size=9.5)
            for opt in options:
                lbl = opt.get("label", "")
                txt = opt.get("text", "")
                pdf.set_x(20)
                pdf.multi_cell(0, 4.5, text=f"{lbl}. {txt}")

                if opt.get("id") == correct_id:
                    answer_keys.append((idx, lbl))

            pdf.ln(3)

        # Answer Key Sheet on new page
        if include_answer_key and answer_keys:
            pdf.add_page()
            pdf.set_font("Helvetica", style="B", size=12)
            pdf.cell(0, 8, text=f"BANG DAP AN CHUAN - MA DE {exam_code}", align="C", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(5)

            col_width = 35
            row_height = 7
            pdf.set_font("Helvetica", style="B", size=9)

            # Table Header
            for _ in range(5):
                pdf.cell(col_width, row_height, text="Cau - DA", border=1, align="C")
            pdf.ln()

            # Table Rows
            pdf.set_font("Helvetica", size=9)
            col_count = 0
            for q_idx, ans_lbl in answer_keys:
                pdf.cell(col_width, row_height, text=f"Cau {q_idx}:  {ans_lbl}", border=1, align="C")
                col_count += 1
                if col_count % 5 == 0:
                    pdf.ln()

            if col_count % 5 != 0:
                remaining = 5 - (col_count % 5)
                for _ in range(remaining):
                    pdf.cell(col_width, row_height, text="", border=1)
                pdf.ln()

        buffer = io.BytesIO()
        pdf.output(buffer)
        buffer.seek(0)
        return buffer.getvalue()
