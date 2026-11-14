import io
import re
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

    @staticmethod
    def _clean_text(text: str) -> str:
        """Làm sạch ký tự điều khiển, chuẩn hóa khoảng trắng và dấu ngắt dòng"""
        if not text:
            return ""
        # Thay thế ký tự điều khiển ngoại trừ tab và xuống dòng
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
        # Nối từ bị ngắt dòng bằng dấu gạch ngang (ví dụ: "kinh- \ntế" -> "kinh tế")
        text = re.sub(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", text)
        # Chuẩn hóa khoảng trắng liên tiếp
        text = re.sub(r"[ \t]+", " ", text)
        # Chuẩn hóa xuống dòng liên tiếp
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
    def parse_pdf(file_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Bóc tách từng trang PDF, làm sạch và áp dụng bộ lọc Header/Footer lặp lại.
        Ném ngoại lệ ValueError nếu file hỏng, bị mã hóa hoặc không có text.
        """
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

        raw_pages_lines = []
        for page in reader.pages:
            try:
                raw_text = page.extract_text() or ""
            except Exception:
                raw_text = ""
            lines = [DocumentParser._clean_text(l) for l in raw_text.split("\n") if l.strip()]
            raw_pages_lines.append(lines)

        # Áp dụng bộ lọc Header/Footer đa trang
        filtered_page_texts = DocumentParser._filter_running_headers_footers(raw_pages_lines)

        pages_content = []
        total_extracted_chars = 0

        for idx, text in enumerate(filtered_page_texts):
            clean_page_text = DocumentParser._clean_text(text)
            total_extracted_chars += len(clean_page_text)
            pages_content.append({
                "page_number": idx + 1,
                "text": clean_page_text
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
