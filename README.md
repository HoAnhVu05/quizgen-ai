# QuizGen AI - Academic SaaS Platform (Microservices Architecture)

Hệ thống Web App (SaaS) chuyên sâu hỗ trợ Giảng viên Đại học tự động hóa tạo đề thi trắc nghiệm từ tài liệu giáo trình (PDF/Word), sử dụng **LLM + RAG** và chuẩn hóa theo **Thang đo nhận thức Bloom**.

---

## 🏛️ Sơ đồ Kiến trúc Microservices (Architecture Diagram)

```
                       +-----------------------------+
                       |   Client Web (React UI)     |
                       |  (Vite + Tailwind + Lucide) |
                       +--------------+--------------+
                                      |
                                      | HTTP / REST
                                      v
                     +--------------------------------+
                     |    API Gateway (Port 8000)     |
                     |  Reverse Proxy & Auth Router   |
                     +---+-------+--------+-------+---+
                         |       |        |       |
         +---------------+       |        |       +---------------+
         |                       |        |                       |
         v                       v        v                       v
+------------------+ +---------------+ +-------------+ +------------------+
|  Auth Service    | |Document Svc   | | AI Service  | | Exam Service     |
|   (Port 8001)    | | (Port 8002)   | | (Port 8004) | | (Port 8005)      |
| Giảng viên & JWT | | PDF/Docx OCR  | | Bloom LLM   | | Word/PDF/QTI XML |
+------------------+ +-------+-------+ +------+------+ +------------------+
                             |                |
                             | Chunks         | Retrieval Context
                             +-------> + <----+
                                       |
                                       v
                             +-------------------+
                             |    RAG Service    |
                             |   (Port 8003)     |
                             | ChromaDB / Vector |
                             +-------------------+
```

---

## 📦 Danh mục các dịch vụ độc lập (Services Breakdown)

| Dịch vụ | Cổng | Công nghệ | Nhiệm vụ chính |
| :--- | :---: | :--- | :--- |
| **`api-gateway`** | `8000` | FastAPI, HTTPX | Điểm đón duy nhất (Single Entrypoint), định tuyến proxy ngược, CORS, Rate Limit |
| **`auth-service`** | `8001` | FastAPI, JWT, Bcrypt | Quản lý tài khoản Giảng viên, Khoa/Bộ môn, cấp phát & xác thực Bearer Token |
| **`document-service`** | `8002` | PyPDF, Python-docx | Upload giáo trình, bóc tách cấu trúc chương mục, chunking ngữ nghĩa |
| **`rag-service`** | `8003` | ChromaDB, Embeddings | Lưu trữ Vector DB, tính khoảng cách ngữ nghĩa (Cosine), truy hồi Top-K minh chứng |
| **`ai-service`** | `8004` | Gemini 1.5, Pydantic | Xử lý Prompt theo Thang đo Bloom (Nhận biết, Thông hiểu, Vận dụng), Output JSON |
| **`exam-service`** | `8005` | Python-docx, QTI XML | Ngân hàng đề, xáo trộn mã đề (101-104), xuất Word chuẩn ĐH, Canvas/Moodle QTI |
| **`client-web`** | `3000` | React, Tailwind, Lucide | Giao diện người dùng: Dashboard, Upload, Cấu hình AI, Split-View RAG, Ngân hàng đề |

---

## 🚀 Hướng dẫn Triển khai & Khởi chạy

### 1. Khởi chạy toàn bộ hệ thống bằng Docker Compose (Khuyên dùng)
```bash
# 1. Sao chép biến môi trường
cp .env.example .env

# 2. Khởi động đồng thời tất cả các microservices
docker-compose up --build
```

### 2. Khởi chạy giao diện Frontend (Client Web)
```bash
npm install
npm run dev
```
Truy cập giao diện tại: `http://localhost:3000`

### 3. Kiểm tra Health Check các Microservices
* API Gateway: `GET http://localhost:8000/health`
* Auth Service: `GET http://localhost:8001/health`
* Document Service: `GET http://localhost:8002/health`
* RAG Vector Service: `GET http://localhost:8003/health`
* AI Generation Service: `GET http://localhost:8004/health`
* Exam Export Service: `GET http://localhost:8005/health`
