
# QuizGen AI

## 1. Giới thiệu
QuizGen AI là dự án hỗ trợ giảng viên tạo câu hỏi trắc nghiệm từ tài liệu học tập bằng AI.

## 2. Mục tiêu MVP
- Tải lên tài liệu PDF hoặc Word.
- Trích xuất nội dung văn bản từ tài liệu.
- Sử dụng AI để tạo câu hỏi trắc nghiệm và đáp án.
- Cho phép người dùng xem lại, chỉnh sửa câu hỏi.
- Lưu và truy xuất bộ câu hỏi đã tạo.

## 3. Công nghệ dự kiến
- Frontend: React + Vite
- Backend: Python + FastAPI
- Database: PostgreSQL
- Xử lý PDF: PyMuPDF
- Xử lý Word: python-docx
- AI: Một API mô hình ngôn ngữ phù hợp

Các công nghệ trên là đề xuất ban đầu, cần được nhóm xác nhận trước khi triển khai chính thức.

## 4. Quy tắc GitHub
- `main`: phiên bản ổn định của dự án.
- `develop`: nhánh tích hợp công việc của nhóm.
- Mỗi thành viên tạo nhánh riêng từ `develop` cho từng công việc, ví dụ: `feature/upload-document`.
- Commit cần có nội dung rõ ràng, ví dụ: `feat: add document upload`.
- Sau khi hoàn thành, tạo Pull Request từ nhánh công việc vào `develop`.
- Không tự ý đưa code chưa kiểm tra vào `main`.
- Không đưa API key, mật khẩu hoặc thông tin đăng nhập vào GitHub.
- Khi hoàn thành task Jira, cập nhật trạng thái và đính kèm link PR, commit hoặc tài liệu minh chứng.

## 5. Tiêu chí nghiệm thu MVP
- Người dùng có thể tải lên tài liệu PDF hoặc Word hợp lệ.
- Hệ thống trích xuất được nội dung tài liệu.
- Hệ thống tạo được câu hỏi trắc nghiệm và đáp án từ nội dung đầu vào.
- Người dùng có thể xem và chỉnh sửa câu hỏi được tạo.
- Bộ câu hỏi có thể được lưu và truy xuất.
- Có kiểm thử cho các luồng chính và các trường hợp lỗi cơ bản.

## 6. Kế hoạch triển khai
1. Chốt phạm vi MVP và xác thực kỹ thuật.
2. Thiết kế giao diện, API và cơ sở dữ liệu.
3. Phát triển các chức năng chính.
4. Tích hợp frontend, backend và AI.
5. Kiểm thử, sửa lỗi, triển khai và hoàn thiện tài liệu.

## 7. Trạng thái hiện tại
Dự án đang ở giai đoạn chuẩn bị. Phạm vi MVP, kiến trúc và công nghệ cần được nhóm thống nhất trước khi triển khai đầy đủ.
