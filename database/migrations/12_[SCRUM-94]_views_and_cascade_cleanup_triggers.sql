-- ====================================================================
-- MIGRATION: [SCRUM-94] VIEWS FOR ADMIN PORTAL, CASCADE CLEANUP TRIGGERS & CONCURRENT OPTIMIZATIONS
-- Description: Xây dựng các Views phân tích dữ liệu cho Admin Portal, Trigger tự động dọn dẹp vector rác khi xóa giáo trình/tài khoản và chỉ mục tối ưu hóa tải đồng thời
-- Author: Nguyễn Đức Cường (Database Architecture) / QuizGen AI Team
-- Date: 2026-11-16
-- ====================================================================

-- 1. VIEW TỔNG QUAN HOẠT ĐỘNG NGƯỜI DÙNG CHO ADMIN PORTAL (auth.v_user_activity_summary)
-- Giúp Admin Portal hiển thị dữ liệu Master-Detail và biểu đồ mà không cần chạy query JOIN đa bảng tốn tài nguyên
CREATE OR REPLACE VIEW auth.v_user_activity_summary AS
SELECT 
    u.id AS user_id,
    u.email,
    u.full_name,
    u.academic_title,
    u.university,
    u.department,
    u.role,
    u.is_active,
    u.auth_provider,
    u.created_at,
    COUNT(DISTINCT d.id) AS total_documents,
    COUNT(DISTINCT e.id) AS total_exams,
    COUNT(DISTINCT q.id) AS total_questions_created,
    COALESCE(MAX(t.created_at), u.created_at) AS last_active_at
FROM auth.users u
LEFT JOIN documents.documents d ON d.user_id = u.id
LEFT JOIN exams.exams e ON e.user_id = u.id
LEFT JOIN exams.questions q ON q.created_by = u.id
LEFT JOIN auth.user_tokens t ON t.user_id = u.id
GROUP BY u.id, u.email, u.full_name, u.academic_title, u.university, u.department, u.role, u.is_active, u.auth_provider, u.created_at;

COMMENT ON VIEW auth.v_user_activity_summary IS 'View tổng hợp 360 độ hoạt động người dùng, số giáo trình, số đề thi và thời gian hoạt động phục vụ Admin Portal [SCRUM-94]';

-- 2. VIEW PHÂN BỔ THANG ĐO NHẬN THỨC BLOOM (exams.v_bloom_distribution_stats)
-- Phục vụ hiển thị biểu đồ Donut Chart và Smart Cards phân bổ độ khó theo chuẩn sư phạm 40-30-20-10
CREATE OR REPLACE VIEW exams.v_bloom_distribution_stats AS
SELECT 
    q.document_id,
    COALESCE(d.name, 'Chưa gán giáo trình') AS document_name,
    COUNT(q.id) AS total_questions,
    COUNT(CASE WHEN q.bloom_level = 'Nhận biết' OR q.bloom_level = 'REMEMBER' THEN 1 END) AS remember_count,
    COUNT(CASE WHEN q.bloom_level = 'Thông hiểu' OR q.bloom_level = 'UNDERSTAND' THEN 1 END) AS understand_count,
    COUNT(CASE WHEN q.bloom_level = 'Vận dụng' OR q.bloom_level = 'APPLY' THEN 1 END) AS apply_count,
    COUNT(CASE WHEN q.bloom_level = 'Phân tích' OR q.bloom_level = 'ANALYZE' THEN 1 END) AS analyze_count,
    ROUND(COUNT(CASE WHEN q.bloom_level = 'Nhận biết' OR q.bloom_level = 'REMEMBER' THEN 1 END) * 100.0 / NULLIF(COUNT(q.id), 0), 2) AS remember_pct,
    ROUND(COUNT(CASE WHEN q.bloom_level = 'Thông hiểu' OR q.bloom_level = 'UNDERSTAND' THEN 1 END) * 100.0 / NULLIF(COUNT(q.id), 0), 2) AS understand_pct,
    ROUND(COUNT(CASE WHEN q.bloom_level = 'Vận dụng' OR q.bloom_level = 'APPLY' THEN 1 END) * 100.0 / NULLIF(COUNT(q.id), 0), 2) AS apply_pct,
    ROUND(COUNT(CASE WHEN q.bloom_level = 'Phân tích' OR q.bloom_level = 'ANALYZE' THEN 1 END) * 100.0 / NULLIF(COUNT(q.id), 0), 2) AS analyze_pct
FROM exams.questions q
LEFT JOIN documents.documents d ON d.id = q.document_id
GROUP BY q.document_id, d.name;

COMMENT ON VIEW exams.v_bloom_distribution_stats IS 'View thống kê số lượng và tỷ lệ % phân bổ câu hỏi theo thang đo nhận thức Bloom [SCRUM-94]';

-- 3. TRIGGER VÀ HÀM TỰ ĐỘNG DỌN DẸP DỮ LIỆU RÁC KHI XÓA GIÁO TRÌNH (Cascade Cleanup)
-- Đảm bảo xóa sạch các chỉ mục Vector RAG và nhật ký liên quan khi giảng viên xóa giáo trình
CREATE OR REPLACE FUNCTION documents.fn_cleanup_document_cascade()
RETURNS TRIGGER AS $$
BEGIN
    -- Xóa các bản ghi liên quan trong RAG Service
    DELETE FROM rag.vector_indexes WHERE document_id = OLD.id;
    DELETE FROM rag.retrieval_logs WHERE document_id = OLD.id;
    
    -- Xóa các tác vụ sinh AI liên quan đến tài liệu này
    DELETE FROM ai.generation_jobs WHERE document_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_document_cascade ON documents.documents;
CREATE TRIGGER trg_cleanup_document_cascade
BEFORE DELETE ON documents.documents
FOR EACH ROW
EXECUTE FUNCTION documents.fn_cleanup_document_cascade();

COMMENT ON FUNCTION documents.fn_cleanup_document_cascade() IS 'Hàm trigger tự động dọn dẹp vector rác và nhật ký liên quan khi xóa tài liệu giáo trình [SCRUM-94]';

-- 4. TRIGGER VÀ HÀM TỰ ĐỘNG DỌN DẸP DỮ LIỆU KHI XÓA NGƯỜI DÙNG (User Cleanup)
CREATE OR REPLACE FUNCTION auth.fn_cleanup_user_cascade()
RETURNS TRIGGER AS $$
BEGIN
    -- Dọn dẹp token reset mật khẩu của tài khoản
    DELETE FROM auth.password_reset_tokens WHERE email = OLD.email;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_user_cascade ON auth.users;
CREATE TRIGGER trg_cleanup_user_cascade
BEFORE DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auth.fn_cleanup_user_cascade();

-- 5. CHỈ MỤC B-TREE TỐI ƯU HÓA TRUY VẤN VIEW VÀ NGĂN CHẶN DEADLOCK TẢI ĐỒNG THỜI
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON exams.questions(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_doc_bloom ON exams.questions(document_id, bloom_level);
CREATE INDEX IF NOT EXISTS idx_exams_user_id ON exams.exams(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_doc_id ON ai.generation_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_logs_doc_user ON rag.retrieval_logs(document_id, user_id);
