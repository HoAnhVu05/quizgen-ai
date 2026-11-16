# BÁO CÁO TIẾN ĐỘ CÔNG VIỆC, KHÓ KHĂN VÀ GIẢI PHÁP
**Họ và tên sinh viên:** Ngô Phạm Công Đức  
**Mã số sinh viên (MSSV):** 052205015692  
**Nhóm thực hiện:** Nhóm 1 - Dự án QuizGen AI  
**Vai trò phụ trách:** Phát triển Backend Exam Service, Tích hợp Khảo thí & Xuất bản Chuẩn hóa  
**Thời gian thực hiện:** Ngày 11/11/2026  
**Jira Issue liên quan:** SCRUM-72 (Tiếp nối SCRUM-56, SCRUM-66, SCRUM-70)

---

### I. CÁC CÔNG VIỆC ĐÃ HOÀN THÀNH TRONG NGÀY

**1. Đồng bộ và hợp nhất mã nguồn toàn diện từ Remote:**
- Tiến hành kiểm tra và kéo toàn bộ cập nhật mới nhất từ nhánh `origin/feature/upload-from-nguyentann-20261030` vào nhánh làm việc `feature/exam-service`.
- Hợp nhất thành công các tính năng quan trọng: cơ chế trích xuất chương mục thực tế từ tài liệu giáo trình (SCRUM-66), bộ lọc Header/Footer lặp và bảng biểu Markdown trong Document Service, kết hợp thuật toán tái xếp hạng đa dạng MMR (Maximal Marginal Relevance) Diversity Re-ranking cho RAG Service (SCRUM-70).
- Xử lý tương thích đường dẫn import với `pkgutil.extend_path` giúp các kịch bản kiểm thử tích hợp chéo giữa các microservices chạy thông suốt 100%.

**2. Xóa bỏ triệt để dữ liệu ảo (Mock Data) tại mục Ngân hàng đề thi (SCRUM-72):**
- Thanh lọc hoàn toàn các option tĩnh giả lập ở phần "Giáo trình nguồn" (loại bỏ các dữ liệu mẫu như: "Tất cả giáo trình (12)", "Kinh tế vi mô 2025", "Nguyên lý kế toán").
- Xây dựng cơ chế nạp động dữ liệu giáo trình thực tế: kết hợp dữ liệu trả về từ Document Service API (`/api/v1/documents/documents`), kho tài liệu người dùng tải lên và quét trực tiếp các đầu sách gắn với câu hỏi đã được thẩm định trong CSDL.
- Bổ sung bộ lọc động theo từng cuốn giáo trình thực tế, tự động đồng bộ tên môn học / tiêu đề đề thi trong cấu hình khảo thí và hiển thị biểu tượng giáo trình nguồn (`BookOpen`) ngay trên từng hàng câu hỏi của bảng ngân hàng đề.

**3. Khắc phục triệt để lỗi thiếu Phiếu trả lời trắc nghiệm chuẩn OMR khi xuất bản file Word (.docx):**
- Phân tích và phát hiện khiếm khuyết: khi xuất đề thi dưới dạng PDF thì có Phiếu trả lời trắc nghiệm OMR 50 câu chuẩn thi đại học ở trang cuối, nhưng khi xuất bản Word (.docx) thì tính năng này chưa được hiện thực hóa.
- Lập trình bổ sung mô-đun vẽ phiếu `draw_omr_50_sheet()` và xuất phiếu rời `generate_omr_50_docx()` vào bộ máy `WordExamExporter` bằng `python-docx`:
  + Thiết kế phần Header 2 cột cân đối: Tên trường/khoa, Hội đồng Khảo thí & Bảo đảm chất lượng, Mã đề thi.
  + Tiêu đề nổi bật: PHIẾU TRẢ LỜI TRẮC NGHIỆM CHUẨN 50 CÂU THI ĐẠI HỌC VÀ KHẢO THÍ CHUẨN HÓA.
  + Khung thông tin cá nhân thí sinh (Họ tên, Ngày sinh, Giới tính, Phòng thi, Môn thi, Chữ ký giám thị 1 & 2).
  + Khung Số báo danh (6 ô số kèm lưới tô số 0-9) và khung Mã đề thi (3 ô số).
  + Khung hướng dẫn tô chì 2B và quy chuẩn ô đúng / ô sai.
  + Lưới 50 câu trắc nghiệm đối xứng chia 2 cột lớn (Câu 01–25 và Câu 26–50), mỗi câu có 4 phương án lựa chọn `[ A ] [ B ] [ C ] [ D ]` được căn chỉnh theo chuẩn Table Grid vừa khít trang A4.
- Kích hoạt mặc định `include_omr_sheet=True` cho toàn bộ các endpoint xuất Word, gói nén Trọn bộ Khảo thí (Bundle ZIP) và giao diện xuất bản trên Frontend.

**4. Cập nhật Khóa API AI mới và khởi chạy toàn bộ hệ thống:**
- Cấu hình khóa API Gemini mới do người dùng cung cấp vào tệp môi trường `.env`.
- Cấu hình nạp chứng chỉ SSL gốc `certifi` cho `start_backend.py` và `generator.py`, đảm bảo kết nối gRPC/Google GenAI không bị chặn trên Windows.
- Khởi chạy và kiểm tra sức khỏe thành công 7/7 services: Frontend (port 3000), API Gateway (port 8000), Auth (8001), Document (8002), RAG (8003), AI (8004), Exam (8005) đều đạt phản hồi `HTTP 200 OK`.
- Đẩy toàn bộ mã nguồn sạch lên 2 nhánh Git remote: `origin/feature/exam-service` và `origin/feature/SCRUM-72`.

---

### II. KHÓ KHĂN GẶP PHẢI VÀ GIẢI PHÁP XỬ LÝ

**1. Khó khăn về xung đột cấu trúc gói import (Namespace Collision) sau khi gộp mã nguồn:**
- *Vấn đề:* Khi hợp nhất mã nguồn mới từ đồng đội, cả Document Service và RAG Service đều có thư mục gói `src/` và chứa tệp `__init__.py`. Khi thực thi test script chung, Python 3 chỉ nhận thư mục `src` đầu tiên trong `sys.path`, dẫn đến lỗi `ModuleNotFoundError: No module named 'src.chunker'`.
- *Giải pháp:* Khai báo `pkgutil.extend_path(__path__, __name__)` bên trong tệp `__init__.py` của cả hai microservice, biến `src` thành gói mở rộng chia sẻ chung, giúp môi trường kiểm thử và ứng dụng import chéo các hàm mà không hề phát sinh lỗi.

**2. Khó khăn trong việc định dạng Phiếu OMR trắc nghiệm phức tạp trên Microsoft Word:**
- *Vấn đề:* Thư viện `python-docx` không hỗ trợ vẽ canvas tọa độ tuyệt đối (Pixel/Millimeter) như `fpdf2` hay `reportlab`. Nếu thiết kế thủ công, các khung thông tin, số báo danh và 50 câu hỏi trắc nghiệm sẽ bị tràn sang trang thứ 2, làm vỡ chuẩn thể thức 1 trang của phiếu OMR khảo thí.
- *Giải pháp:* Tối ưu hóa cấu trúc bằng mô hình bảng lồng nhau (Nested Table Grid), tính toán chính xác độ rộng từng cột (4.3 inch cho thông tin thí sinh, 2.7 inch cho SBD & mã đề), chia đều lưới 50 câu thành 2 cụm cột (10 cột con) với khoảng cách đệm `space_before` và `space_after` dưới 1pt. Kết quả phiếu OMR trong file Word hiển thị cân đối, sắc nét và trọn vẹn trong 1 trang duy nhất.

**3. Khó khăn về lỗi chứng chỉ SSL Certificate Verify Failed của gRPC trên Windows:**
- *Vấn đề:* Khi khởi động AI Service kết nối với API Key mới, thư viện `google.generativeai` ngầm chạy qua kênh gRPC và báo lỗi `CERTIFICATE_VERIFY_FAILED: unable to get local issuer certificate` do Windows Python không tự động trỏ đến tệp chứng chỉ CA Bundle mặc định của hệ thống.
- *Giải pháp:* Sử dụng thư viện `certifi` tích hợp sẵn trong Python, tự động lấy đường dẫn tệp `cacert.pem` qua `certifi.where()` và gán trực tiếp vào các biến môi trường hệ thống `GRPC_DEFAULT_SSL_ROOTS_FILE_PATH`, `SSL_CERT_FILE` và `REQUESTS_CA_BUNDLE` ngay trước khi nạp module gRPC. Sau khi cấu hình, AI Service kết nối thành công ngay lập tức.

---

### III. KẾT QUẢ KIỂM THỬ VÀ ĐÁNH GIÁ TIẾN ĐỘ
- **Kiểm thử SCRUM-70 (Document & RAG Service):** 5/5 kịch bản ĐẠT 100% (Thời gian phản hồi SLA đạt 26.9ms < 200ms).
- **Kiểm thử SCRUM-56 & SCRUM-72 (Exam Service full):** 8/8 bài kiểm thử ĐẠT 100% (Sinh 4 mã đề hoán vị Fisher-Yates, xuất Word kèm OMR, xuất PDF kèm OMR, đóng gói QTI LMS, xuất Bundle ZIP 15 tài liệu).
- **Kiểm thử giao diện Frontend:** Lệnh `npm run build` đạt 0 lỗi TypeScript, chuyển đổi 2053 modules thành công.
- **Tình trạng mã nguồn:** Đã commit và đẩy đầy đủ lên nhánh `feature/exam-service` và `feature/SCRUM-72` trên GitHub. Working tree hoàn toàn sạch sẽ.
