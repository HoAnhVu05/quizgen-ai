import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

from dotenv import load_dotenv
from google import genai
from google.genai import types

from .prompts import BLOOM_SYSTEM_PROMPT

# Load .env từ thư mục root của project
_root_env = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(dotenv_path=_root_env)


class QuestionGenerator:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY", "")
        if api_key:
            self.client = genai.Client(api_key=api_key)
            self.model_name = "gemini-3.8-flash"
        else:
            self.client = None
            self.model_name = None

    # ─── Format context từ danh sách chunks ─────────────────────────────────
    def _build_context(self, chunks: List[Dict[str, Any]]) -> str:
        return "\n\n".join([
            f"[CHUNK_ID: {c.get('chunk_id') or c.get('id', 'unknown')}]"
            f" (Trang {c.get('page_number') or c.get('metadata', {}).get('page_number', '?')})\n"
            f"{c.get('text', '')}"
            for c in chunks
        ])

    # ─── Map snake_case từ LLM → camelCase cho Frontend ─────────────────────
    def _map_to_camel(self, q: dict, index: int) -> dict:
        return {
            "id": q.get("id", f"q-{uuid.uuid4().hex[:6]}"),
            "sourceChunkId": q.get("source_chunk_id", ""),
            "bloomLevel": q.get("bloom_level", "Nhận biết"),
            "question": q.get("question", ""),
            "options": q.get("options", []),
            "correctAnswerId": q.get("correct_answer_id", "opt-a"),
            "explanation": q.get("explanation", ""),
            "confidenceScore": q.get("confidence_score", 90),
            "status": "pending",
            "createdAt": datetime.now().isoformat(),
        }

    # ─── Gọi Gemini sinh câu hỏi ─────────────────────────────────────────────
    async def generate_questions_from_context(
        self,
        chunks: List[Dict[str, Any]],
        bloom_matrix: Dict[str, int],
    ) -> List[Dict[str, Any]]:
        context_str = self._build_context(chunks)

        user_prompt = f"""NGỮ CẢNH GIÁO TRÌNH:
{context_str}

YÊU CẦU MA TRẬN ĐỀ THI (Bloom Taxonomy):
- Nhận biết: {bloom_matrix.get('nhanBiet', 2)} câu
- Thông hiểu: {bloom_matrix.get('thongHieu', 2)} câu
- Vận dụng: {bloom_matrix.get('vanDung', 1)} câu
- Phân tích: {bloom_matrix.get('phanTich', 0)} câu

Hãy sinh các câu hỏi trắc nghiệm tương ứng, tuân thủ đúng định dạng JSON yêu cầu."""

        if self.client:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=f"{BLOOM_SYSTEM_PROMPT}\n\n{user_prompt}",
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                ),
            )
            raw_questions = json.loads(response.text).get("questions", [])
        else:
            # Fallback mock khi không có API key
            raw_questions = self._mock_questions(chunks)

        return [self._map_to_camel(q, i) for i, q in enumerate(raw_questions)]

    # ─── Sinh lại 1 câu hỏi cụ thể ──────────────────────────────────────────
    async def regenerate_single_question(
        self,
        original_question: dict,
        chunk_text: str,
        bloom_level: str,
    ) -> Dict[str, Any]:
        user_prompt = f"""NGỮ CẢNH GIÁO TRÌNH:
{chunk_text}

YÊU CẦU: Sinh lại MỘT câu hỏi trắc nghiệm mới ở mức độ Bloom "{bloom_level}".
Câu hỏi cũ (cần thay thế): "{original_question.get('question', '')}"
Phương án nhiễu cần được cải thiện, không lặp lại câu hỏi cũ.

YÊU CẦU MA TRẬN ĐỀ THI:
- {bloom_level}: 1 câu"""

        if self.client:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=f"{BLOOM_SYSTEM_PROMPT}\n\n{user_prompt}",
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                ),
            )
            raw_questions = json.loads(response.text).get("questions", [])
            if raw_questions:
                return self._map_to_camel(raw_questions[0], 0)

        # Fallback nếu không có model
        return self._map_to_camel(self._mock_questions([])[0], 0)

    # ─── Mock data dùng khi không có API key ─────────────────────────────────
    def _mock_questions(self, chunks: List[Dict[str, Any]]) -> List[dict]:
        chunk_id = chunks[0].get("chunk_id", "chunk-1") if chunks else "chunk-1"
        return [
            {
                "source_chunk_id": chunk_id,
                "bloom_level": "Nhận biết",
                "question": "Theo quy luật cầu, trong điều kiện các yếu tố khác không đổi (ceteris paribus), điều gì xảy ra khi giá sản phẩm tăng lên?",
                "options": [
                    {"id": "opt-a", "label": "A", "text": "Lượng cầu về sản phẩm sẽ giảm xuống"},
                    {"id": "opt-b", "label": "B", "text": "Lượng cầu về sản phẩm sẽ tăng vọt"},
                    {"id": "opt-c", "label": "C", "text": "Cả lượng cung và lượng cầu đều bằng 0"},
                    {"id": "opt-d", "label": "D", "text": "Đường cầu sẽ dịch chuyển song song sang phải"},
                ],
                "correct_answer_id": "opt-a",
                "explanation": "Quy luật cầu phản ánh mối quan hệ nghịch biến giữa giá cả và lượng cầu.",
                "confidence_score": 98,
            },
            {
                "source_chunk_id": chunk_id,
                "bloom_level": "Vận dụng",
                "question": "Một sản phẩm có hệ số co giãn cầu theo giá |PED| = 2.0. Doanh nghiệp muốn tăng doanh thu thì nên?",
                "options": [
                    {"id": "opt-a", "label": "A", "text": "Tăng giá bán thêm 20%"},
                    {"id": "opt-b", "label": "B", "text": "Giảm nhẹ giá bán để kích cầu sản lượng vượt trội"},
                    {"id": "opt-c", "label": "C", "text": "Ngừng kinh doanh sản phẩm"},
                    {"id": "opt-d", "label": "D", "text": "Giữ nguyên giá và giảm 50% chi phí tiếp thị"},
                ],
                "correct_answer_id": "opt-b",
                "explanation": "Khi cầu co giãn mạnh (|PED| > 1), giảm giá làm tổng doanh thu tăng.",
                "confidence_score": 94,
            },
        ]
