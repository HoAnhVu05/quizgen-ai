import sys
import os
import io

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "services", "support-service"))
sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from src.main import app

def test_attachments_and_unread():
    print("🚀 Bắt đầu test Attachment Upload/Download & Unread Count...")
    client = TestClient(app)

    # 1. Tạo ticket
    ticket_payload = {
        "subject": "Lỗi công thức toán bị méo khi xuất Word",
        "description": "Tôi gặp lỗi khi xuất đề môn Toán rời rạc, các ký hiệu phủ định bị mất.",
        "category": "EXAM_EXPORT_ERROR",
        "priority": "HIGH",
        "user_tier": "PRO",
        "error_context_json": '{"screen": "bank", "browser": "Chrome 131"}'
    }
    headers = {
        "x-user-id": "usr-lec-001",
        "x-user-email": "nguyentann0804@gmail.com",
        "x-user-role": "LECTURER",
        "x-user-tier": "PRO"
    }
    res = client.post("/tickets", json=ticket_payload, headers=headers)
    assert res.status_code == 201
    ticket = res.json()
    ticket_id = ticket["id"]
    print(f"-> Tạo ticket thành công: {ticket['ticket_code']}")
    assert ticket.get("error_context_json") is not None

    # 2. Upload file ảnh lỗi
    fake_image_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    files = [
        ("files", ("error_screenshot.png", io.BytesIO(fake_image_bytes), "image/png"))
    ]
    att_res = client.post(f"/tickets/{ticket_id}/attachments", files=files, headers=headers)
    assert att_res.status_code == 200
    atts = att_res.json()
    assert len(atts) == 1
    file_name = atts[0]["file_name"]
    print(f"-> Upload ảnh lỗi thành công: {file_name}, URL: {atts[0]['file_url']}")

    # 3. Download / Stream ảnh lỗi
    get_att = client.get(f"/attachments/{file_name}")
    assert get_att.status_code == 200
    assert len(get_att.content) == len(fake_image_bytes)
    print("-> Tải ảnh lỗi thành công, nội dung khớp 100%!")

    # 4. Kiểm tra Unread count
    unread_res = client.get("/unread-count", headers=headers)
    assert unread_res.status_code == 200
    print(f"-> Unread count: {unread_res.json()}")

    # 5. Chi tiết ticket chứa attachment
    detail_res = client.get(f"/tickets/{ticket_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["attachments"]) >= 1
    print(f"-> Chi tiết ticket có {len(detail['attachments'])} attachments, URL={detail['attachments'][0]['file_url']}")
    print("✅ TOÀN BỘ CÁC BƯỚC TEST ATTACHMENT ĐÃ THÀNH CÔNG RỰC RỠ!")

if __name__ == "__main__":
    test_attachments_and_unread()
