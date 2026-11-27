# -*- coding: utf-8 -*-
"""
Quanta Copilot Native Function Calling Tool Declarations (17 Tools):
- Read Tools (chạy tự động trong ReAct loop)
- Write/Action Tools (trả về Thẻ Xác Nhận Tương Tác mặc định, trừ khi có lệnh rõ ràng + đủ dữ liệu)
"""

from typing import Dict, List, Optional
import google.generativeai as genai

T = genai.protos.Type
Schema = genai.protos.Schema
FuncDecl = genai.protos.FunctionDeclaration

READ_TOOLS = {
    "list_documents",
    "get_document_chapters",
    "get_document_status",
    "read_document_pages",
    "search_textbook_rag",
    "search_question_bank",
    "list_saved_exams",
    "generate_questions_from_doc",
    "get_my_support_tickets",
    "get_user_plan_and_quota",
    "get_qgroup_and_forum_summary",
}

ACTION_TOOLS = {
    "propose_exam_blueprint",
    "prepare_exam_import",
    "patch_question",
    "export_questions_docx",
    "prepare_support_ticket",
    "navigate_screen",
}

TOOL_STATUS_LABELS: Dict[str, str] = {
    "list_documents": "Đang kiểm tra kho giáo trình...",
    "get_document_chapters": "Đang đọc mục lục các chương...",
    "get_document_status": "Đang kiểm tra tiến độ xử lý tài liệu...",
    "read_document_pages": "Đang đọc trực tiếp nội dung trang sách...",
    "search_textbook_rag": "Đang tra cứu ngữ nghĩa RAG trong giáo trình...",
    "search_question_bank": "Đang tìm kiếm trong Ngân hàng Câu hỏi...",
    "list_saved_exams": "Đang kiểm tra danh sách đề thi đã lưu...",
    "generate_questions_from_doc": "Đang sinh bộ câu hỏi trắc nghiệm từ giáo trình...",
    "propose_exam_blueprint": "Đang thiết kế ma trận đề thi 4 bước...",
    "prepare_exam_import": "Đang đóng gói bộ câu hỏi để nạp vào hệ thống...",
    "patch_question": "Đang chuẩn bị bản chỉnh sửa câu hỏi...",
    "export_questions_docx": "Đang tạo file Word (.docx) chuẩn A4...",
    "prepare_support_ticket": "Đang soạn phiếu hỗ trợ kỹ thuật...",
    "get_my_support_tickets": "Đang tra cứu lịch sử ticket hỗ trợ...",
    "get_user_plan_and_quota": "Đang kiểm tra gói cước & hạn mức...",
    "get_qgroup_and_forum_summary": "Đang kiểm tra hoạt động Q-Group & Diễn đàn...",
    "navigate_screen": "Đang chuẩn bị điều hướng màn hình...",
}


def _s(desc: str) -> Schema:
    return Schema(type=T.STRING, description=desc)


def _i(desc: str) -> Schema:
    return Schema(type=T.INTEGER, description=desc)


def _b(desc: str) -> Schema:
    return Schema(type=T.BOOLEAN, description=desc)


def _obj(props: Dict[str, Schema], required: Optional[List[str]] = None, desc: str = "") -> Schema:
    return Schema(type=T.OBJECT, properties=props, required=required or [], description=desc)


def _arr(item: Schema, desc: str = "") -> Schema:
    return Schema(type=T.ARRAY, items=item, description=desc)


def get_copilot_tool_declarations() -> genai.protos.Tool:
    """Trả về genai.protos.Tool chứa toàn bộ 17 công cụ cho Quanta Agentic ReAct loop."""
    question_item_schema = _obj(
        {
            "question": _s("Nội dung câu hỏi trắc nghiệm (dùng LaTeX $...$ nếu có công thức)"),
            "options": _arr(
                _obj(
                    {
                        "id": _s("Mã phương án A, B, C hoặc D"),
                        "label": _s("Nhãn A, B, C hoặc D"),
                        "text": _s("Nội dung phương án"),
                    },
                    required=["id", "text"],
                ),
                "Danh sách 4 phương án A, B, C, D",
            ),
            "correctAnswerId": _s("Đáp án đúng: A, B, C hoặc D"),
            "explanation": _s("Lời giải thích chi tiết học thuật"),
            "bloomLevel": _s("Mức độ Bloom: Nhận biết, Thông hiểu, Vận dụng, hoặc Vận dụng cao"),
        },
        required=["question", "options", "correctAnswerId"],
    )

    decls = [
        FuncDecl(
            name="list_documents",
            description="Liệt kê danh sách giáo trình cá nhân của người dùng và các giáo trình dùng chung (shared) trong hệ thống.",
            parameters=_obj(
                {
                    "include_shared": _b("Có bao gồm giáo trình dùng chung toàn hệ thống không (mặc định true)"),
                    "keyword": _s("Từ khóa lọc theo tên tài liệu (tùy chọn)"),
                }
            ),
        ),
        FuncDecl(
            name="get_document_chapters",
            description="Lấy mục lục các chương (tên chương, trang bắt đầu/kết thúc) của một giáo trình cụ thể.",
            parameters=_obj(
                {"document_id": _s("ID của giáo trình cần xem mục lục")},
                required=["document_id"],
            ),
        ),
        FuncDecl(
            name="get_document_status",
            description="Kiểm tra trạng thái xử lý OCR/trích xuất, số trang, tiến độ (%) của một giáo trình.",
            parameters=_obj(
                {"document_id": _s("ID của giáo trình")},
                required=["document_id"],
            ),
        ),
        FuncDecl(
            name="read_document_pages",
            description="Đọc trực tiếp nội dung văn bản của giáo trình theo khoảng trang (page_start..page_end) hoặc theo tên chương.",
            parameters=_obj(
                {
                    "document_id": _s("ID của giáo trình"),
                    "page_start": _i("Trang bắt đầu (mặc định 1)"),
                    "page_end": _i("Trang kết thúc (tối đa cách page_start 6 trang)"),
                    "chapter_query": _s("Tên hoặc số chương cần lọc (tùy chọn)"),
                },
                required=["document_id"],
            ),
        ),
        FuncDecl(
            name="search_textbook_rag",
            description="Tìm kiếm ngữ nghĩa (RAG) các đoạn văn bản, công thức, định nghĩa chính xác từ giáo trình để trả lời có trích dẫn trang.",
            parameters=_obj(
                {
                    "query": _s("Câu truy vấn hoặc từ khóa học thuật cần tìm"),
                    "document_id": _s("ID giáo trình cụ thể (nếu bỏ trống sẽ tìm trên toàn kho)"),
                    "top_k": _i("Số lượng đoạn trích tối đa (mặc định 8, tối đa 12)"),
                },
                required=["query"],
            ),
        ),
        FuncDecl(
            name="search_question_bank",
            description="Tìm kiếm câu hỏi trắc nghiệm đã lưu trong Ngân hàng câu hỏi theo từ khóa, mức độ Bloom, hoặc tên giáo trình.",
            parameters=_obj(
                {
                    "keyword": _s("Từ khóa tìm kiếm trong nội dung câu hỏi"),
                    "bloom_level": _s("Lọc theo mức độ Bloom: Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao"),
                    "document_id": _s("Lọc theo ID giáo trình (tùy chọn)"),
                    "limit": _i("Số câu hỏi tối đa trả về (mặc định 10)"),
                }
            ),
        ),
        FuncDecl(
            name="list_saved_exams",
            description="Liệt kê các bộ đề thi đã đóng gói & lưu trong Ngân hàng Đề thi.",
            parameters=_obj({"limit": _i("Số lượng đề thi tối đa (mặc định 10)")}),
        ),
        FuncDecl(
            name="generate_questions_from_doc",
            description="Sinh câu hỏi trắc nghiệm AI trực tiếp từ một giáo trình hoặc chương cụ thể theo số lượng và mức độ Bloom.",
            parameters=_obj(
                {
                    "document_id": _s("ID giáo trình nguồn"),
                    "topic_or_chapter": _s("Chủ đề hoặc tên chương muốn tập trung"),
                    "count": _i("Số câu hỏi cần sinh (1 đến 10 câu cho phản hồi nhanh trong chat)"),
                    "difficulty": _s("Độ khó ưu tiên: Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao, hoặc Hỗn hợp"),
                },
                required=["document_id"],
            ),
        ),
        FuncDecl(
            name="propose_exam_blueprint",
            description="Tạo Thẻ Ma Trận Đề Thi 4 Bước (exam_blueprint) để người dùng bấm 1-chạm tự động sinh đề hoặc mở Bước 2.",
            parameters=_obj(
                {
                    "documentId": _s("ID giáo trình"),
                    "documentName": _s("Tên giáo trình"),
                    "chapter": _s("Chương hoặc phạm vi kiến thức (mặc định 'Toàn bộ giáo trình')"),
                    "questionCount": _i("Tổng số câu hỏi (ví dụ 10, 20, 40)"),
                    "know": _i("Phần trăm Nhận biết (0-100)"),
                    "understand": _i("Phần trăm Thông hiểu (0-100)"),
                    "apply": _i("Phần trăm Vận dụng (0-100)"),
                    "analyze": _i("Phần trăm Vận dụng cao (0-100)"),
                },
                required=["documentName", "questionCount"],
            ),
        ),
        FuncDecl(
            name="prepare_exam_import",
            description="Chuẩn bị Thẻ Nạp Đề Thi (import_exam) chứa danh sách câu hỏi hoàn chỉnh để người dùng xem trước và bấm nạp vào Bước 3 (Duyệt) hoặc Bước 4 (Ngân hàng/In đề). Mặc định autoExecute=false trừ khi người dùng ra lệnh rõ ràng nạp ngay.",
            parameters=_obj(
                {
                    "title": _s("Tiêu đề bộ đề thi"),
                    "targetScreen": _s("'bank' (Bước 4) hoặc 'review' (Bước 3)"),
                    "autoExecute": _b("CHỈ đặt true khi người dùng ra lệnh rõ ràng thực thi nạp ngay lập tức."),
                    "questions": _arr(question_item_schema, "Danh sách các câu hỏi trắc nghiệm"),
                },
                required=["title", "questions"],
            ),
        ),
        FuncDecl(
            name="patch_question",
            description="Đề xuất chỉnh sửa câu hỏi đang xem tại Bước 3/4 (patch_question). Mặc định trả về thẻ xác nhận cho người dùng duyệt trước khi áp dụng.",
            parameters=_obj(
                {
                    "questionId": _s("ID câu hỏi đang xem xét"),
                    "diffSummary": _s("Tóm tắt ngắn gọn các điểm đã chỉnh sửa"),
                    "question": _s("Nội dung câu hỏi mới (nếu sửa)"),
                    "options": _arr(
                        _obj({"id": _s("A/B/C/D"), "label": _s("A/B/C/D"), "text": _s("Nội dung")}),
                        "Danh sách phương án mới (nếu sửa)",
                    ),
                    "correctAnswerId": _s("Đáp án đúng mới (nếu sửa)"),
                    "explanation": _s("Lời giải thích mới (nếu sửa)"),
                    "bloomLevel": _s("Mức độ Bloom mới (nếu sửa)"),
                    "autoExecute": _b("CHỈ đặt true nếu người dùng yêu cầu áp dụng sửa ngay không cần hỏi lại."),
                },
                required=["questionId", "diffSummary"],
            ),
        ),
        FuncDecl(
            name="export_questions_docx",
            description="Xuất trực tiếp một bộ câu hỏi ra file Microsoft Word (.docx) chuẩn A4 kèm đáp án & lời giải để người dùng tải về ngay trong chat.",
            parameters=_obj(
                {
                    "title": _s("Tiêu đề đề thi trên file Word"),
                    "questions": _arr(question_item_schema, "Danh sách câu hỏi cần xuất ra Word"),
                },
                required=["title", "questions"],
            ),
        ),
        FuncDecl(
            name="prepare_support_ticket",
            description="Soạn Thẻ Phiếu Hỗ Trợ Kỹ Thuật (support_ticket). QUAN TRỌNG: Mặc định autoSubmit=false để người dùng kiểm tra/bổ sung mã giao dịch hoặc ảnh trước khi bấm gửi. Chỉ đặt autoSubmit=true khi người dùng đã cung cấp đủ thông tin cụ thể và yêu cầu gửi ngay.",
            parameters=_obj(
                {
                    "title": _s("Tiêu đề tóm tắt sự cố"),
                    "category": _s("Phân loại: 'payment' (thanh toán/nạp gói), 'system_bug' (lỗi hệ thống), hoặc 'academic' (chuyên môn)"),
                    "description": _s("Mô tả chi tiết sự cố để Admin đối soát"),
                    "autoSubmit": _b("Mặc định false. CHỈ true khi người dùng đã nêu đủ chi tiết và ra lệnh gửi ngay."),
                },
                required=["title", "category", "description"],
            ),
        ),
        FuncDecl(
            name="get_my_support_tickets",
            description="Tra cứu danh sách và trạng thái các phiếu hỗ trợ (Support Tickets) của người dùng hiện tại.",
            parameters=_obj({"limit": _i("Số lượng ticket tối đa (mặc định 5)")}),
        ),
        FuncDecl(
            name="get_user_plan_and_quota",
            description="Kiểm tra gói cước hiện tại (Free/Pro), ngày hết hạn và hạn mức sử dụng (số tài liệu, câu hỏi, đề thi) của người dùng.",
            parameters=_obj({}),
        ),
        FuncDecl(
            name="get_qgroup_and_forum_summary",
            description="Lấy tóm tắt các bài viết diễn đàn hoặc hoạt động học thuật gần đây trong hệ thống.",
            parameters=_obj({"limit": _i("Số lượng mục tối đa (mặc định 5)")}),
        ),
        FuncDecl(
            name="navigate_screen",
            description="Tạo nút điều hướng nhanh giúp người dùng chuyển đến màn hình chức năng của QuizGen AI.",
            parameters=_obj(
                {
                    "targetScreen": _s("Mã màn hình: 'upload', 'generate', 'review', 'bank', 'support', 'qgroup', 'forum', 'dashboard'"),
                    "label": _s("Nhãn hiển thị trên nút bấm"),
                },
                required=["targetScreen", "label"],
            ),
        ),
    ]
    return genai.protos.Tool(function_declarations=decls)
