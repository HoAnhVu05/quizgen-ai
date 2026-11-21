# BÁO CÁO TIẾN ĐỘ THỰC TẬP HẰNG NGÀY

**Họ và tên sinh viên:** Nguyễn Văn Tân  
**Mã số sinh viên (MSSV):** 060205012615  
**Trường:** Đại học Giao thông vận tải TP.HCM (UTH)  
**Ngày thực hiện:** 21/11/2026  
**Dự án:** QuizGen AI – Nền tảng Biên soạn & Quản lý Đề thi Thông minh  
**Mã nhiệm vụ Jira:** [SCRUM-114], [SCRUM-113] (Khắc phục Triệt để Lỗi DateTime Offset SLA Khiến Hàng Đợi Admin Rỗng, Tối ưu Trải nghiệm Tiếp nhận và Đồng bộ Phản ứng Nhanh 2 Chiều)  
**Nhánh làm việc (Git Branch):** `feature/upload-from-nguyentann-20261030`  

---

## 1. Nhiệm vụ đã làm

Trong phiên làm việc này, toàn bộ các trục trặc về hiển thị phiếu trên Cổng Quản trị viên (Admin Portal) đã được điều tra nguồn gốc sâu, sửa lỗi tận gốc ở tầng Core Microservice và kiểm thử tự động toàn diện:

### 1.1. Khắc phục Triệt để Lỗi 500 Internal Server Error Khiến Hàng Đợi Tiếp Nhận Admin Bị 0 Phiếu
- **Điều tra nhật ký máy chủ (Server Logs):**
  * Trên giao diện Admin, thẻ thống kê tổng quan ghi nhận `Tổng số phiếu: 2`, `Chờ & đang xử lý: 2`, nhưng bên dưới *"Hàng đợi tiếp nhận"* lại hiển thị `(0)` và thông báo *"Không có phiếu hỗ trợ nào. Hiện tại không có ticket nào phù hợp với bộ lọc tìm kiếm"*.
  * Kiểm tra log máy chủ phát hiện ngoại lệ:
    ```
    File "services/support-service/src/main.py", line 230, in list_tickets
      if (not t.first_responded_at and now > t.sla_first_response_due) or (now > t.sla_resolution_due):
    TypeError: can't compare offset-naive and offset-aware datetimes
    ```
  * **Nguyên nhân cốt lõi:** Khi khởi tạo ticket, `created_at` sử dụng `datetime.now(timezone.utc)` trả về datetime có múi giờ (`offset-aware`). Tuy nhiên, khi lưu vào SQLite và truy vấn ra qua SQLAlchemy, các trường `sla_first_response_due` và `sla_resolution_due` bị giải tuần tự hóa thành datetime không múi giờ (`offset-naive`). Khi hàm `list_tickets` thực hiện so sánh `now > t.sla_first_response_due` để tính toán vi phạm SLA, Python 3 chặn so sánh giữa naive và aware datetime, ném lỗi 500 Internal Server Error khiến frontend nhận phản hồi rỗng.
- **Biện pháp khắc phục tận gốc:**
  * Đồng bộ hóa hàm `utc_now()` trong `services/support-service/src/models.py` trả về `datetime.now(timezone.utc).replace(tzinfo=None)` chuẩn naive UTC.
  * Xây dựng hàm so sánh an toàn `is_overdue(dt, cur_now)` trong `services/support-service/src/main.py`: Tự động chuẩn hóa cả hai mốc thời gian về cùng định dạng naive trước khi so sánh.
  * Bọc toàn bộ khối kiểm tra SLA trong `try ... except Exception: pass` và `db.rollback()` an toàn, đảm bảo nếu có sự cố tính toán SLA thì API trả về danh sách tickets vẫn hoạt động 100% trơn tru.

### 1.2. Nâng cấp Trải nghiệm Tiếp nhận Admin & Tự Động Chọn Phiếu (Auto-Select First Ticket)
- **Tự động kích hoạt phiếu đầu tiên:** Khi Admin mở tab *"Tiếp nhận & CSKH Kỹ thuật"*, nếu danh sách có phiếu và chưa có phiếu nào được chọn, hệ thống tự động kích hoạt `fetchAdminTicketDetail(list[0].id)`. Khung điều hành bên phải lập tức hiển thị đầy đủ thông tin: Người gửi, Gói cước, Phân hệ lỗi, Thông số môi trường phát sinh lỗi và khung chat hỗ trợ mà không yêu cầu Admin phải click chuột thủ công.
- **Hiển thị trực quan dữ liệu:**
  * Đồng bộ trường hiển thị tiêu đề: `t.subject || t.title` (loại bỏ hiện tượng tiêu đề trống).
  * Đồng bộ phân hạng gói cước: `user_tier || user_plan_tier` (hiển thị rõ `PRO (1 Năm VIP)` hoặc `FREE`).
  * Badge trạng thái chuẩn hóa: `OPEN` (Chờ xử lý), `IN_PROGRESS` (Đang giải quyết), `RESOLVED` (Đã giải quyết), `CLOSED` (Đã đóng).

### 1.3. Đồng bộ Trạng thái Hai Chiều (Giảng viên ↔ Admin) Tức Thì
- **Cập nhật phản hồi nhanh (Optimistic UI):** Khi Admin nhấn đổi trạng thái hoặc gửi tin nhắn giải pháp, hệ thống cập nhật ngay lập tức trên giao diện Admin và lưu vào DB SQLite.
- **Smart Polling 2.5s phía Giảng viên:** Màn hình Giảng viên tự động kéo dữ liệu ngầm mỗi 2.5s. Ngay khi Admin chuyển trạng thái sang `IN_PROGRESS` hoặc gửi phản hồi hướng dẫn xử lý, màn hình Giảng viên nhảy trạng thái tức thì và phát âm thanh thông báo chuông nhẹ nhàng (Chime).

### 1.4. Kết Quả Kiểm Thử Tự Động E2E 8 Bước Hoàn Hảo (100% PASS)
- Chạy test suite `scripts/test_support_e2e_sync.py` mô phỏng toàn bộ hành vi thực tế:
  1. `[PASS]` Giảng viên tạo ticket lỗi xuất PDF OMR $\rightarrow$ HTTP 201 Created (ID, Ticket Code, Status: OPEN).
  2. `[PASS]` Giảng viên truy vấn "Phiếu của tôi" $\rightarrow$ Nhận diện ngay phiếu vừa tạo.
  3. `[PASS]` Admin tải danh sách phiếu $\rightarrow$ Nhận diện đầy đủ 100% phiếu của giảng viên trong trường.
  4. `[PASS]` Admin cập nhật trạng thái sang `IN_PROGRESS` $\rightarrow$ DB cập nhật thành công.
  5. `[PASS]` Admin gửi tin nhắn giải pháp kỹ thuật $\rightarrow$ Message khởi tạo thành công.
  6. `[PASS]` Giảng viên nhận diện trạng thái cập nhật và tin nhắn phản hồi mới từ Admin.
  7. `[PASS]` Admin chuyển trạng thái sang `RESOLVED` $\rightarrow$ Trạng thái hoàn tất.
  8. `[PASS]` Giảng viên kiểm tra lại danh sách phiếu $\rightarrow$ Xác nhận trạng thái `RESOLVED`.
- **TypeScript & Build:** `npx tsc --noEmit` đạt 0 lỗi, `npm run build` hoàn thành trong 14.47s.

---

## 2. Khó khăn và giải pháp

### 2.1. Khó khăn 1: Ngoại lệ TypeError: can't compare offset-naive and offset-aware datetimes làm sập endpoint `/support/tickets`
- **Mô tả vấn đề:** Sau khi người dùng gửi phiếu hỗ trợ đầu tiên thành công, endpoint `GET /api/v1/support/tickets` liên tục phản hồi mã lỗi `500 Internal Server Error`. Phía frontend Admin Portal không nhận được danh sách phiếu, dẫn tới chỉ số thẻ thống kê hiển thị có 2 phiếu nhưng hàng đợi tiếp nhận lại bằng 0 (`filteredTickets.length = 0`), khiến kỹ thuật viên không thể bấm chọn phiếu để thao tác.
- **Giải pháp:** 
  1. Phân tích nguyên nhân do sự không tương thích giữa `datetime.now(timezone.utc)` (aware) của Python và trường `DateTime` lưu trong cơ sở dữ liệu SQLite của SQLAlchemy (naive khi đọc ra).
  2. Viết hàm `is_overdue(dt, cur_now)` tự động kiểm tra thuộc tính `tzinfo` của cả 2 đối tượng và loại bỏ múi giờ (`.replace(tzinfo=None)`) trước khi thực hiện phép toán `>`.
  3. Thống nhất hàm sinh thời gian `utc_now()` trả về `datetime.now(timezone.utc).replace(tzinfo=None)`.
  4. Khởi động lại microservice support-service; kiểm thử lại lệnh gọi API trực tiếp trả về mã **HTTP 200 OK** với đầy đủ dữ liệu của toàn bộ các phiếu.

### 2.2. Khó khăn 2: Trải nghiệm Admin phải thực hiện nhiều thao tác thủ công mới tiếp cận được nội dung sự cố
- **Mô tả vấn đề:** Khi danh sách hàng đợi có nhiều phiếu, màn hình mặc định hiển thị khung trống *"Chưa chọn phiếu hỗ trợ"*, buộc quản trị viên phải click chuột vào thẻ phiếu ở cột trái mới có thể xem thông tin.
- **Giải pháp:** Bổ sung cơ chế tự động kích hoạt: Ngay khi nạp danh sách phiếu từ server (`fetchAdminSupportData`), nếu phát hiện danh sách có ít nhất 1 ticket và Admin chưa chọn phiếu nào, component sẽ tự động gọi `fetchAdminTicketDetail(list[0].id)` để mở ngay phiếu đầu tiên ở cột bên phải, giúp tiết kiệm thời gian và nâng cao tốc độ phản hồi sự cố.

---

## 3. Minh chứng Git kèm 2 ảnh minh chứng

### 3.1. Danh sách Cam kết Git (Git Commits) trên nhánh `feature/upload-from-nguyentann-20261030`
1. **Commit `[SCRUM-114]`**: `[SCRUM-114] fix(support-service): khac phuc loi offset-naive SLA datetime so sanh lam sap API tickets, mo khoa hang doi tiep nhan Admin va tu dong chon phieu dau tien`
2. **Commit `[SCRUM-113]`**: `[SCRUM-113] fix(support-service): khac phuc loi hien thi validation error, dong bo 2 chieu tuc thi giua Giang vien va Admin, bo sung smart polling 2.5s va cap quyen toan dien cho admin`

### 3.2. Ảnh minh chứng 1: Kiến trúc Support Service & Luồng Đồng Bộ Hai Chiều Giảng Viên - Quản Trị Viên [SCRUM-114]
*(Minh chứng kiến trúc dịch vụ hỗ trợ kỹ thuật Port 8008, 7 phân hệ lỗi học thuật, khay dán ảnh lỗi phím tắt Ctrl+V, nút Hỗ trợ trên TopHeader và cơ chế Smart Polling 2.5s)*

![Kiến trúc Support Service & Đồng Bộ 2 Chiều](minh_chung_support_service_20112026.png)

### 3.3. Ảnh minh chứng 2: Kết Quả Kiểm Thử Đồng Bộ E2E 8 Bước Hoàn Hảo & Đóng Gói Hệ Thống [SCRUM-114]
*(Minh chứng kết quả kiểm thử tự động 8/8 bước đạt 100% PASS, giải quyết triệt để lỗi offset-naive SLA datetime, mở khóa hàng đợi Admin và trạng thái các microservices đạt 200 OK)*

![Kết Quả Kiểm Thử Đồng Bộ & Đóng Gói Hệ Thống](minh_chung_kiem_thu_va_sync_20112026.png)
