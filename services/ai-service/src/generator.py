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
import asyncio
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
        self.model_name = "gemini-2.5-flash-lite"
        self._init_model()

    def _init_model(self):
        if self.api_key:
            for candidate in ["gemini-2.5-flash-lite", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.5-pro"]:
                try:
                    genai.configure(api_key=self.api_key)
                    self.model = genai.GenerativeModel(candidate)
                    self.model_name = candidate
                    print(f"[AI-SERVICE] Model {candidate} connected successfully with API Key.")
                    break
                except Exception as e:
                    print(f"[AI-SERVICE] Model {candidate} test failed: {e}")
                    self.model = None

    def _generate_with_fallback(self, system_instruction: Optional[str] = None, **kwargs):
        """Tự động chuyển tiếp mô hình dự phòng nếu một mô hình chạm hạn mức Quota (429)"""
        candidates = [self.model_name, "gemini-2.5-flash-lite", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.5-pro"]
        seen = set()
        unique_candidates = [c for c in candidates if not (c in seen or seen.add(c))]
        last_err = None
        for cand in unique_candidates:
            try:
                m = genai.GenerativeModel(cand, system_instruction=system_instruction) if system_instruction else genai.GenerativeModel(cand)
                res = m.generate_content(**kwargs)
                self.model = m
                self.model_name = cand
                return res
            except Exception as e:
                last_err = e
                err_str = str(e).lower()
                if "429" in err_str or "quota" in err_str or "not found" in err_str or "404" in err_str:
                    print(f"[AI-SERVICE] Chuyển đổi mô hình dự phòng sau lỗi {cand}: {e}")
                    continue
                raise e
        if last_err:
            raise last_err

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
        """Giải mã JSON từ LLM an toàn tuyệt đối, xử lý mọi công thức LaTeX (\lambda, \frac, \begin...) và dấu phẩy thừa"""
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

        # 1. Thử giải mã tiêu chuẩn
        try:
            return json.loads(cleaned, strict=False)
        except Exception:
            pass

        # 2. Sử dụng thư viện json_repair chuyên dụng phục hồi JSON chứa LaTeX từ LLM
        try:
            import json_repair
            repaired_obj = json_repair.loads(cleaned)
            if isinstance(repaired_obj, dict):
                return repaired_obj
            elif isinstance(repaired_obj, list):
                return {"questions": repaired_obj}
        except Exception:
            pass

        # 3. Fallback: Escape các ký tự backslash của LaTeX chưa được nhân đôi
        try:
            repaired = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', cleaned)
            return json.loads(repaired, strict=False)
        except Exception:
            pass

        # 4. Fallback: Trích xuất khối JSON bao bởi { ... }
        try:
            m = re.search(r"(\{.*\})", cleaned, re.DOTALL)
            if m:
                import json_repair
                obj = json_repair.loads(m.group(1))
                if isinstance(obj, dict):
                    return obj
                elif isinstance(obj, list):
                    return {"questions": obj}
        except Exception:
            pass

        raise ValueError("Không thể giải mã cấu trúc JSON câu hỏi từ phản hồi của mô hình AI.")

    async def generate_questions_from_context(
        self,
        chunks: List[Dict[str, Any]],
        bloom_matrix: Dict[str, int],
        document_id: str = "tb-001",
        chapter_name: str = "Nội dung trích xuất",
        textbook_name: str = "Tài liệu học liệu",
        images: Optional[List[Dict[str, Any]]] = None,
        pedagogical_prompt: Optional[str] = ""
    ) -> List[Dict[str, Any]]:
        """
        Sinh danh sách câu hỏi trắc nghiệm Đa phương thức:
        - Bám sát ma trận nhận thức Bloom (Nhận biết, Thông hiểu, Vận dụng, Phân tích)
        - Tiếp nhận cả khối Text ngữ cảnh và Hình ảnh sơ đồ / đồ thị học liệu
        - Tự động chuẩn hóa công thức dạng LaTeX ($...$)
        - Hỗ trợ định hướng sư phạm tự do (pedagogical_prompt)
        - Tự động chạy song song (Parallel Batching) qua asyncio.gather để tăng tốc sinh đề
        """
        if not chunks:
            raise RuntimeError(f"Tài liệu '{textbook_name}' không có ngữ cảnh văn bản hợp lệ để sinh câu hỏi.")

        req_nhan_biet = bloom_matrix.get("nhanBiet") or bloom_matrix.get("nhan_biet") or 4
        req_thong_hieu = bloom_matrix.get("thongHieu") or bloom_matrix.get("thong_hieu") or 4
        req_van_dung = bloom_matrix.get("vanDung") or bloom_matrix.get("van_dung") or 2
        req_phan_tich = bloom_matrix.get("phanTich") or bloom_matrix.get("phan_tich") or 0
        total_questions = req_nhan_biet + req_thong_hieu + req_van_dung + req_phan_tich

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

        # Định hướng sư phạm bổ sung từ thầy cô
        guidance_text = ""
        if pedagogical_prompt and pedagogical_prompt.strip():
            guidance_text = f"""
CHỈ ĐẠO SƯ PHẠM ĐẶC BIỆT TỪ GIẢNG VIÊN (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT):
"{pedagogical_prompt.strip()}"
Hãy vận dụng chỉ đạo trên để định hướng chủ đề câu hỏi, bối cảnh thực tế và cấu trúc câu hỏi.
"""

        # Nếu chưa có model, thử khởi tạo lại
        if not self.model:
            self._init_model()

        if not self.model:
            raise RuntimeError("Chưa khởi tạo được mô hình Gemini AI. Vui lòng kiểm tra khóa API.")

        # Helper tạo prompt cho từng slice/batch
        def _build_batch_prompt(matrix_desc: str) -> str:
            return f"""
NGỮ CẢNH HỌC LIỆU TỪ TÀI LIỆU '{textbook_name}':
{context_str}
{images_prompt_desc}
{guidance_text}

YÊU CẦU MA TRẬN ĐỀ THI CHO ĐỢT NÀY:
{matrix_desc}

LƯU Ý QUAN TRỌNG:
1. Toàn bộ câu hỏi, phương án và giải thích PHẢI BÁM SÁT 100% ngữ cảnh học liệu ở trên.
2. Với các câu hỏi Toán, Vật lý, Kỹ thuật có công thức, BẮT BUỘC dùng định dạng LaTeX ($...$). Trong JSON, hãy escape các dấu gạch chéo ngược (ví dụ: \\frac, \\sum, \\alpha) để đảm bảo chuỗi JSON hợp lệ.
3. Nếu có hình ảnh đính kèm, hãy ưu tiên thiết kế câu hỏi khai thác thông tin từ hình (gán has_image: true, image_url và image_caption tương ứng).
4. Trả về đúng định dạng JSON có khóa "questions".
"""

        # ─── TĂNG TỐC ĐỘ: Parallel Batching với asyncio.gather khi tổng câu hỏi > 4 ───
        if total_questions > 4:
            sub_tasks_matrix = []
            if req_nhan_biet > 0:
                sub_tasks_matrix.append(f"- Nhận biết: {req_nhan_biet} câu")
            if req_thong_hieu > 0:
                sub_tasks_matrix.append(f"- Thông hiểu: {req_thong_hieu} câu")
            van_phan = []
            if req_van_dung > 0:
                van_phan.append(f"- Vận dụng: {req_van_dung} câu")
            if req_phan_tich > 0:
                van_phan.append(f"- Phân tích: {req_phan_tich} câu")
            if van_phan:
                sub_tasks_matrix.append("\n".join(van_phan))

            async def _run_sub_batch(matrix_desc: str) -> List[Dict[str, Any]]:
                b_prompt = _build_batch_prompt(matrix_desc)
                b_parts: List[Any] = [BLOOM_SYSTEM_PROMPT, b_prompt]
                if loaded_pil_images:
                    b_parts.extend(loaded_pil_images)
                resp = await asyncio.to_thread(
                    self._generate_with_fallback,
                    contents=[{"role": "user", "parts": b_parts}],
                    generation_config={"response_mime_type": "application/json"}
                )
                parsed = self._parse_json_safely(resp.text)
                return parsed.get("questions", [])

            try:
                batch_results = await asyncio.gather(*[_run_sub_batch(m) for m in sub_tasks_matrix], return_exceptions=True)
                gathered_questions = []
                for res in batch_results:
                    if isinstance(res, list):
                        gathered_questions.extend(res)
                if gathered_questions:
                    return self._normalize_questions(gathered_questions, chunks, document_id, chapter_name, textbook_name, all_images_meta)
            except Exception as e:
                print(f"[AI GENERATOR] Warning in parallel batch: {e}, falling back to single batch.")

        # Fallback hoặc khi số câu hỏi <= 4: Chạy 1 batch tổng
        full_matrix_desc = f"""- Nhận biết: {req_nhan_biet} câu
- Thông hiểu: {req_thong_hieu} câu
- Vận dụng: {req_van_dung} câu
- Phân tích: {req_phan_tich} câu"""
        user_prompt = _build_batch_prompt(full_matrix_desc)

        try:
            parts: List[Any] = [BLOOM_SYSTEM_PROMPT, user_prompt]
            if loaded_pil_images:
                parts.extend(loaded_pil_images)

            response = await asyncio.to_thread(
                self._generate_with_fallback,
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

                response = self._generate_with_fallback(
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

    async def chat_with_copilot(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Trò chuyện thông minh với QuizGen Copilot có nhận thức ngữ cảnh học thuật và màn hình hiện tại"""
        if not self.model:
            self._init_model()

        ctx = context or {}
        screen = ctx.get("currentScreen", "dashboard")
        screen_label = ctx.get("screenLabel", "Không gian làm việc")
        active_question = ctx.get("activeQuestion")
        user_name = ctx.get("userName", "anh")
        doc_id = ctx.get("documentId") or ctx.get("document_id")
        doc_name = ctx.get("documentName") or ctx.get("document_name")
        doc_pages = ctx.get("documentPages")
        all_docs = ctx.get("allDocuments") or []
        doc_chunks = ctx.get("docChunks") or ctx.get("chunks") or []

        is_remote_agent = ctx.get("isRemoteCommander") or ctx.get("isAntigravityRemote") or screen == "admin_secret_command_center"

        if is_remote_agent:
            system_instruction = f"""
Bạn là Antigravity — Trợ lý AI Full-stack (Google DeepMind Engine) đang trực tiếp túc trực và làm việc trong workspace D:\\HKDN\\Quizgen AI trên laptop của anh {user_name}.
Bạn là kỹ sư phần mềm cao cấp kiêm trợ lý điều khiển workspace từ xa qua ứng dụng Antigravity Remote.

QUY TẮC BẮT BUỘC VỀ VAI TRÒ & XƯNG HÔ:
1. XƯNG HÔ: Luôn xưng là "em" và gọi người dùng là "anh" (hoặc "anh {user_name}"). TUYỆT ĐỐI KHÔNG xưng là Quanta, KHÔNG gọi người dùng là "Thầy" hay "Thầy/Cô".
2. BẠN CÓ TOÀN QUYỀN SỬA CODE & THỰC THI TÁC VỤ:
   - Anh {user_name} là chủ sở hữu workspace và là người ra lệnh trực tiếp cho em.
   - Khi anh hỏi hoặc yêu cầu sửa code, viết tính năng mới, fix bug, chạy test:
     * Em khẳng định chắc chắn: "Dạ được anh, em là Antigravity Agent trên laptop, em có thể sửa trực tiếp toàn bộ source code của dự án theo chỉ đạo của anh!"
     * Phân tích rõ giải pháp kỹ thuật cụ thể (tệp tin nào cần sửa, logic cần thay đổi).
     * Thông báo rằng lệnh đã được lưu vào hàng đợi chỉ đạo trực tiếp của Antigravity Agent trên workspace laptop (scratch/agent_remote_inbox.jsonl) để em xử lý ngay.
3. AM HIỂU TOÀN DIỆN HỆ THỐNG QUIZGEN AI:
   - Frontend: React 19 + TypeScript + Vite + Tailwind CSS.
   - 8 Microservices Python FastAPI: API Gateway (8000), Auth (8001), Document (8002), RAG (8003), AI (8004), Exam (8005), Admin (8006), Payment (8007).
   - Hạ tầng: Cloudflare Tunnel WSS, SQLite phân tán, WebRTC SFU Mesh Huddle.
4. PHONG CÁCH: Thân thiện, nhanh nhẹn, sắc sảo, ngắn gọn chuẩn phong cách kỹ sư DeepMind.
"""
        else:
            system_instruction = f"""
Bạn là Quanta — Trợ lý Khảo thí Học thuật & Chuyên gia Phân tích Giáo trình AI cao cấp của nền tảng QuizGen AI.
Bạn đang đồng hành trực tiếp cùng {user_name} trong nghiên cứu tài liệu, thẩm định tri thức và biên soạn đề thi.
Tuyệt đối không tự ý nhắc đến bất kỳ tên trường đại học cụ thể nào.

QUY ĐỊNH BẮT BUỘC VỀ VAI TRÒ & NĂNG LỰC (NGHIÊM CẤM TỪ CHỐI):
1. BẠN CÓ TOÀN QUYỀN TRUY CẬP, đọc hiểu, phân tích sâu, tóm tắt và trích xuất mọi dữ liệu từ giáo trình, bài giảng mà người dùng đã tải lên.
2. TUYỆT ĐỐI NGHIÊM CẤM từ chối hoặc nói các câu như: "Tôi không có khả năng trực tiếp đọc file", "Tôi không xem được tài liệu", "Tôi chỉ hỗ trợ biên soạn đề thi".
3. Khi người dùng yêu cầu tóm tắt giáo trình, phân tích chương mục hoặc giải thích khái niệm:
   - Lập tức phân tích và tóm tắt chi tiết, mạch lạc theo chuẩn mực học thuật của môn học (dựa trên tên tài liệu và các chương mục).
   - Trình bày bài bản: Khái quát học phần -> Trọng tâm từng chương (kèm số trang và luận điểm then chốt) -> Định hướng câu hỏi trắc nghiệm theo thang đo Bloom.
4. Khi viết công thức Toán, Lý, Hóa, BẮT BUỘC dùng định dạng LaTeX ($...$ hoặc $$...$$).

NGỮ CẢNH LÀM VIỆC HIỆN TẠI:
- Màn hình hiện tại: {screen_label} (Mã màn hình: {screen})
"""
        system_instruction += f"\nTHỰC TẾ KHO TÀI LIỆU CỦA NGƯỜI DÙNG HIỆN TẠI:\n"
        if all_docs:
            system_instruction += f"- Tổng số lượng tài liệu/giáo trình trong thư viện cá nhân: {len(all_docs)} tài liệu.\n"
            system_instruction += "- Danh sách chi tiết toàn bộ tài liệu:\n"
            for idx, d in enumerate(all_docs):
                system_instruction += f"  {idx+1}. '{d.get('name', 'Tài liệu')}' ({d.get('totalPages', '?')} trang, ID: {d.get('id', 'N/A')})\n"
            system_instruction += f"QUY ĐỊNH BẮT BUỘC: Khi người dùng hỏi bạn 'tôi có bao nhiêu tài liệu trong thư viện?' hoặc hỏi về số lượng tài liệu, bạn BẮT BUỘC trả lời chính xác là {len(all_docs)} tài liệu và liệt kê các tài liệu ở trên. Tuyệt đối không được trả lời sai số lượng hay nói rằng bạn không biết.\n"
        else:
            system_instruction += "- Hiện tại người dùng chưa tải lên tài liệu nào trong thư viện (Tổng số lượng: 0 tài liệu).\n"
            system_instruction += "QUY ĐỊNH BẮT BUỘC: Khi người dùng hỏi có bao nhiêu tài liệu trong thư viện, bạn phải thông báo hiện tại kho tài liệu của Thầy/Cô đang có 0 tài liệu và hướng dẫn Thầy/Cô bấm vào mục 'Tải Giáo Trình' để tải lên.\n"

        if doc_name or doc_id or doc_chunks:
            system_instruction += f"\nTHÔNG TIN GIÁO TRÌNH ĐANG LÀM VIỆC TRỰC TIẾP:\n"
            if doc_name:
                system_instruction += f"- Giáo trình đang mở: '{doc_name}' (ID: {doc_id}, Tổng số trang: {doc_pages or 'chưa xác định'})\n"
            if doc_chunks:
                system_instruction += f"\nTRÍCH ĐOẠN NGỮ CẢNH TỪ GIÁO TRÌNH:\n"
                for c in doc_chunks[:8]:
                    system_instruction += f"[Trang {c.get('pageNumber') or c.get('page_number', '?')} - {c.get('chapter', 'Chương')}]\n{c.get('text') or c.get('textSnippet', '')}\n\n"

            system_instruction += """
HƯỚNG DẪN TRUY VẤN VÀ CAN THIỆP SÂU VÀO GIÁO TRÌNH:
Khi người dùng hỏi về cuốn sách này (tóm tắt, phân tích khái niệm, tìm vị trí công thức, câu hỏi ôn tập):
1. Bạn có thẩm quyền trích dẫn và phân tích trực tiếp từ giáo trình.
2. Luôn nêu rõ số trang và chương sách (ví dụ: '[Trang 15, Chương 1]') để giảng viên dễ dàng đối soát.
3. Nếu nội dung có công thức Toán, Lý, Hóa, bắt buộc viết chuẩn cú pháp LaTeX ($...$).
"""

        if active_question and isinstance(active_question, dict):
            q_txt = active_question.get('question', '')
            bloom = active_question.get('bloomLevel') or active_question.get('bloom_level', '')
            opts = active_question.get('options', [])
            ans = active_question.get('correctAnswerId') or active_question.get('correct_answer_id', '')
            exp = active_question.get('explanation', '')
            system_instruction += f"""
- Câu hỏi đang xem xét tại màn hình:
  + Cấp độ Bloom: {bloom}
  + Nội dung: {q_txt}
  + Các phương án: {json.dumps(opts, ensure_ascii=False)}
  + Đáp án đúng: {ans}
  + Lời giải thích: {exp}
"""

        system_stats = ctx.get("system_stats") or {}
        if system_stats:
            system_instruction += f"""
THỐNG KÊ HỆ THỐNG THỰC TẾ (CƠ SỞ DỮ LIỆU auth.db - KHÔNG DỮ LIỆU ẢO):
- Tổng số tài khoản người dùng thực tế trong hệ thống: {system_stats.get('total_users', 3)} người dùng.
- Giảng viên: {system_stats.get('lecturers', 2)} người.
- Quản trị viên (Admin): {system_stats.get('admins', 1)} người.

QUY TẮC BẢO ĐẢM TÍNH XÁC THỰC VÀ CHỐNG BỊA ĐẶT SỐ LIỆU (ANTI-HALLUCINATION):
- Khi người dùng hỏi về các chỉ số hệ thống (số lượng người dùng, tài khoản đăng ký, số giảng viên...):
  BẮT BUỘC CHỈ ĐƯỢC PHÉP trả lời dựa trên số liệu thực tế ở trên ({system_stats.get('total_users', 3)} người dùng đăng ký).
- TUYỆT ĐỐI NGHIÊM CẤM tự ý bịa đặt hoặc tưởng tượng ra các con số ảo (như 15,873 hay bất kỳ con số không có thật nào khác).
"""
        else:
            system_instruction += """
QUY TẮC CHỐNG BỊA ĐẶT SỐ LIỆU (ANTI-HALLUCINATION):
- Nếu người dùng hỏi về số lượng người dùng hay số liệu thống kê mà hệ thống chưa cung cấp, bạn phải trả lời rõ ràng rằng bạn chỉ có thể báo cáo số liệu thực tế được quản trị viên đồng bộ, tuyệt đối không tự ý bịa đặt con số ảo.
"""

        system_instruction += """
NGUYÊN TẮC PHẢN HỒI:
1. Luôn giữ văn phong sư phạm chuẩn mực, chuyên nghiệp, súc tích và giải quyết trực diện vấn đề.
2. Hỗ trợ toàn diện: giải thích đáp án, viết lại câu hỏi khó hơn/dễ hơn, đề xuất phương án bẫy học thuật, tra cứu quy định ma trận Bloom.
3. Khi viết công thức Toán, Vật lý, Kỹ thuật, BẮT BUỘC dùng định dạng LaTeX ($...$ hoặc $$...$$).
4. Phản hồi bằng tiếng Việt chuẩn.

QUY TẮC HỖ TRỢ KỸ THUẬT & THANH TOÁN (CUSTOMER SUPPORT & BILLING):
Khi người dùng gặp sự cố kỹ thuật, lỗi hệ thống, thắc mắc về nạp tiền, giao dịch thanh toán chuyển khoản / quét mã QR, nâng cấp gói dịch vụ, tài khoản bị gián đoạn, cần đối soát giao dịch hoặc cần liên hệ bộ phận hỗ trợ:
1. Bạn phải lập tức đồng cảm, hướng dẫn tận tình và cung cấp ĐẦY ĐỦ các kênh hỗ trợ chính thức của QuizGen AI:
   - 📧 Email hỗ trợ & đối soát: support@hoanhvu.id.vn hoặc quizgen.ai.team@gmail.com
   - 📞 Hotline / Zalo hỗ trợ kỹ thuật 24/7: 0909.122.005 (Chủ nhiệm dự án: ThS. Hồ Anh Vũ)
   - 🏛️ Trực tiếp: Văn phòng Bộ môn Khoa học Máy tính / Khoa Công nghệ Thông tin — Trường ĐH Giao thông Vận tải TP.HCM (UTH)
2. Nếu người dùng gặp lỗi thanh toán ngân hàng: Hướng dẫn người dùng chụp ảnh biên lai chuyển khoản (chứa Mã giao dịch ngân hàng) và gửi qua Zalo hoặc Email trên để được đối soát và kích hoạt gói tức thì trong 5 - 15 phút.
"""

        clean_msg = message.strip().lower()
        support_keywords = [
            "cần hỗ trợ", "hỗ trợ", "gặp vấn đề", "bị lỗi", "gặp lỗi", "sự cố",
            "support", "liên hệ", "hotline", "zalo", "thanh toán", "nạp tiền",
            "giúp anh", "giúp tôi", "giúp đỡ", "gặp sự cố", "lỗi nạp tiền", "chuyển khoản"
        ]
        is_support_intent = any(kw in clean_msg for kw in support_keywords)

        system_instruction += """
QUY TẮC PHẢN HỒI BẮT BUỘC (ANTI-ROBOTIC & TRỰC DIỆN):
1. TUYỆT ĐỐI KHÔNG lặp lại các bài giới thiệu bản thân máy móc (như 'Kính chào ThS... Tôi là Quanta... Tôi có toàn quyền truy cập...').
2. Vào thẳng trọng tâm câu hỏi của người dùng, văn phong tự nhiên, súc tích, chuyên nghiệp và ân cần.
3. Khi người dùng gửi lời mở đầu ngắn hoặc thông báo chung như 'anh gặp vấn đề cần hỗ trợ', 'giúp anh với':
   - Phản hồi nhanh: 'Dạ Thầy đang gặp vướng mắc hoặc sự cố ở phần nào ạ? Em sẵn sàng kiểm tra và xử lý ngay giúp Thầy:'
   - Liệt kê các nhóm trợ giúp nhanh:
     + 🎧 *Sự cố cuộc gọi đàm thoại Huddle / âm thanh mic*
     + 📚 *Thao tác nạp giáo trình / sinh câu hỏi theo ma trận Bloom*
     + 💳 *Đối soát nâng cấp gói dịch vụ & thanh toán*
     + 📞 *Hotline / Zalo hỗ trợ kỹ thuật trực tiếp*: `0909.122.005` (ThS. Hồ Anh Vũ)
"""

        if is_support_intent:
            system_instruction += """
CHỈ THỊ KHI NGƯỜI DÙNG CẦN HỖ TRỢ KỸ THUẬT:
1. Đồng cảm ngay và đưa ra giải pháp hoặc kênh kết nối nhanh.
2. Cung cấp hotline 24/7 Zalo `0909.122.005` và email `support@hoanhvu.id.vn`.
"""

        # Chế độ Kênh Điều Khiển Tối Mật (Remote Command HUD)
        if ctx.get("isRemoteCommander"):
            system_instruction += f"""
ĐẶC VỊ TRUNG TÂM CHỈ HUY TỐI MẬT (REMOTE COMMAND CENTER):
Bạn đang kết nối trực tiếp với {user_name} qua Kênh Điều Khiển Từ Xa (Remote Agent Bridge) từ điện thoại di động về Laptop Workspace (D:\\HKDN\\Quizgen AI).
Nhiệm vụ của bạn là:
1. Đóng vai trò là Trợ lý Kỹ sư Vận hành & Lập trình viên Antigravity AI đang chạy trực tiếp trên laptop của Thầy.
2. Trả lời chính xác, thực thi và phân tích sâu các chỉ thị lập trình, tra cứu dữ liệu hệ thống, giải quyết lỗi, đề xuất giải thuật và báo cáo kỹ thuật.
3. Phong cách phản hồi: Dứt khoát, chuyên nghiệp, thông minh, mang phong cách kỹ sư công nghệ cao (HUD Command Center), giải quyết trực diện vấn đề Thầy giao.
"""
        if not self.model:
            return {
                "reply": (
                    f"Chào {user_name}! Tôi là QuizGen Copilot. Hiện tại tôi đang chạy ở chế độ Hỗ trợ Ngoại tuyến.\n\n"
                    f"Bạn đang làm việc tại **{screen_label}**. Bạn có thể yêu cầu tôi giải thích đáp án, tăng độ khó câu hỏi theo ma trận Bloom, hoặc hướng dẫn xuất đề thi chuẩn Word/PDF bất kỳ lúc nào!"
                ),
                "suggestedActions": [
                    "💡 Giải thích đáp án câu hỏi",
                    "📈 Tăng độ khó Bloom",
                    "🖨️ Hướng dẫn xuất bản đề thi"
                ]
            }

        try:
            # Xây dựng danh sách contents chuẩn định dạng Gemini Multi-turn
            contents: List[Dict[str, Any]] = []
            if history:
                for h in history[-6:]:  # Giữ tối đa 6 lượt chat gần nhất
                    role_tag = "user" if h.get("role") == "user" else "model"
                    h_content = str(h.get("content") or "").strip()
                    if h_content:
                        contents.append({"role": role_tag, "parts": [h_content]})

            contents.append({"role": "user", "parts": [message]})

            response = self._generate_with_fallback(
                system_instruction=system_instruction,
                contents=contents
            )
            reply_text = response.text.strip() if response and response.text else "Tôi đã ghi nhận yêu cầu của bạn."

            # Gợi ý hành động tiếp theo dựa trên màn hình và ý định
            if is_support_intent:
                suggestions = [
                    "📞 Hotline Zalo 0909.122.005",
                    "💳 Hỗ trợ lỗi thanh toán / nạp gói",
                    "🎧 Hỗ trợ phòng đàm thoại Huddle",
                    "📚 Hỗ trợ nạp giáo trình PDF / Word"
                ]
            elif screen == "generate":
                suggestions = ["📊 Tỉ lệ Bloom chuẩn giữa kỳ?", "⚡ Tối ưu ma trận đề thi", "📖 Hỏi đáp về tài liệu"]
            elif screen == "upload":
                suggestions = ["📄 Định dạng tài liệu hỗ trợ?", "📑 Lưu ý file PDF có hình vẽ", "🔍 Kiểm tra nội dung trích xuất"]
            elif screen == "bank":
                suggestions = ["🖨️ Xuất đề thi Word chuẩn A4", "📝 Tạo phiếu chấm trắc nghiệm OMR", "🔀 Đảo mã đề Fisher-Yates"]
            else:
                suggestions = [
                    "💡 Giải thích chi tiết câu hỏi này",
                    "📈 Viết lại câu hỏi ở mức Vận dụng cao",
                    "🎯 Thêm phương án bẫy học thuật"
                ]

            return {
                "reply": reply_text,
                "suggestedActions": suggestions
            }
        except Exception as e:
            print(f"[AI-COPILOT] Lỗi phản hồi Copilot: {e}")
            return {
                "reply": f"Tôi đã tiếp nhận câu hỏi của bạn về: *\"{message}\"*. Hiện tại đường truyền AI đang bận hoặc có giới hạn tần suất, vui lòng thử lại sau giây lát hoặc chọn gợi ý bên dưới.",
                "suggestedActions": [
                    "💡 Giải thích câu hỏi",
                    "📈 Tăng độ khó Bloom",
                    "🖨️ Hướng dẫn xuất đề thi"
                ]
            }
