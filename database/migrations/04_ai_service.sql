-- ====================================================================
-- SCHEMA: AI GENERATION SERVICE (Tác vụ sinh đề thi LLM & Ma trận Bloom)
-- Service Port: 8004
-- ====================================================================

SET search_path TO ai, public;

-- 1. Bảng Mẫu cấu hình Ma trận Bloom (Bloom Matrix Presets)
CREATE TABLE IF NOT EXISTS ai.bloom_presets (
    id VARCHAR(50) PRIMARY KEY,                             -- e.g. 'preset-giua-ky'
    name VARCHAR(100) NOT NULL,                             -- 'Đề thi Giữa kỳ'
    description VARCHAR(255),
    nhan_biet_pct INT NOT NULL DEFAULT 40,                  -- 40% Nhận biết
    thong_hieu_pct INT NOT NULL DEFAULT 40,                 -- 40% Thông hiểu
    van_dung_pct INT NOT NULL DEFAULT 20,                   -- 20% Vận dụng
    phan_tich_pct INT NOT NULL DEFAULT 0,                   -- 0% Phân tích
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Tác vụ Sinh câu hỏi (AI Generation Jobs)
CREATE TABLE IF NOT EXISTS ai.generation_jobs (
    id VARCHAR(50) PRIMARY KEY,                             -- ID format: 'job-20261030-001'
    user_id VARCHAR(50) NOT NULL,                           -- Giảng viên yêu cầu
    document_id VARCHAR(50) NOT NULL,                       -- Tài liệu giáo trình tham chiếu
    chapters JSONB NOT NULL,                                -- Mảng các chương: ["Chương 3..."]
    bloom_matrix JSONB NOT NULL,                            -- Cấu hình số câu từng mức: {"nhanBiet": 4, "thongHieu": 4, ...}
    total_requested INT NOT NULL,                           -- Tổng số câu yêu cầu
    total_generated INT NOT NULL DEFAULT 0,                 -- Tổng số câu sinh thành công
    status VARCHAR(20) NOT NULL DEFAULT 'queued',           -- 'queued', 'processing', 'completed', 'failed'
    llm_provider VARCHAR(50) NOT NULL DEFAULT 'gemini',     -- 'gemini', 'openai'
    model_version VARCHAR(50) NOT NULL DEFAULT 'gemini-1.5-pro',
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Chỉ mục
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user ON ai.generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_doc ON ai.generation_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai.generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created_at ON ai.generation_jobs(created_at);
