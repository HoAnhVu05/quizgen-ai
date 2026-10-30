from typing import List, Dict, Any
from fastapi import FastAPI, Response, HTTPException
from pydantic import BaseModel
from .exporters.word_exporter import WordExamExporter
from .exporters.qti_exporter import QTIExporter

app = FastAPI(title="QuizGen AI - Exam & Bank Service", version="1.0.0")

class ExportDocxRequest(BaseModel):
    exam_title: str = "Đề thi Giữa kỳ Học kỳ II"
    subject: str = "Kinh tế vi mô"
    exam_code: str = "101"
    questions: List[Dict[str, Any]]

class ExportQtiRequest(BaseModel):
    title: str = "Quiz Canvas LMS"
    questions: List[Dict[str, Any]]

@app.get("/health")
def health():
    return {"status": "healthy", "service": "exam-service"}

@app.post("/export/word")
def export_word(req: ExportDocxRequest):
    try:
        docx_bytes = WordExamExporter.generate_docx(
            exam_title=req.exam_title,
            subject=req.subject,
            exam_code=req.exam_code,
            questions=req.questions
        )
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=DeThi_{req.exam_code}.docx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xuất Word: {str(e)}")

@app.post("/export/qti")
def export_qti(req: ExportQtiRequest):
    try:
        xml_content = QTIExporter.export_canvas_moodle_xml(
            title=req.title,
            questions=req.questions
        )
        return Response(
            content=xml_content,
            media_type="application/xml",
            headers={"Content-Disposition": "attachment; filename=quiz_lms_qti.xml"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xuất chuẩn LMS: {str(e)}")
