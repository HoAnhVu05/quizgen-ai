# -*- coding: utf-8 -*-
"""
QUIZGEN AI - QUESTION GENERATOR
Mô-đun sinh câu hỏi trắc nghiệm Đa phương thức (Multimodal Question Generator):
- Tích hợp Gemini 2.5 Flash Vision hỗ trợ đồng thời Văn bản học liệu & Hình vẽ/Đồ thị/Sơ đồ
- Chuẩn hóa đầu ra công thức khoa học dạng LaTeX ($...$)
- Gán cờ `has_image`, `image_url`, `image_caption` và `has_formula`
"""

import json
import os
import sys
import time
import base64
import io
import re
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

from PIL import Image
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

    def _prepare_image_part(self, img_data: Any) -> Optional[Image.Image]:
        """Chuyển đổi dữ liệu ảnh (file path, bytes, base64 hoặc PIL.Image) thành đối tượng PIL.Image"""
        if isinstance(img_data, Image.Image):
            return img_data
        if isinstance(img_data, str):
            # 1. Kiểm tra nếu là file path trên ổ đĩa
            if os.path.exists(img_data):
                try:
                    return Image.open(img_data)
                except Exception as err:
                    print(f"[AI-SERVICE] Không thể mở ảnh từ đường dẫn {img_data}: {err}")
            # 2. Kiểm tra nếu là base64 data URI
            if "base64," in img_data:
                img_data = img_data.split("base64,")[1]
            try:
                raw_bytes = base64.b64decode(img_data)
                return Image.open(io.BytesIO(raw_bytes))
            except Exception:
                pass
        elif isinstance(img_data, bytes):
            try:
                return Image.open(io.BytesIO(img_data))
            except Exception:
                pass
        return None

    @staticmethod
    def _parse_json_safely(raw_text: str) -> Dict[str, Any]:
        """Giải mã JSON từ LLM an toàn, xử lý các ký tự backslash trong công thức LaTeX (\omega, \pi, \frac...)"""
        if not raw_text:
            return {}
        cleaned = raw_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        # 1. Thử phân tích cú pháp tiêu chuẩn
        try:
            return json.loads(cleaned, strict=False)
        except Exception:
            pass

        # 2. Xử lý escape các ký tự backslash của LaTeX chưa được nhân đôi
        # Thay thế mọi dấu \ không nằm trước các ký tự escape hợp lệ của JSON: ", \, /, b, f, n, r, t, u
        repaired = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', cleaned)
        try:
            return json.loads(repaired, strict=False)
        except Exception:
            pass

        # 3. Tự động thay thế \ bằng \\ nếu \ đứng đơn độc
        repaired2 = re.sub(r'(?<!\\)\\(?!\\)', r'\\\\', cleaned)
        try:
            return json.loads(repaired2, strict=False)
        except Exception as e:
            raise ValueError(f"Không thể giải mã JSON chứa công thức LaTeX: {e}")

    async def generate_questions_from_context(
        self,
        chunks: List[Dict[str, Any]],
        bloom_matrix: Dict[str, int],
        document_id: str = "tb-001",
        chapter_name: str = "Nội dung trích xuất",
        textbook_name: str = "Tài liệu học liệu",
        images: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Sinh danh sách câu hỏi trắc nghiệm Đa phương thức:
        - Bám sát ma trận nhận thức Bloom (Nhận biết, Thông hiểu, Vận dụng, Phân tích)
        - Tiếp nhận cả khối Text ngữ cảnh và Hình ảnh sơ đồ / đồ thị học liệu
        - Tự động chuẩn hóa công thức dạng LaTeX ($...$)
        """
        if not chunks:
            raise RuntimeError(f"Tài liệu '{textbook_name}' không có ngữ cảnh văn bản hợp lệ để sinh câu hỏi.")

        req_nhan_biet = bloom_matrix.get("nhanBiet") or bloom_matrix.get("nhan_biet") or 4
        req_thong_hieu = bloom_matrix.get("thongHieu") or bloom_matrix.get("thong_hieu") or 4
        req_van_dung = bloom_matrix.get("vanDung") or bloom_matrix.get("van_dung") or 2
        req_phan_tich = bloom_matrix.get("phanTich") or bloom_matrix.get("phan_tich") or 0

        # 1. Chuẩn bị context text từ các chunks thực tế của tài liệu
        context_str = "\n\n".join([
            f"[CHUNK_ID: {c.get('chunk_id') or c.get('id')}] (Trang {c.get('page_number') or c.get('pageNumber', '?')})\n{c.get('text') or c.get('textSnippet') or c.get('text_snippet', '')}"
            for c in chunks
        ])

        # 2. Tập hợp danh sách ảnh từ cả tham số images và các chunks đính kèm
        all_images_meta: List[Dict[str, Any]] = []
        if images:
            all_images_meta.extend(images)
        for c in chunks:
            assoc = c.get("associated_images") or c.get("images") or []
            if isinstance(assoc, list):
                for img_item in assoc:
                    if isinstance(img_item, dict) and img_item not in all_images_meta:
                        all_images_meta.append(img_item)

        images_prompt_desc = ""
        loaded_pil_images: List[Image.Image] = []
        if all_images_meta:
            images_prompt_desc = "\n\nDANH SÁCH HÌNH ẢNH / SƠ ĐỒ / ĐỒ THỊ ĐÍNH KÈM TỪ GIÁO TRÌNH:\n"
            for idx, img_info in enumerate(all_images_meta):
                img_id = img_info.get("id") or img_info.get("image_id") or f"fig-{idx+1}"
                img_url = img_info.get("url") or img_info.get("image_url") or img_info.get("path") or f"/uploads/figures/{img_id}.png"
                img_caption = img_info.get("caption") or img_info.get("title") or f"Hình {idx+1}: Sơ đồ minh họa kiến thức"
                page = img_info.get("page_number") or img_info.get("pageNumber") or "?"
                images_prompt_desc += f"- [HÌNH VẼ #{idx+1}]: ID: '{img_id}' | Đường dẫn: '{img_url}' | Chú thích: '{img_caption}' (Trang {page})\n"

                # Nạp ảnh dạng PIL để truyền vào Gemini Vision
                pil_img = self._prepare_image_part(
                    img_info.get("data") or img_info.get("path") or img_info.get("image_path") or img_info.get("base64")
                )
                if pil_img:
                    loaded_pil_images.append(pil_img)

        user_prompt = f"""
NGỮ CẢNH HỌC LIỆU TỪ TÀI LIỆU '{textbook_name}':
{context_str}
{images_prompt_desc}

YÊU CẦU MA TRẬN ĐỀ THI:
- Nhận biết: {req_nhan_biet} câu
- Thông hiểu: {req_thong_hieu} câu
- Vận dụng: {req_van_dung} câu
- Phân tích: {req_phan_tich} câu

LƯU Ý QUAN TRỌNG:
1. Toàn bộ câu hỏi, phương án và giải thích PHẢI BÁM SÁT 100% ngữ cảnh học liệu ở trên.
2. Với các câu hỏi Toán, Vật lý, Kỹ thuật có công thức, BẮT BUỘC dùng định dạng LaTeX ($...$).
3. Nếu có hình ảnh đính kèm, hãy ưu tiên thiết kế câu hỏi khai thác thông tin từ hình (gán has_image: true, image_url và image_caption tương ứng).
4. Trả về đúng định dạng JSON có khóa "questions".
"""

        # Nếu chưa có model, thử khởi tạo lại
        if not self.model:
            self._init_model()

        if not self.model:
            raise RuntimeError("Chưa khởi tạo được mô hình Gemini AI. Vui lòng kiểm tra khóa API.")

        try:
            # Chuẩn bị contents gửi lên Gemini (hỗ trợ Text + PIL Images trực tiếp)
            parts: List[Any] = [BLOOM_SYSTEM_PROMPT, user_prompt]
            if loaded_pil_images:
                parts.extend(loaded_pil_images)

            response = self.model.generate_content(
                contents=[{"role": "user", "parts": parts}],
                generation_config={"response_mime_type": "application/json"}
            )
            parsed = self._parse_json_safely(response.text)
            raw_questions = parsed.get("questions", [])
            if not raw_questions:
                raise RuntimeError("Mô hình AI phản hồi rỗng hoặc không có câu hỏi hợp lệ trong JSON.")

            return self._normalize_questions(raw_questions, chunks, document_id, chapter_name, textbook_name, all_images_meta)
        except Exception as exc:
            raise RuntimeError(f"Lỗi khi gọi mô hình Gemini AI: {str(exc)}")

    async def regenerate_single_question(
        self,
        question_id: str,
        current_question: Optional[Dict[str, Any]] = None,
        chunk_context: Optional[Dict[str, Any]] = None,
        bloom_level: str = "Thông hiểu",
        textbook_name: str = "Tài liệu học liệu",
        image_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Tái tạo 01 câu hỏi cụ thể, hỗ trợ cả ngữ cảnh hình vẽ và định dạng LaTeX"""
        chunk_id = chunk_context.get("id") or chunk_context.get("chunk_id", "chunk-1") if chunk_context else "chunk-1"
        page_num = chunk_context.get("page_number") or chunk_context.get("pageNumber", 1) if chunk_context else 1
        chunk_text = chunk_context.get("text") or chunk_context.get("textSnippet") or chunk_context.get("text_snippet", "") if chunk_context else ""
        current_chapter = current_question.get("chapter", "Nội dung chương") if current_question else "Nội dung chương"

        img_desc = ""
        loaded_pil = None
        if image_context:
            img_url = image_context.get("url") or image_context.get("image_url", "")
            img_caption = image_context.get("caption", "Hình vẽ minh họa")
            img_desc = f"\nHÌNH ẢNH MINH HỌA ĐÍNH KÈM: '{img_url}' - Chú thích: {img_caption}\n"
            loaded_pil = self._prepare_image_part(
                image_context.get("data") or image_context.get("path") or image_context.get("base64")
            )

        if self.model and (chunk_text or loaded_pil):
            try:
                single_prompt = f"""
Dựa trên ngữ cảnh trích đoạn sau từ tài liệu '{textbook_name}' (Trang {page_num}):
{chunk_text}
{img_desc}

Hãy biên soạn lại 01 câu hỏi trắc nghiệm mới ở mức độ Bloom: {bloom_level}.
LƯU Ý: Mọi công thức Toán/Lý phải chuẩn LaTeX ($...$).
Định dạng JSON trả về:
{{
  "question": "Nội dung câu hỏi (chứa LaTeX nếu có)?",
  "has_image": { "true" if loaded_pil else "false" },
  "image_url": "{ image_context.get('url', '') if image_context else '' }",
  "image_caption": "{ image_context.get('caption', '') if image_context else '' }",
  "has_formula": true,
  "options": [
    {{"id": "opt-a", "label": "A", "text": "Phương án A"}},
    {{"id": "opt-b", "label": "B", "text": "Phương án B"}},
    {{"id": "opt-c", "label": "C", "text": "Phương án C"}},
    {{"id": "opt-d", "label": "D", "text": "Phương án D"}}
  ],
  "correctAnswerId": "opt-a",
  "explanation": "Giải thích chi tiết các bước giải và căn cứ theo ngữ cảnh",
  "confidenceScore": 95
}}
"""
                parts: List[Any] = [BLOOM_SYSTEM_PROMPT, single_prompt]
                if loaded_pil:
                    parts.append(loaded_pil)

                response = self.model.generate_content(
                    contents=[{"role": "user", "parts": parts}],
                    generation_config={"response_mime_type": "application/json"}
                )
                parsed = self._parse_json_safely(response.text)
                has_img = bool(parsed.get("has_image") or parsed.get("hasImage") or (image_context is not None))
                img_url = parsed.get("image_url") or parsed.get("imageUrl") or (image_context.get("url") if image_context else None)
                img_cap = parsed.get("image_caption") or parsed.get("imageCaption") or (image_context.get("caption") if image_context else None)
                q_text = parsed.get("question", current_question.get("question", "") if current_question else "")
                has_form = bool(parsed.get("has_formula") or parsed.get("hasFormula") or ("$" in q_text))

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
                    "question": q_text,
                    "hasImage": has_img,
                    "has_image": has_img,
                    "imageUrl": img_url,
                    "image_url": img_url,
                    "imageCaption": img_cap,
                    "image_caption": img_cap,
                    "hasFormula": has_form,
                    "has_formula": has_form,
                    "options": parsed.get("options", []),
                    "correctAnswerId": parsed.get("correctAnswerId", parsed.get("correct_answer_id", "opt-a")),
                    "correct_answer_id": parsed.get("correctAnswerId", parsed.get("correct_answer_id", "opt-a")),
                    "explanation": parsed.get("explanation", "Trích xuất từ nội dung tài liệu."),
                    "confidenceScore": parsed.get("confidenceScore", 95),
                    "confidence_score": parsed.get("confidenceScore", 95),
                    "status": "pending",
                    "createdAt": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                }
            except Exception as e:
                print(f"[AI-SERVICE] Lỗi khi tái tạo câu hỏi đơn bằng Gemini: {e}")

        # Fallback an toàn nếu lỗi mạng hoặc không có API
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
            "hasImage": current_question.get("hasImage", False) if current_question else False,
            "has_image": current_question.get("has_image", False) if current_question else False,
            "imageUrl": current_question.get("imageUrl") if current_question else None,
            "image_url": current_question.get("image_url") if current_question else None,
            "imageCaption": current_question.get("imageCaption") if current_question else None,
            "image_caption": current_question.get("image_caption") if current_question else None,
            "hasFormula": ("$" in orig_q),
            "has_formula": ("$" in orig_q),
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
        textbook_name: str = "",
        images_meta: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """Bổ sung đầy đủ các trường tương thích kép camelCase và snake_case cho Frontend & Database"""
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
            q_text = q.get("question", "Nội dung câu hỏi trắc nghiệm")

            # Xử lý trường thông tin Hình ảnh Đa phương thức
            has_img = bool(q.get("has_image") or q.get("hasImage") or q.get("image_url") or q.get("imageUrl"))
            img_url = q.get("image_url") or q.get("imageUrl") or None
            img_caption = q.get("image_caption") or q.get("imageCaption") or None

            # Nếu model quên điền URL nhưng đánh dấu có ảnh và có images_meta, tự gán ảnh phù hợp
            if has_img and not img_url and images_meta:
                first_img = images_meta[min(idx, len(images_meta)-1)]
                img_url = first_img.get("url") or first_img.get("image_url") or first_img.get("path")
                img_caption = img_caption or first_img.get("caption") or first_img.get("title")

            # Tự động nhận diện công thức LaTeX nếu chứa ký hiệu $
            has_formula = bool(
                q.get("has_formula") or 
                q.get("hasFormula") or 
                ("$" in q_text) or 
                any("$" in opt.get("text", "") for opt in q.get("options", []))
            )

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
                "question": q_text,
                "hasImage": has_img,
                "has_image": has_img,
                "imageUrl": img_url,
                "image_url": img_url,
                "imageCaption": img_caption,
                "image_caption": img_caption,
                "hasFormula": has_formula,
                "has_formula": has_formula,
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
