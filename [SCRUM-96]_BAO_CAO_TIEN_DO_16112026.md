# BÁO CÁO TIẾN ĐỘ CÔNG VIỆC [SCRUM-96]

**Dự án:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Tự động ứng dụng AI  
**Mã nhiệm vụ (Jira Issue):** [SCRUM-96]  
**Ngày thực hiện:** 16/11/2026  
**Người thực hiện:** Nguyễn Văn Tân (MSSV: 060205012615)  
**Phạm vi phụ trách:** Admin Service (Database Views & Phân quyền RBAC), Payment Service (VietQR TPBank), Tối ưu hóa UI/UX Admin Portal  
**Nhánh Git:** `feature/upload-from-nguyentann-20261030`  
**Trạng thái:** Hoàn thành xuất sắc 100% mục tiêu đề ra  

---

## ⚡ 1. CÁC CÔNG VIỆC ĐÃ HOÀN THÀNH TRONG NGÀY (DAILY SUMMARY)

### 📌 1.1. Đồng bộ Mã nguồn & Đảm bảo Build Frontend Hoàn hảo Hậu Merge
- Đồng bộ toàn bộ các cập nhật từ các nhánh nhóm vào nhánh `feature/upload-from-nguyentann-20261030`.
- Xử lý hoàn toàn dependency `react-katex`, `katex` giúp `npm run build` đạt kết quả tối ưu **0 lỗi cú pháp**, chuyển đổi thành công 2.068 modules.

### 📌 1.2. Tích hợp Database Views [SCRUM-94] vào Admin Service
- Triển khai endpoint `/analytics/bloom-distribution` khai thác view `exams.v_bloom_distribution_stats`, trả về chính xác số lượng và tỷ lệ % câu hỏi theo thang nhận thức Bloom (Nhận biết, Thông hiểu, Vận dụng, Phân tích) và chuẩn sư phạm 40-30-20-10.
- Triển khai endpoint `/users/activity-summary` khai thác view `auth.v_user_activity_summary`, cung cấp bức tranh 360 độ hoạt động người dùng (số tài liệu, số đề thi, số câu hỏi, thời gian hoạt động).

### 📌 1.3. Nâng cấp Giao diện Admin Portal & User 360 Inspection Modal
- Cập nhật thông số giám sát Cụm 8 Microservices (8/8 Services, Ports 8000–8007) trên bảng điều hành Admin.
- Tinh chỉnh User 360 Master-Detail Modal bố cục 2 cột với thanh menu dọc bên trái và không gian làm việc rộng rãi bên phải, giải phóng hoàn toàn các thanh tab ngang chật chội.

### 📌 1.4. Siết chặt Cơ chế Phân quyền RBAC
- Chỉ Super Admin gốc (`quizgen.ai.team@gmail.com`) mới có quyền phân quyền vai trò Admin cho tài khoản khác.
- Ngăn chặn triệt để (HTTP 403 Forbidden) việc các Admin thông thường tự ý cấp hoặc sửa quyền Admin.
- Duy trì cơ chế tự động chuyển trang từ `admin_portal` về `dashboard` tức thì khi tài khoản bị giáng quyền.

### 📌 1.5. Nâng cấp Payment Service VietQR & Tự động Dọn Dẹp Đơn Quá Hạn
- Xây dựng cơ chế quét tự động chuyển đổi các đơn hàng `PENDING` quá 15 phút sang `EXPIRED`.
- Bổ sung bộ đếm ngược 15 phút (`countdown_seconds: 900`) khi tạo đơn hàng VietQR PRO.
- Cập nhật các API đối soát doanh thu `/admin/overview` và `/orders/history` hỗ trợ lọc theo trạng thái và theo dõi số lượng đơn quá hạn.

### 📌 1.6. Xây dựng Tập Lệnh Kiểm thử Tự động E2E [SCRUM-96]
- Viết và thực thi tập lệnh tự động hóa `scripts/[SCRUM-96]_test_admin_views_rbac_payment.py` với 5 bài kiểm thử và đạt kết quả tuyệt đối **5/5 PASS (100%)**.

---

## ⚠️ 2. KHÓ KHĂN VÀ GIẢI PHÁP (CHALLENGES & SOLUTIONS)

1. **Khó khăn 1: Tương thích Database Views trên nền tảng SQLite cục bộ**
   - *Nguyên nhân:* Migration 12 được viết cho hệ quản trị PostgreSQL, trong khi môi trường dev cục bộ chạy SQLite cho từng service độc lập.
   - *Giải pháp:* Tự động hóa việc khởi tạo View tương đương trên SQLite khi khởi động `admin-service`, kết hợp logic trích xuất đa CSDL để đảm bảo định dạng dữ liệu đầu ra đồng nhất 100%.

2. **Khó khăn 2: Đơn hàng thanh toán bị treo lâu làm nhiễu số liệu tài chính**
   - *Nguyên nhân:* Nhiều đơn hàng VietQR được tạo ra nhưng không thanh toán tồn đọng ở trạng thái PENDING.
   - *Giải pháp:* Bổ sung logic tự động quét và đánh dấu EXPIRED ngay khi truy xuất dữ liệu đối soát và dashboard tài chính, giữ số liệu luôn trong sạch.

---

## 📋 3. MINH CHỨNG KỸ THUẬT & KẾT QUẢ KIỂM ĐỊNH (VERIFICATION PROOF)

```text
================================================================================
BẮT ĐẦU CHẠY KIỂM THỬ TÍCH HỢP TỰ ĐỘNG [SCRUM-96]
================================================================================
[✅ PASS] TEST 1: Gateway & Cụm Microservices Health Check
       -> Services registered: 7 services (auth-service, document-service, rag-service, ai-service, exam-service, admin-service, payment-service)
[✅ PASS] TEST 2: Database View Bloom Distribution [SCRUM-94/SCRUM-96]
       -> Total Questions: 4, Percentages: {'remember': 25.0, 'understand': 25.0, 'apply': 25.0, 'analyze': 25.0}
[✅ PASS] TEST 3: Database View User Activity Summary 360° [SCRUM-94/SCRUM-96]
       -> Total Users Summarized: 5, Sample: nguyentann0804@gmail.com (Docs: 1, Exams: 1)
[✅ PASS] TEST 4: RBAC Security: Chỉ Root Admin được quyền cấp vai trò Admin
       -> Sub-admin grant attempt: HTTP 403 (Chặn thành công) | Root-admin attempt: HTTP 200
[✅ PASS] TEST 5: Payment Service: Sinh VietQR PRO & Tự động quét đơn quá hạn (EXPIRED)
       -> New Order: #QZ034551, Expired Orders Cleaned: 13
================================================================================
KẾT QUẢ KIỂM THỬ: 5/5 BÀI THI THÀNH CÔNG (100.0%)
================================================================================
>>> TẤT CẢ KỊCH BẢN KIỂM THỬ [SCRUM-96] ĐÃ VƯỢT QUA 100% <<<
```
