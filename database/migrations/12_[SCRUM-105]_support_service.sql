-- ====================================================================
-- MIGRATION: 12_[SCRUM-105]_support_service.sql
-- DESCRIPTION: Khởi tạo các bảng dữ liệu cho Support Service (Port 8008):
--              Ticket hỗ trợ kỹ thuật, Tin nhắn thread, Tệp đính kèm, 
--              Trung tâm tri thức FAQ và Đánh giá CSAT.
-- DATE: 18/11/2026
-- AUTHOR: Ngo Pham Cong Duc (052205015692)
-- ====================================================================

-- 1. BẢNG DANH MỤC TRUNG TÂM TRI THỨC (FAQ CATEGORIES)
CREATE TABLE IF NOT EXISTS support_faq_categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'HelpCircle',
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG BÀI VIẾT CẨM NANG HƯỚNG DẪN (FAQ ARTICLES)
CREATE TABLE IF NOT EXISTS support_faq_articles (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) REFERENCES support_faq_categories(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content_markdown TEXT NOT NULL,
    tags VARCHAR(255),
    view_count INT DEFAULT 0,
    helpful_count INT DEFAULT 0,
    unhelpful_count INT DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG TICKET HỖ TRỢ KỸ THUẬT (SUPPORT TICKETS)
CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(36) PRIMARY KEY,
    ticket_code VARCHAR(20) UNIQUE NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) DEFAULT 'LECTURER',
    user_tier VARCHAR(20) DEFAULT 'FREE',
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(20) DEFAULT 'OPEN',
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    assigned_admin_id VARCHAR(36),
    sla_first_response_due TIMESTAMP WITH TIME ZONE NOT NULL,
    sla_resolution_due TIMESTAMP WITH TIME ZONE NOT NULL,
    first_responded_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    is_sla_breached BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. BẢNG TIN NHẮN & THREAD TRAO ĐỔI TRONG TICKET (TICKET MESSAGES)
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(36) REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id VARCHAR(36) NOT NULL,
    sender_name VARCHAR(150) NOT NULL,
    sender_role VARCHAR(50) NOT NULL,
    message_body TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. BẢNG TỆP TIN ĐÍNH KÈM MINH CHỨNG SỰ CỐ (TICKET ATTACHMENTS)
CREATE TABLE IF NOT EXISTS support_attachments (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(36) REFERENCES support_tickets(id) ON DELETE CASCADE,
    message_id VARCHAR(36) REFERENCES support_ticket_messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. BẢNG KHẢO SÁT ĐÁNH GIÁ CHẤT LƯỢNG CSAT (CUSTOMER SATISFACTION FEEDBACK)
CREATE TABLE IF NOT EXISTS support_feedbacks (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(36) UNIQUE REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL,
    rating_stars INT CHECK (rating_stars >= 1 AND rating_stars <= 5),
    feedback_text TEXT,
    resolved_efficiently BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. CHỈ MỤC B-TREE TỐI ƯU HÓA TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_faq_articles_category ON support_faq_articles(category_id);
