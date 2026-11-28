import io
import os
import re
import base64
import urllib.request
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image as PILImage
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def clean_latex_to_text(text: str) -> str:
    """
    [SCRUM-102] / [SCRUM-145] Bộ chuyển đổi và làm sạch ký hiệu LaTeX sang Unicode Toán học trực quan:
    Hỗ trợ chuyển các công thức $...$ hoặc các lệnh LaTeX thường gặp thành ký tự hiển thị sắc nét trong Word (.docx)
    """
    if not text or not isinstance(text, str):
        return ""

    s = text

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

    # Tự động tách khoảng trắng giữa biến số/số và hàm toán học (vd: iarctan -> i arctan, 5e^ -> 5 e^)
    s = re.sub(r'([0-9a-zA-Zα-ωΑ-Ω])(arcsin|arccos|arctan|sinh|cosh|tanh|cot|(?<!arc)sin|(?<!arc)cos|(?<!arc)tan|ln|log|exp)', r'\1 \2', s)
    s = re.sub(r'(\d)\s*(e\^)', r'\1 \2', s)
    # Tách hàm và biến sau nó: không tách chữ h của sinh, cosh, tanh
    s = re.sub(r'(arcsin|arccos|arctan|sinh|cosh|tanh|cot|(?<!arc)sin(?!h)|(?<!arc)cos(?!h)|(?<!arc)tan(?!h)|ln|log|exp)\s*([α-ωΑ-Ωa-zA-Z])', r'\1 \2', s)

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

    # Xóa bỏ các ký tự dấu $ bao quanh công thức (loại bỏ tất cả dấu $)
    s = s.replace('$$', '').replace('$', '')

    # Xóa các lệnh định dạng thừa trong LaTeX (\text{...}, \mathbf{...}, \mathit{...})
    s = re.sub(r'\\(text|mathbf|mathit|mathrm|mathbb)\{([^{}]+)\}', r'\2', s)

    # Làm sạch khoảng trắng thừa và dấu ngoặc thoát
    s = re.sub(r'\\,', ' ', s)
    s = re.sub(r'\\;', ' ', s)
    s = re.sub(r'\\quad', '   ', s)
    s = re.sub(r'\\([{}])', r'\1', s)

    return s.strip()

class WordExamExporter:
    @classmethod
    def _resolve_image_stream(cls, img_source: Any) -> Optional[Tuple[io.BytesIO, float, float]]:
        """
        Nhận diện và nạp dữ liệu ảnh từ URL, Base64 data URI hoặc file path cục bộ.
        Trả về (BytesIO stream, original_width_px, original_height_px) hoặc None nếu lỗi.
        """
        if not img_source:
            return None

        raw_bytes: Optional[bytes] = None

        try:
            # 1. Nếu là bytes hoặc BytesIO
            if isinstance(img_source, (bytes, bytearray)):
                raw_bytes = bytes(img_source)
            elif isinstance(img_source, io.BytesIO):
                raw_bytes = img_source.getvalue()
            elif isinstance(img_source, str):
                img_source = img_source.strip()
                if not img_source:
                    return None

                # 2. Base64 Data URI (ví dụ: data:image/png;base64,...)
                if img_source.startswith("data:image/") and ";base64," in img_source:
                    b64_part = img_source.split(";base64,")[1]
                    raw_bytes = base64.b64decode(b64_part)
                # 3. Chuỗi Base64 dài thuần
                elif len(img_source) > 200 and not img_source.startswith("http") and not os.path.exists(img_source):
                    try:
                        raw_bytes = base64.b64decode(img_source)
                    except Exception:
                        pass

                # 4. Web URL (http/https hoặc /api/ nội bộ)
                if not raw_bytes:
                    target_url = img_source
                    if img_source.startswith("/"):
                        target_url = f"http://127.0.0.1:8000{img_source}"
                    if target_url.startswith("http://") or target_url.startswith("https://"):
                        try:
                            req = urllib.request.Request(
                                target_url,
                                headers={"User-Agent": "QuizGenAI-WordExporter/1.0"}
                            )
                            with urllib.request.urlopen(req, timeout=4) as resp:
                                raw_bytes = resp.read()
                        except Exception:
                            pass

                # 5. File path cục bộ và media nội bộ của document-service
                if not raw_bytes:
                    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
                    clean_fname = os.path.basename(img_source.split("?")[0])
                    doc_data = os.path.join(repo_root, "services", "document-service", "data")
                    candidates = [
                        img_source,
                        os.path.abspath(img_source),
                        os.path.join(doc_data, "extracted_images", clean_fname),
                        os.path.join(doc_data, "question_attachments", clean_fname),
                        os.path.join(doc_data, "forum_attachments", clean_fname),
                        os.path.join(doc_data, "uploads", clean_fname),
                        os.path.join(repo_root, img_source.lstrip("/\\")),
                        os.path.join(repo_root, "services", "document-service", img_source.lstrip("/\\")),
                        os.path.join(repo_root, "services", "document-service", "data", img_source.lstrip("/\\")),
                        os.path.join(repo_root, "services", "document-service", "uploads", img_source.lstrip("/\\")),
                        os.path.join(repo_root, "uploads", img_source.lstrip("/\\")),
                        os.path.join(os.getcwd(), img_source.lstrip("/\\")),
                    ]
                    # Thử thêm các đuôi mở rộng phổ biến
                    stem = os.path.splitext(clean_fname)[0]
                    for ext in [".png", ".jpg", ".jpeg", ".webp"]:
                        candidates.append(os.path.join(doc_data, "extracted_images", f"{stem}{ext}"))
                        candidates.append(os.path.join(doc_data, "question_attachments", f"{stem}{ext}"))
                    for p in candidates:
                        if os.path.isfile(p):
                            try:
                                with open(p, "rb") as f:
                                    raw_bytes = f.read()
                                break
                            except Exception:
                                continue

            if not raw_bytes:
                return None

            # Xử lý nếu dữ liệu là SVG hoặc cần vẽ khung đồ họa thay thế
            if raw_bytes.strip().startswith(b"<svg") or raw_bytes.strip().startswith(b"<?xml"):
                try:
                    from PIL import ImageDraw
                    fallback_img = PILImage.new('RGB', (560, 160), color='#F8FAFC')
                    draw = ImageDraw.Draw(fallback_img)
                    draw.rectangle([(2, 2), (557, 157)], outline='#CBD5E1', width=2)
                    draw.rectangle([(250, 20), (310, 70)], outline='#94A3B8', fill='#F1F5F9', width=1)
                    draw.text((280, 95), f"So do hoc thuat: {clean_fname[:40]}", fill='#1E293B', anchor='mm')
                    draw.text((280, 125), "(Hinh anh dinh kem theo de thi)", fill='#64748B', anchor='mm')
                    buf = io.BytesIO()
                    fallback_img.save(buf, format="PNG")
                    buf.seek(0)
                    return buf, 560.0, 160.0
                except Exception:
                    return None

            # Kiểm tra và lấy kích thước gốc bằng Pillow
            try:
                pil_img = PILImage.open(io.BytesIO(raw_bytes))
            except Exception:
                from PIL import ImageDraw
                fallback_img = PILImage.new('RGB', (560, 160), color='#F8FAFC')
                draw = ImageDraw.Draw(fallback_img)
                draw.rectangle([(2, 2), (557, 157)], outline='#CBD5E1', width=2)
                draw.text((280, 80), f"So do dinh kem: {clean_fname[:40]}", fill='#1E293B', anchor='mm')
                buf = io.BytesIO()
                fallback_img.save(buf, format="PNG")
                buf.seek(0)
                return buf, 560.0, 160.0
            w_px, h_px = pil_img.size

            buf = io.BytesIO()
            if pil_img.format not in ("PNG", "JPEG", "JPG"):
                if pil_img.mode in ("RGBA", "LA", "P"):
                    pil_img.save(buf, format="PNG")
                else:
                    pil_img.convert("RGB").save(buf, format="JPEG", quality=95)
                buf.seek(0)
            else:
                buf = io.BytesIO(raw_bytes)

            return buf, float(w_px), float(h_px)
        except Exception:
            return None

    @classmethod
    def _insert_question_diagram(cls, doc: Document, q: Dict[str, Any]):
        """
        Tự động chèn hình vẽ sơ đồ vào ngay dưới nội dung câu hỏi,
        căn giữa và điều chỉnh kích thước chuẩn lề in A4.
        """
        img_ref = (
            q.get("imageUrl") or
            q.get("image_url") or
            q.get("imagePath") or
            q.get("image_path") or
            q.get("diagramUrl") or
            q.get("diagram_url") or
            q.get("image") or
            q.get("figureUrl") or
            q.get("figure_url")
        )
        if not img_ref:
            return

        res = cls._resolve_image_stream(img_ref)
        if not res:
            return

        stream, orig_w, orig_h = res

        # Chuẩn kích thước in A4: Max width 4.8 in (12.2 cm), Max height 2.8 in (7.1 cm)
        MAX_W = 4.8
        MAX_H = 2.8
        aspect = orig_h / max(orig_w, 1.0)

        calc_w = min(MAX_W, orig_w / 96.0) if orig_w > 0 else MAX_W
        if calc_w > MAX_W:
            calc_w = MAX_W
        calc_h = calc_w * aspect
        if calc_h > MAX_H:
            calc_h = MAX_H
            calc_w = calc_h / aspect

        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(4)
        p_img.paragraph_format.space_after = Pt(2)
        r_img = p_img.add_run()
        r_img.add_picture(stream, width=Inches(calc_w), height=Inches(calc_h))

        caption = (
            q.get("imageCaption") or
            q.get("image_caption") or
            q.get("caption") or
            q.get("diagramCaption") or
            q.get("diagram_caption") or
            ""
        )
        if caption:
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_before = Pt(0)
            p_cap.paragraph_format.space_after = Pt(4)
            r_cap = p_cap.add_run(f"({caption})")
            r_cap.italic = True
            r_cap.font.size = Pt(8.5)
            r_cap.font.color.rgb = RGBColor(100, 116, 139)

    @classmethod
    def _set_cell_background(cls, cell, hex_color: str):
        """Đặt màu nền cho ô bảng trong Word."""
        try:
            tcPr = cell._tc.get_or_add_tcPr()
            shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
            tcPr.append(shd)
        except Exception:
            pass

    @classmethod
    def draw_omr_50_sheet(
        cls,
        doc: Document,
        university: str = "ĐẠI HỌC QUỐC GIA",
        faculty: str = "Khoa Công nghệ Thông tin",
        subject: str = "Môn học",
        exam_code: str = "101",
        is_new_page: bool = True
    ):
        """
        Vẽ Phiếu trả lời trắc nghiệm chuẩn 50 câu thi đại học vào tài liệu Word (.docx):
        - Header 2 cột: Tên trường/khoa và Hội đồng khảo thí & Mã đề
        - Tiêu đề nổi bật: PHIẾU TRẢ LỜI TRẮC NGHIỆM CHUẨN 50 CÂU
        - Khung thông tin cá nhân thí sinh (Ghi bằng bút mực)
        - Khung Số Báo Danh (SBD 6 chữ số) và Mã Đề thi (3 chữ số)
        - Hướng dẫn tô đáp án bằng bút chì 2B
        - Lưới 50 câu trắc nghiệm chia 2 cột lớn (Câu 01-25 và Câu 26-50), mỗi câu 4 ô tô [ A ] [ B ] [ C ] [ D ]
        - Chân trang định danh OMR quang học
        """
        if is_new_page:
            doc.add_page_break()

        # 1. Header bảng 2 cột
        header_table = doc.add_table(rows=1, cols=2)
        header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        c_left, c_right = header_table.rows[0].cells
        
        p_left = c_left.paragraphs[0]
        p_left.paragraph_format.space_before = Pt(0)
        p_left.paragraph_format.space_after = Pt(2)
        r_u = p_left.add_run(f"{university.upper()}\n")
        r_u.bold = True
        r_u.font.size = Pt(9.5)
        r_f = p_left.add_run(f"{faculty.upper()}")
        r_f.font.size = Pt(8.5)

        p_right = c_right.paragraphs[0]
        p_right.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_right.paragraph_format.space_before = Pt(0)
        p_right.paragraph_format.space_after = Pt(2)
        r_hd = p_right.add_run("HỘI ĐỒNG KHẢO THÍ & BẢO ĐẢM CHẤT LƯỢNG\n")
        r_hd.bold = True
        r_hd.font.size = Pt(9)
        r_md = p_right.add_run(f"MÃ ĐỀ THI: {exam_code}")
        r_md.bold = True
        r_md.font.size = Pt(9.5)

        # 2. Tiêu đề Phiếu trả lời trắc nghiệm
        p_title = doc.add_paragraph()
        p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_title.paragraph_format.space_before = Pt(4)
        p_title.paragraph_format.space_after = Pt(1)
        r_title = p_title.add_run("PHIẾU TRẢ LỜI TRẮC NGHIỆM")
        r_title.bold = True
        r_title.font.size = Pt(13)

        p_sub = doc.add_paragraph()
        p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_sub.paragraph_format.space_before = Pt(0)
        p_sub.paragraph_format.space_after = Pt(4)
        r_sub = p_sub.add_run("CHUẨN 50 CÂU THI ĐẠI HỌC VÀ KHẢO THÍ CHUẨN HÓA")
        r_sub.italic = True
        r_sub.font.size = Pt(8)

        # 3. Khung Thông tin Thí sinh & Số Báo Danh / Mã đề
        info_table = doc.add_table(rows=1, cols=2)
        info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        c_info, c_sbd = info_table.rows[0].cells
        c_info.width = Inches(4.3)
        c_sbd.width = Inches(2.7)

        # Khung thông tin cá nhân
        p_info = c_info.paragraphs[0]
        p_info.paragraph_format.space_before = Pt(0)
        p_info.paragraph_format.space_after = Pt(2)
        r_ih = p_info.add_run("THÔNG TIN THÍ SINH (Ghi bằng bút mực):\n")
        r_ih.bold = True
        r_ih.font.size = Pt(8.5)

        fields = [
            "• Họ và tên: ..........................................................................",
            "• Ngày sinh: ....../....../........   Giới tính: Nam [   ]  Nữ [   ]",
            "• Lớp / Phòng thi: ...........................   Số bàn: .............",
            f"• Môn thi: {subject} ({faculty})",
            "• Chữ ký GT 1: .....................  Chữ ký GT 2: ....................."
        ]
        for f in fields:
            p = c_info.add_paragraph()
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            r = p.add_run(f)
            r.font.size = Pt(8)

        # Khung SBD & Mã đề
        p_sbd = c_sbd.paragraphs[0]
        p_sbd.paragraph_format.space_before = Pt(0)
        p_sbd.paragraph_format.space_after = Pt(2)
        r_sh = p_sbd.add_run("SỐ BÁO DANH & MÃ ĐỀ:\n")
        r_sh.bold = True
        r_sh.font.size = Pt(8.5)

        p_sbd_box = c_sbd.add_paragraph()
        p_sbd_box.paragraph_format.space_before = Pt(1)
        p_sbd_box.paragraph_format.space_after = Pt(1)
        code_str = str(exam_code).zfill(3)[-3:]
        r_sb = p_sbd_box.add_run(f"SBD: [  ] [  ] [  ] [  ] [  ] [  ]  |  MÃ ĐỀ: [ {code_str[0]} ] [ {code_str[1]} ] [ {code_str[2]} ]\n")
        r_sb.font.size = Pt(8)
        r_sb.bold = True

        p_sbd_grid = c_sbd.add_paragraph()
        p_sbd_grid.paragraph_format.space_before = Pt(1)
        p_sbd_grid.paragraph_format.space_after = Pt(1)
        p_sbd_grid.add_run("Tô số: (0) (1) (2) (3) (4) (5) (6) (7) (8) (9)").font.size = Pt(7.5)

        # 4. Hướng dẫn tô chì 2B
        p_guide = doc.add_paragraph()
        p_guide.paragraph_format.space_before = Pt(3)
        p_guide.paragraph_format.space_after = Pt(3)
        r_gh = p_guide.add_run("HƯỚNG DẪN TÔ ĐÁP ÁN: ")
        r_gh.bold = True
        r_gh.font.size = Pt(7.5)
        r_gt = p_guide.add_run("Dùng bút chì 2B tô kín vòng tròn phương án chọn. [ ĐÚNG: ( ● ) ]   [ SAI: ( X )  ( / )  ( - ) ]")
        r_gt.font.size = Pt(7.5)

        # 5. Lưới 50 câu trắc nghiệm (chia 2 cột lớn: Câu 01-25 & Câu 26-50)
        grid = doc.add_table(rows=26, cols=10)
        grid.style = 'Table Grid'
        grid.alignment = WD_TABLE_ALIGNMENT.CENTER

        hdr = grid.rows[0].cells
        cls._set_cell_background(hdr[0], "E2E8F0")
        hdr[0].text = "CÂU"
        for j in range(1, 5):
            cls._set_cell_background(hdr[j], "E2E8F0")
            hdr[j].text = ["A", "B", "C", "D"][j-1]

        cls._set_cell_background(hdr[5], "E2E8F0")
        hdr[5].text = "CÂU"
        for j in range(6, 10):
            cls._set_cell_background(hdr[j], "E2E8F0")
            hdr[j].text = ["A", "B", "C", "D"][j-6]

        for j in range(10):
            p_h = hdr[j].paragraphs[0]
            p_h.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_h.paragraph_format.space_before = Pt(1)
            p_h.paragraph_format.space_after = Pt(1)
            if p_h.runs:
                p_h.runs[0].font.size = Pt(7.5)
                p_h.runs[0].bold = True

        labels = ["A", "B", "C", "D"]
        for i in range(25):
            row = grid.rows[i + 1].cells
            q_left = i + 1
            q_right = i + 26

            # Cột trái
            row[0].text = f"{q_left:02d}"
            p_l = row[0].paragraphs[0]
            p_l.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_l.paragraph_format.space_before = Pt(0.5)
            p_l.paragraph_format.space_after = Pt(0.5)
            if p_l.runs:
                p_l.runs[0].font.size = Pt(7.5)
                p_l.runs[0].bold = True

            for opt in range(4):
                row[opt + 1].text = f"[ {labels[opt]} ]"
                p_opt = row[opt + 1].paragraphs[0]
                p_opt.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_opt.paragraph_format.space_before = Pt(0.5)
                p_opt.paragraph_format.space_after = Pt(0.5)
                if p_opt.runs:
                    p_opt.runs[0].font.size = Pt(7)

            # Cột phải
            row[5].text = f"{q_right:02d}"
            p_r = row[5].paragraphs[0]
            p_r.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_r.paragraph_format.space_before = Pt(0.5)
            p_r.paragraph_format.space_after = Pt(0.5)
            if p_r.runs:
                p_r.runs[0].font.size = Pt(7.5)
                p_r.runs[0].bold = True

            for opt in range(4):
                row[opt + 6].text = f"[ {labels[opt]} ]"
                p_opt = row[opt + 6].paragraphs[0]
                p_opt.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_opt.paragraph_format.space_before = Pt(0.5)
                p_opt.paragraph_format.space_after = Pt(0.5)
                if p_opt.runs:
                    p_opt.runs[0].font.size = Pt(7)

        # 6. Chân phiếu OMR
        p_ft = doc.add_paragraph()
        p_ft.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_ft.paragraph_format.space_before = Pt(3)
        p_ft.paragraph_format.space_after = Pt(0)
        r_ft = p_ft.add_run(f"Mã nhận dạng OMR: *OMR-50-VN-{exam_code}* | Thí sinh giữ phiếu phẳng, không làm rách hoặc vấy bẩn.")
        r_ft.italic = True
        r_ft.font.size = Pt(7)

    @classmethod
    def generate_omr_50_docx(
        cls,
        university: str = "ĐẠI HỌC QUỐC GIA",
        faculty: str = "Khoa Công nghệ Thông tin",
        subject: str = "Môn học",
        exam_code: str = "101"
    ) -> bytes:
        """Sinh riêng tệp Word (.docx) 1 trang chỉ gồm duy nhất Phiếu trả lời trắc nghiệm OMR 50 câu."""
        doc = Document()
        for section in doc.sections:
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.6)
            section.right_margin = Inches(0.6)
        cls.draw_omr_50_sheet(
            doc=doc,
            university=university,
            faculty=faculty,
            subject=subject,
            exam_code=exam_code,
            is_new_page=False
        )
        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)
        return buf.getvalue()

    @classmethod
    def generate_docx(
        cls,
        exam_title: str,
        subject: str,
        exam_code: str,
        questions: List[Dict[str, Any]],
        university: str = "ĐẠI HỌC QUỐC GIA",
        faculty: str = "Khoa Công nghệ Thông tin",
        duration_minutes: int = 60,
        include_answer_key: bool = True,
        include_explanation: bool = False,
        include_omr_sheet: bool = True
    ) -> bytes:
        doc = Document()

        # Căn lề khổ giấy A4 chuẩn khảo thí 2.0 cm (0.75 in)
        for section in doc.sections:
            section.top_margin = Inches(0.75)
            section.bottom_margin = Inches(0.75)
            section.left_margin = Inches(0.75)
            section.right_margin = Inches(0.75)

        # Header bảng 2 cột đối xứng
        header_table = doc.add_table(rows=1, cols=2)
        header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell_left, cell_right = header_table.rows[0].cells
        
        # Cột trái: Thông tin Trường / Khoa
        p_left = cell_left.paragraphs[0]
        r1 = p_left.add_run(f"{university.upper()}\n")
        r1.bold = True
        r1.font.size = Pt(11)
        r2 = p_left.add_run(f"{faculty.upper()}\n-------------------")
        r2.font.size = Pt(10)

        # Cột phải: Thông tin Đề thi & Mã đề
        p_right = cell_right.paragraphs[0]
        p_right.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r3 = p_right.add_run(f"ĐỀ THI KẾT THÚC HỌC PHẦN\nMôn thi: {subject}\n")
        r3.bold = True
        r3.font.size = Pt(11)
        r4 = p_right.add_run(f"Mã đề thi: {exam_code} | Thời gian: {duration_minutes} phút\n")
        r4.font.size = Pt(10)
        r5 = p_right.add_run("(Thí sinh không được sử dụng tài liệu)")
        r5.italic = True
        r5.font.size = Pt(9)

        doc.add_paragraph()  # Giãn cách

        # Tiêu đề đề thi chính giữa
        p_title = doc.add_paragraph()
        p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_title = p_title.add_run(exam_title.upper())
        r_title.bold = True
        r_title.font.size = Pt(14)

        doc.add_paragraph("-------------------------------------------------------------------------------------------------------")

        # Danh sách câu hỏi
        answer_keys = []
        last_passage_id = None
        for idx, q in enumerate(questions, 1):
            # 1. Hỗ trợ câu hỏi chùm (Reading Passage / Case Study): Render khối bài đọc 1 lần
            passage_data = q.get("passageData") or q.get("passage_data")
            if passage_data:
                p_id = passage_data.get("id") or passage_data.get("title")
                if p_id != last_passage_id:
                    last_passage_id = p_id
                    p_pas = doc.add_paragraph()
                    p_pas.paragraph_format.space_before = Pt(12)
                    p_pas.paragraph_format.space_after = Pt(4)
                    p_pas.paragraph_format.left_indent = Inches(0.2)
                    r_pas_h = p_pas.add_run(f"BÀI ĐỌC / TÌNH HUỐNG DÙNG CHUNG: {passage_data.get('title', '')}\n")
                    r_pas_h.bold = True
                    r_pas_h.font.size = Pt(10.5)
                    r_pas_c = p_pas.add_run(clean_latex_to_text(passage_data.get("content", "")))
                    r_pas_c.italic = True
                    r_pas_c.font.size = Pt(10)

            p_q = doc.add_paragraph()
            p_q.paragraph_format.space_before = Pt(8)
            p_q.paragraph_format.space_after = Pt(4)
            
            r_num = p_q.add_run(f"Câu {idx}: ")
            r_num.bold = True
            raw_q_text = q.get("question") or q.get("question_text") or ""
            q_text = clean_latex_to_text(raw_q_text)
            p_q.add_run(q_text)

            # Tự động chèn hình vẽ sơ đồ vào ngay dưới nội dung câu hỏi
            cls._insert_question_diagram(doc, q)

            # 2. Xử lý dạng Đúng / Sai 4 ý hoặc Trắc nghiệm đơn thông thường
            statements = q.get("statements") or []
            options = q.get("options", [])

            if statements:
                for stmt in statements:
                    p_stmt = doc.add_paragraph()
                    p_stmt.paragraph_format.left_indent = Inches(0.3)
                    p_stmt.paragraph_format.space_after = Pt(2)
                    s_label = stmt.get("label", "")
                    s_text = clean_latex_to_text(str(stmt.get("text", "")))
                    p_stmt.add_run(f"{s_label}) [ Đ / S ]  {s_text}")
                
                correct_label = " - ".join([f"{s.get('label', '')}:{'Đ' if s.get('isCorrect') else 'S'}" for s in statements])
            else:
                for opt in options:
                    p_opt = doc.add_paragraph()
                    p_opt.paragraph_format.left_indent = Inches(0.3)
                    p_opt.paragraph_format.space_after = Pt(2)
                    opt_text = clean_latex_to_text(str(opt.get('text', '')))
                    p_opt.add_run(f"{opt.get('label')}. {opt_text}")

                correct_id = q.get("correct_answer_id") or q.get("correctAnswerId")
                correct_opt = next((o for o in options if o.get("id") == correct_id), None)
                correct_label = correct_opt.get("label") if correct_opt else q.get("correctLabel", "A")

            answer_keys.append({
                "idx": idx,
                "label": correct_label,
                "explanation": q.get("explanation") or ""
            })

        # Bảng đáp án chuẩn ở trang cuối
        if include_answer_key and answer_keys:
            doc.add_page_break()
            p_ans_title = doc.add_paragraph()
            p_ans_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r_ans = p_ans_title.add_run(f"BẢNG ĐÁP ÁN CHUẨN - MÃ ĐỀ {exam_code}")
            r_ans.bold = True
            r_ans.font.size = Pt(13)

            # Bảng ma trận 5 cột
            ans_table = doc.add_table(rows=1, cols=5)
            ans_table.alignment = WD_TABLE_ALIGNMENT.CENTER
            hdr_cells = ans_table.rows[0].cells
            for i in range(5):
                hdr_cells[i].text = "Câu - ĐA"

            row_cells = None
            for i, item in enumerate(answer_keys):
                col_idx = i % 5
                if col_idx == 0:
                    row_cells = ans_table.add_row().cells
                row_cells[col_idx].text = f"Câu {item['idx']}: {item['label']}"

            # Phần giải thích chi tiết nếu có yêu cầu
            if include_explanation:
                doc.add_paragraph()
                p_exp_header = doc.add_paragraph()
                r_exp = p_exp_header.add_run("HƯỚNG DẪN GIẢI CHI TIẾT & CĂN CỨ HỌC THUẬT")
                r_exp.bold = True
                r_exp.font.size = Pt(12)

                for item in answer_keys:
                    if item.get("explanation"):
                        p_item_exp = doc.add_paragraph()
                        r_item_title = p_item_exp.add_run(f"Câu {item['idx']} (Đáp án {item['label']}): ")
                        r_item_title.bold = True
                        exp_text = clean_latex_to_text(str(item["explanation"]))
                        p_item_exp.add_run(exp_text)

        # Phiếu trả lời trắc nghiệm chuẩn OMR 50 câu (giống file PDF)
        if include_omr_sheet:
            cls.draw_omr_50_sheet(
                doc=doc,
                university=university,
                faculty=faculty,
                subject=subject,
                exam_code=exam_code,
                is_new_page=True
            )

        # Ghi vào bộ nhớ buffer và trả về dạng byte stream
        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

