import io
import re
import unicodedata
from typing import List, Dict, Any
from pypdf import PdfReader
from pypdf.errors import PdfReadError, FileNotDecryptedError
import docx

class DocumentParser:
    """
    Bộ bóc tách tài liệu học thuật đa định dạng nâng cao:
    - PDF: Duyệt từng trang vật lý, làm sạch text, lọc bỏ header/footer lặp lại, xử lý file mã hóa/hỏng.
    - DOCX: Trích xuất đoạn văn (paragraphs) và bảng biểu (tables) theo chuẩn Markdown bảng (| col1 | col2 |).
    - Bộ lọc Header/Footer: Tự động loại bỏ số trang và tiêu đề chạy lặp lại trên nhiều trang.
    """

    PAGE_NUMBER_REGEX = re.compile(
        r"^(?:Trang|Page|trang|page)\s*\d+(?:\s*(?:/|of|-)\s*\d+)?$|"
        r"^\s*\d+\s*(?:/|of|-)\s*\d+\s*$|"
        r"^\s*[-–—]?\s*\d+\s*[-–—]?\s*$",
        re.IGNORECASE
    )

    VNI_WINDOWS_MAP = [
        # Chữ hoa 2 ký tự ghép VNI
        ('AÁ', 'Ấ'), ('AÀ', 'Ầ'), ('AẢ', 'Ẩ'), ('AÃ', 'Ẫ'), ('AẠ', 'Ậ'),
        ('AÉ', 'Ắ'), ('AÈ', 'Ằ'), ('AẺ', 'Ẳ'), ('AẼ', 'Ẵ'), ('AẸ', 'Ặ'),
        ('AÅ', 'Ẩ'), ('AÄ', 'Ậ'), ('AÊ', 'Ă'), ('AÂ', 'Â'),
        ('EÁ', 'Ế'), ('EÀ', 'Ề'), ('EẢ', 'Ể'), ('EÃ', 'Ễ'), ('EẠ', 'Ệ'),
        ('EÅ', 'Ể'), ('EÄ', 'Ệ'), ('EÂ', 'Ê'),
        ('OÁ', 'Ố'), ('OÀ', 'Ồ'), ('OẢ', 'Ổ'), ('OÃ', 'Ỗ'), ('OẠ', 'Ộ'),
        ('OÅ', 'Ổ'), ('OÄ', 'Ộ'), ('OÂ', 'Ô'),
        ('ÔÁ', 'Ớ'), ('ÔÀ', 'Ờ'), ('ÔẢ', 'Ở'), ('ÔÃ', 'Ỡ'), ('ÔẠ', 'Ợ'),
        ('ÔÙ', 'Ớ'), ('ÔØ', 'Ờ'), ('ÔÛ', 'Ở'), ('ÔÕ', 'Ỡ'), ('ÔÏ', 'Ợ'),
        ('ÖÁ', 'Ứ'), ('ÖÀ', 'Ừ'), ('ÖẢ', 'Ử'), ('ÖÃ', 'Ữ'), ('ÖẠ', 'Ự'),
        ('ÖÙ', 'Ứ'), ('ÖØ', 'Ừ'), ('ÖÛ', 'Ử'), ('ÖÕ', 'Ữ'), ('ÖÏ', 'Ự'),
        ('UÁ', 'Ú'), ('UÀ', 'Ù'), ('UẢ', 'Ủ'), ('UÃ', 'Ũ'), ('UẠ', 'Ụ'),
        ('UÙ', 'Ú'), ('UØ', 'Ù'), ('UÛ', 'Ủ'), ('UÕ', 'Ũ'), ('UÏ', 'Ụ'),
        ('AÙ', 'Á'), ('AØ', 'À'), ('AÛ', 'Ả'), ('AÕ', 'Ã'), ('AÏ', 'Ạ'),
        ('EÙ', 'É'), ('EØ', 'È'), ('EÛ', 'Ẻ'), ('EÕ', 'Ẽ'), ('EÏ', 'Ẹ'),
        ('OÙ', 'Ó'), ('OØ', 'Ò'), ('OÛ', 'Ỏ'), ('OÕ', 'Õ'), ('OÏ', 'Ọ'),
        ('YÙ', 'Ý'), ('YØ', 'Ỳ'), ('YÛ', 'Ỷ'), ('YÕ', 'Ỹ'),

        # Chữ thường 2 ký tự ghép VNI
        ('aù', 'á'), ('aø', 'à'), ('aû', 'ả'), ('aõ', 'ã'), ('aï', 'ạ'),
        ('aê', 'ă'), ('aé', 'ắ'), ('aè', 'ằ'), ('aú', 'ẳ'), ('aü', 'ẵ'), ('aë', 'ặ'),
        ('aâ', 'â'), ('aá', 'ấ'), ('aà', 'ầ'), ('aå', 'ẩ'), ('aã', 'ẫ'), ('aä', 'ậ'),
        ('eù', 'é'), ('eø', 'è'), ('eû', 'ẻ'), ('eõ', 'ẽ'), ('eï', 'ẹ'),
        ('eâ', 'ê'), ('eá', 'ế'), ('eà', 'ề'), ('eå', 'ể'), ('eã', 'ễ'), ('eä', 'ệ'),
        ('où', 'ó'), ('oø', 'ò'), ('oû', 'ỏ'), ('oõ', 'õ'), ('oï', 'ọ'),
        ('oâ', 'ô'), ('oá', 'ố'), ('oà', 'ồ'), ('oå', 'ổ'), ('oã', 'ỗ'), ('oä', 'ộ'),
        ('ôù', 'ớ'), ('ôø', 'ờ'), ('ôû', 'ở'), ('ôõ', 'ỡ'), ('ôï', 'ợ'),
        ('uù', 'ú'), ('uø', 'ù'), ('uû', 'ủ'), ('uõ', 'ũ'), ('uï', 'ụ'),
        ('öù', 'ứ'), ('öø', 'ừ'), ('öû', 'ử'), ('öõ', 'ữ'), ('öï', 'ự'),
        ('yù', 'ý'), ('yø', 'ỳ'), ('yû', 'ỷ'), ('yõ', 'ỹ'),

        # Ký tự đơn trong VNI-Windows
        ('Ò', 'Ị'), ('Ó', 'Í'), ('Õ', 'Ĩ'), ('Ñ', 'Đ'), ('ñ', 'đ'),
        ('ô', 'ơ'), ('ö', 'ư'), ('Ô', 'Ơ'), ('Ö', 'Ư'),
        ('í', 'í'), ('ì', 'ì'), ('æ', 'ỉ'), ('ó', 'ĩ'), ('ò', 'ị'), ('î', 'ỵ'),
        ('Í', 'Í'), ('Ì', 'Ì'), ('Î', 'Ỵ')
    ]

    @classmethod
    def convert_legacy_vietnamese_fonts(cls, text: str) -> str:
        """Tự động phát hiện và chuyển đổi bảng mã cũ VNI-Windows / TCVN3 sang Unicode UTF-8 chuẩn"""
        if not text:
            return ""
        if any(marker in text for marker in ('CHUYE', 'VÒ', 'CHÒU', 'DAÀM', 'UOÁN', 'aù', 'aø', 'aû', 'aõ', 'aï', 'eù', 'eø', 'eû', 'eõ', 'eï', 'où', 'oø', 'oû', 'oõ', 'oï', 'uù', 'uø', 'uû', 'uõ', 'uï', 'AÙ', 'AØ', 'AÛ', 'AÕ', 'AÏ', 'EÙ', 'EØ', 'EÛ', 'EÕ', 'EÏ', 'OÙ', 'OØ', 'OÛ', 'OÕ', 'OÏ', 'UÙ', 'UØ', 'UÛ', 'UÕ', 'UÏ', 'EÅ', 'OÁ', 'AÀ', 'AÁ', 'Ö', 'Ô')):
            for old, new in cls.VNI_WINDOWS_MAP:
                if old in text:
                    text = text.replace(old, new)
        return unicodedata.normalize("NFC", text)

    @classmethod
    def _clean_text(cls, text: str) -> str:
        """Làm sạch ký tự điều khiển, chuẩn hóa Unicode NFC và xử lý lỗi font tiếng Việt VNI/TCVN3"""
        if not text:
            return ""
        # 1. Tự động chuyển đổi bảng mã font cũ (VNI-Windows) nếu có
        text = cls.convert_legacy_vietnamese_fonts(text)
        # 2. Chuẩn hóa bảng mã Unicode sang chuẩn dựng sẵn (NFC)
        text = unicodedata.normalize("NFC", text)
        # 3. Thay thế ký tự điều khiển ngoại trừ tab và xuống dòng
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
        # 4. Nối từ bị ngắt dòng bằng dấu gạch ngang (ví dụ: "kinh- \ntế" -> "kinh tế")
        text = re.sub(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", text)
        # 5. Chuẩn hóa khoảng trắng liên tiếp
        text = re.sub(r"[ \t]+", " ", text)
        # 6. Chuẩn hóa xuống dòng liên tiếp
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    @classmethod
    def _filter_running_headers_footers(cls, pages_raw: List[List[str]]) -> List[str]:
        """
        Nhận diện và lọc bỏ các tiêu đề đầu trang (running headers) và chân trang (footers):
        1. Lọc bỏ các dòng chứa số trang đơn thuần (ví dụ: "Trang 1 / 40", "12", "- 5 -").
        2. Lọc bỏ các dòng lặp lại giống hệt nhau ở dòng đầu hoặc dòng cuối trên >= 40% số trang (tối thiểu 3 trang).
        """
        total_pages = len(pages_raw)
        if total_pages < 3:
            return ["\n".join(lines).strip() for lines in pages_raw]

        header_counts: Dict[str, int] = {}
        footer_counts: Dict[str, int] = {}

        for lines in pages_raw:
            if not lines:
                continue
            # Kiểm tra dòng đầu (header candidate)
            first_line = lines[0].strip()
            if first_line and len(first_line) < 120 and not cls.PAGE_NUMBER_REGEX.match(first_line):
                header_counts[first_line] = header_counts.get(first_line, 0) + 1

            # Kiểm tra dòng cuối (footer candidate)
            last_line = lines[-1].strip()
            if last_line and len(last_line) < 120 and not cls.PAGE_NUMBER_REGEX.match(last_line):
                footer_counts[last_line] = footer_counts.get(last_line, 0) + 1

        threshold = max(2, int(total_pages * 0.40))
        repeated_headers = {h for h, c in header_counts.items() if c >= threshold}
        repeated_footers = {f for f, c in footer_counts.items() if c >= threshold}

        cleaned_pages = []
        for lines in pages_raw:
            if not lines:
                cleaned_pages.append("")
                continue

            filtered_lines = []
            for idx, line in enumerate(lines):
                s = line.strip()
                # 1. Bỏ qua số trang ở đầu hoặc cuối trang
                if (idx <= 1 or idx >= len(lines) - 2) and cls.PAGE_NUMBER_REGEX.match(s):
                    continue
                # 2. Bỏ qua tiêu đề chạy lặp lại ở đầu trang
                if idx <= 1 and s in repeated_headers:
                    continue
                # 3. Bỏ qua chân trang lặp lại ở cuối trang
                if idx >= len(lines) - 2 and s in repeated_footers:
                    continue
                filtered_lines.append(line)

            cleaned_pages.append("\n".join(filtered_lines).strip())

        return cleaned_pages

    @staticmethod
    def parse_pdf(file_bytes: bytes, extract_images_dir: Any = None, document_id: str = "doc") -> List[Dict[str, Any]]:
        """
        Bóc tách từng trang PDF, làm sạch và áp dụng bộ lọc Header/Footer lặp lại.
        Sử dụng bộ tăng tốc PyMuPDF (fitz C++) cho tốc độ 300+ trang/giây, tự động fallback sang pypdf.
        Đồng thời tự động trích xuất các hình vẽ/sơ đồ/đồ thị học thuật từ các trang tài liệu.
        Ném ngoại lệ ValueError nếu file hỏng, bị mã hóa hoặc không có text.
        """
        raw_pages_lines = []
        raw_pages_images: List[List[Dict[str, Any]]] = []
        try:
            import fitz
            from pathlib import Path
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            if doc.is_encrypted:
                if not doc.authenticate(""):
                    raise ValueError("Tài liệu PDF được bảo vệ bằng mật khẩu. Vui lòng mở khóa trước khi tải lên.")
            
            # Đảm bảo thư mục lưu ảnh tồn tại nếu được chỉ định
            img_dir_path = None
            if extract_images_dir:
                img_dir_path = Path(extract_images_dir)
                img_dir_path.mkdir(parents=True, exist_ok=True)

            for page_idx, page in enumerate(doc):
                try:
                    raw_text = page.get_text() or ""
                except Exception:
                    raw_text = ""
                lines = [DocumentParser._clean_text(l) for l in raw_text.split("\n") if l.strip()]
                raw_pages_lines.append(lines)

                # Trích xuất hình ảnh/sơ đồ từ trang
                page_imgs = []
                try:
                    image_list = page.get_images(full=True)
                    img_count = 0
                    for img_idx, img_info in enumerate(image_list):
                        if img_count >= 5:  # Tối đa 5 hình/trang để tối ưu tài nguyên
                            break
                        xref = img_info[0]
                        base_image = doc.extract_image(xref)
                        w = base_image.get("width", 0)
                        h = base_image.get("height", 0)
                        img_bytes = base_image.get("image")
                        ext = base_image.get("ext", "png")

                        # Lọc bỏ icon, bullet nhỏ, dải màu trang trí
                        if w >= 80 and h >= 80 and img_bytes and len(img_bytes) >= 1200:
                            img_count += 1
                            filename = f"{document_id}_p{page_idx+1}_img{img_count}.{ext}"
                            saved_path = None
                            if img_dir_path:
                                target_file = img_dir_path / filename
                                target_file.write_bytes(img_bytes)
                                saved_path = str(target_file)
                            
                            page_imgs.append({
                                "id": f"img-{document_id}-p{page_idx+1}-{img_count}",
                                "url": f"/api/v1/documents/images/{filename}",
                                "path": saved_path,
                                "page": page_idx + 1,
                                "page_number": page_idx + 1,
                                "width": w,
                                "height": h,
                                "caption": f"Hình sơ đồ / minh họa trang {page_idx+1}"
                            })
                except Exception:
                    pass
                raw_pages_images.append(page_imgs)

            doc.close()
        except ImportError:
            try:
                reader = PdfReader(io.BytesIO(file_bytes))
            except PdfReadError as e:
                raise ValueError(f"Tệp PDF bị hỏng hoặc cấu trúc không hợp lệ: {str(e)}")
            except Exception as e:
                raise ValueError(f"Không thể đọc tệp PDF: {str(e)}")

            if reader.is_encrypted:
                try:
                    decrypted = reader.decrypt("")
                    if not decrypted:
                        raise ValueError("Tài liệu PDF được bảo vệ bằng mật khẩu. Vui lòng mở khóa trước khi tải lên.")
                except FileNotDecryptedError:
                    raise ValueError("Tài liệu PDF được bảo vệ bằng mật khẩu. Vui lòng mở khóa trước khi tải lên.")

            for page in reader.pages:
                try:
                    raw_text = page.extract_text() or ""
                except Exception:
                    raw_text = ""
                lines = [DocumentParser._clean_text(l) for l in raw_text.split("\n") if l.strip()]
                raw_pages_lines.append(lines)
                raw_pages_images.append([])

        # Áp dụng bộ lọc Header/Footer đa trang
        filtered_page_texts = DocumentParser._filter_running_headers_footers(raw_pages_lines)

        pages_content = []
        total_extracted_chars = 0

        for idx, text in enumerate(filtered_page_texts):
            clean_page_text = DocumentParser._clean_text(text)
            total_extracted_chars += len(clean_page_text)
            page_imgs = raw_pages_images[idx] if idx < len(raw_pages_images) else []
            pages_content.append({
                "page_number": idx + 1,
                "text": clean_page_text,
                "images": page_imgs
            })

        if total_extracted_chars == 0:
            raise ValueError(
                "Tài liệu PDF là dạng ảnh quét (scan) chưa qua nhận dạng quang học (OCR) "
                "hoặc không chứa văn bản có thể trích xuất."
            )

        return pages_content

    @staticmethod
    def parse_docx(file_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Bóc tách file Word (.docx), duyệt toàn bộ đoạn văn và bảng biểu (tables).
        Chuẩn hóa bảng biểu sang cú pháp Markdown table chuẩn (| Col 1 | Col 2 |).
        Phân cụm văn bản thành các khối trang giả lập (pseudo-pages) ~400 từ.
        """
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
        except Exception as e:
            raise ValueError(f"Tệp DOCX bị lỗi cấu trúc hoặc không phải định dạng Word hợp lệ: {str(e)}")

        full_text_blocks = []

        # 1. Trích xuất các đoạn văn (paragraphs)
        for para in doc.paragraphs:
            clean_para = DocumentParser._clean_text(para.text)
            if clean_para:
                full_text_blocks.append(clean_para)

        # 2. Trích xuất nội dung bảng biểu (tables) với chuẩn Markdown Table
        for table in doc.tables:
            table_rows = []
            is_first_row = True
            col_count = 0

            for row in table.rows:
                # Loại bỏ các ô trùng lặp do merge cell (dựa trên cell._tc)
                seen_tc = set()
                row_cells = []
                for cell in row.cells:
                    if cell._tc not in seen_tc:
                        seen_tc.add(cell._tc)
                        # Biến đổi các dòng con bên trong cell thành 1 dòng duy nhất
                        cell_clean = DocumentParser._clean_text(cell.text).replace("\n", " ")
                        cell_clean = re.sub(r"\s+", " ", cell_clean).strip()
                        # Tránh dấu | gây xung đột Markdown table
                        cell_clean = cell_clean.replace("|", "&#124;")
                        row_cells.append(cell_clean if cell_clean else "-")

                if row_cells:
                    if is_first_row:
                        col_count = len(row_cells)
                        table_rows.append("| " + " | ".join(row_cells) + " |")
                        table_rows.append("| " + " | ".join(["---"] * col_count) + " |")
                        is_first_row = False
                    else:
                        # Đảm bảo đủ số cột
                        while len(row_cells) < col_count:
                            row_cells.append("-")
                        table_rows.append("| " + " | ".join(row_cells[:col_count]) + " |")

            if table_rows:
                full_text_blocks.append("\n".join(table_rows))

        combined = "\n\n".join(full_text_blocks).strip()
        if not combined:
            raise ValueError("Tài liệu DOCX không chứa văn bản có thể trích xuất.")

        # Chia thành các khối giả lập trang (pseudo-pages ~400 từ/trang)
        words = combined.split()
        chunk_size = 400
        pseudo_pages = []

        for i in range(0, len(words), chunk_size):
            block = " ".join(words[i:i + chunk_size])
            pseudo_pages.append({
                "page_number": (i // chunk_size) + 1,
                "text": block
            })

        return pseudo_pages
