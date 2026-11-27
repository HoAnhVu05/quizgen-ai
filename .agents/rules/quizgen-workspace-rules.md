---
trigger: always_on
description: Quy định chung cho mọi phiên AI làm việc song song trong dự án QuizGen AI
---

# QuizGen AI — Workspace Coordination & Engineering Rules

1. **Server & Port Isolation (Tránh đụng độ khi chạy nhiều phiên):**
   - KHÔNG tự ý chạy hoặc tắt `start_backend.py`, `npm run dev`, `npm run preview`, `cloudflared`, hay kill process trên các cổng `3000`, `8000`–`8008`, trừ khi user yêu cầu trực tiếp trong phiên quản lý vận hành (`Run web`).
   - Nếu cần kiểm tra thay đổi Frontend khi web đang chạy bản `preview`, nhắc user hoặc báo phiên `Run web` chạy `npm run build` lại.

2. **Git & Jira Hygiene (An toàn khi nhiều phiên sửa code):**
   - TUYỆT ĐỐI KHÔNG dùng `git add .` hoặc `git add -A` (tránh cuốn nhầm thay đổi chưa hoàn thiện của phiên khác). Chỉ `git add <đúng các file phiên này vừa sửa>`.
   - Mọi commit trên `develop` phải gắn mã `[SCRUM-xx]` và cập nhật Jira (có thể dùng `scripts/jira-auto-task.cjs` hoặc Jira REST API với IPv4 forced).
   - Không commit file nhạy cảm hoặc file tạm cá nhân (`.env`, `run_cloudflare.bat`, `*.db`, `*.xlsx`, `*wifi*`).

3. **Code Modularity & Token Efficiency:**
   - Không đọc toàn bộ file dài (>300 dòng); luôn tìm vị trí trước (`Select-String`) rồi đọc đúng dải `StartLine..EndLine`.
   - Hạn chế nhồi thêm code vào các file quá lớn (`QGroupScreen.tsx`, `TextbookUploadScreen.tsx`, `ForumScreen.tsx`, `LoginScreen.tsx`, `AIChatCopilot.tsx`, `App.tsx`, `services/document-service/src/main.py`, `services/admin-service/src/main.py`). Khi thêm tính năng/logic mới, hãy tách thành component/helper/router nhỏ (<400 dòng) trong `src/components/<feature>/`, `src/utils/`, hoặc `services/<svc>/src/`.

4. **Verification Before Reporting:**
   - Sau khi sửa Frontend (`.ts`/`.tsx`): chạy `cmd /c "npx tsc --noEmit"` phải đạt 0 lỗi.
   - Sau khi sửa Backend (`.py`): chạy `python -m py_compile <file>` và chạy test liên quan trong `scripts/` trước khi báo xong.
