# BÁO CÁO TIẾN ĐỘ DỰ ÁN QUIZGEN AI
**Họ và tên:** Ngô Phạm Công Đức  
**MSSV:** 052205015692  
**Nhóm:** Nhóm 1  
**Ngày thực hiện:** 10/11/2026  
**Phân hệ phụ trách:** Exam Service (Backend Khảo thí & Tích hợp Frontend) & Pipeline Document - RAG  
**Nội dung công việc:** Tối ưu hóa RAG Embedding Model (Khắc phục lỗi SSL Offline Cache), Hợp nhất Pipeline Document - RAG ([SCRUM-51]) và Exam Service ([SCRUM-56]), Chuẩn hóa API Gateway Hop-by-Hop Headers và Hoàn thiện Kiểm thử Tích hợp Toàn diện (E2E Integration Testing)  

---

### I. CÔNG VIỆC ĐÃ HOÀN THÀNH

Bám sát lộ trình phát triển và các cam kết kỹ thuật của đề án QuizGen AI, toàn bộ các hạng mục nâng cấp kiến trúc, tối ưu hiệu năng và kiểm thử nghiệm thu cho hệ thống đã được triển khai và hoàn tất 100%:

#### 1. Khắc phục Triệt để Lỗi SSL & Nạp Offline Cache cho RAG Embedding Model
* **Hiện tượng lỗi ban đầu:** Khi khởi chạy `rag-service` trên nền tảng máy phát triển cục bộ, lớp `ONNXMiniLM_L6_V2` của ChromaDB cố gắng kết nối tới AWS S3 để tải model `all-MiniLM-L6-v2` nhưng bị chặn bởi lỗi chứng chỉ `[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:1006)`. Điều này khiến dịch vụ rơi vào trạng thái warning và không thể pre-warm model embedding, làm tăng độ trễ truy vấn vector ngữ cảnh trong lần chạy đầu tiên.
* **Giải pháp kỹ thuật đã triển khai:**
  - Viết module tải và giải nén độc lập bộ mô hình `onnx.tar.gz` dung lượng 83.18 MB vào thư mục cache chuẩn của hệ thống: `~/.cache/chroma/onnx_models/all-MiniLM-L6-v2/onnx`.
  - Kiểm chuẩn tính toàn vẹn dữ liệu thông qua mã băm SHA256: `913d7300ceae3b2dbc2c50d1de4baacab4be7b9380491c27fab7418616a16ec3`.
  - Khởi tạo thành công phiên Persistent ONNX Inference Session (CPU Execution Provider) với đầy đủ 6 tệp tin cấu hình (`model.onnx`, `config.json`, `tokenizer.json`, `tokenizer_config.json`, `vocab.txt`, `special_tokens_map.json`).
  - *Hiệu năng đạt được:* Vector hóa chuỗi truy vấn (384 chiều) chỉ mất trung bình **15 - 25 ms** (nhanh gấp 10 lần so với việc tạo mới session).

#### 2. Hợp nhất Hoàn toàn Pipeline Document - RAG ([SCRUM-51]) và Exam Service ([SCRUM-56])
* Đã gộp thành công mã nguồn từ nhánh `feature/upload-from-nguyentann-20261030` vào nhánh làm việc chính `feature/exam-service` với tỷ lệ tự động thành công 100% (Clean Merge, 0 conflict).
* **Đồng bộ các tính năng cốt lõi đã hoàn thiện:**
  - *Document Service*: Nâng cấp cơ chế phân đoạn liên trang không bị ngắt quãng ý nghĩa (Cross-page Stitching), tự động gom cụm văn bản trang ngắn (Fallback Aggregation) và bảo toàn định dạng bảng Markdown (`| ... |`) cùng công thức toán học KaTeX/LaTeX (`$...$`).
  - *RAG Service*: Kích hoạt thuật toán Hybrid Retrieval kết hợp giữa Dense Vector Semantic Search (trọng số 70%) và Lexical BM25 Keyword Boosting (trọng số 30%), giúp nhận diện chính xác các thuật ngữ viết tắt học thuật (ví dụ: PED, GDP, CPI, OLS).
  - *Frontend Onboarding*: Tích hợp màn hình thiết lập thông tin học thuật cá nhân `ProfileSetupScreen.tsx`, hoàn thiện luồng chuyển tiếp sau khi giảng viên đăng ký tài khoản mới trên hệ thống.
  - *Exam Service*: Duy trì toàn bộ module xác thực JWT động (`auth.py`), loại bỏ 13 vị trí hardcode `lec-001`, phân quyền RBAC và endpoint phục hồi tải lại đề thi đã lưu từ cơ sở dữ liệu (`GET /api/v1/exams/{id}/download`).

#### 3. Chuẩn hóa Tiêu đề Hop-by-Hop tại API Gateway (Khắc phục lỗi WinError 10054)
* **Nguyên nhân kỹ thuật:** Khi client gửi request có tiêu đề `Connection: close`, API Gateway trước đây chuyển tiếp nguyên văn tiêu đề này sang các microservices nội bộ. Khi tải các gói tệp tin có kích thước lớn (như file nén đề thi ZIP > 500 KB hoặc file PDF vector), microservice nội bộ lập tức đóng socket ngay sau khi gửi dữ liệu, gây ra lỗi xung đột `httpx.ReadError` tại Gateway và `[WinError 10054] ConnectionResetError` tại Client.
* **Giải pháp chuẩn hóa RFC 2616:**
  - Bổ sung danh sách lọc tiêu đề chuyển tiếp (Hop-by-Hop Headers): `host`, `content-length`, `connection`, `keep-alive`, `transfer-encoding`, `te`, `trailer`, `upgrade`.
  - Tự động bóc tách các tiêu đề này cả ở chiều Request chuyển tiếp upstream và chiều Response phản hồi downstream.
  - Cập nhật cấu hình mặc định mạng nội bộ từ `localhost` sang `127.0.0.1` để ngăn ngừa xung đột địa chỉ IPv6 (`::1`) trên Windows.

#### 4. Nghiệm thu Toàn diện Hệ thống qua các Bộ Kịch bản Kiểm thử Tự động
Toàn bộ các bộ test tự động từ Unit Test, Integration Test đến End-to-End System Test đều được thực thi và đạt tỷ lệ thành công 100%:
* **Kiểm thử Document & RAG Service (`scripts/test_document_rag_scenario.py`)**: `5/5 TC PASS (100%)`
  - *TC-01: Cross-page continuous stitching* -> **PASS** (Nối câu liên trang mạch lạc, thời gian: 0.05 ms).
  - *TC-02: Bảo toàn bảng biểu và công thức LaTeX* -> **PASS** (0 dòng vỡ, 0 lỗi dấu công thức).
  - *TC-03: Hybrid Search & Term Boosting* -> **PASS** (Top-1 độ tương đồng đạt 80.43%).
  - *TC-04: Concurrent multi-chapter search* -> **PASS** (Độ trễ truy vấn: **32.05 ms**, đáp ứng xuất sắc cam kết SLA < 200 ms).
  - *TC-05: Real Quota Tracking & Cache Purge on Delete* -> **PASS** (Zero Mock Data, cập nhật token thực tế, dọn sạch cache khi xóa sách).
* **Kiểm thử Exam Service (`test_exam_service_full.py`)**: `8/8 TC PASS (100%)`
  - Đảo đề trắc nghiệm hoán vị Fisher-Yates (mã 101, 102, 103, 104) với ma trận đáp án chuẩn xác.
  - Xuất phiếu tô trắc nghiệm OMR 50 câu chuẩn thi đại học (102.7 KB).
  - Xuất đề thi Word (.docx) kèm bảng ma trận đáp án (37.9 KB).
  - Đóng gói chuẩn E-Learning quốc tế IMS QTI 2.1 zip (13 tệp tin XML/HTML).
  - Đóng gói trọn bộ khảo thí Bundle ZIP đa định dạng (696 KB).
  - Xác thực JWT động, phân quyền RBAC và lưu/tải lại đề thi từ CSDL.
* **Kiểm thử Tích hợp Toàn hệ thống (`scripts/test_e2e_integration.py`)**: `8/8 TC PASS (100%)` trên nền tảng HTTPX Engine:
  - Xác thực đăng nhập thất bại khi sai mật khẩu (HTTP 401).
  - Đăng nhập thành công với tài khoản giảng viên chính thức (HTTP 200).
  - Đăng ký tài khoản giảng viên mới (HTTP 200/201).
  - Đăng nhập với tài khoản vừa đăng ký (HTTP 200).
  - Xuất bản đề thi Word `.docx` thành công (37.3 KB, 10 đoạn văn, 2 bảng biểu).
  - Xuất bản đề thi PDF chuẩn bản in thành công (69.5 KB, header `%PDF-`).
  - Xuất bản gói khảo thí Bundle ZIP thành công (528.4 KB, header `PK`).
* **Kiểm tra Biên dịch Frontend (`npm run build`)**: `PASS` (0 lỗi TypeScript, 2053 modules transformed).

---

### II. BẢNG TỔNG HỢP KHÓ KHĂN & GIẢI PHÁP KỸ THUẬT

| STT | Khó khăn / Lỗi phát sinh | Nguyên nhân kỹ thuật | Giải pháp xử lý triệt để |
| :---: | :--- | :--- | :--- |
| **1** | RAG Service cảnh báo lỗi SSL certificate khi warm-up model embedding. | Python `httpx` trên Windows không truy cập được kho chứng chỉ gốc để tải model từ AWS S3. | Tải thủ công tệp `onnx.tar.gz` (83.18 MB), kiểm tra mã băm SHA256 và nạp trực tiếp vào thư mục cache offline của ChromaDB. |
| **2** | Kịch bản test E2E gặp lỗi `WinError 10054` khi tải gói ZIP dung lượng lớn qua API Gateway. | Gateway chuyển tiếp tiêu đề hop-by-hop `Connection: close`, khiến microservice nội bộ ngắt kết nối trước khi client đọc hết luồng byte. | Triển khai bộ lọc bóc tách toàn bộ tiêu đề Hop-by-Hop theo chuẩn RFC 2616 ở cả hai chiều Request và Response tại API Gateway. |
| **3** | Lỗi phân giải địa chỉ mạng nội bộ khi Gateway kết nối với các microservices. | Sử dụng hostname `localhost` trên Windows dẫn đến việc cố gắng kết nối qua IPv6 (`::1`) trước khi sang IPv4. | Đồng bộ toàn bộ URL downstream sang địa chỉ IPv4 tường minh `http://127.0.0.1:<port>` trong cả file cấu hình `.env` và `config.py`. |
| **4** | Lỗi xung đột cấu trúc dữ liệu khi hợp nhất hai phân hệ khảo thí và upload tài liệu. | Nhánh `upload-from-nguyentann-20261030` và `exam-service` phát triển độc lập từ commit `c89e0fa`. | Sử dụng thuật toán `ort` merge, giải quyết các thay đổi song song trên `src/types/index.ts` và xác nhận tính toàn vẹn bằng toàn bộ bộ test hồi quy. |

---

### III. SẢN PHẨM ĐÃ BÀN GIAO & TÌNH TRẠNG MÃ NGUỒN

* **Nhánh làm việc:** `feature/exam-service`
* **Trạng thái mã nguồn:** Đã đẩy toàn bộ lên Git remote `origin/feature/exam-service`:
  - Commit `a4c1c1e`: `[SCRUM-51][SCRUM-56] Merge feature/upload-from-nguyentann-20261030: hop nhat pipeline Document-RAG va Exam Service`
  - Commit `92271a1`: `[SCRUM-51][SCRUM-56] Fix api-gateway hop-by-hop headers and update test_e2e_integration to httpx`
* **Trạng thái vận hành:**
  - Toàn bộ 6 Backend Microservices đang chạy liên tục qua `start_backend.py` (`http://127.0.0.1:8000` - `8005`).
  - Giao diện người dùng Web Frontend đang phục vụ tại `http://localhost:3000`.

---

### IV. KẾ HOẠCH BƯỚC TIẾP THEO
1. Tạo Pull Request chính thức từ nhánh `feature/exam-service` vào nhánh `develop`.
2. Phối hợp với các thành viên trong nhóm thực hiện demo liên thông toàn trình: Tải giáo trình $\rightarrow$ Bóc tách RAG $\rightarrow$ Sinh ma trận Bloom $\rightarrow$ Kiểm soát câu hỏi $\rightarrow$ Xuất bản đề thi chuẩn đại học kèm phiếu OMR 50 câu.
