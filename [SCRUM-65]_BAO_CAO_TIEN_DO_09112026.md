# BÁO CÁO TIẾN ĐỘ CÔNG VIỆC [SCRUM-65]

**Dự án:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Tự động ứng dụng AI  
**Mã nhiệm vụ (Jira Issue):** [SCRUM-65]  
**Ngày thực hiện:** 09/11/2026  
**Người thực hiện:** Kỹ sư Cơ sở Dữ liệu & Tích hợp Backend (Database & Backend Engineer)  
**Nhánh Git:** `feature/database-architecture`  
**Trạng thái:** Hoàn thành xuất sắc 100% mục tiêu đề ra  

---

## ⚡ 1. TÓM TẮT NHANH CÔNG VIỆC (QUICK SUMMARY)

### 📌 Những việc đã làm:
* **Đồng bộ Git:** Kéo và hợp nhất an toàn **25 commit mới nhất** từ `develop` về nhánh làm việc, xử lý sạch sẽ **0 xung đột**.
* **Khảo thí & Hiệu năng [SCRUM-52] & [SCRUM-58]:**
  * Triển khai cơ chế kiểm soát tải **Rate Limiting 5 lượt/phút** trên AI Service (`ratelimit:ai:generate:{user_id}`) kèm bộ chỉ mục Composite/Partial Index tối ưu truy vấn bốc đề thi dưới 100ms.
  * Hoàn thành bảng lưu vết khảo thí `exams.question_audit_logs` (12 trường dữ liệu, diff snapshot trước/sau khi sửa, lý do sư phạm) và endpoint thống kê tỷ lệ Bloom chuẩn 4 mức (40-30-20-10) kèm thuật toán đo độ lệch mục tiêu ($\Delta\%$).
* **Nâng cấp Tài liệu & Tooling:**
  * Cập nhật bản đặc tả kiến trúc `DATABASE_SPECIFICATION.md` lên phiên bản **v2.5** bổ sung đầy đủ Data Dictionary, Bloom Blueprint và kịch bản Rate Limiting.
  * Xây dựng công cụ tự động hóa sao lưu & phục hồi dữ liệu `scripts/backup_restore_db.py` cho cả PostgreSQL 16 và ChromaDB Vector Store.
* **Kiểm thử hệ thống:** Stress-test AI (5/5 PASS), Test Audit & Bloom (7/7 PASS), Type-check TypeScript và biên dịch Python toàn bộ microservices đạt **0 lỗi (100% clean)**.

### ⚠️ Những khó khăn đã xử lý:
* **Thứ tự ràng buộc khóa ngoại (FK) trên Docker:** Bảng audit log phụ thuộc ID câu hỏi nhưng trước đây chạy script seed cùng lúc $\rightarrow$ *Giải pháp: Tách toàn bộ DML dữ liệu mẫu sang `09_seed.sql` chạy sau cùng, giữ migrations `01_` đến `08_` chỉ chứa DDL cấu trúc.*
* **Lỗi mã hóa tiếng Việt trên console Windows:** Terminal PowerShell mặc định dùng bảng mã `cp1252` làm lỗi ký tự có dấu khi in thông báo $\rightarrow$ *Giải pháp: Tái cấu hình stream sang `utf-8` (`sys.stdout.reconfigure(encoding="utf-8")`) ở đầu script.*
* **Phân quyền và khóa tệp Git trên Windows:** Các tệp lock của Git dễ bị chặn truy cập $\rightarrow$ *Giải pháp: Áp dụng nguyên tắc Least Privilege, chạy kiểm thử trong sandbox an toàn và đồng bộ mượt mà.*

---

## 📋 2. CHI TIẾT KỸ THUẬT & MINH CHỨNG NGHIỆM THU

### 2.1. Danh mục Tệp tin & Mã nguồn Liên quan
1. `[SCRUM-65]_BAO_CAO_TIEN_DO_09112026.md`: Báo cáo tiến độ và nghiệm thu nhiệm vụ [SCRUM-65].
2. `DATABASE_SPECIFICATION.md`: Bản đặc tả kiến trúc cơ sở dữ liệu v2.5.
3. `scripts/backup_restore_db.py`: Tiện ích sao lưu và phục hồi dữ liệu tự động.
4. `docker-compose.yml`: Mount đầy đủ 9 tệp SQL khởi tạo tự động.
5. `scripts/stress_test_ai_rate_limit.py`: Kịch bản kiểm thử tải Rate Limit 5 lượt/phút.
6. `scripts/[SCRUM-58]_test_audit_and_bloom_stats.py`: Kịch bản kiểm thử Audit Logs & Thống kê Bloom.

### 2.2. Kết quả Chạy Kiểm thử Tự động
```text
===========================================================================
 [PASS] | Stress-test Rate Limiting AI (5 req/phút): 5/5 Kịch bản (100%)
 [PASS] | Question Audit Logs & Thống kê Bloom     : 7/7 Kịch bản (100%)
 [PASS] | TypeScript Type-check (npx tsc --noEmit) : 0 Lỗi (Pass)
 [PASS] | Python Microservices Byte-Compilation   : 0 Lỗi (Pass)
===========================================================================
```
