# -*- coding: utf-8 -*-
"""
Quanta Copilot Media & Document Export Helpers:
- Fix #3: Lưu trữ ảnh/tệp đính kèm chat xuống ổ đĩa (data/chat_uploads/) thay vì strip base64.
- Fix #5 & SCRUM-145: Xuất trực tiếp bộ câu hỏi từ Quanta ra file Microsoft Word (.docx) chuẩn khảo thí:
  * OpenXML w:cs và w:eastAsia trên mọi style/run cho hiển thị tiếng Việt sắc nét không bị lệch font.
  * Bộ chuyển đổi LaTeX sang Unicode Toán học trực quan (clean_latex_to_text).
  * Khử lỗi token hóa ký tự 'Ư' rác trước dấu câu.
  * Ánh xạ mã đáp án kỹ thuật (opt-a, opt-1) sang chữ cái A, B, C, D chuẩn mực.
  * Slug tiếng Việt không dấu cho tên tệp tải về sạch sẽ.
  * Header hành chính 2 cột (Bộ GD&ĐT / Trường, Môn thi, Mã đề) và bảng đáp án ma trận 5 cột.
"""

import base64
import io
import os
import re
import unicodedata
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls, qn
from docx.shared import Inches, Pt, RGBColor

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


def clean_stray_u(text: str) -> str:
    """Loại bỏ ký tự rác 'Ư' sinh ra do lỗi token hóa trước dấu câu hoặc sau công thức toán."""
    if not text or not isinstance(text, str):
        return ""
    s = text
    # 1. Khử 'Ư' rác sau công thức toán học ($...$Ư. hoặc ).Ư? hoặc 5Ư.)
    s = re.sub(r'(\$[^$]*\$|[\)\]\}\d])\s*[Ưư](?=[\s:,\.\?!]|$)', r'\1', s)
    # 2. Khử 'Ư' đứng đơn lẻ giữa khoảng trắng hoặc trước dấu câu
    s = re.sub(r'(?<=\s)[Ưư](?=[\s:,\.\?!]|$)', '', s)
    s = re.sub(r'^[Ưư](?=[\s:,\.\?!])', '', s)
    # 3. Khử 'Ư' dính sau từ/kí tự không phải từ tiếng Việt hợp lệ chứa Ư trước dấu câu
    # Các từ tiếng Việt hợp lệ kết thúc bằng Ư: TƯ, SƯ, CƯ, HƯ, DƯ, THƯ, NHƯ (kể cả hoa/thường)
    valid_vietnamese_u_words = {'TƯ', 'SƯ', 'CƯ', 'HƯ', 'DƯ', 'THƯ', 'NHƯ', 'tư', 'sư', 'cư', 'hư', 'dư', 'thư', 'như'}
    def _strip_stray(m):
        full = m.group(1)
        word = full.split()[-1] if full else ""
        punct = m.group(2)
        if word in valid_vietnamese_u_words:
            return f"{full}{punct}"
        if full.endswith('Ư') or full.endswith('ư'):
            return f"{full[:-1]}{punct}"
        return f"{full}{punct}"
    s = re.sub(r'(\S+[Ưư])([:,\.\?!])', _strip_stray, s)
    return s


def clean_latex_to_text(text: str) -> str:
    """
    [SCRUM-145] Bộ chuyển đổi và làm sạch ký hiệu LaTeX sang Unicode Toán học trực quan cho Word (.docx).
    Chuyển đổi công thức $...$, phân số, căn, tích phân, ký hiệu Hy Lạp, chỉ số trên/dưới.
    """
    if not text or not isinstance(text, str):
        return ""

    s = clean_stray_u(str(text))

    # Khử lớp escape backslash kép từ JSON payload
    s = s.replace('\\\\', '\\')

    # Khử \neq và \notin kể cả khi bị decode thành ký tự xuống dòng \n kèm eq/otin
    s = re.sub(r'\\neq(?![a-zA-Z])|(?<=\s)\neq(?![a-zA-Z])|\n\s*eq(?![a-zA-Z])', ' ≠ ', s)
    s = re.sub(r'\\notin(?![a-zA-Z])|(?<=\s)\notin(?![a-zA-Z])|\n\s*otin(?![a-zA-Z])', ' ∉ ', s)
    s = re.sub(r'\\oint(?![a-zA-Z])', '∮', s)
    s = re.sub(r'\\iiint(?![a-zA-Z])', '∭', s)
    s = re.sub(r'\\iint(?![a-zA-Z])', '∬', s)

    # Tách khoảng trắng trước hàm nếu bị dính liền với biến số (vd: i\sin -> i \sin, i\cos -> i \cos)
    s = re.sub(r'([0-9a-zA-Zα-ωΑ-Ω])\\(sin|cos|tan|cot|arcsin|arccos|arctan|sinh|cosh|tanh|ln|log|exp)', r'\1 \\\2', s)

    # Bỏ các chỉ thị kích thước ngoặc LaTeX
    s = re.sub(r'\\(left|right)', '', s)

    # Thay thế căn bậc hai trước khi làm phân số để xử lý lồng nhau
    s = re.sub(r'\\sqrt\{([^{}]+)\}', r'√(\1)', s)
    s = re.sub(r'\\sqrt\[([^{}]+)\]\{([^{}]+)\}', r'^\1√(\2)', s)

    # Thay thế phân số \frac{a}{b} -> (a/b) (chạy 3 lần để xử lý phân số lồng nhau)
    for _ in range(3):
        s = re.sub(r'\\frac\{([^{}]+)\}\{([^{}]+)\}', r'(\1/\2)', s)

    # Ký hiệu toán học & Hy Lạp đầy đủ
    symbols_map = [
        (r'\\phi(?![a-zA-Z])', 'φ'), (r'\\varphi(?![a-zA-Z])', 'φ'), (r'\\Phi(?![a-zA-Z])', 'Φ'),
        (r'\\psi(?![a-zA-Z])', 'ψ'), (r'\\Psi(?![a-zA-Z])', 'Ψ'),
        (r'\\alpha(?![a-zA-Z])', 'α'), (r'\\beta(?![a-zA-Z])', 'β'), (r'\\gamma(?![a-zA-Z])', 'γ'), (r'\\delta(?![a-zA-Z])', 'δ'),
        (r'\\epsilon(?![a-zA-Z])', 'ε'), (r'\\theta(?![a-zA-Z])', 'θ'), (r'\\vartheta(?![a-zA-Z])', 'θ'), (r'\\Theta(?![a-zA-Z])', 'Θ'),
        (r'\\lambda(?![a-zA-Z])', 'λ'), (r'\\Lambda(?![a-zA-Z])', 'Λ'), (r'\\mu(?![a-zA-Z])', 'μ'),
        (r'\\pi(?![a-zA-Z])', 'π'), (r'\\sigma(?![a-zA-Z])', 'σ'), (r'\\Sigma(?![a-zA-Z])', 'Σ'), (r'\\tau(?![a-zA-Z])', 'τ'),
        (r'\\omega(?![a-zA-Z])', 'ω'), (r'\\Omega(?![a-zA-Z])', 'Ω'), (r'\\Delta(?![a-zA-Z])', 'Δ'), (r'\\Gamma(?![a-zA-Z])', 'Γ'),
        (r'\\eta(?![a-zA-Z])', 'η'), (r'\\rho(?![a-zA-Z])', 'ρ'), (r'\\varrho(?![a-zA-Z])', 'ρ'),
        (r'\\xi(?![a-zA-Z])', 'ξ'), (r'\\Xi(?![a-zA-Z])', 'Ξ'), (r'\\zeta(?![a-zA-Z])', 'ζ'), (r'\\chi(?![a-zA-Z])', 'χ'),
        (r'\\nu(?![a-zA-Z])', 'ν'), (r'\\kappa(?![a-zA-Z])', 'κ'), (r'\\upsilon(?![a-zA-Z])', 'υ'), (r'\\Upsilon(?![a-zA-Z])', 'Υ'),
        (r'\\times(?![a-zA-Z])', '×'), (r'\\div(?![a-zA-Z])', '÷'), (r'\\pm(?![a-zA-Z])', '±'), (r'\\mp(?![a-zA-Z])', '∓'),
        (r'\\le(q)?(?![a-zA-Z])', '≤'), (r'\\ge(q)?(?![a-zA-Z])', '≥'), (r'\\approx(?![a-zA-Z])', '≈'),
        (r'\\infty(?![a-zA-Z])', '∞'), (r'\\partial(?![a-zA-Z])', '∂'), (r'\\nabla(?![a-zA-Z])', '∇'),
        (r'\\int(?![a-zA-Z])', '∫'), (r'\\sum(?![a-zA-Z])', '∑'), (r'\\prod(?![a-zA-Z])', '∏'),
        (r'\\in(?![a-zA-Z])', '∈'), (r'\\subset(?![a-zA-Z])', '⊂'), (r'\\subseteq(?![a-zA-Z])', '⊆'),
        (r'\\supset(?![a-zA-Z])', '⊃'), (r'\\supseteq(?![a-zA-Z])', '⊇'), (r'\\setminus(?![a-zA-Z])', '∖'),
        (r'\\cap(?![a-zA-Z])', '∩'), (r'\\cup(?![a-zA-Z])', '∪'), (r'\\emptyset(?![a-zA-Z])', '∅'),
        (r'\\forall(?![a-zA-Z])', '∀'), (r'\\exists(?![a-zA-Z])', '∃'),
        (r'\\land(?![a-zA-Z])', '∧'), (r'\\wedge(?![a-zA-Z])', '∧'), (r'\\lor(?![a-zA-Z])', '∨'), (r'\\vee(?![a-zA-Z])', '∨'),
        (r'\\neg(?![a-zA-Z])', '¬'), (r'\\lnot(?![a-zA-Z])', '¬'), (r'\\sim(?![a-zA-Z])', '∼'),
        (r'\\rightarrow(?![a-zA-Z])', '→'), (r'\\leftarrow(?![a-zA-Z])', '←'), (r'\\to(?![a-zA-Z])', '→'),
        (r'\\Rightarrow(?![a-zA-Z])', '⇒'), (r'\\Leftrightarrow(?![a-zA-Z])', '⇔'), (r'\\leftrightarrow(?![a-zA-Z])', '↔'),
        (r'\\equiv(?![a-zA-Z])', '≡'), (r'\\oplus(?![a-zA-Z])', '⊕'), (r'\\bot(?![a-zA-Z])', '⊥'), (r'\\top(?![a-zA-Z])', '⊤'),
        (r'\\vdash(?![a-zA-Z])', '⊢'), (r'\\models(?![a-zA-Z])', '⊨'),
        (r'\\mathbb\{R\}', 'ℝ'), (r'\\mathbb\{N\}', 'ℕ'), (r'\\mathbb\{Z\}', 'ℤ'), (r'\\mathbb\{Q\}', 'ℚ'), (r'\\mathbb\{C\}', 'ℂ'),
        (r'\\log(?![a-zA-Z])', 'log'), (r'\\ln(?![a-zA-Z])', 'ln'), (r'\\lg(?![a-zA-Z])', 'lg'), (r'\\exp(?![a-zA-Z])', 'exp'),
        (r'\\sin(?![a-zA-Z])', 'sin'), (r'\\cos(?![a-zA-Z])', 'cos'), (r'\\tan(?![a-zA-Z])', 'tan'), (r'\\cot(?![a-zA-Z])', 'cot'),
        (r'\\arcsin(?![a-zA-Z])', 'arcsin'), (r'\\arccos(?![a-zA-Z])', 'arccos'), (r'\\arctan(?![a-zA-Z])', 'arctan'),
        (r'\\sinh(?![a-zA-Z])', 'sinh'), (r'\\cosh(?![a-zA-Z])', 'cosh'), (r'\\tanh(?![a-zA-Z])', 'tanh'),
        (r'\\lim(?![a-zA-Z])', 'lim'), (r'\\max(?![a-zA-Z])', 'max'), (r'\\min(?![a-zA-Z])', 'min'), (r'\\det(?![a-zA-Z])', 'det'),
        (r'\\cdot(?![a-zA-Z])', '·'), (r'\\bullet(?![a-zA-Z])', '•'),
        (r'\\circ(?![a-zA-Z])|\\degree(?![a-zA-Z])', '°'),
        (r'\\perp(?![a-zA-Z])', '⊥'), (r'\\parallel(?![a-zA-Z])', '∥'),
        (r'\\angle(?![a-zA-Z])', '∠'), (r'\\triangle(?![a-zA-Z])', '△'),
        (r'\\dots|\\ldots|\\cdots', '...'), (r'\\cong(?![a-zA-Z])', '≅'),
        (r'\\prime(?![a-zA-Z])', '′'),
        (r'\\%', '%'), (r'\\&', '&'), (r'\\_', '_'), (r'\\#', '#')
    ]
    for pattern, repl in symbols_map:
        s = re.sub(pattern, repl, s)

    # Xử lý độ: 2^\circ -> 2°, ^° -> °
    s = re.sub(r'\^°|\^\{\s*°\s*\}|\^\{\s*\\circ\s*\}', '°', s)

    # Tự động tách khoảng trắng số và e^ (vd: 5e^ -> 5 e^)
    s = re.sub(r'(\d)\s*(e\^)', r'\1 \2', s)

    # Thay thế lũy thừa số và biến Unicode siêu ký tự
    sup_map = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
        '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
        'n': 'ⁿ', 'i': 'ⁱ', 'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ',
        'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'j': 'ʲ', 'k': 'ᵏ',
        'l': 'ˡ', 'm': 'ᵐ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ',
        't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
        'α': 'ᵅ', 'β': 'ᵝ', 'γ': 'ᵞ', 'δ': 'ᵟ', 'ε': 'ᵋ', 'θ': 'ᶿ', 'φ': 'ᵠ', 'χ': 'ᵡ',
        '/': '⁄', ' ': ' '
    }

    def replace_sup(match):
        val = match.group(1).strip()
        if all(c in sup_map for c in val):
            return "".join(sup_map[c] for c in val)
        return f"^({val})"

    s = re.sub(r'\^\{([^{}]+)\}', replace_sup, s)
    s = re.sub(r'\^([0-9a-zA-Zα-ω])', lambda m: sup_map.get(m.group(1), f'^{m.group(1)}'), s)

    # Thay thế chỉ số dưới _{1} -> ₁, _1 -> ₁
    sub_map = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
        '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
        '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
        'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ',
        'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ',
        's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ'
    }

    def replace_sub(match):
        val = match.group(1).replace(' ', '')
        if all(c in sub_map for c in val):
            return "".join(sub_map[c] for c in val)
        return f"_({val})"

    s = re.sub(r'_\{([^{}]+)\}', replace_sub, s)
    s = re.sub(r'_([0-9a-zA-Z])', lambda m: sub_map.get(m.group(1), f'_{m.group(1)}'), s)

    # Xóa bỏ các ký tự dấu $ bao quanh công thức
    s = s.replace('$$', '').replace('$', '')

    # Xóa các lệnh định dạng thừa trong LaTeX (\text{...}, \mathbf{...}, \mathit{...})
    s = re.sub(r'\\(text|mathbf|mathit|mathrm|mathbb)\{([^{}]+)\}', r'\2', s)

    # Làm sạch khoảng trắng thừa và dấu ngoặc thoát
    s = re.sub(r'\\,', ' ', s)
    s = re.sub(r'\\;', ' ', s)
    s = re.sub(r'\\quad', '   ', s)
    s = re.sub(r'\\([{}])', r'\1', s)

    # Khử markdown bold/italic
    s = re.sub(r"\*\*(.*?)\*\*", r"\1", s)
    s = re.sub(r"__(.*?)__", r"\1", s)

    # Làm sạch lần cuối ký tự rác 'Ư'
    s = clean_stray_u(s)

    return s.strip()


def _clean_latex_for_word(text: str) -> str:
    """Tương thích ngược với tên hàm cũ."""
    return clean_latex_to_text(text)


def remove_vietnamese_diacritics(text: str) -> str:
    """Chuyển đổi chuỗi tiếng Việt có dấu sang không dấu chuẩn ASCII."""
    if not text:
        return ""
    vietnamese_map = {
        'đ': 'd', 'Đ': 'D',
    }
    s = "".join(vietnamese_map.get(c, c) for c in text)
    nfd = unicodedata.normalize('NFD', s)
    s = "".join(c for c in nfd if unicodedata.category(c) != 'Mn')
    return s


def slugify_vietnamese_filename(title: str, max_length: int = 48) -> str:
    """Chuyển đổi tiêu đề tiếng Việt thành slug tệp tin chuẩn ASCII không mất chữ cái có dấu."""
    ascii_title = remove_vietnamese_diacritics((title or "de_thi_quizgen").strip())
    clean_slug = re.sub(r"[^a-zA-Z0-9]+", "_", ascii_title).strip("_")
    clean_slug = re.sub(r"_+", "_", clean_slug)
    return clean_slug[:max_length].strip("_") or "de_thi_quizgen"


def resolve_option_label(correct_id: Any, options: List[Any]) -> str:
    """
    Ánh xạ mã đáp án kỹ thuật (opt-a, opt-1, 0, ...) sang chữ cái đáp án hiển thị chuẩn (A, B, C, D).
    """
    if not correct_id and not isinstance(correct_id, (int, str)):
        return "A"

    cid_str = str(correct_id).strip()

    # 1. Đối chiếu trực tiếp với options list
    for idx, opt in enumerate(options):
        if isinstance(opt, dict):
            opt_id = str(opt.get("id") or "").strip()
            opt_label = str(opt.get("label") or "").strip()
            if cid_str and (cid_str.lower() == opt_id.lower() or cid_str.lower() == opt_label.lower()):
                return opt_label.upper() if opt_label else chr(65 + idx)
            if opt_id and opt_id.lower() in (f"opt-{cid_str.lower()}", f"opt_{cid_str.lower()}"):
                return opt_label.upper() if opt_label else chr(65 + idx)
        elif str(opt).strip().lower() == cid_str.lower():
            return chr(65 + idx)

    # 2. Nếu là chữ cái đơn A-Z
    if len(cid_str) == 1 and cid_str.upper() in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        return cid_str.upper()

    # 3. Trích xuất chữ cái đáp án từ dạng bọc ngoặc hoặc văn bản (vd: "(B)", "[C]", "Đáp án B", "Phương án D", "Option A", "A.")
    m_bracket = re.search(r'(?:đáp án|phương án|câu|option|opt)?[\s:_]*[\(\[]?\s*([A-Za-z])\s*[\)\]\.]?(?:\s|$)', cid_str, re.IGNORECASE)
    if m_bracket:
        token = m_bracket.group(1).upper()
        if token in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            return token

    # 4. Bóc tách tiền tố opt- / option- (vd: opt-a, opt-0, opt-1)
    m = re.search(r'(?:opt|option)[-_]?([a-zA-Z0-9]+)', cid_str, re.IGNORECASE)
    if m:
        token = m.group(1).upper()
        if len(token) == 1 and token in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            return token
        if token.isdigit():
            idx_val = int(token)
            if 0 <= idx_val < len(options):
                return chr(65 + idx_val)
            elif idx_val >= 1 and (idx_val - 1) < len(options):
                return chr(65 + idx_val - 1)
            elif 0 <= idx_val < 26:
                return chr(65 + idx_val)

    # 5. Nếu là chỉ số số (0 -> A, 1 -> B)
    if cid_str.isdigit():
        num = int(cid_str)
        if 0 <= num < 26:
            return chr(65 + num)

    return "A"


def _set_element_fonts(rPr, font_name: str = "Times New Roman") -> None:
    """Ghi đè OpenXML w:rFonts bao gồm w:ascii, w:hAnsi, w:cs, w:eastAsia."""
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = parse_xml(
            f'<w:rFonts {nsdecls("w")} '
            f'w:ascii="{font_name}" w:hAnsi="{font_name}" '
            f'w:cs="{font_name}" w:eastAsia="{font_name}"/>'
        )
        rPr.append(rFonts)
    else:
        rFonts.set(qn('w:ascii'), font_name)
        rFonts.set(qn('w:hAnsi'), font_name)
        rFonts.set(qn('w:cs'), font_name)
        rFonts.set(qn('w:eastAsia'), font_name)


def set_run_font(run, font_name: str = "Times New Roman") -> None:
    """Áp dụng font Times New Roman trên mọi bảng mã OpenXML cho từng Run."""
    run.font.name = font_name
    rPr = run._r.get_or_add_rPr()
    _set_element_fonts(rPr, font_name)


def enforce_document_fonts(doc: Document, font_name: str = "Times New Roman") -> None:
    """Duyệt toàn bộ văn bản và bảng biểu để đảm bảo 100% runs mang đúng font OpenXML."""
    for p in doc.paragraphs:
        for r in p.runs:
            set_run_font(r, font_name)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    for r in p.runs:
                        set_run_font(r, font_name)


def build_questions_docx_bytes(
    title: str,
    questions: List[Dict[str, Any]],
    subtitle: str = "Biên soạn bởi Quanta Copilot — QuizGen AI",
    subject: str = "Khoa học Tự nhiên & Kỹ thuật",
    exam_code: str = "QZ-01",
    duration_minutes: int = 60,
) -> Tuple[bytes, str]:
    """Tạo file Microsoft Word (.docx) chuẩn A4 khảo thí từ danh sách câu hỏi và trả về (bytes, safe_filename)."""
    doc = Document()

    # Căn lề khổ giấy A4 chuẩn khảo thí 2.0 cm (0.75 in)
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # Thiết lập font Normal chuẩn OpenXML
    style = doc.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(11)
    _set_element_fonts(style.element.get_or_add_rPr())

    # 1. Header bảng 2 cột đối xứng chuẩn hành chính khảo thí
    header_table = doc.add_table(rows=1, cols=2)
    header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell_left, cell_right = header_table.rows[0].cells
    cell_left.width = Inches(3.4)
    cell_right.width = Inches(3.6)

    p_left = cell_left.paragraphs[0]
    p_left.paragraph_format.space_after = Pt(2)
    p_left.paragraph_format.line_spacing = 1.15
    r_hdr_l1 = p_left.add_run("BỘ GIÁO DỤC VÀ ĐÀO TẠO\n")
    r_hdr_l1.bold = True
    r_hdr_l1.font.size = Pt(10)
    r_hdr_l2 = p_left.add_run("TRƯỜNG ĐẠI HỌC QUIZGEN AI\n-------------------")
    r_hdr_l2.font.size = Pt(9.5)

    p_right = cell_right.paragraphs[0]
    p_right.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_right.paragraph_format.space_after = Pt(2)
    p_right.paragraph_format.line_spacing = 1.15
    r_hdr_r1 = p_right.add_run("ĐỀ THI TRẮC NGHIỆM HỌC KỲ\n")
    r_hdr_r1.bold = True
    r_hdr_r1.font.size = Pt(10)
    clean_subject = clean_latex_to_text(subject or "Khoa học Tự nhiên & Kỹ thuật")
    r_hdr_r2 = p_right.add_run(f"Học phần: {clean_subject}\nThời gian: {duration_minutes} phút | Mã đề: {exam_code}\n")
    r_hdr_r2.font.size = Pt(9.5)
    r_hdr_r3 = p_right.add_run("(Thí sinh không được sử dụng tài liệu)")
    r_hdr_r3.italic = True
    r_hdr_r3.font.size = Pt(8.5)

    doc.add_paragraph("")

    # 2. Tiêu đề đề thi chính giữa
    clean_title = clean_latex_to_text(title or "ĐỀ THI TRẮC NGHIỆM QUIZGEN AI")
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_after = Pt(2)
    r_title = p_title.add_run(clean_title.upper())
    r_title.bold = True
    r_title.font.size = Pt(13.5)
    r_title.font.color.rgb = RGBColor(0x00, 0x5B, 0x5E)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(8)
    r_sub = p_sub.add_run(
        f"{subtitle} · Ngày xuất: {datetime.now().strftime('%d/%m/%Y %H:%M')} · Số lượng: {len(questions)} câu"
    )
    r_sub.italic = True
    r_sub.font.size = Pt(9.5)
    r_sub.font.color.rgb = RGBColor(0x55, 0x66, 0x77)

    # 3. Danh sách câu hỏi
    answer_keys: List[Dict[str, Any]] = []
    last_passage_id = None
    for idx, q in enumerate(questions, 1):
        # Hỗ trợ câu hỏi chùm (Reading Passage / Case Study): Render khối bài đọc 1 lần
        passage_data = q.get("passageData") or q.get("passage_data")
        if passage_data:
            p_id = passage_data.get("id") or passage_data.get("title")
            if p_id != last_passage_id:
                last_passage_id = p_id
                p_pas = doc.add_paragraph()
                p_pas.paragraph_format.space_before = Pt(10)
                p_pas.paragraph_format.space_after = Pt(4)
                p_pas.paragraph_format.left_indent = Inches(0.2)
                r_pas_h = p_pas.add_run(f"BÀI ĐỌC / TÌNH HUỐNG DÙNG CHUNG: {passage_data.get('title', '')}\n")
                r_pas_h.bold = True
                r_pas_h.font.size = Pt(10.5)
                r_pas_c = p_pas.add_run(clean_latex_to_text(passage_data.get("content", "")))
                r_pas_c.italic = True
                r_pas_c.font.size = Pt(10)

        q_text = clean_latex_to_text(q.get("question") or q.get("question_text") or "")
        bloom = q.get("bloomLevel") or q.get("bloom_level") or ""
        options = q.get("options") or []

        p_q = doc.add_paragraph()
        p_q.paragraph_format.space_before = Pt(6)
        p_q.paragraph_format.space_after = Pt(2)
        r_num = p_q.add_run(f"Câu {idx}")
        r_num.bold = True
        if bloom:
            r_bloom = p_q.add_run(f" [{bloom}]")
            r_bloom.italic = True
            r_bloom.font.size = Pt(9.5)
            r_bloom.font.color.rgb = RGBColor(0x00, 0x86, 0x89)
        p_q.add_run(f": {q_text}")

        # In danh sách phương án A, B, C, D
        if isinstance(options, list):
            for o_idx, opt in enumerate(options):
                if isinstance(opt, dict):
                    opt_label = opt.get("label") or opt.get("id") or chr(65 + o_idx)
                    if len(str(opt_label)) > 1 or str(opt_label).upper() not in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
                        opt_label = chr(65 + o_idx)
                    otext = clean_latex_to_text(opt.get("text") or "")
                else:
                    opt_label = chr(65 + o_idx)
                    otext = clean_latex_to_text(str(opt))

                # Tránh trùng lặp ký hiệu phương án (ví dụ A. A. Nội dung)
                otext = re.sub(r'^[A-Za-z0-9][\.:\)]\s*', '', otext).strip()

                p_opt = doc.add_paragraph()
                p_opt.paragraph_format.left_indent = Inches(0.3)
                p_opt.paragraph_format.space_after = Pt(1.5)
                r_lbl = p_opt.add_run(f"{str(opt_label).upper()}. ")
                r_lbl.bold = True
                p_opt.add_run(otext)

        # Chuẩn hóa đáp án và lời giải
        raw_ans = q.get("correctAnswerId") or q.get("correct_answer_id") or ""
        clean_ans_label = resolve_option_label(raw_ans, options)
        explanation = clean_latex_to_text(q.get("explanation") or "")
        answer_keys.append({
            "idx": idx,
            "label": clean_ans_label,
            "explanation": explanation,
        })

    # 4. Trang Bảng đáp án & Lời giải chi tiết
    doc.add_page_break()
    ans_h = doc.add_paragraph()
    ans_h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    ans_h.paragraph_format.space_after = Pt(6)
    r_ah = ans_h.add_run("BẢNG ĐÁP ÁN & HƯỚNG DẪN GIẢI CHI TIẾT")
    r_ah.bold = True
    r_ah.font.size = Pt(13)
    r_ah.font.color.rgb = RGBColor(0x00, 0x5B, 0x5E)

    # 5. Bảng ma trận đáp án 5 cột chuẩn exam-service
    if answer_keys:
        col_count = 5
        ans_table = doc.add_table(rows=1, cols=col_count)
        ans_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        ans_table.style = 'Table Grid'

        hdr_cells = ans_table.rows[0].cells
        for c_i in range(col_count):
            p_hdr = hdr_cells[c_i].paragraphs[0]
            p_hdr.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r_hdr = p_hdr.add_run("Câu - ĐA")
            r_hdr.bold = True
            r_hdr.font.size = Pt(10)

        row_cells = None
        for i, item in enumerate(answer_keys):
            col_idx = i % col_count
            if col_idx == 0:
                row_cells = ans_table.add_row().cells
            p_c = row_cells[col_idx].paragraphs[0]
            p_c.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r_c = p_c.add_run(f"Câu {item['idx']}: {item['label']}")
            r_c.font.size = Pt(10)

    # 6. Phần Hướng dẫn giải chi tiết (nếu có giải thích)
    has_explanations = any(item.get("explanation") for item in answer_keys)
    if has_explanations:
        doc.add_paragraph("")
        p_exp_h = doc.add_paragraph()
        p_exp_h.paragraph_format.space_before = Pt(8)
        p_exp_h.paragraph_format.space_after = Pt(4)
        r_eh = p_exp_h.add_run("HƯỚNG DẪN GIẢI CHI TIẾT & CĂN CỨ HỌC THUẬT")
        r_eh.bold = True
        r_eh.font.size = Pt(11.5)
        r_eh.font.color.rgb = RGBColor(0x00, 0x5B, 0x5E)

        for item in answer_keys:
            if item.get("explanation"):
                p_item = doc.add_paragraph()
                p_item.paragraph_format.space_before = Pt(3)
                p_item.paragraph_format.space_after = Pt(2)
                r_num = p_item.add_run(f"Câu {item['idx']} (Đáp án {item['label']}): ")
                r_num.bold = True
                p_item.add_run(item["explanation"])

    # Đảm bảo 100% runs mang đúng font OpenXML (Times New Roman cho mọi bảng mã)
    enforce_document_fonts(doc, "Times New Roman")

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)

    slug = slugify_vietnamese_filename(title or "de_thi_quanta")
    filename = f"{slug}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"
    return buf.getvalue(), filename


def extract_questions_from_chat_text(raw_text: str) -> List[Dict[str, Any]]:
    """Bóc tách tự động danh sách câu hỏi trắc nghiệm từ văn bản tin nhắn chat của Quanta."""
    if not raw_text or len(raw_text) < 40:
        return []
    questions: List[Dict[str, Any]] = []
    pattern = re.compile(
        r'(?:^|\n)(?:\*\*)?(?:Câu\s*)?(\d+)[\.:\)]\s*(?:\([^\)]+\)\s*)?(.*?)(?=(?:\n(?:\*\*)?(?:Câu\s*)?\d+[\.:\)]|\Z))',
        re.DOTALL,
    )
    matches = pattern.findall(raw_text)
    for _num, block in matches:
        opt_pattern = re.compile(
            r'(?:^|\n)\s*([A-D])[\.:\)]\s*(.*?)(?=(?:\n\s*[A-D][\.:\)]|\n\s*(?:\*+)?(?:Đáp án|Giải thích)|\Z))',
            re.DOTALL,
        )
        opt_matches = opt_pattern.findall(block)
        ans_match = re.search(r'(?:Đáp án|Đ/a|Correct)[\s*:]+([A-D])', block, re.IGNORECASE)
        expl_match = re.search(
            r'(?:Giải thích|Lời giải)[\s*:]+(.*?)(?=\n\s*(?:[A-D][\.:\)]|\d+[\.:\)]|\Z))',
            block,
            re.IGNORECASE | re.DOTALL,
        )
        q_text_match = re.split(r'\n\s*[A-D][\.:\)]', block)[0].strip()
        q_text = clean_stray_u(re.sub(r'^\*+|\*+$', '', q_text_match).strip())

        options = [
            {"id": o_label.upper(), "label": o_label.upper(), "text": clean_stray_u(o_text.strip())}
            for o_label, o_text in opt_matches
        ]
        if len(options) >= 2:
            expl_text = clean_stray_u(expl_match.group(1).strip()) if expl_match else "Theo kiến thức chuyên môn."
            questions.append({
                "question": q_text,
                "options": options,
                "correctAnswerId": ans_match.group(1).upper() if ans_match else "A",
                "explanation": expl_text,
                "bloomLevel": "Thông hiểu",
            })
    return questions


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
