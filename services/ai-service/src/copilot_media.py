# -*- coding: utf-8 -*-
"""
Quanta Copilot Media & Document Export Helpers:
- Fix #3: Lưu trữ ảnh/tệp đính kèm chat xuống ổ đĩa (data/chat_uploads/) thay vì strip base64.
- Fix #5: Xuất trực tiếp bộ câu hỏi từ Quanta ra file Microsoft Word (.docx) chuẩn A4.
"""

import base64
import io
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

AI_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data"))
CHAT_UPLOADS_DIR = os.path.join(AI_DATA_DIR, "chat_uploads")
CHAT_EXPORTS_DIR = os.path.join(AI_DATA_DIR, "chat_exports")

os.makedirs(CHAT_UPLOADS_DIR, exist_ok=True)
os.makedirs(CHAT_EXPORTS_DIR, exist_ok=True)

_MIME_TO_EXT = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
}


def persist_chat_attachments(
    attachments: Optional[List[Dict[str, Any]]],
    uploads_dir: str = CHAT_UPLOADS_DIR,
) -> Optional[List[Dict[str, Any]]]:
    """
    Lưu ảnh/tệp đính kèm từ base64 data URI xuống ổ đĩa để đồng bộ đa thiết bị & reload.
    Trả về danh sách metadata nhẹ (chứa `url` thay cho `data` base64 khổng lồ).
    """
    if not attachments:
        return None

    os.makedirs(uploads_dir, exist_ok=True)
    persisted: List[Dict[str, Any]] = []

    for att in attachments[:5]:
        mime = str(att.get("mimeType") or att.get("type") or "").lower().strip()
        item: Dict[str, Any] = {
            "id": att.get("id") or f"att-{uuid4().hex[:10]}",
            "name": att.get("name") or "attachment",
            "mimeType": mime or "application/octet-stream",
            "size": att.get("size") or 0,
        }

        existing_url = att.get("url")
        if isinstance(existing_url, str) and existing_url.startswith("/api/v1/ai/chat/uploads/"):
            item["url"] = existing_url
            persisted.append(item)
            continue

        raw_data = att.get("data") or ""
        if isinstance(raw_data, str) and raw_data.startswith("data:") and ";base64," in raw_data:
            try:
                header, b64_payload = raw_data.split(";base64,", 1)
                detected_mime = header.replace("data:", "").strip().lower()
                if not mime:
                    mime = detected_mime
                    item["mimeType"] = mime
                ext = _MIME_TO_EXT.get(mime)
                if not ext and mime.startswith("image/"):
                    ext = mime.split("/", 1)[1].split("+", 1)[0] or "png"
                if ext:
                    decoded = base64.b64decode(b64_payload)
                    if len(decoded) <= 10 * 1024 * 1024:
                        filename = f"{uuid4().hex[:16]}.{ext}"
                        file_path = os.path.join(uploads_dir, filename)
                        with open(file_path, "wb") as f:
                            f.write(decoded)
                        item["url"] = f"/api/v1/ai/chat/uploads/{filename}"
                        item["size"] = len(decoded)
            except Exception as err:
                print(f"[AI-MEDIA] Warning persisting attachment {item['name']}: {err}")

        # Fallback: giữ preview nhỏ nếu lưu file thất bại
        if "url" not in item and isinstance(raw_data, str) and raw_data.startswith("data:image/") and len(raw_data) < 150000:
            item["data"] = raw_data

        persisted.append(item)

    return persisted


def _clean_latex_for_word(text: str) -> str:
    """Làm sạch nhẹ ký hiệu markdown thừa nhưng giữ nguyên nội dung toán học rõ ràng cho Word."""
    if not text:
        return ""
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", str(text))
    cleaned = re.sub(r"__(.*?)__", r"\1", cleaned)
    return cleaned.strip()


def build_questions_docx_bytes(
    title: str,
    questions: List[Dict[str, Any]],
    subtitle: str = "Biên soạn bởi Quanta Copilot — QuizGen AI",
) -> Tuple[bytes, str]:
    """Tạo file Microsoft Word (.docx) chuẩn A4 từ danh sách câu hỏi và trả về (bytes, safe_filename)."""
    from docx import Document
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)

    style = doc.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(12)

    heading = doc.add_paragraph()
    heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_h = heading.add_run(title or "ĐỀ THI TRẮC NGHIỆM QUIZGEN AI")
    run_h.bold = True
    run_h.font.size = Pt(15)
    run_h.font.color.rgb = RGBColor(0x00, 0x5B, 0x5E)

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = sub_p.add_run(f"{subtitle} · Ngày xuất: {datetime.now().strftime('%d/%m/%Y %H:%M')} · Tổng: {len(questions)} câu")
    run_sub.italic = True
    run_sub.font.size = Pt(10)
    run_sub.font.color.rgb = RGBColor(0x55, 0x66, 0x77)

    doc.add_paragraph("")

    for idx, q in enumerate(questions, 1):
        q_text = _clean_latex_for_word(q.get("question") or q.get("question_text") or "")
        bloom = q.get("bloomLevel") or q.get("bloom_level") or ""

        p_q = doc.add_paragraph()
        p_q.paragraph_format.space_before = Pt(6)
        p_q.paragraph_format.space_after = Pt(3)
        r_num = p_q.add_run(f"Câu {idx}")
        r_num.bold = True
        if bloom:
            r_bloom = p_q.add_run(f" [{bloom}]")
            r_bloom.italic = True
            r_bloom.font.size = Pt(10)
            r_bloom.font.color.rgb = RGBColor(0x00, 0x86, 0x89)
        p_q.add_run(f": {q_text}")

        options = q.get("options") or []
        if isinstance(options, list):
            for o_idx, opt in enumerate(options):
                if isinstance(opt, dict):
                    label = opt.get("label") or opt.get("id") or chr(65 + o_idx)
                    otext = _clean_latex_for_word(opt.get("text") or "")
                else:
                    label = chr(65 + o_idx)
                    otext = _clean_latex_for_word(str(opt))
                p_opt = doc.add_paragraph()
                p_opt.paragraph_format.left_indent = Inches(0.35)
                p_opt.paragraph_format.space_after = Pt(2)
                r_lbl = p_opt.add_run(f"{label}. ")
                r_lbl.bold = True
                p_opt.add_run(otext)

    # Phần Đáp án & Giải thích
    doc.add_page_break()
    ans_h = doc.add_paragraph()
    ans_h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_ah = ans_h.add_run("ĐÁP ÁN & LỜI GIẢI CHI TIẾT")
    r_ah.bold = True
    r_ah.font.size = Pt(14)
    r_ah.font.color.rgb = RGBColor(0x00, 0x5B, 0x5E)

    for idx, q in enumerate(questions, 1):
        ans = q.get("correctAnswerId") or q.get("correct_answer_id") or ""
        exp = _clean_latex_for_word(q.get("explanation") or "")
        p_a = doc.add_paragraph()
        p_a.paragraph_format.space_before = Pt(4)
        p_a.paragraph_format.space_after = Pt(2)
        r_ca = p_a.add_run(f"Câu {idx}: Đáp án {ans}")
        r_ca.bold = True
        if exp:
            p_a.add_run(f" — {exp}")

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)

    slug = re.sub(r"[^a-zA-Z0-9_-]+", "_", (title or "quanta_exam").strip())[:48].strip("_") or "quanta_exam"
    filename = f"{slug}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"
    return buf.getvalue(), filename


def save_questions_docx_file(
    title: str,
    questions: List[Dict[str, Any]],
    exports_dir: str = CHAT_EXPORTS_DIR,
) -> Dict[str, Any]:
    """Lưu file .docx vào CHAT_EXPORTS_DIR và trả về metadata + downloadUrl."""
    os.makedirs(exports_dir, exist_ok=True)
    raw_bytes, display_name = build_questions_docx_bytes(title, questions)
    disk_name = f"{uuid4().hex[:12]}_{display_name}"
    file_path = os.path.join(exports_dir, disk_name)
    with open(file_path, "wb") as f:
        f.write(raw_bytes)
    return {
        "fileName": display_name,
        "diskName": disk_name,
        "sizeBytes": len(raw_bytes),
        "downloadUrl": f"/api/v1/ai/chat/exports/{disk_name}",
        "questionCount": len(questions),
    }
