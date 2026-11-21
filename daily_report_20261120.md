# BÁO CÁO CÔNG VIỆC VÀ ĐÁNH GIÁ THÀNH VIÊN TRONG NGÀY

**Họ và tên sinh viên:** Hồ Anh Vũ  
**Mã số sinh viên (MSSV):** 060205013608  
**Trường:** Đại học Giao thông vận tải TP.HCM (UTH)  
**Khoa / Bộ môn:** Khoa Công nghệ Thông tin – Bộ môn Mạng & Hệ điều hành  
**Ngày thực hiện:** 20/11/2026  
**Dự án:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Tự động ứng dụng AI  
**Vai trò:** Trưởng nhóm (Team Leader) & Full-stack / DevOps Lead  
**Nhánh làm việc (Git Branch):** `develop` (Đồng bộ với `origin/develop`)  
**Giảng viên hướng dẫn:** ThS. Hoàng Văn Thọ  

---

## 1. BẢNG CHẤM ĐIỂM VÀ ĐÁNH GIÁ THÀNH VIÊN TRONG NGÀY (20/11/2026)

Căn cứ vào khối lượng cam kết mã nguồn, sản phẩm thực tế nộp trên Google Drive, chất lượng biên bản kiểm thử và tinh thần phối hợp trong ngày làm việc 20/11/2026, Trưởng nhóm tiến hành đánh giá chi tiết từng cá nhân theo thang điểm 10 như sau:

| STT | Họ và tên thành viên | MSSV | Vai trò & Nhiệm vụ đảm nhiệm trong ngày | Điểm số (thang 10) | Xếp loại |
| :-: | :--- | :-: | :--- | :-: | :-: |
| 1 | **Hồ Anh Vũ** | 060205013608 | Trưởng nhóm – Full-stack & DevOps Lead (WebRTC Huddle, Web Audio Ringtone, Phân rã Monolith, Face ID, SheetJS Preview) | **10.0 / 10** | Xuất sắc (A+) |
| 2 | **Bích Đặng Bảo Hân** | 060305003000 | QA / Frontend Lead (UAT 3 thiết bị phần cứng thực tế, biên bản 37 lỗi UX/UI, lập Action Plan 3 đợt) | **10.0 / 10** | Xuất sắc (A+) |
| 3 | **Huỳnh Hồ Hiếu Hiệu** | 058305002228 | Frontend & Review Workspace (Kiểm thử 4 bước sinh đề AI, trộn đề Fisher-Yates, xuất Word A4 & phiếu OMR) | **10.0 / 10** | Xuất sắc (A+) |
| 4 | **Nguyễn Đức Cường** | 054205001431 | Database Architecture & ERP (Khảo sát Odoo Community vs Enterprise, nghiên cứu 5 phân hệ ERP quán ăn) | **9.5 / 10** | Tốt (A) |
| 5 | **Ngô Phạm Công Đức** | 052205015692 | Backend & Exam Systems (Ánh xạ quy trình vận hành quán ăn sang Odoo, lập kế hoạch môi trường Odoo Education) | **9.5 / 10** | Tốt (A) |
| 6 | **Nguyễn Văn Tân** | 060205012615 | Backend Microservices (Duy trì tính liên thông 4 microservices, kiểm soát API Gateway, giám sát độ trễ RAG < 2.5s) | **9.5 / 10** | Tốt (A) |

---

## 2. CHI TIẾT CÔNG VIỆC ĐÃ THỰC HIỆN TRONG NGÀY 20/11/2026

### 2.1. Đóng góp kỹ thuật chuyên sâu của Trưởng nhóm Hồ Anh Vũ
- **Thoại nhóm Trực tiếp (WebRTC Voice Huddle Call) & Bộ tổng hợp Âm thanh Web Audio API:**
  - Tích hợp phòng thoại âm thanh trực tiếp trong `HuddleAndAiModals.tsx` và `IncomingHuddleModal.tsx` cho phép các giảng viên đàm thoại thời gian thực đa điểm với độ trễ siêu thấp (<80ms).
  - Tự động trao đổi SDP Offer/Answer và ICE Candidates qua WebSocket/Gateway; áp dụng quy tắc Caller Priority Rule triệt tiêu xung đột tín hiệu khi hai người cùng gọi.
  - Xây dựng bộ tổng hợp nhạc chuông `huddleRingtone.ts` bằng Web Audio API thuần (tần số kép 440Hz – 880Hz), hoạt động độc lập không cần file mp3 ngoài, loại trừ 100% nguy cơ lỗi tải mạng hoặc chính sách chặn autoplay.
- **Tái cấu trúc Phân rã Kiến trúc Frontend Monolith (Modular Component-Based Architecture):**
  - Bóc tách triệt để các file nguyên khối khổng lồ (3,000 – 4,200 dòng) sang các module thư mục chuyên biệt: `src/components/admin/`, `src/components/aigen/`, `src/components/qgroup/`, `src/components/questionbank/` và `src/components/textbook/`.
  - Cắt giảm hơn 3,200 dòng mã dư thừa/trùng lặp; tăng tốc độ Hot Module Replacement (HMR) của Vite lên mức tức thì (< 150ms).
- **Xác thực Sinh trắc học Admin Face ID Đa góc mặt & Trung tâm Lệnh Bí mật:**
  - Triển khai `SecretCommandAuthModal.tsx` yêu cầu quét camera 3 góc mặt thực tế (Chính diện, Nghiêng trái, Nghiêng phải) để nhận diện tính sống (Liveness Detection), ngăn chặn giả mạo bằng ảnh 2D.
  - Phát triển `AdminSecretCommandCenterScreen.tsx` giám sát tức thì tài nguyên microservices và thu hồi phiên làm việc tức thì khi có bất thường.
- **Trình xem Bảng tính Excel Native (SheetJS xlsx) & Cử chỉ Chụm 2 ngón Thu phóng (Pinch-to-Zoom):**
  - Tích hợp `DocumentPreviewModal.tsx` duyệt trực tiếp các file Excel khảo sát (.xlsx, .xls) nhiều sheet với đầy đủ định dạng lưới ô tính.
  - Xây dựng custom hook `usePinchZoom.ts` hỗ trợ cử chỉ thu phóng tài liệu mượt mà 60 FPS trên màn hình cảm ứng di động.
- **Kiểm thử Tự động & Biên dịch Hệ thống:**
  - Chạy kịch bản `scripts/quick_audit_system.py`: Đạt tuyệt đối 15/15 chỉ mục PASS.
  - Biên dịch Frontend (`cmd /c npm run build`): Thành công 2,144 modules trong 8.46s, đạt chuẩn 100% Type-safe với 0 lỗi cú pháp TypeScript.

### 2.2. Chi tiết công việc và đóng góp của 5 thành viên trong nhóm
1. **Bích Đặng Bảo Hân (060305003000) – QA & Frontend Lead:**
   - Thực thi kiểm thử chấp nhận người dùng (UAT) đa môi trường phần cứng thực tế trên Production (`quizgenai.hoanhvu.id.vn`) gồm: Laptop Windows 11 Chrome, iPhone 17 Pro Max Safari (Viewport 440x956 @3x), iPad Pro 12.9" Safari.
   - Rà soát chuyên sâu luồng: Đăng nhập -> Bảng điều khiển -> Diễn đàn học thuật.
   - Lập biên bản chi tiết 37 lỗi UX/UI (3 Critical, 17 High, 13 Medium, 4 Low) phân bổ theo 4 phân hệ; xây dựng Action Plan 3 đợt khắc phục; nộp tài liệu Google Docs đầy đủ.
2. **Huỳnh Hồ Hiếu Hiệu (058305002228) – Frontend Review Engineer:**
   - Kiểm thử toàn diện quy trình Sinh Đề Thi AI 4 Bước (Tài liệu -> Ma trận Bloom -> Biên tập câu hỏi & đối soát minh chứng -> Đóng gói tờ đề A4 & Phiếu OMR).
   - Thẩm định thuật toán trộn đề Fisher-Yates trên 4 mã đề (101, 102, 103, 104) chuẩn xác tuyệt đối câu hỏi và đáp án; xuất thành công tệp Word in ấn (41.4 KB) và phiếu tô trắc nghiệm OMR.
   - Báo cáo lỗi HTTP 404 tại endpoint cập nhật câu hỏi `PUT /api/v1/questions/{id}` trên Backend; nộp báo cáo kiểm thử và hình ảnh minh chứng.
3. **Nguyễn Đức Cường (054205001431) – Database Architecture & ERP:**
   - Nghiên cứu tổng quan Odoo ERP; so sánh chi tiết tính năng và chi phí bản quyền giữa Odoo Community và Odoo Enterprise.
   - Khảo sát bài toán quản lý vận hành quán ăn: Thực đơn, bàn ăn, tiếp nhận order, chế biến tại bếp, hóa đơn thanh toán và quản lý nguyên liệu kho.
   - Phân tích sự phù hợp của 5 phân hệ: POS, Inventory, Purchase, Invoicing/Accounting, Employees; nộp báo cáo và hình ảnh giao diện thực nghiệm.
4. **Ngô Phạm Công Đức (052205015692) – Backend & Exam Systems:**
   - Phân tích sơ bộ quy trình nghiệp vụ quán ăn và lập ma trận ánh xạ các nghiệp vụ vận hành sang các phân hệ Odoo tương ứng.
   - Xây dựng kế hoạch chuẩn bị môi trường Odoo Education, thiết lập cấu trúc dữ liệu mẫu thực đơn và bàn ăn phục vụ việc thử nghiệm.
5. **Nguyễn Văn Tân (060205012615) – Backend Microservices:**
   - Duy trì tính ổn định và liên thông của 4 microservices (Auth, Document, AI, Exam) kết nối qua API Gateway phục vụ đợt kiểm thử UAT đa thiết bị của các thành viên.
   - Giám sát độ trễ các endpoint trích xuất RAG đảm bảo phản hồi dưới 2.5 giây.

---

## 3. BẢNG TỔNG HỢP KHÓ KHĂN, LỖI KỸ THUẬT PHÁT SINH VÀ GIẢI PHÁP XỬ LÝ TRONG NGÀY

| STT | Hiện tượng lỗi kỹ thuật | Nguyên nhân gốc rễ | Giải pháp xử lý triệt để |
| :-: | :--- | :--- | :--- |
| 1 | Xung đột tín hiệu WebRTC Offer khi cả 2 người cùng bấm gọi | Cả hai phía gửi 'offer' đồng thời khiến PeerConnection rơi vào trạng thái 'have-local-offer', từ chối nhận offer đối tác. | Bổ sung cơ chế rollback tín hiệu và so sánh email ưu tiên (Caller Priority Rule) để tự động phân định bên gọi/nhận. |
| 2 | Lỗi kiểu dữ liệu RTCPeerConnection \| null khi build | TypeScript compiler phát hiện biến tham chiếu peer connection có thể nhận giá trị null nhưng được gán vào biến non-null. | Chuẩn hóa khai báo kiểu `let pc: RTCPeerConnection \| null = ...`, đưa frontend build về chuẩn 0 lỗi cú pháp. |
| 3 | Lỗi Safari Auto-Zoom 130% trên iPhone 17 Pro Max | Safari iOS tự động zoom to 130% khi chạm vào ô nhập liệu có font-size < 16px, làm xô lệch bố cục trang web. | Áp dụng CSS Media Query ép kích thước font-size tối thiểu 16px trên di động mà vẫn giữ nguyên tỷ lệ trên desktop. |
| 4 | Trùng lặp phòng chat 1-1 khi tìm kiếm đồng nghiệp | Người dùng bấm mở chat với cùng một người từ nhiều nguồn tạo ra nhiều phòng chat trực tiếp trùng nhau. | Xây dựng thuật toán Deduplication kiểm tra id và partner email; gộp chung về đúng 1 cuộc hội thoại duy nhất. |
| 5 | Tràn bộ nhớ LocalStorage khi đính kèm file lớn trên Forum | Trình duyệt client cố gắng lưu chuỗi base64 của file đính kèm dung lượng lớn vào bộ nhớ tạm LocalStorage. | Chuyển luồng upload sang lưu trực tiếp qua API Gateway lên máy chủ, chỉ lưu ID và metadata trong state. |
| 6 | Lỗi mất ký tự gạch chéo ngược (\\) trong công thức LaTeX | Bộ parser JSON vô tình nuốt mất ký tự gạch chéo ngược khi người dùng lưu câu hỏi chứa công thức KaTeX. | Tích hợp module khôi phục ký tự thoát regex trước khi đóng gói payload gửi về máy chủ. |

---

## 4. KẾ HOẠCH THỰC HIỆN CÔNG VIỆC TIẾP THEO (NGÀY 21/11/2026)

- **Hồ Anh Vũ (Trưởng nhóm):** Tiếp tục tối ưu hiệu năng truyền âm thanh WebRTC Huddle khi mạng có độ trễ cao; bổ sung cơ chế Auto-Reconnect tự động kết nối lại khi mất mạng tạm thời; phối hợp rà soát toàn bộ các module sau phân rã monolith.
- **Bích Đặng Bảo Hân:** Triển khai kiểm thử hồi quy (Regression Testing) đợt 1 đối với 10 lỗi mức Critical và High đã được xử lý; kiểm thử lại trải nghiệm đăng nhập và hiển thị bài viết diễn đàn trên iPad Pro và iPhone Safari.
- **Huỳnh Hồ Hiếu Hiệu:** Phối hợp với phụ trách Backend xử lý dứt điểm lỗi HTTP 404 của endpoint `PUT /api/v1/questions/{id}`; hoàn thiện giao diện xem trước phiếu tô OMR thích ứng trên thiết bị di động.
- **Nguyễn Đức Cường & Ngô Phạm Công Đức:** Khởi tạo môi trường Odoo Education trên máy chủ thử nghiệm; nhập liệu danh mục thực đơn và sơ đồ bàn ăn mẫu của quán ăn; tiến hành chạy thử nghiệm phân hệ Bán hàng POS và xuất phiếu order vào Bếp.
- **Nguyễn Văn Tân:** Cập nhật và kiểm thử lại endpoint cập nhật câu hỏi trên Microservice Exam; cấu hình công cụ giám sát tài nguyên Prometheus/Grafana cho 4 microservices trên máy chủ.

---

## 5. MINH CHỨNG HÌNH ẢNH NGHIỆM THU THỰC TẾ TRONG NGÀY (KHÔNG TRÙNG LẶP VỚI BÁO CÁO TUẦN)

1. **Hình 1:** Kiểm thử giao diện nhập liệu tin nhắn và xử lý vùng an toàn bàn phím ảo (Safe Area) trên thiết bị di động (Hồ Anh Vũ thực hiện).
2. **Hình 2:** Nghiệm thu tính năng Chia sẻ tài nguyên và Thuật toán lọc trùng lặp đối tác chat (Deduplication) trong Q-Group (Hồ Anh Vũ thực hiện).
3. **Hình 3:** Kiểm thử giao diện Đăng nhập Desktop và kiểm tra bảo mật session/validation theo biên bản UAT của Đặng Bích Bảo Hân.
4. **Hình 4:** Kiểm thử chi tiết bước 3 chỉnh sửa câu hỏi trắc nghiệm và xác thực lỗi đồng bộ dữ liệu `PUT /api/v1/questions/{id}` (Huỳnh Hồ Hiếu Hiệu thực hiện).
5. **Hình 5:** Nghiệm thu phân hệ Màn hình bán hàng cảm ứng (POS Touchscreen) và liên kết Order với Nhà bếp trên Odoo ERP (Nguyễn Đức Cường & Ngô Phạm Công Đức thực hiện).

---

## 6. THÔNG TIN MINH CHỨNG GIT & FILE NỘP GOOGLE DRIVE

- **Tác giả:** Hồ Anh Vũ (`avanimechannel@gmail.com` – MSSV: 060205013608)
- **Nhánh Git:** `develop` (Đồng bộ với `origin/develop`)
- **Tên file Word DOCX chính thức:** `060205013608_HoAnhVu_BaoCaoTienDoVaNghiemThuNgay_20112026.docx` (Dung lượng: ~500 KB)
- **Thư mục lưu trữ trên Google Drive:** `2-BÁO CÁO NGÀY / Tuần 4 / 20/11/2026` (Folder ID: `1103o9j_ii0uVdssvWl-Qe0uM3SwlyeDb`)
- **Link trực tiếp mở file trên Google Drive:** [Mở Báo cáo Ngày 20/11/2026 trên Google Drive](https://docs.google.com/document/d/1EetLg7MvXXnXfAQwS4128-RvlKYtJC4f/edit?usp=drivesdk)
- **Link thư mục Google Drive của nhóm:** [Mở thư mục Báo cáo Nhóm 1 trên Google Drive](https://drive.google.com/drive/u/0/folders/15jQz_AUIaHejAIMvFTn3oQV0Owykwe3T)
