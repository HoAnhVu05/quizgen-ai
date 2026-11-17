# BÁO CÁO TIẾN ĐỘ THỰC TẬP HẰNG NGÀY

**Họ và tên sinh viên:** Nguyễn Văn Tân  
**Mã số sinh viên (MSSV):** 060205012615  
**Trường:** Đại học Giao thông vận tải TP.HCM (UTH)  
**Ngày thực hiện:** 17/11/2026  
**Dự án:** QuizGen AI – Nền tảng Biên soạn & Quản lý Đề thi Thông minh  
**Mã nhiệm vụ Jira:** [SCRUM-99]  
**Nhánh làm việc (Git Branch):** `feature/upload-from-nguyentann-20261030`  
**Phạm vi phụ trách độc quyền:** 4 Microservices Backend Cốt Lõi (`admin-service`, `payment-service`, `document-service`, `rag-service`)  

---

## 1. Nhiệm vụ đã làm

Trong ngày làm việc hôm nay (17/11/2026), toàn bộ trọng tâm tập trung nâng cấp chuyên sâu kiến trúc backend, độ tin cậy dữ liệu, hiệu năng truy vấn và bảo mật liên dịch vụ trên đúng 4 microservices được giao:

### 1.1. Nâng cấp Document Service (Port 8002)
- **Bảo toàn công thức toán học LaTeX & Bảng biểu:** Nâng cấp bộ nhận diện `_find_math_span_at` và cơ chế ngắt câu sạch sẽ `TextChunker._find_clean_boundary` trong `chunker.py`. Hệ thống nhận diện và bảo vệ tuyệt đối các khối công thức hiển thị nhiều dòng `$$ ... $$`, `\[ ... \]`, công thức nội dòng `\( ... \)` và `$ ... $`. Đảm bảo không bao giờ cắt vụn công thức hoặc làm đứt gãy dòng bảng biểu Markdown (`| ... |`) ở ranh giới giữa 2 chunks.
- **Chống trùng lặp tài liệu bằng mã băm SHA-256 (Deduplication):** Tích hợp trường `file_hash` trên bảng `documents` trong `models.py`. Hệ thống tự động nhận diện và tái sử dụng 100% dữ liệu đã phân tích khi người dùng upload tệp giáo trình trùng khớp nội dung, loại bỏ thời gian trích xuất dư thừa.
- **API theo dõi tiến trình chi tiết:** Cung cấp thông tin tiến độ xử lý tài liệu theo thời gian thực (0% - 100%) kèm số lượng chunks và mã băm xác thực.

### 1.2. Nâng cấp RAG Service (Port 8003)
- **Cải tiến Bộ chấm điểm từ vựng & Công thức:** Mở rộng `LexicalScorer` trong `vector_store.py` nhằm tăng trọng số nhận diện các công thức toán học và thuật ngữ học thuật chuyên sâu.
- **Chuẩn hóa cấu trúc Academic Citation Cards:** Endpoint `/query-context` trong `main.py` trả về danh sách `citationCards` chi tiết: Tên giáo trình, số chương, số trang cụ thể, điểm tương đồng hybrid, mã định danh chunk và đoạn trích dẫn nguồn bôi đậm (`highlightExcerpt`).
- **Đồng bộ dọn rác Vector Store:** Bổ sung endpoint `DELETE /vectors/document/{document_id}` dọn sạch toàn bộ vector embedding trong ChromaDB và xóa cache liên quan khi tài liệu bị xóa ở Document Service.

### 1.3. Nâng cấp Payment Service (Port 8007)
- **Bảo vệ Webhook Idempotency:** Xây dựng bảng lưu vết `webhook_idempotency_logs` trong `main.py`. Nhận diện khóa `X-Idempotency-Key` và mã tham chiếu `referenceCode`, loại bỏ hoàn toàn rủi ro cộng tiền hay kích hoạt 2 lần khi cổng thanh toán PayOS / VietQR retry callback.
- **API Báo cáo Doanh thu & AOV (`/admin/revenue-breakdown`):** Trích xuất tổng doanh thu thực tế, chỉ số giá trị đơn hàng trung bình (AOV), phân bổ doanh thu theo từng nhóm gói cước (`PRO_MONTH`, `PRO_YEAR`) và biểu đồ giao dịch 7 ngày gần nhất.
- **Bộ quét đơn hết hạn (Expired Sweeper):** Cơ chế chạy nền tự động rà soát và chuyển các đơn `PENDING` quá 15 phút sang `EXPIRED`.

### 1.4. Nâng cấp Admin Service (Port 8006)
- **In-Memory TTL Caching Layer:** Tích hợp bộ nhớ đệm an toàn luồng (TTL 30 giây) cho các API thống kê nặng (`/analytics/bloom-distribution`, `/users/activity-summary`), triệt tiêu độ trễ và giải phóng hoàn toàn áp lực truy vấn I/O lên cơ sở dữ liệu.
- **Xuất dữ liệu Kiểm toán Hệ thống (`/audit/logs/export`):** Hỗ trợ xuất dữ liệu kiểm toán hệ thống linh hoạt ở cả 2 định dạng JSON và tệp CSV tải về kèm bộ lọc mức độ nghiêm trọng (Severity).
- **Ma trận Giám sát Cụm Microservices (`/services/health-matrix`):** Theo dõi độ trễ thời gian thực và xếp hạng hiệu năng của toàn bộ cụm 8 Microservices (đạt độ trễ trung bình siêu tốc ~5.7ms, trạng thái Optimal).

### 1.5. Kết quả Kiểm thử & Build Hệ thống
- **Kiểm thử tự động E2E [SCRUM-99] (`scripts/[SCRUM-99]_test_4_backend_services.py`):** Đạt tỷ lệ tuyệt đối **7/7 PASS (100.0%)**.
  + TEST 1: Health-Check 4 Services Đảm Nhận (8002, 8003, 8006, 8007) — **PASS**
  + TEST 2: Document Service: Bảo Toàn Công Thức LaTeX & Bảng Biểu — **PASS**
  + TEST 3: RAG Service: Hybrid Search & Academic Citation Cards — **PASS**
  + TEST 4: Payment Service: Webhook Idempotency Protection — **PASS**
  + TEST 5: Payment Service: Revenue Breakdown & AOV Metrics — **PASS**
  + TEST 6: Admin Service: In-Memory TTL Caching & Audit Export (CSV & JSON) — **PASS**
  + TEST 7: Admin Service: Microservices Health Matrix & Latency Percentile — **PASS**
- **Kiểm tra Build Frontend (`npm run build`):** 2.073 modules transformed, **0 lỗi cú pháp TypeScript**.

---

## 2. Khó khăn và giải pháp

Trong quá trình nâng cấp 4 dịch vụ backend hôm nay, một số vấn đề kỹ thuật phức tạp đã được phát hiện và xử lý triệt để:

### 2.1. Khó khăn 1: Phân mảnh công thức toán học LaTeX khi ngắt đoạn văn bản
- **Mô tả vấn đề:** Bộ chia đoạn thông thường (`TextChunker`) ngắt câu dựa trên độ dài ký tự tối đa (`max_chunk_chars`) hoặc dấu chấm câu. Với giáo trình Toán - Lý - Tin chứa công thức hiển thị nhiều dòng `$$...$$` hoặc `\[...\]`, thuật toán cũ vô tình cắt ngang giữa công thức, khiến mô hình AI nhận được cú pháp LaTeX bị rách và sinh câu hỏi lỗi.
- **Giải pháp:** Xây dựng hàm phát hiện vùng bao phủ công thức `_find_math_span_at` bằng biểu thức chính quy đa dòng `re.DOTALL`. Trong hàm `_find_clean_boundary`, nếu vị trí cắt dự kiến rơi vào bên trong một khối công thức toán học, hệ thống ưu tiên mở rộng để lấy trọn vẹn khối công thức nếu còn trong cửa sổ cho phép, hoặc chủ động ngắt ngay trước khi công thức bắt đầu để đẩy toàn bộ khối công thức sang chunk tiếp theo mà không làm mất tính toàn vẹn ngữ nghĩa.

### 2.2. Khó khăn 2: Nguy cơ xử lý trùng lặp giao dịch (Double Activation) do Webhook Retry
- **Mô tả vấn đề:** Các cổng thanh toán (PayOS, SePay) và Open Banking thường áp dụng cơ chế tự động gửi lại webhook (Retry Callback) nếu đường truyền bị nghẽn mạng hoặc hệ thống chưa kịp phản hồi HTTP 200 trong 3 giây. Điều này dẫn đến rủi ro cùng một đơn hàng được duyệt kích hoạt 2 lần, làm sai lệch doanh thu và hạn mức tài nguyên.
- **Giải pháp:** Thiết lập cơ chế bảo vệ Idempotency chuyên dụng. Bổ sung bảng cơ sở dữ liệu `webhook_idempotency_logs` lưu trữ `idempotency_key` (trích xuất từ `X-Idempotency-Key` header hoặc `referenceCode`/`orderCode`). Trước khi xử lý bất kỳ giao dịch nào, hệ thống kiểm tra bảng này; nếu mã đã tồn tại, lập tức trả về phản hồi thành công kèm cờ `isIdempotentDuplicate: True` mà không thực hiện lại thao tác cộng tiền, triệt tiêu 100% rủi ro trùng lặp.

### 2.3. Khó khăn 3: Độ trễ và áp lực đọc I/O cơ sở dữ liệu khi truy vấn Analytics nặng
- **Mô tả vấn đề:** Trên Admin Portal, các endpoint thống kê phân bổ Bloom (`/analytics/bloom-distribution`) và tổng hợp hoạt động 360 độ người dùng (`/users/activity-summary`) phải thực hiện quét gom nhóm và join trên hàng nghìn bản ghi câu hỏi và người dùng. Khi nhiều Admin cùng mở dashboard, thao tác đọc gây khóa bảng (table lock) trên SQLite cục bộ.
- **Giải pháp:** Triển khai lớp bộ nhớ đệm In-Memory TTL Cache an toàn đa luồng (`_ANALYTICS_CACHE` và `threading.Lock`) với thời gian sống (TTL) 30 giây. Khi có yêu cầu, hệ thống kiểm tra bộ nhớ đệm và phản hồi tức thì với độ trễ < 1ms (`cached: True`), giảm trên 90% tần suất truy vấn trực tiếp vào ổ đĩa.

---

## 3. Minh chứng Git kèm 2 ảnh minh chứng

### 3.1. Thông tin Commit Git & Liên kết Remote
- **Nhánh Git (Branch):** `feature/upload-from-nguyentann-20261030`
- **Mã Commit (Commit Hash):** `fde471351e978c2046883a897c485f75efc52096` (Short: `fde4713`)
- **Tác giả (Author):** Nguyễn Văn Tân (`VanTan080405@users.noreply.github.com` - MSSV: 060205012615)
- **Thời gian commit:** 17/11/2026 10:44:48 +07:00
- **Nội dung commit:** `[SCRUM-99] feat: nang cap toan dien 4 backend services (admin, payment, document, rag), tich hop latex chunker, hybrid search, webhook idempotency va in-memory ttl cache`
- **Kho lưu trữ GitHub (Remote URL):** [Commit fde4713 trên GitHub](https://github.com/HoAnhVu05/quizgen-ai/commit/fde471351e978c2046883a897c485f75efc52096)
- **Thống kê tệp thay đổi:** 13 files changed, 940 insertions(+), 30 deletions(-).

### 3.2. Ảnh minh chứng kiến trúc và kết quả kiểm thử thực tế

![Kiến trúc 4 Services Backend SCRUM-99](./kien_truc_4_services_backend_17112026.png)  
*Hình 1: Kiến trúc nâng cấp 4 Services Backend (Admin, Payment, Document, RAG) [SCRUM-99].*

![Minh chứng Kiểm thử Tự động SCRUM-99](./minh_chung_kiem_thu_17112026.png)  
*Hình 2: Kết quả thực thi tập lệnh kiểm thử tự động 4 Backend Services [SCRUM-99] đạt 7/7 PASS (100%).*
