# BÁO CÁO TIẾN ĐỘ CÔNG VIỆC HẰNG NGÀY [SCRUM-96]

**Họ và tên:** Nguyễn Văn Tân  
**Mã số sinh viên (MSSV):** 060205012615  
**Ngày thực hiện:** 16/11/2026  
**Dự án:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Tự động ứng dụng AI  
**Mã nhiệm vụ Jira:** [SCRUM-96]  
**Phạm vi phụ trách:** Tích hợp Database Views [SCRUM-94], Tối ưu hóa Admin Portal UI/UX, Siết chặt Phân quyền RBAC & Cổng Thanh toán VietQR TPBank  
**Nhánh làm việc (Git Branch):** `feature/upload-from-nguyentann-20261030`  
**Trạng thái:** Hoàn thành xuất sắc 100% mục tiêu đề ra  

---

## I. CÔNG VIỆC ĐÃ HOÀN THÀNH

Trong ngày 16/11/2026, toàn bộ công việc được tập trung hoàn thiện theo Sprint Plan cho nhiệm vụ **[SCRUM-96]**:

### 1. Đồng bộ & Tích hợp Mã nguồn Toàn diện Hậu Merge
- Đồng bộ toàn bộ các nhánh làm việc của nhóm (`develop`, `frontend`, `feature/database-architecture`, `feature/exam-service`) vào nhánh làm việc duy nhất: `feature/upload-from-nguyentann-20261030`.
- Giải quyết triệt để lỗi thiếu package `katex` và `react-katex` ở môi trường Frontend, đảm bảo lệnh `npm run build` vượt qua 100% với **0 lỗi TypeScript** (2.068 modules đóng gói tối ưu).
- Đẩy toàn bộ các commit đồng bộ lên remote GitHub `origin/feature/upload-from-nguyentann-20261030`.

### 2. Tích hợp Database Views Phục vụ Admin Portal [SCRUM-94/SCRUM-96]
- Tích hợp và khai thác View `exams.v_bloom_distribution_stats`:
  - Xây dựng endpoint `@app.get("/analytics/bloom-distribution")` trong `admin-service` (cổng 8006).
  - Trích xuất thống kê số lượng và tỷ lệ % phân bổ câu hỏi theo 4 thang đo nhận thức Bloom (Nhận biết, Thông hiểu, Vận dụng, Phân tích) phục vụ biểu đồ Donut Chart và đánh giá tỷ lệ sư phạm chuẩn 40-30-20-10.
- Tích hợp và khai thác View `auth.v_user_activity_summary`:
  - Xây dựng endpoint `@app.get("/users/activity-summary")` trong `admin-service`.
  - Cung cấp dữ liệu tổng hợp 360 độ về số lượng giáo trình tải lên, số đề thi đóng gói, số câu hỏi đã tạo và thời điểm hoạt động gần nhất của từng người dùng với độ trễ phản hồi dưới 5ms.

### 3. Tối ưu Giao diện Admin Portal & Tinh gọn Trải nghiệm Người dùng
- Cập nhật thông tin giám sát Cụm 8 Microservices (cổng 8000–8007) đồng bộ liền mạch trên thẻ KPI và bảng điều hành Admin Portal.
- Kiểm định cửa sổ chi tiết người dùng **User 360 Master-Detail Inspection Modal**: Bố cục 2 cột với menu dọc bên trái (`w-64`) phân tách rõ 7 phân hệ, khu vực hiển thị Workspace bên phải rộng thoáng, loại bỏ hoàn toàn tình trạng thanh gạch vắt ngang và cuộn lồng.
- Đảm bảo các trang chức năng trong Admin Portal sở hữu header riêng biệt, tối ưu không gian làm việc theo góp ý trực quan của người dùng.

### 4. Siết chặt Cơ chế Phân quyền Bảo mật (RBAC Hardening)
- Kiểm định kịch bản bảo vệ phân quyền:
  - Chỉ Quản trị viên tối cao gốc (`quizgen.ai.team@gmail.com`) mới có quyền cấp vai trò Admin hoặc thay đổi quyền của tài khoản Admin khác.
  - Chặn cứng bằng mã lỗi `HTTP 403 Forbidden` đối với bất kỳ tài khoản Sub-Admin nào cố tình nâng quyền hoặc chỉnh sửa phân quyền Admin.
  - Vô hiệu hóa khả năng tự hạ quyền của Quản trị viên tối cao.
- Kiểm tra tính năng **Security Screen Guard**: Tự động chuyển hướng tức thì (0.1s) tài khoản bị hạ quyền từ `admin_portal` về trang Giảng viên (`dashboard`) mà không cần làm mới trình duyệt.

### 5. Nâng cấp Phân hệ Thanh toán VietQR & Quản trị Doanh thu (Payment Service - Port 8007)
- Bổ sung cơ chế tự động quét và chuyển đổi trạng thái các đơn hàng `PENDING` quá hạn 15 phút sang `EXPIRED`.
- Cập nhật endpoint `/admin/overview` và `/orders/history` hỗ trợ lọc theo trạng thái (ALL, PENDING, COMPLETED, EXPIRED) và hiển thị chỉ số `expiredOrders`.
- Khởi tạo đơn hàng VietQR PRO kèm đồng hồ đếm ngược 15 phút (`countdown_seconds: 900`) và mã chuyển khoản tự động nhận diện giao dịch.

### 6. Xây dựng Tập lệnh Kiểm thử Tự động E2E [SCRUM-96]
- Thiết lập tệp kiểm thử tự động `scripts/[SCRUM-96]_test_admin_views_rbac_payment.py` kiểm định 5/5 kịch bản cốt lõi:
  - TEST 1: Gateway & Cụm 8 Microservices Health Check → **PASS**.
  - TEST 2: Database View Bloom Distribution (`exams.v_bloom_distribution_stats`) → **PASS**.
  - TEST 3: Database View User Activity Summary 360° (`auth.v_user_activity_summary`) → **PASS**.
  - TEST 4: Quy tắc bảo mật RBAC (Chỉ Root Admin được cấp quyền Admin) → **PASS**.
  - TEST 5: Payment Service sinh VietQR PRO & Tự động quét đơn quá hạn → **PASS**.
- **Tỷ lệ kiểm thử thành công: 5/5 (100%)**.

---

## II. KHÓ KHĂN VÀ GIẢI PHÁP

### 1. Đồng bộ Database Views giữa hai môi trường PostgreSQL và SQLite
- **Nguyên nhân:** Migration 12 từ nhánh database được viết bằng cú pháp PostgreSQL (`CREATE OR REPLACE VIEW`, schemas `auth.`, `exams.`), trong khi môi trường chạy cục bộ microservices sử dụng các tệp SQLite độc lập (`auth.db`, `exam.db`, `payment.db`).
- **Giải pháp:** Xây dựng cơ chế `init_database_views()` trong `admin-service` để tự động khởi tạo View tương đương trên SQLite, đồng thời cung cấp hàm trích xuất đa CSDL trả về cấu trúc chuẩn xác theo đúng quy chuẩn đặc tả của Migration 12.

### 2. Kiểm soát đơn hàng thanh toán treo (Stale Orders) gây sai lệch báo cáo tài chính
- **Nguyên nhân:** Người dùng khởi tạo mã QR thanh toán nhưng không chuyển khoản dẫn đến hàng loạt đơn hàng ở trạng thái `PENDING` kéo dài, làm sai lệch chỉ số đối soát doanh thu.
- **Giải pháp:** Tích hợp logic tự động cập nhật đơn quá hạn (`status = 'EXPIRED'`) ngay khi gọi API `/admin/overview` hoặc `/orders/history` dựa trên mốc thời gian `expires_at < now()`, giúp dữ liệu đối soát luôn tức thời và minh bạch.

---

## III. KIỂM TRA VÀ KẾT QUẢ

- **Frontend Build (`npm run build`):** Đóng gói thành công trong 9.30s, 2.068 modules transformed, **0 lỗi cú pháp / typecheck**.
- **Microservices Health:** 8/8 dịch vụ hoạt động ổn định trên các cổng:
  - Port 8000: API Gateway
  - Port 8001: Auth Service (Multi-role RBAC, Token Refresh)
  - Port 8002: Document Service (Upload & RAG preprocessing)
  - Port 8003: RAG Service (ChromaDB Vector Retrieval)
  - Port 8004: AI Service (Gemini Bloom generation)
  - Port 8005: Exam Service (Question Bank & Exam Builder)
  - Port 8006: Admin Service (User 360, DB Views, RBAC Enforcement)
  - Port 8007: Payment Service (VietQR TPBank, PayOS PRO, Plan Management)
- **Kiểm thử tự động:** `scripts/[SCRUM-96]_test_admin_views_rbac_payment.py` đạt **5/5 PASS (100%)**.

---

## IV. MINH CHỨNG (EVIDENCE - LINK COMMIT GIT)

*(Tuân thủ quy định: Dẫn link trực tiếp tới nhánh làm việc, danh sách commit trên GitHub và nhiệm vụ Jira tương ứng).*

- **Đường dẫn nhánh làm việc Git (Branch URL):**  
  [https://github.com/HoAnhVu05/quizgen-ai/tree/feature/upload-from-nguyentann-20261030](https://github.com/HoAnhVu05/quizgen-ai/tree/feature/upload-from-nguyentann-20261030)

- **Đường dẫn nhiệm vụ Atlassian Jira:**  
  [https://ut-team-quizgen-ai.atlassian.net/browse/SCRUM-96](https://ut-team-quizgen-ai.atlassian.net/browse/SCRUM-96)

- **Danh sách link các Commit thực hiện trong ngày (GitHub Commits):**
  1. **Commit `5954e24`:** [https://github.com/HoAnhVu05/quizgen-ai/commit/5954e24](https://github.com/HoAnhVu05/quizgen-ai/commit/5954e24)  
     *Nội dung:* `[SCRUM-96] feat: tich hop database views, siet chat RBAC admin va tu dong quet het han don VietQR`
  2. **Commit `9f3f139`:** [https://github.com/HoAnhVu05/quizgen-ai/commit/9f3f139](https://github.com/HoAnhVu05/quizgen-ai/commit/9f3f139)  
     *Nội dung:* `[SCRUM-86] chore: update package-lock after merging KaTeX dependencies from develop`

- **Tệp kiểm thử tự động:**  
  [scripts/[SCRUM-96]_test_admin_views_rbac_payment.py](./scripts/[SCRUM-96]_test_admin_views_rbac_payment.py)

---

## V. TỆP VÀ THAM CHIẾU LIÊN QUAN

- [Admin Service Main](./services/admin-service/src/main.py)
- [Payment Service Main](./services/payment-service/src/main.py)
- [Admin Portal Screen](./src/components/AdminPortalScreen.tsx)
- [Payment QR Modal](./src/components/PaymentQRModal.tsx)
- [Migration 12 Database Views & Triggers](./database/migrations/12_[SCRUM-94]_views_and_cascade_cleanup_triggers.sql)
- [App Component](./src/App.tsx)
