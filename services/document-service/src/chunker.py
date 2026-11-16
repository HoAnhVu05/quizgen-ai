import re
from typing import List, Dict, Any, Tuple


class EmptyChunksException(Exception):
    """Ngoại lệ ném ra khi quá trình phân đoạn tài liệu không tạo ra bất kỳ chunk hợp lệ nào"""
    pass


class TextChunker:
    """
    Bộ phân đoạn ngữ nghĩa học thuật nâng cao (Enhanced Academic Semantic Chunker):
    1. Nhận diện chương mục tự động (Chương / Bài / Phần / Chapter / Module).
    2. Nếu tài liệu không có chương chuẩn, tự động phân tích và trích xuất các đề mục phân đoạn (Mục, Roman I/II/III, Số thứ tự 1./2., Markdown #, Ký tự A/B/C) để người dùng lựa chọn.
    3. Nếu trên một trang có nhiều mục, hệ thống tự động bóc tách từng mục theo vị trí ký tự tương ứng.
    4. Nếu tài liệu không có tiêu đề phân cấp, tự động phân tách theo các phân đoạn nội dung thực tế dựa trên dòng tiêu đề mở đầu của từng trang/khối.
    5. Nối liền mạch văn bản liên trang (Cross-page text stitching) với ánh xạ số trang chuẩn xác.
    6. Bảo toàn bảng biểu (Markdown tables) và công thức toán học ($...$ và $$...$$).
    7. Trượt gối đầu thông minh (Sliding Window Overlap) luôn ngắt tại ranh giới kết câu hoặc dòng mới.
    """

    FORMAL_CHAPTER_REGEX = re.compile(
        r"^(Chương\s+[0-9IVXLCDM]+[:\.\-\s]+[^\n\r]+|"
        r"Chapter\s+[0-9IVXLCDM]+[:\.\-\s]+[^\n\r]+|"
        r"Bài\s+[0-9IVXLCDM]+[:\.\-\s]+[^\n\r]+|"
        r"Phần\s+[0-9IVXLCDM]+[:\.\-\s]+[^\n\r]+|"
        r"Part\s+[0-9IVXLCDM]+[:\.\-\s]+[^\n\r]+|"
        r"Module\s+[0-9IVXLCDM]+[:\.\-\s]+[^\n\r]+)",
        re.IGNORECASE | re.MULTILINE
    )

    SECTION_REGEX = re.compile(
        r"^(Mục\s+[0-9\.]+[:\.\-\s]+[^\n\r]+|"
        r"Section\s+[0-9\.]+[:\.\-\s]+[^\n\r]+|"
        r"(?:I|II|III|IV|V|VI|VII|VIII|IX|X)[\.\:\-\s]+[A-ZÀ-Ỹ0-9][^\n\r]{2,80}|"
        r"[0-9]+(?:\.[0-9]+)*[\.\:\-\s]+[A-ZÀ-Ỹ0-9][^\n\r]{2,80}|"
        r"#{1,3}\s+[^\n\r]{3,80}|"
        r"[A-Z][\.\:\-\s]+[A-ZÀ-Ỹ0-9][^\n\r]{2,80})",
        re.MULTILINE
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
    def _extract_first_substantive_line(cls, text: str, max_chars: int = 60) -> str:
        """Trích xuất tiêu đề hoặc dòng văn bản đầu tiên có ý nghĩa để làm tên mục"""
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        for line in lines:
            cleaned = re.sub(r"^[#\*\-\s\d\.\:\(\)]+", "", line).strip()
            if len(cleaned) >= 3:
                if len(cleaned) > max_chars:
                    return cleaned[:max_chars].rsplit(" ", 1)[0] + "..."
                return cleaned
        return "Nội dung học liệu"

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
        Bóc tách text thành danh sách chunks ngữ nghĩa liền mạch liên trang và tổng hợp metadata các chương/mục thực tế.
        Trả về tuple: (chunks_list, chapters_metadata_list)
        Ném ra EmptyChunksException nếu không tạo được chunk nào.
        """
        if not pages:
            raise EmptyChunksException("Danh sách trang rỗng, không có dữ liệu văn bản để phân đoạn.")

        # Bước 1: Quét sơ bộ toàn bộ văn bản để quyết định chiến lược nhận diện chương/mục
        has_formal_chapters = False
        all_section_matches = []
        for p in pages:
            raw_text = (p.get("text") or "").strip()
            if not raw_text:
                continue
            formal_matches = cls.FORMAL_CHAPTER_REGEX.findall(raw_text)
            if formal_matches:
                has_formal_chapters = True
                break
            sec_matches = cls.SECTION_REGEX.findall(raw_text)
            if sec_matches:
                all_section_matches.extend(sec_matches)

        active_regex = cls.FORMAL_CHAPTER_REGEX if has_formal_chapters else (
            cls.SECTION_REGEX if len(all_section_matches) >= 1 else None
        )

        char_page_map = []  # [(start_char_idx, end_char_idx, page_number, current_chapter)]
        combined_text_list = []
        current_char_offset = 0

        detected_chapters: Dict[str, Dict[str, Any]] = {}
        current_chapter = ""
        non_empty_pages_count = 0

        for p in pages:
            page_num = p.get("page_number", 1)
            raw_text = (p.get("text") or "").strip()
            if not raw_text:
                continue

            non_empty_pages_count += 1
            page_len = len(raw_text)

            # Phát hiện tất cả các mục/tiêu đề xuất hiện trên trang hiện tại
            spans = []
            if active_regex:
                for m in active_regex.finditer(raw_text):
                    title = re.sub(r"^#+\s*", "", m.group().strip())
                    title = re.sub(r"\s+", " ", title).strip()
                    if title:
                        spans.append((m.start(), title))

            if spans:
                # Nếu trang bắt đầu trước span đầu tiên và chưa có current_chapter, dùng span đầu tiên
                if not current_chapter:
                    current_chapter = spans[0][1]

                last_pos = 0
                for start_idx, title in spans:
                    if start_idx > last_pos:
                        char_page_map.append((
                            current_char_offset + last_pos,
                            current_char_offset + start_idx,
                            page_num,
                            current_chapter
                        ))
                    current_chapter = title
                    last_pos = start_idx
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

                if last_pos < page_len:
                    char_page_map.append((
                        current_char_offset + last_pos,
                        current_char_offset + page_len,
                        page_num,
                        current_chapter
                    ))
            else:
                # Trang không có tiêu đề mới, kế thừa current_chapter hoặc tạo mục theo nội dung trang
                if not current_chapter:
                    first_summary = cls._extract_first_substantive_line(raw_text)
                    if len(pages) > 1:
                        current_chapter = f"Mục {non_empty_pages_count} (Trang {page_num}): {first_summary}"
                    else:
                        current_chapter = f"Mục 1: {first_summary}"

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

                char_page_map.append((
                    current_char_offset,
                    current_char_offset + page_len,
                    page_num,
                    current_chapter
                ))

            combined_text_list.append(raw_text)
            current_char_offset += page_len + 2  # Khoảng cách nối \n\n

        if not combined_text_list:
            raise EmptyChunksException("Tài liệu không có nội dung văn bản nào để tạo đoạn trích (các trang đều rỗng).")

        full_doc_text = "\n\n".join(combined_text_list)
        total_len = len(full_doc_text)

        # Hàm tra cứu số trang và chương/mục dựa trên offset ký tự
        def resolve_page_and_chapter(char_idx: int) -> Tuple[int, str]:
            for start_idx, end_idx, p_num, ch_title in char_page_map:
                if start_idx <= char_idx <= end_idx:
                    return p_num, ch_title
            if char_page_map:
                return char_page_map[-1][2], char_page_map[-1][3]
            return 1, current_chapter or "Nội dung tài liệu"

        # Bước 2: Cắt khối theo cửa sổ trượt liên tục (Continuous Sliding Window)
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

        # Bước 3: Phục hồi nếu văn bản ngắn hơn min_chunk_chars
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

        # Bước 4: Chuẩn hóa siêu dữ liệu danh mục chương/mục
        chapters_metadata = []
        for idx, (ch_name, ch_info) in enumerate(detected_chapters.items()):
            chapters_metadata.append({
                "chapter_index": idx + 1,
                "title": ch_info["title"],
                "page_start": ch_info["page_start"],
                "page_end": ch_info["page_end"]
            })

        if not chapters_metadata:
            first_line = cls._extract_first_substantive_line(full_doc_text)
            max_page = max((p.get("page_number", 1) for p in pages), default=1)
            chapters_metadata = [{
                "chapter_index": 1,
                "title": f"Mục 1: {first_line}",
                "page_start": 1,
                "page_end": max_page
            }]

        return chunks, chapters_metadata
