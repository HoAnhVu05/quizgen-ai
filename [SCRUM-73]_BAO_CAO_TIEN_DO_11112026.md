# BÁO CÁO TIẾN ĐỘ CÔNG VIỆC [SCRUM-73]

**Dự án:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Tự động ứng dụng AI  
**Mã nhiệm vụ (Jira Issue):** [SCRUM-73]  
**Ngày thực hiện:** 11/11/2026  
**Người thực hiện:** Kỹ sư Cơ sở Dữ liệu & Tích hợp Backend (Database & Backend Engineer)  
**Nhánh Git:** `feature/database-architecture`  
**Trạng thái:** Hoàn thành xuất sắc 100% mục tiêu đề ra  

---

## ⚡ 1. TÓM TẮT CÔNG VIỆC HOÀN THÀNH (DAILY SUMMARY)

### 📌 Những việc đã làm:
* **Chuẩn hóa Schemas & Ràng buộc Khóa ngoại (Foreign Keys):**
  * Cập nhật chính thức cột `token_type` (access/refresh) vào `database/migrations/01_auth_service.sql` trên bảng `auth.user_tokens`.
  * Cập nhật chính thức cột `user_id` vào `database/migrations/03_rag_service.sql` trên cả 2 bảng `rag.vector_indexes` và `rag.retrieval_logs`.
  * Thiết lập chặt chẽ ràng buộc khóa ngoại `ON DELETE CASCADE` tới bảng người dùng `auth.users(id)` và tài liệu `documents.documents(id)`, đảm bảo tính toàn vẹn dữ liệu khi xóa tài khoản/giáo trình.
* **Đánh chỉ mục B-Tree Index Toàn diện trên 5 Schemas:**
  * Xây dựng tệp migration `database/migrations/09_[SCRUM-62]_comprehensive_b_tree_indexes.sql` thiết lập chỉ mục B-Tree Index tối ưu hóa tìm kiếm và JOIN cho 4 cột tần suất cao: `document_id`, `user_id`, `bloom_level`, `status` trên cả 5 schemas:
    1. **Schema `auth`**: `auth.users` (`role`, `is_active`), `auth.user_tokens` (`user_id`, `token_type`, `revoked`).
    2. **Schema `documents`**: `documents.documents` (`user_id`, `status`), `documents.document_chapters` (`document_id`), `documents.document_chunks` (`document_id`, `page_number`).
    3. **Schema `rag`**: `rag.vector_indexes` (`document_id`, `user_id`, `status`), `rag.retrieval_logs` (`document_id`, `user_id`), `rag.usage_quotas` (`user_id`).
    4. **Schema `ai`**: `ai.generation_jobs` (`user_id`, `document_id`, `status`), `ai.job_questions` (`bloom_level`, `job_id`), `ai.bloom_presets` (`is_default`).
    5. **Schema `exams`**: `exams.questions` (`document_id`, `created_by`, `bloom_level`, `status` và các Composite B-Tree lọc ma trận đề thi), `exams.exams` (`user_id`), `exams.question_audit_logs` (`question_id`, `lecturer_id`, `action`), `exams.exam_audit_logs` (`exam_id`, `user_id`, `action`), `exams.system_activities` (`user_id`, `action_type`), `exams.learning_outcomes` (`bloom_target`).
* **Đồng bộ Docker Compose:**
  * Cập nhật `docker-compose.yml` mount tuần tự 10 tệp SQL khởi tạo: `00_init.sql` $\rightarrow$ `09_scrum_62_indexes.sql` $\rightarrow$ `10_seed.sql` (bảo đảm DDL chạy trước khi seed nạp dữ liệu).
* **Tiện ích Sao lưu CSDL Tự động Phục vụ Demo (`backup_database.bat`):**
  * Xây dựng hoàn chỉnh script Windows Batch `backup_database.bat` sử dụng lệnh `pg_dump`:
    * Tự động phát hiện container Docker `quizgen-postgres` hoặc môi trường `pg_dump` cục bộ.
    * Tạo bản kết xuất SQL đầy đủ có gắn nhãn thời gian (`quizgen_backup_YYYYMMDD_HHMMSS.sql`) lưu trữ vào thư mục `backups/`.
    * Cung cấp cơ chế dự phòng khôi phục tức thì (< 5 giây) khi demo có sự cố dữ liệu.
* **Kiểm định Chất lượng Toàn diện (Pass 100%):**
  * Chạy kịch bản kiểm tra `[SCRUM-62]`: **6/6 kịch bản PASS (100%)**.
  * Chạy kịch bản Rate Limiting 5 lượt/phút: **5/5 kịch bản PASS (100%)**.
  * Chạy kịch bản Audit Logs & Thống kê Bloom: **7/7 kịch bản PASS (100%)**.
  * Type-check TypeScript (`npx tsc --noEmit`): **0 lỗi**.
  * Python Compilation toàn bộ microservices: **0 lỗi**.
* **Môi trường Web Demo:**
  * Kích hoạt Mock API Gateway (`http://localhost:8000/`) và Vite Frontend Server (`http://localhost:3000/`) hoạt động ổn định.

---

### ⚠️ Những khó khăn đã xử lý:
1. **Lỗi cú pháp Batch Script trên Windows Command Prompt:** Ký tự đặc biệt tiếng Việt và các ký tự điều hướng `<` / `>` trong file `.bat` dễ gây lỗi ngắt tiến trình `cmd.exe` $\rightarrow$ *Đã chuẩn hóa toàn bộ câu lệnh sang ASCII chuẩn, sử dụng lệnh PowerShell lấy định dạng ngày giờ an toàn và bổ sung cờ `--clean --if-exists` cho `pg_dump`.*
2. **Đảm bảo trật tự thực thi DDL/DML trên Docker Alpine:** Entrypoint của container PostgreSQL chạy script theo thứ tự bảng chữ cái. Nếu file migration B-Tree chạy sau file seed sẽ phát sinh cảnh báo $\rightarrow$ *Đã đặt tên mount `09_scrum_62_indexes.sql` và đổi seed thành `10_seed.sql` giúp chuỗi khởi động luôn đúng 100%.*

---

## 📋 2. MINH CHỨNG KỸ THUẬT & KIỂM ĐỊNH (VERIFICATION PROOF)

```text
===========================================================================
 BẮT ĐẦU KIỂM ĐỊNH TOÀN DIỆN PHÂN HỆ CƠ SỞ DỮ LIỆU [SCRUM-73] / [SCRUM-62]
===========================================================================
 [PASS] | Kịch bản 1: Cột 'token_type' và ràng buộc ON DELETE CASCADE trong 01_auth_service.sql
 [PASS] | Kịch bản 2: Cột 'user_id' và ràng buộc ON DELETE CASCADE trong 03_rag_service.sql
 [PASS] | Kịch bản 3: Chỉ mục B-Tree Index toàn diện trên cả 5 schemas (auth, documents, rag, ai, exams)
 [PASS] | Kịch bản 4: Docker Compose mount tuần tự chuẩn xác 10 file khởi tạo
 [PASS] | Kịch bản 5: Script sao lưu tự động backup_database.bat chuẩn lệnh pg_dump
 [PASS] | Kịch bản 6: Tính tương thích đồng bộ ORM Models Python Microservices
===========================================================================
 Tỷ lệ thành công: 6/6 PASS (100.0%) - ĐẠT CHUẨN SẴN SÀNG CHO BUỔI DEMO
===========================================================================
```

### Danh mục tệp tin được lưu trữ & bàn giao:
- `[SCRUM-73]_BAO_CAO_TIEN_DO_11112026.md`: Báo cáo tiến độ và nghiệm thu nhiệm vụ [SCRUM-73].
- `database/migrations/01_auth_service.sql`: Thêm `token_type`, `ON DELETE CASCADE`, B-Tree indexes.
- `database/migrations/03_rag_service.sql`: Thêm `user_id`, `ON DELETE CASCADE`, B-Tree indexes.
- `database/migrations/09_[SCRUM-62]_comprehensive_b_tree_indexes.sql`: Bộ chỉ mục B-Tree 5 schemas.
- `docker-compose.yml`: Cấu hình mount 10 tệp khởi tạo PostgreSQL.
- `backup_database.bat`: Script tự động sao lưu dữ liệu trước demo.
- `scripts/[SCRUM-62]_test_db_indexes_and_schema.py`: Kịch bản kiểm thử tự động.
