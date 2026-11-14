# TEAM WORKING CONVENTION - QUIZGEN AI

Tai lieu nay la quy uoc chung cho team 6 thanh vien:
- 2 Frontend
- 3 Backend
- 1 Database

Muc tieu: giam toi da xung dot code, sai API, sai key, sai du lieu giua cac service.

## 1. Nguyen tac chung

1. Moi thay doi code phai qua Pull Request, khong push truc tiep vao `main`.
2. Moi API thay doi request/response bat buoc cap nhat tai lieu contract trong ngay.
3. Frontend chi goi API qua API Gateway (`http://localhost:8000/api/v1/...`), khong goi truc tiep service.
4. Khong hard-code secret, key, password trong source code.
5. Moi task phai co owner chinh, nguoi khac chi review hoac pair.

## 2. Phan cong va pham vi code

### 2.1 Frontend (2 nguoi)
- Thu muc chinh: `src/`
- Duoc sua: UI, state, call API, model TypeScript.
- Khong sua truc tiep logic trong `services/*`.

### 2.2 Backend (3 nguoi)
- Thu muc chinh: `api-gateway/`, `services/*`
- Moi nguoi owner 1-2 service, de tranh trung file.
- Neu can sua service khac owner: tao issue + ping owner truoc.

### 2.3 Database (1 nguoi)
- Owner schema, migration, index, convention PK/FK.
- Review bat buoc cho moi PR co anh huong du lieu.

## 3. Quy uoc Git de tranh xung dot

## 3.1 Nhanh va branch

1. `main`: chi nhan code da on dinh, da test.
2. `develop`: nhanh tich hop chinh.
3. Nhanh lam viec:
   - `feature/fe-<ten-task>`
   - `feature/be-<ten-task>`
   - `feature/db-<ten-task>`
   - `fix/<ten-loi>`

Vi du:
- `feature/fe-review-workspace-api`
- `feature/be-ai-generate-endpoint`
- `feature/db-question-index`

### 3.2 Pull Request

1. PR toi `develop` (khong vao `main`).
2. PR title: `[FE] ...`, `[BE] ...`, `[DB] ...`, `[FULLSTACK] ...`
3. Bat buoc co:
   - Mo ta thay doi
   - Checklist test
   - Anh huong API/DB (neu co)
4. It nhat 1 reviewer cung nhom + 1 reviewer lien quan (neu cham API/DB).

### 3.3 Dong bo branch

1. Truoc khi code: `git pull --rebase origin develop`
2. Truoc khi push: `git fetch origin` + `git rebase origin/develop`
3. Xu ly xung dot tai branch ca nhan, khong resolve conflict tren `develop`.

## 4. Quy uoc API contract (quan trong nhat)

## 4.1 Single source of truth

File chuan API hien tai:
- `BACKEND_INTEGRATION_GUIDE.md`

Khi doi API, backend phai cap nhat file nay truoc hoac cung PR.

### 4.2 Duong dan API thong nhat

Frontend chi su dung endpoint qua Gateway:
- Auth: `/api/v1/auth/...`
- Documents: `/api/v1/documents/...`
- RAG: `/api/v1/rag/...`
- AI: `/api/v1/ai/...`
- Exams: `/api/v1/exams/...`

### 4.3 Danh sach endpoint dang dung (hien tai)

Auth:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

Documents:
- `POST /api/v1/documents/upload`
- `GET /api/v1/documents/documents`
- `GET /api/v1/documents/documents/{document_id}`

RAG:
- `POST /api/v1/rag/index-chunks` (noi bo backend)
- `POST /api/v1/rag/query-context` (noi bo backend)

AI:
- `POST /api/v1/ai/generate-questions`

Exams:
- `POST /api/v1/exams/export/word`
- `POST /api/v1/exams/export/qti`

Ghi chu:
- Cac endpoint noi bo (RAG) khong de frontend goi truc tiep.

### 4.4 Quy uoc dat ten key JSON

De tranh sai key giua FE va BE, chot 2 lop:

1. Public API tra ve cho Frontend: `camelCase`
2. Noi bo service (Python model/DB): co the `snake_case`, nhung phai map ro truoc khi response ra ngoai.

Bat buoc:
- Frontend model trong `src/types/index.ts` la hop dong cuoi cung de hien thi.
- Neu backend tra snake_case, phai co lop map sang camelCase tai gateway hoac service.

Vi du mapping:
- `document_id` -> `documentId`
- `total_pages` -> `totalPages`
- `source_chunk_id` -> `sourceChunkId`
- `correct_answer_id` -> `correctAnswerId`
- `created_at` -> `createdAt`

### 4.5 Quy uoc status code va error format

Ma HTTP:
- `200`: thanh cong
- `201`: tao moi
- `202`: xu ly nen
- `400`: request khong hop le
- `401`: chua xac thuc
- `403`: khong co quyen
- `404`: khong tim thay
- `409`: conflict du lieu
- `422`: validate loi
- `500`: loi he thong

Error response thong nhat:

```json
{
  "error": true,
  "statusCode": 400,
  "message": "Thong diep loi cho UI",
  "details": null,
  "requestId": "req-20261030-001"
}
```

### 4.6 Header va auth

Bat buoc:
- `Authorization: Bearer <token>` cho endpoint can dang nhap.
- `Content-Type: application/json` (tru upload file).
- Upload file dung `multipart/form-data` voi field `file`.

## 5. Quy uoc khoa (keys), secret va cau hinh

### 5.1 Env keys bat buoc

Toan bo key nhay cam dat trong `.env`, khong commit gia tri that.

Danh sach key toi thieu:
- `GEMINI_API_KEY`
- `SECRET_KEY` (JWT)
- `AUTH_SERVICE_URL`
- `DOCUMENT_SERVICE_URL`
- `RAG_SERVICE_URL`
- `AI_SERVICE_URL`
- `EXAM_SERVICE_URL`

Quy dinh:
1. Repo chi commit `.env.example`, khong commit `.env`.
2. Moi service doc key tu env, khong hard-code.
3. Neu can rotate key, ghi changelog va thong bao ca team.

### 5.2 Database keys (PK/FK)

Quy uoc ten cot:
- PK: `id`
- FK: `<entity>_id` (vi du: `user_id`, `document_id`)

Quy uoc id:
- User: `lec-001`
- Document: `doc_001` hoac UUID (uu tien UUID khi len production)
- Question: `q-101` hoac UUID

## 6. Quy uoc du lieu va DB

1. Moi thay doi schema phai di kem migration script (version ro rang).
2. Khong sua truc tiep bang production bang tay.
3. Moi cot can mo ta nullability va default.
4. Index bat buoc cho cac truong truy van nhieu (`document_id`, `status`, `created_at`).
5. Co rollback plan cho migration nguy hiem.

## 7. Quy uoc giao tiep FE-BE-DB

## 7.1 Rule handshake truoc khi code

Truoc moi task co API moi, bat buoc thong nhat 4 muc:
1. Endpoint + method
2. Request schema
3. Response schema
4. Error schema

Khong thong nhat xong -> khong code.

### 7.2 API change process

Neu doi API dang dung:
1. Tao `API_CHANGE_NOTE` trong PR description
2. Cap nhat `BACKEND_INTEGRATION_GUIDE.md`
3. Cap nhat type trong `src/types/index.ts`
4. Frontend va backend merge cung sprint

## 8. Quy uoc test va quality gate

Truoc khi merge, toi thieu:
1. Backend: test endpoint chinh + health check service.
2. Frontend: build thanh cong (`npm run build`) va khong loi TypeScript.
3. Integration: test luong chinh upload -> generate -> export.
4. Manual smoke:
   - Login
   - Upload tai lieu
   - Sinh cau hoi
   - Export de

## 9. Checklist nhanh truoc khi merge PR

1. Da rebase `develop` moi nhat.
2. Khong sua file ngoai pham vi task.
3. Neu doi API da cap nhat tai lieu contract.
4. Khong commit secret/key.
5. Da test local theo dung vai tro (FE/BE/DB).

## 10. Muc uu tien chuan hoa ngay

De giam loi ngay lap tuc, team uu tien 3 viec:
1. Chot 1 chuan key response public la `camelCase`.
2. Bo hard-code `SECRET_KEY` trong service, chuyen sang env.
3. Lap file `.env.example` dong bo cho tat ca service.

---

Owner tai lieu: Tech Lead (cap nhat moi sprint)
Phien ban: v1.0
Ngay cap nhat: 2026-10-30