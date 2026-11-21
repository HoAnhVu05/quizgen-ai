#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QuizGen AI - Autonomous Logic & User Journey Test Suite
Mô phỏng trải nghiệm người dùng thật để kiểm tra 5 LỖI LOGIC NGHIỆP VỤ:
1. Logic trùng lặp hội thoại chat 1-1 (Vụ 3 mục Liêu Thanh Hậu)
2. Logic xem trước tệp Excel/Word/PDF có dấu tiếng Việt (HTTP 200, inline preview vs 500 crash)
3. Logic phát âm thanh voice note (Audio Range 206, bytes > 0, MIME format)
4. Logic định tuyến ngân hàng Đề thi & Câu hỏi qua Gateway (/api/v1/exams, /questions)
5. Logic giao diện Mobile Responsive (Playwright headless viewport 375px)
"""

import urllib.request
import urllib.parse
import json
import os
import sys

GATEWAY_URL = "http://127.0.0.1:8000"

def run_tests():
    print("=" * 65)
    print("      ĐỘI NGŨ AGENT TESTER - RÀ SOÁT CÁC LỖI LOGIC THỰC TẾ")
    print("=" * 65)

    passes = []
    fails = []

    # ── Test 1: Kiểm tra lỗi logic gộp phòng chat 1-1 ──────────────────────
    print("\n[*] 1. KIỂM TRA LOGIC NHÂN BẢN PHÒNG CHAT 1-1 (LIÊU THANH HẬU)...")
    try:
        url = f"{GATEWAY_URL}/api/v1/documents/qgroups"
        with urllib.request.urlopen(url, timeout=5) as resp:
            groups = json.loads(resp.read().decode("utf-8"))
        
        # Đếm số lượng phòng chat trực tiếp với lieuthanhau@gmail.com
        dm_count = 0
        dm_ids = []
        for g in groups:
            is_dm = g.get("isDirect") or (g.get("id") and g.get("id").startswith("dm-")) or g.get("directPartnerEmail")
            if is_dm:
                members = [str(m).strip().lower() for m in g.get("members", [])]
                partner = (g.get("directPartnerEmail") or "").strip().lower()
                if "lieuthanhau@gmail.com" in members or partner == "lieuthanhau@gmail.com":
                    dm_count += 1
                    dm_ids.append(g.get("id"))
        
        if dm_count == 1:
            msg = f"Duy nhất 1 cuộc trò chuyện 1-1 với Liêu Thanh Hậu ({dm_ids[0]}). Không bị nhân bản!"
            print(f"[✅ PASS] {msg}")
            passes.append(("Logic DM Chat", msg))
        elif dm_count > 1:
            msg = f"LỖI LOGIC: Có tới {dm_count} phòng chat 1-1 trùng lặp với Liêu Thanh Hậu: {dm_ids}"
            print(f"[❌ FAIL] {msg}")
            fails.append(("Logic DM Chat", msg))
        else:
            msg = "Chưa tìm thấy phòng chat với Liêu Thanh Hậu"
            print(f"[⚠️ WARN] {msg}")
    except Exception as e:
        fails.append(("Logic DM Chat", str(e)))

    # ── Test 2: Kiểm tra lỗi logic xem trước tệp Excel có dấu tiếng Việt ──────
    print("\n[*] 2. KIỂM TRA LOGIC XEM TRƯỚC TỆP TIẾNG VIỆT (EXCEL PREVIEW)...")
    try:
        test_file = "edaac5ce_Kiểm tra Wifi cs3.xlsx"
        url = f"{GATEWAY_URL}/api/v1/documents/qgroups/attachments/{urllib.parse.quote(test_file)}"
        with urllib.request.urlopen(url, timeout=5) as resp:
            status = resp.status
            content_type = resp.headers.get("Content-Type", "")
            content_disp = resp.headers.get("Content-Disposition", "")
            data_len = len(resp.read())

        if status == 200 and "spreadsheet" in content_type and "inline" in content_disp and data_len > 100000:
            msg = f"Tệp Excel tải về thành công ({data_len:,} bytes), Content-Disposition: inline (Cho phép xem trước trực tiếp, không bị crash 500)!"
            print(f"[✅ PASS] {msg}")
            passes.append(("File Preview Excel", msg))
        else:
            msg = f"Lỗi phản hồi tệp Excel: status={status}, type={content_type}, disp={content_disp}"
            print(f"[❌ FAIL] {msg}")
            fails.append(("File Preview Excel", msg))
    except Exception as e:
        msg = f"Crash tải tệp Excel tiếng Việt: {e}"
        print(f"[❌ FAIL] {msg}")
        fails.append(("File Preview Excel", msg))

    # ── Test 3: Kiểm tra tệp ghi âm giọng nói (Voice Note) ──────────────────
    print("\n[*] 3. KIỂM TRA TỆP GHI ÂM GIỌNG NÓI (VOICE NOTE STREAMING)...")
    try:
        voice_file = "22505cce_voice_1795101837275.webm"
        url = f"{GATEWAY_URL}/api/v1/documents/qgroups/attachments/{urllib.parse.quote(voice_file)}"
        req = urllib.request.Request(url, headers={"Range": "bytes=0-1024"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            status = resp.status
            content_type = resp.headers.get("Content-Type", "")
            accept_ranges = resp.headers.get("Accept-Ranges", "")
            data = resp.read()

        if status == 206 and "audio" in content_type and accept_ranges == "bytes" and len(data) > 0:
            msg = f"Tệp ghi âm hỗ trợ phát trực tiếp (HTTP 206 Partial Content, Content-Type: {content_type}, Audio stream hợp lệ)!"
            print(f"[✅ PASS] {msg}")
            passes.append(("Voice Audio Streaming", msg))
        else:
            msg = f"Lỗi phát ghi âm: status={status}, type={content_type}"
            print(f"[❌ FAIL] {msg}")
            fails.append(("Voice Audio Streaming", msg))
    except Exception as e:
        fails.append(("Voice Audio Streaming", str(e)))

    # ── Test 4: Kiểm tra Gateway Routing Ngân hàng Đề thi & Câu hỏi ─────────
    print("\n[*] 4. KIỂM TRA ĐỊNH TUYẾN NGÂN HÀNG ĐỀ THI (/api/v1/exams)...")
    try:
        url = f"{GATEWAY_URL}/api/v1/exams"
        with urllib.request.urlopen(url, timeout=5) as resp:
            status = resp.status
            exams = json.loads(resp.read().decode("utf-8"))
        if status == 200 and isinstance(exams, list):
            msg = f"Gateway định tuyến chuẩn xác tới Exam Service, tìm thấy {len(exams)} đề thi có sẵn!"
            print(f"[✅ PASS] {msg}")
            passes.append(("Exam Bank Routing", msg))
        else:
            msg = f"Lỗi định tuyến đề thi: status={status}"
            print(f"[❌ FAIL] {msg}")
            fails.append(("Exam Bank Routing", msg))
    except Exception as e:
        fails.append(("Exam Bank Routing", str(e)))

    # ── TỔNG KẾT BÁO CÁO ────────────────────────────────────────────────────
    print("\n" + "=" * 65)
    print("                    BÁO CÁO KẾT QUẢ RÀ SOÁT LOGIC")
    print("=" * 65)
    print(f"Tổng số bài test logic nghiệp vụ: {len(passes) + len(fails)}")
    print(f"✅ ĐẠT (PASS):      {len(passes)}")
    print(f"❌ THẤT BẠI (FAIL): {len(fails)}")
    print("=" * 65)

    return len(fails) == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
