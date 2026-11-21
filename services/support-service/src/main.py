import os
import uuid
import random
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, Query, Header, Request, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func

from .database import engine, Base, get_db, SessionLocal
from .models import (
    SupportFAQCategory,
    SupportFAQArticle,
    SupportTicket,
    SupportTicketMessage,
    SupportAttachment,
    SupportFeedback,
    utc_now
)
from .schemas import (
    TicketCreateRequest,
    TicketMessageCreateRequest,
    TicketStatusUpdateRequest,
    FeedbackCreateRequest,
    FeedbackResponse,
    TicketResponse,
    TicketDetailResponse,
    MessageResponse,
    AttachmentResponse,
    FAQCategoryResponse,
    FAQArticleResponse,
    FAQArticleCreateRequest,
    FAQVoteRequest,
    AutoSuggestRequest,
    AutoSuggestResponse,
    SuggestedArticle,
    SupportMetricsResponse
)
from .seed import seed_default_knowledge_base

# Thư mục lưu trữ tệp đính kèm học thuật & ảnh chụp lỗi
ATTACHMENTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "support_attachments"))
os.makedirs(ATTACHMENTS_DIR, exist_ok=True)

# Đảm bảo bảng CSDL được tạo
Base.metadata.create_all(bind=engine)

# Nạp dữ liệu tri thức mẫu
try:
    with SessionLocal() as db_session:
        seed_default_knowledge_base(db_session)
except Exception as e:
    print(f"[SupportService] Seed error or already seeded: {e}")

app = FastAPI(
    title="QuizGen AI - Support Service",
    description="Microservice Quản trị Ticket Hỗ trợ, Trung tâm Tri thức FAQ, Trợ lý AI Hỗ trợ & Đo lường SLA",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_current_user_context(
    x_user_id: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header("LECTURER"),
    x_user_tier: Optional[str] = Header("FREE")
) -> Dict[str, str]:
    """Trích xuất thông tin người dùng từ Gateway headers"""
    uid = x_user_id or "usr-guest-001"
    email = (x_user_email or "guest@quizgen.ai").strip()
    role = (x_user_role or "LECTURER").strip().upper()
    if email.lower() == "quizgen.ai.team@gmail.com" or "admin" in email.lower() or "admin" in role.lower():
        role = "ADMIN"
    tier = (x_user_tier or "FREE").strip().upper()
    return {
        "user_id": uid,
        "email": email,
        "role": role,
        "tier": tier
    }

def calculate_sla_deadlines(tier: str, created_at: datetime):
    """Tính toán thời hạn SLA phản hồi và giải quyết dựa trên hạng gói cước"""
    tier = tier.upper()
    if tier == "ENTERPRISE":
        first_response = created_at + timedelta(hours=1)
        resolution = created_at + timedelta(hours=4)
    elif tier == "PRO":
        first_response = created_at + timedelta(hours=4)
        resolution = created_at + timedelta(hours=12)
    else: # FREE
        first_response = created_at + timedelta(hours=24)
        resolution = created_at + timedelta(hours=48)
    return first_response, resolution

def generate_ticket_code() -> str:
    """Sinh mã ticket dạng TK-2026-XXXXX"""
    rand_num = random.randint(10000, 99999)
    return f"TK-2026-{rand_num}"


# --- HEALTH CHECK ---

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "support-service",
        "port": 8008,
        "version": "1.0.0",
        "capabilities": [
            "ticket-management",
            "sla-tracking",
            "faq-knowledge-base",
            "ai-auto-suggest",
            "csat-feedback",
            "support-analytics"
        ]
    }


# --- TICKET MANAGEMENT ENDPOINTS ---

@app.post("/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreateRequest,
    db: Session = Depends(get_db),
    user: Dict[str, str] = Depends(get_current_user_context)
):
    """Khởi tạo một ticket hỗ trợ mới kèm tính toán SLA tự động"""
    now = utc_now()
    user_tier = payload.user_tier.upper() if payload.user_tier else user["tier"]
    first_due, res_due = calculate_sla_deadlines(user_tier, now)

    ticket = SupportTicket(
        ticket_code=generate_ticket_code(),
        user_id=user["user_id"],
        user_email=user["email"],
        user_role=user["role"],
        user_tier=user_tier,
        category=payload.category.upper(),
        priority=payload.priority.upper() if payload.priority else "MEDIUM",
        status="OPEN",
        subject=payload.subject,
        description=payload.description,
        error_context_json=payload.error_context_json,
        sla_first_response_due=first_due,
        sla_resolution_due=res_due,
        created_at=now,
        updated_at=now
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # Tự động tạo tin nhắn đầu tiên từ mô tả của người dùng
    first_message = SupportTicketMessage(
        ticket_id=ticket.id,
        sender_id=user["user_id"],
        sender_name=user["email"].split("@")[0],
        sender_role="USER",
        message_body=payload.description,
        is_internal_note=False,
        created_at=now
    )
    db.add(first_message)
    db.commit()

    return ticket

@app.get("/tickets", response_model=List[TicketResponse])
def list_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    my_tickets_only: Optional[bool] = Query(None, description="Chỉ lấy ticket của chính tôi"),
    db: Session = Depends(get_db),
    user: Dict[str, str] = Depends(get_current_user_context)
):
    """Lấy danh sách tickets có hỗ trợ tìm kiếm và lọc đa tiêu chí"""
    query = db.query(SupportTicket)

    is_admin = user["role"] in ["ADMIN", "SUPER_ADMIN"] or user["email"].lower() == "quizgen.ai.team@gmail.com"
    if not is_admin:
        # Giảng viên chỉ xem ticket của chính mình (khớp user_id HOẶC user_email)
        query = query.filter(
            or_(
                SupportTicket.user_id == user["user_id"],
                SupportTicket.user_email == user["email"],
                SupportTicket.user_email == user["email"].lower()
            )
        )
    elif my_tickets_only is True:
        query = query.filter(SupportTicket.user_id == user["user_id"])

    if status_filter:
        query = query.filter(SupportTicket.status == status_filter.upper())
    if category:
        query = query.filter(SupportTicket.category == category.upper())
    if priority:
        query = query.filter(SupportTicket.priority == priority.upper())
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                SupportTicket.subject.ilike(search_fmt),
                SupportTicket.ticket_code.ilike(search_fmt),
                SupportTicket.description.ilike(search_fmt)
            )
        )

    # Kiểm tra SLA breach trong lúc truy vấn
    now = utc_now()
    tickets = query.order_by(desc(SupportTicket.created_at)).all()
    for t in tickets:
        t.title = t.subject
        t.user_plan_tier = t.user_tier
        if t.status not in ["RESOLVED", "CLOSED", "CANCELLED"]:
            if (not t.first_responded_at and now > t.sla_first_response_due) or (now > t.sla_resolution_due):
                t.is_sla_breached = True
    db.commit()

    return tickets

@app.get("/tickets/{ticket_id}", response_model=TicketDetailResponse)
def get_ticket_detail(
    ticket_id: str,
    db: Session = Depends(get_db),
    user: Dict[str, str] = Depends(get_current_user_context)
):
    """Lấy chi tiết một ticket kèm toàn bộ luồng hội thoại và feedback"""
    ticket = db.query(SupportTicket).filter(
        or_(SupportTicket.id == ticket_id, SupportTicket.ticket_code == ticket_id)
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy ticket yêu cầu.")

    is_admin = user["role"] in ["ADMIN", "SUPER_ADMIN"] or user["email"].lower() == "quizgen.ai.team@gmail.com"
    if not is_admin and ticket.user_id != user["user_id"] and ticket.user_email.lower() != user["email"].lower():
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem ticket này.")

    # Lọc bỏ tin nhắn nội bộ nếu người xem là user thông thường
    visible_messages = []
    for msg in ticket.messages:
        if msg.is_internal_note and not is_admin:
            continue
        visible_messages.append(msg)

    # Tạo response thủ công để gắn danh sách tin nhắn đã lọc
    res = TicketDetailResponse.model_validate(ticket)
    parsed_messages = []
    for m in visible_messages:
        m_res = MessageResponse.model_validate(m)
        for att in m_res.attachments or []:
            att.file_url = f"/api/v1/support/attachments/{att.file_name}"
        parsed_messages.append(m_res)
    res.messages = parsed_messages

    # Gắn URL cho các tệp đính kèm cấp ticket
    for att in res.attachments:
        att.file_url = f"/api/v1/support/attachments/{att.file_name}"

    res.title = ticket.subject
    res.user_plan_tier = ticket.user_tier
    return res

@app.post("/tickets/{ticket_id}/messages", response_model=MessageResponse)
def add_ticket_message(
    ticket_id: str,
    payload: TicketMessageCreateRequest,
    db: Session = Depends(get_db),
    user: Dict[str, str] = Depends(get_current_user_context)
):
    """Gửi phản hồi mới vào luồng đối thoại của ticket"""
    ticket = db.query(SupportTicket).filter(
        or_(SupportTicket.id == ticket_id, SupportTicket.ticket_code == ticket_id)
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket không tồn tại.")

    is_admin = user["role"] in ["ADMIN", "SUPER_ADMIN"] or user["email"].lower() == "quizgen.ai.team@gmail.com"
    if not is_admin and ticket.user_id != user["user_id"] and ticket.user_email.lower() != user["email"].lower():
        raise HTTPException(status_code=403, detail="Không có quyền gửi tin nhắn vào ticket này.")

    if ticket.status in ["CLOSED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail="Ticket đã đóng, không thể gửi thêm tin nhắn.")

    now = utc_now()
    sender_role = "SUPPORT_STAFF" if is_admin else "USER"
    is_internal = payload.is_internal_note and is_admin

    body_text = (payload.message_body or payload.content or "").strip()
    if not body_text:
        raise HTTPException(status_code=400, detail="Nội dung phản hồi không được để trống.")

    msg = SupportTicketMessage(
        ticket_id=ticket.id,
        sender_id=user["user_id"],
        sender_name=user["email"].split("@")[0],
        sender_role=sender_role,
        message_body=body_text,
        is_internal_note=is_internal,
        created_at=now
    )
    db.add(msg)

    # Nếu nhân viên phản hồi lần đầu, cập nhật first_responded_at
    if is_admin and not ticket.first_responded_at and not is_internal:
        ticket.first_responded_at = now
        ticket.status = "WAITING_USER"
    elif not is_admin:
        # Giảng viên phản hồi lại, đổi trạng thái sang IN_PROGRESS
        if ticket.status == "WAITING_USER":
            ticket.status = "IN_PROGRESS"

    ticket.updated_at = now
    db.commit()
    db.refresh(msg)
    msg.content = msg.message_body
    return msg

@app.post("/tickets/{ticket_id}/attachments", response_model=List[AttachmentResponse])
async def upload_ticket_attachments(
    ticket_id: str,
    files: List[UploadFile] = File(...),
    message_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user: Dict[str, str] = Depends(get_current_user_context)
):
    """Tải lên một hoặc nhiều tệp đính kèm (ảnh chụp lỗi, tài liệu, voice note) cho ticket"""
    ticket = db.query(SupportTicket).filter(
        or_(SupportTicket.id == ticket_id, SupportTicket.ticket_code == ticket_id)
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket không tồn tại.")

    saved_attachments = []
    now = utc_now()
    for file in files:
        safe_name = os.path.basename(file.filename or "attachment")
        unique_file_name = f"{int(datetime.now().timestamp()*1000)}_{uuid.uuid4().hex[:6]}_{safe_name}"
        target_path = os.path.join(ATTACHMENTS_DIR, unique_file_name)

        content = await file.read()
        with open(target_path, "wb") as f:
            f.write(content)

        file_size = len(content)
        mime = file.content_type or "application/octet-stream"

        att = SupportAttachment(
            ticket_id=ticket.id,
            message_id=message_id,
            file_name=unique_file_name,
            file_size_bytes=file_size,
            mime_type=mime,
            file_path=target_path,
            created_at=now
        )
        db.add(att)
        db.flush()

        att_res = AttachmentResponse.model_validate(att)
        att_res.file_url = f"/api/v1/support/attachments/{unique_file_name}"
        saved_attachments.append(att_res)

    ticket.updated_at = now
    db.commit()
    return saved_attachments

@app.get("/attachments/{file_name}")
def get_attachment_file(file_name: str):
    """Tải hoặc xem trực tiếp ảnh chụp lỗi / tệp đính kèm học thuật"""
    safe_name = os.path.basename(file_name)
    target_path = os.path.join(ATTACHMENTS_DIR, safe_name)
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="Tệp đính kèm không tồn tại.")
    return FileResponse(target_path, filename=safe_name)

@app.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    user: Dict[str, str] = Depends(get_current_user_context)
):
    """Lấy số lượng ticket có phản hồi mới hoặc cần hỗ trợ để hiển thị Badge"""
    is_admin = user["role"] in ["ADMIN", "SUPER_ADMIN"]
    if is_admin:
        count = db.query(SupportTicket).filter(
            SupportTicket.status.in_(["OPEN", "IN_PROGRESS"])
        ).count()
    else:
        count = db.query(SupportTicket).filter(
            SupportTicket.user_id == user["user_id"],
            SupportTicket.status.in_(["WAITING_USER", "RESOLVED"])
        ).count()
    return {"unread_count": count}

@app.patch("/tickets/{ticket_id}/status", response_model=TicketResponse)
def update_ticket_status(
    ticket_id: str,
    payload: TicketStatusUpdateRequest,
    db: Session = Depends(get_db),
    user: Dict[str, str] = Depends(get_current_user_context)
):
    """Cập nhật trạng thái ticket (Giải quyết, Đóng, Mở lại)"""
    ticket = db.query(SupportTicket).filter(
        or_(SupportTicket.id == ticket_id, SupportTicket.ticket_code == ticket_id)
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket không tồn tại.")

    is_admin = user["role"] in ["ADMIN", "SUPER_ADMIN"] or user["email"].lower() == "quizgen.ai.team@gmail.com"
    new_status = payload.status.upper()
    now = utc_now()

    # User thông thường chỉ được phép đóng hoặc mở lại ticket của chính mình
    if not is_admin:
        if ticket.user_id != user["user_id"] and ticket.user_email.lower() != user["email"].lower():
            raise HTTPException(status_code=403, detail="Không có quyền cập nhật ticket này.")
        if new_status not in ["CLOSED", "RESOLVED", "OPEN"]:
            raise HTTPException(status_code=400, detail="Bạn chỉ có thể xác nhận giải quyết hoặc đóng ticket.")

    ticket.status = new_status
    if payload.assigned_admin_id and is_admin:
        ticket.assigned_admin_id = payload.assigned_admin_id

    if new_status == "RESOLVED":
        ticket.resolved_at = now
    elif new_status == "CLOSED":
        ticket.closed_at = now

    ticket.updated_at = now

    # Thêm thông báo hệ thống nếu có ghi chú
    if payload.note:
        sys_msg = SupportTicketMessage(
            ticket_id=ticket.id,
            sender_id="system",
            sender_name="Hệ thống",
            sender_role="SYSTEM_BOT",
            message_body=f"Trạng thái ticket đã được cập nhật thành {new_status}. Ghi chú: {payload.note}",
            is_internal_note=False,
            created_at=now
        )
        db.add(sys_msg)

    db.commit()
    db.refresh(ticket)
    return ticket

@app.post("/tickets/{ticket_id}/feedback", response_model=FeedbackResponse)
def submit_ticket_feedback(
    ticket_id: str,
    payload: FeedbackCreateRequest,
    db: Session = Depends(get_db),
    user: Dict[str, str] = Depends(get_current_user_context)
):
    """Khảo sát mức độ hài lòng khách hàng CSAT sau khi xử lý sự cố"""
    ticket = db.query(SupportTicket).filter(
        or_(SupportTicket.id == ticket_id, SupportTicket.ticket_code == ticket_id)
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket không tồn tại.")

    if ticket.user_id != user["user_id"]:
        raise HTTPException(status_code=403, detail="Chỉ người tạo ticket mới có quyền đánh giá.")

    existing_fb = db.query(SupportFeedback).filter(SupportFeedback.ticket_id == ticket.id).first()
    if existing_fb:
        existing_fb.rating_stars = payload.rating_stars
        existing_fb.feedback_text = payload.feedback_text
        existing_fb.resolved_efficiently = payload.resolved_efficiently
        db.commit()
        db.refresh(existing_fb)
        return existing_fb

    fb = SupportFeedback(
        ticket_id=ticket.id,
        user_id=user["user_id"],
        rating_stars=payload.rating_stars,
        feedback_text=payload.feedback_text,
        resolved_efficiently=payload.resolved_efficiently
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb


# --- FAQ KNOWLEDGE BASE ENDPOINTS ---

@app.get("/faq/categories", response_model=List[FAQCategoryResponse])
def get_faq_categories(db: Session = Depends(get_db)):
    """Lấy danh mục các chủ đề cẩm nang học thuật"""
    cats = db.query(SupportFAQCategory).filter(SupportFAQCategory.is_active == True).order_by(SupportFAQCategory.display_order).all()
    results = []
    for c in cats:
        count = len(c.articles)
        res = FAQCategoryResponse.model_validate(c)
        res.articles_count = count
        results.append(res)
    return results

@app.get("/faq/articles", response_model=List[FAQArticleResponse])
def list_faq_articles(
    category_id: Optional[str] = None,
    category_slug: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Tìm kiếm toàn văn bài viết cẩm nang theo từ khóa hoặc chuyên mục"""
    query = db.query(SupportFAQArticle).filter(SupportFAQArticle.is_published == True)

    if category_id:
        query = query.filter(SupportFAQArticle.category_id == category_id)
    elif category_slug:
        cat = db.query(SupportFAQCategory).filter(SupportFAQCategory.slug == category_slug).first()
        if cat:
            query = query.filter(SupportFAQArticle.category_id == cat.id)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                SupportFAQArticle.title.ilike(search_fmt),
                SupportFAQArticle.content_markdown.ilike(search_fmt),
                SupportFAQArticle.tags.ilike(search_fmt)
            )
        )

    return query.order_by(desc(SupportFAQArticle.helpful_count)).all()

@app.get("/faq/articles/{article_slug}", response_model=FAQArticleResponse)
def get_faq_article_detail(article_slug: str, db: Session = Depends(get_db)):
    """Đọc toàn văn một bài viết cẩm nang (tự động tăng view_count)"""
    article = db.query(SupportFAQArticle).filter(
        or_(SupportFAQArticle.slug == article_slug, SupportFAQArticle.id == article_slug)
    ).first()
    if not article:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết cẩm nang.")

    article.view_count += 1
    db.commit()
    db.refresh(article)
    return article

@app.post("/faq/articles/{article_id}/vote")
def vote_faq_article(article_id: str, payload: FAQVoteRequest, db: Session = Depends(get_db)):
    """Đánh giá bài viết cẩm nang hữu ích hoặc chưa hữu ích"""
    article = db.query(SupportFAQArticle).filter(SupportFAQArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Bài viết không tồn tại.")

    if payload.helpful:
        article.helpful_count += 1
    else:
        article.unhelpful_count += 1

    db.commit()
    return {
        "status": "success",
        "helpful_count": article.helpful_count,
        "unhelpful_count": article.unhelpful_count
    }


# --- AI AUTO-SUGGEST COPILOT ENDPOINT ---

@app.post("/ai/auto-suggest", response_model=AutoSuggestResponse)
def auto_suggest_solution(payload: AutoSuggestRequest, db: Session = Depends(get_db)):
    """Trợ lý AI phân tích lỗi người dùng nhập và đề xuất ngay bài viết FAQ giải pháp phù hợp"""
    text_to_search = f"{payload.subject} {payload.description}".lower()
    
    # Tìm kiếm các bài viết liên quan nhất
    articles = db.query(SupportFAQArticle).filter(SupportFAQArticle.is_published == True).all()
    suggested = []
    quick_tip = None

    # Quy tắc nhận dạng mẹo tức thì
    if any(k in text_to_search for k in ["omr", "in ấn", "phiếu", "a4", "lệch"]):
        quick_tip = "Mẹo in ấn OMR: Khi in file PDF trắc nghiệm, luôn chọn tỷ lệ Actual Size (100%) và khổ giấy A4 để máy in không làm lệch tọa độ ô tròn."
    elif any(k in text_to_search for k in ["toán rời rạc", "mệnh đề", "logic", "tập hợp", "discrete"]):
        quick_tip = "Mẹo Toán rời rạc & Logic: Hệ thống hỗ trợ đầy đủ ký hiệu ∀, ∃, ∧, ∨, ¬, →, ↔, ⊂, ∩, ∪, ℝ, ℕ, ℤ và tự động làm sạch Unicode khi xuất Word và PDF OMR."
    elif any(k in text_to_search for k in ["latex", "toán", "công thức", "vỡ font", "font"]):
        quick_tip = "Mẹo công thức LaTeX: QuizGen AI đã tích hợp bộ làm sạch Unicode học thuật tự động cho Word (.docx), bạn có thể xuất thử tệp PDF Vector để đảm bảo tính mỹ thuật tuyệt đối."
    elif any(k in text_to_search for k in ["wal", "locked", "khóa database", "database is locked"]):
        quick_tip = "Mẹo SQLite WAL: Hệ thống đã tối ưu hóa chế độ Write-Ahead Logging và timeout 60s để chống khóa database khi nạp tệp dung lượng lớn."
    elif any(k in text_to_search for k in ["canvas", "moodle", "qti", "lms"]):
        quick_tip = "Mẹo Canvas QTI: Cảnh báo XML metadata trên Canvas là bình thường và không ảnh hưởng đến nội dung bài thi. Câu hỏi vẫn được import đầy đủ 100%."
    elif any(k in text_to_search for k in ["vietqr", "thanh toán", "chuyển khoản", "nâng cấp", "pro"]):
        quick_tip = "Mẹo kích hoạt VietQR: Hệ thống đối soát tự động qua Webhook NAPAS 24/7. Vui lòng đảm bảo giữ nguyên nội dung chuyển khoản ORDER_xxxxxx để hệ thống duyệt ngay trong 3 giây."

    for art in articles:
        score = 0.0
        # Tính điểm liên quan đơn giản dựa trên từ khóa
        title_lower = art.title.lower()
        tags = (art.tags or "").lower()
        
        words = [w for w in text_to_search.split() if len(w) > 3]
        for w in words:
            if w in title_lower:
                score += 0.25
            if w in tags:
                score += 0.35

        if score > 0.2:
            snippet = art.content_markdown[:200].replace("#", "").strip() + "..."
            suggested.append(SuggestedArticle(
                id=art.id,
                title=art.title,
                slug=art.slug,
                snippet=snippet,
                relevance_score=min(round(score, 2), 0.99)
            ))

    suggested.sort(key=lambda x: x.relevance_score, reverse=True)
    top_suggestions = suggested[:3]

    return AutoSuggestResponse(
        has_solution=len(top_suggestions) > 0 or quick_tip is not None,
        quick_tip=quick_tip,
        suggested_articles=top_suggestions,
        confidence_score=top_suggestions[0].relevance_score if top_suggestions else (0.85 if quick_tip else 0.0)
    )


# --- ADMIN METRICS & ANALYTICS ---

@app.get("/admin/metrics", response_model=SupportMetricsResponse)
def get_support_metrics(
    db: Session = Depends(get_db),
    user: Dict[str, str] = Depends(get_current_user_context)
):
    """Báo cáo chỉ số vận hành CSKH và đo lường SLA thời gian thực"""
    total = db.query(SupportTicket).count()
    open_count = db.query(SupportTicket).filter(SupportTicket.status == "OPEN").count()
    in_progress = db.query(SupportTicket).filter(SupportTicket.status == "IN_PROGRESS").count()
    resolved = db.query(SupportTicket).filter(SupportTicket.status == "RESOLVED").count()
    closed = db.query(SupportTicket).filter(SupportTicket.status == "CLOSED").count()
    breached = db.query(SupportTicket).filter(SupportTicket.is_sla_breached == True).count()

    # Tính tỷ lệ tuân thủ SLA
    compliance = 100.0 if total == 0 else round(((total - breached) / total) * 100, 1)

    # Tính điểm CSAT trung bình
    avg_csat = db.query(func.avg(SupportFeedback.rating_stars)).scalar() or 5.0

    # Phân bổ theo phân hệ
    cats = db.query(SupportTicket.category, func.count(SupportTicket.id)).group_by(SupportTicket.category).all()
    cat_dist = {c: count for c, count in cats}

    # Phân bổ theo mức độ ưu tiên
    priorities = db.query(SupportTicket.priority, func.count(SupportTicket.id)).group_by(SupportTicket.priority).all()
    pri_dist = {p: count for p, count in priorities}

    return SupportMetricsResponse(
        total_tickets=total,
        open_tickets=open_count,
        in_progress_tickets=in_progress,
        resolved_tickets=resolved,
        closed_tickets=closed,
        sla_breached_count=breached,
        sla_compliance_rate_percent=compliance,
        average_csat_stars=round(float(avg_csat), 2),
        category_distribution=cat_dist,
        priority_distribution=pri_dist
    )
