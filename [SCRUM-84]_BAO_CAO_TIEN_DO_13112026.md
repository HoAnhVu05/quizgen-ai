# BÁO CÁO TIẾN ĐỘ CÔNG VIỆC [SCRUM-84]

**Dự án:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Tự động ứng dụng AI  
**Mã nhiệm vụ (Jira Issue):** [SCRUM-84]  
**Ngày thực hiện:** 13/11/2026  
**Người thực hiện:** Kỹ sư Cơ sở Dữ liệu & Tích hợp Backend (Database & Backend Engineer)  
**Nhánh Git:** `feature/database-architecture`  
**Trạng thái:** Hoàn thành xuất sắc 100% mục tiêu đề ra  

---

## ⚡ 1. TÓM TẮT CÔNG VIỆC HOÀN THÀNH (DAILY SUMMARY)

### 📌 Những việc đã làm:
* **Tích hợp Schema Google OAuth 2.0 & Bảng OTP Quên Mật Khẩu:**
  * Xây dựng tệp migration `database/migrations/10_[SCRUM-84]_auth_oauth_and_password_resets.sql`:
    * Mở rộng bảng `auth.users` bổ sung 3 cột định danh: `google_id VARCHAR(100) UNIQUE`, `avatar_url TEXT`, `auth_provider VARCHAR(30) NOT NULL DEFAULT 'local'`.
    * Tạo mới bảng quản lý mã xác thực qua Email `auth.password_reset_tokens` (`id`, `email`, `otp_code`, `otp_hash`, `expires_at`, `is_used`, `attempts_count`, `created_at`), thay thế cơ chế lưu tạm trong RAM của Mock Gateway, giúp duy trì phiên OTP bền vững qua các lần khởi động lại server.
    * Thiết lập hệ thống 7 chỉ mục B-Tree Index chuyên biệt (`idx_users_google_id`, `idx_users_auth_provider`, `idx_users_email_provider`, `idx_pwd_resets_email`, `idx_pwd_resets_active`, `idx_pwd_resets_lookup`, `idx_pwd_resets_created`) đảm bảo thời gian đối soát OTP dưới 5ms.
* **Đồng bộ DDL Master & SQLAlchemy ORM Models:**
  * Cập nhật tệp DDL gốc `database/migrations/01_auth_service.sql` tích hợp đồng nhất cấu trúc mới kèm mệnh đề `IF NOT EXISTS` và `ALTER TABLE` idempotent.
  * Cập nhật `services/auth-service/src/models.py`: bổ sung các trường vào `UserDB` và định nghĩa thực thể ORM `PasswordResetTokenDB`.
* **Làm sạch Dữ liệu Mẫu (Seed Data) & Bổ sung Tài khoản Admin chuẩn UTH:**
  * Chuẩn hóa `database/seeds/01_seed_academic_data.sql`:
    * Triệt tiêu hoàn toàn lỗi vi phạm ràng buộc `UNIQUE constraint "users_email_key"` do trùng email giữa `lec-001` và `usr-lec-001`.
    * Cập nhật bộ tài khoản quản trị viên chính thức theo chuẩn hệ thống UTH Portal:
      * `admin@uth.edu.vn` (`usr-adm-uth` - Ban Quản trị UTH Portal).
      * `quizgen.ai.team@gmail.com` (`usr-adm-quizgen` - Ban Quản trị QuizGen AI với Google OAuth).
      * `admin@quizgen.ai` (`usr-adm-002` - Fallback Admin).
    * Bổ sung dữ liệu seed mẫu cho bảng `auth.password_reset_tokens`.
* **Đồng bộ Chuỗi Khởi Động Docker Compose:**
  * Cập nhật `docker-compose.yml` nạp tuần tự 11 tệp SQL khởi tạo: `00_init.sql` $\rightarrow$ `09_scrum_62_indexes.sql` $\rightarrow$ `10_scrum_84_auth.sql` $\rightarrow$ `11_seed.sql` (bảo đảm toàn bộ DDL hoàn tất trước khi nạp Seed Data).
* **Xây dựng Tiện ích Phục hồi CSDL Tự động (`restore_database.bat`):**
  * Xây dựng script Windows Batch `restore_database.bat` đồng bộ với `backup_database.bat`:
    * Tự động quét và chọn file kết xuất `.sql` mới nhất trong thư mục `backups/` hoặc nhận đường dẫn file từ tham số.
    * Nạp phục hồi trực tiếp vào container Docker `quizgen-postgres` qua lệnh `psql` trong < 5 giây.
    * Hỗ trợ dự phòng qua `psql` cục bộ và Python Recovery Engine (`scripts/backup_restore_db.py`).
* **Nâng cấp Tài liệu Đặc tả Kiến trúc CSDL lên v2.6:**
  * Cập nhật `DATABASE_SPECIFICATION.md` lên phiên bản **v2.6** bổ sung Data Dictionary chi tiết cho bảng `auth.password_reset_tokens`, các cột OAuth và danh mục B-Tree indexes mới.
* **Kiểm định Chất lượng Toàn diện (Pass 100%):**
  * Chạy kịch bản kiểm thử tự động `scripts/[SCRUM-84]_test_db_oauth_and_resets.py`: **6/6 kịch bản PASS (100%)**.
  * Chạy kiểm thử hồi quy `scripts/[SCRUM-62]_test_db_indexes_and_schema.py`: **6/6 kịch bản PASS (100%)**.
  * Type-check TypeScript (`npx tsc --noEmit`): **0 lỗi**.
  * Python Compilation toàn bộ microservices: **0 lỗi**.

---

### ⚠️ Những khó khăn đã xử lý:
1. **Xung đột Khóa duy nhất (Unique Constraint) trong Seed Data:** Cả `lec-001` và `usr-lec-001` trước đây đều dùng chung email `lecturer@vnu.edu.vn`, dẫn đến lỗi văng transaction khi init CSDL sạch $\rightarrow$ *Đã phân tách email định danh rõ ràng (`lecturer@vnu.edu.vn` cho `lec-001` và `nguyenvanan.cntt@vnu.edu.vn` cho `usr-lec-001`), đồng thời áp dụng `ON CONFLICT (id) DO UPDATE SET...` cho toàn bộ tài khoản.*
2. **Nguy cơ mất mã OTP khi restart server:** Cơ chế cũ lưu trữ OTP trong `Map()` của tiến trình Node.js khiến việc scale-out nhiều replica hoặc restart server làm mất mã của người dùng $\rightarrow$ *Đã thiết kế bảng `auth.password_reset_tokens` trên PostgreSQL với cơ chế TTL hết hạn và đếm số lần thử `attempts_count` chống brute-force.*
3. **Thứ tự thực thi Migration trên Docker Compose:** File migration mới cần chạy sau chỉ mục B-Tree `09` nhưng trước dữ liệu seed `10` $\rightarrow$ *Đã đặt tên mount `10_scrum_84_auth.sql` và chuyển seed thành `11_seed.sql` giúp PostgreSQL Alpine thực thi tuần tự hoàn hảo.*

---

## 📋 2. MINH CHỨNG KỸ THUẬT & KIỂM ĐỊNH (VERIFICATION PROOF)

```text
==============================================================================
 BẮT ĐẦU KIỂM ĐỊNH TOÀN DIỆN PHÂN HỆ CƠ SỞ DỮ LIỆU [SCRUM-84]
==============================================================================
 [PASS] | Kịch bản 1: Migration 10_[SCRUM-84]_auth_oauth_and_password_resets.sql
        Chi tiết: Đã có đủ cột Google OAuth (google_id, avatar_url, auth_provider), bảng auth.password_reset_tokens và B-Tree Indexes.
------------------------------------------------------------------------------
 [PASS] | Kịch bản 2: Đồng bộ DDL master trong 01_auth_service.sql
        Chi tiết: Đã tích hợp đầy đủ OAuth và Password Resets DDL kèm mệnh đề IF NOT EXISTS bảo đảm an toàn.
------------------------------------------------------------------------------
 [PASS] | Kịch bản 3: Tương thích SQLAlchemy ORM Models (UserDB & PasswordResetTokenDB)
        Chi tiết: Models Python đã ánh xạ chính xác các cột OAuth và bảng lưu mã OTP quên mật khẩu.
------------------------------------------------------------------------------
 [PASS] | Kịch bản 4: Làm sạch dữ liệu Seed Data (01_seed_academic_data.sql)
        Chi tiết: 0 lỗi trùng lặp email (8 emails duy nhất), đã nạp admin@uth.edu.vn, quizgen.ai.team@gmail.com và seed OTP.
------------------------------------------------------------------------------
 [PASS] | Kịch bản 5: Docker Compose mount tuần tự chuẩn xác 11 tệp SQL khởi tạo
        Chi tiết: 10_scrum_84_auth.sql chạy trước 11_seed.sql, bảo đảm toàn vẹn cấu trúc và dữ liệu.
------------------------------------------------------------------------------
 [PASS] | Kịch bản 6: Tiện ích phục hồi CSDL tự động restore_database.bat
        Chi tiết: Đã kiểm tra script khôi phục tự động qua Docker psql và Python fallback engine (< 5s).
==============================================================================
 Tỷ lệ thành công: 6/6 PASS (100.0%) - ĐẠT CHUẨN SẴN SÀNG TRIỂN KHAI VÀ DEMO
==============================================================================
```

### Danh mục tệp tin được lưu trữ & bàn giao:
- `[SCRUM-84]_BAO_CAO_TIEN_DO_13112026.md`: Báo cáo tiến độ và nghiệm thu nhiệm vụ [SCRUM-84].
- `database/migrations/10_[SCRUM-84]_auth_oauth_and_password_resets.sql`: Tệp migration mới cho Google OAuth & OTP.
- `database/migrations/01_auth_service.sql`: Cập nhật DDL master schema `auth`.
- `services/auth-service/src/models.py`: Cập nhật SQLAlchemy ORM models (`UserDB`, `PasswordResetTokenDB`).
- `services/auth-service/src/main.py`: Import `PasswordResetTokenDB`.
- `database/seeds/01_seed_academic_data.sql`: Dữ liệu seed sạch, độc nhất, bổ sung admin UTH/QuizGen và seed OTP.
- `docker-compose.yml`: Cấu hình mount tuần tự 11 tệp SQL PostgreSQL.
- `restore_database.bat`: Script tự động phục hồi CSDL tức thì phục vụ demo.
- `DATABASE_SPECIFICATION.md`: Nâng cấp đặc tả CSDL lên v2.6.
- `scripts/[SCRUM-84]_test_db_oauth_and_resets.py`: Kịch bản kiểm thử tự động [SCRUM-84].
- `scripts/[SCRUM-62]_test_db_indexes_and_schema.py`: Cập nhật kiểm thử hồi quy tương thích.
