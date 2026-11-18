# ĐẶC TẢ KIẾN TRÚC & YÊU CẦU DỊCH VỤ HỖ TRỢ HỌC THUẬT & CSKH (SUPPORT SERVICE SPECIFICATION)

**Dịch vụ:** `support-service` (Dự kiến Cổng 8008 / Microservice Quản lý Ticket Hỗ trợ, Trung tâm Tri thức FAQ, Trợ lý AI Hỗ trợ & Đo lường SLA)  
**Hệ thống:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Học thuật Đa phương thức  
**Kỹ sư Phụ trách & Tác giả đặc tả:** Ngô Phạm Công Đức (052205015692)  
**Phiên bản:** v1.0.0 Architecture & Functional Specification  
**Ngày phát hành:** 18/11/2026  
**Trạng thái:** Dự thảo Trình duyệt (Draft / Ready for Review)

---

## MỤC LỤC TỔNG QUAN

1. [Mục tiêu & Tầm nhìn Nghiệp vụ](#1-mục-tiêu--tầm-nhìn-nghiệp-vụ)
2. [Kiến trúc Tổng thể Hệ thống & Luồng Dữ liệu (Architecture & Data Flow)](#2-kiến-trúc-tổng-thể-hệ-thống--luồng-dữ-liệu-architecture--data-flow)
3. [Phân loại Yêu cầu Hỗ trợ & Ma trận Nghiệp vụ (Ticket Taxonomy & Category Matrix)](#3-phân-loại-yêu-cầu-hỗ-trợ--ma-trận-nghiệp-vụ-ticket-taxonomy--category-matrix)
4. [Động cơ Quản lý Vòng đời Ticket Hỗ trợ (Ticket Lifecycle Engine)](#4-động-cơ-quản-lý-vòng-đời-ticket-hỗ-trợ-ticket-lifecycle-engine)
5. [Trợ lý AI Hỗ trợ Tự động & Gợi ý Giải pháp (AI Support Copilot & Auto-Triage)](#5-trợ-lý-ai-hỗ-trợ-tự-động--gợi-ý-giải-pháp-ai-support-copilot--auto-triage)
6. [Trung tâm Tri thức & Cẩm nang Học thuật (Knowledge Base & FAQ Center)](#6-trung-tâm-tri-thức--cẩm-nang-học-thuật-knowledge-base--faq-center)
7. [Chính sách & Bộ Đo lường Cam kết Chất lượng Dịch vụ (SLA & Escalation Policy)](#7-chính-sách--bộ-đo-lường-cam-kết-chất-lượng-dịch-vụ-sla--escalation-policy)
8. [Đặc tả Cơ sở Dữ liệu Chi tiết (Database Schema Specification)](#8-đặc-tả-cơ-sở-dữ-liệu-chi-tiết-database-schema-specification)
9. [Đặc tả Giao tiếp API RESTful Endpoints](#9-đặc-tả-giao-tiếp-api-restful-endpoints)
10. [Đặc tả Giao diện Người dùng & Trải nghiệm UI/UX (Frontend Support Center)](#10-đặc-tả-giao-diện-người-dùng--trải-nghiệm-uiux-frontend-support-center)
11. [Kế hoạch & Lộ trình Triển khai Kỹ thuật (Implementation Roadmap)](#11-kế-hoạch--lộ-trình-triển-khai-kỹ-thuật-implementation-roadmap)

---

## 1. MỤC TIÊU & TẦM NHÌN NGHIỆP VỤ

Trong hệ sinh thái khảo thí học thuật **QuizGen AI**, đối tượng người dùng chủ yếu là Giảng viên Đại học, Trưởng Bộ môn, Cán bộ Khảo thí và Sinh viên. Trong quá trình vận hành, người dùng thường xuyên phát sinh các vấn đề kỹ thuật và nghiệp vụ phức tạp đòi hỏi cơ chế tiếp nhận, điều phối và xử lý phản hồi tức thì, bao gồm:
- **Sự cố bóc tách giáo trình:** Tệp PDF/DOCX có cấu trúc bảng biểu phức tạp, công thức toán học bị biến dạng, quét ảnh (Scanned PDF) chất lượng kém cần hỗ trợ OCR chuyên sâu.
- **Phản hồi chất lượng câu hỏi AI:** Báo cáo câu hỏi có nghi vấn ảo giác (Hallucination), đáp án trắc nghiệm gây tranh cãi, sai lệch tỷ lệ phân bổ ma trận Bloom.
- **Sự cố đóng gói & in ấn khảo thí:** Lỗi hiển thị công thức LaTeX trên Microsoft Word, sai lệch tọa độ phiếu trả lời trắc nghiệm OMR khi in trên máy in thực tế của trường thi, lỗi import tệp IMS QTI 2.1 vào hệ thống Canvas/Moodle LMS.
- **Hỗ trợ thanh toán & phân bổ hạn mức:** Khiếu nại giao dịch chuyển khoản VietQR bị trễ, yêu cầu hoàn tiền hoặc xuất hóa đơn tài chính doanh nghiệp/trường học.
- **Đóng góp sáng kiến & yêu cầu tính năng:** Giảng viên đề xuất thêm mẫu đề thi đặc thù theo chuẩn đầu ra của từng khối ngành kỹ thuật, kinh tế, y dược.

**Dịch vụ `support-service` được xây dựng với các mục tiêu cốt lõi:**
1. **Đa kênh tập trung (Omnichannel Ticketing):** Tiếp nhận yêu cầu từ giao diện Web App, Widget Live Chat nổi, email hỗ trợ học thuật và liên kết cảnh báo từ hệ thống giám sát.
2. **Tự động hóa bằng AI (AI-Powered First-Line Support):** Tận dụng mô hình ngôn ngữ lớn và RAG để đọc hiểu ngữ cảnh sự cố, tự động đề xuất bài viết cẩm nang (FAQ) và giải pháp khắc phục ngay khi người dùng đang nhập nội dung ticket.
3. **Phân cấp xử lý theo cam kết dịch vụ (Strict SLA):** Thiết lập quy tắc thời gian phản hồi đầu tiên (First Response Time) và thời gian giải quyết dứt điểm (Resolution Time) căn cứ trên cấp độ tài khoản (`FREE`, `PRO`, `ENTERPRISE`).
4. **Phân tích nguồn gốc sự cố (Root Cause Analytics):** Tổng hợp thống kê các lỗi thường gặp nhất để gửi báo cáo tuần/tháng cho các đội ngũ phát triển phụ trách (`document-service`, `ai-service`, `exam-service`, `payment-service`) nhằm liên tục tối ưu hóa sản phẩm.

---

## 2. KIẾN TRÚC TỔNG THỂ HỆ THỐNG & LUỒNG DỮ LIỆU (ARCHITECTURE & DATA FLOW)

### 2.1. Vị trí trong Hệ sinh thái Microservices
`support-service` vận hành độc lập trên **Cổng 8008**, định tuyến qua Cổng điều phối tập trung **API Gateway (Port 8000)** và trao đổi dữ liệu an toàn với các microservice vệ tinh:

```
                                ┌────────────────────────────────────────┐
                                │             React Frontend             │
                                │   Support Center, Ticket Modal, FAB    │
                                └───────────────────┬────────────────────┘
                                                    │
                                                    ▼
                                ┌────────────────────────────────────────┐
                                │       API Gateway (Port 8000)          │
                                │        Proxy: /api/v1/support/*        │
                                └───────┬────────────────────────┬───────┘
                                        │                        │
                ┌───────────────────────┘                        └───────────────────────┐
                ▼                                                                        ▼
 ┌──────────────────────────────┐                                        ┌──────────────────────────────┐
 │   Auth Service (Port 8001)   │                                        │  Support Service (Port 8008) │
 │ • Xác thực JWT & Role        │                                        │ • Quản lý Ticket & Thread    │
 │ • Cung cấp User Profile      │                                        │ • Knowledge Base FAQ RAG     │
 └──────────────┬───────────────┘                                        │ • Auto-Triage & Sentiment AI │
                │                                                        │ • Giám sát SLA & Cảnh báo    │
                │                                                        └──────────────┬───────────────┘
                ▼                                                                       │
 ┌──────────────────────────────┐                                                       │
 │  Exam Service (Port 8005)    │ ◄─────────────────────────────────────────────────────┤
 │ • Báo lỗi xuất Word/PDF/OMR  │  (Truy vết context lỗi đề thi)                        │
 └──────────────────────────────┘                                                       ▼
 ┌──────────────────────────────┐                                        ┌──────────────────────────────┐
 │  Payment Service (Port 8007) │ ◄───────────────────────────────────── │   Admin Service (Port 8006)  │
 │ • Tra cứu mã Order VietQR    │  (Đối chiếu giao dịch trễ)             │ • Phân công Ticket cho Admin │
 └──────────────────────────────┘                                        │ • Báo cáo KPI CSAT tổng thể  │
                                                                         └──────────────────────────────┘
```

### 2.2. Luồng Xử lý Nghiệp vụ Một Ticket Hỗ trợ (End-to-End Workflow)

```
[Giảng viên gặp lỗi] 
         │
         ▼
[Mở Modal / Tạo Ticket Hỗ trợ] ──► Chọn Phân hệ (VD: Exam Exporter OMR)
         │
         ▼
[AI Auto-Suggest Engine] ────────► Gợi ý 3 bài viết FAQ phù hợp nhất từ Knowledge Base
         │
         ├───► [Người dùng tự giải quyết được] ──► Đóng ticket ngay (Self-service Resolution)
         │
         └───► [Người dùng bấm "Gửi yêu cầu"]
                     │
                     ▼
       [Khởi tạo Ticket trên Support Service (8008)]
                     │
                     ├─► Gắn mã Ticket: TK-2026-XXXXX
                     ├─► Tính toán hạn SLA (Dựa trên gói cước: Free/Pro/Enterprise)
                     ├─► Gửi Email xác nhận tự động tới Giảng viên
                     └─► Bắn Notification cảnh báo tới Kênh điều hành Admin / Q-Group
                                 │
                                 ▼
                     [Kỹ sư / Nhân viên Hỗ trợ tiếp nhận]
                                 │
                                 ├── Đàm thoại 2 chiều (Threaded Chat / Attachments)
                                 ├── Ghi chú nội bộ bí mật (Internal Staff Notes)
                                 │
                                 ▼
                     [Xử lý & Chuyển trạng thái: RESOLVED]
                                 │
                                 ▼
                     [Khảo sát Mức độ Hài lòng CSAT 1-5 Sao]
                                 │
                                 ▼
                     [Đóng Ticket: CLOSED]
```

---

## 3. PHÂN LOẠI YÊU CẦU HỖ TRỢ & MA TRẬN NGHIỆP VỤ (TICKET TAXONOMY & CATEGORY MATRIX)

Mỗi yêu cầu hỗ trợ được chuẩn hóa theo danh mục phân hệ rõ ràng để tự động điều hướng đúng kỹ sư phụ trách:

| Mã Danh mục (`category`) | Tên Phân hệ Nghiệp vụ | Mô tả tình huống lỗi thường gặp | Mức độ ưu tiên mặc định (`priority`) | Kỹ sư / Đội ngũ điều phối chính |
| :--- | :--- | :--- | :---: | :--- |
| `DOC_PARSING_ERROR` | Xử lý & Bóc tách Giáo trình | Lỗi nạp PDF dung lượng lớn, lỗi OCR không đọc được chữ tiếng Việt, thiếu chương mục. | `MEDIUM` | Document Service Team (`Port 8002`) |
| `AI_HALLUCINATION` | Chất lượng Câu hỏi AI | Câu hỏi không có trong giáo trình, sai lệch đáp án đúng, phân bổ sai tỷ lệ nhận thức Bloom. | `HIGH` | AI / RAG Service Team (`Port 8003/8004`) |
| `EXAM_EXPORT_ERROR` | Đóng gói & Xuất bản Khảo thí | Lỗi vỡ font LaTeX trên Word, lệch tọa độ in phiếu OMR 50 câu, lỗi import Canvas/Moodle QTI. | `CRITICAL` | **Exam Service Team (`Port 8005`)** |
| `PAYMENT_BILLING` | Giao dịch & Gói cước VietQR | Quét mã VietQR tiền đã trừ nhưng chưa kích hoạt PRO, lỗi hóa đơn điện tử, gia hạn dịch vụ. | `HIGH` | Payment Service Team (`Port 8007`) |
| `ACCOUNT_SECURITY` | Tài khoản & Bảo mật | Quên mật khẩu không nhận OTP, sự cố đăng nhập Google SSO, yêu cầu xóa vĩnh viễn dữ liệu. | `HIGH` | Auth Service Team (`Port 8001`) |
| `FEATURE_REQUEST` | Đề xuất Tính năng Mới | Yêu cầu thêm mẫu đề thi chuyên ngành, tính năng chấm tự động bằng camera, v.v. | `LOW` | Product Owner & Architecture Team |
| `GENERAL_INQUIRY` | Hướng dẫn & Hỏi đáp Chung | Thắc mắc về chính sách sử dụng, cách khai thác ngân hàng đề thi chung. | `LOW` | Academic Community Support Team |

---

## 4. ĐỘNG CƠ QUẢN LÝ VÒNG ĐỜI TICKET HỖ TRỢ (TICKET LIFECYCLE ENGINE)

### 4.1. Biểu đồ Chuyển dịch Trạng thái (Finite State Machine - FSM)

```
        ┌────────────────────────────────────────────────────────┐
        │                                                        │
        ▼                                                        │
    [ OPEN ] ──────────────► [ IN_PROGRESS ] ──────────► [ RESOLVED ] ──────────► [ CLOSED ]
        │                           │                          ▲                     ▲
        │                           ▼                          │                     │
        │                   [ WAITING_USER ] ──────────────────┤                     │
        │                           │                          │                     │
        │                           ▼                          │                     │
        └───────────────────► [ CANCELLED ] ───────────────────┴─────────────────────┘
```

### 4.2. Định nghĩa các Trạng thái:
1. **`OPEN` (Mới tiếp nhận):** Ticket vừa được tạo từ phía người dùng, hệ thống đã cấp mã số và ghi nhận mốc thời gian tính SLA.
2. **`IN_PROGRESS` (Đang xử lý):** Kỹ sư hỗ trợ đã mở ticket, tiếp nhận và đang tiến hành kiểm tra mã nguồn, đối soát log hoặc trao đổi với người dùng.
3. **`WAITING_USER` (Chờ người dùng phản hồi):** Kỹ sư đã gửi câu hỏi hoặc hướng dẫn khắc phục sơ bộ, hệ thống tạm dừng đồng hồ tính SLA thời gian giải quyết cho đến khi người dùng gửi phản hồi mới.
4. **`RESOLVED` (Đã giải quyết):** Sự cố đã được xử lý thành công (Ví dụ: Đã cấp bù tín dụng, đã sửa lỗi định dạng tệp Word/PDF xuất ra). Người dùng có 48 giờ để xác nhận hoặc mở lại ticket (Reopen).
5. **`CLOSED` (Đóng hoàn tất):** Sau 48 giờ kể từ khi chuyển sang `RESOLVED` mà không có khiếu nại phát sinh, hệ thống tự động khóa ticket và gửi phiếu khảo sát CSAT.
6. **`CANCELLED` (Đã hủy):** Người dùng tự hủy yêu cầu hoặc ticket được xác định là trùng lặp (Duplicate).

---

## 5. TRỢ LÝ AI HỖ TRỢ TỰ ĐỘNG & GỢI Ý GIẢI PHÁP (AI SUPPORT COPILOT & AUTO-TRIAGE)

### 5.1. Cơ chế Auto-Triage & Phân tích Cảm xúc (Sentiment Analysis)
Khi ticket được tạo, `support-service` chuyển tiêu đề và mô tả đến mô hình AI để xử lý trước (Pre-processing):
- **Trích xuất thực thể (Entity Extraction):** Tự động phát hiện mã đề thi (`101`, `102`), mã giáo trình (`doc_id`), mã giao dịch chuyển khoản (`ORDER_xxxxxx`).
- **Đánh giá mức độ bức xúc (Frustration Score):** Đánh giá sắc thái văn phong từ $1$ (Bình thường) đến $5$ (Rất khẩn cấp/Bức xúc). Nếu điểm số $\ge 4$, hệ thống tự động tăng cấp độ ưu tiên lên **`CRITICAL`** và phát chuông cảnh báo tới Support Lead.

### 5.2. Công nghệ Tự phục vụ Thông minh (Smart Self-Service RAG)
- Khi giảng viên soạn mô tả: *"Tôi xuất file Word bị lỗi hiển thị ký hiệu tích phân..."*, hệ thống gọi API `/api/v1/support/ai/auto-suggest`.
- Mô hình RAG tìm kiếm trong Trung tâm Tri thức FAQ và hiển thị ngay hộp gợi ý màu xanh ngọc:
  > **💡 Giải pháp gợi ý tức thì:** *"Bạn đang dùng phiên bản Office cũ chưa bật phông chữ Cambria Math? Hãy thử tải bản PDF Vector OMR có sẵn ký tự Unicode chuẩn hóa từ nút xuất đề thi."*
- Giúp giải quyết tự động **35% - 45%** các thắc mắc phổ biến mà không cần tiêu tốn nhân lực kỹ sư trực tiếp.

---

## 6. TRUNG TÂM TRI THỨC & CẨM NANG HỌC THUẬT (KNOWLEDGE BASE & FAQ CENTER)

Hệ thống quản lý kho bài viết học thuật được phân loại theo cấu trúc danh mục phân cấp:

```
Trung tâm Tri thức Khảo thí (Knowledge Base)
├── 1. Hướng dẫn Nạp & Bóc tách Giáo trình
│   ├── Hướng dẫn tải lên tệp PDF scan không bị lỗi font
│   └── Quy cách đặt tên chương mục để AI nhận dạng mục lục 100%
├── 2. Biên soạn Đề thi theo Thang đo Bloom
│   ├── Cách căn chỉnh tỷ lệ 4 bậc nhận thức cho đề Giữa kỳ và Cuối kỳ
│   └── Soạn thảo công thức toán học LaTeX trực quan
├── 3. Đóng gói & In ấn Khảo thí (Exam Exporter)
│   ├── Chuẩn in ấn khổ giấy A4 và cách căn lề máy in trường thi
│   ├── Hướng dẫn sử dụng Phiếu trả lời trắc nghiệm chuẩn OMR 50 câu
│   └── Nhập đề thi trực tiếp vào Canvas LMS và Moodle qua tệp IMS QTI 2.1
└── 4. Chính sách Gói cước & Thanh toán VietQR
    ├── Quy trình thanh toán chuyển khoản quét mã VietQR tự động
    └── Hướng dẫn đăng ký gói cước Học viện / Tổ chức (Enterprise)
```

Mỗi bài viết FAQ hỗ trợ đánh giá tương tác 2 nút: **"Bài viết này hữu ích" (👍)** hoặc **"Chưa hữu ích" (👎)** để thuật toán tự động sắp xếp độ ưu tiên hiển thị bài viết chất lượng cao nhất lên đầu trang.

---

## 7. CHÍNH SÁCH & BỘ ĐO LƯỜNG CAM KẾT CHẤT LƯỢNG DỊCH VỤ (SLA & ESCALATION POLICY)

Cam kết thời gian phản hồi và xử lý căn cứ theo Hạng Gói cước của Giảng viên:

| Hạng Tài khoản | Thời gian Phản hồi Đầu tiên (First Response SLA) | Thời gian Giải quyết Sự cố (Resolution SLA) | Kênh Tiếp nhận Ưu tiên | Cơ chế Leo thang (Escalation) |
| :--- | :---: | :---: | :--- | :--- |
| **Enterprise / Institutional** | $\le \mathbf{1\,\text{giờ}}$ (24/7) | $\le \mathbf{4\,\text{giờ}}$ | Hotline Kỹ thuật riêng, Kênh Q-Group VIP, Portal | Tự động thông báo tới Giám đốc Kỹ thuật (CTO) nếu quá 2 giờ chưa xử lý. |
| **Pro Academic** | $\le \mathbf{4\,\text{giờ}}$ (Giờ hành chính) | $\le \mathbf{12\,\text{giờ}}$ | Support Center, Ticket Portal | Cảnh báo tới Trưởng nhóm Kỹ thuật (Tech Lead) nếu quá 8 giờ. |
| **Free Tier** | $\le \mathbf{24\,\text{giờ}}$ | $\le \mathbf{48\,\text{giờ}}$ | FAQ Self-service, Ticket công cộng | Xử lý theo hàng đợi tuần tự (FIFO Queue). |

---

## 8. ĐẶC TẢ CƠ SỞ DỮ LIỆU CHI TIẾT (DATABASE SCHEMA SPECIFICATION)

Dữ liệu của `support-service` được thiết kế chặt chẽ trong hệ quản trị **PostgreSQL** với các bảng quan hệ độc lập:

```sql
-- 1. BẢNG DANH MỤC TRUNG TÂM TRI THỨC (FAQ CATEGORIES)
CREATE TABLE IF NOT EXISTS support_faq_categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'HelpCircle',
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG BÀI VIẾT CẨM NANG HƯỚNG DẪN (FAQ ARTICLES)
CREATE TABLE IF NOT EXISTS support_faq_articles (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) REFERENCES support_faq_categories(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content_markdown TEXT NOT NULL,
    tags VARCHAR(255),
    view_count INT DEFAULT 0,
    helpful_count INT DEFAULT 0,
    unhelpful_count INT DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG TICKET HỖ TRỢ KỸ THUẬT (SUPPORT TICKETS)
CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(36) PRIMARY KEY,
    ticket_code VARCHAR(20) UNIQUE NOT NULL, -- Ví dụ: TK-2026-10293
    user_id VARCHAR(36) NOT NULL,            -- ID Giảng viên tạo ticket
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) DEFAULT 'LECTURER',
    user_tier VARCHAR(20) DEFAULT 'FREE',     -- FREE, PRO, ENTERPRISE
    category VARCHAR(50) NOT NULL,           -- DOC_PARSING_ERROR, EXAM_EXPORT_ERROR, v.v.
    priority VARCHAR(20) DEFAULT 'MEDIUM',   -- LOW, MEDIUM, HIGH, CRITICAL
    status VARCHAR(20) DEFAULT 'OPEN',       -- OPEN, IN_PROGRESS, WAITING_USER, RESOLVED, CLOSED, CANCELLED
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    assigned_admin_id VARCHAR(36),           -- Kỹ sư / Admin được phân công xử lý
    sla_first_response_due TIMESTAMP WITH TIME ZONE NOT NULL,
    sla_resolution_due TIMESTAMP WITH TIME ZONE NOT NULL,
    first_responded_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    is_sla_breached BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. BẢNG TIN NHẮN & THREAD TRAO ĐỔI TRONG TICKET (TICKET MESSAGES)
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(36) REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id VARCHAR(36) NOT NULL,
    sender_name VARCHAR(150) NOT NULL,
    sender_role VARCHAR(50) NOT NULL,        -- USER, SUPPORT_STAFF, ADMIN, SYSTEM_BOT
    message_body TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT FALSE,  -- Ghi chú nội bộ giữa các kỹ sư (Người dùng không thấy)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. BẢNG TỆP TIN ĐÍNH KÈM MINH CHỨNG SỰ CỐ (TICKET ATTACHMENTS)
CREATE TABLE IF NOT EXISTS support_attachments (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(36) REFERENCES support_tickets(id) ON DELETE CASCADE,
    message_id VARCHAR(36) REFERENCES support_ticket_messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. BẢNG KHẢO SÁT ĐÁNH GIÁ CHẤT LƯỢNG CSAT (CUSTOMER SATISFACTION FEEDBACK)
CREATE TABLE IF NOT EXISTS support_feedbacks (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(36) UNIQUE REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL,
    rating_stars INT CHECK (rating_stars >= 1 AND rating_stars <= 5),
    feedback_text TEXT,
    resolved_efficiently BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 9. ĐẶC TẢ GIAO TIẾP API RESTFUL ENDPOINTS

Tất cả các API được bảo vệ qua JWT Middleware tại API Gateway và có tiền tố `/api/v1/support/*`:

### 9.1. Nhóm API Quản lý Ticket Hỗ trợ:
- `POST /api/v1/support/tickets`: Khởi tạo ticket hỗ trợ mới kèm tệp tin đính kèm log/ảnh lỗi.
- `GET /api/v1/support/tickets`: Tra cứu danh sách ticket của người dùng (hỗ trợ phân trang, lọc theo trạng thái `OPEN`, `RESOLVED`).
- `GET /api/v1/support/tickets/{ticket_id}`: Lấy chi tiết lịch sử đàm thoại và các tệp đính kèm của một ticket.
- `POST /api/v1/support/tickets/{ticket_id}/messages`: Gửi tin nhắn phản hồi mới trong luồng ticket.
- `PATCH /api/v1/support/tickets/{ticket_id}/status`: Cập nhật trạng thái ticket (`RESOLVED`, `CLOSED`, `REOPEN`).
- `POST /api/v1/support/tickets/{ticket_id}/feedback`: Gửi đánh giá mức độ hài lòng 5 sao và nhận xét.

### 9.2. Nhóm API Cẩm nang Tri thức (FAQ Knowledge Base):
- `GET /api/v1/support/faq/categories`: Lấy danh mục các chủ đề hỗ trợ học thuật.
- `GET /api/v1/support/faq/articles`: Tìm kiếm toàn văn các bài viết hướng dẫn kèm từ khóa.
- `GET /api/v1/support/faq/articles/{article_slug}`: Xem toàn văn nội dung bài viết dưới dạng Markdown.
- `POST /api/v1/support/faq/articles/{article_id}/vote`: Bầu chọn bài viết hữu ích (Vote Up / Down).

### 9.3. Nhóm API Trợ lý AI Hỗ trợ & Đo lường:
- `POST /api/v1/support/ai/auto-suggest`: Truy vấn RAG tự động đề xuất cách khắc phục sự cố dựa trên văn bản mô tả lỗi của người dùng.
- `GET /api/v1/support/admin/metrics`: Thống kê thời gian thực dành cho Quản trị viên (Tổng số ticket mở, tỷ lệ vi phạm SLA %, điểm CSAT trung bình, phân bổ nguyên nhân lỗi).

---

## 10. ĐẶC TẢ GIAO DIỆN NGƯỜI DÙNG & TRẢI NGHIỆM UI/UX (FRONTEND SUPPORT CENTER)

Hệ thống cung cấp trải nghiệm hỗ trợ chuẩn học thuật cao cấp theo phong cách **Deep Dark Glassmorphism**:

1. **Nút Hỗ trợ Nổi Đa năng (Floating Action Button - FAB):**
   - Đặt cố định ở góc dưới bên phải màn hình (`bottom-6 right-6`), biểu tượng tai nghe hỗ trợ phát sáng xanh ngọc (`#10b981`).
   - Khi bấm, mở rộng menu nhanh: *"Tra cứu Cẩm nang FAQ"*, *"Gửi Ticket Hỗ trợ Kỹ thuật"*, hoặc *"Trò chuyện với AI Copilot"*.
2. **Trung tâm Hỗ trợ Toàn diện (`SupportCenterScreen.tsx`):**
   - Thanh tìm kiếm thông minh nổi bật: *"Tìm câu trả lời về bóc tách giáo trình, xuất Word, PDF OMR, ma trận Bloom..."*.
   - Khối lưới (Grid) hiển thị 4 nhóm chủ đề chính với icon sắc nét từ `Lucide React`.
   - Danh sách các Ticket gần đây của tôi kèm thẻ trạng thái nhiều màu: Xanh dương (`OPEN`), Cam (`IN_PROGRESS`), Xanh lục (`RESOLVED`).
3. **Cửa sổ Soạn Ticket Trực quan (`CreateTicketModal.tsx`):**
   - Vùng kéo thả ảnh chụp màn hình lỗi (Drag & Drop Screenshots).
   - Tự động điền thông tin môi trường của người dùng (Trình duyệt, Hệ điều hành, Độ phân giải màn hình) vào metadata để giúp kỹ sư tái hiện lỗi nhanh chóng.
   - Hộp gợi ý tự động (AI Auto-Suggest Box) xuất hiện mềm mại ở góc phải để hỗ trợ người dùng tự giải quyết nhanh chóng.

---

## 11. KẾ HOẠCH & LỘ TRÌNH TRIỂN KHAI KỸ THUẬT (IMPLEMENTATION ROADMAP)

Để đảm bảo tiến độ tích hợp an toàn và không gây xáo trộn đến các phân hệ lõi đang vận hành (`exam-service`, `ai-service`, `payment-service`), kế hoạch triển khai `support-service` được chia thành 4 giai đoạn cụ thể:

```
┌────────────────────────────────────────────────────────────────────────┐
│               LỘ TRÌNH PHÁT TRIỂN & TÍCH HỢP SUPPORT SERVICE           │
├────────────────────────────────────────────────────────────────────────┤
│ Giai đoạn 1 (Tuần 1): Thiết kế Schema Database & Khung Service FastAPI │
│ • Tạo thư mục services/support-service/ (Cổng 8008)                    │
│ • Viết migration bảng PostgreSQL: support_tickets, faq, messages       │
│ • Thiết lập cấu hình Dockerfile & kết nối API Gateway (Port 8000)      │
├────────────────────────────────────────────────────────────────────────┤
│ Giai đoạn 2 (Tuần 2): Xây dựng API Quản trị Ticket & Hệ thống SLA      │
│ • Viết CRUD API Ticket, Threaded Messages, tải tệp đính kèm            │
│ • Cài đặt thuật toán tính hạn chót SLA theo Gói Free/Pro/Enterprise    │
│ • Tích hợp hệ thống Email thông báo tự động (SMTP / Brevo API)         │
├────────────────────────────────────────────────────────────────────────┤
│ Giai đoạn 3 (Tuần 3): Phát triển Trung tâm Tri thức FAQ & AI RAG       │
│ • Xây dựng bộ API quản lý bài viết Cẩm nang Hướng dẫn                  │
│ • Tích hợp mô hình RAG tra cứu nội dung gợi ý tự động khi gõ mô tả lỗi │
├────────────────────────────────────────────────────────────────────────┤
│ Giai đoạn 4 (Tuần 4): Hoàn thiện UI/UX Frontend & Kiểm thử E2E        │
│ • Thiết kế SupportCenterScreen.tsx, Floating Support FAB Widget        │
│ • Viết bộ kiểm thử tự động (Unit Tests & Integration Tests đạt >= 85%) │
│ • Nghiệm thu kỹ thuật và đưa vào vận hành chính thức                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## PHÊ DUYỆT TÀI LIỆU ĐẶC TẢ

| Vai trò đại diện | Họ và tên | Chữ ký & Ngày xác nhận |
| :--- | :--- | :--- |
| **Kỹ sư Trưởng Thiết kế & Tác giả:** | Ngô Phạm Công Đức (052205015692) | *(Đã ký điện tử - 18/11/2026)* |
| **Đại diện Kiến trúc Hệ thống:** | Nhóm Kỹ thuật QuizGen AI | *(Đã thông qua bản dự thảo)* |
| **Trưởng ban Quản trị Dự án (Scrum Master):** | Ban Điều hành Kỹ thuật UTH | *(Sẵn sàng đưa vào Sprint kế tiếp)* |

---
*Tài liệu đặc tả này là căn cứ kỹ thuật chuẩn hóa để tiến hành khởi tạo mã nguồn cho `services/support-service` trong kiến trúc Microservices của nền tảng QuizGen AI.*
