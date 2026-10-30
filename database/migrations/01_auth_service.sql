-- ====================================================================
-- SCHEMA: AUTH SERVICE (Giảng viên, Tài khoản & Xác thực JWT)
-- Service Port: 8001
-- ====================================================================

SET search_path TO auth, public;

-- 1. Bảng Giảng viên (Users)
CREATE TABLE IF NOT EXISTS auth.users (
    id VARCHAR(50) PRIMARY KEY,                             -- ID format: 'lec-001'
    email VARCHAR(100) UNIQUE NOT NULL,                     -- Email đại học: lecturer@vnu.edu.vn
    password_hash VARCHAR(255) NOT NULL,                    -- Hashed password (bcrypt)
    full_name VARCHAR(100) NOT NULL,                        -- Họ và tên giảng viên
    academic_title VARCHAR(20) DEFAULT 'TS.',               -- Học hàm/học vị: TS., ThS., PGS.TS., GS.TS.
    university VARCHAR(150) NOT NULL,                       -- Tên trường đại học
    department VARCHAR(150) NOT NULL,                       -- Khoa / Viện đào tạo
    role VARCHAR(20) NOT NULL DEFAULT 'lecturer',           -- 'lecturer', 'admin', 'dean'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,                -- Trạng thái hoạt động
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Tokens & Phiên làm việc (User Tokens)
CREATE TABLE IF NOT EXISTS auth.user_tokens (
    id VARCHAR(50) PRIMARY KEY,                             -- ID format: 'tok-...'
    user_id VARCHAR(50) NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chỉ mục tối ưu truy vấn (Indexes)
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_users_university ON auth.users(university);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON auth.user_tokens(user_id);
