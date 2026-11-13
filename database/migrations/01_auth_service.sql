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
    role VARCHAR(30) NOT NULL DEFAULT 'lecturer',           -- 'lecturer', 'head_of_department', 'admin'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,                -- Trạng thái hoạt động
    google_id VARCHAR(100) UNIQUE,                          -- Google OAuth 2.0 sub ID [SCRUM-84]
    avatar_url TEXT,                                        -- URL ảnh đại diện [SCRUM-84]
    auth_provider VARCHAR(30) NOT NULL DEFAULT 'local',     -- 'local', 'google' [SCRUM-84]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Tokens & Phiên làm việc (User Tokens)
CREATE TABLE IF NOT EXISTS auth.user_tokens (
    id VARCHAR(50) PRIMARY KEY,                             -- ID format: 'tok-...'
    user_id VARCHAR(50) NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    token_type VARCHAR(20) NOT NULL DEFAULT 'refresh',      -- 'access', 'refresh' [SCRUM-62]
    device_info VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Quản lý Mã OTP Quên Mật Khẩu (Password Reset Tokens) [SCRUM-84]
CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
    id VARCHAR(50) PRIMARY KEY,                             -- ID format: 'prt-...'
    email VARCHAR(100) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    otp_hash VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    attempts_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bổ sung cột token_type và cập nhật khóa ngoại ON DELETE CASCADE nếu bảng đã tồn tại [SCRUM-62]
ALTER TABLE auth.user_tokens ADD COLUMN IF NOT EXISTS token_type VARCHAR(20) NOT NULL DEFAULT 'refresh';

-- Bổ sung các cột OAuth nếu bảng users đã tồn tại từ trước [SCRUM-84]
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS google_id VARCHAR(100) UNIQUE;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(30) NOT NULL DEFAULT 'local';

-- Chỉ mục B-Tree tối ưu truy vấn và JOIN [SCRUM-62]
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_users_university ON auth.users(university);
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON auth.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON auth.users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON auth.users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_email_provider ON auth.users(email, auth_provider);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON auth.user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_token_type ON auth.user_tokens(token_type);
CREATE INDEX IF NOT EXISTS idx_user_tokens_revoked ON auth.user_tokens(revoked);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_status ON auth.user_tokens(user_id, token_type, revoked);

-- Chỉ mục B-Tree cho xác thực OTP Quên Mật Khẩu [SCRUM-84]
CREATE INDEX IF NOT EXISTS idx_pwd_resets_email ON auth.password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_pwd_resets_active ON auth.password_reset_tokens(email, is_used, expires_at);
CREATE INDEX IF NOT EXISTS idx_pwd_resets_lookup ON auth.password_reset_tokens(email, otp_code, is_used, expires_at);
