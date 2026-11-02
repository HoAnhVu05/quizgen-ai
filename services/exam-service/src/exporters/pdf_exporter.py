import io
from typing import List, Dict, Any

class PDFExamExporter:
    """
    Trình xuất đề thi định dạng PDF kèm phiếu chấm trắc nghiệm.
    Tự động sử dụng ReportLab hoặc FPDF tùy theo thư viện sẵn có trong môi trường.
    """

    @staticmethod
    def generate_pdf(
        exam_title: str,
        subject: str,
        exam_code: str,
        questions: List[Dict[str, Any]],
        include_answer_key: bool = True
    ) -> bytes:
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen import canvas
            
            buffer = io.BytesIO()
            p = canvas.Canvas(buffer, pagesize=A4)
            width, height = A4
            
            # Header trường & khoa
            p.setFont("Helvetica-Bold", 13)
            p.drawCentredString(width / 2.0, height - 40, "DAI HOC QUOC GIA")
            p.setFont("Helvetica", 10)
            p.drawCentredString(width / 2.0, height - 55, "KHOA KINH TE & QUAN TRI")
            
            # Tiêu đề kỳ thi
            p.setFont("Helvetica-Bold", 12)
            p.drawCentredString(width / 2.0, height - 75, exam_title.upper())
            p.setFont("Helvetica-Oblique", 10)
            p.drawCentredString(width / 2.0, height - 90, f"Mon thi: {subject} | Ma de: {exam_code} | Thoi gian: 60 phut")
            
            p.setLineWidth(0.5)
            p.line(40, height - 100, width - 40, height - 100)
            
            y = height - 120
            answer_keys = []
            
            for idx, q in enumerate(questions, 1):
                if y < 80:
                    p.showPage()
                    y = height - 50
                    
                q_text = q.get("question", "")
                bloom = q.get("bloomLevel") or q.get("bloom_level") or ""
                p.setFont("Helvetica-Bold", 10)
                p.drawString(40, y, f"Cau {idx} ({bloom}): {q_text[:90]}")
                y -= 16
                
                options = q.get("options", [])
                correct_id = q.get("correctAnswerId") or q.get("correct_answer_id")
                
                p.setFont("Helvetica", 9)
                for opt in options:
                    if y < 60:
                        p.showPage()
                        y = height - 50
                    lbl = opt.get("label", "")
                    txt = opt.get("text", "")
                    p.drawString(55, y, f"{lbl}. {txt[:85]}")
                    y -= 14
                    
                    if opt.get("id") == correct_id:
                        answer_keys.append((idx, lbl))
                y -= 8
                
            # Trang đáp án
            if include_answer_key and answer_keys:
                p.showPage()
                p.setFont("Helvetica-Bold", 13)
                p.drawCentredString(width / 2.0, height - 50, f"BANG DAP AN CHUAN - MA DE {exam_code}")
                p.setLineWidth(0.5)
                p.line(40, height - 60, width - 40, height - 60)
                
                y_ans = height - 90
                p.setFont("Helvetica", 10)
                for q_idx, ans_lbl in answer_keys:
                    if y_ans < 60:
                        p.showPage()
                        y_ans = height - 50
                    p.drawString(80, y_ans, f"Cau {q_idx}:  Dap an {ans_lbl}")
                    y_ans -= 18
                    
            p.save()
            buffer.seek(0)
            return buffer.getvalue()
        except ImportError:
            # Fallback nếu dùng FPDF
            from fpdf import FPDF
            pdf = FPDF(orientation="P", unit="mm", format="A4")
            pdf.add_page()
            pdf.set_font("Helvetica", size=12)
            pdf.cell(0, 10, text=exam_title, align="C")
            return pdf.output()
