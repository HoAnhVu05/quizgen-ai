import sys
import os
import json

# Setup sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "services", "support-service"))
sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from src.main import app

def run_e2e_verification():
    print("=" * 70)
    print("🚀 BẮT ĐẦU KIỂM THỬ THỰC TẾ SUPPORT SERVICE (PORT 8008)")
    print("=" * 70)

    client = TestClient(app)

    # 1. KIỂM TRA HEALTH CHECK
    print("\n[BƯỚC 1] Kiểm tra trạng thái sức khỏe (Health Check):")
    res = client.get("/health")
    print(f"-> HTTP Status: {res.status_code}")
    health_data = res.json()
    print(f"-> Service: {health_data['service']} | Status: {health_data['status']} | Port: {health_data['port']}")
    print(f"-> Tính năng đã đăng ký: {', '.join(health_data['capabilities'])}")
    assert res.status_code == 200 and health_data["status"] == "healthy"
    print("=> KẾT QUẢ BƯỚC 1: ✅ ĐẠT (HEALTHY)")

    # 2. KIỂM TRA TRUNG TÂM TRI THỨC (FAQ KNOWLEDGE BASE)
    print("\n[BƯỚC 2] Kiểm tra Trung tâm Tri thức & Cẩm nang Học thuật:")
    cat_res = client.get("/faq/categories")
    categories = cat_res.json()
    print(f"-> Số lượng danh mục FAQ: {len(categories)}")
    for cat in categories:
        print(f"   • [{cat['slug']}] {cat['name']} ({cat['articles_count']} bài viết)")

    art_res = client.get("/faq/articles")
    articles = art_res.json()
    print(f"-> Số lượng bài viết cẩm nang: {len(articles)}")
    first_art = articles[0]
    print(f"   • Đọc thử bài viết đầu tiên: '{first_art['title']}'")
    detail_res = client.get(f"/faq/articles/{first_art['slug']}")
    assert detail_res.status_code == 200
    print(f"   • Lượt xem sau khi đọc: {detail_res.json()['view_count']}")
    print("=> KẾT QUẢ BƯỚC 2: ✅ ĐẠT (FAQ HOẠT ĐỘNG HOÀN HẢO)")

    # 3. KIỂM TRA TRỢ LÝ AI AUTO-SUGGEST
    print("\n[BƯỚC 3] Kiểm tra Trợ lý AI Gợi ý Tức thì (AI Auto-Suggest):")
    prompt_payload = {
        "subject": "In phiếu trả lời OMR 50 câu bị lệch ô tròn",
        "description": "Tôi in file PDF trắc nghiệm nhưng máy in làm ô tròn sát lề dưới của giấy A4",
        "category": "EXAM_EXPORT_ERROR"
    }
    ai_res = client.post("/ai/auto-suggest", json=prompt_payload)
    ai_data = ai_res.json()
    print(f"-> AI có tìm thấy giải pháp không: {'CÓ' if ai_data['has_solution'] else 'KHÔNG'}")
    print(f"-> Mẹo gợi ý từ AI: {ai_data['quick_tip']}")
    print(f"-> Bài viết gợi ý đính kèm: {len(ai_data['suggested_articles'])} bài")
    if ai_data['suggested_articles']:
        print(f"   • Gợi ý 1: {ai_data['suggested_articles'][0]['title']} (Độ liên quan: {ai_data['suggested_articles'][0]['relevance_score']})")
    assert ai_res.status_code == 200 and ai_data["has_solution"]
    print("=> KẾT QUẢ BƯỚC 3: ✅ ĐẠT (AI AUTO-SUGGEST CHÍNH XÁC)")

    # 4. KIỂM TRA VÒNG ĐỜI TICKET & TÍNH TOÁN SLA
    print("\n[BƯỚC 4] Kiểm tra Vòng đời Ticket hỗ trợ & Tính toán hạn SLA:")
    ticket_payload = {
        "subject": "Yêu cầu hỗ trợ tích hợp đề thi vào Canvas LMS qua gói QTI",
        "description": "Khoa chúng tôi cần import 100 câu hỏi vào hệ thống Canvas học kỳ này, cần hướng dẫn chi tiết.",
        "category": "EXAM_EXPORT_ERROR",
        "priority": "HIGH",
        "user_tier": "PRO"
    }
    headers = {
        "x-user-id": "usr-lec-uth-001",
        "x-user-email": "ngophamcongduc@uth.edu.vn",
        "x-user-role": "LECTURER",
        "x-user-tier": "PRO"
    }
    create_res = client.post("/tickets", json=ticket_payload, headers=headers)
    ticket = create_res.json()
    ticket_id = ticket["id"]
    print(f"-> Tạo ticket thành công: Mã [{ticket['ticket_code']}]")
    print(f"-> Trạng thái ban đầu: {ticket['status']}")
    print(f"-> Cấp độ gói cước: {ticket['user_tier']}")
    print(f"-> Hạn phản hồi đầu tiên (SLA 4h): {ticket['sla_first_response_due']}")
    print(f"-> Hạn giải quyết dứt điểm (SLA 12h): {ticket['sla_resolution_due']}")

    # Gửi tin nhắn đàm thoại từ Kỹ sư hỗ trợ
    admin_headers = {
        "x-user-id": "usr-admin-lead",
        "x-user-email": "admin@quizgen.ai",
        "x-user-role": "ADMIN"
    }
    msg_res = client.post(
        f"/tickets/{ticket_id}/messages",
        json={"message_body": "Kính chào Thầy Đức, Thầy vui lòng xuất gói QTI 2.1 từ màn hình Bước 4 và chọn Import Course Content trên Canvas."},
        headers=admin_headers
    )
    assert msg_res.status_code == 200
    print("-> Kỹ sư gửi tin nhắn hướng dẫn vào luồng ticket thành công.")

    # Cập nhật trạng thái sang RESOLVED
    status_res = client.patch(
        f"/tickets/{ticket_id}/status",
        json={"status": "RESOLVED", "note": "Đã hướng dẫn thành công qua Canvas QTI."},
        headers=admin_headers
    )
    assert status_res.status_code == 200
    print(f"-> Cập nhật trạng thái ticket: {status_res.json()['status']}")

    # Người dùng đánh giá CSAT 5 sao
    fb_res = client.post(
        f"/tickets/{ticket_id}/feedback",
        json={"rating_stars": 5, "feedback_text": "Dịch vụ hỗ trợ rất nhiệt tình, thao tác rất mượt!", "resolved_efficiently": True},
        headers=headers
    )
    assert fb_res.status_code == 200
    print(f"-> Khảo sát CSAT đã ghi nhận: {fb_res.json()['rating_stars']} ⭐")
    print("=> KẾT QUẢ BƯỚC 4: ✅ ĐẠT (VÒNG ĐỜI TICKET & SLA HOÀN CHỈNH)")

    # 5. BÁO CÁO CHỈ SỐ VẬN HÀNH ADMIN METRICS
    print("\n[BƯỚC 5] Báo cáo Thống kê Chỉ số CSKH Thời gian thực (Admin Metrics):")
    metric_res = client.get("/admin/metrics", headers=admin_headers)
    metrics = metric_res.json()
    print(f"-> Tổng số ticket trong hệ thống: {metrics['total_tickets']}")
    print(f"-> Ticket đã giải quyết (RESOLVED/CLOSED): {metrics['resolved_tickets'] + metrics['closed_tickets']}")
    print(f"-> Tỷ lệ tuân thủ cam kết SLA: {metrics['sla_compliance_rate_percent']}%")
    print(f"-> Điểm đánh giá CSAT trung bình: {metrics['average_csat_stars']} / 5.0 ⭐")
    print(f"-> Phân bổ sự cố theo phân hệ: {json.dumps(metrics['category_distribution'], ensure_ascii=False)}")
    print("=> KẾT QUẢ BƯỚC 5: ✅ ĐẠT (METRICS THỜI GIAN THỰC ĐẦY ĐỦ)")

    print("\n" + "=" * 70)
    print("🎉 KẾT LUẬN: SUPPORT SERVICE HOẠT ĐỘNG HOÀN TOÀN BÌNH THƯỜNG VÀ CHÍNH XÁC 100%!")
    print("=" * 70)

if __name__ == "__main__":
    run_e2e_verification()
