import json
import os
from typing import List, Dict, Any
import google.generativeai as genai
from .prompts import BLOOM_SYSTEM_PROMPT

class QuestionGenerator:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY", "")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel("gemini-1.5-pro")
        else:
            self.model = None

    async def generate_questions_from_context(
        self,
        chunks: List[Dict[str, Any]],
        bloom_matrix: Dict[str, int]
    ) -> List[Dict[str, Any]]:
        # Format the context text with chunk IDs
        context_str = "\n\n".join([
            f"[CHUNK_ID: {c.get('chunk_id') or c.get('id')}] (Trang {c.get('page_number', c.get('metadata', {}).get('page_number', '?'))})\n{c.get('text', '')}"
            for c in chunks
        ])

        user_prompt = f"""
NGỮ CẢNH GIÁO TRÌNH:
{context_str}

YÊU CẦU MA TRẬN ĐỀ THI:
- Nhận biết: {bloom_matrix.get('nhanBiet', 2)} câu
- Thông hiểu: {bloom_matrix.get('thongHieu', 2)} câu
- Vận dụng: {bloom_matrix.get('vanDung', 1)} câu
- Phân tích: {bloom_matrix.get('phanTich', 0)} câu

Hãy sinh các câu hỏi trắc nghiệm tương ứng, tuân thủ đúng định dạng JSON yêu cầu.
"""

        # If Gemini API key is provided, execute real LLM call
        if self.model:
            response = self.model.generate_content(
                contents=[
                    {"role": "user", "parts": [BLOOM_SYSTEM_PROMPT, user_prompt]}
                ],
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text).get("questions", [])

        # Fallback high-quality mock generation for local test without API key
        return [
            {
                "id": "q-ai-01",
                "source_chunk_id": chunks[0].get("chunk_id", "chunk-1") if chunks else "chunk-1",
                "bloom_level": "Nhận biết",
                "question": "Theo quy luật cầu, trong điều kiện các yếu tố khác không đổi (ceteris paribus), điều gì xảy ra khi giá sản phẩm tăng lên?",
                "options": [
                  {"id": "opt-a", "label": "A", "text": "Lượng cầu về sản phẩm sẽ giảm xuống"},
                  {"id": "opt-b", "label": "B", "text": "Lượng cầu về sản phẩm sẽ tăng vọt"},
                  {"id": "opt-c", "label": "C", "text": "Cả lượng cung và lượng cầu đều bằng 0"},
                  {"id": "opt-d", "label": "D", "text": "Đường cầu sẽ dịch chuyển song song sang phải"}
                ],
                "correct_answer_id": "opt-a",
                "explanation": "Quy luật cầu phản ánh mối quan hệ nghịch biến giữa giá cả và lượng cầu của một hàng hóa.",
                "confidence_score": 98,
                "status": "pending"
            },
            {
                "id": "q-ai-02",
                "source_chunk_id": chunks[-1].get("chunk_id", "chunk-2") if chunks else "chunk-2",
                "bloom_level": "Vận dụng",
                "question": "Một sản phẩm có hệ số co giãn của cầu theo giá là |PED| = 2.0 (cầu co giãn mạnh). Doanh nghiệp muốn tăng tổng doanh thu thì nên quyết định thế nào?",
                "options": [
                  {"id": "opt-a", "label": "A", "text": "Tăng giá bán thêm 20%"},
                  {"id": "opt-b", "label": "B", "text": "Giảm nhẹ giá bán để kích cầu sản lượng vượt trội"},
                  {"id": "opt-c", "label": "C", "text": "Ngừng kinh doanh sản phẩm"},
                  {"id": "opt-d", "label": "D", "text": "Giữ nguyên giá và giảm 50% chi phí tiếp thị"}
                ],
                "correct_answer_id": "opt-b",
                "explanation": "Khi cầu co giãn mạnh (|PED| > 1), tỷ lệ tăng lượng bán ra sẽ lớn hơn tỷ lệ giảm giá, giúp tổng doanh thu tăng lên.",
                "confidence_score": 94,
                "status": "pending"
            }
        ]
