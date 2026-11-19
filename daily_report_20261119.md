# BÁO CÁO TIẾN ĐỘ THỰC TẬP HẰNG NGÀY

**Họ và tên sinh viên:** Hồ Anh Vũ  
**Mã số sinh viên (MSSV):** 060205013608  
**Trường:** Đại học Giao thông vận tải TP.HCM (UTH)  
**Khoa / Bộ môn:** Khoa Công nghệ Thông tin – Bộ môn Mạng & Hệ điều hành  
**Ngày thực hiện:** 19/11/2026  
**Dự án:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Tự động ứng dụng AI  
**Vai trò:** Trưởng nhóm (Team Leader) & Full-stack / DevOps Engineer  
**Nhánh làm việc (Git Branch):** `develop`  
**Mã Commit chính thức:** `c405350` (hợp nhất từ chuỗi 12 commits ngày 19/11)  

---

## I. CÔNG VIỆC ĐÃ HOÀN THÀNH TRONG NGÀY (19/11/2026)

Trong ngày làm việc hôm nay (19/11/2026), trọng tâm kỹ thuật được dồn toàn lực vào việc giải cứu hiệu năng hệ thống, nâng cấp toàn diện phân hệ Không gian Hội nhóm Chuyên môn Q-Group lên chuẩn tương tác đa phương tiện hiện đại (Voice Message, Apple QuickLook Preview, Slack Emoji Picker, @Mention tagging) và tối ưu hóa trải nghiệm trên thiết bị di động:

### 1. Tối ưu hóa Bộ nhớ CSDL & Chống lag/nóng máy thiết bị (Disk Offloading)
- **Bóc tách tệp đính kèm sang ổ đĩa:** Điều tra và phát hiện nguyên nhân gốc rễ gây hiện tượng đơ lag, nóng máy và timeout trên thiết bị di động khi truy cập Q-Group: file cơ sở dữ liệu `qgroups.json` bị phình to bất thường lên tới **66.4 MB** do lưu trữ trực tiếp chuỗi base64 của các file bảng tính Excel 21MB và tài liệu Word.
- **Tái cấu trúc kiến trúc lưu trữ:** Di chuyển toàn bộ dữ liệu nhị phân của tệp đính kèm sang thư mục đĩa vật lý an toàn `data/uploads/qgroup_attachments/`, trong CSDL chỉ lưu đường dẫn tương đối và metadata.
- **Kết quả đo lường:** Dung lượng `qgroups.json` giảm siêu tốc từ 66.4 MB xuống chỉ còn **34.2 KB** (tỷ lệ cắt giảm đạt **99.95%**). Thời gian nạp dữ liệu kênh chat trên điện thoại di động giảm từ >15 giây (hoặc lỗi treo trình duyệt) xuống chỉ còn **0.18 giây**.

### 2. Sửa lỗi nghiêm trọng Backend Document Service (Port 8002)
- Khắc phục lỗi `name 'uuid' is not defined` trong `services/document-service/src/main.py`: Bổ sung thư viện `import uuid` bị thiếu, khôi phục 100% khả năng upload tệp đính kèm và hình ảnh qua cổng API Gateway.
- Cấu hình hoàn chỉnh bảng ánh xạ định dạng âm thanh `AUDIO_EXT_MAP` (`.webm` -> `audio/webm`, `.mp4` -> `audio/mp4`, `.ogg` -> `audio/ogg`, `.mp3` -> `audio/mpeg`) giải quyết triệt để lỗi không nhận diện tệp voice trên Safari iOS và Chrome Android.

### 3. Tích hợp Tin nhắn Thoại (Voice Message) với Phân tích Sóng âm Thực tế (PCM Web Audio API)
- Xây dựng component mới [AudioMessagePlayer.tsx](file:///d:/HKDN/Quizgen%20AI/src/components/AudioMessagePlayer.tsx):
  - Ứng dụng Web Audio API (`AudioContext.decodeAudioData`), giải mã dữ liệu âm thanh nhị phân thành mảng biên độ PCM (Pulse-Code Modulation) thực tế gồm 32 vạch sóng âm.
  - Phản ánh trung thực độ cao - trầm và nhịp điệu giọng nói thực tế của người nói, xóa bỏ hoàn toàn các vạch sóng giả lập CSS ngẫu nhiên trước đây.
  - Hiệu ứng đổi màu sóng âm gradient Teal `#008689` động theo tiến trình phát lại thời gian thực kèm đếm thời lượng mm:ss.
- Nâng cấp bộ thu âm giọng nói trực tiếp trên thanh công cụ chat bằng `MediaRecorder` và `AnalyserNode`, hiển thị sóng âm nhảy sống động khi người dùng đang nói vào micro.

### 4. Phát triển Bộ chọn Biểu cảm Slack Emoji Picker chuyên nghiệp
- Xây dựng component độc lập [SlackEmojiPicker.tsx](file:///d:/HKDN/Quizgen%20AI/src/components/SlackEmojiPicker.tsx) theo tiêu chuẩn trải nghiệm Slack / Microsoft Teams:
  - Phân loại trực quan thành 9 chuyên mục phong phú: Thường dùng (Frequently Used), Mặt cười & Cảm xúc, Cử chỉ & Bàn tay, Trái tim, Động vật & Thiên nhiên, Đồ ăn & Đồ uống, Hoạt động & Thể thao, Đồ vật & Biểu tượng.
  - Tích hợp thanh tìm kiếm tức thì theo từ khóa song ngữ Anh - Việt.
  - Hiệu ứng bay bổng hiện đại, tương thích hoàn hảo trên cả chuột máy tính và cảm ứng di động.

### 5. Hệ thống Nhắc tên Thành viên (@Mention) & Ghim Tin nhắn / Ghim Hội thoại
- **Nhắc tên thông minh:** Hỗ trợ gõ ký tự `@` để mở popup danh sách đồng nghiệp trong phòng ban; hỗ trợ tính năng phát thanh khẩn cấp `@all` và `@kênh` để gửi thông báo tức thì tới toàn bộ thành viên.
- **Ghim hội thoại lên đầu thanh bên (Pin Channel/DM):** Bổ sung nút ghim với biểu tượng 📌 màu vàng nổi bật; thuật toán sắp xếp tự động ưu tiên đưa các kênh/cuộc trò chuyện được ghim lên đầu danh sách bất kể thời gian nhắn tin gần nhất.
- **Thanh ghim tin nhắn trực quan (Sticky Pinned Message Bar):** Thiết kế thanh thông báo gắn cố định ngay phía dưới header của khung chat; bấm vào lập tức tự động cuộn mượt (smooth scroll) đến đúng vị trí tin nhắn được ghim và kích hoạt hiệu ứng phát sáng viền giúp người dùng định vị ngay lập tức.

### 6. Tái thiết kế Modal Xem trước Tài liệu theo phong cách Apple QuickLook
- Nâng cấp triệt để [DocumentPreviewModal.tsx](file:///d:/HKDN/Quizgen%20AI/src/components/DocumentPreviewModal.tsx):
  - Gỡ bỏ hoàn toàn khung giao diện nền đen nặng nề, chuyển đổi sang thẻ kính mờ (Glassmorphism) thanh thoát chuẩn macOS QuickLook.
  - Duotone Brand Badges nhận diện dịu mắt cho các định dạng: Microsoft Word (`#185ABD`), Excel (`#107C41`), PDF (`#EA4335`).
  - Phân tách rõ ràng thao tác: Click vào file sẽ mở cửa sổ xem trước; chỉ khi bấm vào nút tải xuống (icon mũi tên nhỏ gọn) thì tệp mới bắt đầu được tải về máy.
  - Tích hợp tùy chọn **"Xem trực tuyến"** thông qua Google Docs Viewer nhúng an toàn, giúp đọc trọn vẹn nội dung giáo trình Word/Excel mà không cần cài đặt Microsoft Office.
  - Tích hợp bộ công cụ Lightbox ảnh đa năng: Phóng to (Zoom In), Thu nhỏ (Zoom Out), Xoay 90° (Rotate) và Tải về trực tiếp.

### 7. Tinh gọn Thao tác & Sửa lỗi Menu Ngữ cảnh (3-Dots Context Menu)
- Sửa lỗi nghiêm trọng: Thao tác click "Chuyển quyền Trưởng nhóm" trên menu ngữ cảnh của kênh trước đây gọi nhầm sang hàm xóa đoạn chat; đã nối lại đúng về hàm `handleLeaveGroup` và cập nhật thông điệp xác nhận chuẩn mực sư phạm.
- Thay thế hoàn toàn từ ngữ "Nhượng quyền" thành "Chuyển quyền Trưởng nhóm".
- Phân biệt rõ menu 3 chấm của kênh nhóm (Chi tiết kênh, Sao chép mã phòng, Tắt thông báo, Chuyển quyền, Giải tán nhóm) và menu của tin nhắn trực tiếp 1-1 (Xem hồ sơ giảng viên, Chặn/Bỏ chặn, Xóa lịch sử chat).

### 8. Kiểm thử Tích hợp & Duy trì Trạng thái Hệ thống
- **Kiểm thử tự động:** Toàn bộ 27 kịch bản kiểm thử E2E đạt tỷ lệ tuyệt đối **100% PASS**.
- **Kiểm tra Build Frontend (`npm run build`):** Biên dịch thành công 2,073 modules, **0 lỗi cú pháp TypeScript**.
- **Hạ tầng Microservices:** Toàn bộ 8 microservices (Ports 8000–8007), API Gateway và Vite Dev Server hoạt động ổn định liên tục, kết nối xuyên suốt qua Cloudflare Tunnel cho phép truy cập từ thiết bị di động bên ngoài.

---

## II. KHÓ KHĂN VÀ GIẢI PHÁP ĐÃ XỬ LÝ

### 1. Khó khăn 1: Trình duyệt di động bị treo và máy tính quá nhiệt do CSDL phình to 66MB
- **Nguyên nhân:** Khi giảng viên gửi các tệp tài liệu Word và bảng tính Excel khảo sát dung lượng hơn 20MB vào nhóm chat, mã nguồn cũ chuyển đổi toàn bộ file thành chuỗi base64 và lưu trực tiếp vào trường `fileData` trong CSDL JSON `qgroups.json`. Khi người dùng mở chat, máy chủ phải truyền tải toàn bộ 66MB qua mạng, làm nghẽn CPU và tràn RAM của điện thoại di động.
- **Giải pháp:** Thiết kế lại luồng upload: bóc tách tệp nhị phân lưu trữ trên đĩa cứng máy chủ tại thư mục `data/uploads/qgroup_attachments/` với định danh tệp duy nhất; CSDL chỉ lưu giữ đường dẫn URL và thông tin kích thước, loại tệp. Giải pháp này giúp CSDL giảm dung lượng 99.95% và tốc độ phản hồi đạt mức tức thì (< 0.2s).

### 2. Khó khăn 2: Không thể phát lại tin nhắn thoại trên trình duyệt di động
- **Nguyên nhân:** Thư viện `MediaRecorder` trên trình duyệt web mặc định xuất tệp âm thanh định dạng `audio/webm;codecs=opus`, nhưng khi lưu trữ và tải về qua API Gateway, dịch vụ Document trả về Header `Content-Type: video/webm`, khiến trình phát âm thanh HTML5 `<audio>` của điện thoại iOS/Android từ chối giải mã luồng tiếng.
- **Giải pháp:** Thiết lập hàm chuẩn hóa MIME type `AUDIO_EXT_MAP` tại Document Service, ép kiểu chính xác sang `audio/webm` hoặc `audio/mp4` khi phục vụ file, đồng thời cấu hình cờ `preload="metadata"` và xử lý sự kiện `onLoadedMetadata` chuẩn xác.

### 3. Khó khăn 3: Thư viện xem tài liệu Word trên web (`docx-preview`) bị xung đột hiển thị
- **Nguyên nhân:** Thư viện JavaScript mã nguồn mở `docx-preview` khi parse file Word phức tạp có chứa bảng biểu hoặc header tùy biến sinh ra một khối chữ nhật xám mờ che khuất tiêu đề và làm lệch lề văn bản.
- **Giải pháp:** Gỡ bỏ thư viện `docx-preview`, chuyển hướng sang mô hình thẻ xem trước QuickLook thông minh kết hợp nhúng an toàn dịch vụ Google Docs Viewer trực tuyến. Giảng viên vừa có thể đọc nội dung định dạng gốc sắc nét, vừa có nút tải tệp về máy chỉ bằng 1 cú nhấp chuột.

---

## III. MINH CHỨNG CAM KẾT MÃ NGUỒN GIT

- **Tác giả (Author):** Hồ Anh Vũ (`avanimechannel@gmail.com` – MSSV: 060205013608)
- **Nhánh Git (Branch):** `develop` (Đồng bộ với `origin/develop`)
- **Danh sách 12 Commit chính trong ngày 19/11/2026:**
  1. `c405350`: *fix(preview): replace buggy docx renderer with elegant Apple QuickLook card and embedded online viewer*
  2. `a130996`: *refactor(preview): redesign DocumentPreviewModal with ethereal QuickLook glassmorphic UI and native docx/excel in-browser rendering*
  3. `25b2b0a`: *fix(qgroup): fix voice recording playback, real audio waveform, fix transfer owner action and unify 3-dots menus*
  4. `88dc550`: *feat(qgroup): add DocumentPreviewModal with zoom, compact download icon, pinned conversation sorting, and pinned message chat banner*
  5. `af5268e`: *feat(qgroup): fix uuid upload error, add voice message recording, Slack-style emoji picker, and @mention tagging*
  6. `3fba919`: *fix(qgroup): fix 404 download routing, separate file preview vs download button, and fix 3-dots context menu targeting active DM*
  7. `aa59499`: *fix(qgroup): store attachments on disk, optimize qgroups json from 66MB to 34KB, fix mobile fetch timeout, remove automatic quiz button on general files, add download toast*
  8. `32a3ca4`: *fix(qgroup): make paperclip button directly open file dialog and add separate textbook button*
  9. `bf4dbe0`: *feat(qgroup): modern minimalist chat with real file/media upload, ctrl+v paste, rich markdown code renderer, and fixed desktop sidebar*
  10. `35f2753`: *fix(qgroup): decouple mobile chat active state to enable back button navigation to conversation list*
  11. `edcc81c`: *fix(qgroup): mobile responsive full-width chat with back button and remove duplicate sidebar toggle*
  12. `2a09984`: *refactor(qgroup): streamline message actions to Slack/Teams standard by removing redundant recall button in favor of permanent delete modal*
- **Thống kê biến động dòng mã:** 10 files changed, **+3,149 insertions**, **-580 deletions**.

---

## IV. KẾ HOẠCH NGÀY TIẾP THEO (20/11/2026)

1. Mời giảng viên Bộ môn Mạng & Hệ điều hành Khoa CNTT UTH chạy thử nghiệm UAT trên phân hệ Q-Group và sinh đề thi tự động.
2. Đóng gói hoàn thiện hệ thống bằng Docker Compose môi trường Production (`docker-compose.prod.yml`).
3. Chuẩn bị slide thuyết trình và video demo toàn bộ các tính năng hoàn thành sau 4 tuần nước rút.
