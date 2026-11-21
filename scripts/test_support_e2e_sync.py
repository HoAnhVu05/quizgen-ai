import urllib.request
import json
import time

API_BASE = "http://127.0.0.1:8000/api/v1"

def test_sync():
    print("=== TEST SUPPORT SERVICE E2E SYNC ===")
    
    # 1. Giảng viên gửi phiếu hỗ trợ
    lec_headers = {
        "Content-Type": "application/json",
        "x-user-id": "usr-lec-001",
        "x-user-email": "nguyentann0804@gmail.com",
        "x-user-role": "LECTURER",
        "x-user-tier": "PRO"
    }
    create_payload = json.dumps({
        "subject": "Lỗi xuất file PDF OMR bị lệch lề",
        "description": "Khi tôi xuất đề thi mã 101 ra PDF OMR thì phiếu làm bài ở trang cuối bị lệch 2mm.",
        "category": "EXAM_EXPORT_ERROR",
        "priority": "HIGH"
    }).encode("utf-8")
    
    req = urllib.request.Request(f"{API_BASE}/support/tickets", data=create_payload, headers=lec_headers, method="POST")
    with urllib.request.urlopen(req) as res:
        ticket = json.loads(res.read().decode("utf-8"))
        ticket_id = ticket["id"]
        print(f"[1] Giảng viên tạo ticket thành công: ID={ticket_id}, Code={ticket['ticket_code']}, Status={ticket['status']}")

    # 2. Giảng viên xem danh sách "Phiếu của tôi"
    req_my = urllib.request.Request(f"{API_BASE}/support/tickets", headers=lec_headers)
    with urllib.request.urlopen(req_my) as res:
        my_tickets = json.loads(res.read().decode("utf-8"))
        found = any(t["id"] == ticket_id for t in my_tickets)
        print(f"[2] Giảng viên tải 'Phiếu của tôi': Tổng={len(my_tickets)}, Thấy phiếu vừa tạo={found}")
        assert found, "Giảng viên không thấy phiếu của mình!"

    # 3. Admin tải toàn bộ danh sách phiếu
    adm_headers = {
        "Content-Type": "application/json",
        "x-user-id": "usr-adm-quizgen",
        "x-user-email": "quizgen.ai.team@gmail.com",
        "x-user-role": "ADMIN"
    }
    req_adm = urllib.request.Request(f"{API_BASE}/support/tickets", headers=adm_headers)
    with urllib.request.urlopen(req_adm) as res:
        all_tickets = json.loads(res.read().decode("utf-8"))
        adm_found = any(t["id"] == ticket_id for t in all_tickets)
        print(f"[3] Admin tải danh sách phiếu: Tổng={len(all_tickets)}, Thấy phiếu giảng viên={adm_found}")
        assert adm_found, "Admin không thấy phiếu của giảng viên!"

    # 4. Admin cập nhật trạng thái sang IN_PROGRESS và gửi phản hồi
    status_payload = json.dumps({
        "status": "IN_PROGRESS",
        "note": "Kỹ sư đã tiếp nhận và đang căn chỉnh lề PDF OMR."
    }).encode("utf-8")
    req_status = urllib.request.Request(f"{API_BASE}/support/tickets/{ticket_id}/status", data=status_payload, headers=adm_headers, method="PATCH")
    with urllib.request.urlopen(req_status) as res:
        status_res = json.loads(res.read().decode("utf-8"))
        print(f"[4] Admin cập nhật trạng thái: New Status={status_res['status']}")
        assert status_res["status"] == "IN_PROGRESS"

    msg_payload = json.dumps({
        "sender_role": "ADMIN",
        "sender_name": "Kỹ sư Trưởng QuizGen AI",
        "message_body": "Chào Thầy Tân, đội ngũ đã kiểm tra và đang cập nhật template 100% Actual Size."
    }).encode("utf-8")
    req_msg = urllib.request.Request(f"{API_BASE}/support/tickets/{ticket_id}/messages", data=msg_payload, headers=adm_headers, method="POST")
    with urllib.request.urlopen(req_msg) as res:
        msg_res = json.loads(res.read().decode("utf-8"))
        print(f"[5] Admin gửi phản hồi thành công: Message ID={msg_res['id']}")

    # 5. Giảng viên nhận trạng thái cập nhật và tin nhắn mới ngay tức khắc
    req_detail = urllib.request.Request(f"{API_BASE}/support/tickets/{ticket_id}", headers=lec_headers)
    with urllib.request.urlopen(req_detail) as res:
        detail = json.loads(res.read().decode("utf-8"))
        print(f"[6] Giảng viên kiểm tra phiếu: Status={detail['status']}, Số tin nhắn={len(detail['messages'])}")
        assert detail["status"] == "IN_PROGRESS", "Trạng thái phía giảng viên chưa đồng bộ!"
        assert len(detail["messages"]) >= 2, "Tin nhắn của Admin chưa đồng bộ tới giảng viên!"

    # 6. Admin đổi trạng thái sang RESOLVED
    res_payload = json.dumps({"status": "RESOLVED", "note": "Đã khắc phục xong lỗi lề 2mm."}).encode("utf-8")
    req_res = urllib.request.Request(f"{API_BASE}/support/tickets/{ticket_id}/status", data=res_payload, headers=adm_headers, method="PATCH")
    with urllib.request.urlopen(req_res) as res:
        final_ticket = json.loads(res.read().decode("utf-8"))
        print(f"[7] Admin giải quyết xong phiếu: Status={final_ticket['status']}")

    # 7. Giảng viên kiểm tra lại danh sách phiếu
    with urllib.request.urlopen(req_my) as res:
        my_tickets_after = json.loads(res.read().decode("utf-8"))
        target = next(t for t in my_tickets_after if t["id"] == ticket_id)
        print(f"[8] Giảng viên thấy phiếu đã RESOLVED trong danh sách: Status={target['status']}")
        assert target["status"] == "RESOLVED"

    print("\n✅ TOÀN BỘ LUỒNG TẠO, ĐIỀU PHỐI VÀ ĐỒNG BỘ 2 CHIỀU ĐÃ HOÀN HẢO!")

if __name__ == "__main__":
    test_sync()
