import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import FastAPI, Response, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from .database import engine, Base, get_db, SessionLocal
from .models import (
    QuestionDB, 
    ExamDB, 
    QuestionUpdateSchema, 
    QuestionStatusUpdate, 
    BatchApproveRequest, 
    ExportDocxRequest, 
    ExportQtiRequest
)
from .exporters.word_exporter import WordExamExporter
from .exporters.qti_exporter import QTIExporter

app = FastAPI(title="QuizGen AI - Exam & Bank Service", version="1.0.0")

def format_question_response(q: QuestionDB) -> dict:
    opts = q.options if isinstance(q.options, list) else json.loads(q.options or "[]")
    return {
        "id": q.id,
        "sourceChunkId": q.source_chunk_id,
        "textbookName": q.textbook_name,
        "chapter": q.chapter,
        "bloomLevel": q.bloom_level,
        "question": q.question_text,
        "options": opts,
        "correctAnswerId": q.correct_answer_id,
        "explanation": q.explanation or "",
        "confidenceScore": q.confidence_score,
        "status": q.status,
        "createdAt": q.created_at.strftime("%d/%m/%Y") if q.created_at else "Hôm nay"
    }

@app.on_event("startup")
def startup_db():
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        existing = db.execute(select(QuestionDB).filter_by(id="q-1")).scalar_one_or_none()
        if not existing:
            default_questions = [
                QuestionDB(
                    id="q-1",
                    document_id="tb-001",
                    source_chunk_id="chunk-1",
                    textbook_name="GiaoTrinh_KinhTeViMo_2025.pdf",
                    chapter="Chương 3: Cung - Cầu và Giá cả thị trường",
                    bloom_level="Nhận biết",
                    question_text="Theo quy luật cầu, trong điều kiện các yếu tố khác không đổi, phát biểu nào sau đây là chính xác?",
                    options=[
                        {"id": "opt-a", "label": "A", "text": "Khi giá hàng hóa tăng thì lượng cầu giảm xuống"},
                        {"id": "opt-b", "label": "B", "text": "Khi giá hàng hóa tăng thì lượng cầu tăng lên"},
                        {"id": "opt-c", "label": "C", "text": "Giá cả và lượng cầu luôn biến thiên cùng chiều"},
                        {"id": "opt-d", "label": "D", "text": "Lượng cầu không chịu sự tác động của mức giá thị trường"}
                    ],
                    correct_answer_id="opt-a",
                    explanation="Quy luật cầu chỉ rõ mối quan hệ tỷ lệ nghịch giữa giá và lượng cầu (giá tăng thì lượng cầu giảm và ngược lại).",
                    confidence_score=99,
                    status="approved",
                    created_at=datetime.utcnow()
                ),
                QuestionDB(
                    id="q-2",
                    document_id="tb-001",
                    source_chunk_id="chunk-2",
                    textbook_name="GiaoTrinh_KinhTeViMo_2025.pdf",
                    chapter="Chương 3: Cung - Cầu và Giá cả thị trường",
                    bloom_level="Thông hiểu",
                    question_text="Nếu trà và cà phê là hai hàng hóa thay thế cho nhau, điều gì sẽ xảy ra khi giá cà phê trên thị trường tăng vọt?",
                    options=[
                        {"id": "opt-a", "label": "A", "text": "Đường cầu của cà phê dịch chuyển sang phải"},
                        {"id": "opt-b", "label": "B", "text": "Lượng cầu về trà sẽ giảm sút nghiêm trọng"},
                        {"id": "opt-c", "label": "C", "text": "Cầu về mặt hàng trà sẽ có xu hướng tăng lên"},
                        {"id": "opt-d", "label": "D", "text": "Giá của cả hai mặt hàng sẽ lập tức giảm về 0"}
                    ],
                    correct_answer_id="opt-c",
                    explanation="Vì là hàng hóa thay thế, khi giá cà phê tăng, người tiêu dùng sẽ chuyển sang dùng trà, làm tăng nhu cầu về trà.",
                    confidence_score=95,
                    status="pending",
                    created_at=datetime.utcnow()
                ),
                QuestionDB(
                    id="q-3",
                    document_id="tb-001",
                    source_chunk_id="chunk-3",
                    textbook_name="GiaoTrinh_KinhTeViMo_2025.pdf",
                    chapter="Chương 3: Cung - Cầu và Giá cả thị trường",
                    bloom_level="Vận dụng",
                    question_text="Một doanh nghiệp bán sản phẩm có hệ số co giãn của cầu theo giá là |PED| = 1.8. Để tối đa hóa tổng doanh thu, doanh nghiệp này nên áp dụng chiến lược giá nào?",
                    options=[
                        {"id": "opt-a", "label": "A", "text": "Tăng giá bán sản phẩm"},
                        {"id": "opt-b", "label": "B", "text": "Giảm nhẹ giá bán sản phẩm"},
                        {"id": "opt-c", "label": "C", "text": "Giữ nguyên giá bán và cắt giảm 50% sản lượng"},
                        {"id": "opt-d", "label": "D", "text": "Tăng giá bán gấp đôi kết hợp giảm chi phí"}
                    ],
                    correct_answer_id="opt-b",
                    explanation="Khi cầu co giãn nhiều (|PED| > 1), tỷ lệ % thay đổi của lượng cầu lớn hơn tỷ lệ % thay đổi của giá. Do đó, giảm giá sẽ kích cầu mạnh và tăng tổng doanh thu.",
                    confidence_score=92,
                    status="pending",
                    created_at=datetime.utcnow()
                )
            ]
            db.add_all(default_questions)
            db.commit()
        db.close()
    except Exception as e:
        print(f"[EXAM-SERVICE] DB Startup Warning: {e}")

@app.get("/health")
def health():
    return {"status": "healthy", "service": "exam-service"}

@app.get("/questions")
@app.get("/bank")
def list_questions(
    search: Optional[str] = None,
    bloom_level: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(QuestionDB)
    if status:
        query = query.filter(QuestionDB.status == status)
    if bloom_level and bloom_level != "all":
        query = query.filter(QuestionDB.bloom_level == bloom_level)
    
    questions = query.order_by(QuestionDB.created_at.desc()).all()
    results = [format_question_response(q) for q in questions]

    if search:
        s = search.lower()
        results = [
            r for r in results 
            if s in r["question"].lower() or s in r["chapter"].lower()
        ]
    return results

@app.get("/questions/{question_id}")
def get_question(question_id: str, db: Session = Depends(get_db)):
    q = db.execute(select(QuestionDB).filter_by(id=question_id)).scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi.")
    return format_question_response(q)

@app.put("/questions/{question_id}")
def update_question(question_id: str, payload: QuestionUpdateSchema, db: Session = Depends(get_db)):
    q = db.execute(select(QuestionDB).filter_by(id=question_id)).scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi để cập nhật.")
    
    if payload.question is not None:
        q.question_text = payload.question
    if payload.options is not None:
        q.options = [opt.dict() for opt in payload.options]
    if payload.correctAnswerId is not None:
        q.correct_answer_id = payload.correctAnswerId
    if payload.explanation is not None:
        q.explanation = payload.explanation
    
    q.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(q)
    return format_question_response(q)

@app.patch("/questions/{question_id}/status")
def update_status(question_id: str, payload: QuestionStatusUpdate, db: Session = Depends(get_db)):
    q = db.execute(select(QuestionDB).filter_by(id=question_id)).scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi.")
    q.status = payload.status
    q.updated_at = datetime.utcnow()
    db.commit()
    return {"id": q.id, "status": q.status}

@app.post("/questions/batch-approve")
def batch_approve(payload: BatchApproveRequest, db: Session = Depends(get_db)):
    db.query(QuestionDB).filter(QuestionDB.id.in_(payload.questionIds)).update(
        {"status": "approved", "updated_at": datetime.utcnow()},
        synchronize_session=False
    )
    db.commit()
    return {"status": "success", "approvedCount": len(payload.questionIds)}

@app.post("/export/word")
def export_word(req: ExportDocxRequest, db: Session = Depends(get_db)):
    questions = req.questions
    if not questions and req.selectedQuestionIds:
        db_qs = db.query(QuestionDB).filter(QuestionDB.id.in_(req.selectedQuestionIds)).all()
        questions = [format_question_response(q) for q in db_qs]

    if not questions:
        # Lấy tất cả câu hỏi approved nếu không truyền gì
        db_qs = db.query(QuestionDB).filter_by(status="approved").all()
        questions = [format_question_response(q) for q in db_qs]

    try:
        docx_bytes = WordExamExporter.generate_docx(
            exam_title=req.get_title(),
            subject=req.get_subject(),
            exam_code=req.get_code(),
            questions=questions
        )
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=DeThi_{req.get_code()}.docx"}
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
