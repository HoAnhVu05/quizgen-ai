# ĐẶC TẢ KIẾN TRÚC & CẤU TRÚC CHI TIẾT TẤT CẢ CÁC TRANG FRONTEND
**Hệ thống:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Tự động ứng dụng AI  
**Phiên bản:** v2.4 Academic Edition  
**Tài liệu:** Bản đặc tả chi tiết toàn bộ các trang lớn, màn hình phụ, modal và thành phần giao diện (UI/UX)

---

## MỤC LỤC TỔNG QUAN

1. [Sơ đồ Kiến trúc & Phân cấp Giao diện (Screen Hierarchy)](#1-sơ-đồ-kiến-trúc--phân-cấp-giao-diện)
2. [Khung sườn Ứng dụng & Điều phối Toàn cục (Application Shell)](#2-khung-sườn-ứng-dụng--điều-phối-toàn-cục)
   - 2.1. Root Component (`src/App.tsx`)
   - 2.2. Thanh Điều hướng Học thuật Cố định (`src/components/Sidebar.tsx`)
   - 2.3. Hệ thống Thông báo Kính mờ Toàn cục (`src/components/ToastContainer.tsx`)
3. [Chi tiết Trang Lớn 1: Bảng Điều khiển Khảo thí (`DashboardScreen.tsx`)](#3-trang-lớn-1-bảng-điều-khiển-khảo-thí-dashboardscreentsx)
4. [Chi tiết Trang Lớn 2: Quản lý Giáo trình & Tri thức RAG (`TextbookUploadScreen.tsx`)](#4-trang-lớn-2-quản-lý-giáo-trình--tri-thức-rag-textbookuploadscreentsx)
   - 4.1. Vùng Tải lên & Quét Laser (Upload & Scan Zone)
   - 4.2. Bảng Danh mục Giáo trình & Trạng thái Bóc tách
   - 4.3. **Màn hình phụ / Modal 1:** Thanh tra Đoạn trích RAG (RAG Chunks Inspector Modal)
5. [Chi tiết Trang Lớn 3: Khởi tạo Ma trận Đề thi AI (`AIGenerationScreen.tsx`)](#5-trang-lớn-3-khởi-tạo-ma-trận-đề-thi-ai-aigenerationscreentsx)
   - 5.1. Bộ Khuôn mẫu Chuẩn hóa Đại học (Quick Preset Templates)
   - 5.2. Chọn Nguồn Tri thức & Chương mục Giáo trình
   - 5.3. Bộ Thanh trượt Ma trận Nhận thức Bloom (Bloom Sliders)
   - 5.4. Thanh Cân bằng Tỷ lệ Trực quan (Live Matrix Balance Bar)
   - 5.5. **Màn hình phụ / Overlay 2:** Lớp phủ Đang Sinh Đề thi (AI Generation Processing Overlay)
6. [Chi tiết Trang Lớn 4: Không gian Kiểm duyệt RAG (`ReviewWorkspaceScreen.tsx`)](#6-trang-lớn-4-không-gian-kiểm-duyệt-rag-reviewworkspacescreentsx)
   - 6.1. Thanh Điều phối & Thao tác Hàng loạt (Review Control Bar)
   - 6.2. **Phân vùng Trái:** Thẻ Câu hỏi & Chế độ Chỉnh sửa Trực tiếp (Question Cards & Inline Edit)
   - 6.3. **Phân vùng Phải:** Bảng Minh chứng Đối soát RAG 2 Chiều (RAG Evidence Source Inspector)
   - 6.4. **Thành phần phụ:** Thanh Phím tắt Nổi (Keyboard Shortcuts Dock)
7. [Chi tiết Trang Lớn 5: Ngân hàng Câu hỏi & Xuất Đề thi (`QuestionBankScreen.tsx`)](#7-trang-lớn-5-ngân-hàng-câu-hỏi--xuất-đề-thi-questionbankscreentsx)
   - 7.1. Bộ Lọc Đa tiêu chí & Thanh Tìm kiếm (Filter & Search Header)
   - 7.2. Bảng Dữ liệu Câu hỏi Đa chọn (Multi-select Question Table)
   - 7.3. **Thành phần phụ:** Bảng Điều khiển Tác vụ Nổi (Floating Action Dock)
   - 7.4. **Màn hình phụ / Modal 3:** Cấu hình Đóng gói & Xuất Đề thi (Exam Export Modal)
8. [Bảng Tổng hợp Luồng Tương tác Người dùng (User Flow Matrix)](#8-bảng-tổng-hợp-luồng-tương-tác-người-dùng-user-flow-matrix)

---

## 1. SƠ ĐỒ KIẾN TRÚC & PHÂN CẤP GIAO DIỆN

```
App.tsx (Root Shell - bg-[#0b0f19])
│
├── ToastContainer (Toàn cục - fixed top-right)
│
├── Sidebar (Cố định bên trái - w-72)
│   ├── Brand Header (QuizGen AI Logo + Version v2.4 + Pulse Status)
│   ├── Navigation Menu (5 Tabs: Dashboard, Upload, Generate, Review, Bank)
│   ├── RAG Engine Monitor Card (Quota 428k/1M tokens, Status Indicator)
│   └── User Profile Card (TS. Nguyễn Văn A, ĐHQG + Nút đăng xuất)
│
└── Main Content View (flex-1 overflow-hidden)
    │
    ├── [Tab 1] DashboardScreen
    │   ├── Academic Greeting & Session Badge
    │   ├── 4 KPI Metric Cards (Glow hover effect)
    │   ├── Bloom Cognitive Distribution Chart (4 mức độ nhận thức)
    │   ├── System Microservice Health Status Card
    │   └── Recent Activity Feed (Nhật ký sự kiện khảo thí)
    │
    ├── [Tab 2] TextbookUploadScreen
    │   ├── Header & Storage Quota
    │   ├── Drag-and-Drop Zone (@keyframes scanBeam laser animation)
    │   ├── Pipeline Progress Stepper (Upload -> Parse -> Chunk -> Vectorize)
    │   ├── Textbook Inventory Table (Filter, Status Badges, Progress %)
    │   └── [MODAL 1] RAG Chunks Inspector Modal (Xem các đoạn trích vector)
    │
    ├── [Tab 3] AIGenerationScreen
    │   ├── Preset Quick Template Cards (Giữa kỳ, Cuối kỳ, 15 phút)
    │   ├── Section 1: Nguồn tri thức & Chọn chương mục
    │   ├── Section 2: 4 Thanh trượt ma trận nhận thức Bloom (0 - 20 câu)
    │   ├── Section 3: Live Bloom Balance Bar (Phát hiện lệch chuẩn sư phạm)
    │   ├── Primary CTA Button ("Kích hoạt AI Sinh Đề thi")
    │   └── [OVERLAY 2] AI Generation Processing Overlay (@keyframes shimmerWave)
    │
    ├── [Tab 4] ReviewWorkspaceScreen (Split-View 2 Cột)
    │   ├── Top Control Bar (Search, Filter, Batch Approve, Counts)
    │   ├── [Cột Trái - 60%] Danh sách Thẻ Câu hỏi & Form Chỉnh sửa Inline
    │   ├── [Cột Phải - 40%] Bảng Minh chứng Đối soát RAG (Số trang, Text trích đoạn)
    │   └── [DOCK NỔI] Keyboard Shortcuts Dock (Phím [A], [R], [E])
    │
    └── [Tab 5] QuestionBankScreen
        ├── Top Search Bar & Bloom Filter Pills
        ├── Multi-Select Questions Data Table (Sorting, Selection Checkboxes)
        ├── [DOCK NỔI] Floating Action Dock (Xuất hiện khi chọn >= 1 câu)
        └── [MODAL 3] Exam Export Configuration Modal (Word/PDF/QTI, Đảo đề)
```

---

## 2. KHUNG SƯỜN ỨNG DỤNG & ĐIỀU PHỐI TOÀN CỤC

### 2.1. Root Component (`src/App.tsx`)
- **Vai trò:** Trung tâm điều phối toàn bộ ứng dụng SPA (Single Page Application). Quản lý màn hình active, ngân hàng câu hỏi dùng chung và hệ thống thông báo trạng thái.
- **Trạng thái cốt lõi (State Management):**
  - `currentScreen: ScreenId` ('dashboard' | 'upload' | 'generate' | 'review' | 'bank') – Xác định màn hình đang được render.
  - `questions: Question[]` – Mảng danh sách các câu hỏi trắc nghiệm kèm minh chứng RAG, cấp độ Bloom và trạng thái (`pending` | `approved`).
  - `toasts: ToastMessage[]` – Danh sách thông báo toast nổi trên màn hình.
- **Cơ chế tối ưu hóa:**
  - `handleShowToast`: Được bọc trong `useCallback` với dependencies rỗng, giới hạn tối đa 4 thông báo mới nhất để ngăn chặn tràn màn hình và triệt tiêu vòng lặp re-render.
  - `handleUpdateQuestion`: Cập nhật bất biến (immutability) khi người dùng sửa câu hỏi ở không gian kiểm duyệt.
  - `handleBatchApprove`: Duyệt hàng loạt toàn bộ câu hỏi `pending` sang `approved`.
- **Layout DOM:**
  - Container ngoài cùng: `flex h-screen w-screen overflow-hidden bg-[#0b0f19] font-sans relative select-none`.

---

### 2.2. Thanh Điều hướng Học thuật Cố định (`src/components/Sidebar.tsx`)
- **Vai trò:** Thanh sidebar dọc cố định bên trái màn hình (`w-72`), giúp giảng viên chuyển đổi nhanh chóng giữa các phân hệ tác vụ.
- **Cấu trúc thành phần:**
  1. **Brand Header:**
     - Biểu tượng mũ cử nhân (`GraduationCap`) với dải màu gradient `from-blue-600 via-indigo-600 to-sky-400`.
     - Chấm trạng thái xanh lá phát xung (`animate-pulse`) báo hiệu hệ thống kết nối thời gian thực.
     - Logo văn bản: **QuizGen** kèm nhãn `PRO AI` và subtitle *"Khảo thí Đại học Quốc gia"*.
     - Phiên bản hệ thống: `v2.4`.
  2. **Danh mục 5 Phân hệ Tác vụ:**
     - Mỗi mục gồm Icon, Tiêu đề chính, Phụ đề mô tả nghiệp vụ và phím tắt nhanh (`⌘1` đến `⌘5`):
       - `dashboard`: Bảng điều khiển (Chỉ số & Ma trận Bloom)
       - `upload`: Quản lý Giáo trình (Vector hóa & Bóc tách RAG)
       - `generate`: Khởi tạo Đề thi AI (Cấu hình ma trận nhận thức)
       - `review`: Không gian Kiểm duyệt (Đối sánh minh chứng RAG) – **Có Badge đếm số câu hỏi đang chờ duyệt** (chữ số vàng phát sáng).
       - `bank`: Ngân hàng & Đề thi (Kho câu hỏi & Xuất Word/PDF)
  3. **Thẻ Giám sát RAG Engine (RAG Engine Status Monitor):**
     - Nằm sát đáy thanh điều hướng.
     - Hiển thị chấm trạng thái "Hoạt động", hạn mức Token RAG: `428k / 1M` kèm thanh tiến trình trực quan.
  4. **Hồ sơ Giảng viên (User Profile Widget):**
     - Avatar chữ cái viết tắt `TS` trên nền tím indigo.
     - Tên giảng viên: **TS. Nguyễn Văn A** – *Khoa Kinh tế - ĐHQG*.
     - Nút đăng xuất nhanh dạng icon.

---

### 2.3. Hệ thống Thông báo Kính mờ Toàn cục (`src/components/ToastContainer.tsx`)
- **Vai trò:** Hiển thị thông báo phản hồi thao tác tức thì cho người dùng ở góc trên bên phải màn hình (`fixed top-6 right-6 z-50`).
- **Phân loại thông báo:**
  - `success` (Xanh lục - Emerald): Khi upload tệp thành công, lưu câu hỏi, duyệt câu hỏi hoặc xuất đề thi hoàn tất.
  - `info` (Xanh dương - Sky): Khi áp dụng khuôn mẫu đề thi hoặc chuyển sang chế độ Demo ngoại tuyến.
  - `warning` (Vàng hổ phách - Amber): Khi xóa tài liệu, từ chối câu hỏi, hoặc cảnh báo tỷ lệ ma trận Bloom lệch chuẩn.
  - `error` (Đỏ - Rose): Khi tệp vượt quá 25MB, định dạng không hợp lệ, hoặc lỗi mạng.
- **Hiệu ứng & Cơ chế:**
  - Thiết kế dạng `.glass-panel` với viền phát quang mềm mại.
  - Tự động biến mất sau 4.5 giây (Auto-dismiss timer).
  - Có nút `X` để người dùng đóng thủ công bất kỳ lúc nào.

---

## 3. TRANG LỚN 1: BẢNG ĐIỀU KHIỂN KHẢO THÍ (`DashboardScreen.tsx`)

Trang chủ điều hành tổng quan toàn bộ hoạt động khảo thí của học kỳ.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Học kỳ II 2025-2026] Trung tâm Khảo thí & Tri thức AI   [+ Tạo đề mới] │
├────────────────────────────────────────────────────────────────────────┤
│ [ 2 Giáo trình ]   [ 2 Cần duyệt ]   [ 1 Đã chuẩn hóa ]   [ 1,850 Chunks]│
├──────────────────────────────────────┬─────────────────────────────────┤
│ PHÂN BỔ MA TRẬN NHẬN THỨC BLOOM      │ KIẾN TRÚC VI DỊCH VỤ HỆ THỐNG   │
│ • Nhận biết:  40% [████████░░░░░░]   │ • Document Parser:  Sẵn sàng    │
│ • Thông hiểu: 40% [████████░░░░░░]   │ • ChromaDB Vector:  Hoạt động   │
│ • Vận dụng:   20% [████░░░░░░░░░░]   │ • Gemini LLM:       Độ trễ 1.2s │
│ • Phân tích:  0%  [░░░░░░░░░░░░░░]   │ • LaTeX Renderer:   Hoạt động   │
├──────────────────────────────────────┴─────────────────────────────────┤
│ NHẬT KÝ HOẠT ĐỘNG KHẢO THÍ GẦN ĐÂY (Recent Activity Feed)              │
│ [14:20] Hoàn tất bóc tách & tạo 184 chunks từ GiaoTrinh_KinhTeViMo.pdf │
│ [11:05] Phê duyệt 20 câu hỏi trắc nghiệm giữa kỳ môn Kinh tế vi mô      │
└────────────────────────────────────────────────────────────────────────┘
```

### Chi tiết các khối giao diện:
1. **Academic Header & Dynamic Greeting:**
   - Tag huy hiệu: *Học kỳ II (2025 - 2026) • Cơ sở dữ liệu Khảo thí ĐHQG*.
   - Tiêu đề: *Trung tâm Khảo thí & Tri thức AI*.
   - Nút CTA nhanh: *"Khởi tạo đề thi ngay"* (chuyển hướng sang màn hình `generate`).
2. **Bộ 4 Thẻ Chỉ số Hiệu năng (KPI Metrics Cards):**
   - **Thẻ 1 - Giáo trình đã nạp:** 2 tài liệu hoạt động, 424 trang kiến thức đã lập chỉ mục vector.
   - **Thẻ 2 - Câu hỏi cần kiểm duyệt:** Số lượng câu `pending` (kèm biểu tượng đồng hồ và nhãn cảnh báo vàng).
   - **Thẻ 3 - Đã chuẩn hóa vào kho:** Số câu `approved` đạt độ tin cậy $\ge 90\%$.
   - **Thẻ 4 - Đoạn trích RAG đối soát:** 1,850 chunks đã bóc tách với độ phủ minh chứng đạt 99.4%.
   - *Hiệu ứng:* Nền kính bán mờ, hover chuyển màu và phát sáng viền (`shadow-glow-sm`).
3. **Biểu đồ Phân bổ Ma trận Nhận thức Bloom (Bloom Cognitive Distribution):**
   - Hiển thị tỷ lệ % thực tế của 4 mức độ: **Nhận biết (Remembering)**, **Thông hiểu (Understanding)**, **Vận dụng (Applying)**, **Phân tích (Analyzing)**.
   - Mỗi mức độ có thanh tiến trình phát sáng tương ứng màu đại diện (Xanh dương, Xanh mòng két, Hổ phách, Tím).
   - Kèm chú giải so sánh với quy định chuẩn của Bộ Giáo dục & Đào tạo.
4. **Bảng Trạng thái Hạ tầng Microservice (System Architecture Health):**
   - Giám sát 4 engine cốt lõi: Document Parser Service, ChromaDB Vector Store, Gemini Pro 1.5, MathJax/KaTeX Renderer.
5. **Dòng Thời gian Hoạt động Gần đây (Recent Activity Feed):**
   - Danh sách timeline ghi lại các hành động: nạp giáo trình, sinh câu hỏi bằng AI, phê duyệt đề thi, đóng gói file Word.

---

## 4. TRANG LỚN 2: QUẢN LÝ GIÁO TRÌNH & TRI THỨC RAG (`TextbookUploadScreen.tsx`)

Quản lý toàn bộ thư viện tài liệu học thuật gốc được sử dụng làm nguồn trích xuất minh chứng.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Quản lý Giáo trình & Tri thức RAG               [Dung lượng: 37MB/5GB] │
├────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │                  [ICON MÁY QUÉT VĂN BẢN LASER]                     │ │
│ │           Kéo thả tệp Giáo trình / Bài giảng vào đây               │ │
│ │           Hỗ trợ định dạng .PDF, .DOCX (Dung lượng tối đa 25MB)    │ │
│ │                     [ CHỌN TỆP TỪ THƯ VIỆN ]                       │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ TIẾN TRÌNH RAG:  [1.Tiếp nhận] -> [2.Bóc tách] -> [3.Chunking] -> [4.Vector hóa]
├────────────────────────────────────────────────────────────────────────┤
│ BẢNG DANH MỤC GIÁO TRÌNH                                               │
│ [Tìm kiếm...]                                      [Bộ lọc định dạng]  │
│ ┌───────────────────────────┬────────┬───────┬────────────┬──────────┐ │
│ │ Tên tài liệu              │ Trang  │ Size  │ Trạng thái │ Thao tác │ │
│ ├───────────────────────────┼────────┼───────┼────────────┼──────────┤ │
│ │ GiaoTrinh_KinhTeViMo.pdf  │ 184 tr │ 14MB  │ [Sẵn sàng] │ [Xem][Xóa│ │
│ │ TriTueNhanTao_2026.pdf    │ 240 tr │ 22MB  │ [Sẵn sàng] │ [Xem][Xóa│ │
│ └───────────────────────────┴────────┴───────┴────────────┴──────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1. Vùng Tải lên & Quét Laser (Upload & Scan Zone)
- **Khu vực Kéo-thả (Drag & Drop Area):**
  - Viền nét đứt linh hoạt (`border-dashed`), tự động đổi sang màu tím sáng khi người dùng kéo tệp vào vùng nhận diện.
  - **Hiệu ứng Laser Scan Beam:** Khi tệp đang được tải lên, một chùm tia laser màu tím xanh chuyển động quét dọc từ trên xuống dưới liên tục (`animate-scan-beam`), mang lại cảm giác công nghệ cao.
  - Bộ kiểm tra tính hợp lệ: Chỉ chấp nhận đuôi `.pdf`, `.docx`, dung lượng $\le 25MB$.
- **Thanh Tiến trình Pipeline RAG (Pipeline Stepper):**
  - 4 giai đoạn trực quan: Tiếp nhận tệp $\rightarrow$ Bóc tách cấu trúc $\rightarrow$ Phân đoạn ngữ nghĩa $\rightarrow$ Vector hóa ChromaDB.

### 4.2. Bảng Danh mục Giáo trình & Trạng thái Bóc tách
- Thanh công cụ phía trên gồm ô tìm kiếm giáo trình và nút lọc trạng thái.
- Danh sách dạng bảng gồm các cột:
  - **Tên giáo trình:** Kèm icon định dạng PDF/Word.
  - **Quy mô:** Số trang và số chương mục đã nhận diện được.
  - **Dung lượng:** Tính bằng MB.
  - **Trạng thái:** Huy hiệu phát quang: `ready` (Xanh lục - Sẵn sàng), `processing` (Vàng - Đang phân đoạn), `error` (Đỏ - Lỗi).
  - **Thao tác:** Nút Xem các đoạn trích RAG (`Eye`) và nút Xóa giáo trình (`Trash2`).

### 4.3. MÀN HÌNH PHỤ / MODAL 1: Thanh tra Đoạn trích RAG (`RAG Chunks Inspector Modal`)
- **Điều kiện kích hoạt:** Khi người dùng bấm vào nút Xem (`Eye`) trên một hàng giáo trình.
- **Cấu trúc Modal:**
  - Header: Tên giáo trình đang xem, số lượng đoạn trích vector (chunks) đã lưu trong ChromaDB.
  - Body: Danh sách cuộn các thẻ đoạn trích:
    - Số trang gốc vật lý (VD: `[Trang 42]`).
    - Tiêu đề chương mục tương ứng (VD: `Chương 3: Cung - Cầu và Giá cả thị trường`).
    - Nội dung trích dẫn thô được hiển thị với font monospace *JetBrains Mono*, làm nổi bật các thuật ngữ học thuật và định nghĩa quan trọng.
  - Footer: Nút Đóng modal (`Esc` hoặc bấm nút Đóng).

---

## 5. TRANG LỚN 3: KHỞI TẠO MA TRẬN ĐỀ THI AI (`AIGenerationScreen.tsx`)

Trái tim của hệ thống – nơi giảng viên thiết lập cấu hình sư phạm để AI biên soạn đề thi.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Cấu hình Ma trận Đề thi AI                     [AI Exam Engineering]  │
├────────────────────────────────────────────────────────────────────────┤
│ KHUÔN MẪU ĐỀ THI CHUẨN:                                                │
│ [ ⚡ Đề Giữa kỳ (20 câu) ]  [ ⚡ Đề Cuối kỳ (20 câu) ]  [ ⚡ 15 Phút (10 câu) ]│
├────────────────────────────────────────────────────────────────────────┤
│ 1. NGUỒN TRI THỨC GIÁO TRÌNH (RAG KNOWLEDGE SOURCE)                    │
│    Chọn sách: [ GiaoTrinh_KinhTeViMo_2025.pdf                        ▼ ]│
│    Chương mục cần lấy kiến thức:                                       │
│    [X] Chương 1: Khái quát kinh tế học vi mô                           │
│    [X] Chương 2: Cung - Cầu và cơ chế thị trường                       │
│    [ ] Chương 3: Lý thuyết hành vi người tiêu dùng                     │
├────────────────────────────────────────────────────────────────────────┤
│ 2. PHÂN BỔ MA TRẬN NHẬN THỨC (THANG ĐO BLOOM) - TỔNG: 20 CÂU           │
│    • Nhận biết  (40%): [────●────────────]  8 câu                     │
│    • Thông hiểu (40%): [────●────────────]  8 câu                     │
│    • Vận dụng   (20%): [──●──────────────]  4 câu                     │
│    • Phân tích  (0%):  [●────────────────]  0 câu                     │
├────────────────────────────────────────────────────────────────────────┤
│ 3. THANH CÂN BẰNG TỶ LỆ TRỰC QUAN (LIVE BALANCE BAR)                   │
│    [ Nhận biết: 40% ][ Thông hiểu: 40% ][ Vận dụng: 20% ] (100% Chuẩn) │
├────────────────────────────────────────────────────────────────────────┤
│              [ ✨ KÍCH HOẠT AI SINH BỘ ĐỀ THI TRẮC NGHIỆM ]            │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.1. Bộ Khuôn mẫu Chuẩn hóa Đại học (Quick Preset Templates)
- 3 nút bấm chọn mẫu nhanh giúp tiết kiệm thời gian cấu hình:
  - **Đề Giữa kỳ (20 câu):** 40% Nhận biết (8 câu), 40% Thông hiểu (8 câu), 20% Vận dụng (4 câu).
  - **Đề Cuối kỳ (20 câu):** 30% Nhận biết (6 câu), 40% Thông hiểu (8 câu), 20% Vận dụng (4 câu), 10% Phân tích (2 câu).
  - **Kiểm tra 15 phút (10 câu):** 70% Nhận biết (7 câu), 30% Thông hiểu (3 câu).

### 5.2. Chọn Nguồn Tri thức & Chương mục Giáo trình
- Dropdown chọn giáo trình: Tự động tải danh sách sách có trạng thái `ready` từ cơ sở dữ liệu.
- Bộ chọn chương mục (Multi-select Chips): Cho phép tích chọn hoặc bỏ chọn từng chương cụ thể. AI sẽ chỉ truy xuất các vector chunks nằm trong phạm vi các chương được chọn.

### 5.3. Bộ 4 Thanh trượt Ma trận Nhận thức Bloom
- Mỗi mức độ nhận thức có một thanh trượt (`input range` tùy biến gradient):
  - **Nhận biết (Remember):** Nhận diện định nghĩa, công thức, khái niệm cơ bản.
  - **Thông hiểu (Understand):** Diễn giải, phân biệt, giải thích hiện tượng.
  - **Vận dụng (Apply):** Tính toán số liệu, giải quyết tình huống thực tế.
  - **Phân tích (Analyze):** Phân tích tương quan đa chiều, đánh giá chính sách.
- Khi kéo thanh trượt, số lượng câu hỏi và tỷ lệ % sẽ được tính toán lại theo thời gian thực.

### 5.4. Thanh Cân bằng Tỷ lệ Trực quan (Live Matrix Balance Bar)
- Thanh dài hiển thị màu ghép đại diện cho 4 bậc Bloom.
- Hệ thống tự động kiểm tra tổng số lượng câu hỏi và tỷ lệ %:
  - Nếu phân bổ hợp lý: Hiển thị tag xanh lá *"Ma trận đạt chuẩn sư phạm"*.
  - Nếu thiếu câu hoặc vượt quá định mức: Cảnh báo vàng nhắc nhở giảng viên cân chỉnh.

### 5.5. MÀN HÌNH PHỤ / OVERLAY 2: Lớp phủ Đang Sinh Đề thi (`AI Generation Processing Overlay`)
- **Điều kiện kích hoạt:** Khi người dùng nhấn nút *"Kích hoạt AI Sinh Đề thi"*.
- **Cấu trúc Overlay:**
  - Nền mờ cực sâu (`backdrop-blur-2xl bg-black/80 z-50 fixed inset-0`).
  - Hộp thoại trung tâm với dải sóng phát quang đa sắc (`@keyframes shimmerWave`).
  - **Trình theo dõi trạng thái tuần tự 3 bước:**
    - Bước 1: *"Đang truy xuất ngữ cảnh RAG từ tài liệu..."*
    - Bước 2: *"LLM đang tổng hợp và sinh câu hỏi theo Thang đo Bloom..."*
    - Bước 3: *"Kiểm tra minh chứng trích dẫn và tạo phương án nhiễu..."*
  - Tự động chuyển hướng sang màn hình **Review Workspace** ngay khi hoàn tất.

---

## 6. TRANG LỚN 4: KHÔNG GIAN KIỂM DUYỆT RAG (`ReviewWorkspaceScreen.tsx`)

Màn hình chuyên sâu nhất – nơi giảng viên trực tiếp thẩm định, phê duyệt và đối sánh minh chứng RAG.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [<- Quay lại] KHÔNG GIAN KIỂM DUYỆT CÂU HỎI RAG     [✓ Duyệt tất cả (2)]│
│ [Tìm câu hỏi...]              [Bộ lọc Bloom: Tất cả]   [Chờ duyệt: 2/3]│
├──────────────────────────────────────┬─────────────────────────────────┤
│ CỘT TRÁI: DANH SÁCH CÂU HỎI (60%)    │ CỘT PHẢI: MINH CHỨNG GỐC (40%)  │
│ ┌──────────────────────────────────┐ │ ┌─────────────────────────────┐ │
│ │ Câu 2 • [Thông hiểu] • Tin cậy 95%│ │ │ TÀI LIỆU GỐC TRÍCH DẪN      │ │
│ │ Nếu trà và cà phê là 2 hàng hóa   │ │ │ GiaoTrinh_KinhTeViMo.pdf    │ │
│ │ thay thế, điều gì xảy ra khi giá  │ │ │ Chương 3 • Trang 45         │ │
│ │ cà phê tăng vọt?                 │ │ │ Độ tương đồng: 94%          │ │
│ │   (A) Đường cầu dịch sang phải   │ │ ├─────────────────────────────┤ │
│ │   (B) Lượng cầu trà giảm         │ │ │ Đoạn trích đối soát:        │ │
│ │   (•)[C] Cầu về trà sẽ tăng lên  │ │ │ "Hàng hóa thay thế là những │ │
│ │   (D) Giá cả hai giảm về 0       │ │ │  cặp hàng hóa thỏa mãn cùng │ │
│ │ ──────────────────────────────── │ │ │  một nhu cầu. Khi giá mặt   │ │
│ │ Giải thích: Vì là hàng hóa...    │ │ │  hàng X tăng lên..."        │ │
│ │ [✓ Duyệt] [✕ Bỏ qua] [✎ Sửa]     │ │ │                             │ │
│ └──────────────────────────────────┘ │ │ [🔒 Xác thực Zero-Hallucination│
│                                      │ └─────────────────────────────┘ │
├──────────────────────────────────────┴─────────────────────────────────┤
│ [DOCK NỔI] Phím tắt: [A] Phê duyệt câu | [R] Từ chối | [E] Sửa nhanh  │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1. Thanh Điều phối & Thao tác Hàng loạt (Review Control Bar)
- Nút quay lại màn hình Dashboard.
- Bộ đếm trạng thái: Số lượng câu đã duyệt / tổng số câu.
- Ô tìm kiếm nội dung câu hỏi hoặc chương mục.
- Nút **"Duyệt tất cả" (Batch Approve):** Cho phép giảng viên phê duyệt nhanh toàn bộ câu hỏi hợp lệ chỉ với một click.

### 6.2. Phân vùng Trái (60%): Thẻ Câu hỏi & Chế độ Chỉnh sửa Trực tiếp
- Hiển thị danh sách cuộn các thẻ câu hỏi được AI tạo ra:
  - **Header thẻ:** Số thứ tự, Huy hiệu cấp độ Bloom (Nhận biết/Thông hiểu/Vận dụng/Phân tích), Điểm tin cậy AI (Confidence Score, VD: `95%`).
  - **Nội dung câu hỏi:** In đậm, rõ ràng.
  - **4 Phương án trắc nghiệm A, B, C, D:** 
    - Phương án đúng được đánh dấu viền xanh ngọc kèm icon tích xanh (`CheckCircle2`).
    - Các phương án nhiễu có viền xám nhẹ.
  - **Phần giải thích sư phạm:** Nêu rõ căn cứ lý thuyết vì sao phương án đó đúng.
  - **Bộ nút tác vụ từng câu:**
    - Nút Duyệt (`Approve` - Phím tắt `A`).
    - Nút Từ chối (`Reject` - Phím tắt `R`).
    - Nút Chỉnh sửa (`Edit` - Phím tắt `E`): Mở form inline cho phép gõ lại đề bài, sửa từng đáp án, chọn lại đáp án đúng, sửa lời giải thích.
    - Nút AI Regenerate (`Sparkles`): Yêu cầu AI sinh lại riêng câu hỏi này nếu giảng viên chưa ưng ý.

### 6.3. Phân vùng Phải (40%): Bảng Minh chứng Đối soát RAG 2 Chiều
- Khi giảng viên bấm chọn vào bất kỳ câu hỏi nào ở cột trái, cột phải sẽ tự động hiển thị **đoạn trích tài liệu gốc tương ứng (Source Chunk)**:
  - Tên file giáo trình PDF gốc.
  - Tên chương và **Số trang vật lý chính xác** trong sách.
  - **Huy hiệu Relevance Score:** Đo lường mức độ tương đồng ngữ nghĩa vector giữa câu hỏi và đoạn trích (VD: `98%`).
  - **Đoạn trích nguyên văn:** Văn bản gốc từ giáo trình giúp giảng viên đối soát trong 3 giây mà không cần lật lại file PDF thủ công.
  - Tem bảo chứng *"Zero-Hallucination Certified"* đảm bảo câu hỏi 100% có nguồn gốc từ giáo trình.

### 6.4. THÀNH PHẦN PHỤ: Thanh Phím tắt Nổi (Keyboard Shortcuts Dock)
- Thanh dock nhỏ nằm cố định ở góc dưới màn hình.
- Nhắc nhở các phím bấm hỗ trợ giảng viên thẩm định đề thi với tốc độ cao:
  - `[A]` $\rightarrow$ Duyệt câu hiện tại.
  - `[R]` $\rightarrow$ Bỏ qua câu hiện tại.
  - `[E]` $\rightarrow$ Bật/tắt chế độ sửa câu hỏi.

---

## 7. TRANG LỚN 5: NGÂN HÀNG CÂU HỎI & XUẤT ĐỀ THI (`QuestionBankScreen.tsx`)

Kho lưu trữ tập trung toàn bộ câu hỏi đã được phê duyệt và công cụ đóng gói đề thi thành phẩm.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Ngân hàng Câu hỏi Chuẩn hóa (1 câu)            [📦 Đóng gói Đề thi]    │
│ [Tìm câu hỏi hoặc chương...]       [Tất cả] [Nhận biết] [Thông hiểu]...│
├────────────────────────────────────────────────────────────────────────┤
│ [X] CHỌN TẤT CẢ (1)                                                    │
│ ┌───┬───────────────────────────────────┬──────────────┬──────┬──────┐ │
│ │[X]│ Câu hỏi                           │ Giáo trình   │ Bloom│Điểm  │ │
│ ├───┼───────────────────────────────────┼──────────────┼──────┼──────┤ │
│ │[X]│ Theo quy luật cầu, trong điều kiện│ Kinh tế vi mô│ Nhận │ 99%  │ │
│ │   │ các yếu tố khác không đổi...      │ Chương 3     │ biết │      │ │
│ └───┴───────────────────────────────────┴──────────────┴──────┴──────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ [DOCK NỔI THAO TÁC HÀNG LOẠT]                                          │
│ Đã chọn 1 câu hỏi • Nhận biết: 1 câu | [Xóa] [Đóng gói Đề thi ngay ->] │
└────────────────────────────────────────────────────────────────────────┘
```

### 7.1. Bộ Lọc Đa tiêu chí & Thanh Tìm kiếm
- Ô tìm kiếm toàn văn câu hỏi và chương mục.
- Thanh lọc danh mục theo 4 mức độ nhận thức Bloom (Tất cả / Nhận biết / Thông hiểu / Vận dụng / Phân tích) với số lượng câu đếm tự động.

### 7.2. Bảng Dữ liệu Câu hỏi Đa chọn (Multi-select Question Table)
- Hỗ trợ checkbox chọn từng câu hoặc tick chọn toàn bộ.
- Hiển thị đầy đủ thông tin: Nội dung câu hỏi kèm đáp án đúng, Giáo trình nguồn, Cấp độ Bloom, Điểm chất lượng AI.

### 7.3. THÀNH PHẦN PHỤ: Bảng Điều khiển Tác vụ Nổi (Floating Action Dock)
- **Điều kiện xuất hiện:** Tự động trượt lên từ đáy màn hình khi giảng viên chọn $\ge 1$ câu hỏi.
- **Nội dung:**
  - Đếm tổng số câu đang chọn.
  - Tóm tắt phân bổ Bloom của các câu đang chọn.
  - Nút Xóa hàng loạt.
  - Nút mở hộp thoại **Đóng gói Đề thi**.

### 7.4. MÀN HÌNH PHỤ / MODAL 3: Cấu hình Đóng gói & Xuất Đề thi (`Exam Export Modal`)
- **Điều kiện kích hoạt:** Khi bấm nút *"Đóng gói Đề thi"* hoặc chọn định dạng xuất.
- **Cấu trúc Form Cấu hình Chuyên sâu:**
  1. **Thông tin Hành chính Học thuật:**
     - Tên trường đại học (VD: *ĐẠI HỌC QUỐC GIA*).
     - Khoa / Bộ môn (VD: *Khoa Kinh tế & Quản trị*).
     - Tên học phần / Môn học (VD: *Kinh tế vi mô*).
     - Tiêu đề kỳ thi (VD: *ĐỀ THI KẾT THÚC HỌC PHẦN - HỌC KỲ II*).
     - Thời gian làm bài: 15 / 45 / 60 / 90 / 120 phút.
  2. **Quy tắc Hoán vị & Bảo mật Đề thi:**
     - Số lượng mã đề cần tạo: Tùy chọn sinh từ **1 đến 8 mã đề** khác nhau (VD: Mã đề 101, 102, 103, 104).
     - Checkbox: *Xáo trộn thứ tự các câu hỏi (Shuffle Questions)*.
     - Checkbox: *Xáo trộn thứ tự phương án A/B/C/D (Shuffle Options)*.
  3. **Tùy chọn Bổ sung:**
     - Checkbox: *Xuất kèm Bảng đáp án chấm thi (Answer Key Matrix)*.
     - Checkbox: *Xuất kèm Lời giải thích minh chứng RAG chi tiết*.
  4. **Lựa chọn Định dạng Đầu ra:**
     - **Microsoft Word (.docx):** Định dạng chuẩn văn bản hành chính theo quy chế đào tạo đại học, giảng viên có thể chỉnh sửa tự do.
     - **Adobe PDF (.pdf):** Đề thi hoàn chỉnh kèm khung tiêu đề và phiếu trả lời trắc nghiệm chuẩn máy chấm tự động.
     - **Canvas / Moodle LMS (QTI Zip):** Gói nén chuẩn XML QTI 2.1 nhập trực tiếp vào hệ thống thi trực tuyến của trường.
  5. **Nút Hành động:** *"Xác nhận & Tải xuống Bộ Đề thi"*.

---

## 8. BẢNG TỔNG HỢP LUỒNG TƯƠNG TÁC NGƯỜI DÙNG (USER FLOW MATRIX)

| Bước | Phân hệ thực hiện | Thao tác của Giảng viên | Phản hồi của Hệ thống | Màn hình phụ / Modal liên quan |
|---|---|---|---|---|
| **1** | `TextbookUploadScreen` | Kéo thả file PDF giáo trình vào vùng upload | Kích hoạt hiệu ứng Laser scan, gọi API bóc tách text và sinh vector embeddings | `RAG Chunks Inspector Modal` để kiểm tra đoạn trích |
| **2** | `AIGenerationScreen` | Chọn khuôn mẫu (VD: Giữa kỳ) và chọn chương mục | Sliders Bloom tự động cân bằng tỷ lệ 40-40-20, Live Balance Bar báo chuẩn | `AI Generation Processing Overlay` hiển thị tiến trình sinh câu hỏi |
| **3** | `ReviewWorkspaceScreen` | Nhấn phím `A` duyệt câu, nhấn `E` sửa câu hỏi | Cập nhật trạng thái `approved`, đối chiếu tức thì với văn bản gốc ở cột phải | Form Inline Edit & Keyboard Shortcuts Dock |
| **4** | `QuestionBankScreen` | Lọc các câu đã duyệt và nhấn "Đóng gói Đề thi" | Mở bảng cấu hình xuất đề | `Exam Export Modal` (chọn số mã đề, đảo phương án, tải Word/PDF/QTI) |
| **5** | Toàn bộ ứng dụng | Bất kỳ thao tác nạp, lưu, duyệt, xuất | Hiển thị Toast thông báo trạng thái kính mờ tương ứng | `ToastContainer` tự đóng sau 4.5s |

---

*Hồ sơ tài liệu này phản ánh chính xác 100% cấu trúc mã nguồn hiện tại của thư mục `src/` trong dự án QuizGen AI.*
