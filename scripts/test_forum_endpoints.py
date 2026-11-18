"""
QuizGen AI - Academic Forum Endpoints Verification Test Suite
Tests all 9 Forum Backend Endpoints via API Gateway (Port 8000) & Document Service (Port 8002).
"""
import requests
import json
import time
import sys

BASE_URL = "http://localhost:8000/api/v1"

def print_result(name, ok, msg=""):
    status = "✅ PASS" if ok else "❌ FAIL"
    print(f"[{status}] {name}: {msg}")
    if not ok:
        sys.exit(1)

def run_tests():
    print("=" * 60)
    print("[*] STARTING ACADEMIC FORUM ENDPOINTS TEST SUITE")
    print("=" * 60)
    
    # Wait for gateway
    for _ in range(10):
        try:
            r = requests.get(f"{BASE_URL}/forum/posts", timeout=3)
            if r.status_code == 200:
                break
        except Exception:
            time.sleep(1)
            
    # 1. GET initial posts
    r = requests.get(f"{BASE_URL}/forum/posts")
    print_result("1. GET /api/v1/forum/posts", r.status_code == 200, f"Status: {r.status_code}, Found {len(r.json())} posts")
    
    # 2. POST create post
    payload = {
        "authorEmail": "tan.nv@uth.edu.vn",
        "authorName": "ThS. Nguyễn Văn Tân",
        "authorTitle": "ThS.",
        "authorRole": "Giảng viên",
        "department": "Khoa Công nghệ Thông tin",
        "tag": "Hệ Điều Hành",
        "privacy": "public",
        "content": "Chào quý Thầy/Cô, tôi vừa cập nhật ma trận đề thi môn Hệ Điều Hành chuẩn kiểm định ABET 2026.",
        "videoUrl": "https://www.youtube.com/watch?v=26QPDBe-NB8"
    }
    r = requests.post(f"{BASE_URL}/forum/posts", json=payload)
    print_result("2. POST /api/v1/forum/posts", r.status_code == 200 and r.json().get("status") == "success", f"Created post ID: {r.json().get('post', {}).get('id')}")
    created_post = r.json().get("post")
    post_id = created_post["id"]
    
    # 3. PUT edit post
    update_payload = {
        "content": "Chào quý Thầy/Cô, tôi vừa cập nhật ma trận đề thi môn Hệ Điều Hành chuẩn kiểm định ABET 2026 (Phiên bản đã bổ sung 40 câu Bloom).",
        "tag": "Ma Trận Bloom"
    }
    r = requests.put(f"{BASE_URL}/forum/posts/{post_id}", json=update_payload)
    updated_post = r.json().get("post", {})
    print_result("3. PUT /api/v1/forum/posts/{id}", r.status_code == 200 and updated_post.get("tag") == "Ma Trận Bloom", f"Updated tag to: {updated_post.get('tag')}")
    
    # 4. POST like toggle
    r = requests.post(f"{BASE_URL}/forum/posts/{post_id}/like", json={"userEmail": "tan.nv@uth.edu.vn"})
    res1 = r.json()
    r = requests.post(f"{BASE_URL}/forum/posts/{post_id}/like", json={"userEmail": "tan.nv@uth.edu.vn"})
    res2 = r.json()
    like_ok = res1.get("hasLiked") is True and res1.get("likes") == 1 and res2.get("hasLiked") is False and res2.get("likes") == 0
    print_result("4. POST /api/v1/forum/posts/{id}/like (Toggle)", like_ok, f"After 1st like: {res1.get('likes')}, After 2nd like: {res2.get('likes')}")
    
    # 5. POST bookmark toggle
    r = requests.post(f"{BASE_URL}/forum/posts/{post_id}/bookmark", json={"userEmail": "tan.nv@uth.edu.vn"})
    bm_res1 = r.json()
    r = requests.post(f"{BASE_URL}/forum/posts/{post_id}/bookmark", json={"userEmail": "tan.nv@uth.edu.vn"})
    bm_res2 = r.json()
    bm_ok = bm_res1.get("isBookmarked") is True and bm_res2.get("isBookmarked") is False
    print_result("5. POST /api/v1/forum/posts/{id}/bookmark (Toggle)", bm_ok, f"1st: {bm_res1.get('isBookmarked')}, 2nd: {bm_res2.get('isBookmarked')}")
    
    # 6. POST comment
    comment_payload = {
        "authorEmail": "vu.ha@uth.edu.vn",
        "authorName": "TS. Hồ Anh Vũ",
        "authorTitle": "TS.",
        "content": "Ma trận này bám sát rất chuẩn đề tài ngân hàng câu hỏi kỳ này Thầy Tân nhé!"
    }
    r = requests.post(f"{BASE_URL}/forum/posts/{post_id}/comments", json=comment_payload)
    comment_res = r.json()
    comment_id = comment_res.get("comment", {}).get("id")
    print_result("6. POST /api/v1/forum/posts/{id}/comments", r.status_code == 200 and comment_res.get("totalComments") == 1, f"Added comment ID: {comment_id}")
    
    # 7. DELETE comment
    r = requests.delete(f"{BASE_URL}/forum/posts/{post_id}/comments/{comment_id}")
    print_result("7. DELETE /api/v1/forum/posts/{id}/comments/{comment_id}", r.status_code == 200 and r.json().get("totalComments") == 0, f"Remaining comments: {r.json().get('totalComments')}")
    
    # 8. GET filter and search
    r = requests.get(f"{BASE_URL}/forum/posts?search=ABET")
    matched = len(r.json()) >= 1
    print_result("8. GET /api/v1/forum/posts (Search keyword 'ABET')", matched, f"Matched count: {len(r.json())}")
    
    # 9. POST file upload
    test_file_content = b"Mock academic attachment for testing QuizGen AI forum persistence."
    files = {"file": ("Test_Matrix_Guide.docx", test_file_content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    r = requests.post(f"{BASE_URL}/documents/forum/upload", files=files)
    upload_ok = r.status_code == 200 and "downloadUrl" in r.json()
    download_url = r.json().get("downloadUrl", "")
    print_result("9. POST /api/v1/documents/forum/upload", upload_ok, f"Download URL: {download_url}")
    
    # 10. DELETE post (clean up)
    r = requests.delete(f"{BASE_URL}/forum/posts/{post_id}")
    print_result("10. DELETE /api/v1/forum/posts/{id} (Clean Purge)", r.status_code == 200, f"Purged post {post_id}")
    
    print("=" * 60)
    print("🎉 ALL 10 FORUM BACKEND TEST CASES PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
