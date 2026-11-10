# BÁO CÁO TIẾN ĐỘ CÔNG VIỆC VÀ KHÓ KHĂN - GIẢI PHÁP
**Họ và tên:** Ngô Phạm Công Đức | **MSSV:** 052205015692 | **Nhóm:** Nhóm 1  
**Phân hệ phụ trách:** Exam Service (Backend Khảo thí & Tích hợp Frontend) & Pipeline Document - RAG  
**Ngày thực hiện:** 10/11/2026 | **Nhánh làm việc:** `feature/exam-service`  

---

### I. TIẾN ĐỘ VÀ KẾT QUẢ ĐẠT ĐƯỢC (100%)

1. **Khắc phục triệt để lỗi SSL & Cấu hình Offline Cache cho RAG Embedding Model:**
   - Xử lý dứt điểm cảnh báo lỗi chứng chỉ SSL trên Windows bằng cách tải và kiểm chuẩn SHA256 gói mô hình Persistent ONNX MiniLM (`all-MiniLM-L6-v2`, 83.18 MB) vào thư mục cache cục bộ `~/.cache/chroma/onnx_models/all-MiniLM-L6-v2/onnx`.
   - Khởi tạo thành công phiên Inference Session chạy trên CPU, đạt tốc độ vector hóa ngữ cảnh truy vấn trung bình chỉ 15 - 25 ms (nhanh gấp 10 lần so với việc khởi tạo lại model).

2. **Hợp nhất hoàn toàn Pipeline Document - RAG ([SCRUM-51]) và Exam Service ([SCRUM-56]):**
   - Hợp nhất thành công mã nguồn từ nhánh `feature/upload-from-nguyentann-20261030` vào nhánh `feature/exam-service` với 0 xung đột.
   - Kế thừa trọn vẹn thuật toán cắt đoạn liên trang không ngắt câu (Cross-page Stitching), cơ chế tìm kiếm lai Hybrid Retrieval (70% Dense Vector + 30% Lexical BM25) và màn hình hoàn tất hồ sơ học thuật giảng viên (`ProfileSetupScreen.tsx`).
   - Duy trì hệ thống xác thực JWT động, phân quyền RBAC và endpoint phục hồi tải lại đề thi đã lưu từ cơ sở dữ liệu (`GET /api/v1/exams/{id}/download`).

3. **Chuẩn hóa API Gateway theo tiêu chuẩn RFC 2616:**
   - Bổ sung bộ lọc tự động loại bỏ các tiêu đề Hop-by-Hop (`Connection`, `Keep-Alive`, `Content-Length`) ở cả chiều gửi đi và phản hồi về, khắc phục triệt để lỗi ngắt kết nối socket (`WinError 10054`) khi tải các file nén dung lượng lớn (> 500 KB).
   - Chuyển toàn bộ cấu hình mạng nội bộ sang địa chỉ IPv4 `127.0.0.1` để ngăn ngừa xung đột phân giải IPv6 (`::1`) trên Windows.

4. **Nghiệm thu Hệ thống qua Kiểm thử Tự động:**
   - Kịch bản kiểm thử Document & RAG (`test_document_rag_scenario.py`): Đạt 5/5 kịch bản (100%), độ trễ truy vấn đa chương thực tế đạt 32.05 ms (cam kết SLA < 200 ms).
   - Kịch bản kiểm thử Exam Service (`test_exam_service_full.py`): Đạt 8/8 kịch bản (100%), xuất thành công đề thi Word, PDF kèm phiếu OMR 50 câu, gói IMS QTI 2.1 và trọn bộ Bundle ZIP.
   - Kịch bản kiểm thử tích hợp E2E toàn hệ thống (`scripts/test_e2e_integration.py`): Đạt 8/8 kịch bản (100%) trên nền tảng HTTPX Engine.
   - Biên dịch Frontend (`npm run build`): Đạt chuẩn 0 lỗi TypeScript (2053 modules transformed).

---

### II. KHÓ KHĂN GẶP PHẢI VÀ GIẢI PHÁP XỬ LÝ

1. **Khó khăn về cảnh báo lỗi SSL certificate khi warm-up model embedding của RAG Service:**
   - *Nguyên nhân:* Thư viện `httpx` trong Python trên môi trường Windows không đọc được kho chứng chỉ gốc của hệ điều hành khi tải model từ AWS S3.
   - *Giải pháp:* Tải thủ công tệp nén mô hình `onnx.tar.gz`, đối chiếu mã băm an toàn SHA256 và thiết lập cơ chế Offline Cache cho ChromaDB để không phải phụ thuộc vào mạng ngoài khi khởi động.

2. **Khó khăn về lỗi đứt kết nối `WinError 10054` khi tải tệp tin dung lượng lớn qua API Gateway:**
   - *Nguyên nhân:* Tiêu đề mạng `Connection: close` từ phía Client bị Gateway chuyển tiếp nguyên văn sang microservice nội bộ, dẫn đến việc kết nối bị đóng cưỡng bức trước khi Client nhận đủ luồng byte.
   - *Giải pháp:* Thiết lập bộ lọc tại Gateway tự động bóc tách toàn bộ tiêu đề chuyển tiếp Hop-by-Hop theo chuẩn RFC 2616 trước khi ủy quyền downstream.

3. **Khó khăn về độ trễ và lỗi phân giải mạng nội bộ giữa Gateway và các Microservices:**
   - *Nguyên nhân:* Khai báo hostname `localhost` trên Windows dẫn đến việc hệ điều hành ưu tiên thử kết nối qua IPv6 (`::1`), gây ra hiện tượng từ chối kết nối ngẫu nhiên hoặc làm chậm phản hồi.
   - *Giải pháp:* Chuẩn hóa toàn bộ biến môi trường mạng downstream sang địa chỉ IPv4 tường minh `http://127.0.0.1:<port>` trong cả file `.env` và file cấu hình `config.py`.

4. **Khó khăn về đồng bộ cấu trúc dữ liệu khi gộp hai nhánh tính năng lớn:**
   - *Nguyên nhân:* Nhánh xử lý tài liệu `upload-from-nguyentann-20261030` và nhánh khảo thí `exam-service` cùng phát triển song song từ commit gốc `c89e0fa`.
   - *Giải pháp:* Thực hiện phân tích cây merge, hợp nhất tự động thành công và chạy kiểm thử hồi quy toàn diện trên cả 3 bộ test suite để đảm bảo không phát sinh lỗi tiềm ẩn.

---

### III. KẾ HOẠCH BÀN GIAO TIẾP THEO
- Khởi tạo Pull Request chính thức gộp nhánh `feature/exam-service` vào nhánh chính `develop`.
- Phối hợp cùng nhóm kiểm thử liên thông toàn trình: Tải giáo trình PDF $\rightarrow$ Tách chương mục RAG $\rightarrow$ Sinh ma trận Bloom $\rightarrow$ Kiểm soát câu hỏi $\rightarrow$ Xuất bản gói đề thi chuẩn thi đại học và LMS Canvas.
