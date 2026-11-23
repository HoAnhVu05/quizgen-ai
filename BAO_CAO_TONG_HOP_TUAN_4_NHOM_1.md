# TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM (UTH)
### VIỆN CÔNG NGHỆ THÔNG TIN VÀ CHUYỂN ĐỔI SỐ
**HỌC PHẦN: HỌC KỲ DOANH NGHIỆP – HỌC KỲ 1, NĂM HỌC 2026 – 2027**

---

# BÁO CÁO TỔNG HỢP CÔNG VIỆC TUẦN 4
### Dự án nhóm: Nền tảng Biên soạn & Quản lý Đề thi Thông minh theo Chuẩn đầu ra QuizGen AI & Mở rộng Odoo ERP
*(Giai đoạn: Nước rút Sprint 4 – Từ Thứ Bảy 14/11/2026 đến Thứ Sáu 20/11/2026)*

| Thông tin | Nội dung chi tiết |
| :--- | :--- |
| **Đơn vị đào tạo:** | Trường Đại học Giao thông vận tải TP.HCM (UTH) – Viện CNTT&CĐS |
| **Tên dự án nhóm:** | QuizGen AI – Nền tảng Biên soạn & Quản lý Đề thi Thông minh theo Chuẩn đầu ra (RAG/AI) |
| **Nhóm thực hiện:** | Nhóm 1 (Học kỳ Doanh nghiệp HK1/2026 – 2027) |
| **Trưởng nhóm (Leader):** | Hồ Anh Vũ (MSSV: 060205013608) – Kỹ sư Trưởng kiêm Điều phối Kỹ thuật |
| **Thành viên nhóm:** | Bích Đặng Bảo Hân, Huỳnh Hồ Hiệu Hiệu, Nguyễn Đức Cường, Ngô Phạm Công Đức, Nguyễn Văn Tân |
| **Thời gian thực hiện:** | Tuần 4 (Từ Thứ Bảy 14/11/2026 đến Thứ Sáu 20/11/2026) – Ngày lập: 21/11/2026 |
| **Tiến độ lũy kế dự án:** | **96 / 100 điểm** (Đạt 96% khối lượng toàn bộ dự án – Sẵn sàng bước vào nghiệm thu) |
| **Môi trường vận hành:** | Production: [https://quizgenai.hoanhvu.id.vn](https://quizgenai.hoanhvu.id.vn) (Cloudflare Tunnel + 6 Microservices) |

---

## I. TÓM TẮT TÌNH HÌNH THỰC HIỆN TUẦN 4

- **Tổng quan tiến độ Sprint 4:** Trong khuôn khổ Tuần 4 (14/11/2026 – 20/11/2026), Nhóm 1 đã hoàn thành xuất sắc và toàn diện 100% khối lượng công việc được giao thuộc Sprint 4 của dự án QuizGen AI. Đây là tuần nước rút bản lề tập trung giải cứu hiệu năng cơ sở dữ liệu, phân rã kiến trúc monolith, tích hợp các tính năng cộng tác đa phương tiện hiện đại (WebRTC Voice Huddle, Web Audio tone synthesizer, Apple QuickLook, SheetJS Excel Viewer, Admin Face ID) và thực hiện chiến dịch kiểm thử UAT đa thiết bị trên môi trường Production.
- **Tiến độ tích lũy toàn dự án:** **Đạt 96 / 100 điểm** (tương ứng 96% tổng khối lượng công việc toàn dự án). Toàn bộ 6 microservices cốt lõi, API Gateway, hệ thống xác thực Google OAuth 2.0 / OTP / Face ID, quy trình sinh đề AI 4 bước chuẩn ma trận Bloom, thuật toán đảo 4 mã đề Fisher-Yates, xuất bản Word A4 & OMR 50 câu, và không gian hội nhóm Q-Group đã hoạt động trơn tru với độ trễ trung bình 5.7ms.
- **Thời gian dự kiến hoàn thành:** Còn đúng 1 tuần làm việc (Tuần 5: Từ 21/11 đến 28/11/2026). Trọng tâm Tuần 5 là xử lý dứt điểm các lỗi phát hiện qua đợt kiểm thử UAT, tối ưu hóa giao diện di động theo danh mục 37 lỗi UX/UI của QA, đóng gói mã nguồn và hoàn tất Hồ sơ Báo cáo Nghiệm thu Tổng kết HKDN.
- **Trọng tâm công nghệ:** Giải cứu bộ nhớ CSDL `qgroups.json` giảm 99.95% (từ 66.4 MB xuống 34.2 KB); xây dựng hệ thống thoại nhóm trực tiếp WebRTC Voice Huddle kết hợp bộ tạo âm thanh chuông gọi Web Audio API thuần; nhúng trình đọc bảng tính Excel trực tiếp SheetJS; áp dụng nhận diện khuôn mặt Admin Face ID 3 góc độ; bóc tách hơn 3,200 dòng mã nguyên khối sang kiến trúc Component-based; và biên dịch Frontend đạt 2,144 modules với 0 lỗi TypeScript.
- **Đánh giá chung:** Toàn bộ 6/6 thành viên duy trì kỷ luật lao động nghiêm túc, tuân thủ nghiêm ngặt quy trình Git Branching, báo cáo tiến độ đúng thời hạn lên Google Drive. Dự án hoàn thành xuất sắc các chỉ tiêu Sprint 4, sẵn sàng cho công tác bảo vệ đồ án.

---

## II. CÔNG VIỆC DỰ ÁN NHÓM ĐÃ THỰC HIỆN TRONG TUẦN 4 (QUIZGEN AI & ODOO ERP)

### 2.1. Diễn biến công việc theo ngày trong tuần (14/11 – 20/11/2026)
- **Thứ Bảy (14/11/2026) – Chủ Nhật (15/11/2026) | Khởi động Sprint 4 & Lập Kế hoạch:** Trưởng nhóm chủ trì cuộc họp mở màn Sprint 4. Rà soát các điểm nghẽn hiệu năng sau đợt kiểm thử tải Sprint 3. Phân bổ User Stories nâng cấp 4 backend microservices (SCRUM-99) cho Tân, thiết kế view thống kê CSDL (SCRUM-94) cho Cường, hoàn thiện tài liệu SRS (SCRUM-105) cho Đức, và nghiên cứu tối ưu giao diện Overview/TopHeader cho Hiệu và Hân.
- **Thứ Hai (16/11/2026) | Nâng cấp 4 Backend Services & Giao diện Admin Overview:** Tân hoàn tất nâng cấp 4 backend microservices (Auth, Document, AI, Exam) với In-memory TTL Cache và sửa lỗi chunker.py; Cường xây dựng 7 database views thống kê cho Admin Portal; Hiệu và Hân tinh chỉnh giao diện Admin Overview và TopHeader theo chuẩn nhận diện UTH; Leader Vũ cấu hình Gateway Routing và CORS an toàn.
- **Thứ Ba (17/11/2026) | Nghiệm thu Báo cáo Đợt 1 Tuần 4 & Đo đạc Hiệu năng:** Toàn hệ thống vượt qua bộ test liên thông E2E đạt 100% PASS. Trưởng nhóm tiến hành nghiệm thu kỹ thuật, đối soát mã nguồn và nộp Báo cáo Tiến độ 3 ngày (14-17/11) lên Google Drive. Hệ thống Admin Portal và Microservices hoạt động liên tục không gián đoạn.
- **Thứ Tư (18/11/2026) | Phân tích Odoo ERP Doanh nghiệp & Diễn đàn Học thuật:** Nhóm tiếp nhận yêu cầu mở rộng từ Quản lý dự án: Cường và Đức khảo sát nghiệp vụ và các phân hệ Odoo ERP (POS, Inventory, Purchase, Invoicing, Employees) cho mô hình quản lý quán ăn; Hân và Hiệu hoàn thiện màn hình Diễn đàn Học thuật (ForumScreen) lưu trữ CSDL thật, hiển thị ảnh nguyên tỉ lệ và bộ lọc chuyên môn.
- **Thứ Năm (19/11/2026) | Giải cứu CSDL Q-Group (Giảm 99.95%) & Nâng cấp Đa phương tiện:** Leader Vũ điều tra và xử lý triệt để nguyên nhân gây lag/nóng máy thiết bị di động: bóc tách attachment khỏi CSDL `qgroups.json` sang ổ đĩa cứng vật lý (giảm từ 66.4 MB còn 34.2 KB); sửa lỗi thiếu thư viện UUID tại Document Service; tích hợp Tin nhắn thoại (Voice Message) phân tích sóng âm thực tế PCM Web Audio API; xây dựng bộ chọn biểu cảm Slack Emoji Picker 9 chuyên mục; thiết kế thẻ xem trước Apple QuickLook kính mờ. Trưởng nhóm nộp Báo cáo Ngày 19/11 lên Google Drive.
- **Thứ Sáu (20/11/2026) | WebRTC Voice Huddle, Admin Face ID, SheetJS Excel & UAT Đa thiết bị:** Leader Vũ hoàn thiện phân rã hơn 3,200 dòng Monolith Frontend; triển khai Thoại nhóm trực tiếp WebRTC Voice Huddle và nhạc chuông Web Audio API; xây dựng module sinh trắc học Admin Face ID 3 góc mặt; nhúng trình xem Excel SheetJS và custom hook usePinchZoom. Hân thực hiện UAT 3 thiết bị (iPhone 17 Pro Max, iPad Pro 12.9", Laptop) trên Production, lập danh mục 37 lỗi UX/UI. Hiệu kiểm thử toàn diện quy trình sinh đề AI 4 bước và thuật toán Fisher-Yates. Cường và Đức hoàn tất báo cáo Odoo ERP. Trưởng nhóm tổng hợp nghiệm thu Tuần 4.

### 2.2. Chi tiết các phân hệ kỹ thuật cốt lõi đã hoàn thành trong Tuần 4
1. **Hạ tầng Thoại nhóm WebRTC Huddle, Tối ưu CSDL & Phân rã Monolith (Hồ Anh Vũ - Leader):** Bóc tách đĩa cứng giảm 99.95% dung lượng CSDL; xây dựng WebRTC Voice Huddle đa điểm qua API Gateway; synthesizer chuông gọi Web Audio API thuần (440Hz – 880Hz) chống lỗi 404; xác thực sinh trắc học Admin Face ID 3 góc mặt chống ảnh 2D; tích hợp SheetJS Excel Preview; phân rã hơn 3,200 dòng Monolith sang thư mục component chuyên biệt.
2. **Kiểm thử Chấp nhận UAT Đa vai trò & Đa thiết bị (Bích Đặng Bảo Hân):** Kiểm thử trên 3 phần cứng thực tế (Laptop Windows 11 Chrome 131, iPhone 17 Pro Max Safari iOS 18, iPad Pro 12.9" Safari iPadOS 18); rà soát luồng Đăng nhập -> Dashboard -> ForumScreen; lập danh mục 37 lỗi/điểm nghẽn UX/UI kèm Action Plan 3 đợt.
3. **Kiểm thử Toàn diện Quy trình Sinh Đề Thi AI 4 Bước & Đóng gói Khảo thí (Huỳnh Hồ Hiệu Hiệu):** Rà soát 100% nút bấm, form nhập liệu và wizard 4 bước; thẩm định thuật toán Fisher-Yates (mã 101–104), xuất file Word .docx và phiếu tô OMR 50 câu chuẩn máy chấm; phát hiện lỗi endpoint cập nhật câu hỏi `PUT /api/v1/questions/{id}`.
4. **Khảo sát & Phân tích Nghiệp vụ Hệ thống Quản lý Doanh nghiệp Odoo ERP (Nguyễn Đức Cường & Ngô Phạm Công Đức):** Nghiên cứu Odoo Community vs Enterprise; khảo sát nghiệp vụ bán hàng, order, bếp, kho và kế toán quán ăn; lập bảng ánh xạ sang 5 phân hệ POS, Inventory, Purchase, Invoicing/Accounting và Employees.
5. **Tối ưu Hóa 4 Backend Microservices & API Gateway (Nguyễn Văn Tân):** Hoàn thành SCRUM-99 nâng cấp 4 microservices với In-memory TTL Cache; tối ưu trích xuất KaTeX và bảng biểu trong `chunker.py`; duy trì độ trễ toàn cụm ở mức 5.7ms.

### 2.3. Bảng tổng hợp các chỉ số SLA và hiệu năng toàn hệ sinh thái Tuần 4

| Chỉ số Kỹ thuật & Hiệu năng | Trước tối ưu (Tuần 3) | Hiện tại (Tuần 4) | Đánh giá mức cải thiện |
| :--- | :---: | :---: | :---: |
| **Dung lượng CSDL qgroups.json** | 66.4 MB (chứa base64) | **34.2 KB** (lưu đĩa cứng) | **Giảm 99.95% (Tuyệt đối)** |
| **Thời gian nạp phòng chat di động** | > 15.0 s (hoặc lỗi timeout) | **0.18 s** | **Nhanh hơn 83 lần** |
| **Độ trễ trung bình 6 Microservices** | 33 – 42 ms | **5.7 ms** | **Đạt chuẩn Optimal quốc tế** |
| **Thời gian đảo 4 mã đề Fisher-Yates** | 1,250 ms | **571.9 ms** | **Rút ngắn 54.2%** |
| **Tỷ lệ trích xuất đúng công thức LaTeX** | 85.2% | **99.6%** | **Bảo toàn hoàn hảo công thức** |
| **Độ chính xác đối soát đáp án trắc nghiệm** | 100% | **100%** | **Tuyệt đối chuẩn xác** |
| **Tỷ lệ biên dịch Frontend (tsc && vite)** | 0 Lỗi (2,073 mods) | **0 Lỗi (2,144 mods)** | **100% Type-safe trong 8.46s** |
| **Kết quả kiểm thử tự động hệ thống** | 10/10 PASS | **15/15 PASS** | **Tỷ lệ vượt qua đạt 100%** |

---

## III. NHIỆM VỤ MỞ RỘNG THEO YÊU CẦU DOANH NGHIỆP: ODOO ERP

### 3.1. So sánh hai phiên bản Odoo Community và Odoo Enterprise

| Tiêu chí so sánh | Odoo Community (Mã nguồn mở) | Odoo Enterprise (Thương mại trả phí) | Đánh giá lựa chọn cho dự án |
| :--- | :--- | :--- | :--- |
| **Chi phí bản quyền** | Miễn phí 100% mã nguồn mở LGPLv3 | Tính phí theo user/tháng ($12 – $24/user) | Community phù hợp trường học & quán ăn |
| **Khả năng tùy biến** | Toàn quyền truy cập và sửa mã Python | Hạn chế, phụ thuộc vào Odoo Studio | Community cho phép can thiệp sâu kiến trúc |
| **Phân hệ Bán hàng (POS)** | Đầy đủ nghiệp vụ bán hàng, order, in bill | Bổ sung quản lý chuỗi & loyalty points | Community đáp ứng 100% nhu cầu quán ăn |
| **Quản lý Kho & Mua hàng** | Đầy đủ nhập/xuất/tồn, kiểm kê, đơn mua NCC | Bổ sung dự báo tồn kho tự động nâng cao | Community hoàn toàn đáp ứng tốt |
| **Ứng dụng Di động** | Giao diện web responsive mượt mà | Có sẵn App Mobile Native iOS/Android | Web Responsive chạy mượt trên mọi thiết bị |
| **Triển khai Hạ tầng** | Tự triển khai trên VPS Linux / Docker | Chạy trên đám mây Odoo.sh / On-Premise | Community chạy tối ưu trên Docker nội bộ |

### 3.2. Mô hình chuyển đổi số quy trình quản lý quán ăn
- **1. Tiếp nhận và Phục vụ (POS):** Chọn bàn/mang đi; nhân viên phục vụ order trên màn hình cảm ứng POS; chuyển lệnh tự động vào bếp.
- **2. Chế biến Bếp (Kitchen Order):** Màn hình bếp hiển thị món cần làm thời gian thực; xác nhận xong để phục vụ bưng bê.
- **3. Thanh toán & Hóa đơn (POS & Invoicing):** Áp dụng giảm giá, in hóa đơn tạm tính và thanh toán tiền mặt/chuyển khoản QR.
- **4. Quản lý Nguyên liệu & Mua hàng (Inventory & Purchase):** Trừ kho nguyên liệu tự động theo định mức món (BOM); cảnh báo khi chạm ngưỡng tối thiểu để tạo đơn mua gửi NCC.
- **5. Báo cáo Doanh thu & Nhân sự (Accounting & Employees):** Thống kê doanh thu theo ca/ngày; quản lý ca kíp và phân quyền nhân viên.

---

## IV. PHÂN CÔNG VÀ ĐÁNH GIÁ THÀNH VIÊN TUẦN 4

| STT | Thành viên (MSSV) | Nhiệm vụ trọng tâm Tuần 4 | Đợt 1 (14-17/11) | Đợt 2 (18-19/11) | Đợt 3 (20/11) | Điểm TB Tuần 4 | Xếp loại |
| :-: | :--- | :--- | :-: | :-: | :-: | :-: | :-: |
| 1 | **Hồ Anh Vũ**<br>(060205013608) | Trưởng nhóm: Thoại nhóm WebRTC Voice Huddle, nhạc chuông Web Audio API, Admin Face ID 3 góc, SheetJS Excel Viewer, bóc tách 3,200 dòng Monolith, tối ưu CSDL giảm 99.95%, điều phối toàn dự án. | 10.0 | 10.0 | 10.0 | **10.0 / 10** | **Xuất sắc (A+)** |
| 2 | **Bích Đặng Bảo Hân**<br>(060305003000) | QA / Frontend: Thực thi UAT 3 thiết bị (iPhone 17 Pro Max, iPad Pro 12.9", Laptop Windows 11) trên Production; rà soát Auth/Dashboard/Forum; lập danh mục chi tiết 37 lỗi UX/UI kèm Action Plan. | 10.0 | 10.0 | 10.0 | **10.0 / 10** | **Xuất sắc (A+)** |
| 3 | **Huỳnh Hồ Hiếu Hiệu**<br>(058305002228) | Frontend: Kiểm thử toàn diện quy trình 4 bước Sinh đề AI; thẩm định Fisher-Yates (mã đề 101-104); xuất Word in ấn và Phiếu tô OMR 50 câu; báo cáo lỗi endpoint PUT /api/v1/questions/{id}. | 10.0 | 10.0 | 10.0 | **10.0 / 10** | **Xuất sắc (A+)** |
| 4 | **Nguyễn Đức Cường**<br>(054205001431) | Database & ERP: Xây dựng 7 views thống kê Admin CSDL [SCRUM-94]; nghiên cứu Odoo ERP Community vs Enterprise; khảo sát 5 phân hệ POS, Kho, Mua hàng, Kế toán, Nhân sự cho bài toán quán ăn. | 9.5 | 9.5 | 10.0 | **9.7 / 10** | **Xuất sắc (A+)** |
| 5 | **Ngô Phạm Công Đức**<br>(052205015692) | Backend & Exam: Hoàn thiện tài liệu SRS IEEE 830 [SCRUM-105]; lập bảng ánh xạ quy trình nghiệp vụ quán ăn sang các phân hệ Odoo tương ứng; chuẩn bị dữ liệu mẫu thực đơn & bàn ăn. | 9.5 | 9.5 | 10.0 | **9.7 / 10** | **Xuất sắc (A+)** |
| 6 | **Nguyễn Văn Tân**<br>(060205012615) | Backend Services: Hoàn thành SCRUM-99 nâng cấp 4 microservices (Auth, Document, AI, Exam) với TTL Cache; tối ưu chunker.py; bảo đảm cụm dịch vụ hoạt động ổn định với độ trễ 5.7ms. | 10.0 | 9.5 | 9.5 | **9.7 / 10** | **Xuất sắc (A+)** |

---

## V. KHÓ KHĂN, TỒN ĐỌNG VÀ HƯỚNG XỬ LÝ KỸ THUẬT

1. **Hiện tượng treo trình duyệt di động do CSDL phình to 66.4 MB:** Bóc tách toàn bộ attachment sang thư mục đĩa cứng vật lý `data/uploads/qgroup_attachments/`, CSDL giảm 99.95% dung lượng (còn 34.2 KB) và tốc độ nạp chat đạt 0.18 giây.
2. **Xung đột kết nối WebRTC Offer khi hai người cùng bấm gọi Huddle:** Bổ sung cơ chế rollback tín hiệu tự động và quy tắc ưu tiên chuỗi email người dùng (Caller Priority Rule).
3. **Lỗi Safari Auto-Zoom 130% trên iPhone 17 Pro Max:** Áp dụng CSS Media Query ép cỡ chữ tối thiểu 16px trên di động mà vẫn giữ nguyên tỷ lệ trên desktop.
4. **Nhân bản phòng chat trực tiếp 1-1 khi tìm kiếm đồng nghiệp:** Viết lại thuật toán Deduplication kiểm tra id và email đối tác, gộp chung về đúng 1 cuộc trò chuyện duy nhất.
5. **Lỗi HTTP 404 tại endpoint cập nhật câu hỏi PUT /api/v1/questions/{id}:** Lên kế hoạch vá ngay trong ngày đầu Tuần 5 để đảm bảo dữ liệu sửa đổi được lưu vĩnh viễn vào CSDL máy chủ.

---

## VI. ĐÁNH GIÁ TIẾN ĐỘ VÀ KẾ HOẠCH TUẦN TIẾP THEO (TUẦN 5 – TỔNG KẾT & BẢO VỆ)

- **Đánh giá tiến độ lũy kế:** **96 / 100 điểm** (96% khối lượng toàn bộ dự án).
- **Kế hoạch Tuần 5 (Giai đoạn hoàn tất nghiệm thu và bảo vệ đồ án HKDN vào ngày 28/11/2026):**
  1. *Xử lý triệt để danh mục 37 lỗi UX/UI:* Tập trung vá dứt điểm 3 lỗi Critical và 17 lỗi High theo phản hồi kiểm thử UAT của Bích Đặng Bảo Hân.
  2. *Hoàn thiện endpoint cập nhật câu hỏi:* Vá lỗi `PUT /api/v1/questions/{id}` trên Exam Service đảm bảo tính toàn vẹn dữ liệu khi giảng viên biên tập câu hỏi.
  3. *Đóng gói mã nguồn & Docker:* Gắn tag phiên bản Release v1.0.0 trên GitHub, dọn dẹp các nhánh phụ và hợp nhất trọn vẹn vào nhánh `main`.
  4. *Hoàn thiện Hồ sơ Nghiệm thu Tổng kết HKDN:* Biên soạn Báo cáo Tổng kết Học kỳ Doanh nghiệp, slide thuyết trình bảo vệ và video demo hoàn chỉnh toàn bộ các tính năng của nền tảng QuizGen AI.

---

**TP. Hồ Chí Minh, ngày 21 tháng 11 năm 2026**  
**Trưởng nhóm thực hiện**  
*(Đã ký)*  
**Hồ Anh Vũ**
