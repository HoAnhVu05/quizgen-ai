# ĐẶC TẢ HOÀN THIỆN DOCUMENT SERVICE
**Dịch vụ:** `document-service` (Cổng 8002 / Microservice Xử lý Văn bản & Bóc tách Giáo trình)  
**Hệ thống:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Học thuật  
**Phiên bản:** v1.0.0 Production Specification  
**Ngày hoàn thiện:** 02/11/2026  

---

## MỤC LỤC TỔNG QUAN

1. [Mục tiêu & Phạm vi Dịch vụ](#1-mục-tiêu--phạm-vi-dịch-vụ)
2. [Kiến trúc Mã nguồn & Cấu trúc Thư mục](#2-kiến-trúc-mã-nguồn--cấu-trúc-thư-mục)
3. [Quy trình Xử lý Pipeline (Document Processing Pipeline)](#3-quy-trình-xử-lý-pipeline-document-processing-pipeline)
   - 3.1. Tiếp nhận & Xác thực Tệp (File Validation)
   - 3.2. Thuật toán Trích xuất Văn bản PDF & DOCX (`parser.py`)
   - 3.3. Thuật toán Phân đoạn Ngữ nghĩa Semantic Chunking (`chunker.py`)
   - 3.4. Lưu trữ Cơ sở Dữ liệu & Đẩy ngầm sang RAG Service (`BackgroundTasks`)
4. [Đặc tả Chi tiết Toàn bộ API Endpoints](#4-đặc-tả-chi-tiết-toàn-bộ-api-endpoints)
   - 4.1. `GET /health` (Kiểm tra sức khỏe dịch vụ)
   - 4.2. `POST /upload` (Tải lên giáo trình & bóc tách)
   - 4.3. `GET /documents` (Danh sách giáo trình đã nạp)
   - 4.4. `GET /documents/{document_id}` (Chi tiết giáo trình & danh mục chương)
   - 4.5. `DELETE /documents/{document_id}` (Xóa giáo trình & dọn dẹp)
5. [Mô hình Dữ liệu ORM & Cấu trúc Bảng PostgreSQL](#5-mô-hình-dữ-liệu-orm--cấu-trúc-bảng-postgresql)
6. [Cấu hình Môi trường, Dockerfile & Vận hành](#6-cấu-hình-môi-trường-dockerfile--vận-hành)
7. [Ma trận Kiểm thử & Kịch bản Test mẫu (cURL Examples)](#7-ma-trận-kiểm-thử--kịch-bản-test-mẫu-curl-examples)

---

## 1. MỤC TIÊU & PHẠM VI DỊCH VỤ

`document-service` là phân hệ cửa ngõ tiếp nhận tri thức học thuật thô của QuizGen AI, chịu trách nhiệm:
- Tiếp nhận các file giáo trình định dạng `.pdf` và `.docx` từ giảng viên thông qua giao thức HTTP `multipart/form-data`.
- Xác thực định dạng, kiểm tra dung lượng (tối đa 25MB) và phòng chống tải lên file rỗng không có text.
- Bóc tách văn bản trang vật lý (PDF) và phân khối đoạn văn bản ngữ cảnh (DOCX).
- Tự động nhận diện cấu trúc phân cấp giáo trình (Chương mục).
- Phân đoạn văn bản thành các đoạn trích ngữ nghĩa (Semantic Chunks) đạt chuẩn độ dài tối ưu cho RAG (400 - 1000 ký tự).
- Lưu trữ siêu dữ liệu vào schema `documents` trong PostgreSQL 16 và kích hoạt tác vụ nền tự động đẩy dữ liệu sang `rag-service` để tính toán Vector Embeddings.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DOCUMENT SERVICE PIPELINE ARCHITECTURE               │
└────────────────────────────────────────────────────────────────────────┘
  [File Upload: .pdf/.docx]
             │
             ▼
  ┌───────────────────────┐
  │ 1. Validate & Store   │ ──> [Lưu disk: ./data/uploads/{id}_{name}]
  │    (Size, Ext, Empty) │
  └───────────────────────┘
             │
             ▼
  ┌───────────────────────┐
  │ 2. Text Parser        │ ──> PDF: pypdf (Reader duyệt từng trang vật lý)
  │    (parser.py)        │ ──> DOCX: python-docx (Gom cụm 400 từ / pseudo-page)
  └───────────────────────┘
             │
             ▼
  ┌───────────────────────┐
  │ 3. Semantic Chunker   │ ──> Regex quét: "Chương X: ..." / "Bài Y: ..."
  │    (chunker.py)       │ ──> Cắt khối 400-1000 ký tự (Gắn số trang + chương)
  └───────────────────────┘
             │
             ├────────────────────────────────────────────────┐
             ▼                                                ▼
  ┌───────────────────────┐                        ┌──────────────────────┐
  │ 4. PostgreSQL Storage │                        │ 5. Background Task   │
  │    (documents schema) │                        │    (Push sang RAG)   │
  │ • documents           │                        │ POST /index-chunks   │
  │ • document_chapters   │                        │ -> rag-service:8003  │
  │ • document_chunks     │                        └──────────────────────┘
  └───────────────────────┘
```

---

## 2. KIẾN TRÚC MÃ NGUỒN & CẤU TRÚC THƯ MỤC

Toàn bộ mã nguồn của service được tổ chức tại `services/document-service/`:

```
services/document-service/
├── Dockerfile                   # Cấu hình container Python 3.11-slim
├── requirements.txt             # Khai báo dependencies (FastAPI, pypdf, python-docx, SQLAlchemy)
└── src/
    ├── __init__.py
    ├── main.py                  # Khởi tạo FastAPI App, API routing, Background Tasks
    ├── parser.py                # Lớp DocumentParser chuyên trách bóc tách PDF/Word
    ├── chunker.py               # Lớp TextChunker chia đoạn ngữ nghĩa theo chương
    ├── models.py                # Định nghĩa SQLAlchemy ORM Models & Pydantic Schemas
    └── database.py              # Cấu hình SessionLocal, Engine kết nối PostgreSQL
```

### Danh mục Dependencies chính (`requirements.txt`):
- `fastapi==0.115.0` & `uvicorn[standard]==0.32.0`: Web framework hiệu năng cao.
- `pypdf==5.1.0`: Bóc tách văn bản và số trang từ PDF tốc độ cao, không cần phụ thuộc C++ binaries cồng kềnh.
- `python-docx==1.1.2`: Đọc hiểu cấu trúc XML và đoạn văn bản tệp Word `.docx`.
- `sqlalchemy==2.0.36` & `psycopg2-binary==2.9.10`: ORM và driver kết nối PostgreSQL 16.
- `httpx==0.28.1`: HTTP client bất đồng bộ gọi liên dịch vụ sang `rag-service`.
- `pydantic==2.9.2`: Kiểm soát và xác thực kiểu dữ liệu JSON đầu vào/đầu ra.

---

## 3. QUY TRÌNH XỬ LÝ PIPELINE (PROCESSING PIPELINE)

### 3.1. Tiếp nhận & Xác thực Tệp (File Validation)
- Kiểm tra tính hợp lệ của tham số: `file: UploadFile = File(...)`.
- **Định dạng cho phép:** Chỉ chấp nhận đuôi `.pdf` hoặc `.docx` (kiểm tra không phân biệt chữ hoa/thường). Các đuôi khác sẽ bị từ chối với mã lỗi `400 Bad Request`.
- **Kiểm soát dung lượng:** Đọc nhị phân `content = await file.read()`. So sánh với `MAX_UPLOAD_SIZE_MB` (mặc định 25MB). Nếu vượt quá trả về mã lỗi `413 Payload Too Large`.
- **Lưu trữ vật lý:** Ghi file vào thư mục `DOCUMENT_STORAGE_DIR` (mặc định `./data/uploads/`) với tiền tố mã ID để tránh trùng lặp: `{doc_id}_{filename}`.

### 3.2. Thuật toán Trích xuất Văn bản (`src/parser.py`)
- **Đối với PDF (`parse_pdf`):**
  - Khởi tạo `PdfReader(io.BytesIO(file_bytes))`.
  - Duyệt qua từng `page` trong `reader.pages`.
  - Gọi `page.extract_text()`, làm sạch khoảng trắng dư thừa (`strip()`).
  - Trả về danh sách: `[{"page_number": idx + 1, "text": text}, ...]`.
- **Đối với DOCX (`parse_docx`):**
  - Vì file Word không có khái niệm "trang in" vật lý cố định, thuật toán duyệt qua toàn bộ paragraphs của tài liệu (`doc.paragraphs`).
  - Gom các đoạn văn bản thành một chuỗi duy nhất, sau đó tách từ theo khoảng trắng (`words = combined.split()`).
  - Chia khối theo kích thước chuẩn **400 từ/khối (pseudo-page)**, gán số trang giả lập `(i // chunk_size) + 1`. Điều này đảm bảo tính tương thích đồng bộ với PDF khi đối soát trích dẫn ở màn hình Review Workspace.

### 3.3. Thuật toán Phân đoạn Ngữ nghĩa (`src/chunker.py`)
- Quét biểu thức chính quy (Regex) để nhận diện tiêu đề chương:
  ```python
  CHAPTER_PATTERN = re.compile(
      r"(Chương\s+[0-9IVXLCDM]+[:\.\-\s]+[^\n\r]+|Bài\s+[0-9]+[:\.\-\s]+[^\n\r]+)",
      re.IGNORECASE
  )
  ```
- Nếu một trang chứa tiêu đề chương, trạng thái chương hiện tại sẽ được cập nhật.
- Chia nhỏ văn bản của trang thành các khối từ 400 đến 1000 ký tự (đảm bảo câu không bị cắt ngang giữa chừng).
- Mỗi chunk được sinh một mã duy nhất: `chunk_id = f"{doc_id}_c{chunk_index:04d}"`.
- Thu thập danh sách `unique_chapters` để nạp vào bảng chương mục.

### 3.4. Lưu trữ Cơ sở Dữ liệu & Đẩy ngầm sang RAG Service
1. Tạo bản ghi tài liệu trong bảng `documents.documents` với trạng thái ban đầu `status = 'embedding'`, `progress = 50`.
2. Tạo các bản ghi danh mục chương trong `documents.document_chapters`.
3. Tạo toàn bộ các đoạn trích trong `documents.document_chunks`.
4. Commit giao dịch cơ sở dữ liệu PostgreSQL.
5. Thêm tác vụ nền `background_tasks.add_task(forward_chunks_to_rag, doc_id, chunks)`:
   - Gọi HTTP `POST http://rag-service:8003/index-chunks` mang theo mảng chunks.
   - Nhận phản hồi thành công $\rightarrow$ Cập nhật `documents.documents` thành `status = 'ready'`, `progress = 100`.

---

## 4. ĐẶC TẢ CHI TIẾT TOÀN BỘ API ENDPOINTS

Tất cả các API được bảo vệ và định tuyến qua API Gateway tại tiền tố: `/api/v1/documents/*`.

### 4.1. `GET /health`
- **Mục đích:** Kiểm tra trạng thái hoạt động của Document Service.
- **Quyền hạn:** Công khai (Public).
- **Response `200 OK`:**
```json
{
  "status": "healthy",
  "service": "document-service",
  "maxUploadSizeMb": 25,
  "ragServiceUrl": "http://rag-service:8003"
}
```

---

### 4.2. `POST /upload`
- **Mục đích:** Tải lên giáo trình mới, trích xuất text, chia chunks và đẩy sang RAG.
- **Content-Type:** `multipart/form-data`
- **Tham số Form:**
  - `file`: File nhị phân (`.pdf` hoặc `.docx`).
- **Response `202 Accepted` / `201 Created`:**
```json
{
  "message": "Đã tải lên và bóc tách thành công. Đang tiến hành tạo Vector Embedding trong nền.",
  "document": {
    "id": "tb-002",
    "name": "GiaoTrinh_TriTueNhanTao_2026.pdf",
    "size": "22.8 MB",
    "totalPages": 240,
    "chaptersCount": 4,
    "status": "embedding",
    "progress": 50,
    "uploadedAt": "Vừa xong"
  }
}
```
- **Mã lỗi phát sinh:**
  - `400 Bad Request`: `{"detail": "Chỉ hỗ trợ tệp định dạng .pdf hoặc .docx"}`
  - `400 Bad Request`: `{"detail": "Tài liệu không có nội dung văn bản để bóc tách."}`
  - `413 Payload Too Large`: `{"detail": "Kích thước tệp vượt quá giới hạn 25 MB."}`

---

### 4.3. `GET /documents`
- **Mục đích:** Lấy danh sách toàn bộ giáo trình đã nạp trong hệ thống, sắp xếp theo thời gian mới nhất.
- **Query Parameters:** Không.
- **Response `200 OK` (Mảng đối tượng JSON chuẩn camelCase):**
```json
[
  {
    "id": "tb-001",
    "name": "GiaoTrinh_KinhTeViMo_2025.pdf",
    "size": "14.2 MB",
    "totalPages": 184,
    "chaptersCount": 5,
    "status": "ready",
    "progress": 100,
    "uploadedAt": "28/10/2026, 09:30"
  },
  {
    "id": "tb-002",
    "name": "GiaoTrinh_TriTueNhanTao_2026.pdf",
    "size": "22.8 MB",
    "totalPages": 240,
    "chaptersCount": 4,
    "status": "ready",
    "progress": 100,
    "uploadedAt": "29/10/2026, 14:15"
  }
]
```

---

### 4.4. `GET /documents/{document_id}`
- **Mục đích:** Lấy thông tin chi tiết một giáo trình kèm danh sách các chương mục đã nhận diện (dùng để render dropdown và checkboxes chọn chương ở màn hình Khởi tạo Đề thi AI).
- **Path Parameters:**
  - `document_id`: Mã tài liệu (VD: `tb-001`).
- **Response `200 OK`:**
```json
{
  "id": "tb-001",
  "name": "GiaoTrinh_KinhTeViMo_2025.pdf",
  "size": "14.2 MB",
  "totalPages": 184,
  "chaptersCount": 5,
  "status": "ready",
  "progress": 100,
  "chapters": [
    "Chương 1: Khái quát về Kinh tế học vi mô và Các nguyên lý nền tảng",
    "Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường",
    "Chương 3: Lý thuyết hành vi người tiêu dùng và Lợi ích biên",
    "Chương 4: Lý thuyết sản xuất, Chi phí và Tối đa hóa lợi nhuận",
    "Chương 5: Cấu trúc thị trường: Cạnh tranh hoàn hảo và Độc quyền"
  ]
}
```
- **Mã lỗi phát sinh:**
  - `404 Not Found`: `{"detail": "Không tìm thấy tài liệu có mã tb-999"}`

---

### 4.5. `DELETE /documents/{document_id}`
- **Mục đích:** Xóa hoàn toàn một giáo trình khỏi hệ thống (bao gồm tệp vật lý, bản ghi chapters, bản ghi chunks trong PostgreSQL, và đồng thời gọi sang RAG service để xóa các vector embeddings trong ChromaDB).
- **Path Parameters:**
  - `document_id`: Mã tài liệu cần xóa.
- **Response `200 OK`:**
```json
{
  "message": "Đã xóa tài liệu GiaoTrinh_KinhTeViMo_2025.pdf và dọn dẹp toàn bộ dữ liệu vector liên quan.",
  "documentId": "tb-001"
}
```

---

## 5. MÔ HÌNH DỮ LIỆU ORM & CẤU TRÚC BẢNG POSTGRESQL

Dữ liệu của service được cô lập hoàn toàn trong Schema `documents`:

```sql
CREATE SCHEMA IF NOT EXISTS documents;

-- Bảng tài liệu giáo trình
CREATE TABLE IF NOT EXISTS documents.documents (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL DEFAULT 'lec-001',
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

-- Bảng danh mục chương
CREATE TABLE IF NOT EXISTS documents.document_chapters (
    id VARCHAR(50) PRIMARY KEY,
    document_id VARCHAR(50) NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    chapter_index INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    page_start INT DEFAULT 1,
    page_end INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Bảng lưu trữ chunks văn bản thô
CREATE TABLE IF NOT EXISTS documents.document_chunks (
    id VARCHAR(100) PRIMARY KEY,
    document_id VARCHAR(50) NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    chapter VARCHAR(255) NOT NULL,
    char_count INT DEFAULT 0,
    text_snippet TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. CẤU HÌNH MÔI TRƯỜNG, DOCKERFILE & VẬN HÀNH

### Biến Môi trường (Environment Variables):
| Tên Biến | Giá trị Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `8002` | Cổng HTTP lắng nghe của service. |
| `DATABASE_URL` | `postgresql://quizgen:pass@postgres:5432/quizgen_db` | Chuỗi kết nối CSDL PostgreSQL 16. |
| `RAG_SERVICE_URL` | `http://rag-service:8003` | Địa chỉ nội bộ của RAG Vector Service. |
| `MAX_UPLOAD_SIZE_MB`| `25` | Kích thước file tối đa cho phép tải lên. |
| `DOCUMENT_STORAGE_DIR`| `./data/uploads` | Thư mục lưu tệp PDF/Docx vật lý trên ổ cứng. |

### Nội dung `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

ENV PORT=8002
EXPOSE 8002

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8002"]
```

---

## 7. MA TRẬN KIỂM THỬ & KỊCH BẢN TEST MẪU (CURL)

### Test 1: Kiểm tra tải lên tài liệu PDF thành công
```bash
curl -X POST "http://localhost:8000/api/v1/documents/upload" \
  -H "accept: application/json" \
  -F "file=@/path/to/GiaoTrinh_KinhTeViMo_2025.pdf"
```
*Kỳ vọng:* Trả về `202 Accepted`, `status = "embedding"`, các bản ghi xuất hiện trong PostgreSQL.

### Test 2: Kiểm tra từ chối định dạng không hợp lệ
```bash
curl -X POST "http://localhost:8000/api/v1/documents/upload" \
  -F "file=@test_image.png"
```
*Kỳ vọng:* Trả về `400 Bad Request` kèm thông báo *"Chỉ hỗ trợ tệp định dạng .pdf hoặc .docx"*.

### Test 3: Lấy danh sách giáo trình đã nạp
```bash
curl -X GET "http://localhost:8000/api/v1/documents/documents"
```
*Kỳ vọng:* Trả về `200 OK` danh sách mảng JSON có định dạng camelCase.
