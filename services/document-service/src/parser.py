import io
import re
from typing import List, Dict, Any
from pypdf import PdfReader
from pypdf.errors import PdfReadError, FileNotDecryptedError
import docx

class DocumentParser:
    """
    Bộ bóc tách tài liệu học thuật đa định dạng:
    - PDF: Duyệt từng trang vật lý, làm sạch text, xử lý file mã hóa/hỏng.
    - DOCX: Trích xuất đoạn văn (paragraphs) và bảng biểu (tables), phân cụm trang giả lập (~400 từ).
    """

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

    @staticmethod
    def parse_pdf(file_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Bóc tách từng trang PDF, trả về danh sách trang kèm số trang vật lý và text.
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
                # Thử giải mã bằng mật khẩu rỗng (cho một số file chỉ khóa quyền chỉnh sửa)
                decrypted = reader.decrypt("")
                if not decrypted:
                    raise ValueError("Tài liệu PDF được bảo vệ bằng mật khẩu. Vui lòng mở khóa trước khi tải lên.")
            except FileNotDecryptedError:
                raise ValueError("Tài liệu PDF được bảo vệ bằng mật khẩu. Vui lòng mở khóa trước khi tải lên.")

        pages_content = []
        total_extracted_chars = 0

        for idx, page in enumerate(reader.pages):
            try:
                raw_text = page.extract_text() or ""
            except Exception:
                raw_text = ""
            
            clean_text = DocumentParser._clean_text(raw_text)
            total_extracted_chars += len(clean_text)
            
            pages_content.append({
                "page_number": idx + 1,
                "text": clean_text
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

        # 2. Trích xuất nội dung bảng biểu (tables)
        for table in doc.tables:
            table_rows = []
            for row in table.rows:
                row_cells = [DocumentParser._clean_text(cell.text) for cell in row.cells if cell.text.strip()]
                if row_cells:
                    table_rows.append(" | ".join(row_cells))
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
