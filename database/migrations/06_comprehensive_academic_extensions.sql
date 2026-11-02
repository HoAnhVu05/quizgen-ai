-- ====================================================================
-- SCHEMA EXTENSIONS: CÁC THỰC THỂ HỌC THUẬT & QUẢN TRỊ BỔ SUNG
-- Hoàn thiện 100% nghiệp vụ Khảo thí, Chuẩn đầu ra CLO & Bảng mã đề đảo
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. AUTH EXTENSIONS: DANH MỤC TRƯỜNG ĐẠI HỌC & KHOA ĐÀO TẠO
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth.universities (
    id VARCHAR(50) PRIMARY KEY,                             -- vd: 'uni-vnu'
    code VARCHAR(20) UNIQUE NOT NULL,                       -- 'VNU'
    name VARCHAR(200) NOT NULL,                             -- 'Đại học Quốc gia'
    city VARCHAR(100) DEFAULT 'Hà Nội',
    website VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth.faculties (
    id VARCHAR(50) PRIMARY KEY,                             -- vd: 'fac-fba'
    university_id VARCHAR(50) NOT NULL REFERENCES auth.universities(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,                              -- 'FBA'
    name VARCHAR(200) NOT NULL,                             -- 'Khoa Kinh tế & Quản trị'
    dean_name VARCHAR(100),                                 -- Tên Trưởng khoa
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_faculties_uni ON auth.faculties(university_id);

-- --------------------------------------------------------------------
-- 2. EXAMS EXTENSIONS: DANH MỤC MÔN HỌC & HỌC PHẦN (SUBJECTS)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams.subjects (
    id VARCHAR(50) PRIMARY KEY,                             -- vd: 'sub-microecon'
    code VARCHAR(30) UNIQUE NOT NULL,                       -- Mã học phần: 'ECO101'
    name VARCHAR(200) NOT NULL,                             -- 'Kinh tế vi mô'
    credits INT NOT NULL DEFAULT 3,                         -- Số tín chỉ (3 TC)
    faculty_id VARCHAR(50),                                 -- Khóa logic tới auth.faculties(id)
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subjects_code ON exams.subjects(code);

-- --------------------------------------------------------------------
-- 3. EXAMS EXTENSIONS: CHUẨN ĐẦU RA MÔN HỌC (COURSE LEARNING OUTCOMES - CLO)
-- Phục vụ kiểm định chất lượng đào tạo (AUN-QA / ABET)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams.learning_outcomes (
    id VARCHAR(50) PRIMARY KEY,                             -- vd: 'clo-eco101-1'
    subject_id VARCHAR(50) NOT NULL REFERENCES exams.subjects(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,                              -- 'CLO1', 'CLO2'
    description TEXT NOT NULL,                              -- 'Hiểu và vận dụng quy luật cung cầu'
    bloom_target VARCHAR(30) DEFAULT 'Thông hiểu',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clo_subject ON exams.learning_outcomes(subject_id);

-- Bảng liên kết câu hỏi với chuẩn đầu ra CLO
CREATE TABLE IF NOT EXISTS exams.question_clos (
    question_id VARCHAR(50) NOT NULL REFERENCES exams.questions(id) ON DELETE CASCADE,
    clo_id VARCHAR(50) NOT NULL REFERENCES exams.learning_outcomes(id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, clo_id)
);

-- --------------------------------------------------------------------
-- 4. EXAMS EXTENSIONS: CHI TIẾT CÁC MÃ ĐỀ ĐẢO (EXAM CODE VARIANTS)
-- Lưu trữ chi tiết 4 mã đề hoán vị (101, 102, 103, 104) và bảng đáp án
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams.exam_variants (
    id VARCHAR(50) PRIMARY KEY,                             -- vd: 'var-exam001-101'
    exam_id VARCHAR(50) NOT NULL REFERENCES exams.exams(id) ON DELETE CASCADE,
    exam_code VARCHAR(10) NOT NULL,                         -- '101', '102', '103', '104'
    question_sequence JSONB NOT NULL,                       -- Thứ tự ID các câu hỏi đã xáo trộn
    options_permutation JSONB,                              -- Hoán vị đáp án từng câu nếu có
    answer_keys JSONB NOT NULL,                             -- Ma trận đáp án chuẩn: {"1": "A", "2": "C", ...}
    file_path VARCHAR(500),                                 -- Đường dẫn tệp .docx / .pdf đã render
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exam_variants_exam ON exams.exam_variants(exam_id);

-- --------------------------------------------------------------------
-- 5. EXAMS EXTENSIONS: NHẬT KÝ KHẢO THÍ HỆ THỐNG (SYSTEM ACTIVITIES)
-- Hiển thị trực tiếp lên dòng thời gian Recent Activities của Dashboard
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams.system_activities (
    id VARCHAR(50) PRIMARY KEY,                             -- vd: 'act-001'
    user_id VARCHAR(50) NOT NULL,                           -- Người thực hiện (lec-001)
    action_type VARCHAR(100) NOT NULL,                      -- 'export_exam', 'approve_question', 'extract_textbook'
    title VARCHAR(255) NOT NULL,                            -- 'Xuất đề thi kết thúc học phần'
    detail TEXT NOT NULL,                                   -- 'Kinh tế vĩ mô - Giữa kỳ (40 câu - 4 mã đề) ra Word'
    icon_name VARCHAR(50) DEFAULT 'FileText',               -- Tên Icon Lucide: FileText, CheckCircle2, Layers
    badge_color VARCHAR(100) DEFAULT 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    metadata JSONB,                                         -- Metadata bổ sung (mã đề, số câu)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activities_user ON exams.system_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON exams.system_activities(created_at DESC);

-- --------------------------------------------------------------------
-- 6. RAG EXTENSIONS: HẠN NGẠCH & THEO DÕI TOKEN (USAGE QUOTAS)
-- Cung cấp số liệu chính xác cho Card RAG Quota trên Dashboard
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rag.usage_quotas (
    id VARCHAR(50) PRIMARY KEY,                             -- vd: 'quota-lec-001'
    user_id VARCHAR(50) UNIQUE NOT NULL,                    -- Mã giảng viên
    institution_id VARCHAR(50),
    max_tokens BIGINT NOT NULL DEFAULT 1000000,             -- Hạn mức tối đa (1,000,000 tokens)
    used_tokens BIGINT NOT NULL DEFAULT 420000,             -- Đã sử dụng (420,000 tokens)
    total_embeddings_count INT NOT NULL DEFAULT 12450,      -- Tổng số vector chunks đã index
    reset_cycle VARCHAR(20) DEFAULT 'monthly',              -- Chu kỳ làm mới: monthly, semester
    cycle_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 7. AI EXTENSIONS: LIÊN KẾT TÁC VỤ SINH & CÂU HỎI (JOB QUESTIONS)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.job_questions (
    job_id VARCHAR(50) NOT NULL REFERENCES ai.generation_jobs(id) ON DELETE CASCADE,
    question_id VARCHAR(50) NOT NULL,
    bloom_level VARCHAR(30) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (job_id, question_id)
);
