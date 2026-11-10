import re
from typing import List, Dict, Any, Tuple


class EmptyChunksException(Exception):
    """Ngoại lệ ném ra khi quá trình phân đoạn tài liệu không tạo ra bất kỳ chunk hợp lệ nào"""
    pass


class TextChunker:
    """
    Bộ phân đoạn ngữ nghĩa học thuật nâng cao (Enhanced Academic Semantic Chunker):
    1. Nhận diện chương mục tự động (Chương / Bài / Phần / Chapter / Mục).
    2. Nối liền mạch văn bản liên trang (Cross-page text stitching) với ánh xạ số trang chuẩn xác.
    3. Bảo toàn bảng biểu (Markdown tables) và công thức toán học, không cắt ngang dòng bảng hoặc cụm từ.
    4. Trượt gối đầu thông minh (Sliding Window Overlap) luôn ngắt tại ranh giới kết câu hoặc dòng mới.
    5. Xử lý triệt để ngoại lệ chunks rỗng với cơ chế phục hồi ngữ cảnh (Adaptive Fallback).
    """

    CHAPTER_REGEX = re.compile(
        r"^(Chương\s+[0-9IVXLCDM]+[:\.\-\s]+[^\n\r]+|"
        r"Bài\s+[0-9IVXLCDM]+[:\.\-\s]+[^\n\r]+|"
        r"Phần\s+[0-9IVXLCDM]+[:\.\-\s]+[^\n\r]+|"
        r"Chapter\s+[0-9]+[:\.\-\s]+[^\n\r]+|"
        r"Mục\s+[0-9\.]+[:\.\-\s]+[^\n\r]+)",
        re.IGNORECASE | re.MULTILINE
    )

    @classmethod
    def _is_table_row(cls, line: str) -> bool:
        """Kiểm tra một dòng có phải là dòng của bảng Markdown hay không"""
        s = line.strip()
        return s.startswith("|") and s.endswith("|") and s.count("|") >= 2

    @classmethod
    def _is_inside_math(cls, text: str, pos: int) -> bool:
        """Kiểm tra vị trí pos có nằm giữa công thức toán $...$ hay không"""
        prev_nl = text.rfind("\n", 0, pos)
        line_start = prev_nl + 1 if prev_nl != -1 else 0
        line_sub = text[line_start:pos]
        dollar_count = len(re.findall(r"(?<!\\)\$", line_sub))
        return (dollar_count % 2) != 0

    @classmethod
    def _find_clean_boundary(cls, text: str, target_pos: int, window: int = 150, prefer_end: bool = True) -> int:
        """
        Tìm ranh giới ngắt câu sạch sẽ (không cắt giữa từ, giữa dòng bảng):
        - Ưu tiên 1: Bảo toàn nguyên vẹn dòng bảng biểu (| ... |)
        - Ưu tiên 2: Bảo toàn công thức toán học ($...$)
        - Ưu tiên 3: Kết thúc đoạn văn bản (\n\n)
        - Ưu tiên 4: Kết thúc câu (. ! ? ;)
        - Ưu tiên 5: Kết thúc dòng (\n)
        - Ưu tiên 6: Dấu cách gần nhất (khoảng trắng giữa các từ)
        """
        text_len = len(text)
        if target_pos >= text_len:
            return text_len
        if target_pos <= 0:
            return 0

        # 1. Bảo vệ bảng biểu
        prev_nl = text.rfind("\n", 0, target_pos)
        next_nl = text.find("\n", target_pos)
        line_start = prev_nl + 1 if prev_nl != -1 else 0
        line_end = next_nl if next_nl != -1 else text_len
        current_line = text[line_start:line_end]

        if cls._is_table_row(current_line):
            if prefer_end and next_nl != -1 and (next_nl - target_pos) <= window:
                return next_nl + 1
            if line_start > 0:
                return line_start

        # 2. Bảo vệ công thức toán học $...$
        if cls._is_inside_math(text, target_pos):
            next_dollar = text.find("$", target_pos)
            if next_dollar != -1 and (next_dollar - target_pos) <= 60:
                return next_dollar + 1

        search_start = max(0, target_pos - window)
        search_end = min(text_len, target_pos + (window // 2 if not prefer_end else 0))
        region = text[search_start:search_end]

        # 3. Tìm ngắt đoạn (\n\n)
        para_breaks = [m.end() for m in re.finditer(r"\n\s*\n", region)]
        if para_breaks:
            return search_start + para_breaks[-1]

        # 4. Tìm ngắt câu (. ! ? ;)
        sentence_breaks = [m.end() for m in re.finditer(r"[\.\!\?\;]\s+", region)]
        if sentence_breaks:
            return search_start + sentence_breaks[-1]

        # 5. Tìm ngắt dòng (\n)
        line_breaks = [m.end() for m in re.finditer(r"\n", region)]
        if line_breaks:
            return search_start + line_breaks[-1]

        # 6. Tìm khoảng trắng để tránh cắt giữa từ
        space_breaks = [m.end() for m in re.finditer(r"\s+", region)]
        if space_breaks:
            return search_start + space_breaks[-1]

        return target_pos

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
        Bóc tách text thành danh sách chunks ngữ nghĩa liền mạch liên trang và tổng hợp metadata các chương mục.
        Trả về tuple: (chunks_list, chapters_metadata_list)
        Ném ra EmptyChunksException nếu không tạo được chunk nào.
        """
        if not pages:
            raise EmptyChunksException("Danh sách trang rỗng, không có dữ liệu văn bản để phân đoạn.")

        # 1. Thu thập toàn bộ văn bản và xây dựng bản đồ vị trí ký tự -> số trang
        char_page_map = []  # [(start_char_idx, end_char_idx, page_number, current_chapter)]
        combined_text_list = []
        current_char_offset = 0

        detected_chapters: Dict[str, Dict[str, Any]] = {}
        current_chapter = "Chương 1: Tổng quan mở đầu"
        non_empty_pages_count = 0

        for p in pages:
            page_num = p.get("page_number", 1)
            raw_text = (p.get("text") or "").strip()
            if not raw_text:
                continue

            non_empty_pages_count += 1

            # Quét nhận diện chương mục trên trang
            chapter_matches = cls.CHAPTER_REGEX.findall(raw_text)
            if chapter_matches:
                new_ch = chapter_matches[-1].strip()
                new_ch = re.sub(r"\s+", " ", new_ch).strip()
                current_chapter = new_ch

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

            page_len = len(raw_text)
            char_page_map.append((current_char_offset, current_char_offset + page_len, page_num, current_chapter))
            combined_text_list.append(raw_text)
            current_char_offset += page_len + 2  # Khoảng cách nối \n\n

        if not combined_text_list:
            raise EmptyChunksException("Tài liệu không có nội dung văn bản nào để tạo đoạn trích (các trang đều rỗng).")

        full_doc_text = "\n\n".join(combined_text_list)
        total_len = len(full_doc_text)

        # Hàm tra cứu số trang và chương dựa trên offset ký tự
        def resolve_page_and_chapter(char_idx: int) -> Tuple[int, str]:
            for start_idx, end_idx, p_num, ch_title in char_page_map:
                if start_idx <= char_idx <= end_idx:
                    return p_num, ch_title
            if char_page_map:
                return char_page_map[-1][2], char_page_map[-1][3]
            return 1, current_chapter

        # 2. Cắt khối theo cửa sổ trượt liên tục (Continuous Sliding Window)
        chunks = []
        chunk_idx = 1
        curr_start = 0

        while curr_start < total_len:
            target_end = min(curr_start + max_chunk_chars, total_len)

            if target_end < total_len:
                actual_end = cls._find_clean_boundary(full_doc_text, target_end, window=150, prefer_end=True)
                if actual_end <= curr_start:
                    actual_end = target_end
            else:
                actual_end = total_len

            raw_chunk = full_doc_text[curr_start:actual_end].strip()

            if len(raw_chunk) >= min_chunk_chars:
                page_num, chunk_chapter = resolve_page_and_chapter(curr_start)

                chunks.append({
                    "chunk_id": f"{document_id}_c{chunk_idx:04d}",
                    "document_id": document_id,
                    "page_number": page_num,
                    "chapter": chunk_chapter,
                    "text": raw_chunk,
                    "char_count": len(raw_chunk)
                })
                chunk_idx += 1

            if actual_end >= total_len:
                break

            # Tính điểm bắt đầu tiếp theo với overlap sạch
            next_start_candidate = max(curr_start + 1, actual_end - overlap)
            clean_next_start = cls._find_clean_boundary(full_doc_text, next_start_candidate, window=60, prefer_end=False)
            if clean_next_start <= curr_start or clean_next_start >= actual_end:
                clean_next_start = max(curr_start + 1, actual_end - overlap)

            curr_start = clean_next_start

        # 3. Phục hồi Fallback nếu văn bản ngắn hơn min_chunk_chars
        if not chunks:
            if total_len >= 20:
                page_num, chunk_chapter = resolve_page_and_chapter(0)
                chunks.append({
                    "chunk_id": f"{document_id}_c0001",
                    "document_id": document_id,
                    "page_number": page_num,
                    "chapter": chunk_chapter,
                    "text": full_doc_text.strip(),
                    "char_count": len(full_doc_text.strip())
                })
            else:
                raise EmptyChunksException(
                    f"Tổng lượng ký tự trong tài liệu quá ít ({total_len} ký tự), không đủ điều kiện tối thiểu để tạo đoạn trích RAG."
                )

        # 4. Chuẩn hóa siêu dữ liệu danh mục chương
        chapters_metadata = []
        for idx, (ch_name, ch_info) in enumerate(detected_chapters.items()):
            chapters_metadata.append({
                "chapter_index": idx + 1,
                "title": ch_info["title"],
                "page_start": ch_info["page_start"],
                "page_end": ch_info["page_end"]
            })

        if not chapters_metadata:
            max_page = max((p.get("page_number", 1) for p in pages), default=1)
            chapters_metadata = [{
                "chapter_index": 1,
                "title": "Chương 1: Toàn bộ nội dung giáo trình",
                "page_start": 1,
                "page_end": max_page
            }]

        return chunks, chapters_metadata
