import io
from typing import List, Dict, Any
from pypdf import PdfReader
import docx

class DocumentParser:
    @staticmethod
    def parse_pdf(file_bytes: bytes) -> List[Dict[str, Any]]:
        """Bóc tách từng trang PDF, trả về danh sách page_number và text"""
        reader = PdfReader(io.BytesIO(file_bytes))
        pages_content = []
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages_content.append({
                "page_number": idx + 1,
                "text": text.strip()
            })
        return pages_content

    @staticmethod
    def parse_docx(file_bytes: bytes) -> List[Dict[str, Any]]:
        """Bóc tách file Word, nhóm theo heading hoặc đoạn văn bản"""
        doc = docx.Document(io.BytesIO(file_bytes))
        full_text = []
        for para in doc.paragraphs:
            if para.text.strip():
                full_text.append(para.text.strip())
        
        # Word files don't have natural pages; chunk into page-like blocks (~500 words)
        combined = "\n\n".join(full_text)
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
