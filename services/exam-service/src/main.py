import io
import json
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import FastAPI, Response, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from .database import engine, Base, get_db, SessionLocal
from .models import (
    QuestionDB, 
    ExamDB, 
    ExamVariantDB,
    SubjectDB,
    LearningOutcomeDB,
    SystemActivityDB,
    OptionSchema,
    QuestionCreateSchema,
    QuestionUpdateSchema, 
    QuestionStatusUpdate, 
    BatchApproveRequest,
    GenerateVariantsRequest,
    ExportDocxRequest,
    ExportPdfRequest,
    UnifiedExportRequest,
    ExportQtiRequest,
    CreateExamRecordRequest,
    SubjectResponse,
    ActivityResponse
)
from .exporters.word_exporter import WordExamExporter
from .exporters.pdf_exporter import PDFExamExporter
from .exporters.qti_exporter import QTIExporter
from .shuffler import ExamShuffler
from .cache import RedisCacheClient

app = FastAPI(
    title="QuizGen AI - Exam & Question Bank Service",
    version="1.0.0",
    description="Microservice quản lý Ngân hàng câu hỏi, Đảo đa mã đề (Fisher-Yates) và Xuất bản Khảo thí (Word, PDF, QTI)"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cache_client = RedisCacheClient()

def format_question_response(q: QuestionDB) -> dict:
    opts = q.options if isinstance(q.options, list) else json.loads(q.options or "[]")
    return {
        "id": q.id,
        "documentId": q.document_id,
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
        "createdBy": q.created_by,
        "createdAt": q.created_at.strftime("%d/%m/%Y") if q.created_at else "Hôm nay"
    }

def format_exam_response(e: ExamDB) -> dict:
    codes = e.exam_codes if isinstance(e.exam_codes, list) else json.loads(e.exam_codes or "[]")
    q_ids = e.selected_question_ids if isinstance(e.selected_question_ids, list) else json.loads(e.selected_question_ids or "[]")
    return {
        "id": e.id,
        "userId": e.user_id,
        "title": e.title,
        "subject": e.subject,
        "faculty": e.faculty,
        "university": e.university,
        "durationMinutes": e.duration_minutes,
        "examCodes": codes,
        "selectedQuestionIds": q_ids,
        "questionCount": len(q_ids),
        "format": e.format,
        "createdAt": e.created_at.isoformat() if e.created_at else datetime.utcnow().isoformat()
    }

def _resolve_questions(
    questions: Optional[List[Dict[str, Any]]],
    question_ids: Optional[List[str]],
    db: Session
) -> List[Dict[str, Any]]:
    """Lấy danh sách câu hỏi từ payload hoặc truy vấn database nếu truyền id."""
    if questions and len(questions) > 0:
        return questions

    if question_ids and len(question_ids) > 0:
        db_questions = db.query(QuestionDB).filter(QuestionDB.id.in_(question_ids)).all()
        return [format_question_response(q) for q in db_questions]

    # Mặc định lấy các câu đã approved
    db_questions = db.query(QuestionDB).filter(QuestionDB.status == "approved").limit(20).all()
    if not db_questions:
        db_questions = db.query(QuestionDB).limit(20).all()
    return [format_question_response(q) for q in db_questions]

@app.on_event("startup")
def startup_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[EXAM-SERVICE] Note on startup DB init: {e}")

# ====================================================================
# HEALTH CHECK
# ====================================================================
@app.get("/health")
def health(db: Session = Depends(get_db)):
    db_status = "connected"
    try:
        db.execute(select(1))
    except Exception:
        db_status = "unreachable"
    return {
        "status": "healthy",
        "service": "exam-service",
        "database": db_status,
        "cache": "connected" if cache_client.is_connected else "in-memory"
    }

# ====================================================================
# QUESTION BANK ENDPOINTS
# ====================================================================
@app.get("/questions")
@app.get("/bank")
def list_questions(
    search: Optional[str] = None,
    status: Optional[str] = Query(None, description="pending, approved, rejected"),
    chapter: Optional[str] = Query(None),
    bloomLevel: Optional[str] = Query(None),
    bloom_level: Optional[str] = Query(None),
    textbookName: Optional[str] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(QuestionDB)
    if status and status != "all":
        query = query.filter(QuestionDB.status == status)
    if chapter:
        query = query.filter(QuestionDB.chapter == chapter)
    b_level = bloomLevel or bloom_level
    if b_level and b_level != "all":
        query = query.filter(QuestionDB.bloom_level == b_level)
    if textbookName:
        query = query.filter(QuestionDB.textbook_name.ilike(f"%{textbookName}%"))

    if search:
        query = query.filter(
            (QuestionDB.question_text.ilike(f"%{search}%")) |
            (QuestionDB.chapter.ilike(f"%{search}%"))
        )

    query = query.order_by(desc(QuestionDB.created_at))
    if offset:
        query = query.offset(offset)
    if limit:
        query = query.limit(limit)

    items = query.all()
    return [format_question_response(q) for q in items]

@app.post("/questions", status_code=status.HTTP_201_CREATED)
def create_question(payload: QuestionCreateSchema, db: Session = Depends(get_db)):
    qid = payload.id or f"q-{uuid.uuid4().hex[:8]}"
    options_data = [opt.dict() for opt in payload.options]

    new_q = QuestionDB(
        id=qid,
        document_id=payload.documentId or payload.document_id,
        source_chunk_id=payload.get_source_chunk_id(),
        textbook_name=payload.get_textbook_name(),
        chapter=payload.chapter or "Chương 1",
        bloom_level=payload.get_bloom_level(),
        question_text=payload.get_question_text(),
        options=options_data,
        correct_answer_id=payload.get_correct_answer_id(),
        explanation=payload.explanation or "",
        confidence_score=payload.get_confidence_score(),
        status=payload.status or "pending",
        created_by=payload.created_by or "lec-001"
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    return format_question_response(new_q)

@app.get("/questions/{question_id}")
def get_question(question_id: str, db: Session = Depends(get_db)):
    q = db.query(QuestionDB).filter(QuestionDB.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi với ID tương ứng.")
    return format_question_response(q)

@app.put("/questions/{question_id}")
def update_question(question_id: str, payload: QuestionUpdateSchema, db: Session = Depends(get_db)):
    q = db.query(QuestionDB).filter(QuestionDB.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại.")

    q_text = payload.get_text()
    if q_text is not None:
        q.question_text = q_text
    if payload.options is not None:
        q.options = [opt.dict() for opt in payload.options]
    c_ans = payload.get_answer_id()
    if c_ans is not None:
        q.correct_answer_id = c_ans
    if payload.explanation is not None:
        q.explanation = payload.explanation
    b_level = payload.get_bloom()
    if b_level is not None:
        q.bloom_level = b_level
    if payload.confidenceScore is not None or payload.confidence_score is not None:
        q.confidence_score = payload.confidenceScore if payload.confidenceScore is not None else payload.confidence_score

    q.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(q)
    return format_question_response(q)

@app.patch("/questions/{question_id}/status")
def update_status(question_id: str, payload: QuestionStatusUpdate, db: Session = Depends(get_db)):
    q = db.query(QuestionDB).filter(QuestionDB.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại.")

    q.status = payload.status
    q.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(q)
    return {"message": "Cập nhật trạng thái thành công.", "question": format_question_response(q)}

@app.post("/questions/batch-approve")
def batch_approve(payload: BatchApproveRequest, db: Session = Depends(get_db)):
    target_ids = payload.get_ids()
    updated_count = db.query(QuestionDB).filter(
        QuestionDB.id.in_(target_ids)
    ).update({"status": "approved", "updated_at": datetime.utcnow()}, synchronize_session=False)

    db.commit()
    return {"message": f"Đã phê duyệt thành công {updated_count} câu hỏi.", "approvedIds": target_ids}

# ====================================================================
# EXAM VARIANT GENERATION (Fisher-Yates Shuffler)
# ====================================================================
@app.post("/exams/generate-variants")
def generate_variants(req: GenerateVariantsRequest, db: Session = Depends(get_db)):
    target_ids = req.selectedQuestionIds or req.questionIds
    resolved_questions = _resolve_questions(req.questions, target_ids, db)

    if not resolved_questions:
        raise HTTPException(status_code=400, detail="Không tìm thấy câu hỏi nào để tạo mã đề thi.")

    variants_data = ExamShuffler.generate_variants(
        questions=resolved_questions,
        exam_code_count=req.examCodeCount,
        base_exam_code=req.baseExamCode,
        shuffle_questions=req.shuffleQuestions,
        shuffle_options=req.shuffleOptions
    )
    return variants_data

# ====================================================================
# EXPORT ENDPOINTS (Word, PDF, QTI, Unified)
# ====================================================================
@app.post("/export/word")
def export_word(req: ExportDocxRequest, db: Session = Depends(get_db)):
    questions = _resolve_questions(req.questions, req.selectedQuestionIds, db)
    if not questions:
        raise HTTPException(status_code=400, detail="Danh sách câu hỏi không được rỗng.")

    docx_bytes = WordExamExporter.generate_docx(
        exam_title=req.get_title(),
        subject=req.get_subject(),
        exam_code=req.get_code(),
        questions=questions,
        university=req.get_university(),
        faculty=req.get_faculty(),
        duration_minutes=req.get_duration(),
        include_answer_key=req.includeAnswerKey,
        include_explanation=req.includeExplanation
    )

    filename = f"De_Thi_{req.get_code()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@app.post("/export/pdf")
def export_pdf(req: ExportPdfRequest, db: Session = Depends(get_db)):
    questions = _resolve_questions(req.questions, req.selectedQuestionIds, db)
    if not questions:
        raise HTTPException(status_code=400, detail="Danh sách câu hỏi không được rỗng.")

    pdf_bytes = PDFExamExporter.generate_pdf(
        exam_title=req.get_title(),
        subject=req.get_subject(),
        exam_code=req.get_code(),
        questions=questions,
        university=req.get_university(),
        faculty=req.get_faculty(),
        duration_minutes=req.get_duration(),
        include_answer_key=req.includeAnswerKey,
        include_omr_sheet=req.includeOmrSheet
    )

    filename = f"De_Thi_{req.get_code()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@app.post("/export/qti")
def export_qti(req: ExportQtiRequest, db: Session = Depends(get_db)):
    questions = _resolve_questions(req.questions, req.selectedQuestionIds, db)
    if not questions:
        raise HTTPException(status_code=400, detail="Danh sách câu hỏi không được rỗng.")

    xml_content = QTIExporter.export_canvas_moodle_xml(title=req.title, questions=questions)
    filename = f"quiz_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xml"

    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@app.post("/export/unified")
@app.post("/export")
@app.post("/exams/export")
def unified_export(req: UnifiedExportRequest, db: Session = Depends(get_db)):
    questions = _resolve_questions(req.questions, req.selectedQuestionIds, db)
    if not questions:
        raise HTTPException(status_code=400, detail="Danh sách câu hỏi trống.")

    export_fmt = (req.format or "docx").lower()

    # Tự động ghi nhật ký hệ thống
    try:
        act_id = f"act-{uuid.uuid4().hex[:8]}"
        db.add(SystemActivityDB(
            id=act_id,
            user_id="lec-001",
            action_type="export_exam",
            title=f"Xuất bản đề thi ({export_fmt.upper()})",
            detail=f"{req.subjectName or 'Đề thi'} - {len(questions)} câu - {req.examCodeCount or 1} mã đề",
            icon_name="Download",
            badge_color="text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
            created_at=datetime.utcnow()
        ))
        db.commit()
    except Exception:
        pass

    if export_fmt == "pdf":
        pdf_bytes = PDFExamExporter.generate_pdf(
            exam_title=req.examTitle or "ĐỀ THI KẾT THÚC HỌC PHẦN",
            subject=req.subjectName or "Kinh tế vi mô",
            exam_code="101",
            questions=questions,
            university=req.universityName or "ĐẠI HỌC QUỐC GIA",
            faculty=req.facultyName or "Khoa Kinh tế & Quản trị",
            duration_minutes=req.durationMinutes or 60,
            include_answer_key=req.includeAnswerKey if req.includeAnswerKey is not None else True,
            include_omr_sheet=req.includeOmrSheet if req.includeOmrSheet is not None else False
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="De_Thi_101.pdf"'}
        )

    elif export_fmt == "qti":
        xml_content = QTIExporter.export_canvas_moodle_xml(
            title=req.examTitle or "Quiz Canvas LMS",
            questions=questions
        )
        return Response(
            content=xml_content,
            media_type="application/xml",
            headers={"Content-Disposition": f'attachment; filename="exam_qti.xml"'}
        )

    else:
        docx_bytes = WordExamExporter.generate_docx(
            exam_title=req.examTitle or "ĐỀ THI KẾT THÚC HỌC PHẦN",
            subject=req.subjectName or "Kinh tế vi mô",
            exam_code="101",
            questions=questions,
            university=req.universityName or "ĐẠI HỌC QUỐC GIA",
            faculty=req.facultyName or "Khoa Kinh tế & Quản trị",
            duration_minutes=req.durationMinutes or 60,
            include_answer_key=req.includeAnswerKey if req.includeAnswerKey is not None else True,
            include_explanation=req.includeExplanation if req.includeExplanation is not None else False
        )
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="De_Thi_101.docx"'}
        )

# ====================================================================
# EXAM RECORD ARCHIVE & HISTORY
# ====================================================================
@app.post("/exams", status_code=status.HTTP_201_CREATED)
def create_exam_record(payload: CreateExamRecordRequest, db: Session = Depends(get_db)):
    eid = payload.id or f"exam-{uuid.uuid4().hex[:8]}"
    new_exam = ExamDB(
        id=eid,
        user_id=payload.get_user_id(),
        title=payload.title,
        subject=payload.subject,
        faculty=payload.faculty or "Khoa Kinh tế & Quản trị",
        university=payload.university or "ĐẠI HỌC QUỐC GIA",
        duration_minutes=payload.get_duration(),
        exam_codes=payload.get_exam_codes(),
        selected_question_ids=payload.get_question_ids(),
        format=payload.format or "docx"
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    return format_exam_response(new_exam)

@app.get("/exams")
def list_exams(
    user_id: Optional[str] = Query("lec-001"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(ExamDB)
    if user_id:
        query = query.filter(ExamDB.user_id == user_id)
    exams = query.order_by(desc(ExamDB.created_at)).limit(limit).all()
    return [format_exam_response(e) for e in exams]

@app.get("/exams/{exam_id}")
def get_exam(exam_id: str, db: Session = Depends(get_db)):
    exam = db.query(ExamDB).filter(ExamDB.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi gói đề thi.")
    return format_exam_response(exam)

# ====================================================================
# ANALYTICS & DASHBOARD
# ====================================================================
@app.get("/exams/analytics")
def get_analytics(db: Session = Depends(get_db)):
    total_q = db.query(QuestionDB).count()
    approved_q = db.query(QuestionDB).filter(QuestionDB.status == "approved").count()
    pending_q = db.query(QuestionDB).filter(QuestionDB.status == "pending").count()
    rejected_q = db.query(QuestionDB).filter(QuestionDB.status == "rejected").count()

    bloom_rows = db.query(
        QuestionDB.bloom_level, func.count(QuestionDB.id)
    ).group_by(QuestionDB.bloom_level).all()

    bloom_dist = {level: count for level, count in bloom_rows}

    total_exams = db.query(ExamDB).count()

    return {
        "totalQuestions": total_q,
        "approvedQuestions": approved_q,
        "pendingQuestions": pending_q,
        "rejectedQuestions": rejected_q,
        "bloomDistribution": {
            "nhanBiet": bloom_dist.get("Nhận biết", 0),
            "thongHieu": bloom_dist.get("Thông hiểu", 0),
            "vanDung": bloom_dist.get("Vận dụng", 0),
            "phanTich": bloom_dist.get("Phân tích", 0)
        },
        "totalExamsPackaged": total_exams
    }

@app.get("/analytics/dashboard")
def get_dashboard_analytics(db: Session = Depends(get_db)):
    try:
        total_questions = db.query(QuestionDB).count()
        approved_questions = db.query(QuestionDB).filter(QuestionDB.status == "approved").count()
        total_exams = db.query(ExamDB).count()
        
        bloom_rows = db.query(
            QuestionDB.bloom_level, func.count(QuestionDB.id)
        ).group_by(QuestionDB.bloom_level).all()
        bloom_dist = {r[0]: r[1] for r in bloom_rows}

        nhan_biet = bloom_dist.get("Nhận biết", 0)
        thong_hieu = bloom_dist.get("Thông hiểu", 0)
        van_dung = bloom_dist.get("Vận dụng", 0)
        phan_tich = bloom_dist.get("Phân tích", 0)

        total_bloom = nhan_biet + thong_hieu + van_dung + phan_tich
        def calc_pct(val):
            return round((val / total_bloom * 100)) if total_bloom > 0 else 0

        activities = db.query(SystemActivityDB).order_by(desc(SystemActivityDB.created_at)).limit(5).all()
        recent_activities = []
        for a in activities:
            recent_activities.append({
                "id": a.id,
                "action": a.title,
                "detail": a.detail,
                "time": a.created_at.strftime("%H:%M - %d/%m") if a.created_at else "Vừa xong",
                "icon": a.icon_name or "FileText",
                "color": a.badge_color or "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
            })

        total_textbooks = 0
        try:
            doc_service_url = os.getenv("DOCUMENT_SERVICE_URL", "http://127.0.0.1:8002")
            if "document-service" in doc_service_url and not os.path.exists("/.dockerenv"):
                doc_service_url = "http://127.0.0.1:8002"
            with httpx.Client(timeout=3.0) as client:
                res = client.get(f"{doc_service_url}/documents")
                if res.status_code == 200:
                    doc_list = res.json()
                    if isinstance(doc_list, list):
                        total_textbooks = len(doc_list)
        except Exception:
            pass

        return {
            "totalTextbooks": total_textbooks,
            "totalApprovedQuestions": approved_questions,
            "totalExamsPackaged": total_exams,
            "bloomDistribution": {
                "nhanBiet": {"count": nhan_biet, "percentage": calc_pct(nhan_biet)},
                "thongHieu": {"count": thong_hieu, "percentage": calc_pct(thong_hieu)},
                "vanDung": {"count": van_dung, "percentage": calc_pct(van_dung)},
                "phanTich": {"count": phan_tich, "percentage": calc_pct(phan_tich)}
            },
            "recentActivities": recent_activities
        }
    except Exception as e:
        return {
            "totalTextbooks": 0,
            "totalApprovedQuestions": 0,
            "totalExamsPackaged": 0,
            "bloomDistribution": {
                "nhanBiet": {"count": 0, "percentage": 0},
                "thongHieu": {"count": 0, "percentage": 0},
                "vanDung": {"count": 0, "percentage": 0},
                "phanTich": {"count": 0, "percentage": 0}
            },
            "recentActivities": []
        }

@app.get("/activities", response_model=List[ActivityResponse])
def list_activities(db: Session = Depends(get_db)):
    acts = db.query(SystemActivityDB).order_by(desc(SystemActivityDB.created_at)).limit(20).all()
    res = []
    for a in acts:
        res.append(ActivityResponse(
            id=a.id,
            action=a.title,
            detail=a.detail,
            time=a.created_at.strftime("%H:%M %d/%m") if a.created_at else "Vừa xong",
            icon=a.icon_name or "FileText",
            color=a.badge_color or "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
        ))
    return res

@app.get("/subjects", response_model=List[SubjectResponse])
def list_subjects(db: Session = Depends(get_db)):
    subjects = db.query(SubjectDB).all()
    return subjects
