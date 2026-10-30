import re
from typing import List, Dict, Any

class TextChunker:
    @staticmethod
    def chunk_by_semantic_blocks(
        pages: List[Dict[str, Any]], 
        document_id: str, 
        max_chunk_chars: int = 1000, 
        overlap: int = 150
    ) -> List[Dict[str, Any]]:
        """
        Chia nhỏ trang sách thành các chunk ngữ nghĩa có chứa metadata:
        - document_id
        - page_number
        - chapter_guess
        - text_snippet
        """
        chunks = []
        chunk_idx = 1
        current_chapter = "Chương mở đầu"

        for p in pages:
            page_num = p["page_number"]
            text = p["text"]

            # Heuristic regex để nhận diện tên chương
            chapter_match = re.search(r"(Chương\s+[0-9IVXLCDM]+[:\-–]?\s*[^\n]+)", text, re.IGNORECASE)
            if chapter_match:
                current_chapter = chapter_match.group(1).strip()

            # Sliding window chunking
            start = 0
            text_len = len(text)
            if text_len == 0:
                continue

            while start < text_len:
                end = min(start + max_chunk_chars, text_len)
                chunk_text = text[start:end].strip()
                
                if len(chunk_text) > 80:  # Bỏ qua các đoạn quá ngắn
                    chunks.append({
                        "chunk_id": f"{document_id}_c{chunk_idx:04d}",
                        "document_id": document_id,
                        "page_number": page_num,
                        "chapter": current_chapter,
                        "text": chunk_text,
                        "char_count": len(chunk_text)
                    })
                    chunk_idx += 1

                start += max_chunk_chars - overlap

        return chunks
