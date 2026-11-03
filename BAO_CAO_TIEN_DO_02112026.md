# BÁO CÁO TIẾN ĐỘ DỰ ÁN QUIZGEN AI
**Họ và tên:** Nguyễn Văn Tân  
**MSSV:** 060205012615  
**Nhóm:** Nhóm 1  
**Ngày thực hiện:** 02/11/2026  

---

### I. CÔNG VIỆC ĐÃ HOÀN THÀNH
Bám sát kiến trúc hệ thống và yêu cầu kỹ thuật của dự án, toàn bộ các hạng mục hoàn thiện Microservices (Document Service, RAG Service, Exam Service), chuẩn hóa định tuyến API Gateway và tích hợp toàn diện với Frontend đã được hoàn tất và kiểm thử thành công:

#### 1. Hoàn thiện toàn diện Document Service (Port 8002) & RAG Vector Service (Port 8003)
- **Document Service (`services/document-service/`)**:
  - `src/parser.py`: Nâng cấp bộ bóc tách PDF thông minh qua `pypdf` (xử lý file mã hóa, bóc tách trang vật lý, làm sạch khoảng trắng) và DOCX qua `python-docx` (bóc tách toàn bộ đoạn văn kết hợp bảng biểu `doc.tables`, phân khối giả lập trang 400 từ/trang).
  - `src/chunker.py`: Thuật toán phân tách theo chương mục regex đa ngôn ngữ (Chương/Bài/Phần/Chapter), theo dõi chính xác `page_start`/`page_end`, sliding window kích thước 500 từ, bước nhảy 100 từ cắt đúng ranh giới câu.
  - `src/main.py`: Hoàn thiện trọn bộ CRUD, endpoint tải file gốc `GET /documents/{id}/download` (FileResponse), background task đẩy vector sang RAG và dọn dẹp file vật lý an toàn khi xóa.
- **RAG Vector Service (`services/rag-service/`)**:
  - `src/vector_store.py`: Tích hợp ChromaDB Persistent Client, xử lý bộ lọc đa chương mục tuân thủ nghiêm ngặt toán tử logic `$and` và `$or` của ChromaDB ≥ 0.4.
  - Tính toán độ tương đồng Cosine chuẩn hóa: `Relevance Score = (1.0 - distance) * 100%`.
  - `src/main.py`: Đo lường độ trễ truy xuất ngữ cảnh (latency tính bằng mili-giây), hỗ trợ linh hoạt cả `documentId` (camelCase) và `document_id` (snake_case), lưu nhật ký truy vấn `rag.retrieval_logs`.

#### 2. Khắc phục lỗi định tuyến Reverse Proxy tại API Gateway (Port 8000)
- Bổ sung cấu hình `follow_redirects=True` cho `httpx.AsyncClient` tại `api-gateway/src/main.py`, giải quyết triệt để lỗi chuyển hướng HTTP 307 (Temporary Redirect) do sai lệch trailing slash giữa Gateway và các service con.
- Chuẩn hóa các tuyến định tuyến trong suốt:
  - `/api/v1/documents/*` → `document-service:8002`
  - `/api/v1/rag/*` → `rag-service:8003`
  - `/api/v1/exams/*`, `/api/v1/questions/*`, `/api/v1/analytics/*` → `exam-service:8005`

#### 3. Nâng cấp Exam Service (Port 8005) & Xuất bản đề thi chuẩn hóa đa định dạng
- Khắc phục lỗi thiếu thư viện bằng việc tái cấu trúc `pdf_exporter.py` hỗ trợ kép (Dual Engine: ReportLab và FPDF), đảm bảo xuất file PDF phiếu chấm chuẩn A4 không bao giờ bị gián đoạn.
- Cung cấp endpoint hợp nhất `POST /export` và `POST /api/v1/exams/export` cho phép đóng gói đề thi kèm ma trận đảo câu hỏi, xáo trộn phương án và xuất bảng đáp án.
- Cung cấp dữ liệu thống kê kiểm định qua `GET /analytics/dashboard` và kho câu hỏi qua `GET /questions`.

#### 4. Tích hợp sâu Frontend ↔ Backend & Tải tệp thực tế
- **Khắc phục lỗi Infinite Loop**: Sửa lỗi vòng lặp re-render thông báo vô tận trên `App.tsx` bằng `useCallback` với dependencies tĩnh và giới hạn hàng đợi tối đa 4 toast.
- **Đóng gói & Tải đề thi thật (`QuestionBankScreen.tsx`)**: Kết nối nút bấm xuất bản với API Gateway `POST /api/v1/exams/export`, kích hoạt trình duyệt tải xuống file thực tế (.docx chuẩn Đại học, .pdf có phiếu chấm, .xml Canvas LMS).
- **Đồng bộ ngân hàng câu hỏi (`App.tsx`)**: Tự động fetch câu hỏi từ CSDL (`GET /api/v1/questions`), kết nối duyệt hàng loạt (`POST /api/v1/questions/batch-approve`) và chỉnh sửa (`PUT /api/v1/questions/{id}`).
- **Dashboard thời gian thực (`DashboardScreen.tsx`)**: Nạp trực tiếp số lượng trang sách đã vector hóa, số chunk RAG và số câu hỏi đã thẩm định từ backend.
- **Sinh câu hỏi ma trận Bloom (`AIGenerationScreen.tsx`)**: Đọc tài liệu và chương từ CSDL, sinh câu hỏi đa tầng Bloom và chuyển tiếp sang Review Workspace với phím tắt nhanh (<kbd>A</kbd>: Duyệt, <kbd>R</kbd>: Loại, <kbd>E</kbd>: Sửa).

#### 5. Đồng bộ mã nguồn Git & Kiểm thử E2E
- Đồng bộ nhánh `origin/develop`: Hợp nhất thành công commit `e202271` (CSDL v2.4, Redis in-memory cache fallback) và `b65a667` / `a0b61ff` (giao diện mới từ đồng đội).
- Biên dịch toàn bộ Frontend với Vite 6: Đạt kết quả `✓ 2047 modules transformed, built in 8.47s` không có lỗi.
- Đẩy thành công 2 commit tích hợp (`f8ae351` và `ff05270`) lên nhánh `develop` và nhánh cá nhân `feature/upload-from-nguyentann-20261030`.

---

### II. KHÓ KHĂN GẶP PHẢI & GIẢI PHÁP ĐÃ XỬ LÝ

| # | Khó khăn / Thách thức | Giải pháp thực hiện |
| :-: | :--- | :--- |
| **1** | **Toán tử bộ lọc ChromaDB ≥ 0.4 gây lỗi `InvalidArgumentError`**: Khi lọc đồng thời theo `document_id` và danh sách `chapter`, ChromaDB không chấp nhận nhiều điều kiện rời rạc ở cấp ngoài cùng của `where`. | Tái cấu trúc hàm `query_chunks` trong `vector_store.py`: Sử dụng toán tử hợp nhất `{"$and": [{"document_id": ...}, {"$or": [{"chapter": ...}]}]}`, đảm bảo câu truy vấn lọc vector luôn hợp lệ. |
| **2** | **Lỗi chuyển hướng HTTP 307 tại API Gateway**: Khi Gateway chuyển tiếp request từ `/api/v1/questions` sang service backend có trailing slash khác biệt, FastAPI trả về mã 307 và httpx mặc định không tự động đi theo redirect, gây lỗi kết nối trên Frontend. | Cấu hình `httpx.AsyncClient(..., follow_redirects=True)` trong hàm `proxy_request` tại `api-gateway/src/main.py`, giúp Gateway tự động bám theo redirect và trả về trực tiếp kết quả 200 OK. |
| **3** | **Lỗi vòng lặp Re-render vô tận và treo trình duyệt (Infinite Toast Loop)**: `handleShowToast` trong `App.tsx` không được bọc `useCallback`, mỗi lần tạo toast lại làm thay đổi hàm props, kích hoạt `useEffect` trong màn hình con lặp vô tận. | Bọc `handleShowToast` và `handleDismissToast` trong `useCallback([])` với mảng dependency rỗng, giới hạn hàng đợi tối đa 4 thông báo mới nhất và thêm cờ chặn cảnh báo lặp lại khi backend ngoại tuyến. |
| **4** | **Xung đột phụ thuộc thư viện xuất PDF giữa ReportLab và FPDF**: Môi trường chạy backend thiếu thư viện `fpdf`, khiến `exam-service` bị văng lỗi `ModuleNotFoundError` ngay khi khởi động. | Nâng cấp file `pdf_exporter.py` theo kiến trúc dự phòng kép (Dual-engine): ưu tiên sử dụng `reportlab.platypus` (đã được cài đặt sẵn), tự động bắt lỗi và fallback thông minh, đảm bảo service luôn khởi động thành công. |

---

### III. MINH CHỨNG KỸ THUẬT (EVIDENCE)

#### 1. Minh chứng Git & Mã nguồn
- **Repository:** https://github.com/HoAnhVu05/quizgen-ai
- **Nhánh làm việc:** `develop` & `feature/upload-from-nguyentann-20261030`
- **Các commit mới nhất:**
  - `ff05270` *feat(frontend): integrate live exam export, dynamic analytics dashboard, and question bank synchronization*
  - `f8ae351` *fix(integration): enable automatic redirect following in API Gateway and add dual ReportLab/FPDF support for PDF export*
  - `a0b61ff` *Merge branch 'develop' of https://github.com/HoAnhVu05/quizgen-ai into develop*
  - `e202271` *[DB & CACHE] feat: dong bo dac ta csdl v2.4, tich hop toan dien Redis cache, JWT blacklist, upload progress va rate limiter*

#### 2. Minh chứng Logic Kỹ thuật cốt lõi

**a) Logic bộ lọc đa chương mục ChromaDB (`services/rag-service/src/vector_store.py`):**
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

**b) Logic chuyển tiếp tự động theo dõi chuyển hướng (`api-gateway/src/main.py`):**
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

**c) Logic tải tệp đề thi thật trên Frontend (`src/components/QuestionBankScreen.tsx`):**
```typescript
const response = await fetch(`${API_BASE}/exams/export`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...examConfig,
    format: exportFormat,
    selectedQuestionIds: selectedIds,
    questions: questionsToExport,
  }),
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
const fileExt = exportFormat === 'qti' ? 'xml' : exportFormat;
a.download = `DeThi_${examConfig.subjectName.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
document.body.appendChild(a);
a.click();
a.remove();
window.URL.revokeObjectURL(url);
```

#### 3. Minh chứng API Request & Response thực tế

**Trường hợp 1: Xuất bản và tải file đề thi Word/PDF (`POST /api/v1/exams/export`)**
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
- **Kết quả:** File Word nhị phân được tải về máy thành công, mở đầy đủ ma trận đề thi và đáp án.

**Trường hợp 2: Lấy dữ liệu phân tích thời gian thực (`GET /api/v1/analytics/dashboard`)**
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/analytics/dashboard" -H "accept: application/json"
```
```json
{
  "totalTextbooks": 12,
  "totalVectorizedPages": 1480,
  "totalRagChunks": 12450,
  "totalApprovedQuestions": 349,
  "totalPendingQuestions": 2,
  "totalExamsPackaged": 28,
  "bloomDistribution": {
    "nhanBiet": 40,
    "thongHieu": 35,
    "vanDung": 18,
    "phanTich": 7
  }
}
```

**Trường hợp 3: Kiểm tra sức khỏe toàn hệ sinh thái qua Gateway (`GET /health`)**
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
