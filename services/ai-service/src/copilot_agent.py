# -*- coding: utf-8 -*-
"""
Quanta Copilot Agentic ReAct Loop (Native Function Calling):
- Thay thế prompt khổng lồ + regex parsing bằng vòng lặp ReAct Tool-Use thực thụ.
- Tự động gọi Read Tools (tìm sách, đọc trang, RAG, ngân hàng câu hỏi, gói cước, ticket).
- Self-correction khi tool trả về lỗi.
- Write/Action Tools mặc định trả về Thẻ Tương Tác có Safe Action Gating.
"""

import asyncio
import json
import re
from typing import Any, AsyncGenerator, Dict, List, Optional

import google.generativeai as genai

try:
    from .copilot_tools import TOOL_STATUS_LABELS, get_copilot_tool_declarations
    from .copilot_tool_executor import apply_safe_action_gating, execute_copilot_tool
except ImportError:
    from src.copilot_tools import TOOL_STATUS_LABELS, get_copilot_tool_declarations
    from src.copilot_tool_executor import apply_safe_action_gating, execute_copilot_tool

MAX_AGENT_STEPS = 5


def _build_agent_system_instruction(
    ctx: Dict[str, Any],
    academic_memory: Optional[Dict[str, Any]] = None,
) -> str:
    screen = ctx.get("currentScreen", "dashboard")
    screen_label = ctx.get("screenLabel", "Không gian làm việc")
    user_name = ctx.get("userName", "anh/chị")
    user_title = ctx.get("academicTitle") or ""
    doc_id = ctx.get("documentId") or ctx.get("document_id") or ""
    doc_name = ctx.get("documentName") or ctx.get("document_name") or ""
    active_question = ctx.get("activeQuestion")

    is_remote = ctx.get("isRemoteCommander") or ctx.get("isAntigravityRemote") or screen == "admin_secret_command_center"
    if is_remote:
        return (
            f"Bạn là Antigravity — Trợ lý AI Full-stack đang trực tiếp làm việc trong workspace D:\\HKDN\\Quizgen AI của anh {user_name}. "
            "Xưng 'em', gọi người dùng là 'anh'. Trả lời ngắn gọn, sắc sảo, chính xác kỹ thuật."
        )

    mem = academic_memory or {}
    subjects = mem.get("subject_areas") or []
    bloom_pref = mem.get("preferred_bloom_ratio")
    custom_notes = mem.get("custom_notes") or []

    lines = [
        "Bạn là Quanta — Quản gia Khảo thí Học thuật & Trợ lý Điều hành AI (Agentic Copilot) của nền tảng QuizGen AI.",
        f"Người dùng hiện tại: {(user_title + ' ' + user_name).strip()} | Màn hình: {screen_label} ({screen}).",
        "",
        "NGUYÊN TẮC CỐT LÕI:",
        "1. Xưng 'Quanta' hoặc 'em', gọi người dùng lịch sự ('Thầy/Cô' hoặc 'anh/chị' tự nhiên, không ghép máy móc).",
        "2. Giao tiếp thông thường (chào hỏi, cảm ơn, hỏi thăm): Trả lời trực tiếp, nhanh gọn, KHÔNG gọi tool không cần thiết.",
        "3. Khi cần dữ liệu thực tế (sách, chương, nội dung trang, câu hỏi, đề thi, gói cước, ticket): BẮT BUỘC gọi Read Tools tương ứng (`list_documents`, `search_textbook_rag`, `read_document_pages`, `get_document_chapters`, `search_question_bank`, `get_user_plan_and_quota`, `get_my_support_tickets`...). KHÔNG tự bịa số liệu hoặc tên sách.",
        "4. Nếu một tool trả về lỗi hoặc thiếu ID, hãy đọc `hint` và tự sửa bằng cách gọi tool khác (ví dụ gọi `list_documents` trước để lấy `document_id`).",
        "5. Thao tác thay đổi dữ liệu / gửi yêu cầu (`prepare_support_ticket`, `prepare_exam_import`, `patch_question`, `propose_exam_blueprint`, `export_questions_docx`): Gọi tool để tạo Thẻ Xác Nhận Tương Tác. Mặc định `autoSubmit=false` / `autoExecute=false` trừ khi người dùng ra lệnh rõ ràng thực thi ngay với đầy đủ thông tin.",
        "6. Công thức Toán/Lý/Hóa luôn viết bằng LaTeX ($...$ hoặc $$...$$). Kênh hỗ trợ chính thức: Hotline/Zalo 0364591363, Email quizgen.ai.team@gmail.com.",
        "7. TRUNG THỰC TUYỆT ĐỐI VỀ CÔNG CỤ (CHỐNG ẢO GIÁC):",
        "   - CHỈ được nói đã xuất file Word / đã lập phiếu / đã nhập đề khi trong CHÍNH LƯỢT NÀY đã gọi tool tương ứng và nhận `status` thành công (`docx_ready`, `card_prepared`).",
        "   - Quanta KHÔNG có công cụ gửi Email cho người dùng và KHÔNG chạy tác vụ nền sau khi trả lời xong. Tuyệt đối KHÔNG hứa 'gửi qua email' hay 'chờ hệ thống chạy ngầm'.",
        "   - Khi người dùng yêu cầu xuất Word hoặc hỏi 'tải ở đâu / chưa thấy file', hãy gọi trực tiếp `export_questions_docx` với đầy đủ `title` và danh sách `questions` để hiện nút tải ngay trong khung chat; nếu tool báo lỗi, hãy nói thật nguyên nhân lỗi.",
        "",
        "8. QUY TRÌNH TƯ DUY NỘI TÂM (CHAIN-OF-THOUGHT SCRATCHPAD):",
        "   - Trước khi đưa ra câu trả lời cuối cùng, hãy tự đặt câu hỏi:",
        "     * [Ý định thực tế của người dùng là gì?]",
        "     * [Công cụ nào đã chạy và kết quả thật ra sao?]",
        "     * [Mình có đang hứa hẹn điều gì mà hệ thống không có công cụ thực thi không?]",
        "   - Luôn đặt tính chính xác, thực tế và tôn trọng người dùng lên hàng đầu.",
        "",
        "9. BẢO VỆ LẬP TRƯỜNG HỌC THUẬT & ĐỐI THOẠI PHẢN BIỆN (ACADEMIC STANDING):",
        "   - Khi người dùng thắc mắc hoặc chất vấn về nội dung ('sao lại ra...', 'đây là... mà', 'sao đề lại là...'):",
        "     * TUYỆT ĐỐI KHÔNG xin lỗi suông rồi âm thầm tạo lại ma trận cũ. KHÔNG được kích hoạt thẻ tạo đề mới đè lên.",
        "     * Phải giải thích rõ ràng về mặt bản chất chuyên môn: tại sao tài liệu lại có nội dung đó (ví dụ giải tích phức vs giải tích thực, đại số tuyến tính vs giải tích).",
        "     * Nếu tài liệu đang dùng bị lệch chuyên đề mong muốn, hãy phân tích sự khác nhau và chủ động đề xuất cuốn giáo trình hoặc chương phù hợp hơn.",
        "     * Có chính kiến khoa học vững vàng, lịch sự, đóng vai trò là một đồng nghiệp/cố vấn khảo thí thực thụ.",
    ]

    if doc_id or doc_name:
        lines.append(f"\nGIÁO TRÌNH ĐANG MỞ: '{doc_name}' (ID: {doc_id})")
    if subjects:
        lines.append(f"BỘ MÔN GẦN ĐÂY: {', '.join(subjects[:6])}")
    if bloom_pref:
        lines.append(f"TỈ LỆ BLOOM ƯA THÍCH: {json.dumps(bloom_pref, ensure_ascii=False)}")
    if custom_notes:
        lines.append(f"GHI CHÚ RIÊNG CỦA GIẢNG VIÊN: {'; '.join(custom_notes[-4:])}")

    if active_question and isinstance(active_question, dict):
        lines.append(
            f"\nCÂU HỎI ĐANG XEM (ID: {active_question.get('id', 'N/A')}): "
            f"{active_question.get('question', '')[:300]} | Đáp án: {active_question.get('correctAnswerId', '')} | Bloom: {active_question.get('bloomLevel', '')}"
        )

    return "\n".join(lines)


def _extract_suggestions(message: str, screen: str) -> List[str]:
    clean_msg = (message or "").lower()
    if any(k in clean_msg for k in ("lỗi", "thanh toán", "nạp", "support", "hỗ trợ", "ticket")):
        return ["📞 Hotline Zalo 0364591363", "💳 Kiểm tra gói cước & hạn mức", "🎫 Xem ticket hỗ trợ của tôi"]
    if screen == "generate":
        return ["📊 Đề xuất ma trận Bloom 20 câu", "📖 Tóm tắt các chương giáo trình", "⚡ Sinh 5 câu hỏi mẫu"]
    if screen == "bank":
        return ["📄 Xuất đề thi Word (.docx)", "🔍 Tìm câu hỏi Vận dụng cao", "📋 Xem các đề thi đã lưu"]
    return ["📚 Liệt kê giáo trình hiện có", "⚡ Đề xuất ma trận đề thi", "💡 Giải thích câu hỏi này"]


def _proto_to_python(val: Any) -> Any:
    """Chuyển đệ quy protobuf MapComposite/RepeatedComposite thành dict/list Python thuần."""
    if val is None or isinstance(val, (str, int, float, bool)):
        return val
    if hasattr(val, "items") and callable(val.items):
        return {str(k): _proto_to_python(v) for k, v in val.items()}
    if isinstance(val, (list, tuple)) or hasattr(val, "__iter__"):
        return [_proto_to_python(item) for item in val]
    return val


def _extract_function_calls(response: Any) -> List[Any]:
    calls: List[Any] = []
    try:
        candidates = getattr(response, "candidates", None) or []
        if not candidates:
            return calls
        parts = getattr(candidates[0].content, "parts", None) or []
        for p in parts:
            fc = getattr(p, "function_call", None)
            if fc and getattr(fc, "name", None):
                calls.append(fc)
    except Exception:
        pass
    return calls


def _extract_text(response: Any) -> str:
    try:
        candidates = getattr(response, "candidates", None) or []
        if not candidates:
            return getattr(response, "text", "") or ""
        parts = getattr(candidates[0].content, "parts", None) or []
        texts = [getattr(p, "text", "") for p in parts if getattr(p, "text", None)]
        return "\n".join(texts).strip()
    except Exception:
        try:
            return (response.text or "").strip()
        except Exception:
            return ""


def verify_and_sanitize_reply(
    reply: str,
    actions: List[Dict[str, Any]],
    user_message: str,
) -> str:
    """
    Trụ cột 4 - Deterministic Verifier:
    Bộ lọc code cứng chặn họng 100% ảo giác về file Word hoặc hứa hẹn gửi email trái phép.
    """
    clean_reply = reply.strip() if reply else ""
    has_docx_action = any(a.get("type") == "export_docx" and a.get("data", {}).get("downloadUrl") for a in actions)

    # 1. Phát hiện ảo giác bảo đã xuất file Word trong khi không có action export_docx thật
    docx_hallucination_patterns = [
        r"(đã|vừa)\s+(xuất|chuẩn bị|tạo)\s+(xong|thành công)?\s*(ra\s+)?(file|tệp)\s*(word|\.docx)",
        r"bấm\s+vào\s+(đường\s+)?(link|nút)\s*(bên\s+dưới|để\s+tải)",
        r"tải\s+file\s+[\"'].*?\.docx[\"']",
    ]
    claims_docx = any(re.search(pat, clean_reply, re.IGNORECASE) for pat in docx_hallucination_patterns)
    if claims_docx and not has_docx_action:
        clean_reply = (
            "Dạ, Quanta đã chuẩn bị nội dung câu hỏi hiển thị trên màn hình cho Thầy/Cô rồi ạ. "
            "Hiện tại em chưa tạo được file Word trực tiếp do chưa nhận đủ cấu trúc câu hỏi. "
            "Thầy/Cô vui lòng duyệt các câu hỏi trên trước hoặc cho em biết cần chỉnh sửa gì thêm nhé ạ!"
        )

    # 2. Cắt bỏ hoặc thay thế hoàn toàn nếu có ảo giác hứa hẹn gửi qua email
    if re.search(r"(gửi|chuyển).*?(hòm\s+thư|email|gmail|thư\s+điện\s+tử)", clean_reply, re.IGNORECASE):
        # Tách từng câu an toàn (không tách nhầm dấu chấm trong địa chỉ email như gmail.com)
        sentences = [s.strip() for s in re.split(r"(?<=[a-zA-Z0-9_À-ỹ\s])\.(?:\s+|$)|[\r\n]+", clean_reply) if s.strip()]
        filtered = [s for s in sentences if not re.search(r"(gửi|chuyển).*?(hòm\s+thư|email|gmail|thư\s+điện\s+tử)", s, re.IGNORECASE)]
        clean_reply = ". ".join(filtered)
        if clean_reply and not clean_reply.endswith("."):
            clean_reply += "."
        if not clean_reply or len(clean_reply) < 15:
            clean_reply = "Dạ, hệ thống QuizGen AI hiện tại hỗ trợ tải đề thi trực tiếp trên giao diện web và chưa hỗ trợ gửi tệp qua email cá nhân ạ."

    return clean_reply


def _generate_step_with_fallback(
    generator: Any,
    system_instruction: str,
    contents: List[Any],
    tools: Any,
):
    candidates = [
        getattr(generator, "model_name", "gemini-2.5-flash"),
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-1.5-flash",
    ]
    seen = set()
    unique_cands = [c for c in candidates if not (c in seen or seen.add(c))]
    max_keys = max(1, len(getattr(generator, "api_keys", []) or [1]))
    last_err = None

    for cand in unique_cands:
        for _ in range(max_keys):
            active_key = generator._get_active_key()
            if active_key:
                genai.configure(api_key=active_key)
            try:
                model_kwargs: Dict[str, Any] = {"system_instruction": system_instruction}
                if tools is not None:
                    model_kwargs["tools"] = [tools]
                m = genai.GenerativeModel(cand, **model_kwargs)
                res = m.generate_content(contents=contents)
                generator.model = m
                generator.model_name = cand
                return res
            except Exception as exc:
                last_err = exc
                err_l = str(exc).lower()
                if "429" in err_l or "quota" in err_l or "resource_exhausted" in err_l:
                    generator._rotate_key()
                    continue
                if "404" in err_l or "not found" in err_l:
                    break
                raise exc
    if last_err:
        raise last_err
    raise RuntimeError("Không có Gemini model khả dụng.")


async def run_copilot_agent(
    generator: Any,
    message: str,
    history: Optional[List[Dict[str, str]]] = None,
    context: Optional[Dict[str, Any]] = None,
    attachments: Optional[List[Dict[str, Any]]] = None,
    academic_memory: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Chạy Agentic ReAct loop (non-streaming) và trả về reply + actions + ragSources."""
    final_result: Dict[str, Any] = {}
    async for ev in run_copilot_agent_stream(
        generator=generator,
        message=message,
        history=history,
        context=context,
        attachments=attachments,
        academic_memory=academic_memory,
    ):
        if ev.get("type") == "done":
            final_result = {
                "reply": ev.get("reply", ""),
                "actions": ev.get("actions", []),
                "suggestedActions": ev.get("suggestedActions", []),
                "ragSources": ev.get("ragSources", []),
            }
    return final_result


async def run_copilot_agent_stream(
    generator: Any,
    message: str,
    history: Optional[List[Dict[str, str]]] = None,
    context: Optional[Dict[str, Any]] = None,
    attachments: Optional[List[Dict[str, Any]]] = None,
    academic_memory: Optional[Dict[str, Any]] = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """Async generator chạy vòng lặp ReAct Native Function Calling và phát SSE events."""
    if not generator.model:
        generator._init_model()

    ctx = context or {}
    screen = ctx.get("currentScreen", "dashboard")
    screen_label = ctx.get("screenLabel", "Không gian làm việc")
    user_name = ctx.get("userName", "anh/chị")
    suggestions = _extract_suggestions(message, screen)

    if not generator.model:
        offline_msg = (
            f"Chào {user_name}! Quanta đang chạy ở chế độ Ngoại tuyến tại **{screen_label}**. "
            "Vui lòng kiểm tra cấu hình `GEMINI_API_KEY` để kích hoạt đầy đủ công cụ Agentic."
        )
        yield {"type": "chunk", "text": offline_msg}
        yield {"type": "done", "reply": offline_msg, "actions": [], "suggestedActions": suggestions, "ragSources": []}
        return

    yield {"type": "status", "status": "thinking", "message": "Quanta đang phân tích yêu cầu..."}

    # Smart Router: Nếu người dùng đang chất vấn/thắc mắc về kết quả (sao lại ra, đây là... mà),
    # tạm thời không kích hoạt các tool tạo thẻ hành động đề thi (propose_exam_blueprint, prepare_exam_import)
    # để ưu tiên phân tích chuyên môn và giải thích học thuật có lập trường
    is_critique_or_questioning = bool(
        re.search(r"(sao\s+lại|sao\s+ra|đây\s+là.*?mà|ủa\s+sao|không\s+phải|nhầm\s+rồi|sao\s+đề\s+lại)", message, re.IGNORECASE)
    )

    system_instruction = _build_agent_system_instruction(ctx, academic_memory)
    contents: List[Any] = generator._build_gemini_contents(message, history, attachments)
    tools = None if is_critique_or_questioning else get_copilot_tool_declarations()

    collected_actions: List[Dict[str, Any]] = []
    collected_rag_sources: List[Dict[str, Any]] = []
    seen_rag = set()
    final_reply = ""

    try:
        for _step in range(MAX_AGENT_STEPS):
            response = await asyncio.to_thread(
                _generate_step_with_fallback,
                generator,
                system_instruction,
                contents,
                tools,
            )
            fn_calls = _extract_function_calls(response)
            if not fn_calls:
                final_reply = _extract_text(response)
                break

            # Đưa model turn (chứa function_call) vào hội thoại
            contents.append(response.candidates[0].content)

            fn_response_parts = []
            for fc in fn_calls:
                tool_name = fc.name
                raw_fc_args = getattr(fc, "args", None)
                tool_args = _proto_to_python(raw_fc_args) if raw_fc_args else {}
                if not isinstance(tool_args, dict):
                    tool_args = {}
                yield {
                    "type": "status",
                    "status": "tool_call",
                    "tool": tool_name,
                    "message": TOOL_STATUS_LABELS.get(tool_name, f"Đang thực thi {tool_name}..."),
                }
                exec_out = await execute_copilot_tool(
                    name=tool_name,
                    raw_args=tool_args,
                    context=ctx,
                    user_message=message,
                    generator=generator,
                )
                if exec_out.get("action"):
                    collected_actions.append(exec_out["action"])
                for src in exec_out.get("rag_sources") or []:
                    key = (src.get("documentName"), src.get("pageNumber"))
                    if key not in seen_rag:
                        seen_rag.add(key)
                        collected_rag_sources.append(src)

                fn_response_parts.append(
                    genai.protos.Part(
                        function_response=genai.protos.FunctionResponse(
                            name=tool_name,
                            response={"result": exec_out.get("result", {})},
                        )
                    )
                )

            contents.append(genai.protos.Content(role="user", parts=fn_response_parts))

        if not final_reply:
            # Nếu đã chạm MAX_AGENT_STEPS mà bước cuối vẫn là tool_call, tổng hợp câu trả lời cuối không cần tools
            synth_resp = await asyncio.to_thread(
                _generate_step_with_fallback,
                generator,
                system_instruction,
                contents,
                None,
            )
            final_reply = _extract_text(synth_resp)

        if not final_reply:
            final_reply = "Quanta đã hoàn tất xử lý và chuẩn bị các thẻ thao tác bên dưới."

        # Fallback: nếu LLM lỡ viết ```action:...``` trong text, trích xuất + gate an toàn
        clean_reply, legacy_actions = generator._extract_and_validate_actions(final_reply)
        for la in legacy_actions:
            la["data"] = apply_safe_action_gating(la.get("type", ""), la.get("data") or {}, message)
            collected_actions.append(la)

        reply_out = clean_reply or final_reply
        # Áp dụng Verifier kiểm duyệt tính trung thực trước khi stream hoặc trả về
        reply_out = verify_and_sanitize_reply(reply_out, collected_actions, message)

        # Phát từng đoạn ngắn để UI streaming mượt mà
        chunk_size = 120
        for i in range(0, len(reply_out), chunk_size):
            yield {"type": "chunk", "text": reply_out[i : i + chunk_size]}

        yield {
            "type": "done",
            "reply": reply_out,
            "actions": collected_actions,
            "suggestedActions": suggestions,
            "ragSources": collected_rag_sources[:8],
        }
    except Exception as exc:
        print(f"[COPILOT-AGENT] Error: {exc}")
        err_msg = (
            f"Quanta đã tiếp nhận yêu cầu về *\"{message}\"*, nhưng kết nối AI đang gặp gián đoạn tạm thời ({exc}). "
            "Thầy/Cô vui lòng thử lại sau giây lát ạ."
        )
        yield {"type": "chunk", "text": err_msg}
        yield {
            "type": "done",
            "reply": err_msg,
            "actions": collected_actions,
            "suggestedActions": suggestions,
            "ragSources": collected_rag_sources[:8],
        }
