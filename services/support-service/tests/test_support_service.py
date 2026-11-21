import sys
import os
import unittest
from fastapi.testclient import TestClient

# Thêm đường dẫn service vào sys.path
SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from src.main import app

class TestSupportService(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.headers = {
            "x-user-id": "usr-lec-test-101",
            "x-user-email": "lecturer.test@uth.edu.vn",
            "x-user-role": "LECTURER",
            "x-user-tier": "PRO"
        }
        self.admin_headers = {
            "x-user-id": "usr-admin-001",
            "x-user-email": "admin@quizgen.ai",
            "x-user-role": "ADMIN",
            "x-user-tier": "ENTERPRISE"
        }

    def test_01_health_check(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "support-service")
        self.assertEqual(data["port"], 8008)

    def test_02_faq_categories_and_articles(self):
        # 1. Lấy danh mục FAQ
        res = self.client.get("/faq/categories")
        self.assertEqual(res.status_code, 200)
        categories = res.json()
        self.assertGreaterEqual(len(categories), 4)

        # 2. Lấy danh sách bài viết
        res = self.client.get("/faq/articles")
        self.assertEqual(res.status_code, 200)
        articles = res.json()
        self.assertGreaterEqual(len(articles), 5)

        # 3. Đọc chi tiết 1 bài viết
        slug = articles[0]["slug"]
        res_detail = self.client.get(f"/faq/articles/{slug}")
        self.assertEqual(res_detail.status_code, 200)
        self.assertEqual(res_detail.json()["slug"], slug)

        # 4. Vote hữu ích
        art_id = articles[0]["id"]
        res_vote = self.client.post(f"/faq/articles/{art_id}/vote", json={"helpful": True})
        self.assertEqual(res_vote.status_code, 200)
        self.assertEqual(res_vote.json()["status"], "success")

    def test_03_create_ticket_with_sla(self):
        payload = {
            "subject": "Lỗi căn lề khi in phiếu OMR 50 câu trên máy in trường thi",
            "description": "Tôi in file PDF xuất từ QuizGen AI nhưng ô tròn câu 40-50 bị sát mép dưới giấy.",
            "category": "EXAM_EXPORT_ERROR",
            "priority": "HIGH",
            "user_tier": "PRO"
        }
        res = self.client.post("/tickets", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data["ticket_code"].startswith("TK-2026-"))
        self.assertEqual(data["status"], "OPEN")
        self.assertEqual(data["priority"], "HIGH")
        self.assertIsNotNone(data["sla_first_response_due"])
        self.assertIsNotNone(data["sla_resolution_due"])

        # Lưu lại id ticket để dùng cho các test sau
        ticket_id = data["id"]

        # Tra cứu chi tiết
        res_detail = self.client.get(f"/tickets/{ticket_id}", headers=self.headers)
        self.assertEqual(res_detail.status_code, 200)
        detail = res_detail.json()
        self.assertEqual(len(detail["messages"]), 1)
        self.assertEqual(detail["messages"][0]["sender_role"], "USER")

        # Thêm tin nhắn phản hồi từ Admin
        res_msg = self.client.post(
            f"/tickets/{ticket_id}/messages",
            json={"message_body": "Kỹ thuật viên đã kiểm tra. Bạn vui lòng chọn tỷ lệ in Actual Size 100% trong Adobe Reader."},
            headers=self.admin_headers
        )
        self.assertEqual(res_msg.status_code, 200)

        # Cập nhật trạng thái sang RESOLVED
        res_status = self.client.patch(
            f"/tickets/{ticket_id}/status",
            json={"status": "RESOLVED", "note": "Đã hướng dẫn giảng viên in đúng chuẩn A4."},
            headers=self.admin_headers
        )
        self.assertEqual(res_status.status_code, 200)
        self.assertEqual(res_status.json()["status"], "RESOLVED")

        # Giảng viên gửi feedback CSAT 5 sao
        res_fb = self.client.post(
            f"/tickets/{ticket_id}/feedback",
            json={"rating_stars": 5, "feedback_text": "Hỗ trợ rất nhanh và chuẩn xác. Cảm ơn team!", "resolved_efficiently": True},
            headers=self.headers
        )
        self.assertEqual(res_fb.status_code, 200)
        self.assertEqual(res_fb.json()["rating_stars"], 5)

    def test_04_ai_auto_suggest(self):
        payload = {
            "subject": "Không quét được mã QR VietQR",
            "description": "Tôi chuyển khoản VietQR nhưng 5 phút rồi chưa thấy kích hoạt PRO",
            "category": "PAYMENT_BILLING"
        }
        res = self.client.post("/ai/auto-suggest", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["has_solution"])
        self.assertIsNotNone(data["quick_tip"])

    def test_05_admin_metrics(self):
        res = self.client.get("/admin/metrics", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data["total_tickets"], 1)
        self.assertGreaterEqual(data["sla_compliance_rate_percent"], 0.0)
        self.assertGreaterEqual(data["average_csat_stars"], 1.0)

if __name__ == "__main__":
    unittest.main(verbosity=2)
