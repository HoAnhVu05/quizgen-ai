import os
import json
import logging
from pathlib import Path
from fastapi import HTTPException

logger = logging.getLogger("document-service")

STORAGE_DIR = Path(os.getenv("DOCUMENT_STORAGE_DIR", "./data/uploads"))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
EXTRACTED_IMAGES_DIR = STORAGE_DIR.parent / "extracted_images"
EXTRACTED_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
QUESTION_ATTACHMENTS_DIR = STORAGE_DIR.parent / "question_attachments"
QUESTION_ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)

QGROUPS_FILE = STORAGE_DIR.parent / "qgroups.json"
QGROUP_ATTACHMENTS_DIR = STORAGE_DIR.parent / "uploads" / "qgroup_attachments"
QGROUP_ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)
QGROUP_INVITATIONS_FILE = STORAGE_DIR.parent / "qgroup_invitations.json"
FRIEND_REQUESTS_FILE = STORAGE_DIR.parent / "friend_requests.json"
FORUM_POSTS_FILE = STORAGE_DIR.parent / "forum_posts.json"
FORUM_ATTACHMENTS_DIR = STORAGE_DIR.parent / "forum_attachments"
FORUM_ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)

def _format_file_size(byte_count: int) -> str:
    """Chuyển đổi số bytes thành chuỗi dung lượng dễ đọc (B, KB, MB)"""
    if byte_count < 1024:
        return f"{byte_count} B"
    if byte_count < 1024 * 1024:
        return f"{byte_count / 1024:.1f} KB"
    return f"{byte_count / (1024 * 1024):.1f} MB"


PAYMENT_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "payment-service", "data", "payment.db"))
AUTH_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "auth-service", "data", "auth.db"))


DEFAULT_QGROUPS = [
    {
        "id": "qg-1",
        "code": "QGRP-OS2026",
        "name": "Bộ Môn Mạng & Hệ Điều Hành",
        "department": "Khoa Công nghệ Thông tin",
        "description": "Không gian làm việc chung của giảng viên bộ môn: trao đổi ngân hàng câu hỏi, chia sẻ giáo trình và thống nhất ma trận đề thi kỳ này.",
        "ownerEmail": "vuha3608@ut.edu.vn",
        "ownerName": "TS. Hồ Anh Vũ",
        "joinPolicy": "approval_required",
        "memberCount": 4,
        "members": ["vuha3608@ut.edu.vn", "nguyentann0804@gmail.com", "ducngocong@ut.edu.vn", "lecturer@quizgen.ai"],
        "pendingRequests": [
            {
                "id": "req-1",
                "email": "thanhnt@ut.edu.vn",
                "name": "ThS. Nguyễn Tiến Thành",
                "title": "Giảng viên",
                "requestedAt": "17/11/2026 10:15"
            }
        ],
        "messages": [
            {
                "id": "msg-1",
                "senderEmail": "vuha3608@ut.edu.vn",
                "senderName": "TS. Hồ Anh Vũ",
                "senderTitle": "Trưởng bộ môn",
                "avatarColor": "bg-teal-600",
                "text": "Chào quý Thầy/Cô! Kỳ này bộ môn chúng ta thống nhất dùng chung giáo trình Chuẩn Operating System Concepts 10th để sinh đề thi trắc nghiệm nhé.",
                "timestamp": "09:15",
                "attachment": {
                    "type": "textbook",
                    "id": "tb-002",
                    "name": "2018-Operating System Concepts-10th.pdf",
                    "size": "29.7 MB",
                    "totalPages": 1278,
                    "authorName": "TS. Hồ Anh Vũ"
                }
            }
        ]
    },
    {
        "id": "qg-2",
        "code": "QGRP-LLCT2026",
        "name": "Tổ Bộ Môn Lý Luận Chính Trị",
        "department": "Khoa Lý luận Chính trị",
        "description": "Tập trung biên soạn ngân hàng đề thi trắc nghiệm môn Tư tưởng Hồ Chí Minh và Triết học Mác - Lênin.",
        "ownerEmail": "hanbich1506@gmail.com",
        "ownerName": "ThS. Hân Bích",
        "joinPolicy": "open",
        "memberCount": 3,
        "members": ["hanbich1506@gmail.com", "hieuhieu2211@gmail.com", "lecturer@quizgen.ai"],
        "pendingRequests": [],
        "messages": []
    }
]

_CACHED_QGROUPS = None
_CACHED_INVITATIONS = None
_CACHED_FRIEND_REQUESTS = None

def get_system_avatar_map() -> dict:
    """Đọc bảng ánh xạ { email: avatar_url } từ cơ sở dữ liệu xác thực auth.db để tự động điền avatar vào mọi tin nhắn & nhóm."""
    try:
        base_dir = Path(__file__).resolve().parent.parent.parent
        auth_db_path = base_dir / "services" / "auth-service" / "data" / "auth.db"
        if not auth_db_path.exists():
            auth_db_path = base_dir / "auth-service" / "data" / "auth.db"
        if auth_db_path.exists():
            import sqlite3
            conn = sqlite3.connect(str(auth_db_path))
            cur = conn.cursor()
            cur.execute("SELECT LOWER(email), avatar_url FROM users WHERE avatar_url IS NOT NULL AND avatar_url != ''")
            rows = cur.fetchall()
            conn.close()
            return {r[0].strip().lower(): r[1].strip() for r in rows if r[0] and r[1]}
    except Exception:
        pass
    return {}


def deduplicate_qgroups(groups: list) -> list:
    unique = []
    seen_channel_keys = set()
    dm_map = {}

    for g in groups:
        if not isinstance(g, dict):
            continue
        
        # Xử lý gộp Tin nhắn trực tiếp 1-1: Mỗi cặp người dùng chỉ có duy nhất 1 phòng DM
        if g.get("isDirect"):
            raw_members = g.get("members") or [g.get("ownerEmail"), g.get("directPartnerEmail")]
            clean_members = sorted(list(set(str(m).strip().lower() for m in raw_members if m)))
            if not clean_members:
                continue
            pair_key = "<->".join(clean_members)
            if pair_key in dm_map:
                # Merge messages và cập nhật timestamp mới nhất
                target = dm_map[pair_key]
                existing_msgs = {str(m.get("id")): m for m in target.get("messages", []) if m.get("id")}
                for m in g.get("messages", []):
                    mid = str(m.get("id", ""))
                    if mid and mid not in existing_msgs:
                        target.setdefault("messages", []).append(m)
                        existing_msgs[mid] = m
                target["updatedAt"] = max(target.get("updatedAt", 0) or 0, g.get("updatedAt", 0) or 0)
                continue
            else:
                dm_map[pair_key] = g
                unique.append(g)
        else:
            # Deduplicate kênh chuyên môn theo code hoặc id
            key = str(g.get("code") or g.get("id") or "").strip()
            if not key or key in seen_channel_keys:
                continue
            seen_channel_keys.add(key)
            unique.append(g)
            
    return unique

def load_server_qgroups() -> list:
    if not QGROUPS_FILE.exists():
        save_server_qgroups(DEFAULT_QGROUPS)
        return DEFAULT_QGROUPS
    try:
        with open(QGROUPS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list) and len(data) > 0:
                return deduplicate_qgroups(data)
    except Exception:
        pass
    return DEFAULT_QGROUPS

def save_server_qgroups(groups: list):
    cleaned = deduplicate_qgroups(groups)
    try:
        QGROUPS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(QGROUPS_FILE, "w", encoding="utf-8") as f:
            json.dump(cleaned, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Error saving qgroups to server storage: {e}")

def load_server_invitations() -> list:
    global _CACHED_INVITATIONS
    if _CACHED_INVITATIONS is not None:
        return _CACHED_INVITATIONS
    if not QGROUP_INVITATIONS_FILE.exists():
        _CACHED_INVITATIONS = []
        return []
    try:
        with open(QGROUP_INVITATIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                _CACHED_INVITATIONS = data
                return _CACHED_INVITATIONS
    except Exception:
        pass
    _CACHED_INVITATIONS = []
    return []

def save_server_invitations(invitations: list):
    global _CACHED_INVITATIONS
    _CACHED_INVITATIONS = invitations
    try:
        QGROUP_INVITATIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(QGROUP_INVITATIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(invitations, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Error saving invitations: {e}")


def _resolve_safe_attachment(base_dirs, filename: str) -> Path:
    import urllib.parse
    raw_name = filename
    unquoted_name = urllib.parse.unquote(filename)
    for candidate in (unquoted_name, raw_name):
        if not candidate or "/" in candidate or "\\" in candidate or ".." in candidate:
            continue
        safe_name = Path(candidate).name
        if not safe_name or safe_name != candidate:
            continue
        for base_dir in base_dirs:
            base_resolved = base_dir.resolve()
            target = (base_resolved / safe_name).resolve()
            if os.path.commonpath([str(target), str(base_resolved)]) == str(base_resolved) and target.exists() and target.is_file():
                return target
    raise HTTPException(status_code=404, detail="Attachment not found")




def load_friend_requests() -> list:
    global _CACHED_FRIEND_REQUESTS
    if _CACHED_FRIEND_REQUESTS is not None:
        return _CACHED_FRIEND_REQUESTS
    if not FRIEND_REQUESTS_FILE.exists():
        _CACHED_FRIEND_REQUESTS = []
        return []
    try:
        with open(FRIEND_REQUESTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                _CACHED_FRIEND_REQUESTS = data
                return _CACHED_FRIEND_REQUESTS
    except Exception:
        pass
    _CACHED_FRIEND_REQUESTS = []
    return []

def save_friend_requests(requests: list):
    global _CACHED_FRIEND_REQUESTS
    _CACHED_FRIEND_REQUESTS = requests
    try:
        FRIEND_REQUESTS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(FRIEND_REQUESTS_FILE, "w", encoding="utf-8") as f:
            json.dump(requests, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Error saving friend_requests: {e}")


_CACHED_FORUM_POSTS = None

def load_server_forum_posts() -> list:
    global _CACHED_FORUM_POSTS
    if _CACHED_FORUM_POSTS is not None:
        return _CACHED_FORUM_POSTS
    if not FORUM_POSTS_FILE.exists():
        _CACHED_FORUM_POSTS = []
        return _CACHED_FORUM_POSTS
    try:
        with open(FORUM_POSTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                _CACHED_FORUM_POSTS = data
                return _CACHED_FORUM_POSTS
    except Exception as e:
        logger.error(f"Error loading forum posts from server storage: {e}")
    _CACHED_FORUM_POSTS = []
    return _CACHED_FORUM_POSTS

def save_server_forum_posts(posts: list):
    global _CACHED_FORUM_POSTS
    _CACHED_FORUM_POSTS = posts
    try:
        FORUM_POSTS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(FORUM_POSTS_FILE, "w", encoding="utf-8") as f:
            json.dump(posts, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Error saving forum posts to server storage: {e}")

