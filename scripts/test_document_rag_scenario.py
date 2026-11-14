"""
================================================================================
KỊCH BẢN KIỂM THỬ TỰ ĐỘNG - DOCUMENT SERVICE & RAG SERVICE
Mã công việc: [SCRUM-51] Tối ưu Chunking, Hybrid Vector Search và Quota Tracking
Môi trường thực thi: Python 3.11+ / ChromaDB / SQLite / FastAPI
Tác giả: VanTan080405
================================================================================
Bao gồm 5 kịch bản kiểm thử (Test Scenarios):
- TC-01: Kiểm tra bóc tách và nối liền mạch văn bản liên trang (Cross-Page Stitching)
- TC-02: Kiểm tra bảo toàn cấu trúc bảng biểu (| ... |) và công thức toán học ($...$)
- TC-03: Kiểm tra cơ chế Hybrid Retrieval (Dense Vector 70% + Lexical BM25 30%)
- TC-04: Kiểm thử hiệu năng truy xuất song song đa chương và cam kết SLA < 200ms
- TC-05: Kiểm thử hạn mức Token thực tế (Zero Mock Data) và làm sạch Cache khi xóa
================================================================================
"""

import os
import sys
import time
from uuid import uuid4
from typing import Dict, Any, List

# Đảm bảo in UTF-8 không lỗi font trên console Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Cấu hình đường dẫn import các microservices
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(BASE_DIR, "services", "document-service"))
sys.path.insert(0, os.path.join(BASE_DIR, "services", "rag-service"))

from src.chunker import TextChunker, EmptyChunksException
from src.vector_store import RAGVectorStore, LexicalScorer
from src.database import SessionLocal, Base, engine
from src.models import UsageQuotaDB, VectorIndexDB
from src.main import (
    IndexChunksRequest, QueryContextRequest,
    index_chunks, query_context, get_user_quota,
    delete_document_vectors, get_document_chunks,
    health, get_operational_diagnostics
)


class TestReporter:
    """Quản lý và in kết quả kiểm thử dạng bảng tổng hợp chuyên nghiệp"""
    def __init__(self):
        self.results: List[Dict[str, Any]] = []

    def record(self, tc_id: str, tc_name: str, passed: bool, duration_ms: float, details: str):
        self.results.append({
            "id": tc_id,
            "name": tc_name,
            "status": "PASS" if passed else "FAIL",
            "duration": round(duration_ms, 2),
            "details": details
        })

    def print_summary(self):
        print("\n" + "=" * 90)
        print(f"{'MÃ TC':<8} | {'TÊN KỊCH BẢN KIỂM THỬ':<48} | {'KẾT QUẢ':<8} | {'THỜI GIAN':<10}")
        print("-" * 90)
        passed_count = 0
        for r in self.results:
            status_str = f"[\033[92m{r['status']}\033[0m]" if r['status'] == "PASS" else f"[\033[91m{r['status']}\033[0m]"
            # Nếu chạy trên terminal không hỗ trợ mã màu ANSI:
            status_clean = f"[{r['status']}]"
            print(f"{r['id']:<8} | {r['name']:<48} | {status_clean:<8} | {r['duration']:>7.2f} ms")
            if r['status'] == "PASS":
                passed_count += 1
        print("=" * 90)
        print(f"TỔNG KẾT: {passed_count}/{len(self.results)} KỊCH BẢN ĐẠT CHUẨN (PASS RATE: {passed_count/len(self.results)*100:.1f}%)")
        print("=" * 90 + "\n")


reporter = TestReporter()


def run_tc01_cross_page_stitching():
    """TC-01: Kiểm tra nối văn bản liên trang không bị đứt câu"""
    print("\n[+] Đang chạy TC-01: Kiểm tra phân đoạn văn bản liên trang (Cross-page Stitching)...")
    t0 = time.perf_counter()

    multi_page_input = [
        {
            "page_number": 1,
            "text": "Chương 1: Nguyên lý Kinh tế học. Quy luật cung và cầu đóng vai trò then chốt trong"
        },
        {
            "page_number": 2,
            "text": "việc xác định giá cả cân bằng trên thị trường tự do. Khi giá tăng, lượng cầu giảm."
        }
    ]

    chunks, chapters = TextChunker.chunk_by_semantic_blocks(
        multi_page_input,
        document_id="tb-test-tc01",
        max_chunk_chars=300,
        min_chunk_chars=30,
        overlap=30
    )

    elapsed = (time.perf_counter() - t0) * 1000

    # Kiểm tra xem có chunk nào chứa trọn vẹn ngữ cảnh nối giữa trang 1 và trang 2 không
    stitched_chunk = any("trong" in c["text"] and "việc xác định" in c["text"] for c in chunks)
    passed = len(chunks) > 0 and stitched_chunk and len(chapters) == 1

    details = f"Tạo {len(chunks)} chunks, phát hiện {len(chapters)} chương. Nối câu liên trang liền mạch: {stitched_chunk}."
    print(f"    -> {details}")
    reporter.record("TC-01", "Cross-page continuous stitching", passed, elapsed, details)


def run_tc02_table_and_math_integrity():
    """TC-02: Kiểm tra bảo toàn toàn vẹn bảng biểu và công thức toán"""
    print("\n[+] Đang chạy TC-02: Kiểm tra bảo toàn dòng bảng (| ... |) và công thức ($...$)...")
    t0 = time.perf_counter()

    document_with_tables = [
        {
            "page_number": 1,
            "text": """Chương 2: Độ co giãn của Cầu theo Giá
Công thức tính hệ số co giãn: $E_D = \\frac{\\% \\Delta Q}{\\% \\Delta P}$.
Bảng dữ liệu phân loại độ co giãn theo thang điểm học thuật:
| Mức độ co giãn | Trị số tuyệt đối | Tác động của giá lên doanh thu |
| Co giãn hoàn toàn | Vô cực | Giảm giá làm doanh thu tăng tối đa |
| Co giãn đơn vị | Bằng 1 | Giá thay đổi không làm đổi doanh thu |
| Hoàn toàn không co giãn | Bằng 0 | Doanh thu biến động cùng chiều giá |
Đây là kiến thức trọng tâm cho kỳ thi kết thúc học phần."""
        }
    ]

    chunks, chapters = TextChunker.chunk_by_semantic_blocks(
        document_with_tables,
        document_id="tb-test-tc02",
        max_chunk_chars=250,
        min_chunk_chars=40,
        overlap=50
    )

    elapsed = (time.perf_counter() - t0) * 1000

    broken_table_lines = 0
    broken_math_symbols = 0

    for c in chunks:
        # Kiểm tra từng dòng bảng
        lines = c["text"].split("\n")
        for line in lines:
            line_s = line.strip()
            if line_s.startswith("|") and not line_s.endswith("|"):
                broken_table_lines += 1
        # Kiểm tra dấu đóng mở công thức $
        dollar_count = c["text"].count("$")
        if dollar_count % 2 != 0:
            broken_math_symbols += 1

    passed = (broken_table_lines == 0) and (broken_math_symbols == 0)
    details = f"Tạo {len(chunks)} chunks. Dòng bảng vỡ: {broken_table_lines}, Công thức lỗi dấu: {broken_math_symbols}."
    print(f"    -> {details}")
    reporter.record("TC-02", "Bảo toàn bảng biểu và công thức LaTeX", passed, elapsed, details)


def run_tc03_hybrid_retrieval_ranking():
    """TC-03: Kiểm tra Hybrid Retrieval (Dense 70% + Lexical 30%) và Term Boosting"""
    print("\n[+] Đang chạy TC-03: Kiểm tra thuật toán tìm kiếm lai Hybrid Retrieval...")
    t0 = time.perf_counter()

    test_dir = "./data/chroma_tc03"
    vs = RAGVectorStore(persist_dir=test_dir, collection_name="tc03_chunks")

    chunks_data = [
        {
            "chunk_id": "c1",
            "page_number": 1,
            "chapter": "Chương 1: Tổng quan",
            "text": "Độ co giãn của cầu theo giá PED biểu thị mức độ phản ứng của người tiêu dùng khi giá đổi."
        },
        {
            "chunk_id": "c2",
            "page_number": 1,
            "chapter": "Chương 1: Tổng quan",
            "text": "Nền kinh tế thị trường vận hành dựa trên cơ chế tự điều tiết của quy luật cung cầu tự do."
        }
    ]

    vs.add_chunks("doc-tc03", chunks_data, replace_existing=True)

    # Truy vấn có chứa từ viết tắt kỹ thuật "PED"
    query = "Độ co giãn của cầu PED"
    results = vs.query_context(query, document_id="doc-tc03", top_k=2)

    elapsed = (time.perf_counter() - t0) * 1000

    top_chunk = results[0]
    top_contains_ped = "PED" in top_chunk["textSnippet"]
    dense_score = top_chunk["denseScore"]
    lexical_score = top_chunk["lexicalScore"]
    relevance_score = top_chunk["relevanceScore"]

    # Dọn dẹp
    vs.delete_by_document_id("doc-tc03")

    passed = top_contains_ped and (lexical_score > 0) and (relevance_score >= dense_score * 0.7)
    details = f"Top 1 chứa 'PED'. Score: {relevance_score}% (Dense: {dense_score}%, Lexical: {lexical_score}%)."
    print(f"    -> {details}")
    reporter.record("TC-03", "Hybrid Search & Term/Acronym Boosting", passed, elapsed, details)


def run_tc04_concurrent_multi_chapter_sla():
    """TC-04: Kiểm thử truy xuất song song đa chương và kiểm chuẩn SLA < 200ms"""
    print("\n[+] Đang chạy TC-04: Kiểm thử song song đa chương và kiểm chuẩn SLA < 200ms...")
    t0 = time.perf_counter()

    test_dir = "./data/chroma_tc04"
    vs = RAGVectorStore(persist_dir=test_dir, collection_name="tc04_chunks")

    # Nạp dữ liệu 3 chương
    multi_chapter_chunks = [
        {"chunk_id": f"c_{ch}_{i}", "page_number": ch, "chapter": f"Chương {ch}", "text": f"Nội dung giáo trình chuyên sâu của Chương {ch} phần {i} liên quan đến cung cầu và sản xuất."}
        for ch in range(1, 4)
        for i in range(1, 4)
    ]
    vs.add_chunks("doc-tc04", multi_chapter_chunks, replace_existing=True)

    # Thực hiện truy vấn đồng thời 3 chương
    query = "nguyên lý sản xuất và cung cầu"
    target_chapters = ["Chương 1", "Chương 2", "Chương 3"]
    results = vs.query_context(query, document_id="doc-tc04", chapters=target_chapters, top_k=6)

    metrics = vs.get_last_query_metrics()
    total_latency = metrics["totalLatencyMs"]

    # Dọn dẹp
    vs.delete_by_document_id("doc-tc04")
    elapsed = (time.perf_counter() - t0) * 1000

    meets_sla = total_latency < 200.0
    is_concurrent = metrics["isConcurrent"]
    passed = meets_sla and is_concurrent and len(results) > 0

    details = f"Độ trễ: {total_latency} ms (SLA < 200ms: {meets_sla}). Phân luồng ThreadPool: {is_concurrent}."
    print(f"    -> {details}")
    reporter.record("TC-04", "Concurrent multi-chapter search (SLA < 200ms)", passed, elapsed, details)


def run_tc05_real_quota_and_cache_purge():
    """TC-05: Kiểm tra hạn mức Token thực tế (Zero Mock Data) và làm sạch Cache khi xóa"""
    print("\n[+] Đang chạy TC-05: Kiểm tra Quota thực tế & Xóa sạch Cache...")
    t0 = time.perf_counter()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    test_user_id = f"tester-{uuid4().hex[:6]}"
    test_doc_id = f"tb-{uuid4().hex[:6]}"

    try:
        # 1. Kiểm tra ban đầu: Người dùng mới phải có usedTokens = 0 (Không lấy mock 420,000)
        q_init = get_user_quota(user_id=test_user_id, db=db)
        zero_mock_verified = (q_init["usedTokens"] == 0) and (q_init["totalChunks"] == 0)

        # 2. Lập chỉ mục tài liệu
        sample_chunks = [
            {
                "chunk_id": f"{test_doc_id}_c01",
                "page_number": 1,
                "chapter": "Chương 1",
                "text": "Kiến thức kinh tế vĩ mô về lạm phát, thất nghiệp và chính sách tiền tệ quốc gia."
            }
        ]
        req_idx = IndexChunksRequest(document_id=test_doc_id, chunks=sample_chunks, replace_existing=True)
        idx_res = index_chunks(req=req_idx, user_id=test_user_id, db=db)
        tokens_added = idx_res["indexedTokens"]

        # 3. Kiểm tra hạn ngạch sau khi index
        q_after = get_user_quota(user_id=test_user_id, db=db)
        quota_updated = (q_after["usedTokens"] == tokens_added) and (q_after["totalChunks"] == 1)

        # 4. Xóa giáo trình và kiểm tra thanh tẩy cache
        del_res = delete_document_vectors(document_id=test_doc_id, db=db)
        cache_purged = del_res["cachePurged"] is True

        # 5. Xác nhận không còn chunk nào trong kho vector (Trả về 404 chuẩn, không trả mock)
        is_404 = False
        try:
            get_document_chunks(document_id=test_doc_id)
        except Exception as e:
            if hasattr(e, "status_code") and e.status_code == 404:
                is_404 = True

        elapsed = (time.perf_counter() - t0) * 1000
        passed = zero_mock_verified and quota_updated and cache_purged and is_404

        details = f"Zero-Mock: {zero_mock_verified}, Token cập nhật: +{tokens_added}, Cache Purged: {cache_purged}, 404 Check: {is_404}."
        print(f"    -> {details}")
        reporter.record("TC-05", "Real Quota Tracking & Cache Purge on Delete", passed, elapsed, details)

    finally:
        db.close()


def main():
    print("=" * 90)
    print("BẮT ĐẦU THỰC THI TOÀN BỘ KỊCH BẢN KIỂM THỬ: DOCUMENT & RAG SERVICE")
    print("=" * 90)

    try:
        run_tc01_cross_page_stitching()
        run_tc02_table_and_math_integrity()
        run_tc03_hybrid_retrieval_ranking()
        run_tc04_concurrent_multi_chapter_sla()
        run_tc05_real_quota_and_cache_purge()
    except Exception as e:
        print(f"\n[!] LỖI TRONG QUÁ TRÌNH KIỂM THỬ: {e}")
        import traceback
        traceback.print_exc()

    reporter.print_summary()


if __name__ == "__main__":
    main()
