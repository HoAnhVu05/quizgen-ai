from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# --- TICKET SCHEMAS ---

class TicketCreateRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255, description="Tiêu đề yêu cầu hỗ trợ")
    description: str = Field(..., min_length=1, description="Mô tả chi tiết sự cố hoặc yêu cầu")
    category: str = Field(default="GENERAL_INQUIRY", description="DOC_PARSING_ERROR, AI_HALLUCINATION, EXAM_EXPORT_ERROR, PAYMENT_BILLING, ACCOUNT_SECURITY, FEATURE_REQUEST, GENERAL_INQUIRY")
    priority: Optional[str] = Field(default="MEDIUM", description="LOW, MEDIUM, HIGH, CRITICAL")
    user_tier: Optional[str] = Field(default="FREE", description="FREE, PRO, ENTERPRISE")
    error_context_json: Optional[str] = Field(default=None, description="Ngữ cảnh lỗi hệ thống (trình duyệt, màn hình, error log)")

class TicketMessageCreateRequest(BaseModel):
    message_body: Optional[str] = Field(default=None, description="Nội dung phản hồi")
    content: Optional[str] = Field(default=None, description="Bí danh của message_body")
    is_internal_note: Optional[bool] = Field(default=False, description="Đánh dấu ghi chú nội bộ giữa các kỹ sư")

class TicketStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="OPEN, IN_PROGRESS, WAITING_USER, RESOLVED, CLOSED, CANCELLED")
    assigned_admin_id: Optional[str] = None
    note: Optional[str] = None

class FeedbackCreateRequest(BaseModel):
    rating_stars: int = Field(..., ge=1, le=5, description="Đánh giá từ 1 đến 5 sao")
    feedback_text: Optional[str] = None
    resolved_efficiently: Optional[bool] = True

# --- RESPONSE SCHEMAS ---

class AttachmentResponse(BaseModel):
    id: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    file_path: str
    file_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class MessageResponse(BaseModel):
    id: str
    ticket_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    message_body: str
    content: Optional[str] = None
    is_internal_note: bool
    created_at: datetime
    attachments: Optional[List[AttachmentResponse]] = []

    class Config:
        from_attributes = True

class FeedbackResponse(BaseModel):
    id: str
    ticket_id: str
    rating_stars: int
    feedback_text: Optional[str] = None
    resolved_efficiently: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TicketResponse(BaseModel):
    id: str
    ticket_code: str
    user_id: str
    user_email: str
    user_role: str
    user_tier: str
    user_plan_tier: Optional[str] = None
    category: str
    priority: str
    status: str
    subject: str
    title: Optional[str] = None
    description: str
    error_context_json: Optional[str] = None
    assigned_admin_id: Optional[str] = None
    sla_first_response_due: datetime
    sla_resolution_due: datetime
    first_responded_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    is_sla_breached: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TicketDetailResponse(TicketResponse):
    messages: List[MessageResponse] = []
    attachments: List[AttachmentResponse] = []
    feedback: Optional[FeedbackResponse] = None

# --- FAQ SCHEMAS ---

class FAQArticleResponse(BaseModel):
    id: str
    category_id: str
    title: str
    slug: str
    content_markdown: str
    tags: Optional[str] = None
    view_count: int
    helpful_count: int
    unhelpful_count: int
    is_published: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FAQCategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    icon: str
    display_order: int
    is_active: bool
    created_at: datetime
    articles_count: Optional[int] = 0

    class Config:
        from_attributes = True

class FAQArticleCreateRequest(BaseModel):
    category_id: str
    title: str
    slug: Optional[str] = None
    content_markdown: str
    tags: Optional[str] = None
    is_published: Optional[bool] = True

class FAQVoteRequest(BaseModel):
    helpful: bool = True

# --- AI AUTO-SUGGEST SCHEMAS ---

class AutoSuggestRequest(BaseModel):
    subject: str
    description: str
    category: Optional[str] = None

class SuggestedArticle(BaseModel):
    id: str
    title: str
    slug: str
    snippet: str
    relevance_score: float

class AutoSuggestResponse(BaseModel):
    has_solution: bool
    quick_tip: Optional[str] = None
    suggested_articles: List[SuggestedArticle] = []
    confidence_score: float

# --- METRICS SCHEMAS ---

class SupportMetricsResponse(BaseModel):
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    resolved_tickets: int
    closed_tickets: int
    sla_breached_count: int
    sla_compliance_rate_percent: float
    average_csat_stars: Optional[float] = None
    total_feedbacks: int = 0
    category_distribution: Dict[str, int]
    priority_distribution: Dict[str, int]
