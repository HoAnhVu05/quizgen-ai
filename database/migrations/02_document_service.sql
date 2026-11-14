-- ====================================================================
-- SCHEMA: DOCUMENT SERVICE (Quản lý Giáo trình, Bóc tách & Chunking)
-- Service Port: 8002
-- ====================================================================

SET search_path TO documents, public;

-- 1. Bảng Tài liệu Giáo trình (Documents)
CREATE TABLE IF NOT EXISTS documents.documents (
    id VARCHAR(50) PRIMARY KEY,                             -- ID format: 'tb-001' hoặc 'doc_001'
    user_id VARCHAR(50) NOT NULL,                           -- ID giảng viên nạp tài liệu
    name VARCHAR(255) NOT NULL,                             -- Tên tệp (vd: GiaoTrinh_KinhTeViMo_2025.pdf)
    file_path VARCHAR(500) NOT NULL,                        -- Đường dẫn lưu trữ vật lý hoặc cloud bucket
    file_size VARCHAR(20) NOT NULL,                         -- Kích thước tệp (vd: "14.2 MB")
    total_pages INT NOT NULL DEFAULT 0,                     -- Tổng số trang bóc tách được
    chapters_count INT NOT NULL DEFAULT 0,                  -- Số lượng chương phát hiện được
    status VARCHAR(20) NOT NULL DEFAULT 'extracting',       -- 'extracting' | 'embedding' | 'ready' | 'error'
    progress INT NOT NULL DEFAULT 0,                        -- Tiến độ xử lý: 0 đến 100%
    error_message TEXT,                                     -- Chi tiết lỗi nếu bóc tách thất bại
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Chương mục Giáo trình (Document Chapters)
CREATE TABLE IF NOT EXISTS documents.document_chapters (
    id VARCHAR(50) PRIMARY KEY,                             -- ID format: 'ch-...'
    document_id VARCHAR(50) NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    chapter_index INT NOT NULL,                             -- Thứ tự chương (1, 2, 3...)
    title VARCHAR(255) NOT NULL,                            -- Tên chương (vd: Chương 3: Cung - Cầu)
    page_start INT NOT NULL DEFAULT 1,                      -- Trang bắt đầu
    page_end INT NOT NULL DEFAULT 1,                        -- Trang kết thúc
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Phân đoạn Ngữ nghĩa (Document Chunks)
CREATE TABLE IF NOT EXISTS documents.document_chunks (
    id VARCHAR(100) PRIMARY KEY,                            -- ID format: 'doc_001_c0001'
    document_id VARCHAR(50) NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    page_number INT NOT NULL,                               -- Số trang trích dẫn
    chapter VARCHAR(255) NOT NULL,                          -- Tên chương tương ứng
    char_count INT NOT NULL DEFAULT 0,                      -- Số lượng ký tự của chunk
    text_snippet TEXT NOT NULL,                             -- Nội dung đoạn văn bản
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chỉ mục tối ưu truy vấn (Indexes)
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_chapters_document_id ON documents.document_chapters(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document_page ON documents.document_chunks(document_id, page_number);
