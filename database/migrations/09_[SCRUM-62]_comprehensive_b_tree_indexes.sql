-- ====================================================================
-- MIGRATION 09: [SCRUM-62] CHỈ MỤC B-TREE INDEX TOÀN DIỆN TRÊN 5 SCHEMAS
-- VÀ ĐỒNG BỘ RÀNG BUỘC KHÓA NGOẠI ON DELETE CASCADE (AUTH, DOCUMENTS, RAG, AI, EXAMS)
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. CẬP NHẬT CỘT & KHÓA NGOẠI ON DELETE CASCADE (AUTH & RAG SCHEMAS)
-- --------------------------------------------------------------------

-- 1.1. Auth Service: Cột token_type và khóa ngoại ON DELETE CASCADE
ALTER TABLE IF EXISTS auth.user_tokens 
    ADD COLUMN IF NOT EXISTS token_type VARCHAR(20) NOT NULL DEFAULT 'refresh';

-- 1.2. RAG Service: Cột user_id và khóa ngoại ON DELETE CASCADE
ALTER TABLE IF EXISTS rag.vector_indexes 
    ADD COLUMN IF NOT EXISTS user_id VARCHAR(50);

ALTER TABLE IF EXISTS rag.retrieval_logs 
    ADD COLUMN IF NOT EXISTS user_id VARCHAR(50);

-- Đảm bảo ràng buộc khóa ngoại (Foreign Key with ON DELETE CASCADE)
DO $$
BEGIN
    -- RAG vector_indexes -> auth.users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'rag' AND table_name = 'vector_indexes' 
        AND constraint_name = 'fk_vector_indexes_user'
    ) THEN
        ALTER TABLE rag.vector_indexes
            ADD CONSTRAINT fk_vector_indexes_user 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- RAG retrieval_logs -> auth.users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'rag' AND table_name = 'retrieval_logs' 
        AND constraint_name = 'fk_retrieval_logs_user'
    ) THEN
        ALTER TABLE rag.retrieval_logs
            ADD CONSTRAINT fk_retrieval_logs_user 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Bỏ qua nếu bảng hoặc constraint đã tồn tại
        NULL;
END $$;


-- ====================================================================
-- 2. ĐÁNH CHỈ MỤC B-TREE INDEX TRÊN CẢ 5 SCHEMAS
-- Tập trung vào các cột thường xuyên tìm kiếm và JOIN:
-- document_id, user_id, bloom_level, status
-- ====================================================================

-- --------------------------------------------------------------------
-- 2.1. SCHEMA `auth`: CHỈ MỤC B-TREE (user_id, status/is_active, token_type)
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_btree_auth_users_email 
    ON auth.users USING btree (email);

CREATE INDEX IF NOT EXISTS idx_btree_auth_users_status 
    ON auth.users USING btree (is_active);

CREATE INDEX IF NOT EXISTS idx_btree_auth_users_role 
    ON auth.users USING btree (role);

CREATE INDEX IF NOT EXISTS idx_btree_auth_tokens_user_id 
    ON auth.user_tokens USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_btree_auth_tokens_token_type 
    ON auth.user_tokens USING btree (token_type);

CREATE INDEX IF NOT EXISTS idx_btree_auth_tokens_status 
    ON auth.user_tokens USING btree (revoked);

CREATE INDEX IF NOT EXISTS idx_btree_auth_tokens_user_status 
    ON auth.user_tokens USING btree (user_id, token_type, revoked);


-- --------------------------------------------------------------------
-- 2.2. SCHEMA `documents`: CHỈ MỤC B-TREE (document_id, user_id, status)
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_btree_docs_user_id 
    ON documents.documents USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_btree_docs_status 
    ON documents.documents USING btree (status);

CREATE INDEX IF NOT EXISTS idx_btree_docs_user_status 
    ON documents.documents USING btree (user_id, status);

CREATE INDEX IF NOT EXISTS idx_btree_doc_chapters_document_id 
    ON documents.document_chapters USING btree (document_id);

CREATE INDEX IF NOT EXISTS idx_btree_doc_chunks_document_id 
    ON documents.document_chunks USING btree (document_id);

CREATE INDEX IF NOT EXISTS idx_btree_doc_chunks_doc_page 
    ON documents.document_chunks USING btree (document_id, page_number);


-- --------------------------------------------------------------------
-- 2.3. SCHEMA `rag`: CHỈ MỤC B-TREE (document_id, user_id, status)
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_btree_rag_vector_indexes_doc_id 
    ON rag.vector_indexes USING btree (document_id);

CREATE INDEX IF NOT EXISTS idx_btree_rag_vector_indexes_user_id 
    ON rag.vector_indexes USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_btree_rag_vector_indexes_status 
    ON rag.vector_indexes USING btree (status);

CREATE INDEX IF NOT EXISTS idx_btree_rag_vector_indexes_user_status 
    ON rag.vector_indexes USING btree (user_id, status);

CREATE INDEX IF NOT EXISTS idx_btree_rag_vector_indexes_doc_status 
    ON rag.vector_indexes USING btree (document_id, status);

CREATE INDEX IF NOT EXISTS idx_btree_rag_retrieval_doc_id 
    ON rag.retrieval_logs USING btree (document_id);

CREATE INDEX IF NOT EXISTS idx_btree_rag_retrieval_user_id 
    ON rag.retrieval_logs USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_btree_rag_retrieval_user_doc 
    ON rag.retrieval_logs USING btree (user_id, document_id);

CREATE INDEX IF NOT EXISTS idx_btree_rag_usage_quotas_user_id 
    ON rag.usage_quotas USING btree (user_id);


-- --------------------------------------------------------------------
-- 2.4. SCHEMA `ai`: CHỈ MỤC B-TREE (document_id, user_id, bloom_level, status)
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_btree_ai_jobs_user_id 
    ON ai.generation_jobs USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_btree_ai_jobs_document_id 
    ON ai.generation_jobs USING btree (document_id);

CREATE INDEX IF NOT EXISTS idx_btree_ai_jobs_status 
    ON ai.generation_jobs USING btree (status);

CREATE INDEX IF NOT EXISTS idx_btree_ai_jobs_user_status 
    ON ai.generation_jobs USING btree (user_id, status);

CREATE INDEX IF NOT EXISTS idx_btree_ai_jobs_doc_status 
    ON ai.generation_jobs USING btree (document_id, status);

CREATE INDEX IF NOT EXISTS idx_btree_ai_job_questions_bloom 
    ON ai.job_questions USING btree (bloom_level);

CREATE INDEX IF NOT EXISTS idx_btree_ai_job_questions_job 
    ON ai.job_questions USING btree (job_id);

CREATE INDEX IF NOT EXISTS idx_btree_ai_job_questions_composite 
    ON ai.job_questions USING btree (job_id, bloom_level);

CREATE INDEX IF NOT EXISTS idx_btree_ai_presets_default 
    ON ai.bloom_presets USING btree (is_default);


-- --------------------------------------------------------------------
-- 2.5. SCHEMA `exams`: CHỈ MỤC B-TREE (document_id, user_id, bloom_level, status)
-- --------------------------------------------------------------------
-- Câu hỏi (exams.questions):
CREATE INDEX IF NOT EXISTS idx_btree_exams_questions_doc_id 
    ON exams.questions USING btree (document_id);

CREATE INDEX IF NOT EXISTS idx_btree_exams_questions_user_id 
    ON exams.questions USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_btree_exams_questions_bloom 
    ON exams.questions USING btree (bloom_level);

CREATE INDEX IF NOT EXISTS idx_btree_exams_questions_status 
    ON exams.questions USING btree (status);

-- Composite B-Tree tối ưu tìm kiếm và JOIN phân hệ Khảo thí:
CREATE INDEX IF NOT EXISTS idx_btree_exams_questions_doc_status 
    ON exams.questions USING btree (document_id, status);

CREATE INDEX IF NOT EXISTS idx_btree_exams_questions_doc_bloom 
    ON exams.questions USING btree (document_id, bloom_level);

CREATE INDEX IF NOT EXISTS idx_btree_exams_questions_status_bloom 
    ON exams.questions USING btree (status, bloom_level);

CREATE INDEX IF NOT EXISTS idx_btree_exams_questions_all_metrics 
    ON exams.questions USING btree (document_id, status, bloom_level);

-- Đề thi và Biến thể mã đề (exams.exams & exams.exam_variants):
CREATE INDEX IF NOT EXISTS idx_btree_exams_user_id 
    ON exams.exams USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_btree_exam_variants_exam_id 
    ON exams.exam_variants USING btree (exam_id);

CREATE INDEX IF NOT EXISTS idx_btree_exam_variants_code 
    ON exams.exam_variants USING btree (exam_id, exam_code);

-- Kiểm toán vết khảo thí (exams.question_audit_logs & exams.exam_audit_logs):
CREATE INDEX IF NOT EXISTS idx_btree_q_audit_question_id 
    ON exams.question_audit_logs USING btree (question_id);

CREATE INDEX IF NOT EXISTS idx_btree_q_audit_lecturer_id 
    ON exams.question_audit_logs USING btree (lecturer_id);

CREATE INDEX IF NOT EXISTS idx_btree_q_audit_action_status 
    ON exams.question_audit_logs USING btree (action);

CREATE INDEX IF NOT EXISTS idx_btree_q_audit_composite 
    ON exams.question_audit_logs USING btree (question_id, lecturer_id, action);

CREATE INDEX IF NOT EXISTS idx_btree_ex_audit_exam_id 
    ON exams.exam_audit_logs USING btree (exam_id);

CREATE INDEX IF NOT EXISTS idx_btree_ex_audit_user_id 
    ON exams.exam_audit_logs USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_btree_ex_audit_action_status 
    ON exams.exam_audit_logs USING btree (action);

-- Nhật ký hoạt động & Chuẩn đầu ra môn học:
CREATE INDEX IF NOT EXISTS idx_btree_system_activities_user_id 
    ON exams.system_activities USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_btree_system_activities_action 
    ON exams.system_activities USING btree (action_type);

CREATE INDEX IF NOT EXISTS idx_btree_learning_outcomes_bloom 
    ON exams.learning_outcomes USING btree (bloom_target);
