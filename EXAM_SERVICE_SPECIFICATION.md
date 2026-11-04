# ĐẶC TẢ HOÀN THIỆN EXAM & QUESTION BANK SERVICE
**Dịch vụ:** `exam-service` (Cổng 8005 / Microservice Quản lý Ngân hàng Câu hỏi, Đóng gói Đa mã đề & Xuất bản Khảo thí)  
**Hệ thống:** QuizGen AI – Nền tảng Khảo thí & Khởi tạo Đề thi Học thuật  
**Phiên bản:** v1.0.0 Production Specification  
**Ngày hoàn thiện:** 02/11/2026  

---

## MỤC LỤC TỔNG QUAN

1. [Mục tiêu & Phạm vi Dịch vụ](#1-mục-tiêu--phạm-vi-dịch-vụ)
2. [Kiến trúc Mã nguồn & Cấu trúc Thư mục](#2-kiến-trúc-mã-nguồn--cấu-trúc-thư-mục)
3. [Kiến trúc Động cơ Nghiệp vụ & Thuật toán Cốt lõi](#3-kiến-trúc-động-cơ-nghiệp-vụ--thuật-toán-cốt-lõi)
   - 3.1. Thuật toán Hoán vị Đa mã đề & Ánh xạ Đáp án (Fisher-Yates Variant Shuffler)
   - 3.2. Động cơ Biên soạn Word Chuẩn Thể thức Đại học (`word_exporter.py`)
   - 3.3. Động cơ Xuất PDF Khảo thí & Phiếu Trắc nghiệm OMR (`pdf_exporter.py`)
   - 3.4. Động cơ Đóng gói Chuẩn E-Learning IMS QTI 2.1 & Moodle XML (`qti_exporter.py`)
   - 3.5. Quy trình Thẩm định Phê duyệt Câu hỏi (Review & Audit Trail Lifecycle)
4. [Đặc tả Chi tiết Toàn bộ API Endpoints](#4-đặc-tả-chi-tiết-toàn-bộ-api-endpoints)
   - 4.1. `GET /health` (Kiểm tra sức khỏe dịch vụ)
   - 4.2. `GET /questions` hoặc `GET /bank` (Truy vấn & Lọc ngân hàng câu hỏi)
   - 4.3. `GET /questions/{question_id}` (Chi tiết câu hỏi & minh chứng gốc)
   - 4.4. `PUT /questions/{question_id}` (Hiệu chỉnh nội dung, đáp án & giải thích)
   - 4.5. `PATCH /questions/{question_id}/status` (Phê duyệt hoặc từ chối câu hỏi)
   - 4.6. `POST /questions/batch-approve` (Phê duyệt hàng loạt câu hỏi)
   - 4.7. `POST /exams/generate-variants` (Tạo cấu trúc các mã đề đảo)
   - 4.8. `POST /export/word` (Xuất file đề thi Microsoft Word .docx)
   - 4.9. `POST /export/pdf` (Xuất file đề thi PDF kèm bảng đáp án)
   - 4.10. `POST /export/qti` (Đóng gói tệp XML chuẩn LMS Canvas / Moodle)
   - 4.11. `GET /exams` (Lịch sử đề thi đã đóng gói)
   - 4.12. `GET /exams/{exam_id}` (Chi tiết gói đề thi đã xuất bản)
   - 4.13. `GET /exams/analytics` (Báo cáo phân bổ Bloom & Thống kê khảo thí)
5. [Mô hình Dữ liệu ORM & Cấu trúc Bảng PostgreSQL (Schema `exams`)](#5-mô-hình-dữ-liệu-orm--cấu-trúc-bảng-postgresql-schema-exams)
6. [Cấu hình Môi trường, Dockerfile & Vận hành](#6-cấu-hình-môi-trường-dockerfile--vận-hành)
7. [Cơ chế Bảo toàn Tính Toàn vẹn Khảo thí & Bảo mật Đề thi](#7-cơ-chế-bảo-toàn-tính-toàn-vẹn-khảo-thí--bảo-mật-đề-thi)
8. [Ma trận Kiểm thử & Kịch bản Test mẫu (cURL Examples)](#8-ma-trận-kiểm-thử--kịch-bản-test-mẫu-curl-examples)

---

## 1. MỤC TIÊU & PHẠM VI DỊCH VỤ

`exam-service` là trung tâm hoàn thiện và đóng gói sản phẩm khảo thí của hệ thống QuizGen AI, giữ vai trò quyết định trong việc bảo đảm chất lượng học thuật và chuyển đổi các câu hỏi đã thẩm định thành tài liệu thi cử chuẩn mực:

- **Quản lý Ngân hàng Câu hỏi Khảo thí (Question Bank Lifecycle):** Lưu trữ tập trung các câu hỏi trắc nghiệm được sinh bởi `ai-service`, hỗ trợ phân loại đa tầng theo giáo trình, chương mục, cấp độ tư duy Bloom (Nhận biết, Thông hiểu, Vận dụng, Phân tích), độ tin cậy AI (Confidence Score) và trạng thái thẩm định (`pending`, `approved`, `rejected`).
- **Phân hệ Thẩm định & Tinh chỉnh Học thuật (Review Workspace Backend):** Cung cấp API phục vụ giảng viên kiểm tra câu hỏi song song với minh chứng trích đoạn giáo trình gốc (`source_chunk_id`), chỉnh sửa nội dung, xáo trộn hoặc đổi đáp án đúng, bổ sung giải thích chi tiết và phê duyệt đơn lẻ hoặc hàng loạt.
- **Động cơ Đảo mã đề Khoa học (Exam Variant Engine):** Tự động hoán vị thứ tự câu hỏi và thứ tự các phương án lựa chọn (A, B, C, D) để sinh ra nhiều mã đề thi khác nhau (ví dụ: mã đề 101, 102, 103, 104) từ cùng một ma trận đề gốc; duy trì bảng tra cứu đáp án chuẩn (Answer Key Matrix) tuyệt đối chính xác cho từng mã đề.
- **Động cơ Xuất bản Đa định dạng (Multi-format Exporters):**
  - **Microsoft Word (`.docx`):** Đúng quy chuẩn thể thức văn bản đề thi đại học (Header 2 cột quốc hiệu / trường / khoa, kẻ chỉ, bảng mã đề, ngắt trang và phụ lục bảng đáp án 5 cột cuối tài liệu).
  - **Portable Document Format (`.pdf`):** Sẵn sàng cho in ấn khảo thí hàng loạt, định dạng chữ sắc nét, căn lề chuẩn 2cm, tích hợp phiếu tô trắc nghiệm OMR tiêu chuẩn.
  - **Chuẩn E-Learning Quốc tế (`IMS QTI 2.1 & Moodle XML`):** Nhúng trực tiếp vào các hệ thống quản trị học tập hàng đầu như Canvas LMS, Moodle, Blackboard với đầy đủ điểm số, phản hồi đáp án (General Feedback) và trọng số chấm tự động.
- **Lưu trữ Hồ sơ Đề thi & Báo cáo Khảo thí:** Lưu lịch sử các đợt đóng gói đề thi vào schema `exams`, phục vụ công tác thanh tra giáo dục, thống kê độ phủ kiến thức và tái sử dụng ngân hàng đề.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        EXAM & QUESTION BANK SERVICE PIPELINE                           │
└────────────────────────────────────────────────────────────────────────────────────────┘

    [ai-service: Sinh câu hỏi] ──> INSERT status = 'pending'
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │   1. QUESTION BANK REPOSITORY   │ <─── [PostgreSQL: exams.questions]
                         │  • Phân loại Bloom / Chương     │
                         │  • Lưu Source Chunk ID          │
                         └─────────────────────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │   2. REVIEW & AUDIT WORKSPACE   │ <─── [Giảng viên thẩm định & sửa]
                         │  • PUT /questions/{id}          │
                         │  • POST /questions/batch-approve│
                         └─────────────────────────────────┘
                                          │ (Chọn bộ câu hỏi approved)
                                          ▼
                         ┌─────────────────────────────────┐
                         │   3. VARIANT SHUFFLER ENGINE    │
                         │  • Sinh N mã đề (101, 102, ...) │
                         │  • Hoán vị Question / Options   │
                         │  • Tính Ma trận Đáp án chuẩn    │
                         └─────────────────────────────────┘
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         ▼                                ▼                                ▼
┌──────────────────┐             ┌──────────────────┐            ┌───────────────────┐
│ 4. Word Exporter │             │  5. PDF Exporter │            │  6. QTI Exporter  │
│ (.docx chuẩn ĐH) │             │ (In ấn + OMR)    │            │ (Canvas / Moodle) │
└──────────────────┘             └──────────────────┘            └───────────────────┘
         │                                │                                │
         └────────────────────────────────┼────────────────────────────────┘
                                          ▼
                         ┌─────────────────────────────────┐
                         │    7. EXAM ARCHIVE & METRICS    │ ───> [PostgreSQL: exams.exams]
                         │  • Lưu cấu hình & danh sách ID  │
                         │  • Thống kê phân bổ đề thi      │
                         └─────────────────────────────────┘
```

---

## 2. KIẾN TRÚC MÃ NGUỒN & CẤU TRÚC THƯ MỤC

Toàn bộ dịch vụ được triển khai độc lập tại thư mục `services/exam-service/`:

```
services/exam-service/
├── Dockerfile                      # Cấu hình container Python 3.11-slim
├── requirements.txt                # Danh mục thư viện phụ thuộc
└── src/
    ├── __init__.py
    ├── main.py                     # Entry point FastAPI, định tuyến API & xử lý luồng
    ├── models.py                   # SQLAlchemy ORM Models & Pydantic Validation Schemas
    ├── database.py                 # Cấu hình Database Engine & SessionLocal
    ├── shuffler.py                 # Thuật toán hoán vị đa mã đề & ánh xạ ma trận đáp án
    └── exporters/
        ├── __init__.py
        ├── word_exporter.py        # Xuất đề thi DOCX chuẩn thể thức Đại học
        ├── pdf_exporter.py         # Xuất đề thi PDF & phiếu trắc nghiệm OMR
        └── qti_exporter.py         # Đóng gói chuẩn XML Canvas LMS / Moodle QTI
```

### Danh mục Dependencies chính (`requirements.txt`):

```text
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.8.0
python-docx>=1.1.2
fpdf2>=2.7.9
sqlalchemy>=2.0.32
psycopg2-binary>=2.9.9
httpx>=0.28.1
```

- `fastapi` & `uvicorn`: Framework bất đồng bộ tốc độ cao, hỗ trợ OpenAPI Swagger documentation tự động.
- `python-docx`: Thư viện xử lý và phát sinh tài liệu Microsoft Word dạng XML nhị phân (.docx) nguyên bản.
- `fpdf2`: Thư viện sinh file PDF nhỏ gọn, hỗ trợ căn lề chính xác, vẽ lưới bảng điểm và nhúng font Unicode tiếng Việt (DejaVu Sans).
- `sqlalchemy` & `psycopg2-binary`: Kết nối cơ sở dữ liệu PostgreSQL 16 quản lý transaction an toàn.
- `pydantic`: Xác thực dữ liệu đầu vào (DTO) cho các yêu cầu xuất đề và cập nhật câu hỏi.

---

## 3. KIẾN TRÚC ĐỘNG CƠ NGHIỆP VỤ & THUẬT TOÁN CỐT LÕI

### 3.1. Thuật toán Hoán vị Đa mã đề & Ánh xạ Đáp án (Fisher-Yates Variant Shuffler)

Để đảm bảo chống gian lận trong phòng thi mà không làm thay đổi độ khó hoặc làm mất đi tính đúng đắn của đáp án, hệ thống áp dụng thuật toán **Fisher-Yates Shuffle** kết hợp tạo hạt giống (Seed-based Deterministic Shuffle):

1. **Sinh danh sách mã đề:** Từ số lượng yêu cầu $K$ (mặc định 4 mã đề: 101, 102, 103, 104 hoặc tùy chọn từ người dùng).
2. **Đảo thứ tự câu hỏi (Question Shuffling):**
   - Với mã đề gốc (Mã đề đầu tiên, VD: 101): Giữ nguyên thứ tự câu hỏi như giảng viên đã sắp xếp.
   - Với các mã đề hoán vị tiếp theo (102, 103,...): Sử dụng hoán vị ngẫu nhiên trên mảng câu hỏi đã chọn.
3. **Đảo thứ tự phương án chọn (Option Shuffling) & Ánh xạ Đáp án đúng:**
   - Mỗi câu hỏi trắc nghiệm gồm 4 phương án $O = [O_A, O_B, O_C, O_D]$.
   - Thuật toán lưu lại định danh đáp án đúng ban đầu: $ID_{correct}$.
   - Thực hiện hoán vị mảng $O$ thành $O'$.
   - Gán lại nhãn hiển thị mới: $O'_0 \rightarrow \text{'A'}$, $O'_1 \rightarrow \text{'B'}$, $O'_2 \rightarrow \text{'C'}$, $O'_3 \rightarrow \text{'D'}$.
   - Xác định vị trí mới của phần tử có ID trùng với $ID_{correct}$ để ghi nhận nhãn đúng mới (ví dụ từ 'A' chuyển thành 'C').
4. **Bảo toàn tính nhất quán (Answer Key Matrix):**
   - Mỗi mã đề sau khi sinh sẽ có một danh sách kết quả dạng: `[{"questionIndex": 1, "correctLabel": "B"}, {"questionIndex": 2, "correctLabel": "D"}, ...]`.
   - Kết quả này được dùng để render bảng đáp án chuẩn ở cuối đề thi và phục vụ máy chấm thi tự động.

```
Mã đề 101 (Gốc)                      Mã đề 102 (Hoán vị)
Câu 1: Câu hỏi X (Đ/A đúng: A)  ───> Câu 7: Câu hỏi X (Đ/A đúng chuyển sang C)
  A. Đáp án 1 (*)                       A. Đáp án 3
  B. Đáp án 2                           B. Đáp án 2
  C. Đáp án 3                           C. Đáp án 1 (*)
  D. Đáp án 4                           D. Đáp án 4
```

---

### 3.2. Động cơ Biên soạn Word Chuẩn Thể thức Đại học (`word_exporter.py`)

Bộ xuất file Microsoft Word đáp ứng nghiêm ngặt tiêu chuẩn văn bản hành chính và quy chế khảo thí đại học tại Việt Nam:

- **Khổ giấy & Căn lề chuẩn khảo thí:** Khổ A4, lề trên 2.0 cm (0.75 in), lề dưới 2.0 cm, lề trái 2.0 cm, lề phải 2.0 cm. Font chữ mặc định: Times New Roman / Calibri, cỡ chữ 11pt, giãn dòng 1.15.
- **Tiêu đề đầu trang 2 cột đối xứng (Header Table):**
  - **Cột trái:** Tên cơ quan chủ quản / Trường đại học (IN HOA, ĐẬM), tên Khoa / Viện phụ trách (IN HOA), đường kẻ ngang phân cách.
  - **Cột phải:** Tên kỳ thi (IN HOA, ĐẬM), Môn học / Học phần, Mã đề thi (ĐẬM), Thời gian làm bài (phút), Ghi chú ("Thí sinh không được sử dụng tài liệu").
- **Phần thân đề thi:**
  - Tiêu đề chính giữa: **ĐỀ THI KẾT THÚC HỌC PHẦN** (14pt, Bold).
  - Phân tách đường kẻ ngang thẩm mỹ.
  - Từng câu hỏi được định dạng rõ ràng: **Câu 1:** [Nội dung câu hỏi] (Bold số thứ tự).
  - Các lựa chọn đáp án A, B, C, D thụt lề đầu dòng 0.75 cm, giãn cách dòng đều đặn, không bị đứt đoạn giữa các trang.
- **Phụ lục Ma trận Đáp án chuẩn (Answer Key Matrix):**
  - Tự động ngắt sang trang mới (`doc.add_page_break()`).
  - Tiêu đề: **BẢNG ĐÁP ÁN CHUẨN - MÃ ĐỀ [MÃ ĐỀ]**.
  - Bảng kẻ lưới 5 cột cân đối, hiển thị cặp `Câu - ĐA` (VD: 1 - A, 2 - C, 3 - B,...) giúp giảng viên chấm thi nhanh chóng.
  - (Tùy chọn) Bổ sung phần giải thích chi tiết cho từng câu hỏi phục vụ công tác hậu kiểm.

---

### 3.3. Động cơ Xuất PDF Khảo thí & Phiếu Trắc nghiệm OMR (`pdf_exporter.py`)

Động cơ PDF sử dụng `fpdf2` tạo tài liệu vector chất lượng in cao:

- **Bố cục in ấn chuyên nghiệp:** Đảm bảo không bị tràn trang hoặc ngắt nửa chừng một câu hỏi giữa hai trang (Anti-orphan question layout).
- **Hỗ trợ nhúng Font Unicode:** Tích hợp font DejaVu Sans hoặc Liberation Serif hỗ trợ đầy đủ bộ ký tự tiếng Việt có dấu và ký hiệu toán học / kinh tế.
- **Phiếu trả lời trắc nghiệm (OMR Bubble Sheet Template):**
  - Tự động tạo trang phiếu tô trắc nghiệm chuẩn gồm: Khung thông tin thí sinh (Họ tên, MSSV, Phòng thi, Chữ ký giám thị), Ô ghi số báo danh dạng lưới tô tròn, Ô ghi mã đề thi dạng lưới tô tròn.
  - Khung 40 - 60 câu trắc nghiệm chia làm 2 hoặc 4 cột với các vòng tròn `(A) (B) (C) (D)` chuẩn kích thước 4mm, tương thích các phần mềm chấm trắc nghiệm bằng điện thoại hoặc máy quét OMR.

---

### 3.4. Động cơ Đóng gói Chuẩn E-Learning IMS QTI 2.1 & Moodle XML (`qti_exporter.py`)

Phục vụ việc tích hợp trực tiếp vào hệ thống quản lý học tập số hóa của nhà trường:

- **Cấu trúc XML Chuẩn Moodle / Canvas:**
  - Thẻ gốc `<quiz>` chứa danh sách các phần tử `<question type="multichoice">`.
  - Phân loại tên câu hỏi: `<name><text>Câu hỏi {idx} - Bloom: {bloom_level}</text></name>`.
  - Nội dung câu hỏi định dạng HTML: `<questiontext format="html"><text><p>{question_text}</p></text></questiontext>`.
  - Phản hồi giải thích học thuật: `<generalfeedback format="html"><text><p>{explanation}</p></text></generalfeedback>`.
  - Các phương án chọn:
    - Đáp án đúng: `<answer fraction="100" format="html"><text><p>{option_text}</p></text></answer>`.
    - Các đáp án sai: `<answer fraction="0" format="html"><text><p>{option_text}</p></text></answer>`.
- **Xuất file:** Đóng gói trả về trực tiếp dưới dạng luồng dữ liệu XML hoặc đóng gói file Zip chứa manifest QTI 2.1 (`imsmanifest.xml`).

---

### 3.5. Quy trình Thẩm định Phê duyệt Câu hỏi (Review & Audit Trail Lifecycle)

Mọi câu hỏi được sinh từ AI đều phải trải qua vòng đời kiểm duyệt nghiêm ngặt:

```
[ai-service sinh] ──> Trạng thái: "pending" (Chờ thẩm định)
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [Giảng viên phê duyệt]             [Giảng viên từ chối]
    status = "approved"                status = "rejected"
            │                                 │
            ▼                                 ▼
  Sẵn sàng đưa vào                   Loại khỏi ngân hàng,
  Ngân hàng & Đóng gói đề thi         giữ lại log để fine-tune AI
```

- **Tính toàn vẹn tham chiếu RAG:** Câu hỏi luôn lưu kèm `source_chunk_id`. Khi xem xét câu hỏi ở Review Workspace, giao diện người dùng có thể đối soát nguyên văn trích đoạn giáo trình và số trang gốc để phát hiện sai lệch trước khi duyệt.
- **Audit Fields:** Lưu trữ thời gian tạo (`created_at`), thời gian cập nhật (`updated_at`), người tạo (`created_by`), và điểm độ tin cậy (`confidence_score`).

---

## 4. ĐẶC TẢ CHI TIẾT TOÀN BỘ API ENDPOINTS

Tất cả các API được mở trên cổng **8005** và được điều phối thông qua `api-gateway` tại đường dẫn `/api/v1/exams/...` và `/api/v1/questions/...`.

---

### 4.1. `GET /health`
Kiểm tra tính sẵn sàng của dịch vụ và kết nối cơ sở dữ liệu.

- **Method:** `GET`
- **URL:** `/health`
- **Response `200 OK`:**
```json
{
  "status": "healthy",
  "service": "exam-service",
  "database": "connected",
  "version": "1.0.0"
}
```

---

### 4.2. `GET /questions` hoặc `GET /bank`
Truy vấn danh sách câu hỏi trong ngân hàng với các bộ lọc nghiệp vụ.

- **Method:** `GET`
- **URL:** `/questions` (hoặc `/bank`)
- **Query Parameters:**
  - `search` (string, optional): Từ khóa tìm kiếm trong nội dung câu hỏi hoặc tên chương.
  - `bloom_level` (string, optional): Lọc theo cấp độ Bloom (`Nhận biết`, `Thông hiểu`, `Vận dụng`, `Phân tích`, hoặc `all`).
  - `status` (string, optional): Lọc theo trạng thái kiểm duyệt (`pending`, `approved`, `rejected`).
  - `document_id` (string, optional): Lọc theo giáo trình gốc.
  - `limit` (integer, default: 50): Số lượng bản ghi tối đa.
  - `offset` (integer, default: 0): Phân trang.
- **Response `200 OK`:**
```json
[
  {
    "id": "q-1",
    "documentId": "tb-001",
    "sourceChunkId": "chunk-1",
    "textbookName": "GiaoTrinh_KinhTeViMo_2025.pdf",
    "chapter": "Chương 3: Cung - Cầu và Giá cả thị trường",
    "bloomLevel": "Nhận biết",
    "question": "Theo quy luật cầu, trong điều kiện các yếu tố khác không đổi, phát biểu nào sau đây là chính xác?",
    "options": [
      { "id": "opt-a", "label": "A", "text": "Khi giá hàng hóa tăng thì lượng cầu giảm xuống" },
      { "id": "opt-b", "label": "B", "text": "Khi giá hàng hóa tăng thì lượng cầu tăng lên" },
      { "id": "opt-c", "label": "C", "text": "Giá cả và lượng cầu luôn biến thiên cùng chiều" },
      { "id": "opt-d", "label": "D", "text": "Lượng cầu không chịu sự tác động của mức giá thị trường" }
    ],
    "correctAnswerId": "opt-a",
    "explanation": "Quy luật cầu chỉ rõ mối quan hệ tỷ lệ nghịch giữa giá và lượng cầu khi các yếu tố khác không đổi.",
    "confidenceScore": 99,
    "status": "approved",
    "createdAt": "02/11/2026"
  }
]
```

---

### 4.3. `GET /questions/{question_id}`
Lấy chi tiết một câu hỏi theo ID.

- **Method:** `GET`
- **URL:** `/questions/{question_id}`
- **Path Parameter:** `question_id` (string, bắt buộc)
- **Response `200 OK`:** Trả về đối tượng câu hỏi chi tiết.
- **Response `404 Not Found`:**
```json
{
  "detail": "Không tìm thấy câu hỏi."
}
```

---

### 4.4. `PUT /questions/{question_id}`
Hiệu chỉnh nội dung câu hỏi, danh sách lựa chọn, đáp án đúng hoặc phần giải thích.

- **Method:** `PUT`
- **URL:** `/questions/{question_id}`
- **Request Body (`application/json`):**
```json
{
  "question": "Theo quy luật cầu của kinh tế học vi mô, phát biểu nào sau đây là đúng nhất?",
  "options": [
    { "id": "opt-a", "label": "A", "text": "Khi giá hàng hóa tăng thì lượng cầu giảm xuống" },
    { "id": "opt-b", "label": "B", "text": "Khi giá hàng hóa tăng thì lượng cầu tăng vọt" },
    { "id": "opt-c", "label": "C", "text": "Giá cả và lượng cầu luôn biến thiên cùng chiều" },
    { "id": "opt-d", "label": "D", "text": "Lượng cầu không bao giờ chịu tác động của giá" }
  ],
  "correctAnswerId": "opt-a",
  "explanation": "Cập nhật giải thích chuẩn học thuật theo chương 3 giáo trình."
}
```
- **Response `200 OK`:** Trả về câu hỏi sau khi cập nhật thành công.

---

### 4.5. `PATCH /questions/{question_id}/status`
Cập nhật trạng thái thẩm định câu hỏi (Duyệt hoặc từ chối).

- **Method:** `PATCH`
- **URL:** `/questions/{question_id}/status`
- **Request Body:**
```json
{
  "status": "approved"
}
```
*(Các giá trị hợp lệ của `status`: `"approved"`, `"rejected"`, `"pending"`)*
- **Response `200 OK`:**
```json
{
  "id": "q-1",
  "status": "approved",
  "updatedAt": "2026-11-02T10:15:00Z"
}
```

---

### 4.6. `POST /questions/batch-approve`
Phê duyệt hàng loạt câu hỏi trong một thao tác (tối ưu trải nghiệm màn hình Review Workspace).

- **Method:** `POST`
- **URL:** `/questions/batch-approve`
- **Request Body:**
```json
{
  "questionIds": ["q-1", "q-2", "q-3", "q-4", "q-5"]
}
```
- **Response `200 OK`:**
```json
{
  "status": "success",
  "approvedCount": 5,
  "message": "Đã phê duyệt thành công 5 câu hỏi vào ngân hàng chính thức."
}
```

---

### 4.7. `POST /exams/generate-variants`
Sinh danh sách các biến thể mã đề hoán vị và ma trận đáp án tương ứng trước khi kết xuất file.

- **Method:** `POST`
- **URL:** `/exams/generate-variants`
- **Request Body:**
```json
{
  "questionIds": ["q-1", "q-2", "q-3"],
  "examCodeCount": 4,
  "baseExamCode": 101,
  "shuffleQuestions": true,
  "shuffleOptions": true
}
```
- **Response `200 OK`:**
```json
{
  "totalVariants": 4,
  "variants": [
    {
      "examCode": "101",
      "questionCount": 3,
      "answerKey": [
        { "questionNumber": 1, "correctOption": "A" },
        { "questionNumber": 2, "correctOption": "C" },
        { "questionNumber": 3, "correctOption": "B" }
      ]
    },
    {
      "examCode": "102",
      "questionCount": 3,
      "answerKey": [
        { "questionNumber": 1, "correctOption": "C" },
        { "questionNumber": 2, "correctOption": "A" },
        { "questionNumber": 3, "correctOption": "D" }
      ]
    }
  ]
}
```

---

### 4.8. `POST /export/word`
Đóng gói và kết xuất đề thi ra tệp tin nhị phân Microsoft Word (`.docx`).

- **Method:** `POST`
- **URL:** `/export/word`
- **Request Body:**
```json
{
  "examTitle": "ĐỀ THI KẾT THÚC HỌC PHẦN - HỌC KỲ I",
  "subjectName": "Kinh tế vi mô",
  "facultyName": "Khoa Kinh tế & Quản trị",
  "universityName": "ĐẠI HỌC QUỐC GIA",
  "examCode": "101",
  "durationMinutes": 60,
  "selectedQuestionIds": ["q-1", "q-2", "q-3"],
  "includeAnswerKey": true,
  "includeExplanation": false
}
```
- **Response `200 OK`:**
  - Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - Content-Disposition: `attachment; filename=DeThi_101.docx`
  - Body: Luồng byte nhị phân của file Word.

---

### 4.9. `POST /export/pdf`
Đóng gói đề thi ra tệp PDF chuẩn in ấn, có kèm bảng đáp án và phiếu trắc nghiệm.

- **Method:** `POST`
- **URL:** `/export/pdf`
- **Request Body:** Tương tự như `POST /export/word`, kèm theo cờ:
  - `"includeOmrSheet": true`
- **Response `200 OK`:**
  - Content-Type: `application/pdf`
  - Content-Disposition: `attachment; filename=DeThi_101.pdf`
  - Body: Luồng byte nhị phân của file PDF.

---

### 4.10. `POST /export/qti`
Đóng gói bộ câu hỏi theo định dạng XML chuẩn IMS QTI 2.1 hoặc Moodle XML để import vào LMS.

- **Method:** `POST`
- **URL:** `/export/qti`
- **Request Body:**
```json
{
  "title": "Kiểm tra Giữa kỳ - Kinh tế vi mô (Canvas LMS)",
  "questions": [
    {
      "id": "q-1",
      "question": "Theo quy luật cầu, điều gì xảy ra khi giá tăng?",
      "bloom_level": "Nhận biết",
      "options": [
        { "id": "opt-a", "text": "Lượng cầu giảm xuống" },
        { "id": "opt-b", "text": "Lượng cầu tăng lên" }
      ],
      "correctAnswerId": "opt-a",
      "explanation": "Quy luật cầu: giá và lượng cầu tỷ lệ nghịch."
    }
  ]
}
```
- **Response `200 OK`:**
  - Content-Type: `application/xml`
  - Content-Disposition: `attachment; filename=quiz_lms_qti.xml`
  - Body: Chuỗi XML có cấu trúc chuẩn LMS.

---

### 4.11. `GET /exams`
Lấy danh sách các gói đề thi đã đóng gói và xuất bản.

- **Method:** `GET`
- **URL:** `/exams`
- **Response `200 OK`:**
```json
[
  {
    "id": "ex-001",
    "userId": "lec-001",
    "title": "ĐỀ THI KẾT THÚC HỌC PHẦN - HỌC KỲ II",
    "subject": "Kinh tế vi mô",
    "faculty": "Khoa Kinh tế & Quản trị",
    "university": "ĐẠI HỌC QUỐC GIA",
    "durationMinutes": 60,
    "examCodes": ["101", "102", "103", "104"],
    "questionCount": 40,
    "format": "docx",
    "createdAt": "2026-11-02T08:30:00Z"
  }
]
```

---

### 4.12. `GET /exams/{exam_id}`
Xem thông tin chi tiết của một gói đề thi đã xuất bản, danh sách câu hỏi cấu thành và các mã đề.

- **Method:** `GET`
- **URL:** `/exams/{exam_id}`
- **Response `200 OK`:** Trả về toàn bộ metadata và mảng câu hỏi tương ứng.

---

### 4.13. `GET /exams/analytics`
Cung cấp số liệu thống kê tổng thể cho Dashboard phân tích khảo thí:

- **Method:** `GET`
- **URL:** `/exams/analytics`
- **Response `200 OK`:**
```json
{
  "totalQuestionsInBank": 351,
  "approvedQuestionsCount": 310,
  "pendingReviewCount": 32,
  "rejectedQuestionsCount": 9,
  "totalExamsPackaged": 28,
  "bloomDistribution": {
    "nhanBiet": 105,
    "thongHieu": 125,
    "vanDung": 62,
    "phanTich": 18
  },
  "exportFormatBreakdown": {
    "docx": 18,
    "pdf": 7,
    "qti": 3
  }
}
```

---

## 5. MÔ HÌNH DỮ LIỆU ORM & CẤU TRÚC BẢNG POSTGRESQL (SCHEMA `exams`)

Dữ liệu của dịch vụ được cô lập trong schema `exams` của PostgreSQL:

```mermaid
erDiagram
    QUESTIONS {
        string id PK "q-1"
        string document_id FK "tb-001"
        string source_chunk_id "chunk-1"
        string textbook_name "GiaoTrinh_KinhTeViMo.pdf"
        string chapter "Chương 3: Cung - Cầu"
        string bloom_level "Nhận biết"
        text question_text "Theo quy luật cầu..."
        jsonb options "[{id, label, text}]"
        string correct_answer_id "opt-a"
        text explanation "Quy luật cầu..."
        int confidence_score "99"
        string status "approved"
        string created_by "lec-001"
        timestamp created_at
        timestamp updated_at
    }

    EXAMS {
        string id PK "ex-001"
        string user_id FK "lec-001"
        string title "ĐỀ THI KẾT THÚC HỌC PHẦN"
        string subject "Kinh tế vi mô"
        string faculty "Khoa Kinh tế & Quản trị"
        string university "ĐẠI HỌC QUỐC GIA"
        int duration_minutes "60"
        jsonb exam_codes "['101', '102', '103', '104']"
        jsonb selected_question_ids "['q-1', 'q-2']"
        string format "docx"
        timestamp created_at
    }

    EXAMS ||--o{ QUESTIONS : "đóng gói các câu hỏi"
```

### 5.1. Bảng `exams.questions` (Ngân hàng câu hỏi trắc nghiệm)

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |
|---|---|---|---|---|
| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Định danh duy nhất của câu hỏi (VD: `q-1`). |
| `document_id` | `VARCHAR(50)` | `INDEX` | `NULL` | ID giáo trình nguồn đã bóc tách. |
| `source_chunk_id`| `VARCHAR(100)`| **NOT NULL** | Không | ID đoạn trích ngữ cảnh RAG làm minh chứng gốc. |
| `textbook_name` | `VARCHAR(255)` | **NOT NULL** | Không | Tên tệp giáo trình nguồn. |
| `chapter` | `VARCHAR(255)` | **NOT NULL** | Không | Tên chương mục chứa kiến thức của câu hỏi. |
| `bloom_level` | `VARCHAR(30)` | **NOT NULL**, `INDEX`| Không | Cấp độ Bloom: Nhận biết, Thông hiểu, Vận dụng, Phân tích. |
| `question_text` | `TEXT` | **NOT NULL** | Không | Nội dung câu hỏi trắc nghiệm. |
| `options` | `JSONB` | **NOT NULL** | Không | Mảng 4 lựa chọn `[{"id":"opt-a", "label":"A", "text":"..."}]`. |
| `correct_answer_id`| `VARCHAR(20)`| **NOT NULL** | Không | ID phương án đúng (VD: `opt-a`). |
| `explanation` | `TEXT` | `NULL` | Không | Lời giải chi tiết và căn cứ lý thuyết. |
| `confidence_score`| `INT` | Mặc định: `95` | `95` | Điểm tin cậy do mô hình AI tự đánh giá (0 - 100). |
| `status` | `VARCHAR(20)` | **NOT NULL**, `INDEX`| `'pending'` | Trạng thái: `'pending'`, `'approved'`, `'rejected'`. |
| `created_by` | `VARCHAR(50)` | Mặc định: `'lec-001'`| `'lec-001'` | Giảng viên sở hữu câu hỏi. |
| `created_at` | `TIMESTAMPTZ` | **NOT NULL** | `NOW()` | Thời điểm tạo câu hỏi. |
| `updated_at` | `TIMESTAMPTZ` | `NULL` | `NOW()` | Thời điểm cập nhật nội dung gần nhất. |

### 5.2. Bảng `exams.exams` (Lịch sử gói đề thi đã xuất bản)

| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Mặc định | Mô tả & Ý nghĩa Nghiệp vụ |
|---|---|---|---|---|
| `id` | `VARCHAR(50)` | **PRIMARY KEY** | Tự sinh | Định danh gói đề thi (VD: `ex-20261102-001`). |
| `user_id` | `VARCHAR(50)` | **NOT NULL**, `INDEX`| `'lec-001'` | Giảng viên thực hiện đóng gói đề thi. |
| `title` | `VARCHAR(255)` | **NOT NULL** | Không | Tiêu đề kỳ thi hiển thị trên đầu đề thi. |
| `subject` | `VARCHAR(150)` | **NOT NULL** | Không | Tên môn thi / học phần. |
| `faculty` | `VARCHAR(150)` | **NOT NULL** | `'Khoa KT&QT'`| Tên Khoa / Viện tổ chức thi. |
| `university` | `VARCHAR(150)` | **NOT NULL** | `'ĐHQG'` | Tên Trường Đại học. |
| `duration_minutes`| `INT` | **NOT NULL** | `60` | Thời gian làm bài tính bằng phút. |
| `exam_codes` | `JSONB` | **NOT NULL** | Không | Danh sách các mã đề đảo: `["101", "102", "103", "104"]`. |
| `selected_question_ids` | `JSONB` | **NOT NULL** | Không | Mảng các ID câu hỏi được đưa vào đề thi. |
| `format` | `VARCHAR(20)` | **NOT NULL** | `'docx'` | Định dạng xuất: `'docx'`, `'pdf'`, `'qti'`. |
| `created_at` | `TIMESTAMPTZ` | **NOT NULL** | `NOW()` | Thời điểm xuất bản đề thi thành công. |

---

## 6. CẤU HÌNH MÔI TRƯỜNG, DOCKERFILE & VẬN HÀNH

### 6.1. Biến Môi trường (`.env`):
```ini
PORT=8005
DATABASE_URL=postgresql://quizgen:quizgen_secure_pass_2026@postgres:5432/quizgen_db
LOG_LEVEL=INFO
DEFAULT_UNIVERSITY=ĐẠI HỌC QUỐC GIA
DEFAULT_FACULTY=Khoa Kinh tế & Quản trị
```

### 6.2. Cấu hình Dockerfile (`services/exam-service/Dockerfile`):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

ENV PORT=8005
EXPOSE 8005

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8005/health || exit 1

CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT}"]
```

### 6.3. Khởi chạy bằng Docker Compose:
```bash
# Khởi chạy độc lập exam-service cùng PostgreSQL
docker compose up -d postgres exam-service

# Xem log thời gian thực
docker compose logs -f exam-service
```

---

## 7. CƠ CHẾ BẢO TOÀN TÍNH TOÀN VẸN KHẢO THÍ & BẢO MẬT ĐỀ THI

1. **Chống lộ đề & Kiểm soát Truy cập:**
   - Các API xuất file và danh sách câu hỏi chỉ phục vụ người dùng có vai trò Giảng viên (`Lecturer`) hoặc Quản trị viên Khảo thí (`Exam Admin`).
   - File kết xuất nhị phân (Word / PDF) được sinh trực tiếp trong bộ nhớ đệm (RAM stream) và truyền trực tiếp về Client qua HTTP Stream, tuyệt đối **không ghi tạm lên ổ đĩa máy chủ** nhằm ngăn ngừa nguy cơ rò rỉ đề thi trên filesystem.
2. **Bảo toàn Cân bằng Độ khó giữa các Mã đề:**
   - Việc xáo trộn chỉ làm thay đổi thứ tự câu và thứ tự lựa chọn, không làm thay đổi nội dung câu hỏi hay mức độ phân hóa Bloom.
   - Mỗi mã đề đều có cùng một tỷ lệ các câu Nhận biết, Thông hiểu, Vận dụng và Phân tích tương đương nhau.
3. **Độ tin cậy Ma trận Đáp án:**
   - Thuật toán ánh xạ đáp án thực hiện kiểm chứng hai chiều (Two-way assertion): Đảm bảo mỗi câu hỏi ở mọi mã đề hoán vị đều có duy nhất 1 đáp án chính xác và nhãn (A, B, C, D) trùng khớp tuyệt đối với phương án đúng gốc.

---

## 8. MA TRẬN KIỂM THỬ & KỊCH BẢN TEST MẪU (CURL EXAMPLES)

### Kịch bản 1: Kiểm tra kết nối dịch vụ
```bash
curl -X GET http://localhost:8005/health
```

### Kịch bản 2: Lọc danh sách câu hỏi cần duyệt theo cấp độ Bloom "Vận dụng"
```bash
curl -X GET "http://localhost:8005/questions?status=pending&bloom_level=V%E1%BA%ADn%20d%E1%BB%A5ng"
```

### Kịch bản 3: Phê duyệt hàng loạt 3 câu hỏi vào ngân hàng chính thức
```bash
curl -X POST http://localhost:8005/questions/batch-approve \
  -H "Content-Type: application/json" \
  -d '{
    "questionIds": ["q-1", "q-2", "q-3"]
  }'
```

### Kịch bản 4: Xuất đề thi Microsoft Word (.docx) mã đề 101 kèm bảng đáp án
```bash
curl -X POST http://localhost:8005/export/word \
  -H "Content-Type: application/json" \
  -d '{
    "examTitle": "ĐỀ THI KẾT THÚC HỌC PHẦN HỌC KỲ I",
    "subjectName": "Kinh tế vi mô",
    "examCode": "101",
    "selectedQuestionIds": ["q-1", "q-2", "q-3"]
  }' \
  --output DeThi_KinhTeViMo_101.docx
```

### Kịch bản 5: Xuất gói câu hỏi chuẩn Canvas LMS / Moodle QTI XML
```bash
curl -X POST http://localhost:8005/export/qti \
  -H "Content-Type: application/json" \
  -d '{
    "title": "TracNghiem_KinhTeViMo",
    "questions": [
      {
        "id": "q-1",
        "question": "Khi giá tăng thì lượng cầu giảm theo quy luật nào?",
        "bloom_level": "Nhận biết",
        "options": [
          {"id": "opt-a", "text": "Quy luật cầu"},
          {"id": "opt-b", "text": "Quy luật cung"}
        ],
        "correctAnswerId": "opt-a",
        "explanation": "Quy luật cầu xác định mối quan hệ nghịch biến."
      }
    ]
  }' \
  --output quiz_canvas.xml
```

---
*Tài liệu này là đặc tả quy chuẩn chính thức của QuizGen AI dành cho việc phát triển, kiểm thử, tích hợp CI/CD và vận hành phân hệ `exam-service`.*
