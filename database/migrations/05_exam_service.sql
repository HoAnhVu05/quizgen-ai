-- ====================================================================
-- SCHEMA: EXAM & BANK SERVICE (Ngân hàng câu hỏi, Duyệt & Đóng gói đề)
-- Service Port: 8005
-- ====================================================================

SET search_path TO exams, public;

-- 1. Bảng Ngân hàng Câu hỏi Trắc nghiệm (Questions)
CREATE TABLE IF NOT EXISTS exams.questions (
    id VARCHAR(50) PRIMARY KEY,                             -- ID format: 'q-1', 'q-101' hoặc UUID
    document_id VARCHAR(50),                                -- Khóa logic trỏ sang documents.documents(id)
    source_chunk_id VARCHAR(100) NOT NULL,                  -- Khóa ngoại trỏ sang ID vector trong ChromaDB
    textbook_name VARCHAR(255) NOT NULL,                    -- Tên sách gốc
    chapter VARCHAR(255) NOT NULL,                          -- Tên chương mục
    bloom_level VARCHAR(30) NOT NULL,                       -- 'Nhận biết', 'Thông hiểu', 'Vận dụng', 'Phân tích'
    question_text TEXT NOT NULL,                            -- Nội dung câu hỏi
    options JSONB NOT NULL,                                 -- Mảng 4 lựa chọn: [{"id": "opt-a", "label": "A", "text": "..."}]
    correct_answer_id VARCHAR(20) NOT NULL,                 -- ID đáp án đúng: "opt-a"
    explanation TEXT,                                       -- Lời giải thích học thuật trích từ giáo trình
    confidence_score INT DEFAULT 95,                        -- Điểm độ tin cậy của AI (0 - 100%)
    status VARCHAR(20) NOT NULL DEFAULT 'pending',          -- 'pending' (chờ duyệt) | 'approved' (đã duyệt) | 'rejected' (loại)
    created_by VARCHAR(50) NOT NULL DEFAULT 'lec-001',      -- Giảng viên phụ trách
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Đề thi đã Đóng gói (Exams)
CREATE TABLE IF NOT EXISTS exams.exams (
    id VARCHAR(50) PRIMARY KEY,                             -- ID format: 'exam-2026-001'
    user_id VARCHAR(50) NOT NULL,                           -- Giảng viên xuất bản đề
    title VARCHAR(255) NOT NULL,                            -- Tiêu đề: ĐỀ THI KẾT THÚC HỌC PHẦN
    subject VARCHAR(150) NOT NULL,                          -- Tên môn học: Kinh tế vi mô
    faculty VARCHAR(150) NOT NULL DEFAULT 'Khoa Kinh tế & Quản trị',
    university VARCHAR(150) NOT NULL DEFAULT 'ĐẠI HỌC QUỐC GIA',
    duration_minutes INT NOT NULL DEFAULT 60,               -- Thời gian làm bài (phút)
    exam_codes JSONB NOT NULL,                              -- Danh sách mã đề hoán vị: ["101", "102", "103", "104"]
    selected_question_ids JSONB NOT NULL,                   -- Mảng các ID câu hỏi được chọn: ["q-1", "q-2", ...]
    format VARCHAR(20) NOT NULL DEFAULT 'docx',             -- Định dạng xuất: 'docx', 'pdf', 'qti'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Lịch sử Kiểm duyệt Câu hỏi (Question Review Audit Logs)
CREATE TABLE IF NOT EXISTS exams.question_audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    question_id VARCHAR(50) NOT NULL REFERENCES exams.questions(id) ON DELETE CASCADE,
    lecturer_id VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,                            -- 'approve', 'reject', 'inline_edit', 'regenerate'
    previous_state JSONB,
    new_state JSONB,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chỉ mục tối ưu truy vấn (Indexes)
CREATE INDEX IF NOT EXISTS idx_questions_document_id ON exams.questions(document_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON exams.questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_bloom_level ON exams.questions(bloom_level);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON exams.questions(created_at);
CREATE INDEX IF NOT EXISTS idx_exams_user_id ON exams.exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON exams.exams(created_at);
