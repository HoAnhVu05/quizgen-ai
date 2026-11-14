# ĐẶC TẢ HOÀN THIỆN RAG VECTOR SERVICE
**Dịch vụ:** `rag-service` (Cổng 8003 / Microservice Lưu trữ Vector, Tính toán Embeddings & Truy xuất Ngữ cảnh)  
**Hệ thống:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Học thuật  
**Phiên bản:** v1.0.0 Production Specification  
**Ngày hoàn thiện:** 02/11/2026  

---

## MỤC LỤC TỔNG QUAN

1. [Mục tiêu & Phạm vi Dịch vụ](#1-mục-tiêu--phạm-vi-dịch-vụ)
2. [Kiến trúc Mã nguồn & Cấu trúc Thư mục](#2-kiến-trúc-mã-nguồn--cấu-trúc-thư-mục)
3. [Kiến trúc Vector Engine & Thuật toán Truy xuất](#3-kiến-trúc-vector-engine--thuật-toán-truy-xuất)
   - 3.1. ChromaDB Persistent Client & Cấu trúc Chỉ mục HNSW
   - 3.2. Mô hình Nhúng Ngôn ngữ (Dense Embedding Model)
   - 3.3. Thuật toán Đo khoảng cách Tương đồng (Cosine Distance) & Quy đổi Điểm Relevance (%)
   - 3.4. Cơ chế Lọc Ngữ cảnh Metadata Đa tầng (Chapter-level Scoping)
4. [Đặc tả Chi tiết Toàn bộ API Endpoints](#4-đặc-tả-chi-tiết-toàn-bộ-api-endpoints)
   - 4.1. `GET /health` (Kiểm tra sức khỏe & thống kê số lượng vector)
   - 4.2. `POST /index-chunks` (Lập chỉ mục và nạp vector chunks từ document-service)
   - 4.3. `POST /query-context` (Truy vấn ngữ cảnh liên quan cho LLM sinh đề thi)
   - 4.4. `GET /documents/{document_id}/chunks` (Lấy danh sách đoạn trích cho Modal thanh tra)
   - 4.5. `DELETE /documents/{document_id}` (Dọn dẹp vector khi xóa tài liệu)
5. [Mô hình Dữ liệu ORM & Cấu trúc Bảng PostgreSQL](#5-mô-hình-dữ-liệu-orm--cấu-trúc-bảng-postgresql)
6. [Cấu hình Môi trường, Dockerfile & Vận hành](#6-cấu-hình-môi-trường-dockerfile--vận-hành)
7. [Cơ chế Triệt tiêu Ảo giác (Zero-Hallucination Pipeline)](#7-cơ-chế-triệt-tiêu-ảo-giác-zero-hallucination-pipeline)
8. [Ma trận Kiểm thử & Kịch bản Test mẫu (cURL Examples)](#8-ma-trận-kiểm-thử--kịch-bản-test-mẫu-curl-examples)

---

## 1. MỤC TIÊU & PHẠM VI DỊCH VỤ

`rag-service` là "bộ não tri thức" của QuizGen AI, chịu trách nhiệm lưu trữ dạng vector hóa toàn bộ nội dung giáo trình và cung cấp ngữ cảnh đối soát chính xác tuyệt đối nhằm triệt tiêu hoàn toàn hiện tượng ảo giác (hallucination) của AI:
- Nhận danh sách các đoạn trích văn bản (Semantic Chunks) từ `document-service` sau khi bóc tách.
- Chuyển đổi văn bản thành các vector biểu diễn dày đặc (Dense Embeddings 384 chiều) bằng mô hình ngôn ngữ tự nhiên.
- Lưu trữ và duy trì chỉ mục đồ thị HNSW trong **ChromaDB Persistent Store**.
- Thực hiện truy vấn tương đồng ngữ nghĩa (Semantic Similarity Search) dựa trên câu hỏi hoặc yêu cầu sinh đề thi.
- Hỗ trợ lọc theo phạm vi chương mục cụ thể (`where={"chapter": ...}`).
- Trả về danh sách Top-K chunks phù hợp nhất kèm điểm số tương đồng (Relevance Score %), số trang và tên chương phục vụ việc gắn minh chứng vào câu hỏi.
- Ghi nhận nhật ký truy xuất vào schema `rag` trong PostgreSQL để phục vụ phân tích hiệu năng và độ trễ.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   RAG VECTOR SERVICE PIPELINE ARCHITECTURE             │
└────────────────────────────────────────────────────────────────────────┘
                    [Từ document-service: Chunks]
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ 1. Vector Store       │
                     │    (vector_store.py)  │
                     │ • Model: all-MiniLM   │
                     │ • 384-Dim Float32     │
                     └───────────────────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ 2. ChromaDB Engine    │ ──> [HNSW Graph Index]
                     │    Collection:        │ ──> [Cosine Distance Space]
                     │    `textbook_chunks`  │ ──> [Disk: ./data/chroma]
                     └───────────────────────┘
                                 │
        ┌────────────────────────┴────────────────────────┐
        ▼                                                 ▼
[3. Indexing Metadata]                          [4. Semantic Query]
Ghi vào PostgreSQL:                             Từ ai-service (sinh đề thi)
• rag.vector_indexes                            POST /query-context
• Cập nhật tổng số vector                       └──> Trả về Top-K Chunks +
                                                     Relevance Score (%)
                                                     Ghi rag.retrieval_logs
```

---

## 2. KIẾN TRÚC MÃ NGUỒN & CẤU TRÚC THƯ MỤC

Mã nguồn của dịch vụ đặt tại thư mục `services/rag-service/`:

```
services/rag-service/
├── Dockerfile                   # Container Python 3.11-slim cấu hình ChromaDB
├── requirements.txt             # Khai báo chromadb, sentence-transformers, fastapi...
└── src/
    ├── __init__.py
    ├── main.py                  # API routing, validation Pydantic, ghi log truy xuất
    ├── vector_store.py          # Lớp RAGVectorStore bọc ChromaDB SDK, tính toán vector
    ├── models.py                # Định nghĩa ORM Schema `rag` (VectorIndexDB, RetrievalLogDB)
    └── database.py              # Cấu hình kết nối PostgreSQL
```

### Danh mục Dependencies chính (`requirements.txt`):
- `fastapi==0.115.0` & `uvicorn[standard]==0.32.0`: REST API engine.
- `chromadb==0.5.23`: Vector Database engine hỗ trợ lưu trữ liên tục (Persistent Storage).
- `sentence-transformers==3.3.1`: Thư viện tính toán Vector Embeddings ngôn ngữ tự nhiên.
- `sqlalchemy==2.0.36` & `psycopg2-binary==2.9.10`: Ghi nhận nhật ký truy xuất vào PostgreSQL.
- `pydantic==2.9.2`: Xác thực dữ liệu đầu vào.

---

## 3. KIẾN TRÚC VECTOR ENGINE & THUẬT TOÁN TRUY XUẤT

### 3.1. ChromaDB Persistent Client & Cấu trúc Chỉ mục HNSW
- Dữ liệu vector được lưu trữ liên tục trên disk tại đường dẫn `CHROMA_PERSIST_DIR` (mặc định `./data/chroma`).
- Khởi tạo thông qua:
  ```python
  self.client = chromadb.PersistentClient(path=persist_dir)
  self.collection = self.client.get_or_create_collection(
      name=collection_name,
      metadata={"hnsw:space": "cosine"}
  )
  ```
- **Không gian hình học (Space):** `cosine`.
- **Cấu trúc đồ thị (HNSW - Hierarchical Navigable Small World):** Cho phép tìm kiếm láng giềng gần nhất xấp xỉ (Approximate Nearest Neighbors - ANN) với độ phức tạp thời gian đạt $\mathcal{O}(\log N)$, đảm bảo tốc độ phản hồi dưới 50ms ngay cả khi kho sách có hàng trăm ngàn trang.

### 3.2. Mô hình Nhúng Ngôn ngữ (Dense Embedding Model)
- Sử dụng mô hình chuẩn: `sentence-transformers/all-MiniLM-L6-v2`.
- **Đặc tính kỹ thuật:**
  - Kích thước vector: **384 chiều** (384-dimensional dense vectors).
  - Khả năng ngữ nghĩa: Chuyển đổi các câu văn có cùng ý nghĩa nhưng khác từ ngữ về các tọa độ không gian gần nhau (VD: *"quy luật cầu"* và *"mối quan hệ nghịch biến giữa giá và lượng mua"* sẽ có khoảng cách rất gần nhau).
  - Tối ưu hóa bộ nhớ: Nhẹ, tốc độ sinh vector nhanh trên CPU mà không bắt buộc phải có GPU đắt tiền.

### 3.3. Thuật toán Đo khoảng cách Tương đồng & Điểm Relevance Score (%)
- ChromaDB trả về khoảng cách Cosine $D_{cosine} \in [0, 2]$:
  $$D_{cosine} = 1 - \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$$
- Hệ thống chuẩn hóa sang thang điểm phần trăm tương đồng **Relevance Score (%)** từ 0 đến 100:
  ```python
  # Khoảng cách càng nhỏ -> Độ tương đồng càng cao
  similarity = max(0.0, 1.0 - distance)
  relevance_score = round(similarity * 100, 2)
  ```
- Các đoạn trích có `relevance_score` $\ge 85\%$ được đánh giá là minh chứng đạt chuẩn học thuật.

### 3.4. Cơ chế Lọc Ngữ cảnh Metadata Đa tầng (Metadata Filtering)
Khi giảng viên cấu hình đề thi chỉ lấy kiến thức trong một số chương cụ thể, hệ thống không quét toàn bộ sách mà áp dụng bộ lọc trường metadata:
```python
where_filter = {"document_id": req.document_id}
if req.chapter:
    where_filter = {
        "$and": [
            {"document_id": req.document_id},
            {"chapter": req.chapter}
        ]
    }
```

---

## 4. ĐẶC TẢ CHI TIẾT TOÀN BỘ API ENDPOINTS

Tất cả các API được bảo vệ và định tuyến qua API Gateway tại tiền tố: `/api/v1/rag/*`.

### 4.1. `GET /health`
- **Mục đích:** Báo cáo trạng thái của Vector Store và tổng số lượng chunks đã vector hóa.
- **Response `200 OK`:**
```json
{
  "status": "healthy",
  "service": "rag-service",
  "collection": "textbook_chunks",
  "persistDir": "./data/chroma",
  "totalChunks": 1850,
  "totalDocuments": 2
}
```

---

### 4.2. `POST /index-chunks`
- **Mục đích:** Tiếp nhận danh sách các đoạn trích từ `document-service` sau khi bóc tách giáo trình để tính toán embeddings và lập chỉ mục vào ChromaDB.
- **Request Body (JSON):**
```json
{
  "document_id": "tb-001",
  "replace_existing": true,
  "chunks": [
    {
      "chunk_id": "chunk-1",
      "page_number": 42,
      "chapter": "Chương 3: Cung - Cầu và Giá cả thị trường",
      "text": "Quy luật cầu (Law of Demand) chỉ ra rằng: trong điều kiện các yếu tố khác không đổi, khi giá của một hàng hóa tăng lên thì lượng cầu giảm xuống..."
    },
    {
      "chunk_id": "chunk-2",
      "page_number": 45,
      "chapter": "Chương 3: Cung - Cầu và Giá cả thị trường",
      "text": "Hàng hóa thay thế (Substitute goods) là những cặp hàng hóa thỏa mãn cùng một nhu cầu. Khi giá mặt hàng X tăng, nhu cầu mặt hàng Y tăng..."
    }
  ]
}
```
- **Response `200 OK`:**
```json
{
  "message": "Đã lập chỉ mục thành công 2 chunks cho tài liệu tb-001",
  "document_id": "tb-001",
  "indexed_chunks": 2,
  "total_vectors_in_document": 184
}
```

---

### 4.3. `POST /query-context`
- **Mục đích:** Tìm kiếm các đoạn trích ngữ cảnh phù hợp nhất với yêu cầu hoặc câu hỏi sinh đề thi từ `ai-service`.
- **Request Body (JSON):**
```json
{
  "query": "Hệ số co giãn của cầu theo giá tác động như thế nào đến tổng doanh thu",
  "document_id": "tb-001",
  "chapter": "Chương 3: Cung - Cầu và Giá cả thị trường",
  "top_k": 3
}
```
- **Response `200 OK`:**
```json
{
  "query": "Hệ số co giãn của cầu theo giá tác động như thế nào đến tổng doanh thu",
  "totalMatches": 3,
  "latencyMs": 38,
  "contexts": [
    {
      "chunkId": "chunk-3",
      "pageNumber": 48,
      "chapter": "Chương 3: Cung - Cầu và Giá cả thị trường",
      "relevanceScore": 96.85,
      "textSnippet": "Hệ số co giãn của cầu theo giá (Price Elasticity of Demand - PED) đo lường mức độ phản ứng của lượng cầu trước sự thay đổi của giá cả. Nếu |PED| > 1, cầu được coi là co giãn nhiều, việc giảm giá sẽ làm tăng tổng doanh thu (Total Revenue) của doanh nghiệp."
    },
    {
      "chunkId": "chunk-1",
      "pageNumber": 42,
      "chapter": "Chương 3: Cung - Cầu và Giá cả thị trường",
      "relevanceScore": 88.40,
      "textSnippet": "Quy luật cầu chỉ ra mối quan hệ tỷ lệ nghịch giữa mức giá và lượng cầu..."
    }
  ]
}
```

---

### 4.4. `GET /documents/{document_id}/chunks`
- **Mục đích:** Lấy danh sách các chunk đã lưu trong ChromaDB của một giáo trình để hiển thị lên hộp thoại **RAG Chunks Inspector Modal** ở màn hình Quản lý Giáo trình.
- **Query Parameters:**
  - `limit`: Số lượng chunk tối đa cần xem (mặc định: `20`).
- **Response `200 OK`:**
```json
{
  "documentId": "tb-001",
  "totalChunks": 20,
  "chunks": [
    {
      "chunkId": "chunk-1",
      "pageNumber": 42,
      "chapter": "Chương 3: Cung - Cầu và Giá cả thị trường",
      "text": "Quy luật cầu (Law of Demand) chỉ ra rằng: trong điều kiện các yếu tố khác không đổi..."
    }
  ]
}
```

---

### 4.5. `DELETE /documents/{document_id}`
- **Mục đích:** Xóa sạch toàn bộ vector nhúng của giáo trình khỏi ChromaDB khi giảng viên xóa sách.
- **Response `200 OK`:**
```json
{
  "message": "Đã xóa 184 vectors của tài liệu tb-001 khỏi ChromaDB",
  "documentId": "tb-001",
  "deletedCount": 184
}
```

---

## 5. MÔ HÌNH DỮ LIỆU ORM & CẤU TRÚC BẢNG POSTGRESQL

Dữ liệu siêu dữ liệu vector và lịch sử truy xuất được lưu trữ trong Schema `rag`:

```sql
CREATE SCHEMA IF NOT EXISTS rag;

-- Bảng theo dõi chỉ mục vector theo tài liệu
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

-- Bảng nhật ký đối soát truy xuất ngữ cảnh
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
```

---

## 6. CẤU HÌNH MÔI TRƯỜNG, DOCKERFILE & VẬN HÀNH

### Biến Môi trường (Environment Variables):
| Tên Biến | Giá trị Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `8003` | Cổng HTTP lắng nghe của RAG Service. |
| `CHROMA_PERSIST_DIR` | `./data/chroma` | Thư mục lưu trữ cơ sở dữ liệu ChromaDB. |
| `CHROMA_COLLECTION_NAME`| `textbook_chunks` | Tên collection vector. |
| `RAG_DEFAULT_TOP_K` | `5` | Số chunk trả về mặc định cho mỗi truy vấn. |
| `RAG_MAX_TOP_K` | `20` | Giới hạn số chunk tối đa cho 1 lần lấy. |
| `DATABASE_URL` | `postgresql://quizgen:pass@postgres:5432/quizgen_db` | Chuỗi kết nối PostgreSQL ghi log. |

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

ENV PORT=8003
EXPOSE 8003

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8003"]
```

---

## 7. CƠ CHẾ TRIỆT TIÊU ẢO GIÁC (ZERO-HALLUCINATION PIPELINE)

Để đảm bảo câu hỏi trắc nghiệm do AI sinh ra hoàn toàn có cơ sở khoa học và không bao giờ bị "bịa đặt" (hallucination):

1. **RAG Context Grounding:** AI Service **không bao giờ** gọi trực tiếp LLM bằng tri thức mở trên internet. Bắt buộc phải thông qua `rag-service` để lấy đoạn trích gốc từ giáo trình của trường.
2. **Khóa liên kết `source_chunk_id`:** Mỗi câu hỏi trong cơ sở dữ liệu `exams.questions` bắt buộc phải mang theo ID của chunk tài liệu gốc (`source_chunk_id`).
3. **Đối soát Hai chiều tại Frontend:**
   - Khi giảng viên xem câu hỏi tại màn hình **Review Workspace**, hệ thống lấy `source_chunk_id` truy vấn sang ChromaDB và hiển thị nguyên văn đoạn trích gốc kèm số trang sách chính xác ở cột bên phải.
   - Giảng viên kiểm tra và xác nhận tính chuẩn xác trước khi bấm **Duyệt (Approve)** đưa vào ngân hàng đề thi.

---

## 8. MA TRẬN KIỂM THỬ & KỊCH BẢN TEST MẪU (CURL)

### Test 1: Kiểm tra tình trạng vector store
```bash
curl -X GET "http://localhost:8000/api/v1/rag/health"
```
*Kỳ vọng:* Trả về `200 OK`, số `totalChunks` $\ge 0$.

### Test 2: Nạp các chunk vào ChromaDB
```bash
curl -X POST "http://localhost:8000/api/v1/rag/index-chunks" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "tb-001",
    "replace_existing": false,
    "chunks": [
      {
        "chunk_id": "chunk-test-1",
        "page_number": 10,
        "chapter": "Chương 1",
        "text": "Nội dung bài học kinh tế vi mô thử nghiệm..."
      }
    ]
  }'
```
*Kỳ vọng:* Trả về `200 OK`, `"indexed_chunks": 1`.

### Test 3: Truy vấn ngữ cảnh liên quan
```bash
curl -X POST "http://localhost:8000/api/v1/rag/query-context" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Quy luật cầu và giá cả",
    "document_id": "tb-001",
    "top_k": 2
  }'
```
*Kỳ vọng:* Trả về `200 OK` danh sách các đoạn trích kèm `relevanceScore` và số trang.
