-- ====================================================================
-- MIGRATION 08: [SCRUM-58] TRIỂN KHAI BẢNG LỊCH SỬ KHẢO THÍ & VẾT CHỈNH SỬA
-- VÀ TỐI ƯU HÓA TRUY VẤN THỐNG KÊ PHÂN BỔ TỶ LỆ NHẬN THỨC BLOOM
-- ====================================================================

CREATE SCHEMA IF NOT EXISTS exams;

-- --------------------------------------------------------------------
-- 1. BẢNG GHI NHẬN LỊCH SỬ KHẢO THÍ (exams.question_audit_logs)
-- Ghi nhận toàn vẹn vết chỉnh sửa (Audit Trail) của giảng viên:
-- - Thao tác sửa nội dung, sửa phương án, thay đổi đáp án đúng
-- - Điều chỉnh mức độ nhận thức Bloom (Nhận biết, Thông hiểu, Vận dụng, Phân tích)
-- - Phê duyệt (Approve), Từ chối (Reject), Yêu cầu AI sinh lại (Regenerate)
-- - Lưu trữ trạng thái trước (previous_state) và sau (new_state) cùng chi tiết diff
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams.question_audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    question_id VARCHAR(50) NOT NULL REFERENCES exams.questions(id) ON DELETE CASCADE,
    lecturer_id VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,                            -- 'inline_edit', 'approve', 'reject', 'status_change', 'regenerate', 'update_bloom'
    previous_state JSONB,                                  -- Snapshot trạng thái trước khi sửa
    new_state JSONB,                                       -- Snapshot trạng thái sau khi sửa
    change_summary TEXT,                                   -- Tóm tắt thay đổi: "Cập nhật đáp án đúng thành B; sửa văn phong câu hỏi"
    field_changes JSONB,                                   -- Diff chi tiết từng trường {"question_text": {"old": "..", "new": ".."}}
    edit_reason TEXT,                                      -- Lý do chỉnh sửa sư phạm từ giảng viên
    ip_address VARCHAR(45),                                -- IP giảng viên thực hiện
    user_agent VARCHAR(255),                               -- Trình duyệt/thiết bị
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bổ sung cột nếu bảng đã tồn tại từ migration trước đó
ALTER TABLE exams.question_audit_logs ADD COLUMN IF NOT EXISTS change_summary TEXT;
ALTER TABLE exams.question_audit_logs ADD COLUMN IF NOT EXISTS field_changes JSONB;
ALTER TABLE exams.question_audit_logs ADD COLUMN IF NOT EXISTS edit_reason TEXT;
ALTER TABLE exams.question_audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE exams.question_audit_logs ADD COLUMN IF NOT EXISTS user_agent VARCHAR(255);

-- --------------------------------------------------------------------
-- 2. CHỈ MỤC TỐI ƯU TRUY VẤN VẾT KHẢO THÍ (Audit Indexes)
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_question_audit_qid ON exams.question_audit_logs(question_id);
CREATE INDEX IF NOT EXISTS idx_question_audit_lecturer ON exams.question_audit_logs(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_question_audit_action ON exams.question_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_question_audit_time ON exams.question_audit_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_audit_qid_time ON exams.question_audit_logs(question_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_audit_lecturer_time ON exams.question_audit_logs(lecturer_id, performed_at DESC);

-- --------------------------------------------------------------------
-- 3. CHỈ MỤC TỐI ƯU HÓA CHO ENDPOINT THỐNG KÊ TỶ LỆ NHẬN THỨC BLOOM
-- Phục vụ truy vấn đếm và phân bổ tỷ lệ Bloom theo trạng thái và tài liệu
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_questions_bloom_status_composite 
ON exams.questions(status, bloom_level);

CREATE INDEX IF NOT EXISTS idx_questions_bloom_doc_status
ON exams.questions(document_id, status, bloom_level);

CREATE INDEX IF NOT EXISTS idx_questions_bloom_chapter
ON exams.questions(chapter, bloom_level, status);

-- --------------------------------------------------------------------
-- 4. DỮ LIỆU MẪU VẾT KHẢO THÍ CỦA GIẢNG VIÊN (Seed Question Audit Logs)
-- --------------------------------------------------------------------
INSERT INTO exams.question_audit_logs (
    id, question_id, lecturer_id, action, 
    previous_state, new_state, 
    change_summary, field_changes, edit_reason, 
    ip_address, user_agent, performed_at
)
VALUES
(
    'q-audit-001',
    'q-1',
    'lec-001',
    'approve',
    '{"status": "pending", "bloom_level": "Nhận biết"}'::jsonb,
    '{"status": "approved", "bloom_level": "Nhận biết"}'::jsonb,
    'Phê duyệt câu hỏi trắc nghiệm kiểm định đạt chuẩn',
    '{"status": {"old": "pending", "new": "approved"}}'::jsonb,
    'Câu hỏi chuẩn xác theo quy luật Cung - Cầu trong giáo trình',
    '192.168.1.10',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
),
(
    'q-audit-002',
    'q-1',
    'lec-001',
    'inline_edit',
    '{"question_text": "Theo quy luật cầu, điều gì xảy ra?", "bloom_level": "Nhận biết"}'::jsonb,
    '{"question_text": "Theo quy luật cầu, trong điều kiện các yếu tố khác không đổi, phát biểu nào sau đây là chính xác?", "bloom_level": "Nhận biết"}'::jsonb,
    'Chuẩn hóa câu hỏi: Thêm điều kiện ceteris paribus (các yếu tố khác không đổi)',
    '{"question_text": {"old": "Theo quy luật cầu, điều gì xảy ra?", "new": "Theo quy luật cầu, trong điều kiện các yếu tố khác không đổi, phát biểu nào sau đây là chính xác?"}}'::jsonb,
    'Đảm bảo tính chặt chẽ về mặt khoa học kinh tế học',
    '192.168.1.10',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
),
(
    'q-audit-003',
    'q-2',
    'lec-002',
    'inline_edit',
    '{"bloom_level": "Nhận biết", "correct_answer_id": "opt-a"}'::jsonb,
    '{"bloom_level": "Thông hiểu", "correct_answer_id": "opt-c"}'::jsonb,
    'Nâng mức độ Bloom lên Thông hiểu và hiệu chỉnh đáp án đúng C',
    '{"bloom_level": {"old": "Nhận biết", "new": "Thông hiểu"}, "correct_answer_id": {"old": "opt-a", "new": "opt-c"}}'::jsonb,
    'Yêu cầu suy luận về tác động chéo của hàng hóa thay thế',
    '192.168.1.25',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    CURRENT_TIMESTAMP - INTERVAL '12 hours'
),
(
    'q-audit-004',
    'q-3',
    'lec-001',
    'update_bloom',
    '{"bloom_level": "Thông hiểu"}'::jsonb,
    '{"bloom_level": "Vận dụng"}'::jsonb,
    'Chuyển mức nhận thức sang Vận dụng (tính toán co giãn cầu)',
    '{"bloom_level": {"old": "Thông hiểu", "new": "Vận dụng"}}'::jsonb,
    'Yêu cầu sinh viên vận dụng công thức tính hệ số PED để ra quyết định giá',
    '192.168.1.10',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    CURRENT_TIMESTAMP - INTERVAL '6 hours'
)
ON CONFLICT (id) DO NOTHING;
