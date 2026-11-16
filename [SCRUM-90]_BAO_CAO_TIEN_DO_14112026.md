# BÁO CÁO TIẾN ĐỘ CÔNG VIỆC [SCRUM-90]

**Dự án:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Tự động ứng dụng AI  
**Mã nhiệm vụ (Jira Issue):** [SCRUM-90] Tích hợp KaTeX Render Công thức Toán - Lý & Tối ưu UX/UI Header - Tài khoản Giảng viên  
**Ngày thực hiện:** 14/11/2026  
**Người thực hiện:** Frontend & Fullstack UI Engineer  
**Nhánh Git:** `frontend` (Đồng bộ với `origin/frontend` và `develop`)  
**Trạng thái:** Hoàn thành xuất sắc 100% mục tiêu đề ra  

---

## ⚡ 1. TỔNG HỢP CÔNG VIỆC ĐÃ HOÀN THÀNH (DAILY SUMMARY)

### 📌 1. Đồng bộ mã nguồn mới nhất từ Remote Repository
- Kéo (pull) toàn bộ mã nguồn mới nhất từ GitHub `HoAnhVu05/quizgen-ai.git`.
- Fast-forward nhánh `develop` lên commit mới nhất `ae70be6` (`[SCRUM-90] feat(ai): upgrade Gemini 2.5 Flash Multimodal Vision & LaTeX formula question generator with diagram support`).
- Đồng bộ và cập nhật các nhánh tính năng (`feature/auth-multi-role-token-refresh`, `feature/upload-from-nguyentann-20261030`, `frontend`).
- Bảo toàn nguyên vẹn file tài liệu tiến độ cá nhân `BaoCao_TienDo_SCRUM-74.doc`.

---

### 📌 2. Tích hợp KaTeX & react-katex Render Công thức Khoa học Sắc nét
- **Khai báo và cài đặt Dependency:**
  - Bổ sung `katex`, `react-katex` và các type definitions `@types/katex`, `@types/react-katex` vào `package.json` và `package-lock.json`.
  - Cấu hình nạp CSS và Font vector chuẩn KaTeX (`.woff2`, `.woff`, `.ttf`) trong Vite bundle.
- **Xây dựng Component tái sử dụng `src/components/MathRenderer.tsx`:**
  - Tự động nhận diện và bóc tách chuỗi văn bản thông thường và các công thức khoa học:
    - Công thức trong dòng (inline math): `$E = mc^2$`, `\( \Delta = b^2 - 4ac \)`
    - Công thức dạng khối (block math): `$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$`, `\[ \vec{F} = m\vec{a} \]`
  - Cơ chế Fast-path: Với văn bản không chứa ký tự công thức, render text thuần không tiêu tốn tài nguyên.
  - Xử lý Error Boundary / Fallback an toàn nếu công thức LaTeX bị lỗi cú pháp, đảm bảo không sập UI.
- **Thiết lập Typography & CSS siêu sắc nét trong `src/index.css`:**
  - Khử răng cưa tối đa: `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`.
  - Cân đối tỷ lệ `font-size: 1.05em` và `vertical-align: -0.1em` hài hòa với văn bản tiếng Việt.
  - Chống vỡ layout: Tự động có thanh cuộn ngang mượt cho các công thức nhiều số hạng trên cả mobile và desktop.
  - Chuẩn hóa in ấn: Khi in giấy thi A4 trực tiếp, công thức tự chuyển sang màu đen thuần `#000000` độ phân giải cao.
- **Tích hợp trên các màn hình chức năng:**
  - `AIGenerationScreen.tsx`: Hiển thị công thức trong modal xem trước lịch sử sinh đề và câu hỏi đa phương thức.
  - `ReviewWorkspaceScreen.tsx`: Render công thức ở câu hỏi, 4 phương án lựa chọn, lời giải chi tiết và gắn badge `∑ Toán - Lý (LaTeX)`.
  - `QuestionBankScreen.tsx`: Hiển thị công thức trong Ngân hàng câu hỏi và Khung xem trước đề thi A4.
  - `curriculumData.ts` & `mock-gateway.cjs`: Bổ sung công thức LaTeX chuẩn vào các bộ câu hỏi mẫu.

---

### 📌 3. Tối ưu hóa UX/UI: Tinh gọn TopHeader & Xóa bỏ Trùng lặp
- **Khắc phục lỗi trùng lặp:** Loại bỏ hoàn toàn thanh Stepper 4 bước ở trên cùng (do đã có sẵn tại Sidebar bên trái và Hub trung tâm Dashboard).
- **Trang bị Spotlight Search:** Đặt thanh tìm kiếm thông minh `Ctrl + K` ở giữa Header, hỗ trợ tìm nhanh giáo trình, câu hỏi, mã đề.
- **Lược bỏ các thành phần rườm rà theo phản hồi người dùng:**
  - Bỏ chip trạng thái AI và badge hạn mức để header không bị rối mắt.
  - Xóa bỏ hoàn toàn dòng định danh hardcode `Đại học GTVT TP.HCM (UTH)` ở góc trái, giúp hệ thống mang tính trung lập, dùng chung cho mọi trường đại học.
- **Giữ lại khối tiện ích thiết thực:**
  - Bên trái: Icon màn hình + Tiêu đề trang chính (Bảng điều khiển Biên soạn Học thuật, v.v.) + Nút toggle mobile.
  - Ở giữa: Thanh tìm kiếm thông minh.
  - Bên phải: Khối Profile giảng viên (`Học vị + Tên`, Avatar, Khoa) và nút Đăng xuất.

---

### 📌 4. Thiết kế Màn hình Modal Cập nhật Thông tin Tài khoản Giảng viên (`UserProfileModal.tsx`)
Xây dựng component Modal chuyên nghiệp `src/components/UserProfileModal.tsx` gồm 3 tab chức năng:
1. **Hồ sơ & Học vị:**
   - Grid chọn học hàm/học vị 1 chạm nhanh: `Không`, `CN.`, `KS.`, `ThS.`, `TS.`, `PGS. TS.`, `GS. TS.`.
   - Ô nhập Họ và tên đầy đủ kèm tính năng tiện ích **"Đảo Họ ↔ Tên"** (xử lý lỗi ngược tên khi đăng nhập qua Google OAuth).
   - Email định danh có tích xanh "Đã xác thực".
2. **Khoa & Bộ môn:**
   - Trường Đại học / Học viện (input mở tự do, không gán cứng tên trường nào).
   - Khoa / Viện đào tạo và Bộ môn phụ trách.
   - Học phần giảng dạy chính.
3. **Bảo mật & Quyền hạn:**
   - Trạng thái phiên làm việc JWT / Google OAuth 2.0.
   - Quyền hạn giảng viên và bảo vệ an toàn 2 lớp.
- **Liên kết đồng bộ:** Mở được từ cả khối Profile trên TopHeader lẫn nút cây bút chì ở góc đáy Sidebar; tự động đồng bộ dữ liệu vào `localStorage` và API backend.

---

### 📌 5. Kiểm thử & Đẩy toàn bộ lên GitHub
- **Kiểm định Build:** Chạy lệnh `npm run build` (`tsc && vite build`) hoàn thành **100% không có lỗi**.
- **Môi trường cục bộ:** Khởi chạy nền máy chủ phát triển Vite Dev Server (`http://localhost:3000`) và Mock API Gateway (`http://localhost:8000`).
- **Lịch sử Commit & Push trên nhánh `frontend`:**
  - `398cef1`: `[SCRUM-90] feat(fe): tich hop KaTeX va react-katex render cong thuc Toan - Ly sieu sac net tren giao dien web`
  - `50ba35b`: `feat(ui): redesign TopHeader, remove redundant stepper, add Spotlight Search & UserProfileModal`
  - `3c3adca`: `feat(ui): simplify TopHeader to display only search bar`
  - `075780d`: `feat(ui): update TopHeader to keep search bar, screen info and user profile while removing status and quota badges`
  - `123b8ff`: `feat(ui): remove hardcoded UTH identification subtitle from TopHeader`

---

## 📋 2. KẾ HOẠCH TIẾP THEO (NEXT STEPS)
1. Hỗ trợ team kiểm thử hiển thị các đề thi trích xuất thực tế có công thức phức tạp (tích phân đa lớp, ma trận, công thức cơ học/điện từ).
2. Chuẩn bị tài liệu nghiệm thu tính năng render LaTeX phục vụ buổi bảo vệ/báo cáo Scrum định kỳ.
