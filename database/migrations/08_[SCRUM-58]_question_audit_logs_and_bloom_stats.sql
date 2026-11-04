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
