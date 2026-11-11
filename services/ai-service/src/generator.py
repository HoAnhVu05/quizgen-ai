import json
import os
import sys
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Configure trusted SSL certificates on Windows for gRPC and Google GenAI
try:
    import certifi
    ca_path = certifi.where()
    if os.path.exists(ca_path):
        os.environ["SSL_CERT_FILE"] = ca_path
        os.environ["REQUESTS_CA_BUNDLE"] = ca_path
        os.environ["GRPC_DEFAULT_SSL_ROOTS_FILE_PATH"] = ca_path
except Exception:
    pass

import google.generativeai as genai
try:
    from dotenv import load_dotenv
    load_dotenv()
    root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.env"))
    if os.path.exists(root_env):
        load_dotenv(root_env)
except Exception:
    pass

try:
    from .prompts import BLOOM_SYSTEM_PROMPT
except ImportError:
    from src.prompts import BLOOM_SYSTEM_PROMPT

class QuestionGenerator:
    def __init__(self):
        # Lấy API Key từ biến môi trường
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.model = None
        self.model_name = "gemini-2.5-flash"
        self._init_model()

    def _init_model(self):
        if self.api_key:
            for candidate in ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-2.5-pro"]:
                try:
                    genai.configure(api_key=self.api_key)
                    self.model = genai.GenerativeModel(candidate)
                    self.model_name = candidate
                    print(f"[AI-SERVICE] Model {candidate} connected successfully with API Key.")
                    break
                except Exception as e:
                    print(f"[AI-SERVICE] Model {candidate} test failed: {e}")
                    self.model = None

    async def generate_questions_from_context(
        self,
        chunks: List[Dict[str, Any]],
        bloom_matrix: Dict[str, int],
        document_id: str = "tb-001",
        chapter_name: str = "Nội dung trích xuất",
        textbook_name: str = "Tài liệu học liệu"
    ) -> List[Dict[str, Any]]:
        """
        Sinh danh sách câu hỏi trắc nghiệm theo đúng ma trận Bloom và bám sát 100% ngữ cảnh RAG từ tài liệu thực tế.
        Tuyệt đối không sử dụng dữ liệu mẫu (Zero Mock Data). Báo lỗi rõ ràng nếu không sinh được.
        """
        if not chunks:
            raise RuntimeError(f"Tài liệu '{textbook_name}' không có ngữ cảnh văn bản hợp lệ để sinh câu hỏi.")

        req_nhan_biet = bloom_matrix.get("nhanBiet") or bloom_matrix.get("nhan_biet") or 4
        req_thong_hieu = bloom_matrix.get("thongHieu") or bloom_matrix.get("thong_hieu") or 4
        req_van_dung = bloom_matrix.get("vanDung") or bloom_matrix.get("van_dung") or 2
        req_phan_tich = bloom_matrix.get("phanTich") or bloom_matrix.get("phan_tich") or 0

        # Chuẩn bị context text từ các chunks thực tế của tài liệu
        context_str = "\n\n".join([
            f"[CHUNK_ID: {c.get('chunk_id') or c.get('id')}] (Trang {c.get('page_number') or c.get('pageNumber', '?')})\n{c.get('text') or c.get('textSnippet') or c.get('text_snippet', '')}"
            for c in chunks
        ])

        user_prompt = f"""
NGỮ CẢNH HỌC LIỆU TỪ TÀI LIỆU '{textbook_name}':
{context_str}

YÊU CẦU MA TRẬN ĐỀ THI:
- Nhận biết: {req_nhan_biet} câu
- Thông hiểu: {req_thong_hieu} câu
- Vận dụng: {req_van_dung} câu
- Phân tích: {req_phan_tich} câu

LƯU Ý QUAN TRỌNG:
1. Toàn bộ câu hỏi, phương án và giải thích PHẢI BÁM SÁT 100% ngữ cảnh học liệu ở trên. Tuyệt đối không sinh câu hỏi ngoài phạm vi tài liệu.
2. Trả về đúng định dạng JSON có khóa "questions".
"""

        # Nếu chưa có model, thử khởi tạo lại
        if not self.model:
            self._init_model()

        if not self.model:
            raise RuntimeError("Chưa khởi tạo được mô hình Gemini AI. Vui lòng kiểm tra khóa API.")

        try:
            response = self.model.generate_content(
                contents=[
                    {"role": "user", "parts": [BLOOM_SYSTEM_PROMPT, user_prompt]}
                ],
                generation_config={"response_mime_type": "application/json"}
            )
            parsed = json.loads(response.text)
            raw_questions = parsed.get("questions", [])
            if not raw_questions:
                raise RuntimeError("Mô hình AI phản hồi rỗng hoặc không có câu hỏi hợp lệ trong JSON.")

            return self._normalize_questions(raw_questions, chunks, document_id, chapter_name, textbook_name)
        except Exception as exc:
            raise RuntimeError(f"Lỗi khi gọi mô hình Gemini AI: {str(exc)}")

    async def regenerate_single_question(
        self,
        question_id: str,
        current_question: Optional[Dict[str, Any]] = None,
        chunk_context: Optional[Dict[str, Any]] = None,
        bloom_level: str = "Thông hiểu",
        textbook_name: str = "Tài liệu học liệu"
    ) -> Dict[str, Any]:
        """Tái tạo 1 câu hỏi cụ thể dựa trên ngữ cảnh thực tế của chunk đã chọn"""
        chunk_id = chunk_context.get("id") or chunk_context.get("chunk_id", "chunk-1") if chunk_context else "chunk-1"
        page_num = chunk_context.get("page_number") or chunk_context.get("pageNumber", 1) if chunk_context else 1
        chunk_text = chunk_context.get("text") or chunk_context.get("textSnippet") or chunk_context.get("text_snippet", "") if chunk_context else ""
        current_chapter = current_question.get("chapter", "Nội dung chương") if current_question else "Nội dung chương"

        if self.model and chunk_text:
            try:
                single_prompt = f"""
Dựa trên ngữ cảnh trích đoạn sau từ tài liệu '{textbook_name}' (Trang {page_num}):
{chunk_text}

Hãy biên soạn lại 01 câu hỏi trắc nghiệm mới ở mức độ Bloom: {bloom_level}.
Định dạng JSON trả về:
{{
  "question": "Nội dung câu hỏi",
  "options": [
    {{"id": "opt-a", "label": "A", "text": "Phương án A"}},
    {{"id": "opt-b", "label": "B", "text": "Phương án B"}},
    {{"id": "opt-c", "label": "C", "text": "Phương án C"}},
    {{"id": "opt-d", "label": "D", "text": "Phương án D"}}
  ],
  "correctAnswerId": "opt-a",
  "explanation": "Giải thích chi tiết căn cứ theo ngữ cảnh",
  "confidenceScore": 95
}}
"""
                response = self.model.generate_content(
                    contents=[
                        {"role": "user", "parts": [BLOOM_SYSTEM_PROMPT, single_prompt]}
                    ],
                    generation_config={"response_mime_type": "application/json"}
                )
                parsed = json.loads(response.text)
                return {
                    "id": question_id,
                    "sourceChunkId": chunk_id,
                    "source_chunk_id": chunk_id,
                    "pageNumber": page_num,
                    "textbookName": textbook_name,
                    "textbook_name": textbook_name,
                    "chapter": current_chapter,
                    "bloomLevel": bloom_level,
                    "bloom_level": bloom_level,
                    "question": parsed.get("question", current_question.get("question", "") if current_question else ""),
                    "options": parsed.get("options", []),
                    "correctAnswerId": parsed.get("correctAnswerId", "opt-a"),
                    "correct_answer_id": parsed.get("correctAnswerId", "opt-a"),
                    "explanation": parsed.get("explanation", "Trích xuất từ nội dung tài liệu."),
                    "confidenceScore": parsed.get("confidenceScore", 95),
                    "confidence_score": parsed.get("confidenceScore", 95),
                    "status": "pending",
                    "createdAt": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                }
            except Exception as e:
                print(f"[AI-SERVICE] Lỗi khi tái tạo câu hỏi đơn bằng Gemini: {e}")

        # Nếu không có text hoặc gọi lỗi, giữ nguyên câu hỏi hiện tại hoặc cập nhật thông báo
        orig_q = current_question.get("question", "Câu hỏi trắc nghiệm") if current_question else "Câu hỏi trắc nghiệm"
        orig_opts = current_question.get("options", []) if current_question else []
        return {
            "id": question_id,
            "sourceChunkId": chunk_id,
            "source_chunk_id": chunk_id,
            "pageNumber": page_num,
            "textbookName": textbook_name,
            "textbook_name": textbook_name,
            "chapter": current_chapter,
            "bloomLevel": bloom_level,
            "bloom_level": bloom_level,
            "question": orig_q,
            "options": orig_opts,
            "correctAnswerId": current_question.get("correctAnswerId", "opt-a") if current_question else "opt-a",
            "correct_answer_id": current_question.get("correctAnswerId", "opt-a") if current_question else "opt-a",
            "explanation": current_question.get("explanation", "Trích xuất từ tài liệu.") if current_question else "Trích xuất từ tài liệu.",
            "confidenceScore": 95,
            "confidence_score": 95,
            "status": "pending",
            "createdAt": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }

    def _normalize_questions(
        self,
        raw_list: List[Dict[str, Any]],
        chunks: List[Dict[str, Any]],
        document_id: str,
        chapter_name: str,
        textbook_name: str = ""
    ) -> List[Dict[str, Any]]:
        """Bổ sung đầy đủ các trường tương thích kép camelCase và snake_case"""
        normalized = []
        default_chunk_id = chunks[0].get("chunk_id") or chunks[0].get("id", "chunk-1") if chunks else "chunk-1"
        default_page = chunks[0].get("page_number") or chunks[0].get("pageNumber", 1) if chunks else 1

        for idx, q in enumerate(raw_list):
            q_id = f"q-{int(time.time()*1000) % 1000000}-{idx+1}"
            chunk_id = q.get("source_chunk_id") or q.get("sourceChunkId") or default_chunk_id
            page_num = q.get("page_number") or q.get("pageNumber") or default_page
            bloom = q.get("bloom_level") or q.get("bloomLevel") or "Nhận biết"
            correct_id = q.get("correct_answer_id") or q.get("correctAnswerId") or "opt-a"
            conf = q.get("confidence_score") or q.get("confidenceScore") or 95

            item = {
                "id": q_id,
                "sourceChunkId": chunk_id,
                "source_chunk_id": chunk_id,
                "pageNumber": page_num,
                "textbookName": textbook_name or "Tài liệu học phần",
                "textbook_name": textbook_name or "Tài liệu học phần",
                "chapter": chapter_name,
                "bloomLevel": bloom,
                "bloom_level": bloom,
                "question": q.get("question", "Nội dung câu hỏi trắc nghiệm"),
                "options": q.get("options", []),
                "correctAnswerId": correct_id,
                "correct_answer_id": correct_id,
                "explanation": q.get("explanation", "Căn cứ theo nội dung tài liệu trích xuất."),
                "confidenceScore": conf,
                "confidence_score": conf,
                "status": "pending",
                "createdAt": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            }
            normalized.append(item)
        return normalized
