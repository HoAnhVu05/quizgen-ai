-- ====================================================================
-- MIGRATION 07: BẢNG EXAM_AUDIT_LOGS VÀ CHỈ MỤC TỐI ƯU PHÂN BỔ CÂU HỎI
-- Tối ưu hóa truy vấn phân bổ ma trận Bloom & Kiểm toán biến động đề thi
-- ====================================================================

SET search_path TO exams, public;

-- --------------------------------------------------------------------
-- 1. BẢNG NHẬT KÝ KIỂM TOÁN ĐỀ THI (EXAM AUDIT LOGS)
-- Ghi nhận toàn bộ biến động: tạo đề, xuất PDF/Word/QTI, đảo mã đề...
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams.exam_audit_logs (
    id VARCHAR(50) PRIMARY KEY,                             -- vd: 'ex-audit-001'
    exam_id VARCHAR(50) NOT NULL REFERENCES exams.exams(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL,                           -- Người thực hiện thao tác
    action VARCHAR(50) NOT NULL,                            -- 'create', 'export_pdf', 'export_docx', 'export_qti', 'permute_codes', 'update_matrix'
    details JSONB,                                          -- Dữ liệu chi tiết (mã đề, số câu, ma trận đáp án)
    ip_address VARCHAR(45),                                 -- IPv4 hoặc IPv6 của client
    user_agent VARCHAR(255),                                -- Thông tin thiết bị trình duyệt
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 2. CÁC CHỈ MỤC TỐI ƯU TRÊN BẢNG EXAM_AUDIT_LOGS
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_exam_audit_exam_id ON exams.exam_audit_logs(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_audit_user_id ON exams.exam_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_audit_action ON exams.exam_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_exam_audit_performed_at ON exams.exam_audit_logs(performed_at DESC);

-- Chỉ mục kết hợp (Composite Indexes) phục vụ truy vấn dòng thời gian lịch sử đề thi
CREATE INDEX IF NOT EXISTS idx_exam_audit_exam_time ON exams.exam_audit_logs(exam_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_audit_user_time ON exams.exam_audit_logs(user_id, performed_at DESC);

-- --------------------------------------------------------------------
-- 3. BỔ SUNG CHỈ MỤC TỐI ƯU TRÊN BẢNG QUESTION_AUDIT_LOGS
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_question_audit_qid ON exams.question_audit_logs(question_id);
CREATE INDEX IF NOT EXISTS idx_question_audit_lecturer ON exams.question_audit_logs(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_question_audit_action ON exams.question_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_question_audit_qid_time ON exams.question_audit_logs(question_id, performed_at DESC);

-- --------------------------------------------------------------------
-- 4. CÁC CHỈ MỤC TỐI ƯU PHỤC VỤ THUẬT TOÁN PHÂN BỔ CÂU HỎI (QUESTION ALLOCATION)
-- --------------------------------------------------------------------

-- Chỉ mục kết hợp đa chiều phục vụ trích xuất câu hỏi theo giáo trình, chương mục, cấp độ Bloom và trạng thái
CREATE INDEX IF NOT EXISTS idx_questions_allocation_matrix 
ON exams.questions(document_id, chapter, bloom_level, status);

-- Chỉ mục tối ưu chọn câu hỏi chất lượng cao theo độ tin cậy AI cho từng mức nhận thức
CREATE INDEX IF NOT EXISTS idx_questions_bloom_confidence 
ON exams.questions(document_id, bloom_level, status, confidence_score DESC);

-- Chỉ mục phân đoạn (Partial Index) siêu nhẹ chỉ dành cho kho câu hỏi ĐÃ DUYỆT ('approved')
CREATE INDEX IF NOT EXISTS idx_questions_approved_pool 
ON exams.questions(document_id, bloom_level) 
WHERE status = 'approved';

-- Chỉ mục phân bổ câu hỏi theo chuẩn đầu ra môn học (Course Learning Outcomes - CLO)
CREATE INDEX IF NOT EXISTS idx_question_clos_distribution 
ON exams.question_clos(clo_id, question_id);

-- Chỉ mục tra cứu nhanh câu hỏi được phân bổ trong các mã đề hoán vị (101, 102, 103, 104)
CREATE INDEX IF NOT EXISTS idx_exam_variants_lookup 
ON exams.exam_variants(exam_id, exam_code);

-- Chỉ mục phân bổ câu hỏi theo tác vụ sinh AI (ai.job_questions)
CREATE INDEX IF NOT EXISTS idx_job_questions_bloom_alloc 
ON ai.job_questions(job_id, bloom_level);
