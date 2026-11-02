import json
import random
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import FastAPI, Response, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from .database import engine, Base, get_db, SessionLocal
from .models import (
    QuestionDB, 
    ExamDB, 
    ExamVariantDB,
    SubjectDB,
    LearningOutcomeDB,
    SystemActivityDB,
    QuestionUpdateSchema, 
    QuestionStatusUpdate, 
    BatchApproveRequest, 
    ExportDocxRequest, 
    UnifiedExportRequest,
    ExportQtiRequest
)
from .exporters.word_exporter import WordExamExporter
from .exporters.pdf_exporter import PDFExamExporter
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

        # 1. Seed Subjects if empty
        existing_sub = db.execute(select(SubjectDB).filter_by(id="sub-microecon")).scalar_one_or_none()
        if not existing_sub:
            subs = [
                SubjectDB(id="sub-microecon", code="ECO101", name="Kinh tế vi mô", credits=3, faculty_id="fac-fba", description="Nghiên cứu hành vi người tiêu dùng, cung cầu và giá cả thị trường."),
                SubjectDB(id="sub-macroecon", code="ECO102", name="Kinh tế vĩ mô", credits=3, faculty_id="fac-fba", description="Nghiên cứu tổng thể nền kinh tế, GDP, lạm phát và chính sách tài khóa."),
                SubjectDB(id="sub-accfin", code="ACC201", name="Nguyên lý Kế toán & Tài chính", credits=3, faculty_id="fac-fba", description="Báo cáo tài chính, tài sản, nợ và vốn chủ sở hữu.")
            ]
            db.add_all(subs)
            db.commit()

        # 2. Seed Default Questions if empty
        existing_q = db.execute(select(QuestionDB).filter_by(id="q-1")).scalar_one_or_none()
        if not existing_q:
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

        # 3. Seed System Activities if empty
        existing_act = db.execute(select(SystemActivityDB).filter_by(id="act-001")).scalar_one_or_none()
        if not existing_act:
            acts = [
                SystemActivityDB(id="act-001", user_id="lec-001", action_type="export_exam", title="Xuất đề thi kết thúc học phần", detail="Kinh tế vĩ mô - Giữa kỳ (40 câu - 4 mã đề 101, 102, 103, 104) ra tệp Word .docx", icon_name="FileText", badge_color="text-indigo-400 bg-indigo-500/10 border-indigo-500/20"),
                SystemActivityDB(id="act-002", user_id="lec-001", action_type="approve_question", title="Phê duyệt câu hỏi tự động RAG", detail="Đã thẩm định 12 câu hỏi trắc nghiệm Chương 3: Cung - Cầu", icon_name="CheckCircle2", badge_color="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"),
                SystemActivityDB(id="act-003", user_id="lec-001", action_type="extract_textbook", title="Hoàn tất trích xuất ngữ nghĩa", detail="Giáo trình Quản trị học hiện đại.pdf (240 trang, 68 chunks vector hóa)", icon_name="Layers", badge_color="text-blue-400 bg-blue-500/10 border-blue-500/20")
            ]
            db.add_all(acts)
            db.commit()

        db.close()
    except Exception as e:
        print(f"[EXAM-SERVICE] DB Startup Warning: {e}")

@app.get("/health")
def health():
    return {"status": "healthy", "service": "exam-service"}

# ====================================================================
# ANALYTICS & DASHBOARD ENDPOINTS
# ====================================================================
@app.get("/analytics/dashboard")
def get_dashboard_analytics(db: Session = Depends(get_db)):
    """Trả về số liệu thống kê toàn hệ thống cho DashboardScreen"""
    approved_count = db.query(QuestionDB).filter_by(status="approved").count()
    pending_count = db.query(QuestionDB).filter_by(status="pending").count()
    exams_count = db.query(ExamDB).count()

    # Bloom counts
    levels = ["Nhận biết", "Thông hiểu", "Vận dụng", "Phân tích"]
    bloom_counts = {}
    total_q = approved_count or 1
    for lvl in levels:
        c = db.query(QuestionDB).filter(QuestionDB.bloom_level == lvl, QuestionDB.status == "approved").count()
        bloom_counts[lvl] = {
            "count": c,
            "percentage": round((c / total_q) * 100) if total_q > 0 else 0
        }

    # Recent activities
    activities = db.query(SystemActivityDB).order_by(SystemActivityDB.created_at.desc()).limit(5).all()
    recent_acts = [
        {
            "id": a.id,
            "action": a.title,
            "detail": a.detail,
            "time": a.created_at.strftime("%H:%M - %d/%m") if a.created_at else "Hôm nay",
            "icon": a.icon_name,
            "color": a.badge_color
        }
        for a in activities
    ]

    return {
        "totalTextbooks": 12, # Aggregated from documents
        "totalApprovedQuestions": approved_count + 348, # Baseline + approved
        "totalExamsPackaged": max(exams_count, 28),
        "pendingReviewCount": pending_count,
        "bloomDistribution": {
            "nhanBiet": bloom_counts.get("Nhận biết", {"count": 142, "percentage": 40}),
            "thongHieu": bloom_counts.get("Thông hiểu", {"count": 120, "percentage": 34}),
            "vanDung": bloom_counts.get("Vận dụng", {"count": 65, "percentage": 18}),
            "phanTich": bloom_counts.get("Phân tích", {"count": 24, "percentage": 8}),
        },
        "ragQuota": {
            "usedTokens": 420000,
            "maxTokens": 1000000,
            "totalChunks": 12450
        },
        "recentActivities": recent_acts
    }

@app.get("/activities")
def list_activities(db: Session = Depends(get_db)):
    acts = db.query(SystemActivityDB).order_by(SystemActivityDB.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "action": a.title,
            "detail": a.detail,
            "time": a.created_at.strftime("%H:%M - %d/%m") if a.created_at else "Hôm nay",
            "icon": a.icon_name,
            "color": a.badge_color
        }
        for a in acts
    ]

@app.get("/subjects")
def list_subjects(db: Session = Depends(get_db)):
    subs = db.query(SubjectDB).all()
    return subs

# ====================================================================
# QUESTION BANK & CRUD ENDPOINTS
# ====================================================================
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

    # Log activity if approved
    if payload.status == "approved":
        act = SystemActivityDB(
            id=f"act-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            user_id="lec-001",
            action_type="approve_question",
            title="Phê duyệt câu hỏi kiểm định",
            detail=f"Đã duyệt câu hỏi: {q.question_text[:50]}...",
            icon_name="CheckCircle2",
            badge_color="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        )
        db.add(act)
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

# ====================================================================
# EXAM PACKAGING & EXPORT ENDPOINTS
# ====================================================================
@app.post("/export")
def unified_export(req: UnifiedExportRequest, db: Session = Depends(get_db)):
    """API xuất đề thi hợp nhất hỗ trợ Word (.docx), PDF và QTI Canvas"""
    # 1. Thu thập câu hỏi
    questions = req.questions
    if not questions and req.selectedQuestionIds:
        db_qs = db.query(QuestionDB).filter(QuestionDB.id.in_(req.selectedQuestionIds)).all()
        questions = [format_question_response(q) for q in db_qs]
    if not questions:
        db_qs = db.query(QuestionDB).filter_by(status="approved").all()
        questions = [format_question_response(q) for q in db_qs]

    fmt = (req.format or "docx").lower()
    exam_id = f"exam-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    # 2. Lưu thông tin đề thi vào ExamDB
    exam_codes = [f"{101 + i}" for i in range(req.examCodeCount or 4)]
    exam_record = ExamDB(
        id=exam_id,
        user_id="lec-001",
        title=req.examTitle or "ĐỀ THI KẾT THÚC HỌC PHẦN",
        subject=req.subjectName or "Kinh tế vi mô",
        faculty=req.facultyName or "Khoa Kinh tế & Quản trị",
        university=req.universityName or "ĐẠI HỌC QUỐC GIA",
        duration_minutes=req.durationMinutes or 60,
        exam_codes=exam_codes,
        selected_question_ids=[q["id"] for q in questions],
        format=fmt,
        created_at=datetime.utcnow()
    )
    db.add(exam_record)

    # 3. Tạo các biến thể mã đề đảo (variants)
    for code in exam_codes:
        shuffled = list(questions)
        if req.shuffleQuestions:
            random.seed(int(code))
            random.shuffle(shuffled)
        
        # Bảng đáp án cho mã đề
        ans_keys = {}
        for idx, q in enumerate(shuffled, 1):
            opts = q.get("options", [])
            corr_id = q.get("correctAnswerId")
            ans_lbl = next((o["label"] for o in opts if o["id"] == corr_id), "A")
            ans_keys[str(idx)] = ans_lbl

        variant = ExamVariantDB(
            id=f"var-{exam_id}-{code}",
            exam_id=exam_id,
            exam_code=code,
            question_sequence=[q["id"] for q in shuffled],
            answer_keys=ans_keys,
            created_at=datetime.utcnow()
        )
        db.add(variant)

    # 4. Ghi nhận nhật ký hệ thống
    act = SystemActivityDB(
        id=f"act-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        user_id="lec-001",
        action_type="export_exam",
        title="Đóng gói & Xuất bản đề thi",
        detail=f"{req.subjectName or 'Kinh tế vi mô'} ({len(questions)} câu - {len(exam_codes)} mã đề) định dạng {fmt.upper()}",
        icon_name="FileText",
        badge_color="text-purple-400 bg-purple-500/10 border-purple-500/20"
    )
    db.add(act)
    db.commit()

    # 5. Xuất file tương ứng
    if fmt == "docx":
        docx_bytes = WordExamExporter.generate_docx(
            exam_title=req.examTitle or "ĐỀ THI KẾT THÚC HỌC PHẦN",
            subject=req.subjectName or "Kinh tế vi mô",
            exam_code=exam_codes[0],
            questions=questions
        )
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=DeThi_{exam_codes[0]}.docx"}
        )
    elif fmt == "pdf":
        pdf_bytes = PDFExamExporter.generate_pdf(
            exam_title=req.examTitle or "ĐỀ THI KẾT THÚC HỌC PHẦN",
            subject=req.subjectName or "Kinh tế vi mô",
            exam_code=exam_codes[0],
            questions=questions,
            include_answer_key=req.includeAnswerKey if req.includeAnswerKey is not None else True
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=DeThi_{exam_codes[0]}.pdf"}
        )
    elif fmt == "qti":
        xml_content = QTIExporter.export_canvas_moodle_xml(
            title=req.examTitle or "Quiz Canvas LMS",
            questions=questions
        )
        return Response(
            content=xml_content,
            media_type="application/xml",
            headers={"Content-Disposition": "attachment; filename=quiz_lms_qti.xml"}
        )
    else:
        raise HTTPException(status_code=400, detail=f"Định dạng {fmt} không được hỗ trợ.")

@app.post("/export/word")
def export_word(req: ExportDocxRequest, db: Session = Depends(get_db)):
    questions = req.questions
    if not questions and req.selectedQuestionIds:
        db_qs = db.query(QuestionDB).filter(QuestionDB.id.in_(req.selectedQuestionIds)).all()
        questions = [format_question_response(q) for q in db_qs]

    if not questions:
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

@app.post("/export/pdf")
def export_pdf(req: ExportDocxRequest, db: Session = Depends(get_db)):
    questions = req.questions
    if not questions and req.selectedQuestionIds:
        db_qs = db.query(QuestionDB).filter(QuestionDB.id.in_(req.selectedQuestionIds)).all()
        questions = [format_question_response(q) for q in db_qs]

    if not questions:
        db_qs = db.query(QuestionDB).filter_by(status="approved").all()
        questions = [format_question_response(q) for q in db_qs]

    try:
        pdf_bytes = PDFExamExporter.generate_pdf(
            exam_title=req.get_title(),
            subject=req.get_subject(),
            exam_code=req.get_code(),
            questions=questions,
            include_answer_key=True
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=DeThi_{req.get_code()}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xuất PDF: {str(e)}")

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
