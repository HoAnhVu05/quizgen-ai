# 🗄️ QuizGen AI - Kiến Trúc & Thiết Kế Cơ Sở Dữ Liệu (Database Architecture)

Hệ thống cơ sở dữ liệu của **QuizGen AI** được xây dựng theo mô hình **Database-per-Service (Multi-Schema)** trên nền tảng **PostgreSQL 16** kết hợp với **ChromaDB (Vector Database)** cho phân hệ RAG.

---

## 🏛️ 1. Mô hình Phân vùng Schema theo Microservice

Mỗi microservice sở hữu một schema độc lập, đảm bảo nguyên tắc Encapsulation và Loose Coupling:

| Microservice | Port | Schema / Storage | Nhiệm vụ lưu trữ |
| :--- | :---: | :--- | :--- |
| **`auth-service`** | `8001` | Schema `auth` | Giảng viên, tài khoản đại học, mật khẩu mã hóa bcrypt, JWT tokens |
| **`document-service`** | `8002` | Schema `documents` | Metadata giáo trình, tiến trình bóc tách, danh sách chương, semantic chunks |
| **`rag-service`** | `8003` | Schema `rag` + ChromaDB | Vector embeddings (384-dim), log truy vấn độ tương đồng cosine |
| **`ai-service`** | `8004` | Schema `ai` | Lịch sử tác vụ gọi LLM, cấu hình ma trận nhận thức Bloom (presets & jobs) |
| **`exam-service`** | `8005` | Schema `exams` | Ngân hàng câu hỏi trắc nghiệm, trạng thái duyệt, gói đề thi hoán vị mã đề |

---

## 📊 2. Chi tiết Cấu trúc Bảng & Khóa (Data Dictionary)

### 2.1. Schema `auth`
- **`auth.users`**:
  - `id` (VARCHAR(50), PK): Định danh giảng viên (vd: `lec-001`).
  - `email` (VARCHAR(100), UNIQUE, NOT NULL): Email trường đại học.
  - `password_hash` (VARCHAR(255), NOT NULL): Mật khẩu băm Bcrypt.
  - `full_name` (VARCHAR(100), NOT NULL): Họ và tên giảng viên.
  - `academic_title` (VARCHAR(20)): Học hàm/học vị (`TS.`, `PGS.TS.`, `ThS.`, `GS.TS.`).
  - `university` (VARCHAR(150), NOT NULL): Tên trường đại học.
  - `department` (VARCHAR(150), NOT NULL): Khoa / Bộ môn.
  - `role` (VARCHAR(20), DEFAULT 'lecturer'): Quyền hạn.
  - `is_active` (BOOLEAN, DEFAULT TRUE).
  - `created_at`, `updated_at` (TIMESTAMP).
- **`auth.user_tokens`**:
  - `id` (VARCHAR(50), PK): Mã phiên làm việc.
  - `user_id` (VARCHAR(50), FK trỏ về `auth.users(id)`).
  - `token_hash`, `device_info`, `expires_at`, `revoked`, `created_at`.

### 2.2. Schema `documents`
- **`documents.documents`**:
  - `id` (VARCHAR(50), PK): Mã tài liệu (vd: `tb-001`).
  - `user_id` (VARCHAR(50), NOT NULL): Giảng viên nạp sách.
  - `name` (VARCHAR(255), NOT NULL): Tên file gốc (vd: `GiaoTrinh_KinhTeViMo_2025.pdf`).
  - `file_path` (VARCHAR(500), NOT NULL): Đường dẫn lưu trữ.
  - `file_size` (VARCHAR(20), NOT NULL): Kích cỡ file (vd: `14.2 MB`).
  - `total_pages` (INT, DEFAULT 0): Tổng số trang sách.
  - `chapters_count` (INT, DEFAULT 0): Số chương phát hiện.
  - `status` (VARCHAR(20), DEFAULT 'extracting'): `'extracting'` | `'embedding'` | `'ready'` | `'error'`.
  - `progress` (INT, DEFAULT 0): 0 - 100%.
  - `error_message` (TEXT).
- **`documents.document_chapters`**:
  - `id` (VARCHAR(50), PK): Mã chương.
  - `document_id` (VARCHAR(50), FK trỏ về `documents.documents(id)`).
  - `chapter_index` (INT): Thứ tự chương.
  - `title` (VARCHAR(255)): Tên chương mục.
  - `page_start`, `page_end` (INT): Khoảng số trang.
- **`documents.document_chunks`**:
  - `id` (VARCHAR(100), PK): Mã chunk (vd: `chunk-1`, `tb-001_c0001`).
  - `document_id` (VARCHAR(50), FK trỏ về `documents.documents(id)`).
  - `page_number` (INT): Số trang trích dẫn.
  - `chapter` (VARCHAR(255)): Tên chương.
  - `char_count` (INT): Độ dài văn bản.
  - `text_snippet` (TEXT): Đoạn trích dẫn ngữ nghĩa.

### 2.3. Schema `rag` & ChromaDB
- **ChromaDB Collection**: `textbook_chunks` (Cosine Distance, Index HNSW).
  - Metadata lưu trữ: `document_id`, `page_number`, `chapter`.
- **`rag.vector_indexes`**:
  - Theo dõi số lượng vector nhúng, model embedding, số chiều (384-dim).
- **`rag.retrieval_logs`**:
  - Nhật ký truy vấn context, phục vụ thống kê điểm tương đồng (`relevance_score`) và độ trễ (`latency_ms`).

### 2.4. Schema `ai`
- **`ai.bloom_presets`**:
  - `id` (VARCHAR(50), PK): Mã khuôn mẫu (vd: `preset-giua-ky`, `preset-cuoi-ky`, `preset-quiz-15p`).
  - `name`, `description`: Tên và mô tả đề.
  - `nhan_biet_pct`, `thong_hieu_pct`, `van_dung_pct`, `phan_tich_pct`: Tỷ lệ % phân bổ ma trận Bloom.
  - `is_default` (BOOLEAN).
- **`ai.generation_jobs`**:
  - `id` (VARCHAR(50), PK): Mã tác vụ sinh (vd: `job-20261030-001`).
  - `user_id`, `document_id`: Giảng viên & tài liệu nguồn.
  - `chapters` (JSONB): Mảng các chương được chọn.
  - `bloom_matrix` (JSONB): Số câu yêu cầu cho từng mức nhận thức.
  - `total_requested`, `total_generated` (INT).
  - `status` (VARCHAR(20)): `'queued'` | `'processing'` | `'completed'` | `'failed'`.
  - `prompt_tokens`, `completion_tokens` (INT).

### 2.5. Schema `exams`
- **`exams.questions`**:
  - `id` (VARCHAR(50), PK): Mã câu hỏi (vd: `q-1`, `q-101`).
  - `document_id` (VARCHAR(50)): Liên kết tài liệu nguồn.
  - `source_chunk_id` (VARCHAR(100), NOT NULL): Khóa ngoại trỏ sang chunk trích dẫn đối sánh trong RAG.
  - `textbook_name`, `chapter`: Thông tin giáo trình và chương.
  - `bloom_level` (VARCHAR(30)): `'Nhận biết'`, `'Thông hiểu'`, `'Vận dụng'`, `'Phân tích'`.
  - `question_text` (TEXT, NOT NULL): Nội dung câu hỏi trắc nghiệm.
  - `options` (JSONB, NOT NULL): 4 lựa chọn (A, B, C, D) dạng JSON mảng.
  - `correct_answer_id` (VARCHAR(20), NOT NULL): Mã phương án đúng (`opt-a`, `opt-b`, ...).
  - `explanation` (TEXT): Lời giải thích học thuật.
  - `confidence_score` (INT, DEFAULT 95): Điểm tin cậy của AI.
  - `status` (VARCHAR(20), DEFAULT 'pending'): `'pending'` (chờ duyệt) | `'approved'` (đã duyệt) | `'rejected'` (từ chối).
  - `created_by` (VARCHAR(50)): Mã giảng viên tạo/sở hữu.
- **`exams.exams`**:
  - `id` (VARCHAR(50), PK): Mã đề thi đã đóng gói (vd: `exam-2026-001`).
  - `user_id`: Giảng viên đóng gói.
  - `title`: Tiêu đề đề thi.
  - `subject`: Môn học.
  - `exam_codes` (JSONB): Mảng các mã đề hoán vị (vd: `["101", "102", "103", "104"]`).
  - `selected_question_ids` (JSONB): Danh sách các ID câu hỏi được đưa vào đề.
  - `duration_minutes` (INT, DEFAULT 60): Thời gian thi.
  - `format` (VARCHAR(20), DEFAULT 'docx'): `'docx'` | `'pdf'` | `'qti'`.
- **`exams.question_audit_logs`**:
  - Ghi nhận lịch sử duyệt, sửa inline hoặc sinh lại câu hỏi của giảng viên.

---

## 🚀 3. Hướng Dẫn Khởi Chạy Cơ Sở Dữ Liệu

### Cách 1: Khởi chạy tự động với Docker Compose
Toàn bộ schema và dữ liệu mẫu học thuật được tự động mount vào thư mục `/docker-entrypoint-initdb.d/` của PostgreSQL 16:
```bash
docker-compose up -d postgres
```
Kiểm tra kết nối và dữ liệu mẫu:
```bash
docker exec -it quizgen-postgres psql -U quizgen -d quizgen_db -c "\dn"
```

### Cách 2: Chạy độc lập cục bộ với SQLite (Không cần cài đặt Docker/Postgres)
Mỗi service Python đã được tích hợp sẵn lớp cơ sở dữ liệu thông minh trong `database.py`:
- Nếu biến môi trường `DATABASE_URL` không được chỉ định hoặc PostgreSQL chưa mở, service sẽ **tự động tạo file SQLite cục bộ** tại thư mục `data/` của service đó và nạp sẵn dữ liệu mẫu.
- Cho phép lập trình viên chạy kiểm thử ngay lập tức mà không gặp lỗi phụ thuộc môi trường.
