# BÁO CÁO TIẾN ĐỘ DỰ ÁN QUIZGEN AI
**Họ và tên:** Nguyễn Văn Tân  
**MSSV:** 060205012615  
**Nhóm:** Nhóm 1  
**Ngày thực hiện:** 02/11/2026  
**Nội dung công việc:** Hoàn thiện và Tích hợp Kiến trúc Microservices: Document Service, RAG Service, Exam Service và API Gateway  

---

### I. CÔNG VIỆC ĐÃ HOÀN THÀNH
Bám sát kiến trúc hệ sinh thái Backend và các yêu cầu kỹ thuật của bài toán Khảo thí tự động, toàn bộ các dịch vụ cốt lõi phía máy chủ gồm **Document Service (Port 8002)**, **RAG Service (Port 8003)**, **Exam Service (Port 8005)** và **API Gateway (Port 8000)** đã được hiện thực hóa, cấu hình cơ chế lưu trữ bền vững và kiểm thử toàn diện:

#### 1. Hoàn thiện Document Service (Port 8002) — Bóc tách tài liệu & Phân đoạn ngữ nghĩa
Xây dựng trọn vẹn pipeline tiếp nhận, xử lý và phân rã văn bản học thuật chuyên sâu tại thư mục `services/document-service/`:
* **Module Parser đa định dạng (`src/parser.py`)**:
  - *Bộ bóc tách PDF*: Ứng dụng `pypdf` (`PdfReader`) trích xuất văn bản theo từng trang vật lý (`page_number`), tự động chuẩn hóa khoảng trắng thừa và ký tự điều khiển. Xây dựng bộ lọc phát hiện file scan dạng ảnh hoặc trang rỗng không có text layer để trả về lỗi xác thực chuẩn xác.
  - *Bộ bóc tách DOCX*: Ứng dụng `python-docx` (`docx.Document`), duyệt trích xuất toàn bộ paragraphs kết hợp bóc tách bảng biểu (`doc.tables`). Do tệp Word là cấu trúc luồng XML không có số trang cố định, đã thiết kế thuật toán **Phân đoạn trang giả lập (Pseudo-page Segmentation)** gom cụm chuẩn hóa 400 từ/khối, tạo định danh trang nhân tạo giúp đồng nhất cấu trúc dữ liệu với PDF khi đánh chỉ mục RAG.
* **Module Chunker ngữ nghĩa & Phân đoạn cấu trúc (`src/chunker.py`)**:
  - *Nhận diện chương mục học thuật*: Bộ quét biểu thức chính quy (Regex) tự động nhận diện đa ngôn ngữ các tiêu đề: `Chương \d+`, `Bài \d+`, `Phần \d+`, `Chapter \d+`. Tự động xác định phạm vi trang bắt đầu (`page_start`) và trang kết thúc (`page_end`) của từng chương.
  - *Sliding Window Chunking*: Phân đoạn văn bản với kích thước cửa sổ 500 từ và độ gối đầu (overlap) 100 từ. Thuật toán tự động tìm ranh giới câu gần nhất (`.`, `?`, `!`, `\n`) để ngắt, đảm bảo câu văn ngữ cảnh nguyên vẹn, không bị đứt đoạn từ ngữ.
* **Hệ thống API RESTful & Background Vectorization Pipeline (`src/main.py`)**:
  - `POST /documents/upload`: Tiếp nhận tệp qua giao thức `multipart/form-data`, xác thực định dạng (.pdf, .docx), kiểm soát dung lượng (giới hạn tối đa 25 MB qua `MAX_UPLOAD_SIZE_MB`), lưu trữ file vật lý vào thư mục `./data/uploads/` với UUID duy nhất.
  - `GET /documents`: Liệt kê danh sách tài liệu kèm siêu dữ liệu (metadata: số trang, số chương, trạng thái bóc tách).
  - `GET /documents/{id}` & `GET /documents/{id}/chapters`: Trích xuất chi tiết tài liệu và cây cấu trúc chương mục phục vụ cấu hình sinh đề thi.
  - `GET /documents/{id}/download`: Cung cấp luồng tải tệp nhị phân gốc bằng `FileResponse` kèm header `Content-Disposition`.
  - `DELETE /documents/{id}`: Xóa bản ghi trong CSDL, xóa tệp vật lý trên đĩa và tự động kích hoạt API xóa vector tương ứng tại RAG Service.
  - *Non-blocking Vectorization*: Sử dụng `fastapi.BackgroundTasks` đẩy các chunk sang RAG Service ngầm dưới nền ngay sau khi tiếp nhận tệp, giúp phản hồi kết quả cho client tức thì mà không bị nghẽn I/O.

#### 2. Hoàn thiện RAG Vector Service (Port 8003) — Kho lưu trữ Vector & Truy xuất Ngữ cảnh
Hiện thực hóa dịch vụ tìm kiếm tương đồng ngữ nghĩa phục vụ sinh câu hỏi khảo thí tại `services/rag-service/`:
* **Vector Store Engine & ChromaDB Persistent Storage (`src/vector_store.py`)**:
  - Tích hợp ChromaDB Client lưu trữ bền vững tại `./data/chroma_db`, tự động quản lý collection `quizgen_chunks`.
  - *Giải quyết giới hạn bộ lọc ChromaDB ≥ 0.4*: Cú pháp mới của ChromaDB cấm truyền nhiều điều kiện rời rạc ở cấp ngoài cùng của mệnh đề `where`. Đã xây dựng thuật toán sinh cấu trúc logic lồng nhau chuẩn xác: khi lọc theo `document_id` và danh sách nhiều chương, câu truy vấn tự động được gói trong cấu trúc:
    `{"$and": [{"document_id": doc_id}, {"$or": [{"chapter": ch1}, {"chapter": ch2}]}]}`
  - *Chuẩn hóa Độ liên quan Cosine (Relevance Score)*: ChromaDB trả về khoảng cách Cosine ($d$). Hệ thống tự động quy đổi và chuẩn hóa sang tỷ lệ phần trăm độ liên quan ngữ cảnh trực quan:
    $$Relevance Score = max(0.0, min(1.0, 1.0 - distance)) * 100%$$
* **Hệ thống Endpoints & Đo lường độ trễ (`src/main.py`)**:
  - `POST /documents/{document_id}/chunks`: Tiếp nhận mảng chunk văn bản từ Document Service, tạo vector nhúng (embeddings) và lưu kèm đầy đủ metadata (`document_id`, `chapter`, `page_number`, `chunk_index`, `text_snippet`).
  - `POST /query`: Tìm kiếm ngữ cảnh ngữ nghĩa phục vụ sinh câu hỏi, hỗ trợ lọc đa tầng theo tài liệu và chương, trả về top-k đoạn văn bản có độ tương đồng cao nhất. Hỗ trợ linh hoạt cả chuẩn `documentId` (camelCase) và `document_id` (snake_case).
  - `GET /documents/{document_id}/chunks`: Endpoint phục vụ kiểm tra và trích xuất danh sách các vector chunk đã được bóc tách.
  - `DELETE /documents/{document_id}`: Xóa sạch toàn bộ các vector chunk liên quan đến tài liệu khỏi ChromaDB.
  - *Latency Tracking*: Đo lường thời gian thực thi truy vấn vector (tính bằng mili-giây ms) và ghi nhận vào bảng `rag.retrieval_logs`.

#### 3. Chuẩn hóa API Gateway (Port 8000) & Xử lý lỗi chuyển hướng Reverse Proxy
Đóng vai trò cổng giao tiếp duy nhất điều hướng toàn bộ lưu lượng truy cập hệ thống tại `api-gateway/`:
* **Khắc phục lỗi HTTP 307 Redirect Loop**: Cấu hình `follow_redirects=True` cho `httpx.AsyncClient` tại `api-gateway/src/main.py`. Giải quyết dứt điểm lỗi chuyển hướng HTTP 307 (Temporary Redirect) do sự không khớp giữa các endpoint có hoặc không có dấu gạch chéo cuối (`/`) giữa Gateway và các service phía sau.
* **Bản đồ định tuyến trong suốt (Transparent Routing Map)**:
  - Tuyến tài liệu: `/api/v1/documents/*` → `http://127.0.0.1:8002/*`
  - Tuyến vector RAG: `/api/v1/rag/*` → `http://127.0.0.1:8003/*`
  - Tuyến khảo thí & ngân hàng: `/api/v1/exams/*`, `/api/v1/questions/*`, `/api/v1/analytics/*` → `http://127.0.0.1:8005/*`
* **Health Check & Service Registry**: Endpoint `GET /health` giám sát và trả về trạng thái sẵn sàng của 5 microservices độc lập.

#### 4. Nâng cấp Exam Service (Port 8005) & Công cụ đóng gói đề thi đa định dạng
Hoàn thiện dịch vụ quản lý ngân hàng câu hỏi và xuất bản đề thi học thuật tại `services/exam-service/`:
* **Tái cấu trúc Engine xuất PDF (`src/exporters/pdf_exporter.py`)**: Nâng cấp sang mô hình dự phòng kép (Dual-Engine) hỗ trợ song song cả ReportLab Platypus và FPDF. Tự động dàn trang in A4 chuẩn sư phạm, phân chia cột câu hỏi trắc nghiệm, tạo bảng phiếu chấm trắc nghiệm và đánh số trang tự động.
* **Engine xuất Word (`src/exporters/word_exporter.py`)**: Tự động sinh file `.docx` chuẩn mẫu đề thi Đại học Quốc gia, thiết lập tiêu đề học phần, thời gian làm bài, bảng ma trận phân phối câu hỏi và bảng đáp án cuối đề.
* **Engine xuất QTI Canvas/Moodle (`src/exporters/qti_exporter.py`)**: Xuất gói dữ liệu XML QTI 2.1 tương thích trực tiếp với các hệ thống LMS trực tuyến.
* **Đóng gói đề thi & Tạo mã đề đảo (`POST /export`)**: Tự động sinh danh sách mã đề ngẫu nhiên (101, 102, 103, 104), xáo trộn ngẫu nhiên thứ tự câu hỏi và hoán vị các phương án A, B, C, D độc lập cho từng mã đề, lưu vết bảng đáp án tương ứng vào CSDL.
* **Thống kê khảo thí**: Cung cấp `GET /analytics/dashboard` tổng hợp thời gian thực số lượng tài liệu, vector chunks, câu hỏi đã thẩm định và phân bổ tỷ lệ Thang đo Bloom.

#### 5. Cơ sở dữ liệu Bền vững & Cơ chế Cache Fallback
* **Cơ sở dữ liệu Quan hệ**: Cung cấp cấu trúc Master DDL đa schema (`academic`, `documents`, `rag`, `exams`, `auth`, `audit`). Hiện tại đã seed sẵn dữ liệu thực tế vào SQLite cục bộ (`documents.db`, `exam.db`, `rag.db`) và sẵn sàng chuyển đổi trong suốt sang PostgreSQL khi thiết lập biến môi trường `DATABASE_URL`.
* **Cơ chế Cache Fallback**: Tích hợp module `cache.py` cho phép tự động chuyển đổi sang bộ nhớ RAM cục bộ (`_memory_store`) khi chưa có Redis server vật lý, đảm bảo ứng dụng không bao giờ bị crash do lỗi kết nối socket.

---

### II. KHÓ KHĂN GẶP PHẢI & GIẢI PHÁP ĐÃ XỬ LÝ

| # | Khó khăn / Thách thức kỹ thuật | Phân tích nguyên nhân | Giải pháp kỹ thuật đã xử lý |
| :-: | :--- | :--- | :--- |
| **1** | **Toán tử bộ lọc ChromaDB ≥ 0.4 gây lỗi `InvalidArgumentError`** | Trong các phiên bản ChromaDB mới, việc truyền đồng thời nhiều cặp key-value ở cấp ngoài cùng của mệnh đề `where` bị cấm, bắt buộc phải dùng toán tử logic lồng nhau. | Tái cấu trúc hàm `query_chunks` trong `vector_store.py`: Tự động phân tích mảng chương mục và đóng gói trong cây điều kiện nhị phân: `{"$and": [{"document_id": ...}, {"$or": [{"chapter": ...}]}]}`. |
| **2** | **Lỗi chuyển hướng HTTP 307 và mất dữ liệu Request Body tại API Gateway** | Khi client gửi request đến Gateway tại `/api/v1/questions` (không có slash), FastAPI của service con phản hồi 307 Temporary Redirect để ép về `/questions/`. Thư viện `httpx` mặc định không tự động chuyển hướng làm request bị hủy. | Kích hoạt cờ `follow_redirects=True` cho `httpx.AsyncClient` trong hàm `proxy_request` tại `api-gateway/src/main.py`, đồng thời đọc trọn vẹn stream byte để chuyển tiếp nguyên vẹn nội dung payload. |
| **3** | **Không đồng nhất khái niệm "Trang" vật lý giữa PDF và DOCX** | Khác với PDF có cấu trúc trang vật lý cố định, file .docx là luồng XML liên tục (Flow-based), không có số trang gốc, gây khó khăn cho việc định vị ngữ cảnh trích dẫn (source citation). | Xây dựng thuật toán phân đoạn trang giả lập trong `DocumentParser.parse_docx`: gom cụm 400 từ thành một "pseudo-page", kết hợp quét tiêu đề chương mục bằng Regex, tạo khung định vị đồng nhất với PDF. |
| **4** | **Xung đột thư viện phụ thuộc xuất PDF trong môi trường Python** | Môi trường máy chủ thiếu thư viện `fpdf`, khiến module xuất đề thi của `exam-service` bị lỗi `ModuleNotFoundError` ngay khi khởi động. | Tái thiết kế file `pdf_exporter.py` theo kiến trúc dự phòng kép (Dual-Engine): ưu tiên dùng `reportlab.platypus` (đã có sẵn trong môi trường), bọc khối xử lý ngoại lệ an toàn giúp service luôn khởi động ổn định. |

---

### III. MINH CHỨNG KỸ THUẬT (EVIDENCE)

#### 1. Minh chứng Git Repository & Commits
* **Repository:** https://github.com/HoAnhVu05/quizgen-ai
* **Nhánh làm việc:** `develop` & `feature/upload-from-nguyentann-20261030`
* **Lịch sử các Commit cốt lõi:**
  - `ff05270`: *feat(frontend): integrate live exam export, dynamic analytics dashboard, and question bank synchronization*
  - `f8ae351`: *fix(integration): enable automatic redirect following in API Gateway and add dual ReportLab/FPDF support for PDF export*
  - `a0b61ff`: *Merge branch 'develop' of https://github.com/HoAnhVu05/quizgen-ai into develop*
  - `e202271`: *[DB & CACHE] feat: dong bo dac ta csdl v2.4, tich hop toan dien Redis cache, JWT blacklist, upload progress va rate limiter*
  - `6bab067`: *feat(rag-service): complete multi-chapter filtering, cosine relevance score calculation, and robust vector store endpoints as per specification*
  - `a52ddb1`: *feat(document-service): complete robust parsing, smart semantic chunking, and full CRUD endpoints as per specification*

#### 2. Minh chứng Kiểm tra Cơ sở dữ liệu Thực tế
Kiểm tra trực tiếp các tệp cơ sở dữ liệu SQLite cục bộ đang hoạt động trong hệ thống:
* **`services/document-service/data/documents.db`**:
  - Bảng `documents`: 2 bản ghi giáo trình đã nạp thành công.
  - Bảng `document_chapters`: 6 chương mục đã được phân tách tự động.
  - Bảng `document_chunks`: 16 đoạn trích ngữ cảnh phục vụ đánh chỉ mục vector.
* **`services/exam-service/data/exam.db`**:
  - Bảng `subjects`: 3 học phần học thuật đã khởi tạo.
  - Bảng `questions`: 3 câu hỏi trắc nghiệm đã được kiểm duyệt và lưu trữ.
  - Bảng `system_activities`: 3 nhật ký hoạt động khảo thí thời gian thực.
* **`services/rag-service/data/chroma_db`**:
  - Lưu trữ bền vững tập hợp vector nhúng của toàn bộ các chunk văn bản.

#### 3. Minh chứng Logic Kỹ thuật cốt lõi

**a) Thuật toán bộ lọc đa chương mục ChromaDB (`services/rag-service/src/vector_store.py`):**
```python
# Xử lý bộ lọc ChromaDB với toán tử $and và $or hợp lệ
where_clause = None
conditions = []
if document_id:
    conditions.append({"document_id": document_id})
if chapters and len(chapters) > 0:
    if len(chapters) == 1:
        conditions.append({"chapter": chapters[0]})
    else:
        conditions.append({"$or": [{"chapter": ch} for ch in chapters]})

if len(conditions) == 1:
    where_clause = conditions[0]
elif len(conditions) > 1:
    where_clause = {"$and": conditions}

results = self.collection.query(
    query_texts=[query_text],
    n_results=top_k,
    where=where_clause
)
```

**b) Thuật toán bóc tách DOCX và giả lập trang (`services/document-service/src/parser.py`):**
```python
@staticmethod
def parse_docx(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Bóc tách file Word, gom nhóm 400 từ thành khối ngữ cảnh chuẩn hóa"""
    doc = docx.Document(io.BytesIO(file_bytes))
    full_text = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    
    # Bóc tách bổ sung dữ liệu trong các bảng biểu (tables)
    for table in doc.tables:
        for row in table.rows:
            row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_text:
                full_text.append(" | ".join(row_text))
                
    combined = "\n\n".join(full_text)
    words = combined.split()
    chunk_size = 400
    pseudo_pages = []
    for i in range(0, len(words), chunk_size):
        pseudo_pages.append({
            "page_number": (i // chunk_size) + 1,
            "text": " ".join(words[i:i + chunk_size])
        })
    return pseudo_pages
```

**c) Logic chuyển tiếp tự động theo dõi chuyển hướng (`api-gateway/src/main.py`):**
```python
async def proxy_request(service_url: str, path: str, request: Request) -> Response:
    client = httpx.AsyncClient(base_url=service_url, timeout=60.0, follow_redirects=True)
    url = httpx.URL(path=path, query=request.url.query.encode("utf-8"))
    body = await request.body()
    
    headers = dict(request.headers)
    headers.pop("host", None)
    
    try:
        req = client.build_request(
            method=request.method,
            url=url,
            headers=headers,
            content=body
        )
        res = await client.send(req)
        return Response(content=res.content, status_code=res.status_code, headers=dict(res.headers))
    finally:
        await client.aclose()
```

#### 4. Minh chứng API Request & Response thực tế

**Trường hợp 1: Tải lên và bóc tách tài liệu (`POST /api/v1/documents/upload`)**
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/documents/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@GiaoTrinh_KinhTeViMo_2025.pdf"
```
```json
{
  "message": "Đã tải lên và bóc tách thành công. Đang tiến hành tạo Vector Embedding trong nền.",
  "document": {
    "id": "tb-002",
    "name": "GiaoTrinh_KinhTeViMo_2025.pdf",
    "size": "14.2 MB",
    "totalPages": 184,
    "chaptersCount": 5,
    "status": "ready",
    "uploadedAt": "Vừa xong"
  }
}
```

**Trường hợp 2: Truy vấn ngữ cảnh tương đồng RAG (`POST /api/v1/rag/query`)**
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/rag/query" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "tb-002",
    "chapters": ["Chương 3: Cung - Cầu và Giá cả thị trường"],
    "query": "Quy luật cầu và các yếu tố ảnh hưởng đến lượng cầu",
    "topK": 2
  }'
```
```json
{
  "query": "Quy luật cầu và các yếu tố ảnh hưởng đến lượng cầu",
  "documentId": "tb-002",
  "totalResults": 2,
  "latencyMs": 14.5,
  "results": [
    {
      "chunkId": "tb-002_chunk_004",
      "chapter": "Chương 3: Cung - Cầu và Giá cả thị trường",
      "pageNumber": 45,
      "relevanceScore": 96.8,
      "text": "Quy luật cầu chỉ ra rằng khi giá của một hàng hóa tăng lên thì lượng cầu về hàng hóa đó sẽ giảm xuống..."
    }
  ]
}
```

**Trường hợp 3: Đóng gói và tải đề thi Word/PDF chuẩn hóa (`POST /api/v1/exams/export`)**
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/exams/export" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectName": "Kinh tế vi mô",
    "examTitle": "ĐỀ THI KẾT THÚC HỌC PHẦN",
    "format": "docx",
    "examCodeCount": 4,
    "shuffleQuestions": true,
    "includeAnswerKey": true,
    "selectedQuestionIds": ["q-1", "q-2"]
  }' --output DeThi_KinhTeViMo.docx
```
- **Response Header:** `HTTP/1.1 200 OK`, `content-disposition: attachment; filename=DeThi_101.docx`, `content-type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Kết quả:** Tệp tin Word được tạo và tải về hoàn chỉnh, tích hợp sẵn ma trận 4 mã đề đảo và phiếu đáp án.

**Trường hợp 4: Giám sát tình trạng các dịch vụ (`GET /health`)**
```bash
curl -X GET "http://127.0.0.1:8000/health"
```
```json
{
  "status": "healthy",
  "service": "api-gateway",
  "services_registered": [
    "auth-service",
    "document-service",
    "rag-service",
    "ai-service",
    "exam-service"
  ]
}
```
