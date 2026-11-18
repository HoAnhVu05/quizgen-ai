# ĐẶC TẢ YÊU CẦU PHẦN MỀM (SOFTWARE REQUIREMENTS SPECIFICATION - SRS)
## DỰ ÁN: QUIZGEN AI – NỀN TẢNG KHẢO THÍ & KHỞI TẠO ĐỀ THI HỌC THUẬT TỰ ĐỘNG ỨNG DỤNG AI ĐA PHƯƠNG THỨC
*(Hệ thống Microservices Chuẩn hóa Ma trận Bloom, RAG Đối soát Minh chứng Hai chiều, Đóng gói Khảo thí OMR/Word/QTI và Cổng Thanh toán VietQR)*

---

**Thông tin Tài liệu:**
- **Dự án:** QuizGen AI Academic Platform
- **Mã tài liệu:** `SRS-QUIZGEN-AI-2026`
- **Phiên bản:** v2.8 (Academic Enterprise Release)
- **Tiêu chuẩn áp dụng:** IEEE Std 830-1998 / ISO/IEC/IEEE 29148:2018
- **Ngày phát hành:** 18/11/2026
- **Tác giả / Kỹ sư phụ trách:** Ngô Phạm Công Đức (052205015692) & Đội ngũ Kỹ thuật QuizGen AI
- **Trạng thái:** Chính thức phê duyệt (Approved)

---

## MỤC LỤC TỔNG QUAN

1. [CHƯƠNG 1: GIỚI THIỆU CHUNG (INTRODUCTION)](#chương-1-giới-thiệu-chung-introduction)
   - 1.1. Mục đích tài liệu
   - 1.2. Phạm vi sản phẩm (Product Scope)
   - 1.3. Định nghĩa, Thuật ngữ & Từ viết tắt (Definitions & Acronyms)
   - 1.4. Tài liệu tham chiếu (References)
   - 1.5. Cấu trúc tài liệu
2. [CHƯƠNG 2: MÔ TẢ TỔNG QUAN HỆ THỐNG (OVERALL DESCRIPTION)](#chương-2-mô-tả-tổng-quan-hệ-thống-overall-description)
   - 2.1. Bối cảnh & Tầm nhìn sản phẩm
   - 2.2. Mô hình Kiến trúc Phân tầng Microservices
   - 2.3. Tác nhân & Phân quyền Người dùng (User Roles & Personas - RBAC)
   - 2.4. Môi trường Vận hành & Cấu hình Hạ tầng
   - 2.5. Các Ràng buộc Thiết kế & Kỹ thuật
   - 2.6. Giả định & Sự phụ thuộc (Assumptions & Dependencies)
3. [CHƯƠNG 3: YÊU CẦU CHỨC NĂNG CHI TIẾT (FUNCTIONAL REQUIREMENTS - FR)](#chương-3-yêu-cầu-chức-năng-chi-tiết-functional-requirements---fr)
   - 3.1. Phân hệ 1: Quản lý Định danh & Xác thực (Auth & RBAC Service - Port 8001)
   - 3.2. Phân hệ 2: Quản lý Giáo trình & Nạp Tri thức (Document Ingestion Service - Port 8002)
   - 3.3. Phân hệ 3: Lưu trữ Vector & Truy xuất Tăng cường (RAG Retrieval Service - Port 8003)
   - 3.4. Phân hệ 4: Khởi tạo Đề thi AI & Ma trận Bloom (AI Generation Service - Port 8004)
   - 3.5. Phân hệ 5: Không gian Kiểm duyệt & Đối soát Minh chứng (Review Workspace & Evidence)
   - 3.6. Phân hệ 6: Quản lý Ngân hàng Câu hỏi & Đóng gói Khảo thí (Exam Service - Port 8005)
   - 3.7. Phân hệ 7: Quản trị Cổng Thanh toán & Nâng cấp Gói cước (Payment Service - Port 8007)
   - 3.8. Phân hệ 8: Không gian Tương tác Học thuật Nội bộ (Q-Group Academic Workspace)
   - 3.9. Phân hệ 9: Quản trị & Giám sát Vận hành Hệ thống (Admin Portal 360 - Port 8006)
   - 3.10. Phân hệ 10: Cổng Điều hướng Tập trung & Tường lửa (API Gateway - Port 8000)
4. [CHƯƠNG 4: YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR)](#chương-4-yêu-cầu-phi-chức-năng-non-functional-requirements---nfr)
   - 4.1. Hiệu năng & Giới hạn Thời gian Đáp ứng (Performance & Latency)
   - 4.2. Độ sẵn sàng, Tin cậy & Khả năng Phục hồi (Availability & Resilience)
   - 4.3. An toàn Thông tin & Bảo mật (Security & Cryptography)
   - 4.4. Tính Toàn vẹn & Nhất quán Dữ liệu (Data Integrity)
   - 4.5. Khả năng Mở rộng & Tương thích Hạ tầng (Scalability & Portability)
   - 4.6. Trải nghiệm Người dùng & Công thái học Giao diện (Usability & Ergonomics)
   - 4.7. Tiêu chuẩn Xuất bản Khảo thí & Quốc tế hóa (Standards & Compliance)
5. [CHƯƠNG 5: YÊU CẦU GIAO DIỆN & TÍCH HỢP HỆ THỐNG (INTERFACE REQUIREMENTS)](#chương-5-yêu-cầu-giao-diện--tích-hợp-hệ-thống-interface-requirements)
   - 5.1. Giao diện Người dùng (User Interfaces)
   - 5.2. Giao diện Phần mềm Nội bộ (Internal API Contracts)
   - 5.3. Giao diện Dịch vụ Bên ngoài (External Integrations)
6. [CHƯƠNG 6: MA TRẬN TRUY XUẤT NGUỒN GỐC YÊU CẦU (REQUIREMENTS TRACEABILITY MATRIX - RTM)](#chương-6-ma-trận-truy-xuất-nguồn-gốc-yêu-cầu-requirements-traceability-matrix---rtm)

---

## CHƯƠNG 1: GIỚI THIỆU CHUNG (INTRODUCTION)

### 1.1. Mục đích tài liệu
Tài liệu Đặc tả Yêu cầu Phần mềm (SRS) này thiết lập cơ sở đặc tả kỹ thuật và nghiệp vụ chính thức cho toàn bộ dự án **QuizGen AI**. Tài liệu đóng vai trò:
- Căn cứ pháp lý kỹ thuật thống nhất giữa Khách hàng/Ban Giám hiệu/Hội đồng Khảo thí và Đội ngũ Kỹ sư Phát triển Hệ thống.
- Khung quy chiếu chi tiết cho các kỹ sư Backend, Frontend, DevOps và QA/QC trong việc triển khai mã nguồn, tích hợp liên dịch vụ, cấu hình CI/CD và kiểm thử chấp nhận (User Acceptance Testing - UAT).
- Chuẩn mực đánh giá mức độ hoàn thiện của từng tính năng phần mềm theo quy trình quản trị Agile/Scrum.

### 1.2. Phạm vi sản phẩm (Product Scope)
**QuizGen AI** là nền tảng SaaS (Software-as-a-Service) chuyên sâu phục vụ các trường Đại học, Cao đẳng, Học viện và Hội đồng Khảo thí nhằm tự động hóa quy trình xây dựng ngân hàng câu hỏi và đóng gói đề thi trắc nghiệm học thuật.
Hệ thống giải quyết triệt để 4 rào cản lớn nhất trong công tác khảo thí truyền thống:
1. **Tiết kiệm thời gian biên soạn:** Rút ngắn thời gian ra đề từ nhiều ngày xuống còn dưới 3 phút dựa trên tài liệu giáo trình có sẵn.
2. **Triệt tiêu hiện tượng ảo giác (Hallucination):** Ứng dụng mô hình **RAG (Retrieval-Augmented Generation)** kết hợp Vector Database để mọi câu hỏi đều gắn kèm minh chứng trích dẫn nguồn gốc (đúng trang, đúng chương, câu gốc trong giáo trình).
3. **Chuẩn hóa đo lường giáo dục:** Bắt buộc phân bổ cấu trúc đề thi theo **Thang đo nhận thức Bloom (Bloom's Taxonomy)** gồm 4 bậc: *Nhận biết (Remembering)*, *Thông hiểu (Understanding)*, *Vận dụng (Applying)* và *Phân tích/Đánh giá (Analyzing)*.
4. **Tự động hóa in ấn và tích hợp LMS:** Đóng gói xuất bản đề thi hoán vị mã đề (101-108) ra tệp **Microsoft Word (.docx)** biên tập đẹp, **Adobe PDF Vector A4** tích hợp sẵn **Phiếu trả lời trắc nghiệm chuẩn OMR (50/100 câu)** quét chấm tự động, và gói chuẩn quốc tế **IMS QTI 2.1** nhập trực tiếp vào hệ thống quản lý học tập (Canvas, Moodle, Blackboard).

### 1.3. Định nghĩa, Thuật ngữ & Từ viết tắt (Definitions & Acronyms)

| Thuật ngữ | Tên đầy đủ / Ý nghĩa | Diễn giải kỹ thuật trong hệ thống QuizGen AI |
| :--- | :--- | :--- |
| **SRS** | Software Requirements Specification | Tài liệu đặc tả yêu cầu phần mềm theo tiêu chuẩn quốc tế IEEE 830. |
| **RAG** | Retrieval-Augmented Generation | Kỹ thuật kết hợp giữa truy hồi thông tin (ChromaDB) và mô hình ngôn ngữ lớn để trả lời dựa trên ngữ cảnh thực tế của giáo trình. |
| **LLM** | Large Language Model | Mô hình ngôn ngữ lớn (Google Gemini 1.5/2.5 Flash API). |
| **Bloom's Taxonomy** | Thang đo nhận thức Bloom | Khung lý thuyết phân loại mục tiêu giáo dục theo cấp độ tư duy từ thấp đến cao (40% - 30% - 20% - 10%). |
| **OMR** | Optical Mark Recognition | Công nghệ nhận dạng đánh dấu quang học dùng để chấm bài thi trắc nghiệm trên giấy tô trắc nghiệm. |
| **QTI** | Question and Test Interoperability | Chuẩn định dạng dữ liệu XML quốc tế (phiên bản 2.1) dùng để trao đổi đề thi giữa các nền tảng LMS (Canvas/Moodle). |
| **RBAC** | Role-Based Access Control | Mô hình kiểm soát truy cập dựa trên vai trò phân quyền người dùng. |
| **Fisher-Yates** | Fisher-Yates Shuffle Algorithm | Thuật toán xáo trộn ngẫu nhiên không thiên lệch với độ phức tạp thời gian $\mathcal{O}(n)$, dùng để đảo câu hỏi và đáp án mã đề. |
| **LaTeX** | LaTeX Typography | Hệ thống soạn thảo văn bản học thuật biểu diễn công thức toán, lý, hóa ($E=mc^2$). |
| **VietQR** | Vietnam Quick Response | Tiêu chuẩn thanh toán mã QR quốc gia của NAPAS kết nối trực tiếp các Ngân hàng thương mại Việt Nam. |
| **JWT** | JSON Web Token | Chuẩn mã hóa token xác thực phân quyền phi trạng thái (Stateless Bearer Token). |

### 1.4. Tài liệu tham chiếu (References)
1. *IEEE Std 830-1998:* IEEE Recommended Practice for Software Requirements Specifications.
2. *IMS Global Question & Test Interoperability (QTI) Specification Version 2.1 Final Release.*
3. *Bộ Giáo dục và Đào tạo:* Quy định về cấu trúc đề thi, quy cách trình bày văn bản hành chính và khảo thí trắc nghiệm đại học.
4. *Tài liệu Kiến trúc QuizGen AI:* `TECH_STACK.md`, `EXAM_SERVICE_SPECIFICATION.md`, `DATABASE_SPECIFICATION.md`, `PAYMENT_SERVICE_SPECIFICATION.md`, `DOCUMENT_SERVICE_SPECIFICATION.md`.

### 1.5. Cấu trúc tài liệu
Tài liệu được chia thành 6 chương lớn, đi từ bức tranh tổng thể kiến trúc, mô tả chi tiết từng yêu cầu chức năng (FR) của 10 phân hệ nghiệp vụ, đến các ràng buộc phi chức năng (NFR) đo lường bằng chỉ số định lượng cụ thể, và khép lại bằng ma trận truy xuất nguồn gốc (RTM).

---

## CHƯƠNG 2: MÔ TẢ TỔNG QUAN HỆ THỐNG (OVERALL DESCRIPTION)

### 2.1. Bối cảnh & Tầm nhìn sản phẩm
QuizGen AI hoạt động như một hệ sinh thái khảo thí khép kín dành cho các đơn vị giáo dục đại học. Giảng viên chỉ cần nạp tệp bài giảng/giáo trình PDF hoặc DOCX, hệ thống sẽ thực hiện phân tích cấu trúc, tạo kho ngữ liệu vector, sinh bộ câu hỏi trắc nghiệm đa phương thức (chữ, công thức LaTeX, sơ đồ) theo ma trận đề thi tùy biến, cung cấp không gian kiểm duyệt đối soát minh chứng trực quan, và xuất bản đề thi ở đa định dạng sẵn sàng cho in ấn hoặc tổ chức thi số.

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 NGUỒN HỌC LIỆU GỐC                     │
                  │   Giáo trình PDF / Bài giảng Word DOCX (Tối đa 50MB)   │
                  └───────────────────────────┬────────────────────────────┘
                                              │ Upload & Bóc tách
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │           HỆ THỐNG QUIZGEN AI (MICROSERVICES)          │
                  │                                                        │
                  │  [Document Ingestion] ──► [ChromaDB Vector RAG]        │
                  │                                  │                     │
                  │  [Gemini AI Engine]   ◄──────────┘ (Top-K Chunks)      │
                  │         │                                              │
                  │         ▼                                              │
                  │  [Review Workspace]   ──► Đối soát Minh chứng 2 Chiều  │
                  │         │                                              │
                  │         ▼                                              │
                  │  [Exam Service]       ──► Đảo mã đề Fisher-Yates       │
                  └─────────┬────────────────────────┬─────────────────────┘
                            │                        │
             ┌──────────────┴──────────┐   ┌─────────┴───────────────┐
             ▼                         ▼   ▼                         ▼
      [Microsoft Word]           [Adobe PDF A4]               [IMS QTI 2.1]
   Đề thi & Bảng đáp án     In ấn kèm Phiếu OMR 50       Nhập Canvas / Moodle
```

### 2.2. Mô hình Kiến trúc Phân tầng Microservices
Hệ thống được thiết kế theo kiến trúc Microservices phân tán, bao gồm Cổng điều phối trung tâm (API Gateway), 8 Dịch vụ Backend độc lập xây dựng bằng Python FastAPI, và Giao diện người dùng SPA (Single Page Application) hiện đại xây dựng bằng React 18, TypeScript và Tailwind CSS.

```
                                  +---------------------------------------+
                                  |         CLIENT WEB APPLICATION        |
                                  |    React 18 + Vite + Tailwind + KaTeX |
                                  +-------------------+-------------------+
                                                      |
                                                      | HTTPS / REST / WSS
                                                      v
                                  +---------------------------------------+
                                  |        API GATEWAY (Port 8000)        |
                                  |   Reverse Proxy, JWT Auth, Rate Limit |
                                  +---+-------+-------+-------+-------+---+
                                      |       |       |       |       |
            +-------------------------+       |       |       |       +-------------------------+
            |                                 |       |       |                                 |
            v                                 v       v       v                                 v
   +------------------+             +-------------+ +-------------+ +------------------+ +------------------+
   |   Auth Service   |             |Document Svc | | AI Service  | |   Exam Service   | | Payment Service  |
   |   (Port 8001)    |             | (Port 8002) | | (Port 8004) | |   (Port 8005)    | |   (Port 8007)    |
   | OAuth2, RBAC, OTP|             | PyPDF, DOCX | | Gemini LLM  | | Word/PDF/OMR/QTI | | VietQR, PayOS    |
   +------------------+             +------+------+ +------+------+ +------------------+ +------------------+
                                           |               ^
                                           | Chunks        | Context Retrieval
                                           v               |
                                    +----------------------+------+
                                    |     RAG Service (Port 8003) |
                                    |   ChromaDB / Vector Search  |
                                    +-----------------------------+
                                                   ^
            +--------------------------------------+------------------------------------+
            |                                                                           |
            v                                                                           v
   +------------------+                                                        +------------------+
   |  Admin Service   |                                                        | Q-Group Academic |
   |   (Port 8006)    |                                                        |  Workspace Chat  |
   | Audit, Metrics   |                                                        |  Slack-style DM  |
   +------------------+                                                        +------------------+
```

### 2.3. Tác nhân & Phân quyền Người dùng (User Roles & Personas - RBAC)
Hệ thống xác định 4 nhóm tác nhân chính với ma trận phân quyền chi tiết:

| Nhóm người dùng | Ký hiệu Role | Mô tả vai trò & Trách nhiệm trong hệ thống | Quyền hạn chính |
| :--- | :---: | :--- | :--- |
| **Giảng viên** | `LECTURER` | Người trực tiếp giảng dạy và phụ trách học phần. Có nhu cầu nạp tài liệu và tạo đề thi trắc nghiệm. | Upload giáo trình cá nhân; Sinh đề thi AI; Kiểm duyệt câu hỏi; Quản lý ngân hàng đề riêng; Xuất bản Word/PDF/QTI; Nâng cấp gói cước cá nhân. |
| **Trưởng bộ môn / Khảo thí** | `HEAD_OF_DEPT` | Trưởng bộ môn hoặc Trưởng ban khảo thí khoa/trường chịu trách nhiệm giám sát chất lượng học thuật. | Toàn quyền của Giảng viên; Thẩm định & phê duyệt ngân hàng câu hỏi dùng chung; Cấu hình ma trận đề thi chuẩn khoa; Giám sát tỷ lệ Bloom. |
| **Sinh viên** | `STUDENT` | Người học tham gia làm bài luyện tập hoặc thi thử trực tuyến trên nền tảng. | Xem danh mục đề thi được cấp phép; Làm bài thi thử; Nhận kết quả và phản hồi giải thích chi tiết; Tham gia kênh Q-Group học tập. |
| **Quản trị viên Hệ thống** | `ADMIN` / `SUPER_ADMIN` | Đội ngũ quản trị kỹ thuật và vận hành thương mại của hệ thống. | Quản lý người dùng, phân quyền RBAC; Xem Audit Logs hệ thống; Giám sát hạ tầng microservices; Quản trị doanh thu & giao dịch VietQR. |

### 2.4. Môi trường Vận hành & Cấu hình Hạ tầng
- **Hệ điều hành Server:** Ubuntu Linux 22.04 LTS x86_64 / Alpine Linux Container.
- **Môi trường ảo hóa & Đóng gói:** Docker Engine 24.x, Docker Compose v2.
- **Máy chủ Web & Proxy ngược:** Nginx Reverse Proxy kết hợp API Gateway (FastAPI Uvicorn workers).
- **Cơ sở dữ liệu Quan hệ (RDBMS):** PostgreSQL 15+ (Lưu trữ quan hệ: Users, Documents, Questions, Exams, Transactions).
- **Cơ sở dữ liệu Vector:** ChromaDB 0.4.x (Lưu trữ và tìm kiếm vector nhúng embeddings).
- **Môi trường Client:** Trình duyệt web hiện đại hỗ trợ ECMAScript 2022+ (Google Chrome 110+, Microsoft Edge 110+, Mozilla Firefox 115+, Safari 16+).

### 2.5. Các Ràng buộc Thiết kế & Kỹ thuật
- **Bắt buộc tuân thủ chuẩn ISO A4:** Mọi ấn phẩm đề thi xuất ra định dạng PDF và Word bắt buộc tuân thủ chuẩn trang in A4 ($210 \times 297\,\text{mm}$), lề chuẩn khảo thí: Trên $20\,\text{mm}$, Dưới $20\,\text{mm}$, Trái $20\,\text{mm}$, Phải $15\,\text{mm}$.
- **Chuẩn hóa công thức toán học:** Hệ thống phải hỗ trợ render đầy đủ công thức toán học LaTeX trên giao diện bằng thư viện KaTeX, đồng thời cung cấp bộ chuyển đổi làm sạch LaTeX sang ký tự Unicode học thuật khi xuất bản tệp Word (.docx) và PDF để chống lỗi hiển thị trên máy in trường thi.
- **Ràng buộc mã nguồn mở và bản quyền:** Các thư viện xuất bản văn bản phải chạy độc lập trên môi trường Linux không phụ thuộc vào bộ cài đặt Microsoft Office bản quyền (sử dụng `python-docx` và `ReportLab Open Source`).

### 2.6. Giả định & Sự phụ thuộc (Assumptions & Dependencies)
- Tài liệu giáo trình đầu vào phải có định dạng văn bản có thể trích xuất (PDF dạng văn bản hoặc DOCX). Với tài liệu PDF quét ảnh (Scanned PDF), hệ thống phụ thuộc vào mô-đun OCR để nhận dạng ký tự quang học trước khi nạp vào vector store.
- Hệ thống phụ thuộc vào kết nối Internet ổn định đến Google Gemini Flash API cho tác vụ sinh ngôn ngữ và Cổng thanh toán Ngân hàng TPBank/PayOS cho tác vụ webhook VietQR.

---

## CHƯƠNG 3: YÊU CẦU CHỨC NĂNG CHI TIẾT (FUNCTIONAL REQUIREMENTS - FR)

### 3.1. Phân hệ 1: Quản lý Định danh & Xác thực (Auth & RBAC Service - Port 8001)

#### [FR-01.01] Đăng ký & Đăng nhập Hệ thống bằng Tài khoản Nội bộ
- **Mô tả:** Hệ thống cho phép người dùng đăng ký tài khoản mới bằng Email học thuật, mật khẩu có độ bảo mật cao và thực hiện đăng nhập.
- **Đầu vào:** Email, Mật khẩu (tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt), Họ và tên, Đơn vị công tác (Khoa/Trường).
- **Xử lý:** Mật khẩu được mã hóa an toàn bằng thuật toán `bcrypt` có salt rounds $\ge 12$. Khi đăng nhập thành công, hệ thống cấp phát cặp mã xác thực `access_token` (thời hạn 60 phút) và `refresh_token` (thời hạn 7 ngày) theo chuẩn JWT RS256.
- **Đầu ra:** HTTP 200 kèm Payload chứa Thông tin người dùng, Vai trò (`role`), Danh mục quyền hạn và JWT Token.

#### [FR-01.02] Đăng nhập Một Chạm qua Google OAuth 2.0 (SSO)
- **Mô tả:** Giảng viên có thể đăng nhập tức thì thông qua tài khoản Google Workspace giáo dục (`@edu.vn` hoặc `@gmail.com`).
- **Xử lý:** API Gateway chuyển hướng người dùng đến trang xác thực Google Consent Screen, nhận OAuth Authorization Code, gửi xác minh với Google OAuth Server để lấy `email`, `name`, `avatar`, tự động khởi tạo hoặc liên kết tài khoản trong cơ sở dữ liệu.

#### [FR-01.03] Khôi phục Mật khẩu qua Mã Xác minh OTP Email
- **Mô tả:** Người dùng quên mật khẩu có thể yêu cầu gửi mã OTP gồm 6 chữ số ngẫu nhiên về email đã đăng ký.
- **Xử lý:** Mã OTP được lưu tạm trong Redis/Database với thời hạn sống (TTL) chính xác là 5 phút, giới hạn gửi lại tối thiểu sau 60 giây. Sau khi người dùng xác minh OTP thành công, hệ thống cấp quyền đặt lại mật khẩu mới.

#### [FR-01.04] Kiểm soát Truy cập Phân tầng Dựa trên Vai trò (RBAC)
- **Mô tả:** Mọi yêu cầu gọi API từ Client đều phải đi qua Middleware kiểm tra tính hợp lệ của Token và quyền hạn tương ứng của vai trò người dùng (Ví dụ: Giảng viên không được gọi API quản trị Admin, Sinh viên không được gọi API duyệt đề thi).

---

### 3.2. Phân hệ 2: Quản lý Giáo trình & Nạp Tri thức (Document Ingestion Service - Port 8002)

#### [FR-02.01] Tải lên Giáo trình Đa định dạng (Upload Engine)
- **Mô tả:** Giảng viên kéo thả hoặc chọn tải lên các tệp giáo trình, bài giảng định dạng `.pdf` hoặc `.docx` với dung lượng cho phép lên đến **50MB/tệp**.
- **Xử lý:** Hệ thống kiểm tra phần mở rộng tệp và MIME-type hợp lệ, kiểm tra mã băm SHA-256 để chống trùng lặp tệp tin, lưu trữ tệp an toàn trong thư mục lưu trữ được phân lập theo `user_id`.

#### [FR-02.02] Bóc tách Văn bản & Phát hiện Cấu trúc Chương mục
- **Mô tả:** Bóc tách toàn bộ nội dung văn bản thuần từ file PDF (sử dụng `PyPDF`/`pdfplumber`) và DOCX (sử dụng `python-docx`).
- **Xử lý:** Tự động nhận dạng Mục lục (Table of Contents - TOC), phân định các chương, mục, tiểu mục dựa trên quy tắc biểu thức chính quy (Regex) và phân tích định dạng heading (`Chương 1`, `Bài 2`, `I.`, `1.1`).
- **Đầu ra:** Cây cấu trúc tài liệu phân cấp hiển thị trên giao diện cho phép giảng viên chọn lọc các chương cụ thể để đưa vào đề thi.

#### [FR-02.03] Phân đoạn Ngữ nghĩa (Semantic Chunking & Metadata Injection)
- **Mô tả:** Chia nhỏ nội dung giáo trình thành các đoạn văn bản (chunks) có kích thước tối ưu cho mô hình ngôn ngữ lớn.
- **Quy cách kỹ thuật:**
  - Kích thước đoạn (Chunk size): $800 - 1000$ tokens.
  - Vùng chồng lấn (Chunk overlap): $150$ tokens ($15\%$) để đảm bảo không bị đứt gãy ngữ nghĩa giữa hai đoạn liền kề.
  - Gắn kèm siêu dữ liệu (Metadata): `document_id`, `document_name`, `chapter_index`, `chapter_title`, `page_number`, `chunk_id`.

---

### 3.3. Phân hệ 3: Lưu trữ Vector & Truy xuất Tăng cường (RAG Retrieval Service - Port 8003)

#### [FR-03.01] Vector hóa Văn bản (Dense Text Embedding)
- **Mô tả:** Chuyển đổi toàn bộ các đoạn trích giáo trình (chunks) thành các vector số nhiều chiều (Dense Vectors) bằng mô hình embedding học thuật (`sentence-transformers/all-MiniLM-L6-v2` hoặc Google `text-embedding-004`).
- **Lưu trữ:** Lưu trữ vector và metadata vào cơ sở dữ liệu vector chuyên dụng **ChromaDB**.

#### [FR-03.02] Truy hồi Ngữ cảnh Kết hợp Đa chiều (Hybrid Semantic Retrieval)
- **Mô tả:** Khi nhận yêu cầu sinh câu hỏi theo chủ đề hoặc chương mục, hệ thống truy xuất $K$ đoạn trích liên quan nhất từ kho tri thức.
- **Thuật toán:** Kết hợp tìm kiếm vector ngữ nghĩa (Cosine Similarity Metric) và tìm kiếm từ khóa học thuật chính xác (BM25 keyword search).
- **Đầu ra:** Danh sách Top-K ($K = 5 \div 10$) văn bản nguồn kèm theo:
  $$\text{Cosine Similarity} = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2}$$
  và điểm tin cậy (% Relevance Score), số trang, chương trích dẫn.

---

### 3.4. Phân hệ 4: Khởi tạo Đề thi AI & Ma trận Bloom (AI Generation Service - Port 8004)

#### [FR-04.01] Cấu hình Ma trận Đề thi theo Thang đo Bloom (Bloom Matrix Configuration)
- **Mô tả:** Giảng viên thiết lập tổng số lượng câu hỏi cần tạo và phân bổ tỷ lệ phần trăm theo 4 mức độ tư duy nhận thức của Thang đo Bloom:
  1. **Nhận biết (Remembering - 40%):** Nhận diện định nghĩa, thuật ngữ, công thức cơ bản đã học trong giáo trình.
  2. **Thông hiểu (Understanding - 30%):** Giải thích khái niệm, phân biệt các trường hợp, suy luận logic đơn giản.
  3. **Vận dụng (Applying - 20%):** Áp dụng công thức, định lý để tính toán, giải quyết tình huống bài toán cụ thể.
  4. **Phân tích/Đánh giá (Analyzing - 10%):** Phân tích dữ kiện phức tạp, đánh giá mô hình, suy luận logic nâng cao.
- **Ràng buộc:** Tổng tỷ lệ 4 mức độ bắt buộc phải bằng chính xác $100\%$. Cung cấp các mẫu cấu hình nhanh: *Đề Giữa kỳ (20 câu)*, *Đề Cuối kỳ (40 câu)*, *Kiểm tra 15 phút (10 câu)*.

#### [FR-04.02] Khởi tạo Câu hỏi Trắc nghiệm Đa phương thức (Multimodal Question Synthesis)
- **Mô tả:** Gọi Google Gemini 1.5/2.5 Flash API với cấu trúc Prompt kỹ thuật cao (Few-Shot Academic Prompting) yêu cầu đầu ra dạng **Strict Structured JSON Schema**.
- **Cấu trúc mỗi câu hỏi sinh ra:**
  - `question_text`: Nội dung câu hỏi (chứa công thức toán học dưới dạng LaTeX kẹp trong dấu `$formula$`).
  - `options`: Mảng gồm chính xác 4 phương án lựa chọn A, B, C, D (mỗi phương án có `id`, `text`, `is_correct`).
  - `correct_answer`: Ký tự đáp án đúng (`A`, `B`, `C`, hoặc `D`).
  - `explanation`: Lời giải thích khoa học chi tiết vì sao đáp án đó đúng và vì sao 3 phương án còn lại là phương án nhiễu (distractors).
  - `bloom_level`: Cấp độ nhận thức tương ứng (`remembering`, `understanding`, `applying`, `analyzing`).
  - `source_reference`: Trích đoạn câu gốc trong giáo trình làm bằng chứng xác thực, kèm số trang và chương.
  - `has_formula`: Giá trị Boolean (`true` nếu câu hỏi có chứa biểu thức toán học).
  - `has_image`: Giá trị Boolean (`true` nếu câu hỏi kèm hình vẽ, sơ đồ).
  - `image_url` & `image_caption`: Đường dẫn và chú thích hình ảnh minh họa bài toán.

#### [FR-04.03] Cơ chế Kiểm định Không Ảo giác (Zero-Hallucination Guardrail)
- **Mô tả:** Hệ thống kiểm tra chéo (Cross-Validation) giữa câu hỏi và đoạn trích RAG nguồn. Nếu nội dung câu hỏi hoặc đáp án không thể suy ra từ văn bản giáo trình được cung cấp, hệ thống tự động loại bỏ và yêu cầu mô hình sinh lại câu hỏi thay thế đạt độ tin cậy.

---

### 3.5. Phân hệ 5: Không gian Kiểm duyệt & Đối soát Minh chứng (Review Workspace & Evidence)

#### [FR-05.01] Giao diện Chia đôi Màn hình Đối soát Trực quan (Split-View Workspace)
- **Mô tả:** 
  - **Phân vùng bên trái (Question List):** Danh sách các câu hỏi vừa được AI sinh ra, gắn thẻ màu theo cấp độ Bloom, hiển thị công thức toán học KaTeX rõ nét.
  - **Phân vùng bên phải (Source Evidence Inspector):** Hiển thị đoạn trích giáo trình gốc (Source Chunk) tương ứng với câu hỏi đang chọn, đánh dấu màu vàng (highlight) các câu chứa đáp án, hiển thị tên sách, chương mục và số trang gốc.

#### [FR-05.02] Thao tác Công thái học & Phím tắt Nhanh (Ergonomic Keyboard Shortcuts)
- **Mô tả:** Giảng viên có thể duyệt nhanh hàng trăm câu hỏi mà không cần chạm chuột:
  - Bấm phím **`A`** (Approve): Phê duyệt câu hỏi đưa vào ngân hàng đề chính thức.
  - Bấm phím **`R`** (Reject): Từ chối câu hỏi không đạt chất lượng hoặc yêu cầu sinh câu hỏi mới.
  - Bấm phím **`E`** (Edit): Mở chế độ chỉnh sửa trực tiếp nội dung, đáp án và phương án nhiễu.
  - Bấm phím mũi tên **`↑` / `↓`**: Di chuyển linh hoạt giữa các câu hỏi liền kề.

#### [FR-05.03] Tinh chỉnh Nội dung Trực tiếp (Inline Editor & Distractor Swapping)
- **Mô tả:** Cho phép giảng viên sửa đổi câu chữ, thay đổi đáp án đúng sang phương án khác, hoán đổi thứ tự các đáp án nhiễu, hoặc thêm bớt các chú thích sư phạm.

---

### 3.6. Phân hệ 6: Quản lý Ngân hàng Câu hỏi & Đóng gói Khảo thí (Exam Service - Port 8005)

#### [FR-06.01] Quản lý Ngân hàng Câu hỏi Tập trung
- **Mô tả:** Lưu trữ toàn bộ câu hỏi đã được phê duyệt vào cơ sở dữ liệu. Hỗ trợ bộ lọc đa tiêu chí: Lọc theo Môn học/Giáo trình, Chương mục, Mức độ nhận thức Bloom, Ngày tạo, Tác giả tạo.

#### [FR-06.02] Thuật toán Đảo mã đề Khảo thí Fisher-Yates (Shuffle Engine)
- **Mô tả:** Khi xuất bản đề thi gồm nhiều mã đề (ví dụ: 101, 102, 103, 104, 105, 106, 107, 108), hệ thống áp dụng thuật toán **Fisher-Yates Shuffle**:
  - Đảo ngẫu nhiên thứ tự các câu hỏi trong đề thi.
  - Đảo ngẫu nhiên vị trí các phương án A, B, C, D của từng câu hỏi.
  - Đảm bảo tính phân tán xác suất đồng đều, không bao giờ xuất hiện mẫu quy luật (pattern) đáp án lộ liễu.
  - Tự động sinh ra Bảng ma trận đối chiếu đáp án chéo (Answer Key Matrix) giữa tất cả các mã đề.

#### [FR-06.03] Xuất bản Tệp Microsoft Word (.docx) Chuẩn Khảo thí Đại học
- **Mô tả:** Xuất bản đề thi thành tệp `.docx` tương thích hoàn toàn với Microsoft Word 2013-2024 và LibreOffice.
- **Tiêu chuẩn định dạng:**
  - Header chuẩn: Tên Cơ quan Chủ quản, Tên Trường, Tên Khoa, Tên Học phần, Học kỳ, Thời gian làm bài, Mã đề thi.
  - Canh lề A4 chuẩn, font chữ đồng nhất Times New Roman 12pt, dãn dòng 1.15pt.
  - Tích hợp bộ chuyển đổi làm sạch LaTeX sang ký tự Unicode học thuật (`clean_latex_to_text`) để biểu diễn chính xác các ký hiệu toán học ($\int, \sum, \pm, \alpha, \beta, \le, \ge, \ne$) mà không bị vỡ font.
  - Phụ lục cuối đề thi: Bảng đáp án tổng hợp (Answer Table Grid) và Lời giải thích chi tiết cho từng câu hỏi.

#### [FR-06.04] Xuất bản Adobe PDF Vector A4 Tích hợp Phiếu Trả lời Trắc nghiệm Chuẩn OMR
- **Mô tả:** Sử dụng thư viện `ReportLab` vẽ đồ họa vector chất lượng cao xuất ra file PDF in ấn sắc nét.
- **Quy cách:**
  - Trang 1 đến trang $N$: Toàn văn nội dung đề thi được đóng khung và phân trang thẩm mỹ.
  - Trang cuối cùng ($N+1$): **Phiếu trả lời trắc nghiệm chuẩn OMR 50 câu (hoặc 100 câu)**:
    - Khung điền Số báo danh và Mã đề thi dạng tô tròn từ 0 đến 9.
    - Lưới tròn 4 lựa chọn (A) (B) (C) (D) có tọa độ vật lý chuẩn xác từng milimet, tương thích hoàn toàn với các phần mềm chấm thi trắc nghiệm bằng máy quét quang học (TestScanner, ZipGrade, OMR Maker).
  - Trang Ma trận Đáp án & Lời giải học thuật độc lập dành riêng cho Giảng viên và Ban Khảo thí.

#### [FR-06.05] Xuất bản Gói Tương thích Quốc tế IMS QTI 2.1 (LMS Package)
- **Mô tả:** Đóng gói toàn bộ đề thi thành tệp nén `.zip` chứa cấu trúc XML chuẩn **IMS QTI 2.1** (Question & Test Interoperability).
- **Tương thích:** Có thể nhập (Import) trực tiếp vào các hệ thống quản trị học tập phổ biến nhất thế giới hiện nay như **Canvas LMS**, **Moodle**, **Blackboard** mà không cần qua bất kỳ bước định dạng trung gian nào.

#### [FR-06.06] Đóng gói Trọn gói Hồ sơ Khảo thí (Exam Bundle ZIP Exporter)
- **Mô tả:** Hệ thống hỗ trợ tính năng xuất một chạm toàn bộ hồ sơ khảo thí thành một tệp nén `Exam_Bundle_[MaMon]_[Ngay].zip` duy nhất, chứa:
  - Tất cả các mã đề thi dạng Word (`DeThi_Ma101.docx`, `DeThi_Ma102.docx`...).
  - Tất cả các mã đề thi dạng PDF Vector in ấn kèm phiếu OMR (`DeThi_Ma101_OMR.pdf`...).
  - Tệp bảng đáp án tổng hợp đối chiếu (`Bang_Dap_An_Tong_Hop.xlsx` hoặc `.pdf`).
  - Gói import LMS QTI 2.1 (`QTI_Package_Canvas_Moodle.zip`).

---

### 3.7. Phân hệ 7: Quản trị Cổng Thanh toán & Nâng cấp Gói cước (Payment Service - Port 8007)

#### [FR-07.01] Quản lý Gói dịch vụ & Hạn mức Tín dụng (Subscription Tiers)
- **Mô tả:** Cung cấp 3 cấp độ tài khoản linh hoạt:
  1. **Free Tier (Học thuật Cơ bản):** Miễn phí vĩnh viễn; Cho phép tải tối đa 2 giáo trình (tối đa 15MB/tệp); Khởi tạo tối đa 50 câu hỏi AI/tháng; Xuất bản Word tiêu chuẩn.
  2. **Pro Academic Tier (Giảng viên Tiêu chuẩn):** Phí thuê bao tháng/năm; Nạp không giới hạn giáo trình (50MB/tệp); Khởi tạo 1.500 câu hỏi AI/tháng; Đầy đủ tính năng xuất PDF OMR, QTI 2.1, hỗ trợ công thức toán LaTeX & sơ đồ.
  3. **Enterprise / Institutional Tier (Khoa / Cơ sở Giáo dục):** Đầy đủ quyền quản trị tập trung; Chia sẻ ngân hàng đề thi chung khoa; Phân bổ hạn ngạch cho toàn bộ giảng viên trong trường; Ưu tiên băng thông LLM chuyên dụng.

#### [FR-07.02] Tạo Mã Dynamic VietQR Tích hợp Ngân hàng Tự động
- **Mô tả:** Khi người dùng chọn nâng cấp gói cước, hệ thống gọi Open API của TPBank / PayOS tạo mã thanh toán VietQR động chuẩn NAPAS 24/7.
- **Dữ liệu mã hóa trong QR:** Số tài khoản nhận, Ngân hàng thụ hưởng, Số tiền chính xác, Mã tham chiếu giao dịch độc nhất (`ORDER_xxxxxx`).

#### [FR-07.03] Đối soát Tự động qua Webhook & Kích hoạt Dịch vụ Tức thì
- **Mô tả:** Khi khách hàng quét mã thanh toán bằng ứng dụng ngân hàng di động thành công, Cổng thanh toán gửi tín hiệu Webhook kèm chữ ký số xác thực (HMAC-SHA256) về endpoint của `payment-service`.
- **Xử lý:** Kiểm tra tính toàn vẹn chữ ký, đối chiếu số tiền và mã hóa đơn, tự động kích hoạt nâng cấp hạng tài khoản và cộng hạn ngạch tín dụng vào tài khoản người dùng trong vòng **dưới 3 giây** mà không cần sự can thiệp thủ công của nhân viên hỗ trợ.

---

### 3.8. Phân hệ 8: Không gian Tương tác Học thuật Nội bộ (Q-Group Academic Workspace)

#### [FR-08.01] Kênh Trao đổi Học thuật Phân nhóm (Slack-style Workspace)
- **Mô tả:** Cung cấp không gian trao đổi nghiệp vụ khảo thí trực tuyến cho các Giảng viên trong cùng Bộ môn hoặc Nhóm học phần.
- **Tính năng:** Tạo kênh công khai (Public Channels), kênh riêng tư (Private Channels), nhắn tin trực tiếp (Direct Message), phân luồng hội thoại theo chủ đề (Thread Replies).

#### [FR-08.02] Chia sẻ & Đóng góp Câu hỏi vào Ngân hàng Dùng chung
- **Mô tả:** Cho phép Giảng viên chia sẻ các câu hỏi trắc nghiệm hay hoặc các đề thi mẫu đã được duyệt vào kênh làm việc để các đồng nghiệp trong bộ môn cùng góp ý, phản biện và thẩm định.

---

### 3.9. Phân hệ 9: Quản trị & Giám sát Vận hành Hệ thống (Admin Portal 360 - Port 8006)

#### [FR-09.01] Quản lý Tài khoản & Phân quyền Người dùng Toàn diện
- **Mô tả:** Quản trị viên có thể tra cứu danh sách người dùng, kích hoạt, khóa tạm thời hoặc xóa tài khoản vi phạm chính sách, phân bổ lại vai trò quản trị (RBAC).

#### [FR-09.02] Nhật ký Giám sát Vết Hệ thống Toàn vẹn (Immutable Audit Logs)
- **Mô tả:** Ghi nhận tự động và bảo vệ bất biến mọi thao tác quan trọng trên hệ thống: Đăng nhập/Đăng xuất, Tải lên giáo trình, Tạo đề thi, Phê duyệt/Xóa câu hỏi, Giao dịch thanh toán, Thay đổi phân quyền. Mỗi bản ghi log bao gồm: `log_id`, `user_id`, `ip_address`, `user_agent`, `action_type`, `resource_id`, `timestamp`, `status`.

#### [FR-09.03] Bảng Theo dõi Chỉ số Sức khỏe Hạ tầng (Real-time Metrics Dashboard)
- **Mô tả:** Giám sát thời gian thực trạng thái vận hành của toàn bộ 8 Microservices: Tỷ lệ hoạt động (Health Status), Mức độ tiêu thụ CPU/RAM, Số lượng yêu cầu/giây (Requests per second - RPS), Độ trễ API trung bình, Lượng token tiêu thụ với dịch vụ AI Gemini, Doanh thu thanh toán trong ngày.

---

### 3.10. Phân hệ 10: Cổng Điều hướng Tập trung & Tường lửa (API Gateway - Port 8000)

#### [FR-10.01] Định tuyến Yêu cầu & Proxy Ngược (Reverse Proxy Routing)
- **Mô tả:** Tiếp nhận toàn bộ lưu lượng truy cập từ Client tại địa chỉ duy nhất `http://localhost:8000/api/v1/...`, xác thực tiền xử lý và điều hướng chính xác đến từng microservice chuyên trách bên trong mạng nội bộ.

#### [FR-10.02] Tường lửa Chống Tấn công Từ chối Dịch vụ (Rate Limiting & CORS)
- **Mô tả:** Giới hạn tần suất gọi API (Rate Limiting) dựa trên địa chỉ IP và danh tính người dùng (Ví dụ: Tối đa 60 yêu cầu/phút cho các API thông thường, tối đa 5 yêu cầu/phút cho API nạp giáo trình và sinh AI). Chặn các yêu cầu Cross-Origin bất hợp pháp thông qua chính sách CORS nghiêm ngặt.

---

## CHƯƠNG 4: YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR)

### 4.1. Hiệu năng & Giới hạn Thời gian Đáp ứng (Performance & Latency)

| Mã NFR | Tiêu chí đo lường | Giá trị cam kết (SLA) | Điều kiện môi trường kiểm thử |
| :--- | :--- | :--- | :--- |
| **NFR-01.01** | Độ trễ phản hồi API thông thường | $\le 200\,\text{ms}$ (ở mức $95\text{-th}$ percentile) | Các truy vấn đọc/ghi dữ liệu thông thường qua API Gateway dưới tải 200 concurrent users. |
| **NFR-01.02** | Thời gian xử lý nạp & bóc tách giáo trình | $\le 30\,\text{giây}$ | Giáo trình chuẩn 100 trang PDF văn bản thông thường. |
| **NFR-01.03** | Thời gian truy hồi ngữ cảnh RAG (Top-K) | $\le 500\,\text{ms}$ | Tìm kiếm vector trên kho ngữ liệu 10.000 chunks trong ChromaDB. |
| **NFR-01.04** | Thời gian sinh bộ câu hỏi trắc nghiệm AI | $\le 15\,\text{giây}$ | Khởi tạo lô 10 câu hỏi trắc nghiệm đa phương thức từ Gemini Flash API. |
| **NFR-01.05** | Thời gian đóng gói & xuất bản đề thi | $\le 3\,\text{giây}$ | Đóng gói xuất đồng thời 4 mã đề Word + PDF OMR + QTI 2.1 cho đề thi 50 câu. |
| **NFR-01.06** | Tốc độ tải trang khởi đầu Frontend (FCP) | $\le 1.2\,\text{giây}$ | Mạng Internet tiêu chuẩn 50 Mbps, trình duyệt không lưu cache trước. |

### 4.2. Độ sẵn sàng, Tin cậy & Khả năng Phục hồi (Availability & Resilience)
- **NFR-02.01 (Uptime):** Hệ thống cam kết thời gian hoạt động ổn định đạt tối thiểu **$99.9\%$** mỗi tháng (tương đương tổng thời gian gián đoạn ngoài kế hoạch không quá 43.8 phút/tháng).
- **NFR-02.02 (Circuit Breaker & Retry):** Cơ chế gọi API bên ngoài (Gemini API, VietQR API) bắt buộc tích hợp bộ ngắt mạch (Circuit Breaker) và thử lại tự động (Exponential Backoff Retry tối đa 3 lần với khoảng cách $1s, 2s, 4s$) trước khi trả thông báo lỗi thân thiện.
- **NFR-02.03 (Offline Mock Fallback):** Khi mất kết nối mạng Backend cục bộ trong quá trình phát triển hoặc kiểm thử, Client Frontend tự động kích hoạt chế độ mô phỏng dữ liệu an toàn (Offline Fallback Engine) để người dùng tiếp tục trải nghiệm giao diện mà không gặp hiện tượng màn hình trắng (Blank Screen Crash).

### 4.3. An toàn Thông tin & Bảo mật (Security & Cryptography)
- **NFR-03.01 (Mã hóa đường truyền):** Toàn bộ lưu lượng giao tiếp giữa Client $\leftrightarrow$ Server và giữa các dịch vụ bên ngoài bắt buộc sử dụng giao thức bảo mật mã hóa **TLS 1.3 / HTTPS**.
- **NFR-03.02 (Bảo mật Mật khẩu):** Mật khẩu người dùng bắt buộc được băm bằng thuật toán `bcrypt` với độ phức tạp tối thiểu là 12 vòng lặp (Work factor/Salt rounds = 12). Tuyệt đối không lưu trữ bản rõ (plaintext).
- **NFR-03.03 (Mã hóa Dữ liệu Nhạy cảm):** Các thông tin tài chính, khóa bí mật API (Gemini API Key, Webhook Secret) được mã hóa bằng chuẩn **AES-256-GCM** trước khi lưu vào cơ sở dữ liệu hoặc biến môi trường được phân quyền nghiêm ngặt.
- **NFR-03.04 (Phòng chống Lỗ hổng OWASP Top 10):** Hệ thống áp dụng cơ chế Parameterized Queries (SQLAlchemy ORM) để triệt tiêu hoàn toàn nguy cơ **SQL Injection**; áp dụng bộ lọc làm sạch chuỗi (DOMPurify) để chống **Cross-Site Scripting (XSS)**; kiểm tra mã định danh quyền sở hữu tài nguyên để chống **Insecure Direct Object References (IDOR)**.

### 4.4. Tính Toàn vẹn & Nhất quán Dữ liệu (Data Integrity)
- **NFR-04.01 (ACID Transactions):** Các thao tác liên quan đến nạp điểm tín dụng, kích hoạt gói cước, xuất bản và xóa ngân hàng câu hỏi phải được thực thi trong một Transaction duy nhất tuân thủ đầy đủ 4 nguyên tắc: Nguyên tử (Atomicity), Nhất quán (Consistency), Độc lập (Isolation) và Bền vững (Durability).
- **NFR-04.02 (Sao lưu Dự phòng - Backup):** Cơ sở dữ liệu quan hệ PostgreSQL và Vector Store ChromaDB được tự động sao lưu định kỳ hàng ngày (Daily Automated Snapshot) vào lúc 02:00 sáng, lưu giữ an toàn tối thiểu 30 ngày. Cam kết RPO (Recovery Point Objective) $\le 24$ giờ và RTO (Recovery Time Objective) $\le 2$ giờ.

### 4.5. Khả năng Mở rộng & Tương thích Hạ tầng (Scalability & Portability)
- **NFR-05.01 (Stateless Architecture):** Toàn bộ các dịch vụ Backend FastAPI đều được thiết kế theo nguyên lý Phi trạng thái (Stateless), cho phép dễ dàng mở rộng chiều ngang (Horizontal Auto-scaling) tăng giảm số lượng container linh hoạt theo tải CPU/RAM thông qua Docker Swarm hoặc Kubernetes.
- **NFR-05.02 (Độc lập Nền tảng):** Toàn bộ ứng dụng được đóng gói hoàn chỉnh bằng Dockerfile chuẩn hóa, có khả năng khởi chạy đồng nhất trên môi trường Windows Server, Linux (Ubuntu/Debian) hoặc macOS mà không đòi hỏi chỉnh sửa cấu hình mã nguồn.

### 4.6. Trải nghiệm Người dùng & Công thái học Giao diện (Usability & Ergonomics)
- **NFR-06.01 (Ngôn ngữ Thiết kế):** Áp dụng phong cách **Deep Dark Academic Glassmorphism** với nền tối bảo vệ thị lực giảng viên khi làm việc cường độ cao trong thời gian dài, các khối giao diện kính mờ tinh tế kết hợp hiệu ứng viền sáng nhẹ (`border-white/10`, `backdrop-blur-xl`).
- **NFR-06.02 (Tốc độ Hiển thị Công thức Toán):** Toàn bộ các ký hiệu và biểu thức toán học LaTeX phức tạp phải được biên dịch và hiển thị tức thì bằng thư viện KaTeX với thời gian trễ dưới $50\,\text{ms}$ cho mỗi câu hỏi.
- **NFR-06.03 (Tối ưu hóa Phản hồi Trực quan):** Cung cấp hệ thống thông báo trạng thái dạng Toast thông minh (giới hạn tối đa 4 thông báo mới nhất) kết hợp các hiệu ứng sóng quét laser (`scanBeam`), hiệu ứng tạo xung ánh sáng (`shimmerWave`) mang lại cảm giác phản hồi AI sống động.

### 4.7. Tiêu chuẩn Xuất bản Khảo thí & Quốc tế hóa (Standards & Compliance)
- **NFR-07.01 (Chuẩn In ấn Khảo thí):** Tài liệu PDF và Word xuất xưởng bắt buộc khớp với kích thước giấy in A4 chuẩn quốc tế. Khoảng cách giữa các câu hỏi, vị trí khung tên, bảng mã đề và lưới trắc nghiệm OMR phải đảm bảo máy quét quang học đọc chính xác với tỷ lệ sai lệch dưới $0.01\%$.
- **NFR-07.02 (Chuẩn Tương thích Trao đổi Khảo thí):** Tệp xuất LMS bắt buộc vượt qua công cụ kiểm tra hợp thức (Validator) của chuẩn quốc tế **IMS QTI 2.1**.

---

## CHƯƠNG 5: YÊU CẦU GIAO DIỆN & TÍCH HỢP HỆ THỐNG (INTERFACE REQUIREMENTS)

### 5.1. Giao diện Người dùng (User Interfaces)
Hệ thống Frontend cung cấp 7 màn hình làm việc nghiệp vụ tập trung:
1. **Màn hình Đăng nhập & Xác thực (`LoginModal.tsx`):** Đăng nhập mật khẩu, Google SSO, quên mật khẩu nhận OTP.
2. **Bảng điều khiển Khảo thí (`DashboardScreen.tsx`):** Thống kê số giáo trình, câu hỏi cần duyệt, tỷ lệ phê duyệt, biểu đồ phân bổ nhận thức Bloom dạng trực quan.
3. **Quản lý Giáo trình & Nạp Tri thức (`TextbookUploadScreen.tsx`):** Vùng kéo thả tệp giáo trình, thanh tiến trình bóc tách laser scan, modal kiểm tra cấu trúc chunks RAG.
4. **Khởi tạo Ma trận Đề thi AI (`AIGenerationScreen.tsx`):** Bộ mẫu đề chuẩn hóa (Giữa kỳ/Cuối kỳ), thanh trượt tỷ lệ nhận thức Bloom 4 bậc với thanh cân bằng tự động 100%.
5. **Không gian Kiểm duyệt RAG (`ReviewWorkspaceScreen.tsx`):** Phân vùng chia đôi đối soát câu hỏi với minh chứng giáo trình gốc, hệ thống phím tắt `[A]` Duyệt / `[R]` Từ chối.
6. **Ngân hàng Câu hỏi & Đóng gói Đề thi (`QuestionBankScreen.tsx`):** Bảng dữ liệu câu hỏi đa chọn, thanh tác vụ nổi xuất Word (.docx), PDF OMR Vector, IMS QTI 2.1.
7. **Bảng Quản trị & Cổng Thanh toán (`AdminPortal.tsx` / `PaymentModal.tsx`):** Bảng hiển thị mã VietQR động, lịch sử giao dịch và nhật ký Audit Log.

### 5.2. Giao diện Phần mềm Nội bộ (Internal API Contracts)
Tất cả các dịch vụ trao đổi dữ liệu qua giao thức HTTP RESTful JSON tuân thủ chuẩn quy cách đặt tên thuộc tính `camelCase` ở đầu ra Client và `snake_case` ở nội bộ cơ sở dữ liệu:

| Endpoint Tiêu biểu | Phương thức | Dịch vụ đích | Chức năng nghiệp vụ |
| :--- | :---: | :---: | :--- |
| `/api/v1/auth/login` | `POST` | `auth-service` (8001) | Xác thực tài khoản & cấp JWT Access/Refresh Token |
| `/api/v1/documents/upload` | `POST` | `document-service` (8002) | Tải lên giáo trình PDF/DOCX và bóc tách cấu trúc |
| `/api/v1/rag/query` | `POST` | `rag-service` (8003) | Truy vấn Top-K đoạn trích minh chứng liên quan |
| `/api/v1/ai/generate-exam` | `POST` | `ai-service` (8004) | Sinh câu hỏi trắc nghiệm theo ma trận Bloom & LaTeX |
| `/api/v1/exams/export-bundle` | `POST` | `exam-service` (8005) | Đóng gói xuất Word/PDF OMR/QTI ra tệp ZIP |
| `/api/v1/payments/create-qr` | `POST` | `payment-service` (8007) | Tạo mã VietQR động nâng cấp gói cước |
| `/api/v1/admin/audit-logs` | `GET` | `admin-service` (8006) | Tra cứu nhật ký vận hành và kiểm tra sức khỏe hệ thống |

### 5.3. Giao diện Dịch vụ Bên ngoài (External Integrations)
1. **Google Gemini Flash API:** Giao tiếp qua giao thức HTTPS REST Client để gửi prompt và nhận dữ liệu JSON câu hỏi có định dạng toán học LaTeX.
2. **Cổng Ngân hàng VietQR / PayOS API:** Tích hợp sinh mã QR thanh toán chuẩn quốc gia và nhận thông báo giao dịch thông qua Webhook URL bảo mật bằng chữ ký số HMAC-SHA256.
3. **Hệ thống Gửi Thư Điện tử (SMTP / Brevo API):** Gửi mã OTP xác nhận tài khoản và hóa đơn điện tử cho người dùng.

---

## CHƯƠNG 6: MA TRẬN TRUY XUẤT NGUỒN GỐC YÊU CẦU (REQUIREMENTS TRACEABILITY MATRIX - RTM)

Bảng ma trận truy xuất nguồn gốc liên kết trực tiếp giữa Yêu cầu Nghiệp vụ Người dùng, Yêu cầu Chức năng (FR), Dịch vụ Phụ trách và Tiêu chí Kiểm thử Chấp nhận (Acceptance Criteria):

| Mã Yêu cầu | Tên Chức năng Nghiệp vụ | Phân hệ / Dịch vụ Phụ trách | Tác nhân Áp dụng | Tiêu chí Kiểm thử Chấp nhận (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **FR-01.01** | Đăng nhập hệ thống & cấp JWT | `auth-service` (Port 8001) | Tất cả người dùng | Cấp mã JWT hợp lệ với hạn dùng 60 phút, mã hóa bcrypt mật khẩu, trả lỗi nếu sai thông tin quá 5 lần. |
| **FR-01.02** | Đăng nhập Google SSO | `auth-service` (Port 8001) | Tất cả người dùng | Tự động tạo hồ sơ người dùng mới nếu chưa tồn tại, chuyển hướng đăng nhập thành công dưới 2 giây. |
| **FR-01.03** | Khôi phục mật khẩu qua OTP | `auth-service` (Port 8001) | Tất cả người dùng | Mã OTP 6 chữ số có hiệu lực đúng 5 phút, vô hiệu hóa ngay sau khi sử dụng hoặc khi hết hạn. |
| **FR-02.01** | Tải lên giáo trình PDF/DOCX | `document-service` (Port 8002) | `LECTURER`, `ADMIN` | Chấp nhận tệp $\le 50\,\text{MB}$, từ chối định dạng lạ, trả về mã SHA-256 xác thực tệp thành công. |
| **FR-02.02** | Bóc tách cấu trúc chương mục | `document-service` (Port 8002) | `LECTURER` | Nhận dạng chính xác danh mục chương mục, hiển thị cây mục lục lên giao diện cho người dùng chọn. |
| **FR-03.01** | Lưu trữ vector vào ChromaDB | `rag-service` (Port 8003) | Hệ thống | Vector hóa đoạn trích thành công, lưu trữ kèm đầy đủ metadata: `document_id`, `chapter`, `page`. |
| **FR-03.02** | Truy hồi đoạn trích Top-K RAG | `rag-service` (Port 8003) | `ai-service` | Trả về tối đa $K$ đoạn trích có Cosine Similarity cao nhất trong thời gian dưới $500\,\text{ms}$. |
| **FR-04.01** | Thiết lập ma trận Bloom 4 bậc | `ai-service` (Port 8004) | `LECTURER`, `HEAD_OF_DEPT` | Bắt buộc tổng tỷ lệ 4 cấp độ bằng chính xác $100\%$, hỗ trợ 3 mẫu cấu hình nhanh chuẩn khoa. |
| **FR-04.02** | Sinh câu hỏi trắc nghiệm AI | `ai-service` (Port 8004) | `LECTURER` | Trả kết quả JSON nghiêm ngặt, hỗ trợ công thức LaTeX `$E=mc^2$`, 4 phương án, có lời giải chi tiết. |
| **FR-05.01** | Đối soát Split-view 2 chiều | `ReviewWorkspaceScreen` | `LECTURER` | Hiển thị câu hỏi bên trái và trích đoạn giáo trình gốc bên phải với câu trả lời được tô sáng. |
| **FR-05.02** | Thao tác duyệt bằng phím tắt | `ReviewWorkspaceScreen` | `LECTURER` | Bấm phím `A` duyệt ngay, bấm `R` từ chối, chuyển câu mượt mà với thời gian phản hồi dưới $100\,\text{ms}$. |
| **FR-06.02** | Đảo mã đề khảo thí Fisher-Yates | `exam-service` (Port 8005) | `LECTURER`, `HEAD_OF_DEPT` | Đảo ngẫu nhiên câu hỏi và đáp án mã 101-108 không trùng lặp, sinh ma trận đáp án đối chiếu chéo. |
| **FR-06.03** | Xuất đề thi Microsoft Word | `exam-service` (Port 8005) | `LECTURER` | Đúng mẫu quy chuẩn Đại học, làm sạch LaTeX sang Unicode toán học không lỗi font, kèm bảng đáp án. |
| **FR-06.04** | Xuất đề thi PDF kèm phiếu OMR | `exam-service` (Port 8005) | `LECTURER` | Đồ họa vector sắc nét chuẩn A4, phiếu OMR 50 câu khớp tọa độ vật lý cho máy quét chấm tự động. |
| **FR-06.05** | Xuất gói IMS QTI 2.1 cho LMS | `exam-service` (Port 8005) | `LECTURER`, `HEAD_OF_DEPT` | Tệp nén `.zip` chứa XML hợp thức, nhập thành công vào hệ thống Canvas và Moodle không lỗi. |
| **FR-07.02** | Tạo mã thanh toán VietQR động | `payment-service` (Port 8007) | `LECTURER` | Hiển thị mã QR chuẩn NAPAS 24/7 chứa đúng số tiền và mã hóa đơn, quét được trên mọi app ngân hàng. |
| **FR-07.03** | Webhook kích hoạt gói tự động | `payment-service` (Port 8007) | Khách hàng chuyển khoản | Nhận tín hiệu ngân hàng, xác thực HMAC-SHA256, nâng cấp tài khoản và cộng tín dụng dưới 3 giây. |
| **FR-09.02** | Nhật ký Audit Logs bất biến | `admin-service` (Port 8006) | `ADMIN`, `SUPER_ADMIN` | Ghi nhận chi tiết mọi hành vi nhạy cảm kèm IP, User, Timestamp, không thể sửa đổi hoặc xóa tùy tiện. |

---

## PHÊ DUYỆT TÀI LIỆU (DOCUMENT APPROVAL)

| Đại diện | Họ và tên | Chức vụ | Chữ ký & Ngày phê duyệt |
| :--- | :--- | :--- | :--- |
| **Đại diện Kỹ thuật & Tác giả:** | Ngô Phạm Công Đức | Kỹ sư Phát triển Hệ thống / Phụ trách Exam Service | *(Đã ký điện tử - 18/11/2026)* |
| **Đại diện Nhóm Phát triển:** | Nhóm Kỹ thuật QuizGen AI | Backend & Frontend Architecture Team | *(Đã ký điện tử - 18/11/2026)* |
| **Đại diện Hội đồng Khảo thí:** | Ban Cố vấn Học thuật | Trưởng ban Khảo thí & Đảm bảo Chất lượng | *(Đã phê duyệt thông qua - 18/11/2026)* |

---
*Tài liệu này là tài sản trí tuệ của Dự án QuizGen AI. Nghiêm cấm sao chép, trích dẫn bất hợp pháp khi chưa có văn bản chấp thuận của Ban Quản trị Dự án.*
