-- ====================================================================
-- MIGRATION: [SCRUM-90] QUESTIONS MULTIMODAL IMAGES & LATEX FORMULA SCHEMAS
-- Description: Bổ sung các cột lưu trữ hình ảnh sơ đồ đồ thị, cờ công thức LaTeX và chú thích hình vẽ cho ngân hàng câu hỏi
-- Target Schema: exams (và fallback public)
-- Author: Nguyễn Đức Cường (Database Architecture) / QuizGen AI Team
-- Date: 2026-11-14
-- ====================================================================

SET search_path TO exams, public;

-- 1. Bổ sung các cột Đa phương thức (Multimodal & LaTeX) vào bảng exams.questions
ALTER TABLE exams.questions
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS has_formula BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS image_caption TEXT;

-- 2. Ghi chú thích từ điển dữ liệu (Data Dictionary Comments)
COMMENT ON COLUMN exams.questions.image_url IS 'Đường dẫn tệp hình vẽ, sơ đồ mạch điện, đồ thị hoặc chuỗi Base64 Data URI minh họa câu hỏi';
COMMENT ON COLUMN exams.questions.has_formula IS 'Cờ boolean đánh dấu câu hỏi có chứa công thức Toán/Lý/Hóa theo định dạng LaTeX ($...$ hoặc $$...$$)';
COMMENT ON COLUMN exams.questions.image_caption IS 'Chú thích học thuật sư phạm hiển thị bên dưới hình ảnh minh họa (ví dụ: Hình 1.1: Đồ thị dao động điều hòa)';

-- 3. Tạo chỉ mục B-Tree Index tối ưu hóa truy vấn lọc câu hỏi đa phương thức & công thức
-- Chỉ mục phục vụ bộ lọc tìm kiếm câu hỏi có công thức LaTeX
CREATE INDEX IF NOT EXISTS idx_questions_has_formula ON exams.questions(has_formula);

-- Chỉ mục B-Tree Composite tối ưu hóa lọc kết hợp theo Bậc Bloom và Công thức
CREATE INDEX IF NOT EXISTS idx_questions_bloom_formula ON exams.questions(bloom_level, has_formula);

-- Partial Index B-Tree cho các câu hỏi có đính kèm hình vẽ sơ đồ (tối ưu hóa dung lượng index)
CREATE INDEX IF NOT EXISTS idx_questions_has_image ON exams.questions((image_url IS NOT NULL)) WHERE image_url IS NOT NULL;
