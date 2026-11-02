# HỒ SƠ CÔNG NGHỆ DỰ ÁN QUIZGEN AI
*(Technical Architecture & Technology Stack Specification)*

**Dự án:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Học thuật ứng dụng AI (RAG + LLM + Bloom's Taxonomy)  
**Phiên bản:** v2.4 (Academic Release)  
**Ngày cập nhật:** 31/10/2026  

---

## 1. TỔNG QUAN HỆ THỐNG

**QuizGen AI** là nền tảng SaaS chuyên sâu phục vụ giảng viên đại học, hội đồng khảo thí và cơ sở giáo dục đại học. Hệ thống giải quyết bài toán tự động hóa quy trình biên soạn đề thi trắc nghiệm từ giáo trình PDF/Word, chuẩn hóa phân bổ câu hỏi theo **Thang đo nhận thức Bloom (Bloom's Taxonomy)** và triệt tiêu hiện tượng ảo giác (hallucination) nhờ cơ chế **RAG (Retrieval-Augmented Generation)** đối sánh minh chứng trích dẫn nguồn gốc hai chiều.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      QUIZGEN AI - SYSTEM ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
│          FRONTEND CLIENT            │   │         BACKEND SERVICES            │
│   (Single Page Application)         │   │         (FastAPI Microservices)     │
├─────────────────────────────────────┤   ├─────────────────────────────────────┤
│ • React 18 + TypeScript             │   │ • API Gateway (Port 8000)           │
│ • Vite 6 Build Tool                 │   │ • Auth Service (Port 8001)          │
│ • Tailwind CSS v3 (JIT Engine)      │   │ • Document Service (Port 8002)      │
│ • Deep Dark Glassmorphism Design    │   │ • RAG ChromaDB Service (Port 8003)  │
│ • Lucide Icons + CSS Keyframes      │   │ • AI Service - Gemini (Port 8004)   │
│ • Offline Fallback Resilience Engine│   │ • Exam Export Service (Port 8005)   │
└─────────────────────────────────────┘   └─────────────────────────────────────┘
```

---

## 2. STACK CÔNG NGHỆ FRONTEND CHI TIẾT

Frontend được phát triển theo mô hình **Single Page Application (SPA)** hiện đại, ưu tiên tối đa hiệu năng render, tính toàn vẹn kiểu dữ liệu và trải nghiệm giao diện người dùng (UI/UX) đạt tiêu chuẩn học thuật quốc tế.

| Thành phần | Công nghệ / Thư viện | Phiên bản | Vai trò & Lý do lựa chọn |
|---|---|---|---|
| **Core Framework** | **React** | `18.3.1` | Kiến trúc Component hướng module; quản lý Virtual DOM hiệu năng cao; tối ưu hóa rendering với các hook hiện đại (`useCallback`, `useMemo`, `useRef`). |
| **Type Safety** | **TypeScript** | `5.6.2` | Định kiểu dữ liệu tĩnh nghiêm ngặt (Strict Type Checking), đảm bảo tính an toàn dữ liệu từ API Contract đến UI State, loại bỏ hoàn toàn lỗi runtime `undefined` / `null`. |
| **Build & Bundler** | **Vite** | `6.4.5` | Thay thế CRA truyền thống; hỗ trợ **Native ES Modules (ESM)** cho tốc độ khởi động Dev Server tức thì (< 500ms) và tính năng Hot Module Replacement (HMR) cực nhanh. |
| **CSS Engine** | **Tailwind CSS** | `3.4.1` | Utility-first CSS framework biên dịch Just-In-Time (JIT), cho phép xây dựng layout responsive tùy biến sâu mà không phát sinh file CSS dư thừa. |
| **Iconography** | **Lucide React** | `0.454.0` | Bộ icon vector sắc nét, thiết kế công thái học hiện đại, hỗ trợ tree-shaking thu nhỏ kích thước bundle tối đa. |
| **PostCSS Processor** | **PostCSS + Autoprefixer**| `8.4.38` | Tự động chèn CSS vendor prefixes, tương thích hoàn hảo trên các trình duyệt Chrome, Edge, Firefox, Safari. |

---

## 3. THIẾT KẾ GIAO DIỆN & DESIGN SYSTEM (UI/UX ARCHITECTURE)

Giao diện không sử dụng các UI kit có sẵn cồng kềnh (MUI, Ant Design) mà được **tự xây dựng (handcrafted)** dựa trên ngôn ngữ thiết kế:

### 3.1. Phong cách Deep Dark Academic Glassmorphism
- **Bảng màu chủ đạo (Color Palette):**
  - Nền hệ thống: `#0b0f19` (Deep Charcoal Navy) kết hợp bề mặt thanh điều hướng `#090d16`.
  - Khối nội dung (Surfaces): `.glass-card` và `.glass-panel` với độ trong suốt bán phần (`bg-slate-900/60`, `backdrop-blur-xl`), viền sáng siêu mỏng (`border border-white/[0.08]`).
  - Màu nhấn (Accents): 
    - Xanh công nghệ (Blue/Indigo): `#3b82f6` - `#6366f1` (AI, RAG Engine).
    - Xanh ngọc (Emerald): `#10b981` (Trạng thái sẵn sàng, hoàn thành, câu trả lời đúng).
    - Hổ phách (Amber): `#f59e0b` (Cảnh báo, cấp độ Vận dụng).
    - Tím thạch anh (Purple): `#a855f7` (Cấp độ Phân tích cao cấp).

### 3.2. Hệ thống Animation & Hiệu ứng tương tác
Được định nghĩa trong [`src/index.css`](file:///d:/HKDN/QuizGen%20AI/src/index.css):
- `@keyframes scanBeam`: Chùm tia laser quét dọc theo file giáo trình mô phỏng quá trình AI đang đọc hiểu tài liệu.
- `@keyframes shimmerWave`: Dải sóng sáng chuyển động biểu thị quá trình LLM đang tạo câu hỏi.
- `shadow-glow-sm`, `shadow-glow-md`: Hiệu ứng viền phát sáng đa màu làm nổi bật các thành phần đang active.
- `animate-slideIn`, `animate-slideUp`: Chuyển cảnh mềm mại giữa các phân hệ tác vụ.

### 3.3. Typography chuẩn quốc tế
- **Body & Headlines:** *Plus Jakarta Sans* – Font chữ hình học hiện đại, dễ đọc trong môi trường học thuật.
- **Code & Metrics:** *JetBrains Mono* – Dành riêng cho điểm số tin cậy (Confidence Score), mã số đề, phím tắt và trích đoạn minh chứng RAG.

---

## 4. KIẾN TRÚC CÁC PHÂN HỆ MÀN HÌNH (SCREENS)

Hệ thống được chia thành 5 phân hệ công việc khép kín điều phối bởi `Sidebar` cố định:

```
src/components/
├── Sidebar.tsx                # Thanh điều hướng chuẩn học thuật + hiển thị trạng thái RAG Engine
├── DashboardScreen.tsx        # Bảng điều khiển KPI khảo thí & Biểu đồ phân bổ ma trận Bloom
├── TextbookUploadScreen.tsx   # Phân hệ nạp & vector hóa giáo trình (Kéo-thả, Laser scan, Chunks Modal)
├── AIGenerationScreen.tsx     # Khởi tạo đề thi AI (Preset Giữa kỳ/Cuối kỳ, Sliders Bloom, Live Balance)
├── ReviewWorkspaceScreen.tsx  # Không gian kiểm duyệt RAG (Split-view, phím tắt [A]/[R], chỉnh sửa trực tiếp)
├── QuestionBankScreen.tsx     # Ngân hàng câu hỏi, lọc đa chiều & Hộp thoại đóng gói xuất Word/PDF/QTI
└── ToastContainer.tsx         # Hệ thống thông báo trạng thái dạng kính mờ (Stack quản lý thông minh)
```

### Chi tiết nghiệp vụ từng phân hệ:
1. **Bảng điều khiển (`DashboardScreen.tsx`):** Thống kê số lượng giáo trình, câu hỏi cần duyệt, tỷ lệ câu hỏi đã được phê duyệt, biểu đồ thanh trực quan hóa phân bổ Bloom 4 mức độ nhận thức.
2. **Quản lý giáo trình (`TextbookUploadScreen.tsx`):**
   - Vùng kéo thả tệp (`.pdf`, `.docx`) có giới hạn dung lượng 25MB.
   - Thước đo tiến trình trích xuất và bóc tách cấu trúc tài liệu.
   - Hộp thoại thanh tra Chunks RAG cho phép giảng viên xem trước các đoạn văn bản đã được vector hóa.
3. **Khởi tạo Đề thi AI (`AIGenerationScreen.tsx`):**
   - Áp dụng nhanh 3 mẫu chuẩn hóa: *Đề Giữa kỳ (20 câu)*, *Đề Cuối kỳ (20 câu)*, *Kiểm tra 15 phút (10 câu)*.
   - Bộ trượt căn chỉnh tỷ lệ 4 bậc nhận thức Bloom: Nhận biết $\rightarrow$ Thông hiểu $\rightarrow$ Vận dụng $\rightarrow$ Phân tích.
   - Thanh cân bằng trực tiếp (Live Matrix Balance Bar).
4. **Không gian Kiểm duyệt RAG (`ReviewWorkspaceScreen.tsx`):**
   - Thiết kế màn hình chia đôi (Split-view Workspace): Bên trái là danh sách câu hỏi AI vừa sinh, bên phải là trích đoạn tài liệu gốc (Source Chunk) kèm số trang và điểm liên quan (% Relevance).
   - Hỗ trợ phím tắt bàn phím: Bấm phím **`A`** để Duyệt (Approve), bấm **`R`** để Từ chối/Sinh lại (Reject).
   - Khả năng tinh chỉnh câu hỏi, đảo phương án nhiễu trực tiếp trên giao diện.
5. **Ngân hàng & Đóng gói Đề thi (`QuestionBankScreen.tsx`):**
   - Quản lý tập trung toàn bộ câu hỏi đã duyệt.
   - Thanh công cụ nổi (Floating Action Dock) hỗ trợ thao tác hàng loạt.
   - Cấu hình đóng gói đề thi xuất ra nhiều mã đề (hoán vị câu hỏi, đảo thứ tự phương án A/B/C/D), xuất định dạng **Microsoft Word (.docx)**, **Adobe PDF kèm phiếu trả lời trắc nghiệm**, hoặc file nén **QTI** nhập vào Canvas/Moodle LMS.

---

## 5. CƠ CHẾ CHỊU LỖI & MOCK FALLBACK DATA (RESILIENCE ARCHITECTURE)

Để giải quyết bài toán phát triển song song giữa Frontend và Backend (Frontend do bạn làm, Backend do đồng đội phát triển):

- **Phát hiện trạng thái kết nối thông minh:** 
  Hệ thống sử dụng cơ chế thăm dò API. Khi Backend chưa khởi động (`ERR_CONNECTION_REFUSED`), hệ thống **không báo lỗi làm đứng trang**, mà tự động chuyển sang chế độ **Offline Demo Fallback**.
- **Dữ liệu giả lập chuẩn xác (Mock Data):**
  - Tự động nạp sẵn các giáo trình học thuật mẫu: *Giáo trình Kinh tế Vi mô 2025*, *Giáo trình Nhập môn Trí tuệ Nhân tạo 2026*.
  - Tự động nạp danh mục chương và đoạn trích RAG mẫu.
- **Triệt tiêu Infinite Toast Loop:**
  Các hàm thông báo toast được bọc chặt chẽ trong `useCallback`, giới hạn hiển thị tối đa 4 thông báo mới nhất, tránh tình trạng re-render tràn ngập màn hình.

---

## 6. QUY ƯỚC DỮ LIỆU & GIAO THỨC TÍCH HỢP (API CONTRACTS)

| Tiêu chuẩn | Quy định triển khai |
|---|---|
| **Naming Convention** | Toàn bộ khóa JSON truyền tải giữa Frontend $\leftrightarrow$ Backend tuân thủ **`camelCase`** tuyệt đối (VD: `totalPages`, `chaptersCount`, `confidenceScore`, `sourceChunkId`). |
| **API Base URL** | Cấu hình linh hoạt qua biến môi trường `import.meta.env.VITE_API_BASE_URL` (Mặc định: `http://localhost:8000/api/v1`). |
| **Mã trạng thái HTTP** | `200 OK` (Truy vấn), `201 Created` / `202 Accepted` (Upload/Generate), `400 Bad Request` (Sai định dạng), `413 Payload Too Large` (Vượt 25MB), `500 Server Error`. |
| **Mô hình AI** | Tích hợp **Google Gemini Pro** thông qua `ai-service` xử lý Prompt kỹ thuật cao (zero-hallucination, trả kết quả JSON thuần). |
| **Vector Database** | **ChromaDB** kết hợp mô hình embedding ngôn ngữ tự nhiên phục vụ truy xuất ngữ cảnh chính xác cao. |

---

## 7. CẤU TRÚC THƯ MỤC NGUỒN (PROJECT DIRECTORY)

```
d:\HKDN\QuizGen AI\
├── index.html                   # Entry HTML (nhúng Web Fonts Plus Jakarta Sans & JetBrains Mono)
├── package.json                 # Khai báo Dependencies & Scripts
├── tsconfig.json                # Cấu hình TypeScript compiler
├── vite.config.ts               # Cấu hình Vite Dev Server & Build Output (Port 3000)
├── tailwind.config.js           # Theme màu sắc học thuật tùy biến
├── postcss.config.js            # Plugin PostCSS & Autoprefixer
├── TECH_STACK.md                # Hồ sơ tài liệu công nghệ trang web (Tài liệu này)
├── BACKEND_INTEGRATION_GUIDE.md # Bản đặc tả quy chuẩn tích hợp cho đội ngũ Backend
├── docker-compose.yml           # Điều phối toàn bộ các microservices và database
│
├── src/                         # MÃ NGUỒN FRONTEND
│   ├── main.tsx                 # React DOM mount point
│   ├── App.tsx                  # Root Application Component, Router & Global State
│   ├── index.css                # Global styles, Glassmorphism classes & Keyframes
│   ├── types/
│   │   └── index.ts             # Toàn bộ Interface & Type definitions chuẩn hóa
│   └── components/              # Các phân hệ giao diện chuyên trách
│       ├── Sidebar.tsx
│       ├── DashboardScreen.tsx
│       ├── TextbookUploadScreen.tsx
│       ├── AIGenerationScreen.tsx
│       ├── ReviewWorkspaceScreen.tsx
│       ├── QuestionBankScreen.tsx
│       └── ToastContainer.tsx
│
└── services/                    # CÁC MICROSERVICES BACKEND (FASTAPI)
    ├── api-gateway/             # Cổng điều hướng tập trung (Port 8000)
    ├── services/auth-service/   # Xác thực giảng viên & JWT (Port 8001)
    ├── services/document-service/# Bóc tách file PDF/DOCX (Port 8002)
    ├── services/rag-service/    # Lưu trữ Vector ChromaDB (Port 8003)
    ├── services/ai-service/     # Gemini LLM sinh câu hỏi Bloom (Port 8004)
    └── services/exam-service/   # Đóng gói xuất Word/PDF/QTI (Port 8005)
```

---

## 8. HƯỚNG DẪN VẬN HÀNH

### Khởi động Frontend độc lập (Development Mode):
```bash
# Di chuyển vào thư mục dự án
cd "d:\HKDN\QuizGen AI"

# Cài đặt thư viện (nếu chưa cài)
npm install

# Khởi chạy Vite Dev Server
npm run dev
# Mở trình duyệt: http://localhost:3000/
```

### Đóng gói sản phẩm (Production Build):
```bash
npm run build
# Bản build tối ưu hóa sẽ được xuất ra thư mục dist/
```
