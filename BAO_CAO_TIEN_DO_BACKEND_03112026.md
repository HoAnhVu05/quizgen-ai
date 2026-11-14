# BÁO CÁO TIẾN ĐỘ DỰ ÁN QUIZGEN AI
**Họ và tên:** Nguyễn Văn Tân  
**MSSV:** 060205012615  
**Nhóm:** Nhóm 1  
**Ngày thực hiện:** 03/11/2026  
**Nội dung công việc:** Tối ưu hóa Document Service & RAG Service: Loại bỏ Hardcode, Tích hợp Xác thực JWT Động, Chuẩn hóa Mã trạng thái HTTP Status và Xử lý Ngoại lệ Chunks Rỗng  

---

### I. CÔNG VIỆC ĐÃ HOÀN THÀNH
Bám sát kiến trúc hệ sinh thái Backend và các chuẩn mực thiết kế Microservices, toàn bộ các hạng mục tối ưu hóa, bảo mật định danh và chuẩn hóa mã trạng thái HTTP cho **Document Service (Port 8002)** và **RAG Service (Port 8003)** đã được hiện thực hóa và kiểm thử thành công:

#### 1. Xây dựng Module Xác thực JWT Động & Loại bỏ Triệt để Hardcode `user_id = 'lec-001'`
Trước đây, định danh người dùng được gán cố định giá trị `'lec-001'` trong quá trình tải tài liệu và lập chỉ mục. Đã tái cấu trúc toàn diện sang cơ chế xác thực danh tính dựa trên JSON Web Token (JWT):
* **Module xác thực bảo mật độc lập (`src/auth.py`)**:
  - Xây dựng riêng cho cả `document-service` và `rag-service` không phụ thuộc vào thư viện ngoài, tối ưu hiệu năng và kích thước container.
  - *Thuật toán xác thực chữ ký*: Bóc tách JWT thành 3 phần (header, payload, signature), tính toán và đối chiếu chữ ký HMAC-SHA256 thông qua khóa bảo mật dùng chung `SECRET_KEY` bằng `hmac.compare_digest` để chống tấn công Timing Attack.
  - *Kiểm soát thời hạn hiệu lực*: Tự động đọc claim `exp` trong payload, đối chiếu với thời gian máy chủ hiện tại (`int(time.time())`) để ngăn chặn việc tái sử dụng token đã hết hạn.
  - *Dependency Injection (`get_current_user_id`)*:
    + Ưu tiên nhận dạng từ tiêu đề `Authorization: Bearer <token>` hoặc tiêu đề `X-User-Id` do API Gateway tin cậy chuyển tiếp.
    + Trích xuất chính xác mã định danh giảng viên từ các trường payload (`id`, `user_id` hoặc `sub`).
    + Tự động phản hồi mã chuẩn **`HTTP 401 Unauthorized`** kèm header `WWW-Authenticate: Bearer` khi thiếu thông tin xác thực, token bị giả mạo hoặc đã hết hạn.
* **Tích hợp sâu vào Document Service (`services/document-service/src/main.py`)**:
  - `POST /upload`: Yêu cầu xác thực `user_id: str = Depends(get_current_user_id)`. Khi lưu vào CSDL PostgreSQL, bản ghi `DocumentDB` được gắn đúng với `user_id` của giảng viên thực hiện tải sách lên.
  - Tác vụ nền `forward_chunks_to_rag`: Tự động truyền tiêu đề `X-User-Id` khi chuyển tiếp danh sách chunks sang RAG Service, đảm bảo tính liên tục của danh tính trong môi trường phân tán.
  - `GET /documents`: Hỗ trợ tham số truy vấn `user_id` và tự động lọc danh sách tài liệu theo giảng viên đang đăng nhập thông qua `get_optional_user_id`.
  - `DELETE /documents/{id}`: Bổ sung cơ chế phân quyền (Authorization Check). Nếu người dùng đang đăng nhập không phải là chủ sở hữu của tài liệu (và không phải quản trị viên `admin`), hệ thống sẽ từ chối với mã chuẩn **`HTTP 403 Forbidden`**.
* **Tích hợp sâu vào RAG Service (`services/rag-service/src/main.py`)**:
  - Cập nhật mô hình dữ liệu CSDL (`models.py`): Bổ sung cột `user_id` vào bảng `VectorIndexDB` và `RetrievalLogDB`.
  - `POST /index-chunks`: Lưu vết chính xác `user_id` của giảng viên sở hữu tập vector vào bảng theo dõi `rag.vector_indexes`.
  - `POST /query-context`: Tích hợp `user_id` thật vào hệ thống Rate Limiter (`cache.check_rate_limit(user_id=user_id)`), ngăn chặn việc lạm dụng tài nguyên truy vấn vector; đồng thời ghi nhận nhật ký vào `rag.retrieval_logs` phục vụ giám sát và kiểm toán hệ thống.

#### 2. Chuẩn hóa Mã Trạng thái HTTP & Loại bỏ Dữ liệu Mock khi Không Tìm thấy Chunk
Trước đây, khi truy vấn một chunk không tồn tại, service tự động trả về một đối tượng JSON giả lập (Chương 2, trang 42, "Quy luật cầu..."), dẫn đến việc client không phát hiện được lỗi dữ liệu thật:
* **Loại bỏ triệt để Mock Data tại `GET /chunks/{chunk_id}`**:
  - Đã xóa bỏ hoàn toàn đoạn code trả về kết quả mẫu cứng.
  - Nếu `vector_store.get_chunk_by_id(chunk_id)` trả về `None`, hệ thống ném ra ngay ngoại lệ chuẩn:
    `HTTPException(status_code=404, detail=f"Không tìm thấy đoạn trích (chunk) với mã định danh '{chunk_id}' trong kho vector.")`
* **Chuẩn hóa Endpoint `GET /documents/{document_id}/chunks`**:
  - Nếu tài liệu không tồn tại hoặc chưa có bất kỳ đoạn trích nào được vector hóa trong ChromaDB, phản hồi chuẩn xác mã **`HTTP 404 Not Found`** thay vì trả về mảng rỗng 200 OK.

#### 3. Xử lý Toàn diện Các Trường Hợp Ngoại Lệ Chunks Rỗng khi Phân Đoạn Tài Liệu
* **Nâng cấp `TextChunker` (`services/document-service/src/chunker.py`)**:
  - Định nghĩa lớp ngoại lệ chuyên biệt `EmptyChunksException(Exception)`.
  - Bổ sung bước kiểm tra danh sách trang rỗng (`pages = []`) hoặc toàn bộ các trang chỉ chứa khoảng trắng/ký tự điều khiển (`text.strip() == ""`).
  - Xây dựng **Cơ chế gom cụm phục hồi (Fallback Aggregation)**: Khi tài liệu gồm nhiều trang ngắn (dưới ngưỡng tối thiểu `min_chunk_chars = 100`), thuật toán tự động tổng hợp văn bản của các trang liền kề để tạo thành chunk hợp lệ thay vì loại bỏ toàn bộ.
  - Nếu tài liệu hoàn toàn không thể trích xuất văn bản (file PDF scan thuần ảnh chưa qua OCR hoặc văn bản quá ngắn dưới 20 ký tự), ném ra `EmptyChunksException` ngay từ tầng phân đoạn.
* **Xử lý tại tầng tiếp nhận `POST /upload` của Document Service**:
  - Bắt ngoại lệ `EmptyChunksException`, lập tức dọn dẹp file nhị phân vừa lưu tạm trên ổ đĩa (`storage_file.unlink()`), cập nhật trạng thái lỗi vào Redis progress cache và phản hồi mã chuẩn **`HTTP 422 Unprocessable Entity`** (thay vì 500 Internal Server Error).
  - Tác vụ nền `forward_chunks_to_rag`: Kiểm tra an toàn trước khi gọi mạng; nếu mảng `chunks` rỗng, cập nhật bản ghi CSDL sang trạng thái `error` và không gửi request rỗng sang RAG Service.
* **Xử lý tại tầng tiếp nhận `POST /index-chunks` của RAG Service**:
  - Xác thực payload: Nếu `req.chunks` là mảng rỗng hoặc toàn bộ các chunk trong danh sách đều không có nội dung văn bản (`text.strip() == ""`), từ chối với mã chuẩn **`HTTP 422 Unprocessable Entity`**.

#### 4. Đồng bộ Mã Nguồn Git & Kiểm thử Toàn diện
* **Hợp nhất upstream**: Tích hợp thành công Pull Request #1 mới nhất từ nhánh `origin/develop` của thành viên HoAnhVu05.
* **Kiểm thử tự động (Unit Test Suite)**:
  - Kiểm thử giải mã JWT thành công, trích xuất chính xác `user_id`.
  - Kiểm thử từ chối token hết hạn với mã lỗi 401 Unauthorized.
  - Kiểm thử từ chối upload không có token với mã lỗi 401 Unauthorized.
  - Kiểm thử bóc tách tài liệu rỗng ném ra `EmptyChunksException`.
  - Kiểm thử truy vấn chunk không tồn tại trả về đúng mã lỗi 404 Not Found.
  - Kiểm thử nạp chunks rỗng vào RAG trả về đúng mã lỗi 422 Unprocessable Entity.
* **Triển khai Git**: Đẩy toàn bộ mã nguồn sạch sẽ lên cả 2 nhánh `develop` và `feature/upload-from-nguyentann-20261030` trên GitHub.

---

### II. KHÓ KHĂN GẶP PHẢI & GIẢI PHÁP ĐÃ XỬ LÝ

| # | Khó khăn / Thách thức kỹ thuật | Phân tích nguyên nhân | Giải pháp kỹ thuật đã xử lý |
| :-: | :--- | :--- | :--- |
| **1** | **Xung đột môi trường khi thiếu thư viện `python-jose` / `pyjwt`** | Môi trường Python nội bộ của container chưa cài đặt các gói JWT bên thứ ba, khiến việc tích hợp xác thực dễ bị lỗi `ModuleNotFoundError`. | Tự viết module `auth.py` chuẩn hóa giải thuật giải mã Base64Url và xác thực chữ ký HMAC-SHA256 bằng thư viện chuẩn của Python (`hmac`, `hashlib`, `base64`, `json`), đảm bảo zero-dependency và hoạt động độc lập 100%. |
| **2** | **Xử lý tài liệu học thuật có trang quá ngắn gây rỗng chunks** | Nhiều slide bài giảng hoặc bìa giáo trình chỉ chứa vài từ ngữ (dưới ngưỡng 100 ký tự), khiến bộ lọc sliding window loại bỏ toàn bộ và làm mảng chunks bị rỗng. | Thiết kế cơ chế gom cụm phục hồi (Fallback Aggregation) trong `TextChunker`: tự động ghép nối các đoạn văn bản ngắn liền kề để tạo thành chunk hợp lệ đạt ngưỡng tối thiểu 20 ký tự, bảo toàn trọn vẹn ngữ nghĩa tài liệu. |
| **3** | **Lỗi dữ liệu ảo (Mock Data) che giấu lỗi 404 thực tế trong RAG Service** | Đoạn code fallback cũ tự động trả về chunk giả lập khi ID không tồn tại, khiến client và các bài kiểm thử không nhận biết được việc truy xuất bị sai mã định danh. | Loại bỏ hoàn toàn khối dữ liệu mock, thay thế bằng việc ném ngoại lệ `HTTPException(status_code=404, detail="Không tìm thấy đoạn trích...")` tuân thủ chuẩn RESTful API. |
| **4** | **Bị từ chối đẩy mã nguồn Git do xung đột phân nhánh (Git Push Rejected)** | Thành viên khác trong nhóm vừa hợp nhất Pull Request #1 lên nhánh `develop` trên GitHub trong lúc đang tối ưu code cục bộ. | Thực hiện `git fetch origin develop`, sử dụng thuật toán hợp nhất `git merge origin/develop --no-edit` sạch sẽ, kiểm tra biên dịch và đẩy thành công cả 2 nhánh `develop` và `feature`. |

---

### III. MINH CHỨNG KỸ THUẬT (EVIDENCE)

#### 1. Minh chứng Git Repository & Commits
* **Repository:** https://github.com/HoAnhVu05/quizgen-ai
* **Nhánh làm việc:** `develop` & `feature/upload-from-nguyentann-20261030`
* **Lịch sử các Commit ngày 03/11/2026:**
  - `512d9d4`: *Merge branch 'origin/develop' into develop*
  - `0e79322`: *feat(backend): optimize Document and RAG services with dynamic JWT user_id, strict 404 for missing chunks, and robust empty chunk exception handling*
  - `d9f2ecd`: *Merge pull request #1 from HoAnhVu05/feature/fe-auth-login-register*

#### 2. Minh chứng Logic Kỹ thuật Cốt lõi

**a) Module Xác thực JWT và Giải mã HMAC-SHA256 (`src/auth.py`):**
```python
def decode_jwt_token(token: str) -> Dict[str, Any]:
    parts = token.strip().split(".")
    if len(parts) != 3:
        raise ValueError("Cấu trúc JWT không hợp lệ.")

    header_b64, payload_b64, signature_b64 = parts
    msg = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).digest()

    sig_padding = "=" * (-len(signature_b64) % 4)
    actual_sig = base64.urlsafe_b64decode(signature_b64 + sig_padding)
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise ValueError("Chữ ký JWT không hợp lệ hoặc đã bị can thiệp.")

    payload_padding = "=" * (-len(payload_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(payload_b64 + payload_padding).decode("utf-8"))

    exp = payload.get("exp")
    if exp is not None and int(time.time()) > exp:
        raise ValueError(f"Token đã hết hạn từ thời điểm {exp}.")
    return payload
```

**b) Cơ chế Gom cụm Phục hồi & Xử lý Chunks Rỗng (`services/document-service/src/chunker.py`):**
```python
# Xử lý trường hợp ngoại lệ: Chunks rỗng do các trang đều có văn bản ngắn hơn min_chunk_chars
if not chunks:
    if non_empty_pages_count == 0 or not total_raw_text:
        raise EmptyChunksException(
            "Tài liệu không có nội dung văn bản nào để tạo đoạn trích (các trang đều rỗng hoặc là ảnh quét chưa qua OCR)."
        )

    # Cơ chế gom cụm phục hồi (Fallback aggregation)
    combined_text = "\n\n".join(total_raw_text).strip()
    if len(combined_text) >= 20:
        chunks.append({
            "chunk_id": f"{document_id}_c0001",
            "document_id": document_id,
            "page_number": pages[0].get("page_number", 1),
            "chapter": current_chapter,
            "text": combined_text,
            "char_count": len(combined_text)
        })
    else:
        raise EmptyChunksException(
            f"Tổng lượng ký tự trong tài liệu quá ít ({len(combined_text)} ký tự), không đủ điều kiện tối thiểu để tạo đoạn trích RAG."
        )
```

**c) Loại bỏ Mock Data và Trả về HTTP 404 Chuẩn (`services/rag-service/src/main.py`):**
```python
@app.get("/chunks/{chunk_id}")
def get_chunk(chunk_id: str):
    """Lấy chi tiết văn bản chunk theo ID làm minh chứng cho Review Workspace. Tuyệt đối không trả mock data."""
    chunk = vector_store.get_chunk_by_id(chunk_id)
    if not chunk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đoạn trích (chunk) với mã định danh '{chunk_id}' trong kho vector."
        )
    return chunk
```

#### 3. Minh chứng API Request & Response Thực tế

**Trường hợp 1: Tải lên tài liệu mà không cung cấp JWT Token (`POST /upload` → HTTP 401 Unauthorized)**
```bash
curl -i -X POST "http://127.0.0.1:8002/upload" \
  -F "file=@GiaoTrinh_KinhTeViMo.pdf"
```
```http
HTTP/1.1 401 Unauthorized
content-type: application/json
www-authenticate: Bearer

{
  "detail": "Yêu cầu xác thực JWT. Vui lòng cung cấp tiêu đề 'Authorization: Bearer <token>' hợp lệ."
}
```

**Trường hợp 2: Tải lên với JWT Token hợp lệ (`POST /upload` → HTTP 202 Accepted kèm `userId` thật)**
```bash
curl -X POST "http://127.0.0.1:8002/upload" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@GiaoTrinh_KinhTeViMo.pdf"
```
```json
{
  "message": "Đã tải lên và bóc tách thành công. Đang tiến hành tạo Vector Embedding trong nền.",
  "document": {
    "id": "tb-003",
    "userId": "usr-lecturer-002",
    "name": "GiaoTrinh_KinhTeViMo.pdf",
    "size": "14.2 MB",
    "totalPages": 184,
    "chaptersCount": 5,
    "status": "embedding",
    "progress": 50,
    "uploadedAt": "Vừa xong"
  }
}
```

**Trường hợp 3: Truy vấn Chunk không tồn tại trong RAG Service (`GET /chunks/{id}` → HTTP 404 Not Found)**
```bash
curl -i -X GET "http://127.0.0.1:8003/chunks/chunk_invalid_9999"
```
```http
HTTP/1.1 404 Not Found
content-type: application/json

{
  "detail": "Không tìm thấy đoạn trích (chunk) với mã định danh 'chunk_invalid_9999' trong kho vector."
}
```

**Trường hợp 4: Nạp danh sách Chunks rỗng vào RAG Service (`POST /index-chunks` → HTTP 422 Unprocessable Entity)**
```bash
curl -i -X POST "http://127.0.0.1:8003/index-chunks" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "tb-003",
    "chunks": []
  }'
```
```http
HTTP/1.1 422 Unprocessable Entity
content-type: application/json

{
  "detail": "Danh sách đoạn trích (chunks) gửi lên rỗng. Không có dữ liệu để lập chỉ mục vector."
}
```
