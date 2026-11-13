-- ====================================================================
-- MIGRATION: [SCRUM-84] GOOGLE OAUTH 2.0 & OTP PASSWORD RESET SCHEMAS
-- Description: Bổ sung định danh Google OAuth, avatar, auth_provider và bảng lưu mã OTP quên mật khẩu
-- Target Schema: auth
-- Author: Database Engineer / QuizGen AI Team
-- Date: 2026-11-13
-- ====================================================================

SET search_path TO auth, public;

-- 1. Bổ sung các cột định danh OAuth và Hồ sơ vào bảng auth.users
ALTER TABLE auth.users 
    ADD COLUMN IF NOT EXISTS google_id VARCHAR(100) UNIQUE,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(30) NOT NULL DEFAULT 'local';

COMMENT ON COLUMN auth.users.google_id IS 'ID định danh người dùng từ Google OAuth 2.0 (sub claim)';
COMMENT ON COLUMN auth.users.avatar_url IS 'Đường dẫn ảnh đại diện của người dùng (từ Google hoặc CDN)';
COMMENT ON COLUMN auth.users.auth_provider IS 'Nhà cung cấp xác thực: local, google';

-- 2. Đánh chỉ mục B-Tree Index cho các cột tra cứu OAuth trên auth.users
CREATE INDEX IF NOT EXISTS idx_users_google_id ON auth.users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON auth.users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_email_provider ON auth.users(email, auth_provider);

-- 3. Bảng lưu trữ & quản lý mã OTP Khôi phục Mật khẩu (Password Reset Tokens)
CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
    id VARCHAR(50) PRIMARY KEY,                             -- ID format: 'prt-...'
    email VARCHAR(100) NOT NULL,                            -- Email nhận OTP
    otp_code VARCHAR(10) NOT NULL,                          -- Mã OTP 6 chữ số
    otp_hash VARCHAR(255),                                  -- Mã băm bảo mật (tùy chọn)
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,           -- Thời điểm hết hạn (mặc định 10 phút)
    is_used BOOLEAN NOT NULL DEFAULT FALSE,                 -- Đã sử dụng thành công chưa
    attempts_count INT NOT NULL DEFAULT 0,                  -- Số lần thử nhập sai mã OTP
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE auth.password_reset_tokens IS 'Bảng lưu trữ vết và trạng thái mã OTP xác thực quên mật khẩu qua Email SMTP';
COMMENT ON COLUMN auth.password_reset_tokens.id IS 'Mã định danh duy nhất của phiên OTP';
COMMENT ON COLUMN auth.password_reset_tokens.email IS 'Email của tài khoản cần đổi mật khẩu';
COMMENT ON COLUMN auth.password_reset_tokens.otp_code IS 'Mã OTP gồm 6 chữ số gửi qua Gmail';
COMMENT ON COLUMN auth.password_reset_tokens.expires_at IS 'Hạn sử dụng của mã OTP';
COMMENT ON COLUMN auth.password_reset_tokens.is_used IS 'Cờ đánh dấu mã đã được tiêu thụ đổi mật khẩu thành công';
COMMENT ON COLUMN auth.password_reset_tokens.attempts_count IS 'Số lần nhập sai để chống brute-force';

-- 4. Đánh chỉ mục B-Tree Index tối ưu hóa kiểm tra OTP thời gian thực (< 5ms)
CREATE INDEX IF NOT EXISTS idx_pwd_resets_email ON auth.password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_pwd_resets_active ON auth.password_reset_tokens(email, is_used, expires_at);
CREATE INDEX IF NOT EXISTS idx_pwd_resets_lookup ON auth.password_reset_tokens(email, otp_code, is_used, expires_at);
CREATE INDEX IF NOT EXISTS idx_pwd_resets_created ON auth.password_reset_tokens(created_at);
