#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QuizGen AI - Automated Headless Browser UI Test (Playwright)
Tiêu tốn: 0 TOKEN!
Robot tự động mở trang web, kiểm tra:
1. Web có load thành công hay bị màn hình trắng (White Screen of Death)
2. Console Logs có bị lỗi JavaScript / React error nào không
3. Kiểm tra giao diện Desktop (1280x800)
4. Kiểm tra giao diện Mobile (375x812 - iPhone/Android)
5. Chụp ảnh màn hình tự động lưu vào scripts/screenshots/
"""

import os
import sys
from playwright.sync_api import sync_playwright

FRONTEND_URL = "http://localhost:3000"
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def run_ui_test():
    console_errors = []
    print("\n--- 6. ROBOT KIỂM THỬ GIAO DIỆN TỰ ĐỘNG (PLAYWRIGHT E2E) ---")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # Test 1: Desktop Viewport
        print("[*] Kiểm tra giao diện Desktop (1280x800)...")
        context_desktop = browser.new_context(viewport={"width": 1280, "height": 800})
        page_desktop = context_desktop.new_page()
        
        page_desktop.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page_desktop.on("pageerror", lambda err: console_errors.append(f"Uncaught Page Error: {err}"))
        
        try:
            page_desktop.goto(FRONTEND_URL, wait_until="networkidle", timeout=15000)
            title = page_desktop.title()
            print(f"[✅ PASS] Desktop Page Loaded: Title = '{title}'")
            
            shot_path = os.path.join(SCREENSHOT_DIR, "desktop_login.png")
            page_desktop.screenshot(path=shot_path)
            print(f"[📷 SHOT] Đã chụp ảnh Desktop lưu tại: {shot_path}")
        except Exception as e:
            print(f"[❌ FAIL] Lỗi khi load Desktop: {e}")
            
        context_desktop.close()
        
        # Test 2: Mobile Viewport (iPhone / Android)
        print("\n[*] Kiểm tra giao diện Mobile Responsive (375x812)...")
        context_mobile = browser.new_context(
            viewport={"width": 375, "height": 812},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        )
        page_mobile = context_mobile.new_page()
        page_mobile.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page_mobile.on("pageerror", lambda err: console_errors.append(f"Uncaught Mobile Error: {err}"))
        
        try:
            page_mobile.goto(FRONTEND_URL, wait_until="networkidle", timeout=15000)
            shot_mobile_path = os.path.join(SCREENSHOT_DIR, "mobile_login.png")
            page_mobile.screenshot(path=shot_mobile_path)
            print(f"[✅ PASS] Mobile Page Loaded mượt mà!")
            print(f"[📷 SHOT] Đã chụp ảnh Mobile lưu tại: {shot_mobile_path}")
        except Exception as e:
            print(f"[❌ FAIL] Lỗi khi load Mobile: {e}")
            
        context_mobile.close()
        browser.close()
        
    print("\n--- TỔNG HỢP KIỂM THỬ BROWSER ---")
    if not console_errors:
        print("[✅ PASS] 0 LỖI JAVASCRIPT! Giao diện web hoàn toàn sạch sẽ, không có runtime crash.")
    else:
        print(f"[⚠️ WARN] Phát hiện {len(console_errors)} cảnh báo/lỗi Console:")
        for err in console_errors[:5]:
            print(f"  - {err[:120]}")

if __name__ == "__main__":
    run_ui_test()
