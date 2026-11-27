# -*- coding: utf-8 -*-
"""
Quanta Copilot Tool Executor & Safe Action Gating:
- Thực thi 17 công cụ (Read Tools chạy tự động, Action Tools trả về thẻ tương tác an toàn).
- Hỗ trợ cơ chế tự sửa lỗi (Self-Correction): khi tool lỗi hoặc thiếu tham số, trả về error + hint cho LLM.
"""

import json
import os
import re
import sqlite3
from typing import Any, Dict, List, Optional

try:
    from .copilot_media import save_questions_docx_file
except ImportError:
    from src.copilot_media import save_questions_docx_file

SERVICES_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DOCS_DB = os.path.join(SERVICES_ROOT, "document-service/data/documents.db")
EXAM_DB = os.path.join(SERVICES_ROOT, "exam-service/data/exam.db")
AUTH_DB = os.path.join(SERVICES_ROOT, "auth-service/data/auth.db")
PAYMENT_DB = os.path.join(SERVICES_ROOT, "payment-service/data/payment.db")
SUPPORT_DB = os.path.join(SERVICES_ROOT, "support-service/data/support.db")

_EXPLORATORY_PATTERNS = re.compile(
    r"(\?|làm sao|như thế nào|cách nào|hướng dẫn|có thể|được không|giải thích|tư vấn|gợi ý|thử xem|là gì)",
    re.IGNORECASE,
)
_EXPLICIT_SUBMIT_PATTERNS = re.compile(
    r"(gửi ngay|tạo ticket ngay|gửi luôn|nạp ngay|import ngay|áp dụng ngay|sửa ngay|cập nhật ngay|đưa vào ngay)",
    re.IGNORECASE,
)


def apply_safe_action_gating(action_type: str, data: Dict[str, Any], user_message: str) -> Dict[str, Any]:
    """Fix #4: Ngăn auto-execute/auto-submit khi người dùng chỉ đang hỏi thăm dò hoặc chưa đủ thông tin."""
    msg = (user_message or "").strip()
    is_exploratory = bool(_EXPLORATORY_PATTERNS.search(msg)) and not bool(_EXPLICIT_SUBMIT_PATTERNS.search(msg))
    has_explicit_cmd = bool(_EXPLICIT_SUBMIT_PATTERNS.search(msg))

    if action_type == "support_ticket":
        desc = str(data.get("description") or "").strip()
        if is_exploratory or not has_explicit_cmd or len(desc) < 20:
            data["autoSubmit"] = False
    elif action_type == "import_exam":
        if is_exploratory or not has_explicit_cmd:
            data["autoExecute"] = False
    elif action_type == "patch_question":
        if is_exploratory or not has_explicit_cmd:
            data["autoExecute"] = False
    return data


def _to_plain(val: Any) -> Any:
    """Chuyển đổi Protobuf RepeatedComposite/MapComposite từ Gemini sang Python list/dict thuần."""
    if val is None or isinstance(val, (str, int, float, bool)):
        return val
    if isinstance(val, dict):
        return {str(k): _to_plain(v) for k, v in val.items()}
    if hasattr(val, "items"):
        return {str(k): _to_plain(v) for k, v in val.items()}
    if isinstance(val, (list, tuple)) or hasattr(val, "__iter__"):
        return [_to_plain(x) for x in val]
    return str(val)


def _db_query(db_path: str, sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
    if not os.path.exists(db_path):
        return []
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]


async def execute_copilot_tool(
    name: str,
    raw_args: Dict[str, Any],
    context: Dict[str, Any],
    user_message: str,
    generator: Any = None,
) -> Dict[str, Any]:
    """
    Thực thi 1 tool từ Gemini FunctionCall.
    Trả về: {"result": dict, "action": Optional[dict], "rag_sources": List[dict]}
    """
    args = _to_plain(raw_args) or {}
    effective_user_id = str(context.get("userId") or context.get("userEmail") or "").strip()
    user_email = str(context.get("userEmail") or "").strip().lower()
    rag_sources: List[Dict[str, Any]] = []

    try:
        if name == "list_documents":
            include_shared = args.get("include_shared", True)
            keyword = str(args.get("keyword") or "").strip().lower()
            rows = _db_query(
                DOCS_DB,
                "SELECT id, user_id, name, total_pages, chapters_count, status, progress, is_shared, author_name "
                "FROM documents ORDER BY is_shared DESC, id DESC LIMIT 40",
            )
            filtered = []
            owner_keys = {k for k in (effective_user_id.lower(), user_email) if k and k != "guest-copilot"}
            for r in rows:
                row_uid = str(r.get("user_id") or "").strip().lower()
                is_owner = bool(row_uid and row_uid in owner_keys)
                is_shared = bool(r.get("is_shared"))
                if not is_owner and not (include_shared and is_shared):
                    # Vẫn cho phép nếu guest/demo chưa có user_id khớp
                    if effective_user_id not in ("", "guest-copilot") and not is_shared:
                        continue
                if keyword and keyword not in str(r.get("name") or "").lower():
                    continue
                filtered.append({
                    "id": r["id"],
                    "name": r["name"],
                    "totalPages": r["total_pages"],
                    "chaptersCount": r["chapters_count"],
                    "status": r["status"],
                    "isShared": is_shared,
                    "authorName": r.get("author_name"),
                })
            return {"result": {"count": len(filtered), "documents": filtered}, "action": None, "rag_sources": []}

        if name == "get_document_chapters":
            doc_id = str(args.get("document_id") or context.get("documentId") or "").strip()
            if not doc_id:
                return {"result": {"error": "Thiếu document_id", "hint": "Hãy gọi list_documents trước để lấy document_id hợp lệ."}, "action": None, "rag_sources": []}
            chapters = _db_query(
                DOCS_DB,
                "SELECT chapter_index, title, page_start, page_end FROM document_chapters WHERE document_id = ? ORDER BY chapter_index ASC",
                (doc_id,),
            )
            if not chapters:
                return {"result": {"document_id": doc_id, "chapters": [], "note": "Giáo trình chưa có mục lục chương tách riêng; có thể dùng read_document_pages hoặc search_textbook_rag."}, "action": None, "rag_sources": []}
            return {"result": {"document_id": doc_id, "chapters": chapters}, "action": None, "rag_sources": []}

        if name == "get_document_status":
            doc_id = str(args.get("document_id") or context.get("documentId") or "").strip()
            if not doc_id:
                return {"result": {"error": "Thiếu document_id", "hint": "Gọi list_documents để tìm ID tài liệu."}, "action": None, "rag_sources": []}
            rows = _db_query(
                DOCS_DB,
                "SELECT id, name, status, progress, total_pages, chapters_count, error_message, is_shared FROM documents WHERE id = ?",
                (doc_id,),
            )
            if not rows:
                return {"result": {"error": f"Không tìm thấy tài liệu {doc_id}", "hint": "Gọi list_documents để kiểm tra lại ID."}, "action": None, "rag_sources": []}
            return {"result": rows[0], "action": None, "rag_sources": []}

        if name == "read_document_pages":
            doc_id = str(args.get("document_id") or context.get("documentId") or "").strip()
            if not doc_id:
                return {"result": {"error": "Thiếu document_id", "hint": "Gọi list_documents trước."}, "action": None, "rag_sources": []}
            p_start = max(1, int(args.get("page_start") or 1))
            p_end = min(p_start + 5, max(p_start, int(args.get("page_end") or (p_start + 3))))
            chap_q = str(args.get("chapter_query") or "").strip()

            doc_info = _db_query(DOCS_DB, "SELECT name FROM documents WHERE id = ?", (doc_id,))
            doc_name = doc_info[0]["name"] if doc_info else "Giáo trình"

            if chap_q:
                chunks = _db_query(
                    DOCS_DB,
                    "SELECT page_number, chapter, text_snippet FROM document_chunks WHERE document_id = ? AND LOWER(chapter) LIKE ? ORDER BY page_number ASC LIMIT 8",
                    (doc_id, f"%{chap_q.lower()}%"),
                )
            else:
                chunks = _db_query(
                    DOCS_DB,
                    "SELECT page_number, chapter, text_snippet FROM document_chunks WHERE document_id = ? AND page_number BETWEEN ? AND ? ORDER BY page_number ASC LIMIT 10",
                    (doc_id, p_start, p_end),
                )
            for c in chunks[:5]:
                rag_sources.append({"documentName": doc_name, "pageNumber": c["page_number"], "chapter": c.get("chapter") or ""})
            return {"result": {"document_id": doc_id, "document_name": doc_name, "pages": chunks}, "action": None, "rag_sources": rag_sources}

        if name == "search_textbook_rag":
            query = str(args.get("query") or user_message).strip()
            doc_id = str(args.get("document_id") or "").strip() or None
            top_k = min(12, max(1, int(args.get("top_k") or 8)))
            rag_url = os.getenv("RAG_SERVICE_URL", "http://127.0.0.1:8003").rstrip("/") + "/query-context"
            payload: Dict[str, Any] = {"query": query, "top_k": top_k, "use_mmr": True, "expand_context": True}
            if doc_id:
                payload["document_id"] = doc_id

            chunks: List[Dict[str, Any]] = []
            try:
                import httpx
                async with httpx.AsyncClient(timeout=6.0) as client:
                    resp = await client.post(rag_url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        chunks = data.get("citationCards") or data.get("chunks") or []
            except Exception as rag_err:
                print(f"[COPILOT-TOOL] RAG HTTP fallback: {rag_err}")

            # Fallback sang SQLite document_chunks nếu RAG service không trả về hoặc đang bận
            if not chunks:
                kw = f"%{query.split()[0].lower()}%" if query.split() else "%"
                sql = (
                    "SELECT c.document_id, d.name as documentName, c.page_number as pageNumber, c.chapter, c.text_snippet as textSnippet "
                    "FROM document_chunks c LEFT JOIN documents d ON c.document_id = d.id "
                    "WHERE LOWER(c.text_snippet) LIKE ? "
                )
                params: list = [kw]
                if doc_id:
                    sql += "AND c.document_id = ? "
                    params.append(doc_id)
                sql += "LIMIT ?"
                params.append(top_k)
                chunks = _db_query(DOCS_DB, sql, tuple(params))

            condensed = []
            for rc in chunks[:top_k]:
                d_name = rc.get("documentName") or rc.get("document_name") or "Giáo trình"
                p_num = rc.get("pageNumber") or rc.get("page_number") or 1
                chap = rc.get("chapter") or ""
                excerpt = rc.get("highlightExcerpt") or rc.get("textSnippet") or rc.get("text") or ""
                condensed.append({"documentName": d_name, "pageNumber": p_num, "chapter": chap, "excerpt": excerpt[:1200]})
                rag_sources.append({"documentName": d_name, "pageNumber": p_num, "chapter": chap})

            return {"result": {"query": query, "matches": condensed}, "action": None, "rag_sources": rag_sources}

        if name == "search_question_bank":
            kw = str(args.get("keyword") or "").strip().lower()
            bloom = str(args.get("bloom_level") or "").strip()
            doc_id = str(args.get("document_id") or "").strip()
            limit = min(20, max(1, int(args.get("limit") or 10)))
            sql = "SELECT id, textbook_name, chapter, bloom_level, question_text, options, correct_answer_id, explanation FROM questions WHERE 1=1 "
            params = []
            if kw:
                sql += "AND (LOWER(question_text) LIKE ? OR LOWER(chapter) LIKE ? OR LOWER(textbook_name) LIKE ?) "
                params.extend([f"%{kw}%", f"%{kw}%", f"%{kw}%"])
            if bloom:
                sql += "AND LOWER(bloom_level) LIKE ? "
                params.append(f"%{bloom.lower()}%")
            if doc_id:
                sql += "AND document_id = ? "
                params.append(doc_id)
            sql += "ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            rows = _db_query(EXAM_DB, sql, tuple(params))
            for r in rows:
                if isinstance(r.get("options"), str):
                    try:
                        r["options"] = json.loads(r["options"])
                    except Exception:
                        pass
            return {"result": {"count": len(rows), "questions": rows}, "action": None, "rag_sources": []}

        if name == "list_saved_exams":
            limit = min(20, max(1, int(args.get("limit") or 10)))
            rows = _db_query(
                EXAM_DB,
                "SELECT id, title, subject, duration_minutes, format, created_at FROM exams ORDER BY created_at DESC LIMIT ?",
                (limit,),
            )
            return {"result": {"count": len(rows), "exams": rows}, "action": None, "rag_sources": []}

        if name == "generate_questions_from_doc":
            doc_id = str(args.get("document_id") or context.get("documentId") or "").strip()
            topic = str(args.get("topic_or_chapter") or "").strip()
            count = min(10, max(1, int(args.get("count") or 5)))
            if not doc_id:
                return {"result": {"error": "Thiếu document_id", "hint": "Gọi list_documents để lấy document_id."}, "action": None, "rag_sources": []}
            if not generator:
                return {"result": {"error": "Generator chưa sẵn sàng."}, "action": None, "rag_sources": []}

            chunks = _db_query(
                DOCS_DB,
                "SELECT page_number, chapter, text_snippet FROM document_chunks WHERE document_id = ? "
                + ("AND LOWER(chapter) LIKE ? " if topic else "")
                + "ORDER BY page_number ASC LIMIT 8",
                (doc_id, f"%{topic.lower()}%") if topic else (doc_id,),
            )
            if not chunks:
                chunks = _db_query(DOCS_DB, "SELECT page_number, chapter, text_snippet FROM document_chunks WHERE document_id = ? LIMIT 6", (doc_id,))
            context_text = "\n\n".join(f"[Trang {c['page_number']}] {c['text_snippet']}" for c in chunks)
            if not context_text.strip():
                return {"result": {"error": f"Tài liệu {doc_id} chưa có nội dung trích xuất."}, "action": None, "rag_sources": []}

            doc_rows = _db_query(DOCS_DB, "SELECT name FROM documents WHERE id = ?", (doc_id,))
            doc_name = doc_rows[0]["name"] if doc_rows else "Giáo trình"
            bloom_matrix = {"know": max(1, count // 3), "understand": max(1, count // 3), "apply": max(0, count - 2 * max(1, count // 3)), "analyze": 0}
            gen_res = await generator.generate_questions_from_context(
                document_id=doc_id,
                context_text=context_text[:14000],
                bloom_matrix=bloom_matrix,
                pedagogical_prompt=topic or f"Sinh {count} câu hỏi bám sát giáo trình {doc_name}",
                textbook_name=doc_name,
            )
            qs = (gen_res or {}).get("questions") or []
            return {"result": {"documentName": doc_name, "count": len(qs), "questions": qs[:count]}, "action": None, "rag_sources": []}

        if name == "get_my_support_tickets":
            if not user_email and effective_user_id in ("", "guest-copilot"):
                return {"result": {"count": 0, "tickets": [], "note": "Người dùng chưa đăng nhập."}, "action": None, "rag_sources": []}
            limit = min(10, max(1, int(args.get("limit") or 5)))
            rows = _db_query(
                SUPPORT_DB,
                "SELECT ticket_code, category, priority, status, subject, created_at FROM support_tickets "
                "WHERE ( ? != '' AND LOWER(user_email) = ? ) OR ( ? != '' AND user_id = ? ) ORDER BY created_at DESC LIMIT ?",
                (user_email, user_email, effective_user_id, effective_user_id, limit),
            )
            return {"result": {"count": len(rows), "tickets": rows}, "action": None, "rag_sources": []}

        if name == "get_user_plan_and_quota":
            if not user_email and effective_user_id in ("", "guest-copilot"):
                return {"result": {"user": None, "quota": None, "note": "Người dùng chưa đăng nhập."}, "action": None, "rag_sources": []}
            u_rows = _db_query(
                AUTH_DB,
                "SELECT id, email, full_name, role, plan_tier, plan_expires_at FROM users "
                "WHERE ( ? != '' AND LOWER(email) = ? ) OR ( ? != '' AND id = ? ) LIMIT 1",
                (user_email, user_email, effective_user_id, effective_user_id),
            )
            uid = u_rows[0]["id"] if u_rows else effective_user_id
            q_rows = _db_query(PAYMENT_DB, "SELECT plan_code, documents_used, questions_used_month, exams_used_month, quota_reset_date FROM user_quotas WHERE user_id = ? LIMIT 1", (uid,))
            return {"result": {"user": u_rows[0] if u_rows else None, "quota": q_rows[0] if q_rows else None}, "action": None, "rag_sources": []}

        if name == "get_qgroup_and_forum_summary":
            return {"result": {"info": "Hội nhóm Q-Group & Diễn đàn Học thuật đang hoạt động. Người dùng có thể mở Q-Group hoặc Diễn đàn qua thanh điều hướng."}, "action": None, "rag_sources": []}

        # ── WRITE / ACTION TOOLS ──
        if name == "propose_exam_blueprint":
            data = {
                "documentId": str(args.get("documentId") or context.get("documentId") or ""),
                "documentName": str(args.get("documentName") or context.get("documentName") or "Giáo trình QuizGen AI"),
                "chapter": str(args.get("chapter") or "Toàn bộ giáo trình"),
                "questionCount": int(args.get("questionCount") or 20),
                "bloomRatio": {
                    "know": int(args.get("know") or 30),
                    "understand": int(args.get("understand") or 40),
                    "apply": int(args.get("apply") or 20),
                    "analyze": int(args.get("analyze") or 10),
                },
            }
            return {"result": {"status": "card_prepared", "cardType": "exam_blueprint"}, "action": {"type": "exam_blueprint", "data": data}, "rag_sources": []}

        if name == "prepare_exam_import":
            qs = args.get("questions") or []
            if not isinstance(qs, list) or len(qs) == 0:
                return {"result": {"error": "Danh sách questions rỗng.", "hint": "Hãy truyền ít nhất 1 câu hỏi đầy đủ question, options, correctAnswerId."}, "action": None, "rag_sources": []}
            data = {
                "title": str(args.get("title") or "Bộ Đề Thi Quanta AI Khởi Tạo"),
                "targetScreen": str(args.get("targetScreen") or "bank"),
                "autoExecute": bool(args.get("autoExecute", False)),
                "questions": qs,
            }
            data = apply_safe_action_gating("import_exam", data, user_message)
            return {"result": {"status": "card_prepared", "cardType": "import_exam", "questionCount": len(qs), "autoExecute": data["autoExecute"]}, "action": {"type": "import_exam", "data": data}, "rag_sources": []}

        if name == "patch_question":
            qid = str(args.get("questionId") or "").strip()
            if not qid:
                return {"result": {"error": "Thiếu questionId", "hint": "Lấy questionId từ activeQuestion trong ngữ cảnh hoặc search_question_bank."}, "action": None, "rag_sources": []}
            patch_obj = {k: args[k] for k in ("question", "options", "correctAnswerId", "explanation", "bloomLevel") if k in args and args[k] is not None}
            data = {
                "questionId": qid,
                "diffSummary": str(args.get("diffSummary") or "Tinh chỉnh câu hỏi theo yêu cầu"),
                "autoExecute": bool(args.get("autoExecute", False)),
                "patch": patch_obj,
            }
            data = apply_safe_action_gating("patch_question", data, user_message)
            return {"result": {"status": "card_prepared", "cardType": "patch_question", "autoExecute": data["autoExecute"]}, "action": {"type": "patch_question", "data": data}, "rag_sources": []}

        if name == "export_questions_docx":
            qs = args.get("questions") or []
            if not isinstance(qs, list) or len(qs) == 0:
                return {"result": {"error": "Không có câu hỏi nào để xuất Word.", "hint": "Hãy truyền danh sách questions đầy đủ."}, "action": None, "rag_sources": []}
            title = str(args.get("title") or "Đề Thi Quanta Copilot")
            export_meta = save_questions_docx_file(title, qs)
            action_data = {
                "title": title,
                "fileName": export_meta["fileName"],
                "downloadUrl": export_meta["downloadUrl"],
                "questionCount": export_meta["questionCount"],
                "questions": qs,
            }
            return {"result": {"status": "docx_ready", **export_meta}, "action": {"type": "export_docx", "data": action_data}, "rag_sources": []}

        if name == "prepare_support_ticket":
            data = {
                "title": str(args.get("title") or "Yêu cầu hỗ trợ kỹ thuật"),
                "category": str(args.get("category") or "system_bug"),
                "description": str(args.get("description") or user_message),
                "autoSubmit": bool(args.get("autoSubmit", False)),
            }
            data = apply_safe_action_gating("support_ticket", data, user_message)
            return {"result": {"status": "card_prepared", "cardType": "support_ticket", "autoSubmit": data["autoSubmit"]}, "action": {"type": "support_ticket", "data": data}, "rag_sources": []}

        if name == "navigate_screen":
            data = {
                "targetScreen": str(args.get("targetScreen") or "dashboard"),
                "label": str(args.get("label") or "Chuyển màn hình"),
            }
            return {"result": {"status": "card_prepared", "cardType": "navigate"}, "action": {"type": "navigate", "data": data}, "rag_sources": []}

        return {"result": {"error": f"Tool '{name}' không tồn tại."}, "action": None, "rag_sources": []}

    except Exception as exc:
        return {"result": {"error": str(exc), "hint": "Kiểm tra lại tham số đầu vào hoặc thử công cụ thay thế."}, "action": None, "rag_sources": []}
