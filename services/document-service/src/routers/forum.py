import os
import re
import time
import json
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any

from fastapi import APIRouter, File, HTTPException, UploadFile, Depends, Query, status, Body, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db, SessionLocal
from ..models import DocumentDB
from ..storage_helpers import (
    STORAGE_DIR,
    QGROUP_ATTACHMENTS_DIR,
    FORUM_ATTACHMENTS_DIR,
    _format_file_size,
    _resolve_safe_attachment,
    get_system_avatar_map,
    load_server_qgroups,
    save_server_qgroups,
    load_server_invitations,
    save_server_invitations,
    load_friend_requests,
    save_friend_requests,
    load_server_forum_posts,
    save_server_forum_posts,
)

logger = logging.getLogger("document-service")
router = APIRouter()

@router.get("/forum/posts")
@router.get("/documents/forum/posts")
def get_forum_posts(
    tag: Optional[str] = Query(None, description="Lọc theo tag môn học"),
    search: Optional[str] = Query(None, description="Tìm kiếm từ khóa"),
    author_email: Optional[str] = Query(None, description="Lọc theo email tác giả"),
    department: Optional[str] = Query(None, description="Lọc theo khoa"),
):
    posts = load_server_forum_posts()
    result = posts
    if tag and tag.lower() != "all":
        result = [p for p in result if str(p.get("tag", "")).lower() == tag.lower()]
    if author_email:
        result = [p for p in result if str(p.get("authorEmail", "")).lower() == author_email.lower()]
    if department:
        result = [p for p in result if department.lower() in str(p.get("department", "")).lower()]
    if search:
        kw = search.strip().lower()
        result = [
            p for p in result
            if kw in str(p.get("content", "")).lower()
            or kw in str(p.get("authorName", "")).lower()
            or kw in str(p.get("tag", "")).lower()
            or kw in str(p.get("attachmentFileName", "")).lower()
        ]

    # Bổ sung avatar tác giả bài viết và bình luận nếu còn thiếu
    avatar_map = get_system_avatar_map()
    if avatar_map:
        for p in result:
            a_email = (p.get("authorEmail") or "").strip().lower()
            if not p.get("authorAvatarUrl") and a_email in avatar_map:
                p["authorAvatarUrl"] = avatar_map[a_email]
            for c in p.get("comments", []):
                c_email = (c.get("authorEmail") or "").strip().lower()
                if not c.get("authorAvatarUrl") and c_email in avatar_map:
                    c["authorAvatarUrl"] = avatar_map[c_email]

    return result

@router.post("/forum/posts")
@router.post("/documents/forum/posts")
async def create_forum_post(request: Request):
    payload = await request.json()
    content = str(payload.get("content", "")).strip()
    if not content:
        raise HTTPException(status_code=400, detail="Nội dung bài viết không được để trống")
    
    posts = load_server_forum_posts()
    now_ms = int(time.time() * 1000)
    post_id = payload.get("id") or f"post-{now_ms}"
    
    new_post = {
        "id": post_id,
        "authorEmail": payload.get("authorEmail", "").strip().lower(),
        "authorName": payload.get("authorName", "Giảng viên UTH"),
        "authorTitle": payload.get("authorTitle", "TS."),
        "authorRole": payload.get("authorRole", "Giảng viên"),
        "department": payload.get("department", "Khoa Công nghệ Thông tin"),
        "timestamp": payload.get("timestamp", "Vừa xong"),
        "createdAt": datetime.now().isoformat(),
        "tag": payload.get("tag", "Hệ Điều Hành"),
        "privacy": payload.get("privacy", "public"),
        "content": content,
        "imageUrl": payload.get("imageUrl"),
        "attachmentFileName": payload.get("attachmentFileName"),
        "attachmentFileSize": payload.get("attachmentFileSize"),
        "attachmentDownloadUrl": payload.get("attachmentDownloadUrl"),
        "videoUrl": payload.get("videoUrl"),
        "likes": 0,
        "likedByEmails": [],
        "bookmarkedByEmails": [],
        "comments": []
    }
    
    posts.insert(0, new_post)
    save_server_forum_posts(posts)
    return {"status": "success", "post": new_post}

@router.put("/forum/posts/{post_id}")
@router.put("/documents/forum/posts/{post_id}")
async def update_forum_post(post_id: str, request: Request):
    payload = await request.json()
    posts = load_server_forum_posts()
    post = next((p for p in posts if p.get("id") == post_id), None)
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
    
    if "content" in payload:
        post["content"] = str(payload["content"]).strip()
    if "tag" in payload:
        post["tag"] = payload["tag"]
    if "privacy" in payload:
        post["privacy"] = payload["privacy"]
    if "imageUrl" in payload:
        post["imageUrl"] = payload["imageUrl"]
    if "videoUrl" in payload:
        post["videoUrl"] = payload["videoUrl"]
    if "updatedAt" not in post:
        post["updatedAt"] = datetime.now().isoformat()
        
    save_server_forum_posts(posts)
    return {"status": "success", "post": post}

@router.delete("/forum/posts/{post_id}")
@router.delete("/documents/forum/posts/{post_id}")
def delete_forum_post(post_id: str):
    posts = load_server_forum_posts()
    idx = next((i for i, p in enumerate(posts) if p.get("id") == post_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết để xóa")
    
    deleted = posts.pop(idx)
    save_server_forum_posts(posts)
    return {"status": "success", "deletedPostId": post_id}

@router.post("/forum/posts/{post_id}/like")
@router.post("/documents/forum/posts/{post_id}/like")
async def toggle_forum_post_like(post_id: str, request: Request):
    payload = await request.json()
    user_email = (payload.get("userEmail") or "").strip().lower()
    if not user_email:
        user_email = "guest@uth.edu.vn"
    
    posts = load_server_forum_posts()
    post = next((p for p in posts if p.get("id") == post_id), None)
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
    
    liked_by = post.get("likedByEmails", [])
    if user_email in liked_by:
        liked_by.remove(user_email)
        has_liked = False
    else:
        liked_by.append(user_email)
        has_liked = True
        
    post["likedByEmails"] = liked_by
    post["likes"] = len(liked_by)
    save_server_forum_posts(posts)
    return {"status": "success", "likes": post["likes"], "hasLiked": has_liked}

@router.post("/forum/posts/{post_id}/bookmark")
@router.post("/documents/forum/posts/{post_id}/bookmark")
async def toggle_forum_post_bookmark(post_id: str, request: Request):
    payload = await request.json()
    user_email = (payload.get("userEmail") or "").strip().lower()
    if not user_email:
        user_email = "guest@uth.edu.vn"
    
    posts = load_server_forum_posts()
    post = next((p for p in posts if p.get("id") == post_id), None)
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
    
    bookmarks = post.get("bookmarkedByEmails", [])
    if user_email in bookmarks:
        bookmarks.remove(user_email)
        is_bookmarked = False
    else:
        bookmarks.append(user_email)
        is_bookmarked = True
        
    post["bookmarkedByEmails"] = bookmarks
    save_server_forum_posts(posts)
    return {"status": "success", "isBookmarked": is_bookmarked}

@router.post("/forum/posts/{post_id}/comments")
@router.post("/documents/forum/posts/{post_id}/comments")
async def add_forum_comment(post_id: str, request: Request):
    payload = await request.json()
    content = str(payload.get("content", "")).strip()
    if not content:
        raise HTTPException(status_code=400, detail="Nội dung bình luận không được rỗng")
        
    posts = load_server_forum_posts()
    post = next((p for p in posts if p.get("id") == post_id), None)
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
        
    comments = post.get("comments", [])
    comment_id = f"c-{int(time.time() * 1000)}"
    new_comment = {
        "id": comment_id,
        "authorEmail": (payload.get("authorEmail") or "").strip().lower(),
        "authorName": payload.get("authorName", "Giảng viên"),
        "authorTitle": payload.get("authorTitle", "ThS."),
        "content": content,
        "timestamp": payload.get("timestamp", time.strftime("%H:%M Hôm nay")),
        "createdAt": datetime.now().isoformat()
    }
    comments.append(new_comment)
    post["comments"] = comments
    save_server_forum_posts(posts)
    return {"status": "success", "comment": new_comment, "totalComments": len(comments)}

@router.delete("/forum/posts/{post_id}/comments/{comment_id}")
@router.delete("/documents/forum/posts/{post_id}/comments/{comment_id}")
def delete_forum_comment(post_id: str, comment_id: str):
    posts = load_server_forum_posts()
    post = next((p for p in posts if p.get("id") == post_id), None)
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
        
    comments = post.get("comments", [])
    idx = next((i for i, c in enumerate(comments) if c.get("id") == comment_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy bình luận")
        
    deleted = comments.pop(idx)
    post["comments"] = comments
    save_server_forum_posts(posts)
    return {"status": "success", "deletedCommentId": comment_id, "totalComments": len(comments)}

@router.post("/forum/upload")
@router.post("/documents/forum/upload")
async def upload_forum_attachment(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Tên tệp không hợp lệ")
    
    clean_name = f"{int(time.time()*1000)}_{file.filename.replace(' ', '_')}"
    target_path = FORUM_ATTACHMENTS_DIR / clean_name
    
    content = await file.read()
    target_path.write_bytes(content)
    file_size_mb = f"{len(content) / (1024 * 1024):.1f} MB" if len(content) >= 1024 * 1024 else f"{max(1, len(content) // 1024)} KB"
    
    download_url = f"/api/v1/documents/forum/attachments/{clean_name}"
    is_image = file.content_type.startswith("image/") if file.content_type else False
    
    return {
        "status": "success",
        "fileName": file.filename,
        "savedName": clean_name,
        "fileSize": file_size_mb,
        "downloadUrl": download_url,
        "isImage": is_image
    }

@router.get("/forum/attachments/{file_name}")
@router.get("/documents/forum/attachments/{file_name}")
def download_forum_attachment(file_name: str):
    import urllib.parse
    unquoted = urllib.parse.unquote(file_name)
    target_path = _resolve_safe_attachment([FORUM_ATTACHMENTS_DIR, QGROUP_ATTACHMENTS_DIR], file_name)

    orig_name = unquoted.split("_", 1)[1] if "_" in unquoted else unquoted
    import mimetypes
    content_type, _ = mimetypes.guess_type(orig_name)
    content_type = content_type or "application/octet-stream"
    encoded_filename = urllib.parse.quote(orig_name)
    ascii_filename = orig_name.encode("ascii", "ignore").decode("ascii").strip() or "attachment"
    headers = {
        "Content-Disposition": f"attachment; filename=\"{ascii_filename}\"; filename*=UTF-8''{encoded_filename}",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*",
    }
    return FileResponse(target_path, media_type=content_type, headers=headers)


