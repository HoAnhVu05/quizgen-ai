"""
QuizGen AI - Automated Verification Script for System Theme Engine
Kiểm thử tự động API Gateway & Admin-Service Theme Endpoints
"""
import urllib.request
import json
import sys

ADMIN_THEME_URL = "http://localhost:8006/theme/current"
GATEWAY_THEME_URL = "http://localhost:8000/api/v1/theme/current"

def run_test():
    print("[1/5] Kiểm tra lấy thông tin theme mặc định...")
    req = urllib.request.Request(ADMIN_THEME_URL)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        print(f"      OK: Active Theme = {data.get('activeTheme')} ({data.get('themeName')})")

    themes_to_test = [
        ("spring", "Tết & Mùa Xuân (Spring & Lunar New Year)"),
        ("summer", "Mùa Hè Sôi Động (Summer Vibrant)"),
        ("autumn", "Mùa Thu Khai Trường (Autumn & School)"),
        ("winter", "Mùa Đông & Giáng Sinh (Winter & Noel)"),
        ("victory_30_4", "Kỷ Niệm 30/4 & 1/5 (Chiến Thắng - Hòa Bình)"),
        ("national_day_2_9", "Quốc Khánh 2/9 (Tết Độc Lập Dân Tộc)"),
        ("default", "Mặc định (Academic Modern)"),
    ]

    for idx, (thm_id, expected_name) in enumerate(themes_to_test, start=2):
        print(f"[{idx}/7] Chuyển đổi giao diện sang: {thm_id}...")
        payload = json.dumps({
            "theme_id": thm_id,
            "actor_email": "admin.tester@uth.edu.vn"
        }).encode("utf-8")
        put_req = urllib.request.Request(
            ADMIN_THEME_URL,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="PUT"
        )
        with urllib.request.urlopen(put_req) as resp:
            data = json.loads(resp.read().decode())
            assert resp.status == 200, f"PUT failed with status {resp.status}"
            assert data.get("activeTheme") == thm_id, f"Expected {thm_id}, got {data.get('activeTheme')}"
            print(f"      OK: Đã lưu CSDL admin.db & Broadcast: {data.get('activeTheme')}")

    print("[Kiểm tra Gateway] Kiểm tra API Gateway proxy route /api/v1/theme/current...")
    gw_req = urllib.request.Request(GATEWAY_THEME_URL)
    with urllib.request.urlopen(gw_req) as resp:
        gw_data = json.loads(resp.read().decode())
        assert resp.status == 200
        print(f"      OK: Gateway Proxy trả về: {gw_data.get('activeTheme')}")

    print("\n>>> TẤT CẢ CÁC BƯỚC KIỂM THỬ THEME ENGINE ĐỀU THÀNH CÔNG RỰC RỠ (100% PASS)! <<<")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        print(f"Lỗi kiểm thử: {e}", file=sys.stderr)
        sys.exit(1)
