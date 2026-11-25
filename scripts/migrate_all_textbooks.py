import sqlite3
import sys
import os
import re

# Ensure services/document-service is on python path
sys.path.insert(0, os.path.abspath('services/document-service'))

from src.parser import DocumentParser
from src.chunker import TextChunker

DB_PATH = os.path.abspath('services/document-service/data/documents.db')
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

docs = cursor.execute("SELECT id, name, file_path, total_pages, chapters_count FROM documents").fetchall()
print(f"Total documents in database: {len(docs)}")

updated_count = 0

for doc_id, name, file_path, total_pages, ch_count in docs:
    resolved_path = None
    if file_path:
        if os.path.isabs(file_path) and os.path.exists(file_path):
            resolved_path = file_path
        else:
            candidates = [
                os.path.join('services/document-service', file_path),
                os.path.join('services/document-service/data/uploads', os.path.basename(file_path)),
                os.path.join('services/document-service/data/uploads', f"{doc_id}_{name}"),
            ]
            for cand in candidates:
                if os.path.exists(cand):
                    resolved_path = cand
                    break

    if resolved_path and resolved_path.lower().endswith('.pdf'):
        try:
            with open(resolved_path, 'rb') as f:
                pdf_bytes = f.read()
            pages = DocumentParser.parse_pdf(pdf_bytes, document_id=doc_id)
            chunks, chapters = TextChunker.chunk_by_semantic_blocks(pages, doc_id)
            new_ch_count = len(chapters)

            cursor.execute("DELETE FROM document_chapters WHERE document_id = ?", (doc_id,))
            for ch in chapters:
                ch_id = f"ch-{doc_id}-{ch['chapter_index']}"
                cursor.execute(
                    "INSERT INTO document_chapters (id, document_id, chapter_index, title, page_start, page_end) VALUES (?, ?, ?, ?, ?, ?)",
                    (ch_id, doc_id, ch['chapter_index'], ch['title'], ch['page_start'], ch['page_end'])
                )
            cursor.execute("UPDATE documents SET chapters_count = ? WHERE id = ?", (new_ch_count, doc_id))
            conn.commit()
            print(f" [RE-PARSED] {doc_id} ('{name}'): {ch_count} -> {new_ch_count} chapters")
            updated_count += 1
            continue
        except Exception as e:
            print(f" [WARN] Failed re-parsing {doc_id} ('{name}'): {e}")

    # Fallback cleanup for documents without raw file on disk or non-PDF
    existing_chs = cursor.execute(
        "SELECT id, chapter_index, title, page_start, page_end FROM document_chapters WHERE document_id = ? ORDER BY chapter_index",
        (doc_id,)
    ).fetchall()

    if existing_chs:
        cleaned_chs = []
        for cid, cidx, ctitle, pstart, pend in existing_chs:
            t = (ctitle or "").strip()
            if TextChunker._is_junk_chapter_title(t):
                continue
            cleaned_chs.append((t, pstart, pend))

        # If too many items, keep formal chapters or top 15
        formal_only = [c for c in cleaned_chs if TextChunker.FORMAL_CHAPTER_REGEX.search(c[0])]
        if len(cleaned_chs) > 20:
            if len(formal_only) >= 2:
                cleaned_chs = formal_only
            else:
                cleaned_chs = cleaned_chs[:15]

        if not cleaned_chs:
            cleaned_chs = [(f"Chương 1: Nội dung tổng quát", 1, total_pages or 1)]

        cursor.execute("DELETE FROM document_chapters WHERE document_id = ?", (doc_id,))
        for idx, (t, pstart, pend) in enumerate(cleaned_chs):
            cursor.execute(
                "INSERT INTO document_chapters (id, document_id, chapter_index, title, page_start, page_end) VALUES (?, ?, ?, ?, ?, ?)",
                (f"ch-{doc_id}-{idx+1}", doc_id, idx + 1, t, pstart, pend)
            )
        cursor.execute("UPDATE documents SET chapters_count = ? WHERE id = ?", (len(cleaned_chs), doc_id))
        conn.commit()
        if len(cleaned_chs) != ch_count:
            print(f" [CLEANED] {doc_id} ('{name}'): {ch_count} -> {len(cleaned_chs)} chapters")
            updated_count += 1

print(f"\nMigration completed! Total documents updated: {updated_count}")
conn.close()
