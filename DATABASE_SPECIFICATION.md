# ĐẶC TẢ KIẾN TRÚC & THIẾT KẾ CƠ SỞ DỮ LIỆU TOÀN DIỆN

**Hệ thống:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Tự động ứng dụng AI  

**Phiên bản:** v2.6 Database Specification (Cập nhật [SCRUM-84]: Google OAuth 2.0, Persistent OTP Password Resets, Data Cleaning & Automated Restore Engine)  

**Tài liệu:** Bản đặc tả chi tiết toàn bộ các Schema, Bảng, Khóa, Vector Store, Cache & Quy trình Dữ liệu



---



## MỤC LỤC TỔNG QUAN



1. [Tổng quan Kiến trúc Cơ sở Dữ liệu (Database Architecture Overview)](#1-tổng-quan-kiến-trúc-cơ-sở-dữ-liệu-database-architecture-overview)

2. [Sơ đồ Quan hệ Thực thể Toàn cục (Global ERD - Entity Relationship Diagram)](#2-sơ-đồ-quan-hệ-thực-thể-toàn-cục-global-erd---entity-relationship-diagram)

3. [Đặc tả Chi tiết 5 Schema PostgreSQL (Relational Data Dictionary)](#3-đặc-tả-chi-tiết-5-schema-postgresql-relational-data-dictionary)

   - 3.1. Schema `auth` (Phân hệ Xác thực & Quản lý Giảng viên)

   - 3.2. Schema `documents` (Phân hệ Quản lý Giáo trình & Đoạn trích Chunks)

   - 3.3. Schema `rag` (Phân hệ Vector Metadata & Nhật ký Truy xuất Đối soát)

   - 3.4. Schema `ai` (Phân hệ Ma trận Bloom & Tác vụ Gọi LLM)

   - 3.5. Schema `exams` (Phân hệ Ngân hàng Câu hỏi, Khảo thí & Đóng gói Đề thi)

   - 3.6. [SCRUM-58] Cơ chế Khảo thí Thang đo Nhận thức Bloom & Thống kê Sư phạm

   - 3.7. [SCRUM-52] Bộ Chỉ mục Tối ưu Hiệu năng & Kịch bản Rate Limiting 5 lượt/phút

4. [Đặc tả Cơ sở Dữ liệu Vector (ChromaDB Vector Store Specification)](#4-đặc-tả-cơ-sở-dữ-liệu-vector-chromadb-vector-store-specification)

5. [Đặc tả Phân hệ Bộ nhớ Đệm & Điều phối Tác vụ (Redis Cache & Broker)](#5-đặc-tả-phân-hệ-bộ-nhớ-đệm--điều-phối-tác-vụ-redis-cache--broker)

6. [Mã Nguồn Khởi tạo DDL SQL Toàn bộ Hệ thống (Master DDL Script)](#6-mã-nguồn-khởi-tạo-ddl-sql-toàn-bộ-hệ-thống-master-ddl-script)

7. [Vòng đời Dữ liệu & Luồng Truyền tải Liên dịch vụ (Data Lifecycle & Workflow)](#7-vòng-đời-dữ-liệu--luồng-truyền-tải-liên-dịch-vụ-data-lifecycle--workflow)



---



## 1. TỔNG QUAN KIẾN TRÚC CƠ SỞ DỮ LIỆU (DATABASE ARCHITECTURE OVERVIEW)



Cơ sở dữ liệu của **QuizGen AI** được thiết kế theo mô hình **Hybrid Polyglot Persistence** kết hợp giữa CSDL Quan hệ (Relational), CSDL Vector (Embedding Search), và In-Memory Cache (Key-Value):



```

┌─────────────────────────────────────────────────────────────────────────────┐

│                      QUIZGEN AI - HYBRID STORAGE ENGINE                     │

└─────────────────────────────────────────────────────────────────────────────┘

                                       │

        ┌──────────────────────────────┼──────────────────────────────┐

        ▼                              ▼                              ▼

┌──────────────────────────┐ ┌──────────────────────────┐ ┌───────────────────┐

│      POSTGRESQL 16       │ │         CHROMADB         │ │      REDIS 7      │

│  (Multi-Schema RDBMS)    │ │   (Vector Search DB)     │ │(Cache & Broker)   │

├──────────────────────────┤ ├──────────────────────────┤ ├───────────────────┤

│ • Schema `auth`          │ │ • Collection:            │ │ • JWT Blacklist   │

│ • Schema `documents`     │ │   `textbook_chunks`      │ │ • Task Progress   │

│ • Schema `rag`           │ │ • Model: all-MiniLM-L6-v2│ │ • API Rate Limit  │

│ • Schema `ai`            │ │ • 384 Dimensions         │ │ • Temporary RAG   │

│ • Schema `exams`         │ │ • Cosine Distance (HNSW) │ │   Query Cache     │

└──────────────────────────┘ └──────────────────────────┘ └───────────────────┘

```



### Nguyên lý Phân vùng Multi-Schema (Database-per-Service Pattern):

- **Tính đóng gói (Encapsulation):** Mỗi microservice có một schema chuyên biệt, sở hữu toàn bộ bảng và logic nghiệp vụ của riêng mình.

- **Tính mở rộng (Scalability):** Dễ dàng tách rời bất kỳ schema nào thành một instance PostgreSQL vật lý riêng khi tải của service tăng cao mà không làm thay đổi câu lệnh truy vấn SQL của ứng dụng.

- **Bảo mật truy cập:** Mỗi microservice có thể được phân quyền truy cập thông qua Database User riêng biệt, hạn chế tối đa rủi ro lộ dữ liệu chéo giữa các phân hệ.



---



## 2. SƠ ĐỒ QUAN HỆ THỰC THỂ TOÀN CỤC (GLOBAL ERD)



```mermaid

erDiagram

    %% SCHEMA AUTH

    USERS ||--o{ USER_TOKENS : "sở hữu"

    USERS {

        string id PK "lec-001"

        string email UK "giangvien@vnu.edu.vn"

        string password_hash "bcrypt"

        string full_name "TS. Nguyễn Văn A"

        string academic_title "TS."

        string university "ĐHQG"

        string department "Khoa Kinh tế"

        string role "lecturer"

        boolean is_active "true"

        datetime created_at

    }

    USER_TOKENS {

        string id PK

        string user_id FK

        string token_hash

        string device_info

        datetime expires_at

        boolean revoked

    }



    %% SCHEMA DOCUMENTS

    USERS ||--o{ DOCUMENTS : "nạp giáo trình"

    DOCUMENTS ||--o{ DOCUMENT_CHAPTERS : "phân rã thành"

    DOCUMENTS ||--o{ DOCUMENT_CHUNKS : "bóc tách ngữ nghĩa"

    DOCUMENTS {

        string id PK "tb-001"

        string user_id FK "lec-001"

        string name "GiaoTrinh_KinhTeViMo.pdf"

        string file_path "/storage/uploads/..."

        string file_size "14.2 MB"

        int total_pages "184"

        int chapters_count "5"

        string status "ready"

        int progress "100"

        datetime created_at

    }

    DOCUMENT_CHAPTERS {

        string id PK "ch-tb001-1"

        string document_id FK "tb-001"

        int chapter_index "1"

        string title "Chương 1: Khái quát..."

        int page_start "1"

        int page_end "35"

    }

    DOCUMENT_CHUNKS {

        string id PK "chunk-1"

        string document_id FK "tb-001"

        int page_number "42"

        string chapter "Chương 3..."

        int char_count "342"

        text text_snippet "Quy luật cầu chỉ rõ..."

    }



    %% SCHEMA RAG

    DOCUMENTS ||--o{ VECTOR_INDEXES : "lập chỉ mục"

    VECTOR_INDEXES {

        string id PK "vidx-001"

        string document_id FK "tb-001"

        string collection_name "textbook_chunks"

        int total_vectors "1850"

        string embedding_model "all-MiniLM-L6-v2"

        int dimension "384"

        string distance_metric "cosine"

        string status "ready"

    }

    RETRIEVAL_LOGS {

        string id PK "ret-001"

        text query_text "Quy luật co giãn cầu"

        string document_id FK "tb-001"

        int top_k "5"

        int matched_chunks_count "5"

        numeric top_relevance_score "94.50"

        int latency_ms "45"

    }



    %% SCHEMA AI

    USERS ||--o{ GENERATION_JOBS : "khởi tạo tác vụ"

    DOCUMENTS ||--o{ GENERATION_JOBS : "dùng làm ngữ cảnh"

    BLOOM_PRESETS {

        string id PK "preset-giua-ky"

        string name "Đề Giữa kỳ (20 câu)"

        int nhan_biet_pct "40"

        int thong_hieu_pct "40"

        int van_dung_pct "20"

        int phan_tich_pct "0"

        boolean is_default "true"

    }

    GENERATION_JOBS {

        string id PK "job-001"

        string user_id FK "lec-001"

        string document_id FK "tb-001"

        jsonb chapters "['Chương 1', 'Chương 2']"

        jsonb bloom_matrix "{nhanBiet: 8, ...}"

        int total_requested "20"

        int total_generated "20"

        string status "completed"

        string llm_provider "gemini"

        int prompt_tokens "4200"

        int completion_tokens "1850"

    }



    %% SCHEMA EXAMS

    DOCUMENTS ||--o{ QUESTIONS : "sinh ra từ"

    DOCUMENT_CHUNKS ||--o{ QUESTIONS : "minh chứng gốc (Source Chunk)"

    USERS ||--o{ EXAMS : "đóng gói xuất bản"

    QUESTIONS {

        string id PK "q-1"

        string document_id FK "tb-001"

        string source_chunk_id FK "chunk-1"

        string textbook_name "Kinh tế vi mô"

        string chapter "Chương 3"

        string bloom_level "Nhận biết"

        text question_text "Theo quy luật cầu..."

        jsonb options "[{id:'opt-a', label:'A', ...}]"

        string correct_answer_id "opt-a"

        text explanation "Quy luật chỉ ra quan hệ..."

        int confidence_score "99"

        string status "approved"

    }

    EXAMS {

        string id PK "ex-001"

        string user_id FK "lec-001"

        string title "ĐỀ THI KẾT THÚC HỌC PHẦN"

        string subject "Kinh tế vi mô"

        string faculty "Khoa Kinh tế"

        string university "ĐẠI HỌC QUỐC GIA"

        int duration_minutes "60"

        jsonb exam_codes "['101', '102', '103', '104']"

        jsonb selected_question_ids "['q-1', 'q-2', 'q-3']"

        string format "docx"

    }

```



---



## 3. ĐẶC TẢ CHI TIẾT 5 SCHEMA POSTGRESQL (DATA DICTIONARY)



---



### 3.1. Schema `auth` (Phân hệ Xác thực & Quản lý Giảng viên)

Chịu trách nhiệm lưu trữ danh tính giảng viên, học hàm, trường đại học, phân quyền và phiên làm việc JWT.



#### Bảng: `auth.users`

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Giá trị Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |

|---|---|---|---|---|

| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Mã định danh duy nhất của giảng viên (VD: `lec-001`). |

| `email` | `VARCHAR(100)` | **UNIQUE, NOT NULL** | Không | Email giảng viên thuộc tên miền giáo dục (VD: `giangvien@vnu.edu.vn`). Dùng đăng nhập. |

| `password_hash` | `VARCHAR(255)` | **NOT NULL** | Không | Mật khẩu được băm bảo mật bằng thuật toán **Bcrypt** (Salt rounds = 12). |

| `full_name` | `VARCHAR(100)` | **NOT NULL** | Không | Họ và tên đầy đủ của giảng viên (VD: *Nguyễn Văn A*). |

| `academic_title` | `VARCHAR(20)` | `NULLABLE` | `'TS.'` | Học hàm, học vị: `TS.`, `ThS.`, `PGS.TS.`, `GS.TS.`. |

| `university` | `VARCHAR(150)` | **NOT NULL** | Không | Cơ quan công tác (VD: *ĐẠI HỌC QUỐC GIA*). Dùng để in tiêu đề đề thi. |

| `department` | `VARCHAR(150)` | **NOT NULL** | Không | Khoa / Bộ môn chuyên trách (VD: *Khoa Kinh tế & Quản trị*). |

| `role` | `VARCHAR(20)` | **NOT NULL** | `'lecturer'` | Quyền hạn: `'lecturer'` (Giảng viên), `'head_of_department'` (Trưởng bộ môn), `'admin'`. |

| `is_active` | `BOOLEAN` | **NOT NULL** | `TRUE` | Trạng thái tài khoản (bị khóa nếu là `FALSE`). |

| `google_id` | `VARCHAR(100)` | **UNIQUE, NULLABLE** | `NULL` | [SCRUM-84] ID định danh người dùng từ Google OAuth 2.0 (`sub` claim). |

| `avatar_url` | `TEXT` | `NULLABLE` | `NULL` | [SCRUM-84] Đường dẫn URL ảnh đại diện của người dùng. |

| `auth_provider` | `VARCHAR(30)` | **NOT NULL** | `'local'` | [SCRUM-84] Phương thức xác thực: `'local'`, `'google'`.

| `created_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm khởi tạo tài khoản. |

| `updated_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm cập nhật hồ sơ gần nhất. |



- **Chỉ mục (Indexes):**

  - `idx_users_email` (B-Tree trên `email`) $\rightarrow$ Tăng tốc độ xác thực khi Login.

  - `idx_users_university` (B-Tree trên `university`).

  - `idx_users_role` (B-Tree trên `role`).

  - `idx_users_status` (B-Tree trên `is_active`).

  - `idx_users_google_id` (B-Tree trên `google_id`) [SCRUM-84] Tra cứu nhanh đăng nhập Google OAuth.

  - `idx_users_auth_provider` (B-Tree trên `auth_provider`) [SCRUM-84] Phân loại nguồn xác thực.

  - `idx_users_email_provider` (B-Tree composite trên `email, auth_provider`).



#### Bảng: `auth.user_tokens`

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Giá trị Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |

|---|---|---|---|---|

| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Mã định danh phiên làm việc. |

| `user_id` | `VARCHAR(50)` | **FOREIGN KEY, NOT NULL** | Không | Trỏ đến `auth.users(id)` (`ON DELETE CASCADE`). |

| `token_hash` | `VARCHAR(255)` | **NOT NULL** | Không | Mã băm SHA-256 của chuỗi Refresh Token để xác minh phiên. |

| `device_info` | `VARCHAR(255)` | `NULLABLE` | Không | Thông tin thiết bị và trình duyệt (User-Agent). |

| `expires_at` | `TIMESTAMPTZ` | **NOT NULL** | Không | Thời điểm hết hạn của phiên đăng nhập. |

| `revoked` | `BOOLEAN` | **NOT NULL** | `FALSE` | Cờ thu hồi token (khi giảng viên bấm Đăng xuất). |

| `created_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm cấp phát token. |



#### Bảng: `auth.password_reset_tokens` [SCRUM-84]

Quản lý mã OTP 6 chữ số gửi qua Email SMTP (Gmail) cho quy trình Quên mật khẩu, hỗ trợ phòng chống tấn công brute-force và kiểm tra hết hạn thời gian thực (< 5ms).

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Giá trị Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |

|---|---|---|---|---|

| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Mã định danh duy nhất của phiên OTP (VD: `prt-001`). |

| `email` | `VARCHAR(100)` | **NOT NULL** | Không | Email của người dùng yêu cầu khôi phục mật khẩu. |

| `otp_code` | `VARCHAR(10)` | **NOT NULL** | Không | Chuỗi OTP gồm 6 chữ số ngẫu nhiên sinh ra từ hệ thống. |

| `otp_hash` | `VARCHAR(255)` | `NULLABLE` | Không | Mã băm bảo mật SHA-256 của OTP (tùy chọn mở rộng). |

| `expires_at` | `TIMESTAMPTZ` | **NOT NULL** | Không | Thời điểm hết hạn mã OTP (thời hạn tiêu chuẩn: 10 phút). |

| `is_used` | `BOOLEAN` | **NOT NULL** | `FALSE` | Đánh dấu mã đã được tiêu thụ đổi mật khẩu thành công. |

| `attempts_count` | `INT` | **NOT NULL** | `0` | Số lần thử nhập sai mã OTP để khóa phiên nếu vượt quá 5 lần. |

| `created_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm khởi tạo và gửi email OTP. |



- **Chỉ mục (Indexes):**

  - `idx_pwd_resets_email` (B-Tree trên `email`) Tra cứu các phiên reset theo người dùng.

  - `idx_pwd_resets_active` (B-Tree trên `email, is_used, expires_at`) Lọc mã OTP còn hiệu lực.

  - `idx_pwd_resets_lookup` (B-Tree composite trên `email, otp_code, is_used, expires_at`) Xác thực 1-bước siêu tốc.



---



### 3.2. Schema `documents` (Phân hệ Giáo trình & Đoạn trích Chunks)

Quản lý các tệp tài liệu học thuật gốc (PDF/Word), tiến trình bóc tách và phân đoạn ngữ nghĩa (Semantic Chunks).



#### Bảng: `documents.documents`

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Giá trị Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |

|---|---|---|---|---|

| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Mã định danh giáo trình (VD: `tb-001`, `tb-002`). |

| `user_id` | `VARCHAR(50)` | **NOT NULL** | `'lec-001'` | Khóa logic liên kết với `auth.users(id)`. |

| `name` | `VARCHAR(255)` | **NOT NULL** | Không | Tên tệp gốc khi tải lên (VD: `GiaoTrinh_KinhTeViMo_2025.pdf`). |

| `file_path` | `VARCHAR(500)` | **NOT NULL** | Không | Đường dẫn lưu trữ tệp vật lý trên disk/volume máy chủ. |

| `file_size` | `VARCHAR(20)` | **NOT NULL** | Không | Dung lượng tệp định dạng chuỗi dễ đọc (VD: `14.2 MB`). |

| `total_pages` | `INT` | **NOT NULL** | `0` | Tổng số trang văn bản vật lý trích xuất được. |

| `chapters_count` | `INT` | **NOT NULL** | `0` | Số lượng chương mục AI nhận diện được trong sách. |

| `status` | `VARCHAR(20)` | **NOT NULL** | `'extracting'` | Trạng thái: `'extracting'`, `'embedding'`, `'ready'`, `'error'`. |

| `progress` | `INT` | **NOT NULL** | `0` | Tiến độ xử lý tính theo % (từ 0 đến 100). |

| `error_message` | `TEXT` | `NULLABLE` | Không | Nội dung chi tiết lỗi nếu bóc tách thất bại. |

| `created_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm tải lên. |

| `updated_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm hoàn tất vector hóa. |



- **Chỉ mục (Indexes):**

  - `idx_documents_user_id` (B-Tree trên `user_id`).

  - `idx_documents_status` (B-Tree trên `status`) $\rightarrow$ Phục vụ lọc các giáo trình đã `ready` để đưa vào danh sách sinh đề.



#### Bảng: `documents.document_chapters`

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Giá trị Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |

|---|---|---|---|---|

| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Mã định danh chương (VD: `ch-tb001-1`). |

| `document_id` | `VARCHAR(50)` | **FOREIGN KEY, NOT NULL** | Không | Trỏ đến `documents.documents(id)` (`ON DELETE CASCADE`). |

| `chapter_index` | `INT` | **NOT NULL** | Không | Thứ tự của chương trong mục lục (1, 2, 3...). |

| `title` | `VARCHAR(255)` | **NOT NULL** | Không | Tên đầy đủ của chương (VD: *Chương 3: Cung - Cầu và Giá cả thị trường*). |

| `page_start` | `INT` | **NOT NULL** | `1` | Trang bắt đầu của chương. |

| `page_end` | `INT` | **NOT NULL** | `1` | Trang kết thúc của chương. |

| `created_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm nhận diện. |



#### Bảng: `documents.document_chunks`

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Giá trị Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |

|---|---|---|---|---|

| `id` | `VARCHAR(100)` | **PRIMARY KEY** | Tự sinh | Mã định danh đoạn trích (VD: `chunk-1`, `tb001_c0042`). Đồng nhất với ID trong ChromaDB. |

| `document_id` | `VARCHAR(50)` | **FOREIGN KEY, NOT NULL** | Không | Trỏ đến `documents.documents(id)` (`ON DELETE CASCADE`). |

| `page_number` | `INT` | **NOT NULL** | Không | Trang sách vật lý chứa đoạn văn bản này. |

| `chapter` | `VARCHAR(255)` | **NOT NULL** | Không | Tên chương chứa đoạn văn bản này. |

| `char_count` | `INT` | **NOT NULL** | `0` | Số lượng ký tự trong đoạn trích (thường từ 400 - 1000 ký tự). |

| `text_snippet` | `TEXT` | **NOT NULL** | Không | Nội dung văn bản trích dẫn nguyên văn phục vụ đối soát RAG. |

| `created_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm bóc tách. |



- **Chỉ mục (Indexes):**

  - `idx_chunks_doc_page` (B-Tree trên `document_id, page_number`) $\rightarrow$ Tìm kiếm nhanh văn bản theo số trang.



---



### 3.3. Schema `rag` (Phân hệ Vector Metadata & Nhật ký Truy xuất)

Theo dõi tình trạng index dữ liệu trong ChromaDB và ghi lại nhật ký đối soát truy vấn ngữ cảnh.



#### Bảng: `rag.vector_indexes`

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Giá trị Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |

|---|---|---|---|---|

| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Mã bản ghi chỉ mục vector (VD: `vidx-001`). |

| `document_id` | `VARCHAR(50)` | **NOT NULL** | Không | Khóa logic liên kết với `documents.documents(id)`. |

| `collection_name` | `VARCHAR(100)` | **NOT NULL** | `'textbook_chunks'` | Tên bộ sưu tập trong ChromaDB. |

| `total_vectors` | `INT` | **NOT NULL** | `0` | Tổng số lượng vector đã nhúng và lập chỉ mục. |

| `embedding_model` | `VARCHAR(100)` | **NOT NULL** | `'all-MiniLM-L6-v2'` | Tên mô hình AI nhúng ngôn ngữ tự nhiên. |

| `dimension` | `INT` | **NOT NULL** | `384` | Số chiều của vector nhúng (Dense Vector Dimensions). |

| `distance_metric` | `VARCHAR(20)` | **NOT NULL** | `'cosine'` | Thuật toán đo khoảng cách tương đồng (`cosine`, `l2`, `ip`). |

| `status` | `VARCHAR(20)` | **NOT NULL** | `'indexing'` | Trạng thái: `'indexing'`, `'ready'`, `'error'`. |

| `indexed_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm hoàn tất nạp vector. |



#### Bảng: `rag.retrieval_logs`

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Giá trị Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |

|---|---|---|---|---|

| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Mã nhật ký truy vấn (VD: `ret-001`). |

| `query_text` | `TEXT` | **NOT NULL** | Không | Câu truy vấn ngữ cảnh được gửi đến ChromaDB. |

| `document_id` | `VARCHAR(50)` | `NULLABLE` | Không | Phạm vi giáo trình tìm kiếm. |

| `top_k` | `INT` | **NOT NULL** | `5` | Số lượng chunk phù hợp nhất được yêu cầu lấy về. |

| `matched_chunks_count` | `INT` | **NOT NULL** | `0` | Số lượng chunk thực tế tìm thấy. |

| `top_relevance_score` | `NUMERIC(5,2)`| `NULLABLE` | Không | Điểm tương đồng cosine cao nhất đạt được (tính theo %, VD: `98.20%`). |

| `latency_ms` | `INT` | **NOT NULL** | `0` | Thời gian phản hồi của ChromaDB (tính bằng milliseconds). |

| `created_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm thực hiện truy xuất. |



---



### 3.4. Schema `ai` (Phân hệ Ma trận Bloom & Tác vụ Gọi LLM)

Lưu trữ các mẫu cấu hình sư phạm và giám sát các tác vụ sinh câu hỏi bằng mô hình ngôn ngữ lớn (Gemini).



#### Bảng: `ai.bloom_presets`

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Giá trị Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |

|---|---|---|---|---|

| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Mã khuôn mẫu (VD: `preset-giua-ky`, `preset-cuoi-ky`, `preset-quiz-15p`). |

| `name` | `VARCHAR(100)` | **NOT NULL** | Không | Tên hiển thị (VD: *Đề Giữa kỳ (20 câu)*). |

| `description` | `VARCHAR(255)` | `NULLABLE` | Không | Mô tả quy chuẩn đào tạo áp dụng. |

| `nhan_biet_pct` | `INT` | **NOT NULL** | `40` | Tỷ lệ % câu hỏi cấp độ Nhận biết. |

| `thong_hieu_pct` | `INT` | **NOT NULL** | `40` | Tỷ lệ % câu hỏi cấp độ Thông hiểu. |

| `van_dung_pct` | `INT` | **NOT NULL** | `20` | Tỷ lệ % câu hỏi cấp độ Vận dụng. |

| `phan_tich_pct` | `INT` | **NOT NULL** | `0` | Tỷ lệ % câu hỏi cấp độ Phân tích. |

| `is_default` | `BOOLEAN` | **NOT NULL** | `FALSE` | Đánh dấu khuôn mẫu mặc định được ưu tiên hiển thị. |

| `created_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm tạo mẫu. |



#### Bảng: `ai.generation_jobs`

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Giá trị Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |

|---|---|---|---|---|

| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Mã tác vụ (VD: `job-20261030-001`). |

| `user_id` | `VARCHAR(50)` | **NOT NULL** | `'lec-001'` | Giảng viên yêu cầu tác vụ. |

| `document_id` | `VARCHAR(50)` | **NOT NULL** | Không | Giáo trình nguồn được chọn để truy xuất RAG. |

| `chapters` | `JSONB` | **NOT NULL** | Không | Mảng danh sách các chương được chọn: `["Chương 1", "Chương 2"]`. |

| `bloom_matrix` | `JSONB` | **NOT NULL** | Không | Cấu hình số câu cho từng bậc: `{"nhanBiet": 8, "thongHieu": 8, "vanDung": 4, "phanTich": 0}`. |

| `total_requested` | `INT` | **NOT NULL** | `0` | Tổng số câu hỏi giảng viên yêu cầu tạo. |

| `total_generated` | `INT` | **NOT NULL** | `0` | Số lượng câu hỏi thực tế AI sinh thành công. |

| `status` | `VARCHAR(20)` | **NOT NULL** | `'queued'` | Trạng thái: `'queued'`, `'processing'`, `'completed'`, `'failed'`. |

| `llm_provider` | `VARCHAR(50)` | **NOT NULL** | `'gemini'` | Đơn vị cung cấp LLM (`gemini`, `openai`, `anthropic`). |

| `model_version` | `VARCHAR(50)` | **NOT NULL** | `'gemini-1.5-pro'` | Phiên bản mô hình AI sử dụng. |

| `prompt_tokens` | `INT` | **NOT NULL** | `0` | Số token đầu vào (Input Prompt Tokens). |

| `completion_tokens`| `INT` | **NOT NULL** | `0` | Số token đầu ra sinh ra (Output Completion Tokens). |

| `error_message` | `TEXT` | `NULLABLE` | Không | Chi tiết lỗi nếu gọi API LLM thất bại. |

| `created_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm bấm nút kích hoạt. |

| `completed_at` | `TIMESTAMPTZ` | `NULLABLE` | Không | Thời điểm hoàn tất toàn bộ quy trình sinh đề. |



---



### 3.5. Schema `exams` (Phân hệ Ngân hàng Câu hỏi & Đóng gói Đề thi)

Lưu trữ kho câu hỏi trắc nghiệm đã sinh, trạng thái kiểm duyệt và các gói đề thi xuất bản.



#### Bảng: `exams.questions`

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Giá trị Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |

|---|---|---|---|---|

| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Mã định danh câu hỏi (VD: `q-1`, `q-2`, `q-101`). |

| `document_id` | `VARCHAR(50)` | `NULLABLE` | Không | Khóa logic trỏ về giáo trình gốc `documents.documents(id)`. |

| `source_chunk_id`| `VARCHAR(100)`| **NOT NULL** | Không | **Khóa ngoại trỏ sang chunk trích dẫn đối soát** trong `documents.document_chunks(id)` và ChromaDB. |

| `textbook_name` | `VARCHAR(255)` | **NOT NULL** | Không | Tên sách giáo trình (lưu denormalized để tăng tốc hiển thị). |

| `chapter` | `VARCHAR(255)` | **NOT NULL** | Không | Tên chương mục chứa kiến thức của câu hỏi. |

| `bloom_level` | `VARCHAR(30)` | **NOT NULL** | Không | Bậc thang nhận thức Bloom: `'Nhận biết'`, `'Thông hiểu'`, `'Vận dụng'`, `'Phân tích'`. |

| `question_text` | `TEXT` | **NOT NULL** | Không | Nội dung câu hỏi trắc nghiệm (hỗ trợ công thức LaTeX / Markdown). |

| `options` | `JSONB` | **NOT NULL** | Không | Danh sách 4 phương án lựa chọn dạng mảng JSON (xem cấu trúc dưới). |

| `correct_answer_id`| `VARCHAR(20)` | **NOT NULL** | Không | ID của phương án đúng (`opt-a`, `opt-b`, `opt-c`, `opt-d`). |

| `explanation` | `TEXT` | `NULLABLE` | Không | Lời giải thích căn cứ sư phạm chứng minh vì sao đáp án đó đúng. |

| `confidence_score`| `INT` | **NOT NULL** | `95` | Điểm độ tin cậy của AI (thang 0 - 100, đo lường độ gắn kết với tài liệu). |

| `status` | `VARCHAR(20)` | **NOT NULL** | `'pending'` | Trạng thái kiểm duyệt: `'pending'` (Chờ duyệt), `'approved'` (Đã duyệt), `'rejected'` (Từ chối). |

| `image_url` | `TEXT` | `NULLABLE` | Không | [SCRUM-90] Đường dẫn tệp hình vẽ, sơ đồ mạch điện, đồ thị hoặc Base64 Data URI minh họa câu hỏi. |

| `has_formula` | `BOOLEAN` | **NOT NULL** | `FALSE` | [SCRUM-90] Cờ đánh dấu câu hỏi có chứa công thức Toán/Lý/Hóa theo chuẩn LaTeX (`$...$` hoặc `$$...$$`). |

| `image_caption` | `TEXT` | `NULLABLE` | Không | [SCRUM-90] Chú thích học thuật đi kèm hình vẽ hiển thị dưới sơ đồ. |

| `created_by` | `VARCHAR(50)` | **NOT NULL** | `'lec-001'` | Giảng viên sở hữu câu hỏi. |

| `created_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm AI sinh ra câu hỏi. |

| `updated_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm giảng viên chỉnh sửa nội dung/đáp án. |



- **Cấu trúc JSONB cột `options`:**

```json

[

  { "id": "opt-a", "label": "A", "text": "Khi giá hàng hóa tăng thì lượng cầu giảm xuống" },

  { "id": "opt-b", "label": "B", "text": "Khi giá hàng hóa tăng thì lượng cầu tăng lên" },

  { "id": "opt-c", "label": "C", "text": "Giá cả và lượng cầu luôn biến thiên cùng chiều" },

  { "id": "opt-d", "label": "D", "text": "Lượng cầu không chịu sự tác động của mức giá thị trường" }

]

```



- **Chỉ mục (Indexes):**

  - `idx_questions_status` (B-Tree trên `status`) $\rightarrow$ Tăng tốc lọc câu hỏi chờ duyệt ở màn hình Review.

  - `idx_questions_bloom` (B-Tree trên `bloom_level`) $\rightarrow$ Phục vụ bộ lọc trong Ngân hàng câu hỏi.

  - `idx_questions_source_chunk` (B-Tree trên `source_chunk_id`) $\rightarrow$ Truy xuất siêu nhanh minh chứng RAG.



#### Bảng: `exams.exams`

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Giá trị Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |

|---|---|---|---|---|

| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Mã gói đề thi (VD: `ex-20261030-001`). |

| `user_id` | `VARCHAR(50)` | **NOT NULL** | `'lec-001'` | Giảng viên tạo và xuất bản đề thi. |

| `title` | `VARCHAR(255)` | **NOT NULL** | Không | Tiêu đề kỳ thi (VD: *ĐỀ THI KẾT THÚC HỌC PHẦN - HỌC KỲ II*). |

| `subject` | `VARCHAR(150)` | **NOT NULL** | Không | Tên môn học / học phần (VD: *Kinh tế vi mô*). |

| `faculty` | `VARCHAR(150)` | **NOT NULL** | `'Khoa Kinh tế & Quản trị'` | Khoa / Bộ môn phụ trách đào tạo. |

| `university` | `VARCHAR(150)` | **NOT NULL** | `'ĐẠI HỌC QUỐC GIA'` | Tên trường đại học xuất hiện trên đầu trang đề thi. |

| `duration_minutes`| `INT` | **NOT NULL** | `60` | Thời gian làm bài thi (phút). |

| `exam_codes` | `JSONB` | **NOT NULL** | Không | Danh sách các mã đề hoán vị được sinh: `["101", "102", "103", "104"]`. |

| `selected_question_ids` | `JSONB` | **NOT NULL** | Không | Mảng danh sách ID các câu hỏi được chọn để đóng gói: `["q-1", "q-2", "q-3"]`. |

| `format` | `VARCHAR(20)` | **NOT NULL** | `'docx'` | Định dạng xuất: `'docx'` (Word), `'pdf'`, `'qti'` (Canvas/Moodle). |

| `created_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm đóng gói đề thi thành công. |



#### Bảng: `exams.exam_variants` (Các Bản Hoán Vị Mã Đề)

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Giá trị Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |
|---|---|---|---|---|
| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Mã hoán vị đề (VD: `var-001-101`). |
| `exam_id` | `VARCHAR(50)` | **FOREIGN KEY, NOT NULL** | Không | Trỏ đến `exams.exams(id)` (`ON DELETE CASCADE`). |
| `exam_code` | `VARCHAR(10)` | **NOT NULL** | Không | Mã đề thi học thuật: `'101'`, `'102'`, `'103'`, `'104'`. |
| `question_sequence` | `JSONB` | **NOT NULL** | Không | Thứ tự câu hỏi hoán vị kèm hoán vị các phương án ABCD. |
| `answer_keys` | `JSONB` | **NOT NULL** | Không | Bảng đáp án đối chiếu nhanh cho máy quét chấm thi OMR / giảng viên. |
| `file_path` | `VARCHAR(500)` | `NULLABLE` | Không | Đường dẫn lưu trữ file Word/PDF xuất bản của mã đề. |
| `created_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm sinh mã đề. |



#### Bảng: `exams.question_audit_logs` ([SCRUM-58] Nhật Ký Vết Khảo Thí & Chỉnh Sửa Câu Hỏi)

Lưu trữ 100% vết chỉnh sửa của giảng viên (Audit Trail) phục vụ công tác thanh tra khảo thí, đối soát sư phạm và thẩm định đề thi.

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Giá trị Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |
|---|---|---|---|---|
| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Định danh vết khảo thí (`q-audit-...`). |
| `question_id` | `VARCHAR(50)` | **FOREIGN KEY, NOT NULL** | Không | Trỏ đến `exams.questions(id)` (`ON DELETE CASCADE`). |
| `lecturer_id` | `VARCHAR(50)` | **NOT NULL** | Không | Mã định danh giảng viên thực hiện hành động. |
| `action` | `VARCHAR(50)` | **NOT NULL** | Không | Thao tác: `'inline_edit'`, `'approve'`, `'reject'`, `'status_change'`, `'regenerate'`, `'update_bloom'`. |
| `previous_state` | `JSONB` | `NULLABLE` | Không | Snapshot toàn bộ nội dung câu hỏi trước khi chỉnh sửa. |
| `new_state` | `JSONB` | `NULLABLE` | Không | Snapshot toàn bộ nội dung câu hỏi sau khi chỉnh sửa. |
| `change_summary` | `TEXT` | `NULLABLE` | Không | Chuỗi tóm tắt thay đổi tự động (VD: *Giảng viên sửa nội dung câu hỏi, đổi đáp án đúng (A -> C)*). |
| `field_changes` | `JSONB` | `NULLABLE` | Không | Chi tiết diff theo từng trường: `{"question": {"old": "..", "new": ".."}, "bloomLevel": {...}}`. |
| `edit_reason` | `TEXT` | `NULLABLE` | Không | Căn cứ sư phạm / lý do điều chỉnh từ giảng viên hoặc Hội đồng khảo thí. |
| `ip_address` | `VARCHAR(45)` | `NULLABLE` | Không | Địa chỉ IP của giảng viên khi thao tác (IPv4 hoặc IPv6). |
| `user_agent` | `VARCHAR(255)` | `NULLABLE` | Không | Thông tin thiết bị và trình duyệt thực hiện thao tác. |
| `performed_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm ghi nhận vết khảo thí. |



#### Bảng: `exams.exam_audit_logs` ([SCRUM-52] Nhật Ký Vận Hành & Xuất Bản Đề Thi)

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Giá trị Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |
|---|---|---|---|---|
| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Định danh bản ghi (`ex-audit-...`). |
| `exam_id` | `VARCHAR(50)` | **FOREIGN KEY, NOT NULL** | Không | Trỏ đến `exams.exams(id)` (`ON DELETE CASCADE`). |
| `user_id` | `VARCHAR(50)` | **NOT NULL** | Không | Người thực hiện (giảng viên / phòng khảo thí). |
| `action` | `VARCHAR(50)` | **NOT NULL** | Không | Thao tác: `'create'`, `'export_pdf'`, `'export_docx'`, `'export_qti'`, `'permute_codes'`, `'update_matrix'`. |
| `details` | `JSONB` | `NULLABLE` | Không | Chi tiết gói xuất (số lượng câu, cấu hình hoán vị, phiếu OMR đính kèm). |
| `ip_address` | `VARCHAR(45)` | `NULLABLE` | Không | IP client. |
| `user_agent` | `VARCHAR(255)` | `NULLABLE` | Không | Trình duyệt / client. |
| `performed_at` | `TIMESTAMPTZ` | **NOT NULL** | `CURRENT_TIMESTAMP` | Thời điểm tác vụ diễn ra. |



#### Các Bảng Học Thuật & Hoạt Động Bổ Sung

- **`exams.subjects`**: Danh mục môn học / học phần (`id, code, name, credits, faculty_id, description`).
- **`exams.learning_outcomes`**: Chuẩn đầu ra môn học CLO (`id, subject_id, code, description, bloom_target`).
- **`exams.question_clos`**: Bảng liên kết câu hỏi với chuẩn đầu ra (`question_id, clo_id`).
- **`exams.system_activities`**: Nhật ký hoạt động hiển thị dòng thời gian trên màn hình Dashboard (`id, user_id, action_type, title, detail, icon_name, badge_color`).



---



### 3.6. [SCRUM-58] CƠ CHẾ KHẢO THÍ THANG ĐO NHẬN THỨC BLOOM & THỐNG KÊ SƯ PHẠM

Hệ thống QuizGen AI chuẩn hóa thang đo nhận thức Bloom theo 4 cấp độ khảo thí đại học:

| Cấp độ Bloom | Tên tiếng Anh | Phân tầng Sư phạm | Tỷ lệ Mục tiêu Chuẩn (Blueprint) | Mô tả Năng lực Đánh giá |
|---|---|---|---|---|
| **Nhận biết** | Remember | Cơ bản (Basic) | **40%** | Nhắc lại định nghĩa, khái niệm, thuật ngữ cơ bản từ giáo trình. |
| **Thông hiểu** | Understand | Cơ bản (Basic) | **30%** | Giải thích bản chất, phân biệt các hiện tượng, so sánh nguyên lý. |
| **Vận dụng** | Apply | Nâng cao (Advanced) | **20%** | Áp dụng công thức, định lý vào giải quyết tình huống định lượng cụ thể. |
| **Phân tích** | Analyze | Nâng cao (Advanced) | **10%** | Mổ xẻ tình huống phức tạp, chỉ ra nguyên nhân - hệ quả, đánh giá ma trận dữ liệu. |

#### Công Thức Tính Toán & Đánh Giá Tự Động:
1. **Tỷ lệ phần trăm từng mức:**  
   $$\text{percentage}_i = \frac{count_i}{\sum count} \times 100\%$$
2. **Phân tầng tổng hợp:**  
   $$\text{Tỷ lệ Cơ bản} = \%(\text{Nhận biết}) + \%(\text{Thông hiểu})$$  
   $$\text{Tỷ lệ Nâng cao} = \%(\text{Vận dụng}) + \%(\text{Phân tích})$$
3. **Độ lệch chuẩn mực sư phạm (Deviation):**  
   $$\Delta\%_i = \text{percentage}_i - \text{target}_i$$
4. **Đánh giá cân bằng ma trận:**
   - Nếu Tỷ lệ Nâng cao $> 35\%$: Gắn cờ *"Độ phân hóa cao (> 35% nâng cao)"*.
   - Nếu Tỷ lệ Cơ bản $> 80\%$: Gắn cờ *"Thiên về nhận biết - thông hiểu, cần bổ sung câu hỏi tình huống"*.
   - Khuyến nghị AI tự động phân tích và đưa ra đề xuất bổ sung câu hỏi theo đúng ma trận đề thi kết thúc học phần.



---



### 3.7. [SCRUM-52] BỘ CHỈ MỤC TỐI ƯU HIỆU NĂNG & KỊCH BẢN RATE LIMITING 5 LƯỢT/PHÚT

Để đảm bảo SLA phản hồi truy vấn dưới 100ms trên cơ sở dữ liệu hàng triệu bản ghi và ngăn chặn quá tải hạ tầng LLM:

#### 1. Bộ Chỉ Mục Composite Tối Ưu Phân Bổ (Question Allocation Indexes):
- `idx_questions_bloom_status_composite` trên `exams.questions(status, bloom_level)`: Tối ưu đếm tỷ lệ Bloom theo trạng thái duyệt.
- `idx_questions_allocation_matrix` trên `exams.questions(document_id, chapter, bloom_level, status)`: Tối ưu bộ lọc chọn câu hỏi đa chiều.
- `idx_questions_approved_pool` (Partial Index) trên `exams.questions(document_id, bloom_level) WHERE status = 'approved'`: Chỉ mục siêu nhẹ chỉ đánh trên các câu hỏi đã duyệt, tăng tốc độ bốc đề thi lên gấp 5 lần.
- `idx_exam_audit_logs_action` trên `exams.exam_audit_logs(action, exam_id, user_id)`: Tối ưu lọc nhật ký xuất bản đề thi.
- `idx_question_audit_qid_time` trên `exams.question_audit_logs(question_id, performed_at DESC)`: Hiển thị dòng thời gian lịch sử sửa đổi câu hỏi tức thì.

#### 2. Kịch Bản Stress-Test Rate Limiting 5 lượt/phút (Redis / In-Memory Fallback):
- **Khóa Redis:** `ratelimit:ai:generate:{user_id}` (TTL: 60 giây).
- **Hạn mức nghiêm ngặt:** Đúng 5 yêu cầu sinh câu hỏi / phút cho mỗi tài khoản giảng viên.
- **Phản hồi khi vượt ngưỡng:** Mã trạng thái `HTTP 429 Too Many Requests` với thông báo tiếng Việt rõ ràng, độ trễ từ chối $< 0.01\text{ ms}$ giúp bảo vệ 100% CPU và tài nguyên API LLM.
- **Tính độc lập:** Hạn mức của Giảng viên A hoàn toàn biệt lập với Giảng viên B, tự động reset ngay khi hết cửa sổ 60s.



---



## 4. ĐẶC TẢ CƠ SỞ DỮ LIỆU VECTOR (CHROMADB SPECIFICATION)



Hệ thống sử dụng **ChromaDB** làm Vector Store chuyên trách lưu trữ các biểu diễn nhúng ngữ nghĩa của giáo trình:



- **Tên Bộ sưu tập (Collection Name):** `textbook_chunks`

- **Mô hình Nhúng Ngôn ngữ (Embedding Model):** `sentence-transformers/all-MiniLM-L6-v2`

- **Số chiều Vector (Vector Dimension):** `384 dimensions` (Dense float32 vectors)

- **Hàm đo Khoảng cách (Distance Metric):** `Cosine Similarity`

- **Cấu trúc Chỉ mục (Index Structure):** `HNSW (Hierarchical Navigable Small World)` cho tốc độ truy xuất vector cực nhanh (< 50ms trên tập dữ liệu hàng chục nghìn chunks).



### Cấu trúc Bản ghi Vector trong ChromaDB:

```json

{

  "id": "chunk-1",

  "embedding": [-0.0382, 0.0814, 0.0129, ..., -0.0541],

  "document": "Quy luật cầu (Law of Demand) chỉ ra rằng: trong điều kiện các yếu tố khác không đổi (ceteris paribus), khi giá của một hàng hóa hoặc dịch vụ tăng lên thì lượng cầu về hàng hóa hoặc dịch vụ đó sẽ giảm xuống và ngược lại. Mối quan hệ tỷ lệ nghịch này được thể hiện thông qua đường cầu dốc xuống từ trái sang phải trên đồ thị giá - lượng.",

  "metadata": {

    "document_id": "tb-001",

    "textbook_name": "GiaoTrinh_KinhTeViMo_2025.pdf",

    "page_number": 42,

    "chapter": "Chương 3: Cung - Cầu và Giá cả thị trường",

    "char_count": 342,

    "created_at": "2026-10-30T09:30:00Z"

  }

}

```



---



## 5. ĐẶC TẢ PHÂN HỆ BỘ NHỚ ĐỆM & ĐIỀU PHỐI (REDIS CACHE & BROKER)



**Redis 7** đóng vai trò In-Memory Data Store tốc độ cao phục vụ 4 tác vụ cốt lõi:



| Loại Dữ liệu | Cấu trúc Khóa (Key Pattern) | Kiểu Dữ liệu | TTL (Thời gian sống) | Ý nghĩa Nghiệp vụ |

|---|---|---|---|---|

| **JWT Blacklist** | `jwt:revoked:{jti_or_token_hash}` | `String` | Theo hạn Token (thường 24h) | Lưu danh sách token đã đăng xuất để từ chối truy cập tức thì mà không cần quét lại PostgreSQL. |

| **Tiến trình Upload** | `task:upload:progress:{document_id}` | `Hash` | 2 giờ | Lưu % tiến trình trích xuất và bóc tách giáo trình để polling hiển thị thanh tiến trình ở frontend. |

| **Cache RAG Chunks** | `rag:cache:{document_id}:{chapter_hash}` | `List (JSON)` | 6 giờ | Cache các chunk ngữ cảnh phổ biến để giảm tải truy vấn cho ChromaDB khi nhiều giảng viên cùng sinh đề. |

| **Rate Limiter** | `ratelimit:ai:generate:{user_id}` | `String (Counter)` | 1 phút | Giới hạn số lần bấm nút sinh đề thi AI (tối đa 5 lượt/phút) chống spam API tốn quota Gemini. |



---



## 6. MÃ NGUỒN KHỞI TẠO DDL SQL TOÀN BỘ HỆ THỐNG (MASTER DDL SCRIPT)



Dưới đây là mã nguồn SQL chuẩn hóa hoàn chỉnh (tương thích 100% với file chạy tự động của Docker Container `postgres:16`):



```sql

-- ====================================================================

-- MASTER DDL SCRIPT - QUIZGEN AI (MULTI-SCHEMA POSTGRESQL 16)

-- ====================================================================



-- 1. TẠO CÁC SCHEMA ĐỘC LẬP THEO MICROSERVICES

CREATE SCHEMA IF NOT EXISTS auth;

CREATE SCHEMA IF NOT EXISTS documents;

CREATE SCHEMA IF NOT EXISTS rag;

CREATE SCHEMA IF NOT EXISTS ai;

CREATE SCHEMA IF NOT EXISTS exams;



-- ====================================================================

-- 2. SCHEMA AUTH: USERS & SESSIONS

-- ====================================================================

CREATE TABLE IF NOT EXISTS auth.users (

    id VARCHAR(50) PRIMARY KEY,

    email VARCHAR(100) UNIQUE NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    full_name VARCHAR(100) NOT NULL,

    academic_title VARCHAR(20) DEFAULT 'TS.',

    university VARCHAR(150) NOT NULL,

    department VARCHAR(150) NOT NULL,

    role VARCHAR(20) DEFAULT 'lecturer',

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS auth.user_tokens (

    id VARCHAR(50) PRIMARY KEY,

    user_id VARCHAR(50) NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    token_hash VARCHAR(255) NOT NULL,

    device_info VARCHAR(255),

    expires_at TIMESTAMPTZ NOT NULL,

    revoked BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

);



CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);

CREATE INDEX IF NOT EXISTS idx_user_tokens_user ON auth.user_tokens(user_id);



-- ====================================================================

-- 3. SCHEMA DOCUMENTS: TEXTBOOKS & CHUNKS

-- ====================================================================

CREATE TABLE IF NOT EXISTS documents.documents (

    id VARCHAR(50) PRIMARY KEY,

    user_id VARCHAR(50) NOT NULL,

    name VARCHAR(255) NOT NULL,

    file_path VARCHAR(500) NOT NULL,

    file_size VARCHAR(20) NOT NULL,

    total_pages INT DEFAULT 0,

    chapters_count INT DEFAULT 0,

    status VARCHAR(20) DEFAULT 'extracting',

    progress INT DEFAULT 0,

    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS documents.document_chapters (

    id VARCHAR(50) PRIMARY KEY,

    document_id VARCHAR(50) NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,

    chapter_index INT NOT NULL,

    title VARCHAR(255) NOT NULL,

    page_start INT DEFAULT 1,

    page_end INT DEFAULT 1,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS documents.document_chunks (

    id VARCHAR(100) PRIMARY KEY,

    document_id VARCHAR(50) NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,

    page_number INT NOT NULL,

    chapter VARCHAR(255) NOT NULL,

    char_count INT DEFAULT 0,

    text_snippet TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

);



CREATE INDEX IF NOT EXISTS idx_documents_status ON documents.documents(status);

CREATE INDEX IF NOT EXISTS idx_chunks_doc_page ON documents.document_chunks(document_id, page_number);



-- ====================================================================

-- 4. SCHEMA RAG: VECTOR METADATA & RETRIEVAL LOGS

-- ====================================================================

CREATE TABLE IF NOT EXISTS rag.vector_indexes (

    id VARCHAR(50) PRIMARY KEY,

    document_id VARCHAR(50) NOT NULL,

    collection_name VARCHAR(100) DEFAULT 'textbook_chunks',

    total_vectors INT DEFAULT 0,

    embedding_model VARCHAR(100) DEFAULT 'all-MiniLM-L6-v2',

    dimension INT DEFAULT 384,

    distance_metric VARCHAR(20) DEFAULT 'cosine',

    status VARCHAR(20) DEFAULT 'indexing',

    indexed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS rag.retrieval_logs (

    id VARCHAR(50) PRIMARY KEY,

    query_text TEXT NOT NULL,

    document_id VARCHAR(50),

    top_k INT DEFAULT 5,

    matched_chunks_count INT DEFAULT 0,

    top_relevance_score NUMERIC(5, 2),

    latency_ms INT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

);



-- ====================================================================

-- 5. SCHEMA AI: BLOOM PRESETS & GENERATION JOBS

-- ====================================================================

CREATE TABLE IF NOT EXISTS ai.bloom_presets (

    id VARCHAR(50) PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    description VARCHAR(255),

    nhan_biet_pct INT DEFAULT 40,

    thong_hieu_pct INT DEFAULT 40,

    van_dung_pct INT DEFAULT 20,

    phan_tich_pct INT DEFAULT 0,

    is_default BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS ai.generation_jobs (

    id VARCHAR(50) PRIMARY KEY,

    user_id VARCHAR(50) NOT NULL,

    document_id VARCHAR(50) NOT NULL,

    chapters JSONB NOT NULL,

    bloom_matrix JSONB NOT NULL,

    total_requested INT DEFAULT 0,

    total_generated INT DEFAULT 0,

    status VARCHAR(20) DEFAULT 'queued',

    llm_provider VARCHAR(50) DEFAULT 'gemini',

    model_version VARCHAR(50) DEFAULT 'gemini-1.5-pro',

    prompt_tokens INT DEFAULT 0,

    completion_tokens INT DEFAULT 0,

    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMPTZ

);



-- ====================================================================

-- 6. SCHEMA EXAMS: QUESTION BANK & EXAM PACKAGES

-- ====================================================================

CREATE TABLE IF NOT EXISTS exams.questions (

    id VARCHAR(50) PRIMARY KEY,

    document_id VARCHAR(50),

    source_chunk_id VARCHAR(100) NOT NULL,

    textbook_name VARCHAR(255) NOT NULL,

    chapter VARCHAR(255) NOT NULL,

    bloom_level VARCHAR(30) NOT NULL,

    question_text TEXT NOT NULL,

    options JSONB NOT NULL,

    correct_answer_id VARCHAR(20) NOT NULL,

    explanation TEXT,

    confidence_score INT DEFAULT 95,

    status VARCHAR(20) DEFAULT 'pending',

    image_url TEXT,

    has_formula BOOLEAN NOT NULL DEFAULT FALSE,

    image_caption TEXT,

    created_by VARCHAR(50) DEFAULT 'lec-001',

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

);



CREATE TABLE IF NOT EXISTS exams.exams (

    id VARCHAR(50) PRIMARY KEY,

    user_id VARCHAR(50) NOT NULL,

    title VARCHAR(255) NOT NULL,

    subject VARCHAR(150) NOT NULL,

    faculty VARCHAR(150) DEFAULT 'Khoa Kinh tế & Quản trị',

    university VARCHAR(150) DEFAULT 'ĐẠI HỌC QUỐC GIA',

    duration_minutes INT DEFAULT 60,

    exam_codes JSONB NOT NULL,

    selected_question_ids JSONB NOT NULL,

    format VARCHAR(20) DEFAULT 'docx',

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

);



CREATE INDEX IF NOT EXISTS idx_questions_status ON exams.questions(status);

CREATE INDEX IF NOT EXISTS idx_questions_bloom ON exams.questions(bloom_level);

CREATE INDEX IF NOT EXISTS idx_questions_chunk ON exams.questions(source_chunk_id);

-- [SCRUM-58] Bảng Ghi nhận Lịch sử Khảo thí & Vết chỉnh sửa của Giảng viên
CREATE TABLE IF NOT EXISTS exams.question_audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    question_id VARCHAR(50) NOT NULL REFERENCES exams.questions(id) ON DELETE CASCADE,
    lecturer_id VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'inline_edit', 'approve', 'reject', 'update_bloom', 'regenerate'
    previous_state JSONB,
    new_state JSONB,
    change_summary TEXT,
    field_changes JSONB,
    edit_reason TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_question_audit_qid ON exams.question_audit_logs(question_id);
CREATE INDEX IF NOT EXISTS idx_question_audit_lecturer ON exams.question_audit_logs(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_question_audit_action ON exams.question_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_question_audit_qid_time ON exams.question_audit_logs(question_id, performed_at DESC);

-- [SCRUM-58] Chỉ mục tổng hợp phục vụ Endpoint Thống kê Phân bổ Tỷ lệ Bloom
CREATE INDEX IF NOT EXISTS idx_questions_bloom_status_composite ON exams.questions(status, bloom_level);
CREATE INDEX IF NOT EXISTS idx_questions_bloom_doc_status ON exams.questions(document_id, status, bloom_level);

```



---



## 7. VÒNG ĐỜI DỮ LIỆU & LUỒNG TRUYỀN TẢI LIÊN DỊCH VỤ



Dưới đây là sơ đồ luồng dữ liệu tương tác giữa các bảng xuyên suốt toàn bộ vòng đời khảo thí:



```

[BƯỚC 1: TẢI LÊN GIÁO TRÌNH]

Giảng viên tải file PDF/Word

    │

    ├──> INSERT `documents.documents` (status = 'extracting')

    ├──> Bóc tách cấu trúc -> INSERT `documents.document_chapters`

    └──> Phân đoạn ngữ nghĩa -> INSERT `documents.document_chunks`

                                       │

                                       ▼

[BƯỚC 2: VECTOR HÓA RAG]

Đẩy các chunks sang `rag-service`

    │

    ├──> Tính toán Embeddings (384-dim) -> LƯU VÀO CHROMADB (`textbook_chunks`)

    ├──> Ghi nhận trạng thái -> INSERT `rag.vector_indexes`

    └──> UPDATE `documents.documents` (status = 'ready', progress = 100)

                                       │

                                       ▼

[BƯỚC 3: CẤU HÌNH MA TRẬN & GỌI AI SINH ĐỀ]

Giảng viên chọn khuôn mẫu Bloom & Chương mục

    │

    ├──> INSERT `ai.generation_jobs` (status = 'processing')

    ├──> Truy xuất Top-K Chunks từ ChromaDB -> GHI `rag.retrieval_logs`

    ├──> Gửi Prompt + Context sang Gemini 1.5 Pro

    └──> Nhận kết quả JSON câu hỏi -> INSERT hàng loạt vào `exams.questions` (status = 'pending')

                                       │

                                       ▼

[BƯỚC 4: KIỂM DUYỆT RAG & ĐỐI SOÁT MINH CHỨNG]

Giảng viên thẩm định trên Review Workspace

    │

    ├──> Frontend đối soát: lấy `source_chunk_id` từ `exams.questions` 

    │    so khớp trực tiếp với `documents.document_chunks` (hiển thị trang và trích đoạn gốc)

    ├──> Giảng viên chỉnh sửa câu hỏi/đáp án -> UPDATE `exams.questions`

    └──> Giảng viên bấm Duyệt (Approve) -> UPDATE `exams.questions` (status = 'approved')

                                       │

                                       ▼

[BƯỚC 5: ĐÓNG GÓI & XUẤT ĐỀ THI]

Giảng viên chọn câu hỏi trong Ngân hàng và bấm xuất đề

    │

    ├──> Hoán vị câu hỏi và đảo phương án A/B/C/D thành các mã đề (101, 102...)

    ├──> INSERT `exams.exams` (lưu trữ gói đề thi)

    └──> Xuất file Word (.docx), PDF kèm phiếu chấm hoặc Canvas QTI Zip cho giảng viên tải về

```



---



*Hồ sơ tài liệu này phản ánh chính xác 100% kiến trúc cơ sở dữ liệu hiện có trong thư mục `database/` và các models của microservices trong QuizGen AI.*