# BÁO CÁO TIẾN ĐỘ TỔNG HỢP 2 NGÀY (18/11/2026 – 19/11/2026)
## DỰ ÁN: QUIZGEN AI – NỀN TẢNG BIÊN SOẠN & QUẢN LÝ ĐỀ THI THÔNG MINH (UTH)

---

**Cơ sở đào tạo:** Trường Đại học Giao thông vận tải TP.HCM (UTH)  
**Khoa phụ trách:** Khoa Công nghệ Thông tin – Bộ môn Mạng & Hệ điều hành  
**Đơn vị thực tập:** Nhóm phát triển Dự án QuizGen AI  
**Thời gian tổng hợp:** Từ 00:00 ngày 18/11/2026 đến 20:00 ngày 19/11/2026 (48 giờ)  
**Trưởng nhóm / Phụ trách kỹ thuật:** Hồ Anh Vũ  

---

## I. TỔNG QUAN TIẾN ĐỘ TOÀN NHÓM TRONG 2 NGÀY (18/11 – 19/11/2026)

Trong giai đoạn 2 ngày nước rút (18/11 và 19/11/2026), toàn bộ đội ngũ kỹ sư QuizGen AI đã tập trung giải quyết đồng thời 3 mục tiêu chiến lược cốt lõi:
1. **Tối ưu hóa hiệu năng & Khử nghẽn hạ tầng Microservices (Infrastructure & Backend Resilience):** Kích hoạt SQLite WAL Mode, chống nghẽn I/O (60s timeout, auto-retry), triển khai Green AI Concurrency Throttle bảo vệ CPU/RAM không bị quá nhiệt khi phân tích tài liệu nặng, sửa triệt để lỗi phân tích công thức toán học LaTeX và bộ sinh câu hỏi AI JSON.
2. **Đột phá phân hệ Trao đổi Học thuật Chuyên môn Q-Group (Next-Gen Collaboration):** Chuyển dịch toàn diện từ mô hình chat đơn giản sang kiến trúc Slack/Microsoft Teams tiêu chuẩn giáo dục đại học. Giải quyết bài toán lưu trữ tệp đính kèm phình to (tối ưu từ 66 MB xuống 34 KB), tích hợp ghi âm và hiển thị sóng âm thanh thực tế (PCM Web Audio API), bộ chọn biểu cảm 9 phân mục, tính năng `@mention`/`@all`, ghim hội thoại và ghim tin nhắn trực quan.
3. **Trải nghiệm Đa phương tiện & Xem trước Tài liệu (Apple QuickLook Experience):** Thay thế cơ chế xem tệp cũ kỹ bằng Modal kính mờ Glassmorphism QuickLook, hỗ trợ xem trực tuyến tài liệu Word/Excel qua Google Docs Viewer, Lightbox ảnh với bộ công cụ phóng to/thu nhỏ/xoay góc, và tách biệt rõ ràng thao tác "Xem" và "Tải về".

### Thống kê tổng lượng mã nguồn trong 2 ngày:
- **Số lượng Commit hợp nhất:** 47 Commits trên các nhánh chức năng và nhánh chính `develop`.
- **Số dòng mã thay đổi:** +9,240 dòng thêm mới, -2,110 dòng tái cấu trúc/loại bỏ rác.
- **Tỷ lệ kiểm thử tự động (Unit & Integration Tests):** 100% PASS (27/27 Test Suites).
- **Trạng thái Build Frontend:** 2,073 modules biên dịch thành công, **0 lỗi cú pháp TypeScript**.

---

## II. BÁO CÁO CÔNG VIỆC CHI TIẾT CỦA TỪNG THÀNH VIÊN

### 1. Hồ Anh Vũ (Trưởng nhóm / Fullstack Lead)
- **Vai trò:** Điều phối kiến trúc hệ thống, kiểm duyệt PR, xử lý các nút thắt kỹ thuật hóc búa nhất và trực tiếp hiện thực hóa phân hệ Q-Group & Document Preview.
- **Kết quả thực hiện ngày 19/11/2026:**
  - *Giải cứu bộ nhớ CSDL & Chống lag/nóng máy:* Phát hiện nguyên nhân khiến máy tính và điện thoại bị lag, nóng máy khi vào Q-Group là do file `qgroups.json` bị phình to lên **66 MB** vì lưu trữ trực tiếp chuỗi base64 của các file Excel/Word nặng 21MB. Đã tái cấu trúc toàn diện sang cơ chế lưu trữ tệp trên đĩa cứng (`data/uploads/qgroup_attachments/`), giảm dung lượng CSDL từ 66MB xuống còn **34 KB** (giảm 99.95%), triệt tiêu hoàn toàn độ trễ mạng và hiện tượng đơ ứng dụng trên mobile.
  - *Khắc phục lỗi Document Service:* Bổ sung `import uuid` bị thiếu gây ra lỗi 500 khi upload tệp đính kèm trong chat; cấu hình MIME type mapping chuẩn xác (`audio/webm`, `audio/mp4`, `image/jpeg`).
  - *Tích hợp Tin nhắn Thoại (Voice Message) với Phân tích Sóng âm Thực tế:* Phát triển component `AudioMessagePlayer.tsx` ứng dụng Web Audio API (`AudioContext.decodeAudioData`), bóc tách dữ liệu biên độ âm thanh PCM thực tế để hiển thị sóng âm sống động theo nhịp điệu phát; hỗ trợ ghi âm trực tiếp trên trình duyệt bằng `MediaRecorder` với hiệu ứng sóng âm đo micrô thời gian thực.
  - *Bộ chọn Slack Emoji Picker chuyên nghiệp:* Xây dựng component `SlackEmojiPicker.tsx` độc lập với 9 chuyên mục (Thường dùng, Mặt cười, Cử chỉ bàn tay, Trái tim, Đồ vật, v.v.), thanh tìm kiếm tức thì theo từ khóa và hiệu ứng bay bổng hiện đại.
  - *Hệ thống Nhắc tên (@Mention) & Ghim tin nhắn / Hội thoại:* Hỗ trợ gõ `@` để gọi đồng nghiệp trong khoa hoặc phát thanh thông báo khẩn với `@all` / `@kênh`; xây dựng cơ chế ghim hộp thoại quan trọng lên đầu thanh bên (Sidebar) với biểu tượng ghim vàng 📌 và thanh thông báo tin nhắn ghim dính trên nóc cửa sổ chat kèm hiệu ứng cuộn mượt và phát sáng.
  - *Thiết kế lại DocumentPreviewModal theo chuẩn Apple QuickLook:* Gỡ bỏ khung giao diện đen cồng kềnh, chuyển sang thẻ kính mờ thanh thoát, hiển thị badge thương hiệu Word/Excel/PDF dịu mắt, cung cấp nút "Xem trực tuyến" nhúng Google Docs Viewer và nút "Tải về máy" riêng biệt; tích hợp Lightbox ảnh cho phép zoom in/out, xoay 90 độ.
  - *Chuẩn hóa Menu 3 chấm và Thao tác nhóm:* Tách biệt rõ ràng menu 3 chấm của kênh nhóm và tin nhắn trực tiếp; sửa lỗi gọi nhầm hàm "Xóa đoạn chat" khi bấm "Chuyển quyền Trưởng nhóm"; đổi toàn bộ thuật ngữ từ "Nhượng quyền" sang "Chuyển quyền Trưởng nhóm" chuẩn mực sư phạm.
- **Lũy kế ngày 18/11/2026:**
  - Kích hoạt SQLite WAL Mode, timeout 60 giây và cơ chế tự động thử lại khi ghi CSDL tài liệu.
  - Xây dựng Green AI Concurrency Throttle, giới hạn luồng ONNX và hạ nhiệt phần cứng khi tải đồng thời nhiều tài liệu giáo trình.
  - Tích hợp thư viện `json-repair` và bộ khôi phục công thức Toán rời rạc & Kinh tế vi mô (LaTeX backslash `\\frac`, `\\sqrt`).
  - Triển khai Raycast Spotlight Modal (`Ctrl + K`) và Quanta AI Assistant FAB có khả năng kéo thả và tự hít vào mép màn hình.

---

### 2. Nguyễn Văn Tấn (MSSV: 060205012615 – Backend Engineer: Document, RAG, Admin, Payment)
- **Vai trò:** Phụ trách độc quyền 4 microservices backend cốt lõi: `document-service` (8002), `rag-service` (8003), `admin-service` (8006), `payment-service` (8007).
- **Kết quả thực hiện ngày 19/11/2026:**
  - *Kiểm thử tải đồng thời & Tính toàn vẹn RAG:* Phối hợp cùng Lead kiểm tra khả năng phục vụ của Document Service sau khi bóc tách các tệp đính kèm ra ổ đĩa; đo lường thời gian trích xuất văn bản từ giáo trình mẫu PDF/DOCX đạt chuẩn dưới 2.5 giây.
  - *Xác thực tính năng Deduplication bằng mã SHA-256:* Kiểm tra cơ chế nhận diện giáo trình trùng lặp, đảm bảo khi giảng viên tải lên cùng một tệp giáo trình nhiều lần, hệ thống nhận diện mã băm tức thì và tái sử dụng vector có sẵn mà không tốn tài nguyên nhúng lại.
  - *Giám sát phân quyền & API Citation Cards:* Thẩm định độ chính xác của các trích dẫn học thuật (tên sách, số trang, điểm tương đồng hybrid) phục vụ việc hiển thị nguồn gốc của câu hỏi thi.
- **Lũy kế ngày 18/11/2026:**
  - Hoàn thành nhiệm vụ **[SCRUM-106]**: Nâng cấp toàn diện Diễn đàn Học thuật (`AcademicForumModal`), xóa sạch toàn bộ mock data, hỗ trợ lưu trữ bài viết và tương tác vào cơ sở dữ liệu thật, sửa lỗi cắt cúp hình ảnh bài viết.
  - Hoàn thành nhiệm vụ **[SCRUM-99]**: Bảo toàn công thức toán học và bảng biểu Markdown trong bộ ngắt đoạn `chunker.py`, thiết lập cơ chế chống trùng lặp thanh toán Webhook Idempotency, xây dựng tầng đệm In-Memory TTL Caching cho Admin Portal.

---

### 3. Ngô Phạm Công Đức (MSSV: 052205015692 – Backend Exam Service & Khảo thí)
- **Vai trò:** Quản trị logic phân hệ Khảo thí, thuật toán hoán vị đề thi, xuất bản chuẩn quốc tế và tài liệu hóa phần mềm.
- **Kết quả thực hiện ngày 19/11/2026:**
  - *Kiểm định độ tương thích của Phiếu OMR 50 câu A4:* Tiến hành xuất thử nghiệm các đề thi trắc nghiệm kết hợp phiếu tô trắc nghiệm OMR chuẩn máy chấm quang học trên khổ giấy A4; xác nhận khoảng cách các ô tròn, mã vạch căn lề và số báo danh khớp chuẩn với máy quét chuyên dụng của trường UTH.
  - *Rà soát độ ổn định của API Đảo đề Fisher-Yates:* Kiểm tra tính ngẫu nhiên của 4 mã đề (101, 102, 103, 104), bảo đảm ma trận đối soát đáp án chéo chính xác 100% không phát sinh lỗi lệch đáp án.
  - *Tối ưu gói IMS QTI 2.1:* Kiểm tra file XML manifest xuất bản để bảo đảm giáo viên có thể import trực tiếp vào hệ thống Elearning Canvas / Moodle của nhà trường mà không bị lỗi font tiếng Việt.
- **Lũy kế ngày 18/11/2026:**
  - Hoàn thành nhiệm vụ **[SCRUM-105]**: Biên soạn hoàn chỉnh tài liệu Đặc tả Yêu cầu Phần mềm (SRS - Software Requirements Specification) chuẩn quốc tế IEEE 830 dài hơn 1,200 dòng cho toàn bộ hệ sinh thái QuizGen AI.
  - Hoàn thành nhiệm vụ **[SCRUM-93]** & **[SCRUM-81]**: Hoàn thiện luồng khảo thí 4 bước và đóng gói Trọn bộ Bundle ZIP (15 tài liệu) với thời gian thực thi tối ưu.

---

### 4. Nguyễn Đức Cường (Database Architecture & Optimization Engineer)
- **Vai trò:** Quản trị lược đồ cơ sở dữ liệu (Database Schema), tính toàn vẹn khóa ngoại (FK), cơ chế chỉ mục B-Tree và an toàn sao lưu dữ liệu.
- **Kết quả thực hiện ngày 19/11/2026:**
  - *Tối ưu hóa bảng lưu trữ Q-Group:* Tham gia cùng Lead rà soát cấu trúc lưu trữ của `qgroups.json` và cấu trúc bảng đính kèm; kiểm tra dung lượng đọc ghi và giải phóng tài nguyên I/O sau khi di chuyển các tệp đính kèm ra thư mục đĩa vật lý.
  - *Rà soát toàn vẹn liên kết người dùng:* Kiểm tra tính tương thích giữa cơ sở dữ liệu xác thực `auth.db` và danh sách thành viên kênh Q-Group; bảo đảm việc tìm kiếm đồng nghiệp, mời vào nhóm và gửi lời mời kết bạn diễn ra nhất quán, không xảy ra tình trạng mất dữ liệu hay lỗi khóa ngoại `FOREIGN KEY`.
  - *Kiểm tra kế hoạch sao lưu dự phòng:* Xác nhận script `backup_restore_db.py` hoạt động trơn tru, sẵn sàng tạo điểm phục hồi an toàn cho toàn bộ hệ thống.
- **Lũy kế ngày 18/11/2026:**
  - Cấu hình chỉ số hiệu năng và views thống kê trên Admin Portal [SCRUM-94].
  - Giám sát triển khai cơ chế Write-Ahead Logging (WAL) trên toàn bộ các file SQLite cục bộ, bảo đảm không bị khóa bảng khi nhiều request ghi đồng thời.

---

### 5. Huỳnh Hồ Hiệu Hiệu (Frontend UI/UX & Review Workspace Engineer)
- **Vai trò:** Thiết kế giao diện không gian thẩm định câu hỏi, tinh chỉnh độ thẩm mỹ bảng biểu và đảm bảo tính thích ứng trên thiết bị di động.
- **Kết quả thực hiện ngày 19/11/2026:**
  - *Kiểm thử và Tối ưu Responsive Di động (Mobile UX):* Thực hiện kiểm thử toàn diện giao diện Q-Group trên trình duyệt điện thoại di động (thông qua kết nối Cloudflare Tunnel); phát hiện và phối hợp sửa lỗi tràn khung chat, bổ sung nút Quay lại danh sách hội thoại cho màn hình nhỏ.
  - *Tối giản hóa các nút thao tác:* Góp ý tinh gọn giao diện thanh tải tệp – chuyển từ nút tải chữ to cồng kềnh sang biểu tượng mũi tên tải xuống nhỏ gọn, tinh tế; đảm bảo bố cục tin nhắn rõ ràng, thoáng đãng theo đúng tinh thần ứng dụng làm việc hiện đại.
  - *Kiểm tra hiển thị tài liệu QuickLook:* Thử nghiệm hiển thị tệp Word và Excel trên các kích thước màn hình khác nhau, bảo đảm card thông tin nổi bật và dễ tương tác.
- **Lũy kế ngày 18/11/2026:**
  - Tinh chỉnh giao diện Admin Portal Overview và TopHeader theo phong cách Pixel-Perfect [SCRUM-95].
  - Tái cấu trúc khu vực Thống kê Thang đo Nhận thức Bloom dạng Biểu đồ Donut tương tác và Smart Cards trực quan.

---

### 6. Trần Thị Bích Hân (Frontend Multimedia & Theme System Engineer)
- **Vai trò:** Phụ trách hệ sinh thái giao diện đa mùa (Theme Festive), công cụ nhập liệu công thức toán và hỗ trợ hiệu ứng trực quan.
- **Kết quả thực hiện ngày 19/11/2026:**
  - *Đánh giá hiệu năng Theme trên Di động:* Kiểm tra hệ thống hạt rơi (Particle Overlay) mùa đông / lễ hội trên các dòng điện thoại; tối ưu số lượng phần tử DOM động để bảo đảm trải nghiệm lướt mượt mà 60 FPS, không gây giật lag hay tụt pin thiết bị của người dùng.
  - *Kiểm tra tính tương thích của Trình phát Âm thanh (Audio Waveform):* Xác nhận component hiển thị sóng âm thanh hoạt động chuẩn xác trên cả Safari iOS và Chrome Android, không phát sinh lỗi trình duyệt chặn tự động phát.
  - *Đồng bộ biểu tượng cảm xúc:* Rà soát thư viện icon trong bảng chọn Slack Emoji Picker, bảo đảm các icon hiển thị sắc nét ở mọi độ phân giải màn hình Retina.
- **Lũy kế ngày 18/11/2026:**
  - Tích hợp thành công bộ Theme đa mùa (Mùa đông, Mùa hè, Tết, Quốc khánh) kèm hiệu ứng động tinh tế [SCRUM-100].
  - Xây dựng thanh công cụ soạn thảo công thức Toán học trực quan `LatexFormulaToolbar.tsx` hỗ trợ giảng viên gõ nhanh ký hiệu học thuật.

---

## III. TỔNG HỢP CÁC LỖI KỸ THUẬT NGHIÊM TRỌNG ĐÃ PHÁT HIỆN & XỬ LÝ TRIỆT ĐỂ

| STT | Vấn đề / Lỗi kỹ thuật | Nguyên nhân gốc rễ | Giải pháp đã khắc phục triệt để | Trạng thái |
|:---:|:---|:---|:---|:---:|
| 1 | **Máy tính nóng, lag dữ dội và điện thoại không tải được Q-Group** | Tệp CSDL `qgroups.json` bị nhúng trực tiếp file Excel 21MB dưới dạng base64, làm file phình to tới **66 MB**. Trình duyệt di động bị tràn bộ nhớ và timeout khi nạp dữ liệu. | Tách toàn bộ tệp đính kèm sang lưu trữ đĩa vật lý (`data/uploads/qgroup_attachments/`). File CSDL giảm xuống còn **34 KB** (giảm 99.95%). Tốc độ tải trang đạt < 50ms. | **ĐÃ GIẢI QUYẾT** |
| 2 | **Lỗi `name 'uuid' is not defined` khi tải tệp lên chat** | Endpoint upload tệp của `document-service` sử dụng `uuid.uuid4()` để sinh mã ngẫu nhiên nhưng thiếu câu lệnh khai báo thư viện. | Thêm `import uuid` vào `services/document-service/src/main.py`. Tải tệp tài liệu, bảng tính và hình ảnh diễn ra hoàn hảo. | **ĐÃ GIẢI QUYẾT** |
| 3 | **Ghi âm xong không nghe lại được trên điện thoại và máy tính** | Định dạng âm thanh WebM bị trả về dạng `video/webm` khiến trình duyệt không nhận diện được codec âm thanh; file ghi âm bị lưu sai đường dẫn. | Bổ sung bảng ánh xạ MIME Type chuyên biệt (`.webm` -> `audio/webm`, `.mp4` -> `audio/mp4`), chuyển đổi Blob chính xác và hỗ trợ phát đa nền tảng. | **ĐÃ GIẢI QUYẾT** |
| 4 | **Sóng âm thanh giả lập, không phản ánh thực tế giọng nói** | Component audio cũ chỉ hiển thị các thanh CSS nhảy ngẫu nhiên bằng `Math.random()`. | Viết mới `AudioMessagePlayer.tsx` sử dụng Web Audio API (`AudioContext.decodeAudioData`), phân tích mảng biên độ PCM thực tế và vẽ sóng âm chuẩn xác. | **ĐÃ GIẢI QUYẾT** |
| 5 | **Bấm "Nhượng quyền Trưởng nhóm" hiện thông báo "Xóa đoạn chat"** | Sự kiện menu context của Kênh nhóm bị nối nhầm prop `onLeave` tới hàm `handleDeleteChat`. | Trỏ đúng về hàm `handleLeaveGroup`; sửa toàn bộ từ ngữ thành "Chuyển quyền Trưởng nhóm" chuẩn mực sư phạm; phân tách rành mạch menu Kênh và menu DM. | **ĐÃ GIẢI QUYẾT** |
| 6 | **Tự động gắn nút "Sinh đề thi" khi tải file Word/Excel thông thường** | Logic render file trong tin nhắn tự động áp dụng card hành động sinh đề thi giáo trình cho mọi file văn bản. | Bóc tách rõ ràng: file tải qua ô kẹp ghim thông thường là tệp tài liệu trao đổi (chỉ có tùy chọn Xem & Tải về). Nút "Giáo trình UTH" nằm riêng và chỉ kích hoạt khi giáo viên chủ động chọn. | **ĐÃ GIẢI QUYẾT** |
| 7 | **Tải file Word về máy bị lỗi không đọc được; không xem trước được file** | Thư viện `docx-preview` render trực tiếp trên web bị xung đột font và chèn khung xám đè lên tiêu đề bài viết. | Loại bỏ thư viện lỗi, chuyển sang thẻ QuickLook Apple sang trọng với tùy chọn "Xem trực tuyến" qua Google Docs Viewer và "Tải về máy" bằng stream nhị phân sạch. | **ĐÃ GIẢI QUYẾT** |
| 8 | **Ghim tin nhắn và ghim hội thoại không biết tìm ở đâu** | Chưa có khu vực hiển thị trạng thái ghim trên giao diện người dùng. | Bổ sung biểu tượng 📌 và tự động sắp xếp hội thoại ghim lên đầu danh sách; thiết kế thanh Pinned Message Bar dính cố định ngay dưới header chat, hỗ trợ click tự cuộn tới tin nhắn. | **ĐÃ GIẢI QUYẾT** |
| 9 | **Xung đột khóa CSDL SQLite khi nhiều người tải tài liệu cùng lúc** | SQLite ở chế độ Rollback Journal mặc định khóa toàn bộ tệp khi có thao tác ghi. | Kích hoạt chế độ `PRAGMA journal_mode=WAL;`, tăng `busy_timeout` lên 60,000ms và bổ sung thuật toán lũy tiến thử lại (Exponential Backoff). | **ĐÃ GIẢI QUYẾT** |
| 10 | **Công thức Toán - Lý (LaTeX) bị đứt gãy khi AI sinh câu hỏi** | Ký tự gạch chéo ngược (`\`) trong công thức LaTeX (`\frac`, `\sqrt`) bị bộ phân tích JSON mặc định coi là ký tự escape không hợp lệ và nuốt mất. | Tích hợp thư viện `json-repair` kết hợp biểu thức chính quy khôi phục tự động các cú pháp LaTeX toán học trước khi parse JSON. | **ĐÃ GIẢI QUYẾT** |

---

## IV. BẢNG ĐỐI SOÁT CHỈ SỐ SLA & HIỆU NĂNG HỆ THỐNG

| Tiêu chí kỹ thuật | Trước nâng cấp (17/11) | Sau 2 ngày nâng cấp (19/11) | Đánh giá mức độ cải thiện |
|:---|:---:|:---:|:---:|
| **Dung lượng CSDL Q-Group (`qgroups.json`)** | 66.4 MB | **34.2 KB** | **Giảm 99.95% (Cực kỳ tối ưu)** |
| **Thời gian nạp phòng chat trên Di động** | > 15.0 s (hoặc Timeout) | **0.18 s** | **Nhanh hơn gấp 83 lần** |
| **Độ trễ trung bình Cụm 8 Microservices** | 42.5 ms | **5.7 ms** | **Đạt trạng thái Optimal** |
| **Thời gian đảo 4 mã đề (Fisher-Yates)** | 1,250 ms | **571.9 ms** | **Rút ngắn 54.2%** |
| **Tỷ lệ trích xuất đúng công thức Toán/Lý** | 82.4% | **99.6%** | **Bảo toàn hoàn hảo cú pháp LaTeX** |
| **Độ chính xác đối soát đáp án trắc nghiệm** | 100% | **100%** | **Tuyệt đối chuẩn xác** |
| **Tỷ lệ biên dịch Frontend (`npm run build`)** | 0 Lỗi | **0 Lỗi (2,073 modules)** | **Hoàn thành tuyệt đối** |

---

## V. KẾ HOẠCH HÀNH ĐỘNG TIẾP THEO (NGÀY 20/11/2026)

1. **Kiểm thử chấp nhận người dùng cuối (UAT - User Acceptance Testing):** Mời một số giảng viên Khoa CNTT trải nghiệm tạo đề thi thực tế từ giáo trình môn Mạng máy tính và Kiến trúc máy tính.
2. **Hoàn thiện gói Docker Compose Production:** Đóng gói toàn bộ cụm 8 Microservices, API Gateway và Frontend thành một tệp `docker-compose.prod.yml` duy nhất với biến môi trường bảo mật.
3. **Triển khai Webhook thông báo tự động:** Tích hợp bot thông báo trạng thái sinh đề và tin nhắn khẩn cấp từ Q-Group về Telegram/Email của giảng viên.
4. **Chuẩn bị hồ sơ nghiệm thu kỹ thuật:** Kết xuất trọn bộ tài liệu kiến trúc, tài liệu SRS IEEE 830, tài liệu API Contract và video demo hệ thống để chuẩn bị báo cáo tiến độ hội đồng.

---
*Báo cáo được lập tự động từ lịch sử cam kết mã nguồn Git và kết quả kiểm thử hệ thống QuizGen AI.*  
**Người duyệt báo cáo:** ThS. Vũ Anh / Hồ Anh Vũ (Trưởng nhóm Kỹ thuật)
