# BÁO CÁO TIẾN ĐỘ CÔNG VIỆC HẰNG NGÀY

**Tên tệp báo cáo:** `060205012615_NguyenVanTan_DocumentRAGVaAdminPortalSCRUM82.md`  
**Họ và tên:** Nguyễn Văn Tân  
**Mã số sinh viên (MSSV):** 060205012615  
**Ngày thực hiện:** 13/11/2026  
**Dự án:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Tự động ứng dụng AI  
**Phạm vi phụ trách:** Document Service, RAG Service, Admin Service & Admin Portal UI  
**Mã nhiệm vụ Jira:** [SCRUM-82] (Admin Service & Admin Portal), [SCRUM-70] (Document & RAG Service)  
**Nhánh làm việc (Git Branch):** `feature/upload-from-nguyentann-20261030`  
**Mã Commit chính thức:** `df390ba`, `b392767`  

---

## I. CÔNG VIỆC ĐÃ HOÀN THÀNH (VIỆC ĐÃ LÀM)

Trong ngày làm việc hôm nay (13/11/2026), toàn bộ tiến độ triển khai được tập trung chuyên sâu và hoàn thành xuất sắc đúng phạm vi nhiệm vụ được phân công: **Document Service**, **RAG Service**, **Admin Service** (microservice mới độc lập trên cổng 8006) và **Admin Portal UI** (tinh gọn giao diện, loại bỏ 100% dữ liệu giả lập, tích hợp quản trị khóa/mở khóa thời gian thực và thanh tra người dùng 360 độ). Toàn bộ mã nguồn đã vượt qua kiểm thử tích hợp 10/10 kịch bản (100% PASS) và đã được đồng bộ lên nhánh Git `feature/upload-from-nguyentann-20261030`.

### 1. Document Service (Cổng 8002) — Chuẩn hóa bóc tách giáo trình & phân quyền xóa tài liệu
- **Khắc phục triệt để lỗi phân quyền khi xóa giáo trình:**
  - Sửa lỗi giảng viên tải tài liệu lên nhưng không thể xóa được do lỗi kiểm tra chéo quyền tác quyền giữa mã người dùng trong phiên và `user_id` trong cơ sở dữ liệu `documents.db`.
  - Cập nhật cơ chế xác thực quyền sở hữu: cho phép giảng viên xóa chính xác các tài liệu/giáo trình do mình tải lên (`user_id` khớp hoặc quyền Admin/Trưởng bộ môn hợp lệ).
  - Tự động dọn dẹp các phân đoạn dữ liệu (`document_chunks`) và chỉ mục ngữ cảnh liên quan khi giáo trình bị xóa, bảo đảm tính toàn vẹn dữ liệu.
- **Duy trì ổn định pipeline tiền xử lý và lọc nhiễu:**
  - Vận hành thuật toán lọc tiêu đề chạy/chân trang (`Running Headers & Footers`) tần suất $\ge 40\%$ số trang.
  - Bộ lọc số trang biệt lập (`PAGE_NUMBER_REGEX`) ngăn ngừa phân mảnh văn bản.
  - Bóc tách cấu trúc bảng Word DOCX sang chuẩn Markdown Table (`| Cột 1 | Cột 2 |`) có mã hóa an toàn ký tự đặc biệt.

### 2. RAG Service (Cổng 8003) — Kiểm chuẩn chất lượng ngữ cảnh truy vấn và cam kết SLA
- **Duy trì và tối ưu thuật toán đa dạng hóa ngữ cảnh MMR Diversity Re-ranking:**
  - Thực thi công thức: $\text{MMR} = \text{argmax} [ \lambda \cdot \text{Sim}_1(c_i, Q) - (1 - \lambda) \cdot \max \text{Sim}_2(c_i, c_j) ]$ với $\lambda = 0.75$.
  - Triệt tiêu hiện tượng trùng lặp đoạn văn khi trích xuất tài liệu dài, mang lại nguồn ngữ cảnh phong phú, chuẩn xác cho quá trình sinh câu hỏi theo thang đo Bloom.
- **Mở rộng cửa sổ ngữ cảnh lân cận (`expand_context=true`):** Tự động liên kết các đoạn văn liền trước và liền sau trong cùng chương/trang, giúp bảo toàn tính liên tục ngữ nghĩa của bài giảng.
- **Cam kết SLA thời gian đáp ứng thực tế:** Đo lường truy vấn thực tế đạt độ trễ cực nhanh **< 40 ms**, đáp ứng vượt trội tiêu chuẩn SLA hệ thống (< 200 ms).

### 3. Xây dựng mới hoàn toàn Admin Service (Cổng 8006) — 100% Real Database, Zero Mock
Nhằm tách bạch hoàn toàn logic quản trị cấp cao khỏi các dịch vụ nghiệp vụ, đã xây dựng độc lập microservice `services/admin-service/src/main.py` trên cổng 8006 với 10 API RESTful kết nối trực tiếp 4 cơ sở dữ liệu thực tế SQLite (`auth.db`, `documents.db`, `exam.db`, `admin.db`):
- `GET /overview`: Tổng hợp các chỉ số KPI thực tế toàn trường (tổng tài khoản, tài khoản hoạt động/bị khóa, số lượng giáo trình, ngân hàng câu hỏi, đề thi đã duyệt, cảnh báo an ninh).
- `GET /users`: Truy vấn danh sách người dùng thực tế từ `auth.db`, phản ánh chính xác trạng thái khóa, vai trò và thông tin cá nhân.
- `POST /users/{id}/lock`: Khóa tài khoản có lý do bắt buộc và hẹn giờ tự động mở khóa (hỗ trợ tùy chọn khóa tạm thời 1h/24h/7d/30d hoặc khóa vĩnh viễn). Tức thì thu hồi toàn bộ token đăng nhập trong bảng `user_tokens`.
- `POST /users/{id}/unlock`: Mở khóa tài khoản ngay lập tức bất cứ lúc nào, xóa sạch trạng thái phong tỏa.
- `PUT /users/{id}/role`: Phân quyền động vai trò người dùng (Admin, Trưởng bộ môn, Giảng viên).
- `DELETE /users/{id}`: Xóa tài khoản người dùng (có cơ chế bảo vệ tối cao: cấm tuyệt đối xóa hoặc hạ quyền tài khoản quản trị viên chính `quizgen.ai.team@gmail.com`).
- `GET /users/{user_id}/details`: **API Thanh tra Hoạt động Người dùng 360 độ (Nút Con Mắt)** — Tổng hợp toàn diện mọi dấu vết hoạt động của người dùng từ cả 4 cơ sở dữ liệu:
  - Thông tin hồ sơ & cơ sở đào tạo.
  - Danh sách toàn bộ tài liệu/giáo trình đã tải lên (tên tệp, dung lượng, số trang, số chương, trạng thái bóc tách).
  - Lịch sử tạo câu hỏi trắc nghiệm (nội dung câu hỏi, mức độ Bloom, độ tin cậy AI, đáp án).
  - Lịch sử biên soạn và xuất bản đề thi (mã đề, môn thi, thời lượng, định dạng in ấn).
  - Lịch sử các phiên đăng nhập và thiết bị truy cập.
  - Nhật ký kiểm toán an ninh chi tiết liên quan đến tài khoản đó.
- `GET /services/health`: Ping kiểm tra trực tiếp trạng thái trực tuyến của toàn bộ 7 microservices trong hệ sinh thái.
- `GET /exams/compliance`: Báo cáo tuân thủ khảo thí thực tế từ `exam.db`.
- `GET /audit/logs`: Truy vấn nhật ký an ninh hệ thống thời gian thực từ `admin.db`.

### 4. Nâng cấp Giao diện Quản trị viên (Admin Portal UI) & Cơ chế Cưỡng chế Khóa Tức thì
- **Loại bỏ 100% dữ liệu giả lập (Zero Mock Data):** Toàn bộ bảng dữ liệu, chỉ số KPI, danh sách tài khoản và nhật ký đều được tải trực tiếp từ các API của Admin Service.
- **Bộ điều khiển Khóa/Mở khóa tài khoản nâng cao:**
  - Modal khóa chuyên nghiệp với ô nhập lý do bắt buộc và bộ chọn thời gian tự động mở khóa linh hoạt (presets: 1 giờ, 24 giờ, 7 ngày, 30 ngày hoặc chọn ngày giờ tùy ý bằng date-time picker).
  - Nút Mở khóa 1-chạm thao tác tức thì.
- **Tích hợp nút "Con Mắt" (Thanh tra 360 độ):** Đặt cạnh từng tài khoản trong danh sách. Khi Admin nhấn vào sẽ kích hoạt Modal Thanh tra đa chiều với 6 tab con: Hồ sơ cá nhân, Kho tài liệu đã nạp, Lịch sử sinh câu hỏi, Kho đề thi đã biên tập, Phiên đăng nhập, Nhật ký an ninh.
- **Cơ chế Cưỡng chế Khóa Tức thì (Immediate Lockdown Enforcement):**
  - **Phía Backend (`auth-service`):** Bổ sung hàm tiền xử lý `check_user_lock_or_raise()`. Mọi nỗ lực gọi `/login` của tài khoản đang bị khóa đều bị chặn với mã **HTTP 403 Forbidden** kèm lý do và thời điểm dự kiến mở khóa.
  - **Phía Client Heartbeat (`App.tsx` & `apiClient.ts`):** Thiết lập cơ chế kiểm tra nhịp tim (Heartbeat) định kỳ mỗi 3.5 giây tới `/auth/me`. Khi Admin thực hiện khóa, tài khoản của người dùng lập tức nhận phản hồi 403, kích hoạt sự kiện `quizgen:account-locked`, hiện popup thông báo rõ ràng: *"Tài khoản của bạn đã bị tạm khóa / khóa vĩnh viễn với lý do: [Lý do] - Dự kiến mở khóa: [Thời gian]"* và ngay lập tức tự động đăng xuất ra khỏi hệ thống.
- **Tinh gọn giao diện Admin Portal theo góp ý người dùng:**
  - Loại bỏ hoàn toàn huy hiệu màu đỏ *"TRUNG TÂM QUẢN TRỊ HỆ THỐNG TỐI CAO (SUPER ADMIN)"* và huy hiệu *"Zero Mock Data"* ở phần tiêu đề đầu trang.
  - Đổi tên tab chính từ *"Tổng quan & Chỉ số Tối cao"* thành *"Tổng quan"*.
  - Lược bỏ từ ngữ "tối cao" mang tính hình thức, chuẩn hóa giao diện trực quan, tinh gọn, chuyên nghiệp.
  - Loại bỏ tab *"Bảo mật & Cấu hình 2FA"* khỏi thanh điều hướng tab, giữ nút *"Kiểm tra Sức khỏe Cụm 7 Services"* ở vị trí nổi bật tại thanh tác vụ phía trên.

---

## II. KẾT QUẢ ĐẠT ĐƯỢC VÀ CHỈ SỐ KỸ THUẬT

| STT | Thành phần / Dịch vụ | Kết quả đạt được | Trạng thái kỹ thuật |
| :---: | :--- | :--- | :---: |
| 1 | **Document Service** (Port 8002) | Phân quyền xóa tài liệu theo chính chủ, dọn sạch chunks mồ côi | ✅ Hoàn thành 100% |
| 2 | **RAG Service** (Port 8003) | Thuật toán MMR Diversity Re-ranking, SLA trích xuất ngữ cảnh < 40ms | ✅ Đạt SLA (< 200ms) |
| 3 | **Admin Service** (Port 8006) | Viết mới hoàn toàn 10 API RESTful quản trị kết nối 4 database thực tế SQLite | ✅ Hoàn thành 100% |
| 4 | **API Gateway** (Port 8000) | Cấu hình định tuyến proxy `/api/v1/admin/*` trỏ về cổng 8006 | ✅ Hoàn thành 100% |
| 5 | **Admin Portal UI** | Bảng điều hành thực, modal khóa hẹn giờ, nút con mắt 360°, tinh gọn giao diện | ✅ Hoàn thành 100% |
| 6 | **Cơ chế Cưỡng chế Khóa** | Heartbeat 3.5s + HTTP 403 interceptor thu hồi token và đăng xuất tức thì | ✅ Hoàn thành 100% |
| 7 | **Kiểm thử Tích hợp** | Chạy kịch bản `test_admin_lock_flow.py` đạt 10/10 kịch bản thành công | ✅ PASS 100% |
| 8 | **Build Frontend** | TypeScript & Vite build: 2053 modules, 445.42 kB, 0 lỗi biên dịch | ✅ PASS 100% |

---

## III. KHÓ KHĂN GẶP PHẢI VÀ GIẢI PHÁP

1. **Khó khăn 1: Không đồng nhất định dạng mã người dùng (`user_id`) giữa các cơ sở dữ liệu**
   - *Mô tả vấn đề:* Trong `documents.db`, mã người dùng được lưu theo định dạng `usr-lec-001`, trong khi ở `exam.db` bảng đề thi lại được lưu rút gọn thành `lec-001`. Khi xây dựng API xem 360 độ (`GET /users/{id}/details`), hệ thống bị thiếu dữ liệu đề thi của giảng viên.
   - *Giải pháp:* Xây dựng cơ chế chuẩn hóa danh sách định danh tương đương (`alias list`) bên trong Admin Service. Tự động truy vấn trên tập các mã tương đương giúp tổng hợp trọn vẹn 100% tài liệu, câu hỏi và đề thi mà không làm xáo trộn cấu trúc CSDL hiện hữu.

2. **Khó khăn 2: Trả mã trạng thái HTTP khi tài khoản bị khóa chưa đúng chuẩn**
   - *Mô tả vấn đề:* Ban đầu `auth-service` trả về mã lỗi 401 Unauthorized khi tài khoản bị khóa, khiến phía giao diện nhầm lẫn với lỗi sai mật khẩu thông thường và không hiển thị được lý do bị khóa cho người dùng.
   - *Giải pháp:* Sắp xếp lại luồng kiểm tra trong API `/login`: sau khi tìm thấy tài khoản theo email, hệ thống gọi hàm `check_user_lock_or_raise()` để kiểm tra cờ khóa trước khi thẩm định mật khẩu. Nếu đang bị khóa, trả về ngay mã **HTTP 403 Forbidden** kèm thông điệp chi tiết về nguyên nhân và thời gian mở khóa.

3. **Khó khăn 3: Đồng bộ trạng thái khóa tài khoản tức thì mà không cần người dùng tải lại trang**
   - *Mô tả vấn đề:* Nếu người dùng đang làm việc trong phiên đăng nhập hợp lệ, việc Admin khóa tài khoản ở backend sẽ không có tác dụng ngay cho đến khi token hết hạn (sau nhiều giờ).
   - *Giải pháp:* Thiết lập chu kỳ Heartbeat mỗi 3.5 giây tại component gốc `App.tsx` gọi tới endpoint `/auth/me`. Khi tài khoản bị khóa, request này nhận mã 403 ngay lập tức; Axios Interceptor bắt sự kiện và phát tín hiệu `quizgen:account-locked` hiển thị modal cảnh báo cưỡng chế đăng xuất trong vòng chưa đầy 4 giây.

---

## IV. MINH CHỨNG (EVIDENCE)

- **Đường dẫn nhánh làm việc Git (Branch URL):**  
  [https://github.com/HoAnhVu05/quizgen-ai/tree/feature/upload-from-nguyentann-20261030](https://github.com/HoAnhVu05/quizgen-ai/tree/feature/upload-from-nguyentann-20261030)

- **Đường dẫn các Commit thực hiện trên nhánh:**  
  1. Commit `df390ba`: `[SCRUM-82] feat(admin): Hoan thien Admin Service, Real Data 100%, Nut mat 360 do hoat dong user va cuong che khoa tuc thi`  
  2. Commit `b392767`: `[SCRUM-82] fix(admin): Lam gon UI - bo badge do, bo tab 2FA, doi nhan Tong quan`

- **Đường dẫn nhiệm vụ Atlassian Jira:**  
  - Jira SCRUM-82 (Admin Service & Admin Portal Management): [https://ut-team-quizgen-ai.atlassian.net/browse/SCRUM-82](https://ut-team-quizgen-ai.atlassian.net/browse/SCRUM-82)  
  - Jira SCRUM-70 (Document Service & RAG Service Pipeline): [https://ut-team-quizgen-ai.atlassian.net/browse/SCRUM-70](https://ut-team-quizgen-ai.atlassian.net/browse/SCRUM-70)

---

## V. HÌNH ẢNH MINH CHỨNG THỰC TẾ & KẾT QUẢ KIỂM THỬ

### 1. Sơ đồ Kiến trúc Admin Service & Luồng Cưỡng chế Khóa Tức thì
- **Tệp hình ảnh:** `kien_truc_admin_service_13112026.png` (Được tạo tự động và lưu trữ tại thư mục gốc dự án).
- **Ý nghĩa minh chứng:** Thể hiện luồng giao tiếp giữa React Frontend (`App.tsx`, `AdminPortalScreen`, `LoginScreen`), API Gateway (Cổng 8000), Auth Service (Cổng 8001), Admin Service độc lập (Cổng 8006) kết nối trực tiếp 4 cơ sở dữ liệu thực tế (`auth.db`, `documents.db`, `exam.db`, `admin.db`) cùng chu trình cưỡng chế khóa tài khoản qua Heartbeat 3.5s.

### 2. Bảng Kết quả Kiểm thử Tích hợp Tự động (10/10 Kịch bản PASS 100%)
- **Tệp hình ảnh:** `minh_chung_kiem_thu_admin_13112026.png` (Được tạo tự động và lưu trữ tại thư mục gốc dự án).
- **Bảng chi tiết các ca kiểm thử:**
  - **TC-01:** Đăng nhập tài khoản bình thường (email + password đúng) $\rightarrow$ `HTTP 200 OK + JWT tokens` (PASS).
  - **TC-02:** Đăng nhập khi tài khoản đang bị khóa tạm thời $\rightarrow$ `HTTP 403 Forbidden + {reason, locked_until}` (PASS).
  - **TC-03:** Admin thực hiện khóa tài khoản 24h qua Admin Service $\rightarrow$ `HTTP 200 OK + Cập nhật CSDL` (PASS).
  - **TC-04:** Heartbeat `/auth/me` phát hiện tài khoản bị khóa $\rightarrow$ `HTTP 403 + Event force logout` (PASS).
  - **TC-05:** Admin mở khóa tài khoản bất cứ lúc nào $\rightarrow$ `HTTP 200 OK + Xóa sạch cờ khóa` (PASS).
  - **TC-06:** Đăng nhập lại thành công sau khi mở khóa $\rightarrow$ `HTTP 200 OK + Cấp JWT mới` (PASS).
  - **TC-07:** Xem 360 độ hoạt động người dùng (Nút con mắt) $\rightarrow$ `HTTP 200 + Dữ liệu gộp 4 DB` (PASS).
  - **TC-08:** Truy vấn danh sách tài khoản thực từ `auth.db` $\rightarrow$ `HTTP 200 + Dữ liệu thật 100%` (PASS).
  - **TC-09:** Ping kiểm tra sức khỏe cụm microservices $\rightarrow$ `7/7 services phản hồi HTTP 200` (PASS).
  - **TC-10:** Kiểm tra tính toàn vẹn mã nguồn Frontend $\rightarrow$ `tsc && vite build: 0 lỗi biên dịch` (PASS).

### 3. Giao diện Cổng Quản trị Thực tế Đã Tinh Gọn (Admin Portal Screen)
- **Tệp hình ảnh minh họa:** `minh_chung_kiem_thu_11112026.png` / Chụp từ trình duyệt tại `http://localhost:3000`.
- **Ý nghĩa minh chứng:** Giao diện quản trị sau khi tinh gọn: bỏ badge đỏ hình thức, bỏ tab 2FA, chuẩn hóa nhãn tab thành "Tổng quan", bảng danh sách người dùng hiển thị đầy đủ nút "Con Mắt" xem lịch sử 360 độ, nút Khóa tài khoản (mở modal hẹn giờ) và nút Mở khóa nhanh chóng.
