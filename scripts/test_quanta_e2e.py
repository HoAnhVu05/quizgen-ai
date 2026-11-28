# -*- coding: utf-8 -*-
"""
Quanta Copilot E2E & Edge-Case Test Suite:
1. Persistent Chat Media (Fix #3): lưu ảnh base64 -> file trên disk + URL phục vụ HTTP 200.
2. Direct Word (.docx) Export (Fix #5): tạo & tải file Word chuẩn A4 từ câu hỏi chat.
3. Safe Action Gating (Fix #4): chặn auto-submit / auto-execute khi câu hỏi thăm dò hoặc thiếu chi tiết.
4. 17 Native Tools + Shared Textbook Grounding + Self-Correction khi tool lỗi/thiếu ID.
5. Agentic ReAct Loop (Casual Chat 1-turn & Multi-step Tool Calling SSE Streaming).
"""

import asyncio
import base64
import io
import os
import sys
import time
import unittest
from types import SimpleNamespace
from unittest.mock import patch

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
AI_SVC_DIR = os.path.join(ROOT_DIR, "services", "ai-service")
if AI_SVC_DIR not in sys.path:
    sys.path.insert(0, AI_SVC_DIR)

from fastapi.testclient import TestClient
from src.main import app
from src.copilot_media import CHAT_UPLOADS_DIR, build_questions_docx_bytes, persist_chat_attachments
from src.copilot_tools import ACTION_TOOLS, READ_TOOLS, get_copilot_tool_declarations
from src.copilot_tool_executor import apply_safe_action_gating, execute_copilot_tool
from src.copilot_agent import run_copilot_agent, run_copilot_agent_stream


# 1x1 transparent PNG
SAMPLE_PNG_B64 = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)

SAMPLE_QUESTIONS = [
    {
        "question": "Trong thuật toán Dijkstra, độ phức tạp thời gian với Binary Heap là bao nhiêu?",
        "options": [
            {"id": "A", "label": "A", "text": "$O((V + E) \\log V)$"},
            {"id": "B", "label": "B", "text": "$O(V^3)$"},
            {"id": "C", "label": "C", "text": "$O(V)$"},
            {"id": "D", "label": "D", "text": "$O(1)$"},
        ],
        "correctAnswerId": "A",
        "explanation": "Dùng min-heap cho phép cập nhật và trích xuất đỉnh nhỏ nhất trong $O(\\log V)$.",
        "bloomLevel": "Thông hiểu",
    }
]


class TestQuantaCopilotE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_persistent_chat_media_and_serve(self):
        """Fix #3: Lưu ảnh base64 xuống chat_uploads/ và phục vụ qua /api/v1/ai/chat/uploads/{filename}."""
        atts = [{"id": "att-1", "name": "diagram.png", "mimeType": "image/png", "size": 68, "data": SAMPLE_PNG_B64}]
        persisted = persist_chat_attachments(atts)
        self.assertIsNotNone(persisted)
        self.assertEqual(len(persisted), 1)
        item = persisted[0]
        self.assertNotIn("data", item, "Base64 khổng lồ phải được loại bỏ khỏi DB record")
        self.assertTrue(item["url"].startswith("/api/v1/ai/chat/uploads/"))

        filename = item["url"].split("/")[-1]
        disk_path = os.path.join(CHAT_UPLOADS_DIR, filename)
        self.assertTrue(os.path.isfile(disk_path))

        # Test HTTP GET trên cả /chat/uploads/... và /ai/chat/uploads/...
        resp = self.client.get(f"/ai/chat/uploads/{filename}")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(len(resp.content) > 0)

        # Path traversal guard
        resp_404 = self.client.get("/ai/chat/uploads/nonexistent_file_xyz.png")
        self.assertEqual(resp_404.status_code, 404)

        # Cleanup test file
        if os.path.exists(disk_path):
            os.remove(disk_path)

    def test_02_direct_word_docx_export_endpoint(self):
        """Fix #5: Xuất file .docx chuẩn A4 trực tiếp từ endpoint /ai/chat/export-docx."""
        resp = self.client.post(
            "/ai/chat/export-docx",
            json={"title": "Đề Kiểm Tra CTDL", "questions": SAMPLE_QUESTIONS},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("wordprocessingml.document", resp.headers.get("content-type", ""))
        self.assertTrue(resp.content.startswith(b"PK\x03\x04"), "Phải là file DOCX/ZIP hợp lệ")

        # Kiểm tra nội dung đọc lại bằng python-docx
        from docx import Document
        doc = Document(io.BytesIO(resp.content))
        full_text = "\n".join(p.text for p in doc.paragraphs)
        self.assertIn("Dijkstra", full_text)
        self.assertIn("ĐÁP ÁN", full_text)

        # Edge case: danh sách câu hỏi rỗng -> 400
        bad_resp = self.client.post("/ai/chat/export-docx", json={"title": "Empty", "questions": []})
        self.assertEqual(bad_resp.status_code, 400)

    def test_03_safe_action_gating(self):
        """Fix #4: Chặn autoSubmit/autoExecute khi câu hỏi thăm dò hoặc thiếu chi tiết."""
        # 1. Thăm dò hỗ trợ -> không được autoSubmit
        g1 = apply_safe_action_gating(
            "support_ticket",
            {"title": "Hỏi về ticket", "description": "Mô tả đủ dài hơn hai mươi ký tự để test", "autoSubmit": True},
            "Làm sao để gửi ticket hỗ trợ khi bị lỗi thanh toán?",
        )
        self.assertFalse(g1["autoSubmit"])

        # 2. Mô tả quá ngắn -> không được autoSubmit
        g2 = apply_safe_action_gating(
            "support_ticket",
            {"title": "Lỗi", "description": "Bị lỗi", "autoSubmit": True},
            "Gửi ngay",
        )
        self.assertFalse(g2["autoSubmit"])

        # 3. Lệnh rõ ràng + mô tả đầy đủ -> cho phép autoSubmit
        g3 = apply_safe_action_gating(
            "support_ticket",
            {"title": "Lỗi thanh toán", "description": "Đã chuyển khoản 199k mã GD TX9988 nhưng chưa lên Pro", "autoSubmit": True},
            "Gửi ngay ticket lỗi thanh toán mã GD TX9988 giúp tôi",
        )
        self.assertTrue(g3["autoSubmit"])

        # 4. Thăm dò import_exam -> chặn autoExecute
        g4 = apply_safe_action_gating(
            "import_exam",
            {"title": "Đề mẫu", "questions": SAMPLE_QUESTIONS, "autoExecute": True},
            "Tôi có thể đưa vào bước 4 để in đề được không?",
        )
        self.assertFalse(g4["autoExecute"])

        # 5. Thăm dò patch_question -> chặn autoExecute
        g5 = apply_safe_action_gating(
            "patch_question",
            {"questionId": "q1", "diffSummary": "Sửa đáp án", "autoExecute": True},
            "Nên sửa câu này như thế nào cho khó hơn?",
        )
        self.assertFalse(g5["autoExecute"])

    def test_04_tool_declarations_and_executor_self_correction(self):
        """Kiểm tra đủ 17 tools, Shared Textbook Grounding và Self-Correction khi thiếu tham số."""
        tool_obj = get_copilot_tool_declarations()
        declared_names = {fd.name for fd in tool_obj.function_declarations}
        self.assertGreaterEqual(len(declared_names), 17)
        for expected in READ_TOOLS | ACTION_TOOLS:
            self.assertIn(expected, declared_names)

        async def _run_tools():
            # Shared textbook grounding via list_documents
            docs_out = await execute_copilot_tool("list_documents", {"include_shared": True}, {"userId": "guest-copilot"}, "Xem kho sách")
            self.assertIn("documents", docs_out["result"])

            # Self-correction: thiếu document_id -> trả về error + hint, không crash
            err_out = await execute_copilot_tool("get_document_chapters", {}, {}, "Xem chương")
            self.assertIn("error", err_out["result"])
            self.assertIn("hint", err_out["result"])

            # Self-correction: ID không tồn tại
            not_found = await execute_copilot_tool("get_document_status", {"document_id": "non-existent-doc-999"}, {}, "Kiểm tra")
            self.assertIn("error", not_found["result"])

            # Read tools khác
            qb = await execute_copilot_tool("search_question_bank", {"limit": 3}, {}, "Tìm câu hỏi")
            self.assertIn("questions", qb["result"])

            exams = await execute_copilot_tool("list_saved_exams", {"limit": 3}, {}, "Xem đề thi")
            self.assertIn("exams", exams["result"])

            plan = await execute_copilot_tool("get_user_plan_and_quota", {}, {"userEmail": "test@quizgen.ai"}, "Xem gói cước")
            self.assertIn("user", plan["result"])

            # Action tool: export_questions_docx
            exp = await execute_copilot_tool("export_questions_docx", {"title": "Test Export", "questions": SAMPLE_QUESTIONS}, {}, "Xuất Word")
            self.assertIsNotNone(exp["action"])
            self.assertEqual(exp["action"]["type"], "export_docx")
            dl_url = exp["action"]["data"]["downloadUrl"]
            dl_name = dl_url.split("/")[-1]
            dl_resp = self.client.get(f"/ai/chat/exports/{dl_name}")
            self.assertEqual(dl_resp.status_code, 200)

        asyncio.run(_run_tools())

    def test_05_agentic_react_loop_casual_and_multistep(self):
        """Kiểm tra ReAct loop: Casual chat 1-turn nhanh & Multi-step tool calling + SSE streaming."""
        fake_gen = SimpleNamespace(
            model=True,
            model_name="gemini-2.5-flash",
            api_keys=["fake-key"],
            _init_model=lambda: None,
            _get_active_key=lambda: "fake-key",
            _rotate_key=lambda: "fake-key",
            _build_gemini_contents=lambda msg, hist=None, atts=None: [{"role": "user", "parts": [msg]}],
            _extract_and_validate_actions=lambda txt: (txt, []),
        )

        # Case A: Casual chat (1 turn, 0 tool calls)
        casual_resp = SimpleNamespace(
            candidates=[SimpleNamespace(content=SimpleNamespace(parts=[SimpleNamespace(text="Chào Thầy/Cô! Em là Quanta, sẵn sàng hỗ trợ ạ.", function_call=None)]))]
        )
        with patch("src.copilot_agent._generate_step_with_fallback", return_value=casual_resp):
            t0 = time.perf_counter()
            res = asyncio.run(run_copilot_agent(fake_gen, "Chào bạn!", context={"currentScreen": "dashboard"}))
            elapsed = time.perf_counter() - t0
            self.assertIn("Quanta", res["reply"])
            self.assertEqual(res["actions"], [])
            self.assertLess(elapsed, 2.0)

        # Case B: Multi-step ReAct (Step 1: call list_documents -> Step 2: grounded answer)
        fc_part = SimpleNamespace(function_call=SimpleNamespace(name="list_documents", args={"include_shared": True}), text=None)
        step1_resp = SimpleNamespace(candidates=[SimpleNamespace(content=SimpleNamespace(parts=[fc_part]))])
        step2_resp = SimpleNamespace(
            candidates=[SimpleNamespace(content=SimpleNamespace(parts=[SimpleNamespace(text="Hệ thống hiện có các giáo trình đã đồng bộ.", function_call=None)]))]
        )
        with patch("src.copilot_agent._generate_step_with_fallback", side_effect=[step1_resp, step2_resp]):
            events = []

            async def _collect():
                async for ev in run_copilot_agent_stream(fake_gen, "Hệ thống có những giáo trình nào?", context={"currentScreen": "upload"}):
                    events.append(ev)

            asyncio.run(_collect())
            types = [e["type"] for e in events]
            self.assertIn("status", types)
            self.assertIn("chunk", types)
            self.assertEqual(types[-1], "done")
            tool_events = [e for e in events if e.get("status") == "tool_call"]
            self.assertEqual(len(tool_events), 1)
            self.assertEqual(tool_events[0]["tool"], "list_documents")

    def test_06_max_agent_steps_synthesis(self):
        """Khi chạm MAX_AGENT_STEPS mà bước cuối vẫn là tool_call, phải gọi thêm lượt tổng hợp tools=None."""
        fake_gen = SimpleNamespace(
            model=True,
            model_name="gemini-2.5-flash",
            api_keys=["fake-key"],
            _init_model=lambda: None,
            _get_active_key=lambda: "fake-key",
            _rotate_key=lambda: "fake-key",
            _build_gemini_contents=lambda msg, hist=None, atts=None: [{"role": "user", "parts": [msg]}],
            _extract_and_validate_actions=lambda txt: (txt, []),
        )
        fc_part = SimpleNamespace(function_call=SimpleNamespace(name="list_documents", args={"include_shared": True}), text=None)
        tool_resp = SimpleNamespace(candidates=[SimpleNamespace(content=SimpleNamespace(parts=[fc_part]))])
        synth_resp = SimpleNamespace(
            candidates=[SimpleNamespace(content=SimpleNamespace(parts=[SimpleNamespace(text="Tổng hợp cuối cùng từ dữ liệu tool.", function_call=None)]))]
        )
        # 5 lần trả về tool_call + 1 lần tổng hợp cuối cùng
        with patch("src.copilot_agent._generate_step_with_fallback", side_effect=[tool_resp, tool_resp, tool_resp, tool_resp, tool_resp, synth_resp]) as mock_gen:
            res = asyncio.run(run_copilot_agent(fake_gen, "Kiểm tra nhiều bước", context={"currentScreen": "upload"}))
            self.assertEqual(mock_gen.call_count, 6)
            self.assertIsNone(mock_gen.call_args_list[-1].args[3])
            self.assertIn("Tổng hợp cuối cùng", res["reply"])

    def test_07_guest_isolation_and_chat_history_media_roundtrip(self):
        """Guest không được match nhầm user_email rỗng; /ai/chat + /ai/chat/history lưu url bền vững."""
        async def _check_guest():
            t_res = await execute_copilot_tool("get_my_support_tickets", {}, {"userId": "guest-copilot"}, "Xem ticket")
            self.assertEqual(t_res["result"]["count"], 0)
            p_res = await execute_copilot_tool("get_user_plan_and_quota", {}, {"userId": "guest-copilot"}, "Xem gói")
            self.assertIsNone(p_res["result"]["user"])

        asyncio.run(_check_guest())

        test_uid = f"e2e-media-{int(time.time() * 1000)}"
        try:
            with patch("src.main.generator.chat_with_copilot", return_value={"reply": "Đã nhận ảnh.", "actions": [], "suggestedActions": [], "ragSources": []}):
                chat_resp = self.client.post(
                    "/ai/chat",
                    json={
                        "message": "Xem giúp ảnh này",
                        "context": {"userId": test_uid, "currentScreen": "dashboard"},
                        "attachments": [{"id": "a1", "name": "test.png", "mimeType": "image/png", "size": 68, "data": SAMPLE_PNG_B64}],
                    },
                )
                self.assertEqual(chat_resp.status_code, 200)

            hist_resp = self.client.get("/ai/chat/history", headers={"X-User-Email": test_uid})
            # _resolve_chat_user_id ưu tiên X-User-Email lowercase
            self.assertEqual(hist_resp.status_code, 200)
            msgs = hist_resp.json().get("messages", [])
            self.assertGreaterEqual(len(msgs), 2)
            usr_atts = msgs[0].get("attachments") or []
            self.assertEqual(len(usr_atts), 1)
            self.assertTrue(usr_atts[0].get("url", "").startswith("/api/v1/ai/chat/uploads/"))
            self.assertNotIn("data", usr_atts[0])

            fname = usr_atts[0]["url"].split("/")[-1]
            disk_file = os.path.join(CHAT_UPLOADS_DIR, fname)
            if os.path.exists(disk_file):
                os.remove(disk_file)
        finally:
            self.client.delete("/ai/chat/history", headers={"X-User-Email": test_uid})

    def test_08_protobuf_composite_export_docx(self):
        """Giả lập MapComposite/RepeatedComposite từ Gemini SDK khi gọi export_questions_docx."""
        class FakeRepeated:
            def __init__(self, items):
                self._items = items
            def __iter__(self):
                return iter(self._items)

        class FakeMap:
            def __init__(self, data):
                self._data = data
            def items(self):
                return self._data.items()

        proto_args = FakeMap({
            "title": "Đề Đạo Hàm Proto Test",
            "questions": FakeRepeated([
                FakeMap({
                    "question": "Đạo hàm của $f(x) = x^2$ là?",
                    "options": FakeRepeated([
                        FakeMap({"id": "A", "text": "$2x$"}),
                        FakeMap({"id": "B", "text": "$x$"}),
                    ]),
                    "correctAnswerId": "A",
                    "explanation": "Áp dụng công thức $(x^n)' = n x^{n-1}$.",
                    "bloomLevel": "Nhận biết",
                })
            ]),
        })
        fake_gen = SimpleNamespace(
            model=True,
            model_name="gemini-2.5-flash",
            api_keys=["fake-key"],
            _init_model=lambda: None,
            _get_active_key=lambda: "fake-key",
            _rotate_key=lambda: "fake-key",
            _build_gemini_contents=lambda msg, hist=None, atts=None: [{"role": "user", "parts": [msg]}],
            _extract_and_validate_actions=lambda txt: (txt, []),
        )
        fc_part = SimpleNamespace(function_call=SimpleNamespace(name="export_questions_docx", args=proto_args), text=None)
        step1 = SimpleNamespace(candidates=[SimpleNamespace(content=SimpleNamespace(parts=[fc_part]))])
        step2 = SimpleNamespace(candidates=[SimpleNamespace(content=SimpleNamespace(parts=[SimpleNamespace(text="Đã xuất file Word sẵn sàng tải về.", function_call=None)]))])

        with patch("src.copilot_agent._generate_step_with_fallback", side_effect=[step1, step2]):
            import json
            res = asyncio.run(run_copilot_agent(fake_gen, "Xuất file Word giúp anh", context={"currentScreen": "dashboard"}))
            self.assertEqual(len(res["actions"]), 1)
            self.assertEqual(res["actions"][0]["type"], "export_docx")
            # Đảm bảo JSON serializable hoàn toàn (không còn FakeMap/FakeRepeated)
            serialized = json.dumps(res, ensure_ascii=False)
            self.assertIn("export_docx", serialized)
            dl_url = res["actions"][0]["data"]["downloadUrl"]
            dl_name = dl_url.split("/")[-1]
            dl_resp = self.client.get(f"/ai/chat/exports/{dl_name}")
            self.assertEqual(dl_resp.status_code, 200)

    def test_09_deterministic_verifier_blocks_hallucinations(self):
        """Trụ cột 4: Verifier chặn họng ảo giác xuất file Word khi không có file thật và cắt bỏ hứa hẹn gửi email."""
        from src.copilot_agent import verify_and_sanitize_reply

        # Case 1: AI bảo 'Đã xuất xong ra file Word bấm vào link tải' nhưng actions rỗng
        hallucinated_docx = "Dạ Quanta đã xuất xong ra file Word rồi ạ. Thầy/Cô bấm vào link bên dưới để tải nhé!"
        sanitized = verify_and_sanitize_reply(hallucinated_docx, [], "Xuất Word giúp anh")
        self.assertNotIn("bấm vào link", sanitized)
        self.assertIn("chưa tạo được file Word", sanitized)

        # Case 2: Khi CÓ action export_docx thật, Verifier giữ nguyên không can thiệp sai
        real_docx_action = [{"type": "export_docx", "data": {"downloadUrl": "/api/v1/ai/chat/exports/test.docx"}}]
        valid_msg = "Dạ Quanta đã xuất xong ra file Word rồi ạ. Thầy/Cô bấm vào thẻ bên dưới để tải về nhé!"
        kept = verify_and_sanitize_reply(valid_msg, real_docx_action, "Xuất Word")
        self.assertEqual(kept, valid_msg)

        # Case 3: AI hứa gửi email
        hallucinated_email = "Quanta xin phép gửi file này qua email avanimechannel@gmail.com cho Thầy/Cô trong ít phút nữa ạ."
        sanitized_email = verify_and_sanitize_reply(hallucinated_email, [], "avanimechannel@gmail.com")
        self.assertNotIn("avanimechannel@gmail.com", sanitized_email)
        self.assertIn("chưa hỗ trợ gửi tệp qua email cá nhân", sanitized_email)

    def test_10_chat_question_harvester_and_smart_router(self):
        """Kiểm tra: 1) Harvester tự bóc tách câu hỏi từ chat ra Word; 2) Router khóa tool khi người dùng chất vấn."""
        from src.copilot_media import extract_questions_from_chat_text

        sample_chat = (
            "Dưới đây là các câu hỏi đã soạn:\n\n"
            "**1. (Nhận biết)** Đạo hàm của hàm $f(x) = x^3$ là gì?\n"
            "    A. $3x^2$\n"
            "    B. $x^2$\n"
            "    C. $3x$\n"
            "    D. $x^3/3$\n"
            "    *Đáp án: A*\n"
            "    *Giải thích: Quy tắc lũy thừa.*\n\n"
            "**2. (Thông hiểu)** Đạo hàm của $e^{2x}$ bằng:\n"
            "    A. $e^{2x}$\n"
            "    B. $2e^{2x}$ \n"
            "    C. $e^x$\n"
            "    D. $2e^x$\n"
            "    *Đáp án: B*\n"
            "    *Giải thích: Đạo hàm hàm hợp.*"
        )
        harvested = extract_questions_from_chat_text(sample_chat)
        self.assertEqual(len(harvested), 2)
        self.assertEqual(harvested[0]["correctAnswerId"], "A")
        self.assertEqual(harvested[1]["correctAnswerId"], "B")

        # Test tool export_questions_docx khi questions rỗng nhưng DB có tin nhắn
        fake_uid = "e2e-harvest-user"
        import sqlite3
        ai_conn = sqlite3.connect("services/ai-service/data/ai.db")
        try:
            ai_conn.execute(
                "INSERT INTO copilot_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                ("bot-harvest-test", fake_uid, "assistant", sample_chat, "2026-11-28 12:00:00")
            )
            ai_conn.commit()

            async def _run_harvester_export():
                from src.copilot_tool_executor import execute_copilot_tool
                res = await execute_copilot_tool(
                    "export_questions_docx",
                    {"title": "Đề Thu Hoạch Tự Động", "questions": []},
                    {"userId": fake_uid},
                    "xuất file giúp anh"
                )
                self.assertIsNotNone(res["action"])
                self.assertEqual(res["action"]["type"], "export_docx")
                self.assertEqual(res["action"]["data"]["questionCount"], 2)

            asyncio.run(_run_harvester_export())
        finally:
            ai_conn.execute("DELETE FROM copilot_messages WHERE id = 'bot-harvest-test'")
            ai_conn.commit()
            ai_conn.close()

    def test_11_quanta_math_formatting_and_openxml_fonts(self):
        """[SCRUM-145] Kiểm tra: font OpenXML w:cs/w:eastAsia, chuyển đổi LaTeX sang Unicode, khử 'Ư' rác, map đáp án kỹ thuật, slug tiếng Việt."""
        from src.copilot_media import (
            clean_stray_u,
            clean_latex_to_text,
            resolve_option_label,
            slugify_vietnamese_filename,
            build_questions_docx_bytes,
        )
        from docx import Document
        from docx.oxml.ns import qn

        # 1. Slug tiếng Việt không dấu
        raw_title = "Đề thi Tích phân từ Toán kỹ thuật - 2013"
        slug = slugify_vietnamese_filename(raw_title)
        self.assertEqual(slug, "De_thi_Tich_phan_tu_Toan_ky_thuat_2013")

        # 2. Khử ký tự rác 'Ư'
        sample_u = "đường cong $C$Ư. tức là $f'(t_0)$Ư. trên một khoảng chứa $t_0$Ư?"
        cleaned_u = clean_stray_u(sample_u)
        self.assertNotIn("Ư.", cleaned_u)
        self.assertNotIn("Ư?", cleaned_u)

        # 3. Chuyển đổi công thức toán LaTeX sang Unicode
        latex_q = r"Tích phân đường $\oint_C f(z) dz$ và phân số $\frac{1}{2\pi i}$ với đạo hàm $f'(t_0)$"
        math_text = clean_latex_to_text(latex_q)
        self.assertIn("∮", math_text)
        self.assertIn("(1/2π i)", math_text)
        self.assertNotIn("$", math_text)

        # 4. Ánh xạ mã đáp án kỹ thuật opt-a, opt-1 sang chữ cái A, B, C, D
        opts_technical = [
            {"id": "opt-1", "label": "A", "text": "Phương án 1"},
            {"id": "opt-2", "label": "B", "text": "Phương án 2"},
        ]
        self.assertEqual(resolve_option_label("opt-1", opts_technical), "A")
        self.assertEqual(resolve_option_label("opt-2", opts_technical), "B")
        self.assertEqual(resolve_option_label("opt-b", []), "B")

        # Trường hợp index số thuần túy (0 -> A, 1 -> B)
        opts_plain = [{"text": "Alpha"}, {"text": "Beta"}]
        self.assertEqual(resolve_option_label(1, opts_plain), "B")

        # 5. Kiểm tra file Word tạo ra có đủ OpenXML w:cs, w:eastAsia trên mọi Run và bảng biểu
        test_questions = [
            {
                "question": "Tính tích phân $\\oint_C f(z) dz$ trong miền đơn liên $D$Ư.",
                "options": [
                    {"id": "opt-1", "label": "A", "text": "Bằng 0 theo định lý Cauchy"},
                    {"id": "opt-2", "label": "B", "text": "Bằng $2\\pi i$"},
                ],
                "correctAnswerId": "opt-1",
                "explanation": "Theo định lý tích phân Cauchy, tích phân trên đường cong kín bằng 0.",
                "bloomLevel": "Nhận biết",
            }
        ]
        docx_bytes, filename = build_questions_docx_bytes(raw_title, test_questions)
        self.assertTrue(filename.startswith("De_thi_Tich_phan_tu_Toan_ky_thuat_2013"))

        doc = Document(io.BytesIO(docx_bytes))
        # Kiểm tra bảng biểu: Header bảng 2 cột + Bảng đáp án ma trận 5 cột
        self.assertGreaterEqual(len(doc.tables), 2)
        header_table = doc.tables[0]
        self.assertEqual(len(header_table.columns), 2)
        ans_table = doc.tables[1]
        self.assertEqual(len(ans_table.columns), 5)

        # Kiểm tra font Times New Roman trên Style Normal và các Runs
        style_rFonts = doc.styles["Normal"].element.rPr.find(qn("w:rFonts"))
        self.assertIsNotNone(style_rFonts)
        self.assertEqual(style_rFonts.get(qn("w:cs")), "Times New Roman")
        self.assertEqual(style_rFonts.get(qn("w:eastAsia")), "Times New Roman")

        # Kiểm tra runs có w:cs và w:eastAsia
        found_run_fonts = 0
        for p in doc.paragraphs:
            for r in p.runs:
                rFonts = r._r.rPr.find(qn("w:rFonts")) if r._r.rPr is not None else None
                if rFonts is not None:
                    self.assertEqual(rFonts.get(qn("w:cs")), "Times New Roman")
                    self.assertEqual(rFonts.get(qn("w:eastAsia")), "Times New Roman")
                    found_run_fonts += 1
        self.assertGreater(found_run_fonts, 0)

    def test_12_harvester_actions_json_and_created_at_sort(self):
        """[SCRUM-145] Kiểm tra Harvester: Sắp xếp theo created_at DESC và bóc tách câu hỏi từ payload actions JSON."""
        import json
        import sqlite3
        from src.copilot_tool_executor import execute_copilot_tool

        fake_uid = "e2e-actions-harvest-user"
        ai_conn = sqlite3.connect("services/ai-service/data/ai.db")
        try:
            # Tin nhắn cũ hơn có id bắt đầu bằng 'bot-zzz' (nếu sort theo id DESC sẽ bị lấy nhầm)
            ai_conn.execute(
                "INSERT INTO copilot_messages (id, user_id, role, content, actions, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                ("bot-zzz-older", fake_uid, "assistant", "Tin nhắn cũ hơn không có câu hỏi", None, "2026-11-28 10:00:00")
            )
            # Tin nhắn mới hơn có id bắt đầu bằng 'bot-aaa' nhưng created_at mới nhất và có payload actions
            structured_qs = [
                {
                    "question": "Ma trận Jacobian của phép đổi tọa độ cực là gì?",
                    "options": [
                        {"id": "A", "label": "A", "text": "r"},
                        {"id": "B", "label": "B", "text": "r^2"},
                    ],
                    "correctAnswerId": "A",
                    "explanation": "Định thức Jacobian trong tọa độ cực bằng r.",
                }
            ]
            actions_payload = json.dumps([
                {
                    "type": "import_exam",
                    "data": {
                        "title": "Đề Toán Kỹ Thuật",
                        "questions": structured_qs,
                    }
                }
            ])
            ai_conn.execute(
                "INSERT INTO copilot_messages (id, user_id, role, content, actions, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                ("bot-aaa-newer", fake_uid, "assistant", "Dưới đây là kết quả đề thi khởi tạo", actions_payload, "2026-11-28 15:00:00")
            )
            ai_conn.commit()

            async def _run():
                res = await execute_copilot_tool(
                    "export_questions_docx",
                    {"title": "Đề Thu Hoạch Từ Actions", "questions": []},
                    {"userId": fake_uid},
                    "xuất đề vừa rồi ra Word"
                )
                self.assertIsNotNone(res["action"])
                self.assertEqual(res["action"]["type"], "export_docx")
                self.assertEqual(res["action"]["data"]["questionCount"], 1)
                self.assertIn("Jacobian", res["action"]["data"]["questions"][0]["question"])

            asyncio.run(_run())
        finally:
            ai_conn.execute("DELETE FROM copilot_messages WHERE user_id = ?", (fake_uid,))
            ai_conn.commit()
            ai_conn.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
