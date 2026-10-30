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
\i /docker-entrypoint-initdb.d/seeds/01_seed_academic_data.sql
