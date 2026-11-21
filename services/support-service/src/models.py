import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    CheckConstraint
)
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

class SupportFAQCategory(Base):
    __tablename__ = "support_faq_categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(150), nullable=False)
    slug = Column(String(150), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="HelpCircle")
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    articles = relationship("SupportFAQArticle", back_populates="category", cascade="all, delete-orphan")


class SupportFAQArticle(Base):
    __tablename__ = "support_faq_articles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    category_id = Column(String(36), ForeignKey("support_faq_categories.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    content_markdown = Column(Text, nullable=False)
    tags = Column(String(255), nullable=True)
    view_count = Column(Integer, default=0)
    helpful_count = Column(Integer, default=0)
    unhelpful_count = Column(Integer, default=0)
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    category = relationship("SupportFAQCategory", back_populates="articles")


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_code = Column(String(20), unique=True, nullable=False, index=True) # e.g. TK-2026-10293
    user_id = Column(String(36), nullable=False, index=True)
    user_email = Column(String(255), nullable=False)
    user_role = Column(String(50), default="LECTURER")
    user_tier = Column(String(20), default="FREE") # FREE, PRO, ENTERPRISE
    category = Column(String(50), nullable=False) # DOC_PARSING_ERROR, AI_HALLUCINATION, EXAM_EXPORT_ERROR, PAYMENT_BILLING, etc.
    priority = Column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(20), default="OPEN") # OPEN, IN_PROGRESS, WAITING_USER, RESOLVED, CLOSED, CANCELLED
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    error_context_json = Column(Text, nullable=True) # Lưu trữ JSON ngữ cảnh lỗi (trình duyệt, màn hình, lỗi HTTP, error stack)
    assigned_admin_id = Column(String(36), nullable=True)
    
    # SLA Tracking
    sla_first_response_due = Column(DateTime(timezone=True), nullable=False)
    sla_resolution_due = Column(DateTime(timezone=True), nullable=False)
    first_responded_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    is_sla_breached = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    messages = relationship("SupportTicketMessage", back_populates="ticket", cascade="all, delete-orphan", order_by="SupportTicketMessage.created_at")
    attachments = relationship("SupportAttachment", back_populates="ticket", cascade="all, delete-orphan")
    feedback = relationship("SupportFeedback", back_populates="ticket", uselist=False, cascade="all, delete-orphan")


class SupportTicketMessage(Base):
    __tablename__ = "support_ticket_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id = Column(String(36), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(String(36), nullable=False)
    sender_name = Column(String(150), nullable=False)
    sender_role = Column(String(50), nullable=False) # USER, SUPPORT_STAFF, ADMIN, SYSTEM_BOT
    message_body = Column(Text, nullable=False)
    is_internal_note = Column(Boolean, default=False) # Only visible to staff/admins
    created_at = Column(DateTime(timezone=True), default=utc_now)

    ticket = relationship("SupportTicket", back_populates="messages")
    attachments = relationship("SupportAttachment", back_populates="message", cascade="all, delete-orphan")


class SupportAttachment(Base):
    __tablename__ = "support_attachments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id = Column(String(36), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    message_id = Column(String(36), ForeignKey("support_ticket_messages.id", ondelete="CASCADE"), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_path = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    ticket = relationship("SupportTicket", back_populates="attachments")
    message = relationship("SupportTicketMessage", back_populates="attachments")


class SupportFeedback(Base):
    __tablename__ = "support_feedbacks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id = Column(String(36), ForeignKey("support_tickets.id", ondelete="CASCADE"), unique=True, nullable=False)
    user_id = Column(String(36), nullable=False)
    rating_stars = Column(Integer, CheckConstraint("rating_stars >= 1 AND rating_stars <= 5"), nullable=False)
    feedback_text = Column(Text, nullable=True)
    resolved_efficiently = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    ticket = relationship("SupportTicket", back_populates="feedback")
