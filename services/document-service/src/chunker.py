import re
from typing import List, Dict, Any, Tuple

class TextChunker:
    """
    Bộ phân đoạn ngữ nghĩa (Semantic Chunker) cho tài liệu học thuật:
    - Nhận diện chương mục tự động (Chương / Bài / Phần / Chapter).
    - Cắt khối sliding window thông minh: tự tìm ranh giới kết câu (. ? ! \\n) để tránh cắt đứt ngữ nghĩa.
    - Trả về danh sách chunks và siêu dữ liệu các chương mục kèm số trang bắt đầu / kết thúc.
    """

    CHAPTER_REGEX = re.compile(
        r"^(Chương\s+[0-9IVXLCDM]+[:\.\-\s]+[^\n\r]+|"
        r"Bài\s+[0-9IVXLCDM]+[:\.\-\s]+[^\n\r]+|"
        r"Phần\s+[0-9IVXLCDM]+[:\.\-\s]+[^\n\r]+|"
        r"Chapter\s+[0-9]+[:\.\-\s]+[^\n\r]+)",
        re.IGNORECASE | re.MULTILINE
    )

    @classmethod
    def chunk_by_semantic_blocks(
        cls,
        pages: List[Dict[str, Any]],
        document_id: str,
        max_chunk_chars: int = 1000,
        min_chunk_chars: int = 100,
        overlap: int = 150
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Bóc tách text thành danh sách chunks và tổng hợp metadata các chương mục.
        Trả về tuple: (chunks_list, chapters_metadata_list)
        """
        chunks = []
        chunk_idx = 1
        current_chapter = "Chương 1: Tổng quan mở đầu"
        
        # Lưu trữ thông tin chương mục {tên_chương: {"title": ..., "page_start": ..., "page_end": ...}}
        detected_chapters: Dict[str, Dict[str, Any]] = {}

        for p in pages:
            page_num = p["page_number"]
            text = p["text"]
            if not text.strip():
                continue

            # 1. Quét tìm tiêu đề chương trong trang hiện tại
            chapter_matches = cls.CHAPTER_REGEX.findall(text)
            if chapter_matches:
                # Lấy tên chương mới nhất phát hiện được
                new_ch = chapter_matches[-1].strip()
                # Làm sạch nếu có dấu xuống dòng thừa
                new_ch = re.sub(r"\s+", " ", new_ch).strip()
                current_chapter = new_ch

            # Cập nhật phạm vi trang của chương hiện tại
            if current_chapter not in detected_chapters:
                detected_chapters[current_chapter] = {
                    "title": current_chapter,
                    "page_start": page_num,
                    "page_end": page_num
                }
            else:
                detected_chapters[current_chapter]["page_end"] = max(
                    detected_chapters[current_chapter]["page_end"], page_num
                )

            # 2. Cắt khối sliding window thông minh
            start = 0
            text_len = len(text)

            while start < text_len:
                target_end = min(start + max_chunk_chars, text_len)
                
                # Tìm ranh giới kết câu (. ? ! \n) trong khoảng lùi 150 ký tự cuối
                actual_end = target_end
                if target_end < text_len:
                    lookback_region = text[max(start, target_end - 150):target_end]
                    # Tìm dấu chấm, chấm than, hỏi chấm hoặc xuống dòng theo sau bởi khoảng trắng
                    split_matches = list(re.finditer(r"[\.\?\!\n]\s+", lookback_region))
                    if split_matches:
                        last_match = split_matches[-1]
                        actual_end = (max(start, target_end - 150)) + last_match.end()

                chunk_text = text[start:actual_end].strip()

                if len(chunk_text) >= min_chunk_chars:
                    chunks.append({
                        "chunk_id": f"{document_id}_c{chunk_idx:04d}",
                        "document_id": document_id,
                        "page_number": page_num,
                        "chapter": current_chapter,
                        "text": chunk_text,
                        "char_count": len(chunk_text)
                    })
                    chunk_idx += 1

                # Bước nhảy trượt
                if actual_end >= text_len:
                    break
                start = max(start + 1, actual_end - overlap)

        # Chuẩn hóa danh sách chương mục trả về
        chapters_metadata = []
        for idx, (ch_name, ch_info) in enumerate(detected_chapters.items()):
            chapters_metadata.append({
                "chapter_index": idx + 1,
                "title": ch_info["title"],
                "page_start": ch_info["page_start"],
                "page_end": ch_info["page_end"]
            })

        # Nếu không nhận diện được chương nào rõ ràng, tạo ít nhất 1 chương mặc định
        if not chapters_metadata:
            max_page = max((p["page_number"] for p in pages), default=1)
            chapters_metadata = [{
                "chapter_index": 1,
                "title": "Chương 1: Toàn bộ nội dung giáo trình",
                "page_start": 1,
                "page_end": max_page
            }]

        return chunks, chapters_metadata
