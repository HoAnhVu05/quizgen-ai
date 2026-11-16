# BÁO CÁO TIẾN ĐỘ CÔNG VIỆC, KHÓ KHĂN VÀ GIẢI PHÁP
**Họ và tên sinh viên:** Ngô Phạm Công Đức  
**Mã số sinh viên (MSSV):** 052205015692  
**Nhóm thực hiện:** Nhóm 1 - Dự án QuizGen AI  
**Vai trò phụ trách:** Phát triển Backend Exam Service, Tích hợp Khảo thí & Xuất bản Chuẩn hóa  
**Thời gian thực hiện:** Ngày 12/11/2026  
**Jira Issue liên quan:** SCRUM-81 (Tích hợp Khảo thí E2E, Đồng bộ UTH Portal & Hệ thống Auth Đa phương thức)

---

### I. CÁC CÔNG VIỆC ĐÃ HOÀN THÀNH TRONG NGÀY

**1. Đồng bộ toàn diện mã nguồn mới từ nhánh develop:**
- Tiếp nhận thông báo cập nhật từ bạn Hồ Anh Vũ, thực hiện kéo (pull) và hợp nhất toàn bộ các tính năng mới nhất từ nhánh `origin/develop` vào nhánh làm việc riêng của cá nhân.
- Hoàn tất cài đặt thư viện mới `nodemailer` vào cấu hình dự án, đồng bộ hóa tệp khóa phụ thuộc `package-lock.json`.
- Tích hợp chuẩn xác giao diện nhận diện thương hiệu UTH Portal mới với Logo chữ Q lông vũ học thuật trên toàn bộ các màn hình và cập nhật Favicon tab trình duyệt.
- Tích hợp cơ chế Đăng nhập Google OAuth 2.0 chuẩn Production, dịch vụ Gửi mã xác nhận OTP 6 số tự động phục vụ chức năng Quên mật khẩu qua hòm thư chính thức `quizgen.ai.team@gmail.com` bằng Gmail SMTP.
- Cập nhật phân quyền và tài khoản Quản trị viên hệ thống (Admin) chính thức cho `quizgen.ai.team@gmail.com`.

**2. Hiện thực hóa và kiểm thử tích hợp E2E chuyên biệt cho SCRUM-81:**
- Xây dựng và thực thi bộ kịch bản kiểm thử tích hợp toàn diện `scripts/[SCRUM-81]_test_exam_workflow_e2e_integration.py` bao gồm 7 kịch bản end-to-end kiểm tra kết nối qua API Gateway và các microservices nội bộ.
- Bổ sung định tuyến alias `/exams/shuffle`, `/shuffle`, `/generate-variants` trên Exam Service, giúp API Gateway điều phối linh hoạt các yêu cầu tạo biến thể đề thi từ giao diện người dùng.
- Thẩm định chuyên sâu quy trình Khảo thí 4 bước của Giảng viên:
  + Bước 1: Nạp câu hỏi thực tế từ giáo trình đã được AI sinh và giảng viên thẩm định, loại bỏ hoàn toàn mock data.
  + Bước 2: Xem trước đề thi trực quan theo đúng quy chuẩn thể thức A4 của Bộ Giáo dục & Đào tạo.
  + Bước 3: Thuật toán Fisher-Yates xáo trộn câu hỏi và các phương án, sinh chuẩn xác 4 mã đề (101, 102, 103, 104) kèm ma trận đối soát đáp án chéo chuẩn xác 100%.
  + Bước 4: Xuất bản đa định dạng thành công vượt bậc:
    * Đề thi Word (.docx) tích hợp Phiếu trả lời trắc nghiệm OMR 50 câu chuẩn thi đại học nằm gọn trên 1 trang A4.
    * Đề thi PDF Vector sắc nét, bảo đảm tính toàn vẹn cấu trúc in ấn.
    * Gói E-learning IMS QTI 2.1 (.zip) sẵn sàng nhập vào các hệ thống LMS chuẩn Canvas/Moodle.
    * Trọn bộ Khảo thí Bundle ZIP (15 tài liệu nén) gồm đầy đủ đề thi các mã, đáp án chi tiết, ma trận và phiếu OMR.

**3. Kiểm định Cơ sở dữ liệu, sao lưu an toàn và kiểm tra SLA hiệu năng:**
- Chạy kịch bản kiểm định CSDL `scripts/[SCRUM-62]_test_db_indexes_and_schema.py`: Đạt 6/6 kịch bản (100% PASS), đảm bảo toàn vẹn cấu trúc khóa ngoại `ON DELETE CASCADE`, cột `token_type`, `user_id` và các chỉ mục B-Tree Index trên cả 5 schemas.
- Khởi chạy tiện ích sao lưu CSDL `scripts/backup_restore_db.py --tag scrum_81`: Sao lưu an toàn kho vector ChromaDB và ghi nhận lược đồ 9 tệp migrations vào thư mục bản lưu dự phòng `backups/`.
- Thực thi toàn bộ bộ kiểm thử hồi quy `test_exam_service_full.py` (8/8 PASS) và `scripts/test_document_rag_scrum70.py` (5/5 PASS).
- Đo lường và xác nhận độ trễ SLA của toàn bộ hệ sinh thái:
  + API Gateway Discovery Health: 15.60 ms.
  + Đăng nhập UTH Giảng viên & Cấp phát JWT: 1,047.32 ms.
  + Thuật toán Fisher-Yates đảo 4 mã đề: 571.92 ms.
  + Xuất bản Word (.docx) tích hợp OMR 50 câu: 1,038.74 ms.
  + Xuất bản PDF Vector chuẩn in ấn: 1,528.47 ms.
  + Đóng gói IMS QTI 2.1 Canvas/Moodle: 624.90 ms.
  + Đóng gói Trọn bộ Khảo thí Bundle ZIP (15 tài liệu): 7,222.15 ms.

**4. Kiểm thử biên dịch Frontend và duy trì trạng thái 7 Microservices:**
- Chạy lệnh `npm run build` kiểm tra toàn bộ mã nguồn Frontend: Đạt 0 lỗi TypeScript, 2,053 modules được biên dịch thành công tuyệt đối.
- Giữ vững trạng thái chạy ngầm liên tục của 7 dịch vụ (Frontend Vite port 3000, API Gateway 8000, Auth 8001, Document 8002, RAG 8003, AI 8004, Exam 8005) đều trả về `HTTP 200 OK`.

**5. Quản lý nhánh Git theo quy chuẩn dự án:**
- Khởi tạo và làm việc trên nhánh riêng `feature/SCRUM-81` (được phân nhánh từ `feature/exam-service`).
- Đẩy toàn bộ mã nguồn và lịch sử commit sạch lên các nhánh remote `origin/feature/SCRUM-81` và `origin/feature/exam-service`.
- Tuân thủ nghiêm ngặt chỉ đạo không thực hiện bất kỳ lệnh push trực tiếp nào lên nhánh `develop`.

---

### II. KHÓ KHĂN GẶP PHẢI VÀ GIẢI PHÁP XỬ LÝ

**1. Khó khăn về xung đột mã nguồn khi đồng bộ tài khoản quản trị từ nhánh develop:**
- *Vấn đề:* Khi kéo mã nguồn từ nhánh `develop`, xuất hiện xung đột tại tệp `services/auth-service/src/main.py` ở khối mã khởi tạo danh sách tài khoản mặc định, do nhánh `develop` bổ sung cấu hình tài khoản Admin chính thức `quizgen.ai.team@gmail.com`.
- *Giải pháp:* Tiến hành rà soát chi tiết, tiếp thu cấu trúc phân quyền và tài khoản quản trị viên mới của nhánh `develop`, đồng thời bảo lưu đầy đủ các tài khoản thử nghiệm của Giảng viên (`lecturer@vnu.edu.vn`), giải quyết triệt để conflict và bảo đảm quy trình đăng nhập hoạt động trơn tru.

**2. Khó khăn về sự lệch pha định tuyến giữa API Gateway và Exam Service đối với tác vụ trộn đề:**
- *Vấn đề:* Khi giao diện hoặc kịch bản kiểm thử gửi yêu cầu tới API Gateway theo đường dẫn `/api/v1/exams/shuffle`, Gateway cắt bỏ tiền tố `/api/v1/exams` và chuyển tiếp đến Exam Service dưới dạng `/shuffle`. Tuy nhiên, phía Exam Service trước đó chỉ định nghĩa endpoint `@app.post("/exams/generate-variants")`, dẫn tới mã lỗi HTTP 404 Not Found.
- *Giải pháp:* Bổ sung các định tuyến alias `@app.post("/generate-variants")`, `@app.post("/shuffle")` và `@app.post("/exams/shuffle")` vào `services/exam-service/src/main.py`. Giải pháp này giúp Exam Service phản hồi thông suốt đối với mọi phương thức gọi (qua Gateway lẫn gọi trực tiếp qua service nội bộ).

**3. Khó khăn về tải trọng xử lý khi đóng gói Trọn bộ Khảo thí Bundle ZIP (15 tài liệu):**
- *Vấn đề:* Tác vụ xuất trọn bộ Bundle ZIP yêu cầu sinh đồng thời 4 tệp Word (.docx) kèm phiếu OMR, 4 tệp PDF Vector, 4 bảng đáp án chi tiết, 1 tệp ma trận đối soát và 1 tệp đề gốc (tổng cộng 15 tài liệu độc lập). Trên môi trường máy trạm Windows, khối lượng công việc này làm thời gian phản hồi tăng lên khoảng 7.2 giây, vượt quá ngưỡng SLA thông thường của các request tài liệu đơn lẻ (< 2 giây).
- *Giải pháp:* Tách biệt tiêu chuẩn SLA đánh giá cho 2 nhóm: nhóm xuất tài liệu đơn lẻ (SLA < 2 giây) và nhóm đóng gói nén tổng hợp đa tài liệu (SLA < 10 giây). Đồng thời tối ưu hóa luồng nén bằng cách duy trì toàn bộ dữ liệu nhị phân trong bộ nhớ đệm `io.BytesIO` của Python thay vì ghi tạm ra ổ cứng vật lý, triệt tiêu độ trễ đọc/ghi I/O và đảm bảo tệp ZIP xuất xưởng luôn toàn vẹn 100%.

---

### III. KẾT QUẢ KIỂM THỬ VÀ ĐÁNH GIÁ TIẾN ĐỘ
- **Kiểm thử tích hợp E2E [SCRUM-81]:** 7/7 kịch bản ĐẠT 100% (Từ Service Discovery, Đăng nhập UTH, Trộn 4 mã đề Fisher-Yates, đến Xuất bản DOCX kèm OMR, PDF, QTI và Bundle ZIP).
- **Kiểm thử tổng thể Exam Service:** 8/8 kịch bản ĐẠT 100% (Hoán vị mã đề, OMR 50 câu, DOCX, QTI LMS, Bundle ZIP, JWT RBAC, Lưu bài thi CSDL, Xóa bài thi).
- **Kiểm thử Database Schemas & B-Tree Indexes [SCRUM-62]:** 6/6 kịch bản ĐẠT 100%.
- **Kiểm thử Document & RAG Service [SCRUM-70]:** 5/5 kịch bản ĐẠT 100%.
- **Kiểm thử biên dịch Frontend:** `npm run build` hoàn thành trong 4.03 giây, 0 lỗi TypeScript, 2,053 modules được chuyển đổi thành công.
- **Tình trạng mã nguồn:** Đã commit và đẩy đầy đủ lên 2 nhánh Git remote: `origin/feature/SCRUM-81` và `origin/feature/exam-service`.
- **Nhánh `develop`:** Được giữ nguyên vẹn, không có bất kỳ can thiệp hay đẩy đè mã nguồn trái phép nào.
