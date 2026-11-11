-- ====================================================================
-- SCHEMA: RAG SERVICE (Vector Store Metastore & Index Registry)
-- Service Port: 8003
-- ====================================================================

SET search_path TO rag, public;

-- 1. Bảng Đăng ký & Theo dõi Chỉ mục Vector (Vector Index Registry)
-- Lưu ý: Vector Embeddings thực tế được lưu tại ChromaDB collection 'textbook_chunks'
CREATE TABLE IF NOT EXISTS rag.vector_indexes (
    id VARCHAR(50) PRIMARY KEY,                             -- ID format: 'idx-...'
    document_id VARCHAR(50) NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES auth.users(id) ON DELETE CASCADE,                       -- [SCRUM-62] ID giảng viên sở hữu
    collection_name VARCHAR(100) NOT NULL DEFAULT 'textbook_chunks',
    total_vectors INT NOT NULL DEFAULT 0,                   -- Tổng số vector đã nhúng
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    dimension INT NOT NULL DEFAULT 384,                     -- Số chiều embedding
    distance_metric VARCHAR(20) NOT NULL DEFAULT 'cosine',  -- Khoảng cách đo: cosine, l2, ip
    status VARCHAR(20) NOT NULL DEFAULT 'indexing',         -- 'indexing', 'ready', 'failed'
    indexed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Lịch sử Truy vấn Ngữ cảnh (Query Retrieval Logs - Phục vụ Kiểm toán & Tối ưu Prompt)
CREATE TABLE IF NOT EXISTS rag.retrieval_logs (
    id VARCHAR(50) PRIMARY KEY,
    query_text TEXT NOT NULL,
    document_id VARCHAR(50) REFERENCES documents.documents(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES auth.users(id) ON DELETE CASCADE,                       -- [SCRUM-62] ID giảng viên truy vấn
    top_k INT NOT NULL DEFAULT 5,
    matched_chunks_count INT NOT NULL DEFAULT 0,
    top_relevance_score NUMERIC(5,2),
    latency_ms INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bổ sung cột user_id và ràng buộc khóa ngoại ON DELETE CASCADE nếu bảng đã tồn tại [SCRUM-62]
ALTER TABLE rag.vector_indexes ADD COLUMN IF NOT EXISTS user_id VARCHAR(50);
ALTER TABLE rag.retrieval_logs ADD COLUMN IF NOT EXISTS user_id VARCHAR(50);

-- Chỉ mục B-Tree tối ưu tìm kiếm và JOIN [SCRUM-62]
CREATE INDEX IF NOT EXISTS idx_vector_indexes_doc ON rag.vector_indexes(document_id);
CREATE INDEX IF NOT EXISTS idx_vector_indexes_user ON rag.vector_indexes(user_id);
CREATE INDEX IF NOT EXISTS idx_vector_indexes_status ON rag.vector_indexes(status);
CREATE INDEX IF NOT EXISTS idx_vector_indexes_user_status ON rag.vector_indexes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_vector_indexes_doc_status ON rag.vector_indexes(document_id, status);

CREATE INDEX IF NOT EXISTS idx_retrieval_logs_doc ON rag.retrieval_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_logs_user ON rag.retrieval_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_logs_user_doc ON rag.retrieval_logs(user_id, document_id);
