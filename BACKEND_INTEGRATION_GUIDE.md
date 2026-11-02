# 📘 HƯỚNG DẪN KỸ THUẬT & QUY TẮC TÍCH HỢP BACKEND / DATABASE
**Dự án:** Nền tảng Khảo thí & Tạo Đề thi Tự động bằng AI (**QuizGen AI**)  
**Dành cho:** Kỹ sư Backend & Database  
**Phiên bản:** 1.0 (Khớp 100% với Frontend React + TypeScript)

---

## 🎯 1. TỔNG QUAN HỆ THỐNG & NHIỆM VỤ BACKEND

**QuizGen AI** là nền tảng SaaS phục vụ Giảng viên Đại học. Quy trình vận hành cốt lõi gồm 4 bước:
1. **Nạp giáo trình (PDF/DOCX):** Bóc tách văn bản, đánh chỉ mục số trang, lưu vector vào Vector DB (**RAG Engine**).
2. **Sinh câu hỏi AI:** Giảng viên chọn giáo trình + chương + tỷ lệ **Thang đo nhận thức Bloom** (Nhận biết, Thông hiểu, Vận dụng, Phân tích) $\rightarrow$ Backend gọi LLM sinh câu hỏi có trích dẫn minh chứng.
3. **Kiểm duyệt (Review Workspace):** Cột trái hiển thị đoạn văn bản sách gốc (RAG), cột phải cho giảng viên inline edit, đổi đáp án đúng, duyệt (`approved`) hoặc loại (`rejected`).
4. **Đóng gói đề thi:** Giảng viên chọn câu hỏi trong ngân hàng $\rightarrow$ Backend xáo trộn tạo 4 mã đề (101, 102, 103, 104) và xuất file Word `.docx`, PDF và gói Canvas/Moodle QTI.

---

## 📐 2. BỘ QUY TẮC PHÁT TRIỂN BẮT BUỘC (DEVELOPMENT RULES)

### Quy tắc 1: Quy chuẩn RESTful & Định dạng Dữ liệu (Format Standard)
* Mọi dữ liệu trao đổi qua HTTP body phải là **JSON UTF-8** (ngoại trừ upload file là `multipart/form-data` và export đề thi là `blob/binary`).
* Key của JSON phải tuân thủ chuẩn **`camelCase`** để khớp trực tiếp với giao diện TypeScript của Frontend mà không cần mapper (Ví dụ: `correctAnswerId`, `bloomLevel`, `confidenceScore`, `pageNumber`).
* URL tuân thủ chuẩn danh từ số nhiều và số ít:
  * Lấy danh sách: `GET /api/v1/questions`
  * Chi tiết 1 item: `GET /api/v1/questions/{id}`
  * Cập nhật trạng thái: `PATCH /api/v1/questions/{id}/status`

### Quy tắc 2: Cấu hình CORS & Headers
Backend bắt buộc phải mở CORS cho các origin phát triển Frontend:
```python
# Cho phép Frontend gọi API
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000"
]
```

### Quy tắc 3: Chuẩn hóa Xử lý Lỗi (Error Handling)
Khi gặp lỗi, Backend **bắt buộc** trả về JSON cấu trúc đồng nhất sau kèm mã HTTP status tương ứng:
```json
{
  "error": true,
  "statusCode": 400,
  "message": "Thông điệp lỗi chi tiết bằng tiếng Việt để Frontend hiển thị Toast thông báo cho giảng viên",
  "details": null
}
```

### Quy tắc 4: Cơ chế Bất đồng bộ (Async Background Processing)
* Quá trình bóc tách OCR từ sách dày và tính toán Embeddings RAG mất từ 30s - 2 phút $\rightarrow$ **Không được block request HTTP của Frontend**.
* Sau khi nhận file upload, Backend lưu database với trạng thái `status: "extracting"`, trả về ngay mã `202 Accepted` hoặc `201 Created`, sau đó đẩy task vào Celery / BackgroundTasks / Redis để xử lý ngầm.

---

## 🗄️ 3. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

Backend sử dụng cơ sở dữ liệu quan hệ (**PostgreSQL**) kết hợp cơ sở dữ liệu vector (**ChromaDB** hoặc **Qdrant**).

### A. Bảng Cơ sở Dữ liệu Quan hệ (PostgreSQL DDL)

```sql
-- 1. Bảng Giảng viên (Users)
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    academic_title VARCHAR(20) DEFAULT 'TS.', -- TS., ThS., PGS.TS.
    university VARCHAR(150) NOT NULL,
    department VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Tài liệu Giáo trình (Documents)
CREATE TABLE documents (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size VARCHAR(20) NOT NULL, -- e.g. "14.2 MB"
    total_pages INT NOT NULL DEFAULT 0,
    chapters_count INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'extracting', -- 'extracting', 'embedding', 'ready', 'error'
    progress INT NOT NULL DEFAULT 0, -- 0 đến 100%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Ngân hàng Câu hỏi (Questions)
CREATE TABLE questions (
    id VARCHAR(50) PRIMARY KEY,
    document_id VARCHAR(50) REFERENCES documents(id) ON DELETE SET NULL,
    source_chunk_id VARCHAR(100) NOT NULL, -- Khóa ngoại trỏ sang ID vector trong ChromaDB
    textbook_name VARCHAR(255) NOT NULL,
    chapter VARCHAR(255) NOT NULL,
    bloom_level VARCHAR(30) NOT NULL, -- 'Nhận biết', 'Thông hiểu', 'Vận dụng', 'Phân tích'
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, 
    -- Định dạng JSONB: 
    -- [
    --   {"id": "opt-a", "label": "A", "text": "Nội dung đáp án A"},
    --   {"id": "opt-b", "label": "B", "text": "Nội dung đáp án B"},
    --   {"id": "opt-c", "label": "C", "text": "Nội dung đáp án C"},
    --   {"id": "opt-d", "label": "D", "text": "Nội dung đáp án D"}
    -- ]
    correct_answer_id VARCHAR(20) NOT NULL, -- "opt-a"
    explanation TEXT,
    confidence_score INT DEFAULT 95,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Đề thi đã xuất bản (Exams)
CREATE TABLE exams (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    exam_codes JSONB NOT NULL, -- Danh sách mã đề đảo: ["101", "102", "103", "104"]
    selected_question_ids JSONB NOT NULL, -- Mảng ID câu hỏi được đóng gói
    duration_minutes INT DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### B. Cấu trúc Lưu trữ Vector DB (ChromaDB Collection)
* **Collection Name:** `textbook_chunks`
* **Metadata Schema cho từng vector:**
  ```json
  {
    "document_id": "tb-001",
    "page_number": 42,
    "chapter": "Chương 3: Cung - Cầu và Giá cả thị trường"
  }
  ```
* **Document Text:** Nội dung đoạn văn bản từ 500 - 1000 ký tự.

---

## 📡 4. DANH MỤC API CONTRACTS THEO 5 MÀN HÌNH FRONTEND

Dưới đây là chi tiết toàn bộ các Endpoint mà Frontend đang gọi:

### 🖥️ MÀN HÌNH 1: BẢNG ĐIỀU KHIỂN (DASHBOARD)

#### `GET /api/v1/analytics/dashboard`
Lấy số liệu KPI tổng quan và phân bổ Bloom:
* **Headers:** `Authorization: Bearer <token>`
* **Response `200 OK`:**
```json
{
  "totalTextbooks": 12,
  "totalApprovedQuestions": 351,
  "totalExamsPackaged": 28,
  "pendingReviewCount": 2,
  "bloomDistribution": {
    "nhanBiet": { "count": 142, "percentage": 40 },
    "thongHieu": { "count": 120, "percentage": 34 },
    "vanDung": { "count": 65, "percentage": 18 },
    "phanTich": { "count": 24, "percentage": 8 }
  },
  "ragQuota": {
    "usedTokens": 420000,
    "maxTokens": 1000000,
    "totalChunks": 12450
  },
  "recentActivities": [
    {
      "id": "act-1",
      "action": "Xuất đề thi ra Word",
      "detail": "Kinh tế vĩ mô - Giữa kỳ (40 câu - 4 mã đề) ra file Word",
      "time": "15 phút trước"
    }
  ]
}
```

---

### 🖥️ MÀN HÌNH 2: QUẢN LÝ & TẢI LÊN GIÁO TRÌNH (TEXTBOOK MANAGEMENT)

#### 1. `POST /api/v1/documents/upload`
Upload tài liệu giáo trình (PDF / DOCX):
* **Content-Type:** `multipart/form-data`
* **Form Field:** `file: Binary`
* **Response `201 Created`:**
```json
{
  "id": "tb-001",
  "name": "GiaoTrinh_KinhTeViMo_2025.pdf",
  "size": "14.2 MB",
  "totalPages": 320,
  "chaptersCount": 12,
  "status": "extracting",
  "progress": 20,
  "uploadedAt": "Vừa xong"
}
```

#### 2. `GET /api/v1/documents`
Lấy danh sách toàn bộ giáo trình đã nạp:
* **Response `200 OK`:**
```json
[
  {
    "id": "tb-001",
    "name": "GiaoTrinh_KinhTeViMo_2025.pdf",
    "size": "14.2 MB",
    "totalPages": 320,
    "chaptersCount": 12,
    "status": "ready",
    "progress": 100,
    "uploadedAt": "28/10/2026"
  }
]
```

#### 3. `GET /api/v1/documents/{document_id}/chunks`
Khám phá các đoạn Chunks RAG (phục vụ Modal xem trước văn bản):
* **Response `200 OK`:**
```json
{
  "documentId": "tb-001",
  "chunks": [
    {
      "chunkId": "chunk-1",
      "pageNumber": 42,
      "chapter": "Chương 3: Cung - Cầu",
      "textSnippet": "Quy luật cầu (Law of Demand) chỉ ra rằng: khi giá tăng..."
    }
  ]
}
```

#### 4. `DELETE /api/v1/documents/{document_id}`
Xóa tài liệu và xóa toàn bộ vector tương ứng trong ChromaDB.

---

### 🖥️ MÀN HÌNH 3: CẤU HÌNH SINH CÂU HỎI BẰNG AI (AI GENERATION)

#### 1. `GET /api/v1/documents/{document_id}/chapters`
Lấy danh sách các chương mục đã bóc tách của giáo trình:
* **Response `200 OK`:**
```json
[
  "Chương 1: Khái quát về kinh tế học vi mô",
  "Chương 2: Lý thuyết hành vi người tiêu dùng",
  "Chương 3: Cung - Cầu và Giá cả thị trường"
]
```

#### 2. `POST /api/v1/ai/generate`
Kích hoạt LLM sinh câu hỏi dựa trên ngữ cảnh RAG:
* **Request Body:**
```json
{
  "documentId": "tb-001",
  "chapters": [
    "Chương 3: Cung - Cầu và Giá cả thị trường"
  ],
  "bloomMatrix": {
    "nhanBiet": 8,
    "thongHieu": 8,
    "vanDung": 4,
    "phanTich": 0
  }
}
```
* **Response `200 OK`:** Trả về danh sách câu hỏi mới sinh (trạng thái `pending`):
```json
{
  "success": true,
  "totalGenerated": 20,
  "questions": [
    {
      "id": "q-101",
      "sourceChunkId": "chunk-1",
      "textbookName": "GiaoTrinh_KinhTeViMo_2025.pdf",
      "chapter": "Chương 3: Cung - Cầu và Giá cả thị trường",
      "bloomLevel": "Nhận biết",
      "question": "Theo quy luật cầu, trong điều kiện các yếu tố khác không đổi, phát biểu nào sau đây là chính xác?",
      "options": [
        { "id": "opt-a", "label": "A", "text": "Khi giá hàng hóa tăng thì lượng cầu giảm xuống" },
        { "id": "opt-b", "label": "B", "text": "Khi giá hàng hóa tăng thì lượng cầu tăng lên" },
        { "id": "opt-c", "label": "C", "text": "Giá cả và lượng cầu luôn biến thiên cùng chiều" },
        { "id": "opt-d", "label": "D", "text": "Lượng cầu không phụ thuộc vào mức giá" }
      ],
      "correctAnswerId": "opt-a",
      "explanation": "Quy luật cầu phản ánh mối quan hệ nghịch biến giữa giá cả và lượng cầu.",
      "confidenceScore": 99,
      "status": "pending",
      "createdAt": "Hôm nay"
    }
  ]
}
```

---

### 🖥️ MÀN HÌNH 4: KHÔNG GIAN KIỂM DUYỆT RAG (REVIEW & EDIT WORKSPACE)

#### 1. `GET /api/v1/rag/chunks/{chunk_id}`
Lấy văn bản gốc làm minh chứng đối chiếu cho cột bên trái:
* **Response `200 OK`:**
```json
{
  "id": "chunk-1",
  "pageNumber": 42,
  "chapter": "Chương 3: Cung - Cầu và Giá cả thị trường",
  "textSnippet": "Quy luật cầu (Law of Demand) chỉ ra rằng: trong điều kiện các yếu tố khác không đổi (ceteris paribus), khi giá của một hàng hóa tăng lên...",
  "relevanceScore": 98
}
```

#### 2. `PUT /api/v1/questions/{id}`
Cập nhật nội dung câu hỏi (khi giảng viên bấm "Lưu thay đổi"):
* **Request Body:**
```json
{
  "question": "Nội dung câu hỏi đã sửa",
  "options": [
    { "id": "opt-a", "label": "A", "text": "Phương án A đã sửa" },
    { "id": "opt-b", "label": "B", "text": "Phương án B" },
    { "id": "opt-c", "label": "C", "text": "Phương án C" },
    { "id": "opt-d", "label": "D", "text": "Phương án D" }
  ],
  "correctAnswerId": "opt-a",
  "explanation": "Giải thích chi tiết đã cập nhật"
}
```

#### 3. `PATCH /api/v1/questions/{id}/status`
Duyệt hoặc loại bỏ câu hỏi:
* **Request Body:**
```json
{
  "status": "approved" // hoặc "rejected"
}
```

#### 4. `POST /api/v1/questions/batch-approve`
Duyệt nhanh tất cả câu hỏi đang chờ:
* **Request Body:**
```json
{
  "questionIds": ["q-1", "q-2", "q-3"]
}
```

#### 5. `POST /api/v1/ai/regenerate-question/{id}`
Yêu cầu AI sinh lại duy nhất câu hỏi này (nếu giảng viên chưa ưng ý phương án nhiễu).

---

### 🖥️ MÀN HÌNH 5: NGÂN HÀNG CÂU HỎI & XUẤT ĐỀ THI (QUESTION BANK & EXPORT)

#### 1. `GET /api/v1/questions/bank`
Lấy danh sách các câu hỏi đã duyệt với bộ lọc:
* **Query Params:**
  * `search`: Từ khóa tìm kiếm
  * `bloomLevel`: 'all' | 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Phân tích'
  * `documentId`: ID giáo trình nguồn (optional)
* **Response `200 OK`:** Trả về danh sách mảng `Question[]`.

#### 2. `POST /api/v1/exams/export`
Đóng gói đề thi ra file nhị phân:
* **Request Body:**
```json
{
  "selectedQuestionIds": ["q-1", "q-2", "q-3"],
  "universityName": "ĐẠI HỌC QUỐC GIA",
  "facultyName": "Khoa Kinh tế & Quản trị",
  "examTitle": "ĐỀ THI KẾT THÚC HỌC PHẦN - HỌC KỲ II",
  "subjectName": "Kinh tế vi mô",
  "examCodeCount": 4,
  "shuffleQuestions": true,
  "shuffleOptions": true,
  "includeAnswerKey": true,
  "includeExplanation": false,
  "format": "docx" // 'docx' | 'pdf' | 'qti'
}
```
* **Response:** Trả về trực tiếp File Binary kèm Header:
  * Nếu là Word: `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  * Nếu là PDF: `Content-Type: application/pdf`
  * Nếu là QTI LMS: `Content-Type: application/xml` hoặc `application/zip`

---

## 🤖 5. SYSTEM PROMPT CHUẨN ĐỂ BACKEND GỌI LLM (GEMINI / OPENAI)

Backend cần sử dụng cấu trúc Prompt chuẩn sau đây để đảm bảo LLM trả về đúng 100% định dạng JSON mà không kèm text giải thích thừa:

```
Bạn là một Chuyên gia Khảo thí Đại học và Kỹ sư Thiết kế Đề thi chuyên nghiệp.
Nhiệm vụ của bạn là đọc các đoạn văn bản trích xuất từ giáo trình (RAG context) và sinh câu hỏi trắc nghiệm 4 lựa chọn (A, B, C, D) theo Thang đo nhận thức Bloom:
- Nhận biết (Remember): Tái hiện định nghĩa, thuật ngữ, công thức nguyên bản.
- Thông hiểu (Understand): Diễn giải bản chất quy luật, so sánh, phân biệt khái niệm.
- Vận dụng (Apply): Đặt công thức/lý thuyết vào tình huống giải quyết vấn đề thực tế cụ thể.
- Phân tích (Analyze): Phân tích quan hệ nhân quả, tương tác giữa nhiều biến số kinh tế/kỹ thuật.

YÊU CẦU NGHIÊM NGẶT:
1. KHÔNG ẢO GIÁC (Zero Hallucination): Mọi thông tin và đáp án đúng bắt buộc phải có căn cứ từ đoạn văn bản được cung cấp.
2. Phương án nhiễu (Distractors) phải hợp lý về mặt học thuật, không ra đề mẹo vô lý, không dùng "Cả 3 đáp án trên đều đúng".
3. Chỉ trả về DUY NHẤT chuỗi JSON hợp lệ theo schema sau (không thêm ```json hay markdown):

{
  "questions": [
    {
      "source_chunk_id": "ID của chunk văn bản minh chứng",
      "bloom_level": "Nhận biết",
      "question": "Câu hỏi trắc nghiệm?",
      "options": [
        {"id": "opt-a", "label": "A", "text": "Phương án A"},
        {"id": "opt-b", "label": "B", "text": "Phương án B"},
        {"id": "opt-c", "label": "C", "text": "Phương án C"},
        {"id": "opt-d", "label": "D", "text": "Phương án D"}
      ],
      "correct_answer_id": "opt-a",
      "explanation": "Căn cứ trang sách và lý do chọn đáp án này...",
      "confidence_score": 96
    }
  ]
}
```

---

## ✅ 6. CHECKLIST TRIỂN KHAI CHO KỸ SƯ BACKEND (ROADMAP)

* [ ] **Giai đoạn 1:** Khởi tạo PostgreSQL Database theo DDL ở Mục 3A.
* [ ] **Giai đoạn 2:** Dựng `POST /api/v1/documents/upload` bóc tách text bằng thư viện `pypdf` / `python-docx` và lưu vector vào `ChromaDB`.
* [ ] **Giai đoạn 3:** Viết hàm gọi API Gemini 1.5 Pro / GPT-4o với System Prompt ở Mục 5 để hoàn thiện `POST /api/v1/ai/generate`.
* [ ] **Giai đoạn 4:** Hoàn thiện các API CRUD câu hỏi ở Màn hình 4 (`/api/v1/questions/{id}`).
* [ ] **Giai đoạn 5:** Dùng thư viện `python-docx` viết hàm xáo trộn đề và xuất file `.docx` có bảng đáp án ở trang cuối.

---
*Tài liệu này được biên soạn bởi Kỹ sư Frontend Lead QuizGen AI nhằm đảm bảo hệ thống vận hành liền mạch và đồng bộ tuyệt đối giữa Client và Server.*
