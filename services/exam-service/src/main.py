import io
import json
import uuid
import random
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import FastAPI, Response, HTTPException, Depends, Query, Request, Header, status
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
    ExamAuditLogDB,
    QuestionAuditLogDB,
    OptionSchema,
    QuestionCreateSchema,
    QuestionUpdateSchema, 
    QuestionStatusUpdate, 
    BatchApproveRequest,
    QuestionReviewRequest,
    QuestionAuditLogResponse,
    BloomLevelStat,
    BloomTaxonomyResponse,
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
    version="1.2.0",
    description="Microservice quản lý Ngân hàng câu hỏi, Kiểm toán Khảo thí (Audit Trail), Tỷ lệ Bloom, Đảo đa mã đề (Fisher-Yates) và Xuất bản Khảo thí (Word, PDF, QTI)"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cache_client = RedisCacheClient()

# ====================================================================
# SERIALIZATION & FORMATTING HELPERS
# ====================================================================
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


def format_audit_log_response(log: QuestionAuditLogDB) -> dict:
    prev = log.previous_state if isinstance(log.previous_state, dict) else json.loads(log.previous_state or "{}") if isinstance(log.previous_state, str) else {}
    nxt = log.new_state if isinstance(log.new_state, dict) else json.loads(log.new_state or "{}") if isinstance(log.new_state, str) else {}
    diff = log.field_changes if isinstance(log.field_changes, dict) else json.loads(log.field_changes or "{}") if isinstance(log.field_changes, str) else {}
    return {
        "id": log.id,
        "questionId": log.question_id,
        "lecturerId": log.lecturer_id,
        "action": log.action,
        "changeSummary": log.change_summary or "",
        "fieldChanges": diff,
        "editReason": log.edit_reason or "",
        "previousState": prev,
        "newState": nxt,
        "ipAddress": log.ip_address or "",
        "performedAt": log.performed_at.strftime("%H:%M - %d/%m/%Y") if log.performed_at else "Hôm nay"
    }


def record_question_audit_log(
    db: Session,
    question_id: str,
    lecturer_id: str,
    action: str,
    previous_state: Optional[Dict[str, Any]] = None,
    new_state: Optional[Dict[str, Any]] = None,
    change_summary: Optional[str] = None,
    field_changes: Optional[Dict[str, Any]] = None,
    edit_reason: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> QuestionAuditLogDB:
    """[SCRUM-58] Ghi nhận vết khảo thí và lịch sử chỉnh sửa câu hỏi của giảng viên"""
    log_id = f"q-audit-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
    entry = QuestionAuditLogDB(
        id=log_id,
        question_id=question_id,
        lecturer_id=lecturer_id or "lec-001",
        action=action,
        previous_state=previous_state,
        new_state=new_state,
        change_summary=change_summary,
        field_changes=field_changes,
        edit_reason=edit_reason,
        ip_address=ip_address,
        user_agent=user_agent,
        performed_at=datetime.utcnow()
    )
    db.add(entry)
    return entry


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


# Thang đo chuẩn mực sư phạm Bloom (40% - 30% - 20% - 10%)
BLOOM_LEVEL_STANDARDS = {
    "Nhận biết": {
        "english": "Remember",
        "targetPercentage": 40.0,
        "color": "#38bdf8",
        "badgeColor": "text-sky-400 bg-sky-500/10 border-sky-500/20"
    },
    "Thông hiểu": {
        "english": "Understand",
        "targetPercentage": 30.0,
        "color": "#2dd4bf",
        "badgeColor": "text-teal-400 bg-teal-500/10 border-teal-500/20"
    },
    "Vận dụng": {
        "english": "Apply",
        "targetPercentage": 20.0,
        "color": "#fbbf24",
        "badgeColor": "text-amber-400 bg-amber-500/10 border-amber-500/20"
    },
    "Phân tích": {
        "english": "Analyze",
        "targetPercentage": 10.0,
        "color": "#c084fc",
        "badgeColor": "text-purple-400 bg-purple-500/10 border-purple-500/20"
    }
}


def calculate_bloom_taxonomy_stats(
    db: Session,
    status: Optional[str] = None,
    document_id: Optional[str] = None,
    chapter: Optional[str] = None
) -> Dict[str, Any]:
    """[SCRUM-58] Thuật toán tính toán phân bổ tỷ lệ nhận thức Bloom toàn diện kèm khuyến nghị sư phạm AI"""
    query = db.query(QuestionDB)
    if status and status != "all":
        query = query.filter(QuestionDB.status == status)
    if document_id:
        query = query.filter(QuestionDB.document_id == document_id)
    if chapter:
        query = query.filter(QuestionDB.chapter.ilike(f"%{chapter}%"))

    all_questions = query.all()
    total_count = len(all_questions)

    # Đếm theo từng mức độ nhận thức
    counts: Dict[str, int] = {lvl: 0 for lvl in BLOOM_LEVEL_STANDARDS}
    for q in all_questions:
        lvl = q.bloom_level
        if lvl in counts:
            counts[lvl] += 1
        elif lvl:
            for standard_lvl in BLOOM_LEVEL_STANDARDS:
                if standard_lvl.lower() in lvl.lower():
                    counts[standard_lvl] += 1
                    break

    distribution = {}
    base_divisor = total_count if total_count > 0 else 1
    for lvl, std in BLOOM_LEVEL_STANDARDS.items():
        c = counts[lvl]
        pct = round((c / base_divisor) * 100, 1) if total_count > 0 else 0.0
        deviation = round(pct - std["targetPercentage"], 1)
        distribution[lvl] = {
            "level": lvl,
            "english": std["english"],
            "count": c,
            "percentage": pct,
            "targetPercentage": std["targetPercentage"],
            "deviation": deviation,
            "color": std["color"],
            "badgeColor": std["badgeColor"]
        }

    # Tổng hợp mức độ tư duy cơ bản (Nhận biết + Thông hiểu) và nâng cao (Vận dụng + Phân tích)
    basic_count = counts["Nhận biết"] + counts["Thông hiểu"]
    advanced_count = counts["Vận dụng"] + counts["Phân tích"]
    basic_pct = round((basic_count / base_divisor) * 100, 1) if total_count > 0 else 0.0
    advanced_pct = round((advanced_count / base_divisor) * 100, 1) if total_count > 0 else 0.0

    if 65.0 <= basic_pct <= 75.0:
        balance_status = "optimal"
        balance_label = "Chuẩn mực cân bằng sư phạm (65% - 75% cơ bản)"
    elif basic_pct > 75.0:
        balance_status = "skewed_basic"
        balance_label = "Thiên về kiến thức nền tảng & ghi nhớ (> 75%)"
    else:
        balance_status = "skewed_advanced"
        balance_label = "Độ phân hóa cao, nhiều câu hỏi vận dụng (> 35%)"

    # Khuyến nghị sư phạm AI
    if total_count == 0:
        rec = "Chưa có câu hỏi nào trong tập dữ liệu lọc. Khuyến nghị nạp giáo trình và sinh tự động câu hỏi bằng RAG."
    elif counts["Phân tích"] == 0:
        rec = (
            f"Ma trận hiện tại có {basic_pct}% câu hỏi cơ bản và {advanced_pct}% câu hỏi nâng cao. "
            "Cần sinh bổ sung thêm các câu hỏi mức độ 'Phân tích' để đáp ứng chuẩn đầu ra kỳ thi kết thúc học phần."
        )
    elif basic_pct > 75.0:
        needed_adv = max(1, round(total_count * 0.15))
        rec = (
            f"Tỷ lệ nhận thức đang tập trung nhiều vào mức độ ghi nhớ ({basic_pct}%). "
            f"Khuyến nghị bổ sung khoảng {needed_adv} câu hỏi Vận dụng & Tình huống thực tiễn để tăng tính phân loại thí sinh."
        )
    else:
        rec = (
            f"Ma trận nhận thức đạt tỷ lệ chuẩn mực sư phạm ({basic_pct}% cơ bản - {advanced_pct}% nâng cao). "
            "Rất phù hợp để tổ chức thi đánh giá năng lực toàn diện hoặc thi kết thúc học phần."
        )

    return {
        "totalQuestions": total_count,
        "filter": {
            "status": status or "all",
            "documentId": document_id,
            "chapter": chapter
        },
        "distribution": {
            "nhanBiet": distribution["Nhận biết"],
            "thongHieu": distribution["Thông hiểu"],
            "vanDung": distribution["Vận dụng"],
            "phanTich": distribution["Phân tích"]
        },
        "summary": {
            "basicCount": basic_count,
            "basicPercentage": basic_pct,
            "advancedCount": advanced_count,
            "advancedPercentage": advanced_pct,
            "balanceStatus": balance_status,
            "balanceLabel": balance_label
        },
        "pedagogicalRecommendation": rec,
        "generatedAt": datetime.utcnow().strftime("%H:%M:%S %d/%m/%Y")
    }


# ====================================================================
# DATABASE STARTUP & SEEDING
# ====================================================================
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

        # 2. Seed Default Questions across all 4 Bloom levels
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
                ),
                QuestionDB(
                    id="q-4",
                    document_id="tb-001",
                    source_chunk_id="chunk-4",
                    textbook_name="GiaoTrinh_KinhTeViMo_2025.pdf",
                    chapter="Chương 4: Lý thuyết hành vi người tiêu dùng",
                    bloom_level="Phân tích",
                    question_text="Khi giá một hàng hóa thông thường giảm xuống, phân tích tác động thay thế (Substitution Effect) và tác động thu nhập (Income Effect) lên lượng cầu:",
                    options=[
                        {"id": "opt-a", "label": "A", "text": "Cả tác động thay thế và tác động thu nhập đều cùng chiều làm tăng lượng cầu"},
                        {"id": "opt-b", "label": "B", "text": "Tác động thay thế làm tăng cầu, tác động thu nhập làm giảm cầu"},
                        {"id": "opt-c", "label": "C", "text": "Tác động thu nhập lấn át hoàn toàn và triệt tiêu tác động thay thế"},
                        {"id": "opt-d", "label": "D", "text": "Không thể xác định vì phụ thuộc vào mức thuế suất chính phủ"}
                    ],
                    correct_answer_id="opt-a",
                    explanation="Đối với hàng hóa thông thường, giá giảm làm tăng sức mua thực tế (tác động thu nhập dương) đồng thời làm hàng hóa tương đối rẻ hơn so với hàng thay thế (tác động thay thế dương), cả hai cùng củng cố làm tăng lượng cầu.",
                    confidence_score=96,
                    status="approved",
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

        # 4. Seed Question Audit Logs if empty
        existing_q_audit = db.execute(select(QuestionAuditLogDB).filter_by(id="q-audit-001")).scalar_one_or_none()
        if not existing_q_audit:
            audits = [
                QuestionAuditLogDB(
                    id="q-audit-001",
                    question_id="q-1",
                    lecturer_id="lec-001",
                    action="approve",
                    previous_state={"status": "pending", "bloom_level": "Nhận biết"},
                    new_state={"status": "approved", "bloom_level": "Nhận biết"},
                    change_summary="Phê duyệt câu hỏi trắc nghiệm kiểm định đạt chuẩn",
                    field_changes={"status": {"old": "pending", "new": "approved"}},
                    edit_reason="Câu hỏi chuẩn xác theo quy luật Cung - Cầu trong giáo trình",
                    ip_address="192.168.1.10",
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    performed_at=datetime.utcnow()
                ),
                QuestionAuditLogDB(
                    id="q-audit-002",
                    question_id="q-1",
                    lecturer_id="lec-001",
                    action="inline_edit",
                    previous_state={"question_text": "Theo quy luật cầu, điều gì xảy ra?", "bloom_level": "Nhận biết"},
                    new_state={"question_text": "Theo quy luật cầu, trong điều kiện các yếu tố khác không đổi, phát biểu nào sau đây là chính xác?", "bloom_level": "Nhận biết"},
                    change_summary="Chuẩn hóa câu hỏi: Thêm điều kiện ceteris paribus (các yếu tố khác không đổi)",
                    field_changes={"question_text": {"old": "Theo quy luật cầu, điều gì xảy ra?", "new": "Theo quy luật cầu, trong điều kiện các yếu tố khác không đổi, phát biểu nào sau đây là chính xác?"}},
                    edit_reason="Đảm bảo tính chặt chẽ về mặt khoa học kinh tế học",
                    ip_address="192.168.1.10",
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    performed_at=datetime.utcnow()
                ),
                QuestionAuditLogDB(
                    id="q-audit-003",
                    question_id="q-2",
                    lecturer_id="lec-002",
                    action="inline_edit",
                    previous_state={"bloom_level": "Nhận biết", "correct_answer_id": "opt-a"},
                    new_state={"bloom_level": "Thông hiểu", "correct_answer_id": "opt-c"},
                    change_summary="Nâng mức độ Bloom lên Thông hiểu và hiệu chỉnh đáp án đúng C",
                    field_changes={"bloom_level": {"old": "Nhận biết", "new": "Thông hiểu"}, "correct_answer_id": {"old": "opt-a", "new": "opt-c"}},
                    edit_reason="Yêu cầu suy luận về tác động chéo của hàng hóa thay thế",
                    ip_address="192.168.1.25",
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    performed_at=datetime.utcnow()
                )
            ]
            db.add_all(audits)
            db.commit()

        db.close()
    except Exception as e:
        print(f"[EXAM-SERVICE] DB Startup Warning: {e}")


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
        "version": "1.2.0",
        "database": db_status,
        "cache": "connected" if cache_client.is_connected else "in-memory"
    }


# ====================================================================
# QUESTION BANK & CRUD WITH FULL AUDIT LOGGING
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
def update_question(
    question_id: str, 
    payload: QuestionUpdateSchema, 
    request: Request,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    [SCRUM-58] Cập nhật câu hỏi và tự động ghi nhận vết chỉnh sửa của giảng viên vào exams.question_audit_logs.
    Tính toán diff chi tiết (field_changes), lưu previous_state/new_state và tạo change_summary.
    """
    q = db.query(QuestionDB).filter(QuestionDB.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại.")

    # 1. Chụp lại snapshot trạng thái trước khi sửa
    previous_state = {
        "question": q.question_text,
        "options": q.options,
        "correctAnswerId": q.correct_answer_id,
        "explanation": q.explanation,
        "bloomLevel": q.bloom_level,
        "confidenceScore": q.confidence_score,
        "status": q.status
    }

    # 2. Phát hiện và ghi nhận các trường có thay đổi (field_changes)
    field_changes: Dict[str, Any] = {}
    changes_desc = []

    new_q_text = payload.get_question_text()
    if new_q_text is not None and new_q_text != q.question_text:
        field_changes["question"] = {"old": q.question_text, "new": new_q_text}
        changes_desc.append("nội dung câu hỏi")
        q.question_text = new_q_text

    if payload.options is not None:
        opts_dict = [opt.dict() for opt in payload.options]
        if opts_dict != q.options:
            field_changes["options"] = {"old": q.options, "new": opts_dict}
            changes_desc.append("các lựa chọn trả lời")
            q.options = opts_dict

    new_corr = payload.get_correct_answer_id()
    if new_corr is not None and new_corr != q.correct_answer_id:
        field_changes["correctAnswerId"] = {"old": q.correct_answer_id, "new": new_corr}
        changes_desc.append(f"đáp án đúng ({q.correct_answer_id} -> {new_corr})")
        q.correct_answer_id = new_corr

    if payload.explanation is not None and payload.explanation != q.explanation:
        field_changes["explanation"] = {"old": q.explanation, "new": payload.explanation}
        changes_desc.append("lời giải thích chi tiết")
        q.explanation = payload.explanation

    new_bloom = payload.get_bloom_level()
    if new_bloom is not None and new_bloom != q.bloom_level:
        field_changes["bloomLevel"] = {"old": q.bloom_level, "new": new_bloom}
        changes_desc.append(f"mức nhận thức Bloom ({q.bloom_level} -> {new_bloom})")
        q.bloom_level = new_bloom

    new_conf = payload.get_confidence_score()
    if new_conf is not None and new_conf != q.confidence_score:
        field_changes["confidenceScore"] = {"old": q.confidence_score, "new": new_conf}
        q.confidence_score = new_conf

    # 3. Snapshot trạng thái mới
    new_state = {
        "question": q.question_text,
        "options": q.options,
        "correctAnswerId": q.correct_answer_id,
        "explanation": q.explanation,
        "bloomLevel": q.bloom_level,
        "confidenceScore": q.confidence_score,
        "status": q.status
    }

    # 4. Xác định action & tạo change summary
    if payload.action:
        action_name = payload.action
    elif "bloomLevel" in field_changes and len(field_changes) == 1:
        action_name = "update_bloom"
    else:
        action_name = "inline_edit"

    if changes_desc:
        summary = f"Giảng viên chỉnh sửa {', '.join(changes_desc)}"
    else:
        summary = "Hiệu chỉnh và xác nhận nội dung câu hỏi"

    # 5. Lưu vào question_audit_logs
    lecturer = payload.get_lecturer_id() or x_user_id or "lec-001"
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    record_question_audit_log(
        db=db,
        question_id=q.id,
        lecturer_id=lecturer,
        action=action_name,
        previous_state=previous_state,
        new_state=new_state,
        change_summary=summary,
        field_changes=field_changes,
        edit_reason=payload.get_edit_reason(),
        ip_address=client_ip,
        user_agent=user_agent
    )

    q.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(q)
    return format_question_response(q)


@app.patch("/questions/{question_id}/status")
def update_status(
    question_id: str, 
    payload: QuestionStatusUpdate, 
    request: Request,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """[SCRUM-58] Cập nhật trạng thái câu hỏi và ghi nhận audit log"""
    q = db.query(QuestionDB).filter(QuestionDB.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại.")

    old_status = q.status
    q.status = payload.status
    q.updated_at = datetime.utcnow()

    # Xác định action
    if payload.status == "approved":
        act_action = "approve"
        summary = f"Phê duyệt câu hỏi kiểm định (từ '{old_status}' sang 'approved')"
    elif payload.status == "rejected":
        act_action = "reject"
        summary = f"Từ chối câu hỏi kiểm định (từ '{old_status}' sang 'rejected')"
    else:
        act_action = "status_change"
        summary = f"Chuyển trạng thái câu hỏi từ '{old_status}' sang '{payload.status}'"

    lecturer = payload.lecturer_id or payload.lecturerId or x_user_id or "lec-001"
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    # Ghi nhận vết khảo thí
    record_question_audit_log(
        db=db,
        question_id=q.id,
        lecturer_id=lecturer,
        action=act_action,
        previous_state={"status": old_status},
        new_state={"status": q.status},
        change_summary=summary,
        field_changes={"status": {"old": old_status, "new": q.status}},
        edit_reason=payload.reason,
        ip_address=client_ip,
        user_agent=user_agent
    )

    # Ghi nhật ký hệ thống chung nếu approved
    if payload.status == "approved":
        try:
            act = SystemActivityDB(
                id=f"act-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4]}",
                user_id=lecturer,
                action_type="approve_question",
                title="Phê duyệt câu hỏi kiểm định",
                detail=f"Đã duyệt câu hỏi: {q.question_text[:50]}...",
                icon_name="CheckCircle2",
                badge_color="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            )
            db.add(act)
        except Exception:
            pass

    db.commit()
    db.refresh(q)
    return {"message": "Cập nhật trạng thái thành công.", "question": format_question_response(q)}


@app.post("/questions/{question_id}/review")
def review_question(
    question_id: str,
    payload: QuestionReviewRequest,
    request: Request,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """[SCRUM-58] Endpoint khảo thí chuyên sâu cho giảng viên đánh giá, để lại nhận xét và điều chỉnh Bloom"""
    q = db.query(QuestionDB).filter(QuestionDB.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi.")

    old_status = q.status
    old_bloom = q.bloom_level
    field_changes: Dict[str, Any] = {}

    if payload.action == "approve":
        q.status = "approved"
        field_changes["status"] = {"old": old_status, "new": "approved"}
    elif payload.action == "reject":
        q.status = "rejected"
        field_changes["status"] = {"old": old_status, "new": "rejected"}

    new_bloom = payload.bloom_level or payload.bloomLevel
    if new_bloom and new_bloom != q.bloom_level:
        field_changes["bloomLevel"] = {"old": old_bloom, "new": new_bloom}
        q.bloom_level = new_bloom

    lecturer = payload.lecturer_id or payload.lecturerId or x_user_id or "lec-001"
    reason = payload.edit_reason or payload.editReason or payload.comment or "Đánh giá chuyên môn từ giảng viên"
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    log_entry = record_question_audit_log(
        db=db,
        question_id=q.id,
        lecturer_id=lecturer,
        action=payload.action,
        previous_state={"status": old_status, "bloom_level": old_bloom},
        new_state={"status": q.status, "bloom_level": q.bloom_level},
        change_summary=f"Khảo thí viên thực hiện '{payload.action}' kèm nhận xét chuyên môn",
        field_changes=field_changes,
        edit_reason=reason,
        ip_address=client_ip,
        user_agent=user_agent
    )

    q.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(q)
    return {
        "status": "success",
        "question": format_question_response(q),
        "auditLog": format_audit_log_response(log_entry)
    }


@app.post("/questions/batch-approve")
def batch_approve(
    payload: BatchApproveRequest, 
    request: Request,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """[SCRUM-58] Phê duyệt hàng loạt câu hỏi và lưu vết audit log cho từng câu hỏi"""
    target_ids = payload.get_ids()
    lecturer = payload.lecturerId or x_user_id or "lec-001"
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    for qid in target_ids:
        record_question_audit_log(
            db=db,
            question_id=qid,
            lecturer_id=lecturer,
            action="approve",
            previous_state={"status": "pending"},
            new_state={"status": "approved"},
            change_summary="Phê duyệt hàng loạt qua giao diện thẩm định Khảo thí",
            field_changes={"status": {"old": "pending", "new": "approved"}},
            edit_reason="Phê duyệt hàng loạt theo ma trận đề thi",
            ip_address=client_ip,
            user_agent=user_agent
        )

    updated_count = db.query(QuestionDB).filter(
        QuestionDB.id.in_(target_ids)
    ).update({"status": "approved", "updated_at": datetime.utcnow()}, synchronize_session=False)

    db.commit()
    return {"message": f"Đã phê duyệt thành công {updated_count} câu hỏi.", "approvedIds": target_ids}


# ====================================================================
# [SCRUM-58] QUESTION AUDIT TRAIL & REVISION HISTORY ENDPOINTS
# ====================================================================
@app.get("/questions/{question_id}/audit-logs")
def get_question_audit_logs(question_id: str, db: Session = Depends(get_db)):
    """[SCRUM-58] Lấy toàn bộ lịch sử chỉnh sửa và vết khảo thí của một câu hỏi cụ thể"""
    q = db.query(QuestionDB).filter(QuestionDB.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi.")

    logs = (
        db.query(QuestionAuditLogDB)
        .filter(QuestionAuditLogDB.question_id == question_id)
        .order_by(QuestionAuditLogDB.performed_at.desc())
        .all()
    )
    return [format_audit_log_response(log) for log in logs]


@app.get("/audit-logs/questions")
def list_question_audit_logs(
    question_id: Optional[str] = None,
    lecturer_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """[SCRUM-58] Truy vấn danh sách vết khảo thí toàn hệ thống có phân trang và bộ lọc"""
    query = db.query(QuestionAuditLogDB)
    if question_id:
        query = query.filter(QuestionAuditLogDB.question_id == question_id)
    if lecturer_id:
        query = query.filter(QuestionAuditLogDB.lecturer_id == lecturer_id)
    if action:
        query = query.filter(QuestionAuditLogDB.action == action)

    total = query.count()
    logs = query.order_by(QuestionAuditLogDB.performed_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [format_audit_log_response(l) for l in logs]
    }


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

    # Tự động ghi nhật ký hệ thống & audit logs
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

    # Ghi nhận exam audit log
    try:
        exam_audit = ExamAuditLogDB(
            id=f"exam-audit-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4]}",
            exam_id=eid,
            user_id=payload.get_user_id(),
            action="create",
            details={"title": payload.title, "exam_codes": payload.get_exam_codes(), "question_count": len(payload.get_question_ids())},
            performed_at=datetime.utcnow()
        )
        db.add(exam_audit)
    except Exception:
        pass

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


# ====================================================================
# [SCRUM-58] ANALYTICS & BLOOM TAXONOMY ENDPOINTS
# ====================================================================
@app.get("/analytics/bloom")
@app.get("/questions/statistics/bloom")
def get_bloom_taxonomy_analytics(
    status: Optional[str] = Query(None, description="Trạng thái câu hỏi: approved, pending, rejected, hoặc all"),
    document_id: Optional[str] = Query(None, description="Mã tài liệu giáo trình lọc"),
    chapter: Optional[str] = Query(None, description="Tên chương lọc"),
    db: Session = Depends(get_db)
):
    """
    [SCRUM-58] Hoàn thiện endpoint thống kê phân bổ tỷ lệ nhận thức Bloom.
    Trả về số lượng, tỷ lệ %, độ lệch so với chuẩn sư phạm 40-30-20-10, 
    chỉ số cân bằng cơ bản/nâng cao và khuyến nghị sư phạm AI.
    """
    stats = calculate_bloom_taxonomy_stats(
        db=db,
        status=status,
        document_id=document_id,
        chapter=chapter
    )
    return stats


@app.get("/analytics/dashboard")
def get_dashboard_analytics(db: Session = Depends(get_db)):
    """Trả về số liệu thống kê toàn hệ thống cho DashboardScreen đồng bộ với Bloom Statistics"""
    try:
        total_questions = db.query(QuestionDB).count()
        approved_count = db.query(QuestionDB).filter(QuestionDB.status == "approved").count()
        pending_count = db.query(QuestionDB).filter(QuestionDB.status == "pending").count()
        total_exams = db.query(ExamDB).count()

        bloom_stats = calculate_bloom_taxonomy_stats(db=db, status="approved")

        activities = db.query(SystemActivityDB).order_by(desc(SystemActivityDB.created_at)).limit(5).all()
        recent_acts = [
            {
                "id": a.id,
                "action": a.title,
                "detail": a.detail,
                "time": a.created_at.strftime("%H:%M - %d/%m") if a.created_at else "Hôm nay",
                "icon": a.icon_name or "FileText",
                "color": a.badge_color or "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
            }
            for a in activities
        ]

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
            "totalApprovedQuestions": approved_count,
            "totalExamsPackaged": total_exams,
            "pendingReviewCount": pending_count,
            "bloomDistribution": {
                "nhanBiet": bloom_stats["distribution"]["nhanBiet"],
                "thongHieu": bloom_stats["distribution"]["thongHieu"],
                "vanDung": bloom_stats["distribution"]["vanDung"],
                "phanTich": bloom_stats["distribution"]["phanTich"],
            },
            "bloomSummary": bloom_stats["summary"],
            "pedagogicalRecommendation": bloom_stats["pedagogicalRecommendation"],
            "ragQuota": {
                "usedTokens": 420000,
                "maxTokens": 1000000,
                "totalChunks": 12450
            },
            "recentActivities": recent_acts
        }
    except Exception as e:
        return {
            "totalTextbooks": 0,
            "totalApprovedQuestions": 0,
            "totalExamsPackaged": 0,
            "pendingReviewCount": 0,
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
            time=a.created_at.strftime("%H:%M %d/%m") if a.created_at else "Hôm nay",
            icon=a.icon_name or "FileText",
            color=a.badge_color or "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
        ))
    return res


@app.get("/subjects", response_model=List[SubjectResponse])
def list_subjects(db: Session = Depends(get_db)):
    subjects = db.query(SubjectDB).all()
    return subjects
