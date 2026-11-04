-- ====================================================================
-- MASTER MIGRATION SCRIPT - QUIZGEN AI
-- Tự động chạy tuần tự toàn bộ migration và nạp dữ liệu mẫu
-- ====================================================================

\i /docker-entrypoint-initdb.d/init.sql
\i /docker-entrypoint-initdb.d/migrations/01_auth_service.sql
\i /docker-entrypoint-initdb.d/migrations/02_document_service.sql
\i /docker-entrypoint-initdb.d/migrations/03_rag_service.sql
\i /docker-entrypoint-initdb.d/migrations/04_ai_service.sql
\i /docker-entrypoint-initdb.d/migrations/05_exam_service.sql
\i /docker-entrypoint-initdb.d/migrations/06_comprehensive_academic_extensions.sql
\i /docker-entrypoint-initdb.d/migrations/07_exam_audit_and_distribution_indexes.sql
\i /docker-entrypoint-initdb.d/migrations/08_[SCRUM-58]_question_audit_logs_and_bloom_stats.sql
\i /docker-entrypoint-initdb.d/seeds/01_seed_academic_data.sql
