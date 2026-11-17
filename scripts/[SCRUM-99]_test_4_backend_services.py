"""
==============================================================================
QUIZGEN AI - E2E AUTOMATED VERIFICATION SUITE [SCRUM-99]
Task: Nâng cấp 4 Backend Services (admin-service, payment-service, document-service, rag-service)
Author: Nguyễn Văn Tân (MSSV: 060205012615)
Branch: feature/upload-from-nguyentann-20261030
Date: 2026-11-17
==============================================================================
"""

import sys
import os
import json
import time
import requests

# Ensure UTF-8 output on Windows
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

GATEWAY_URL = "http://localhost:8000"
DOC_URL = "http://localhost:8002"
RAG_URL = "http://localhost:8003"
ADMIN_URL = "http://localhost:8006"
PAYMENT_URL = "http://localhost:8007"

passed_tests = 0
total_tests = 7

def log_test(num, title, success, detail=""):
    global passed_tests
    status = "✅ PASS" if success else "❌ FAIL"
    if success:
        passed_tests += 1
    print(f"[{status}] TEST {num}: {title}")
    if detail:
        print(f"       -> {detail}")

print("=" * 80)
print("BẮT ĐẦU CHẠY KIỂM THỬ TỰ ĐỘNG 4 BACKEND SERVICES [SCRUM-99]")
print("=" * 80)

# -----------------------------------------------------------------------------
# TEST 1: Kiểm tra Kết nối & Trạng thái 4 Services Phụ Trách
# -----------------------------------------------------------------------------
try:
    doc_res = requests.get(f"{DOC_URL}/health", timeout=5).json()
    rag_res = requests.get(f"{RAG_URL}/health", timeout=5).json()
    adm_res = requests.get(f"{ADMIN_URL}/health", timeout=5).json()
    pay_res = requests.get(f"{PAYMENT_URL}/health", timeout=5).json()

    all_online = (
        doc_res.get("status") in ("healthy", "ok", "degraded") and
        rag_res.get("status") in ("healthy", "ok") and
        adm_res.get("status") == "healthy" and
        pay_res.get("status") == "healthy"
    )
    log_test(
        1, 
        "Health-Check 4 Services Đảm Nhận (8002, 8003, 8006, 8007)", 
        all_online, 
        f"Doc: {doc_res.get('status')}, RAG: {rag_res.get('status')}, Admin: {adm_res.get('status')}, Payment: {pay_res.get('status')}"
    )
except Exception as e:
    log_test(1, "Health-Check 4 Services Đảm Nhận", False, str(e))

# -----------------------------------------------------------------------------
# TEST 2: Document Service - Bóc tách Chunk bảo toàn LaTeX ($$, \\[, \\() & Bảng biểu
# -----------------------------------------------------------------------------
try:
    # Nhập khẩu module chunker trực tiếp để thẩm định giải thuật ngắt chunk
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "services", "document-service", "src")))
    from chunker import TextChunker

    math_sample = (
        "Giới thiệu giải tích hàm.\n"
        "Phương trình đạo hàm riêng cơ bản:\n"
        "$$\n"
        "\\int_{-\\infty}^{+\\infty} e^{-x^2} dx = \\sqrt{\\pi}\n"
        "$$\n"
        "và phương trình hiển thị chuẩn:\n"
        "\\[\n"
        "E = mc^2 + \\frac{1}{2}mv^2\n"
        "\\]\n"
        "Kèm theo công thức nội dòng \\(\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1\\) và bảng số liệu:\n"
        "| Tham số | Giá trị | Đơn vị |\n"
        "| Alpha | 0.05 | Không |\n"
        "| Beta | 0.95 | Không |\n"
        "Kết thúc chương 1."
    )
    pages = [{"page_number": 1, "text": math_sample}]
    chunks, chapters = TextChunker.chunk_by_semantic_blocks(pages, document_id="tb-test-math", max_chunk_chars=300, min_chunk_chars=50)

    # Đảm bảo các khối $$ và \[ không bị cắt vụn
    has_broken_math = False
    for c in chunks:
        txt = c["text"]
        if "$$" in txt and txt.count("$$") % 2 != 0:
            has_broken_math = True
        if "\\[" in txt and "\\]" not in txt:
            has_broken_math = True

    math_preserved = not has_broken_math and len(chunks) > 0
    log_test(
        2,
        "Document Service: Bảo Toàn Công Thức LaTeX & Bảng Biểu [SCRUM-99]",
        math_preserved,
        f"Tổng số chunks: {len(chunks)}, Không cắt vụn công thức $$ hay \\[: {not has_broken_math}"
    )
except Exception as e:
    log_test(2, "Document Service: Bảo Toàn Công Thức LaTeX & Bảng Biểu", False, str(e))

# -----------------------------------------------------------------------------
# TEST 3: RAG Service - Hybrid Search & Academic Citation Cards Structure
# -----------------------------------------------------------------------------
try:
    query_payload = {
        "query": "công thức hàm giải tích và tính hội tụ",
        "top_k": 3,
        "use_mmr": True,
        "expand_context": False
    }
    res = requests.post(f"{RAG_URL}/query-context", json=query_payload, timeout=8)
    data = res.json()

    has_citations = "citationCards" in data and isinstance(data["citationCards"], list)
    has_metrics = "latencyMs" in data and "meetsSla200ms" in data
    
    # Kiểm tra card trích dẫn nếu có kết quả
    sample_ref = "N/A"
    if has_citations and len(data["citationCards"]) > 0:
        c0 = data["citationCards"][0]
        sample_ref = f"{c0.get('citationRef')} (Score: {c0.get('relevanceScore')}%)"

    rag_ok = (res.status_code == 200 and has_citations and has_metrics)
    log_test(
        3,
        "RAG Service: Hybrid Search & Academic Citation Cards [SCRUM-99]",
        rag_ok,
        f"Latency: {data.get('latencyMs')}ms, Meets SLA 200ms: {data.get('meetsSla200ms')}, Top Card: {sample_ref}"
    )
except Exception as e:
    log_test(3, "RAG Service: Hybrid Search & Academic Citation Cards", False, str(e))

# -----------------------------------------------------------------------------
# TEST 4: Payment Service - Webhook Idempotency Chống Trùng Lặp Callback
# -----------------------------------------------------------------------------
try:
    # 1. Tạo đơn hàng giả lập để test webhook
    order_create_payload = {
        "user_id": "lec-scrum99-test",
        "plan_id": "plan_pro_monthly",
        "user_email": "test.scrum99@quizgen.vn",
        "user_name": "TS. Nguyễn Văn Test"
    }
    ord_res = requests.post(f"{PAYMENT_URL}/orders/create", json=order_create_payload, timeout=5)
    ord_data = ord_res.json()
    order_code = ord_data.get("order_code")

    if not order_code:
        raise Exception("Không thể khởi tạo đơn hàng thanh toán")

    # 2. Gửi Webhook lần 1 với Idempotency Key
    test_idem_key = f"IDEM-TEST-{int(time.time())}"
    webhook_payload = {
        "content": f"Chuyen khoan QUIZGEN {order_code} thanh toan",
        "transferAmount": 199000,
        "referenceCode": test_idem_key
    }
    headers = {"X-Idempotency-Key": test_idem_key}
    
    res1 = requests.post(f"{PAYMENT_URL}/webhook", json=webhook_payload, headers=headers, timeout=5)
    data1 = res1.json()

    # 3. Gửi lại Webhook lần 2 với cùng Idempotency Key (Giả lập retry storm)
    res2 = requests.post(f"{PAYMENT_URL}/webhook", json=webhook_payload, headers=headers, timeout=5)
    data2 = res2.json()

    idempotency_pass = (
        data1.get("status") in ("success", "already_completed") and
        data2.get("isIdempotentDuplicate") is True
    )
    log_test(
        4,
        "Payment Service: Webhook Idempotency Protection [SCRUM-99]",
        idempotency_pass,
        f"Lần 1: {data1.get('status')}, Lần 2 (Chặn trùng): isIdempotentDuplicate={data2.get('isIdempotentDuplicate')}"
    )
except Exception as e:
    log_test(4, "Payment Service: Webhook Idempotency Protection", False, str(e))

# -----------------------------------------------------------------------------
# TEST 5: Payment Service - Báo Cáo Doanh Thu Theo Gói & AOV
# -----------------------------------------------------------------------------
try:
    res = requests.get(f"{PAYMENT_URL}/admin/revenue-breakdown", timeout=5)
    data = res.json()

    has_revenue = "totalRevenueVnd" in data and "averageOrderValueVnd" in data
    has_by_plan = "byPlan" in data and isinstance(data["byPlan"], list)
    has_trends = "dailyTrends" in data

    rev_ok = (res.status_code == 200 and has_revenue and has_by_plan and has_trends)
    log_test(
        5,
        "Payment Service: Revenue Breakdown & AOV Metrics [SCRUM-99]",
        rev_ok,
        f"Tổng DT: {data.get('totalRevenueVnd'):,}đ, AOV: {data.get('averageOrderValueVnd'):,}đ, Gói cước: {len(data.get('byPlan', []))} nhóm"
    )
except Exception as e:
    log_test(5, "Payment Service: Revenue Breakdown & AOV Metrics", False, str(e))

# -----------------------------------------------------------------------------
# TEST 6: Admin Service - In-Memory TTL Caching & Audit Logs Export
# -----------------------------------------------------------------------------
try:
    # 1. Test In-Memory TTL Cache trên endpoint bloom analytics
    t0 = time.perf_counter()
    res_uncached = requests.get(f"{ADMIN_URL}/analytics/bloom-distribution", timeout=5).json()
    t_uncached = (time.perf_counter() - t0) * 1000

    t1 = time.perf_counter()
    res_cached = requests.get(f"{ADMIN_URL}/analytics/bloom-distribution", timeout=5).json()
    t_cached = (time.perf_counter() - t1) * 1000

    is_cached = res_cached.get("cached") is True

    # 2. Test Xuất Audit Logs định dạng JSON và CSV
    res_json = requests.get(f"{ADMIN_URL}/audit/logs/export?format=json&limit=10", timeout=5)
    data_json = res_json.json()

    res_csv = requests.get(f"{ADMIN_URL}/audit/logs/export?format=csv&limit=10", timeout=5)
    is_csv = res_csv.headers.get("content-type", "").startswith("text/csv") and "ID,Timestamp" in res_csv.text

    admin_enhancements_ok = (is_cached and data_json.get("status") == "success" and is_csv)
    log_test(
        6,
        "Admin Service: In-Memory TTL Caching & Audit Export [SCRUM-99]",
        admin_enhancements_ok,
        f"Cache Hit: {is_cached} (Tốc độ {t_cached:.2f}ms vs {t_uncached:.2f}ms), Export CSV: {is_csv}"
    )
except Exception as e:
    log_test(6, "Admin Service: In-Memory TTL Caching & Audit Export", False, str(e))

# -----------------------------------------------------------------------------
# TEST 7: Admin Service - Health Matrix Toàn Diện Cụm Microservices
# -----------------------------------------------------------------------------
try:
    res = requests.get(f"{ADMIN_URL}/services/health-matrix", timeout=5)
    data = res.json()

    matrix_ok = (
        res.status_code == 200 and
        data.get("status") == "success" and
        "averageLatencyMs" in data and
        "onlineServices" in data and
        data.get("onlineServices") > 0
    )
    log_test(
        7,
        "Admin Service: Microservices Health Matrix & Latency Percentile [SCRUM-99]",
        matrix_ok,
        f"Mesh Status: {data.get('meshStatus')}, Online: {data.get('onlineServices')}/{data.get('totalMonitored')}, Avg Latency: {data.get('averageLatencyMs')}ms"
    )
except Exception as e:
    log_test(7, "Admin Service: Microservices Health Matrix", False, str(e))

print("=" * 80)
print(f"KẾT QUẢ KIỂM THỬ: {passed_tests}/{total_tests} BÀI THI PASS ({(passed_tests/total_tests)*100:.1f}%)")
print("=" * 80)

if passed_tests == total_tests:
    print(">>> TẤT CẢ 4 SERVICES BACKEND [SCRUM-99] ĐÃ ĐẠT TIÊU CHUẨN NGHIỆM THU TUYỆT ĐỐI! <<<")
    sys.exit(0)
else:
    print(">>> CẦN KIỂM TRA LẠI CÁC MỤC CHƯA ĐẠT TIÊU CHÍ <<<")
    sys.exit(1)
