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

@router.post("/friends/unfriend")
@router.post("/documents/friends/unfriend")
async def unfriend_endpoint(request: Request):
    """Hủy kết bạn giữa 2 tài khoản, dọn dẹp lời mời và phòng trò chuyện 1-1"""
    payload = await request.json()
    my_email = str(payload.get("myEmail") or "").strip().lower()
    target_email = str(payload.get("targetEmail") or "").strip().lower()
    if not my_email or not target_email:
        return {"status": "error", "message": "myEmail và targetEmail là bắt buộc"}
    
    # 1. Xóa trong friend_requests.json (xét cả senderEmail, targetEmail, recipientEmail)
    try:
        reqs = load_friend_requests()
        reqs = [
            r for r in reqs
            if not (
                {
                    str(r.get("senderEmail", "")).strip().lower(),
                    str(r.get("targetEmail") or r.get("recipientEmail") or "").strip().lower(),
                } == {my_email, target_email}
            )
        ]
        save_friend_requests(reqs)
    except Exception as e:
        logger.warning(f"Lỗi khi dọn dẹp friend_requests: {e}")

    # 2. Giữ lại phòng chat 1-1 & lịch sử tin nhắn trong qgroups.json, chỉ đánh dấu đã hủy kết bạn
    try:
        groups = load_server_qgroups()
        def is_dm_match(g):
            if not (g.get("isDirect") or g.get("type") == "direct"):
                return False
            owner = str(g.get("ownerEmail", "")).strip().lower()
            partner = str(g.get("directPartnerEmail", "")).strip().lower()
            mems = {str(m).strip().lower() for m in (g.get("members") or [])}
            if {owner, partner} == {my_email, target_email}:
                return True
            if {my_email, target_email}.issubset(mems):
                return True
            has_my = my_email in mems or my_email in (owner, partner)
            has_target = target_email in mems or target_email in (owner, partner)
            return has_my and has_target

        now_ms = int(time.time() * 1000)
        for g in groups:
            if is_dm_match(g):
                g["isUnfriended"] = True
                g["unfriendedAt"] = now_ms
                g["unfriendedBy"] = my_email
                g["updatedAt"] = now_ms
                msgs = g.setdefault("messages", [])
                msgs.append({
                    "id": f"msg-unfriend-{now_ms}",
                    "senderEmail": "system",
                    "senderName": "Hệ Thống QuizGen AI",
                    "isSystem": True,
                    "content": "Hai Thầy/Cô đã hủy kết nối bạn bè. Lịch sử trò chuyện cũ vẫn được lưu giữ.",
                    "timestamp": time.strftime("%H:%M"),
                })
        save_server_qgroups(groups)
    except Exception as e:
        logger.warning(f"Lỗi khi cập nhật trạng thái hủy kết bạn trong qgroups: {e}")

    return {"status": "success", "message": "Đã hủy kết bạn (lịch sử trò chuyện vẫn được giữ lại)."}


@router.get("/friend-requests")
@router.get("/documents/friend-requests")
def get_friend_requests(email: Optional[str] = None, type: Optional[str] = None):
    """Lấy danh sách lời mời kết bạn theo email người nhận hoặc người gửi"""
    reqs = load_friend_requests()
    for r in reqs:
        if not r.get("status"):
            r["status"] = "pending"
    if email:
        clean = email.strip().lower()
        if type == "sent":
            reqs = [r for r in reqs if r.get("senderEmail", "").strip().lower() == clean]
        elif type == "all":
            reqs = [r for r in reqs if (r.get("targetEmail") or r.get("recipientEmail") or "").strip().lower() == clean or r.get("senderEmail", "").strip().lower() == clean]
        else:
            reqs = [r for r in reqs if (r.get("targetEmail") or r.get("recipientEmail") or "").strip().lower() == clean]
    return reqs

@router.delete("/friend-requests/{req_id}")
@router.delete("/documents/friend-requests/{req_id}")
def cancel_friend_request(req_id: str):
    """Hủy/thu hồi lời mời kết bạn"""
    reqs = load_friend_requests()
    cleaned = [r for r in reqs if str(r.get("id")) != str(req_id)]
    save_friend_requests(cleaned)
    return {"status": "success", "message": f"Đã thu hồi lời mời kết bạn {req_id}"}

@router.post("/friend-requests")
@router.post("/documents/friend-requests")
async def create_friend_request(request: Request):
    """Gửi lời mời kết bạn từ tài khoản A tới email B"""
    payload = await request.json()
    reqs = load_friend_requests()
    sender = payload.get("senderEmail", "").strip().lower()
    target = payload.get("targetEmail", "").strip().lower()
    if not sender or not target:
        return {"status": "error", "message": "senderEmail và targetEmail là bắt buộc"}
    if sender == target:
        return {"status": "error", "message": "Không thể kết bạn với chính mình"}

    # Kiểm tra nếu đã là bạn bè (đã có phòng DM 1-1 còn hiệu lực)
    groups = load_server_qgroups()
    is_already_friend = any(
        g.get("isDirect")
        and not g.get("isUnfriended")
        and {sender, target}.issubset({str(m).strip().lower() for m in g.get("members", [])})
        for g in groups
    )
    if is_already_friend:
        return {"status": "already_friend", "message": "Hai Thầy/Cô đã là đồng nghiệp kết nối thành công trước đó."}

    # Bảo đảm luôn có đủ status, recipientEmail, requestedAt
    payload["senderEmail"] = sender
    payload["targetEmail"] = target
    payload.setdefault("recipientEmail", target)
    payload.setdefault("status", "pending")
    payload.setdefault("requestedAt", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))

    # Tránh duplicate: xóa req cũ cùng cặp sender-target nếu có
    reqs = [r for r in reqs if not (
        r.get("senderEmail", "").strip().lower() == sender and
        r.get("targetEmail", "").strip().lower() == target
    )]
    reqs.insert(0, payload)
    save_friend_requests(reqs)
    return {"status": "success", "request": payload}

@router.post("/friend-requests/{req_id}/respond")
@router.post("/documents/friend-requests/{req_id}/respond")
async def respond_friend_request(req_id: str, request: Request):
    """Chấp nhận hoặc từ chối lời mời kết bạn"""
    payload = await request.json()
    action = payload.get("action")  # "accept" | "reject"
    user_email = payload.get("userEmail", "").strip().lower()
    user_name = payload.get("userName", "Giảng viên")

    reqs = load_friend_requests()
    target_req = next((r for r in reqs if r.get("id") == req_id), None)
    if not target_req:
        raise HTTPException(status_code=404, detail="Lời mời kết bạn không tìm thấy")

    target_req["status"] = "accepted" if action == "accept" else "rejected"
    # Đồng thời cập nhật mọi lời mời pending giữa cùng cặp người dùng này để xóa sạch trạng thái chờ
    sender_email = target_req.get("senderEmail", "").strip().lower()
    target_email = target_req.get("targetEmail", "").strip().lower()
    for r in reqs:
        s = r.get("senderEmail", "").strip().lower()
        t = r.get("targetEmail", "").strip().lower()
        if (s == sender_email and t == target_email) or (s == target_email and t == sender_email):
            r["status"] = "accepted" if action == "accept" else "rejected"
    save_friend_requests(reqs)

    if action == "accept":
        # Tạo cuộc trò chuyện DM 1-1 trên backend
        sender_email = target_req.get("senderEmail", "").lower()
        sender_name = target_req.get("senderName", "Giảng viên")
        dm_id = f"dm-{int(time.time()*1000)}"
        dm_code = f"DM-{dm_id[-6:].upper()}"
        groups = load_server_qgroups()
        # Kiểm tra DM đã tồn tại chưa
        existing_dm = next((g for g in groups if g.get("isDirect") and
            set([str(m).strip().lower() for m in g.get("members", [])]) == {sender_email.strip().lower(), user_email.strip().lower()}), None)
        if existing_dm:
            if existing_dm.get("isUnfriended"):
                now_ms = int(time.time() * 1000)
                existing_dm["isUnfriended"] = False
                existing_dm.pop("unfriendedAt", None)
                existing_dm.pop("unfriendedBy", None)
                existing_dm["updatedAt"] = now_ms
                existing_dm.setdefault("messages", []).append({
                    "id": f"msg-refriend-{now_ms}",
                    "senderEmail": "system",
                    "senderName": "Hệ Thống QuizGen AI",
                    "isSystem": True,
                    "content": "Hai Thầy/Cô đã kết nối lại bạn bè.",
                    "timestamp": time.strftime("%H:%M"),
                })
                save_server_qgroups(groups)
        else:
            new_dm = {
                "id": dm_id,
                "code": dm_code,
                "name": f"{sender_name} & {user_name}",
                "department": "Bạn bè • Tin nhắn riêng",
                "description": f"Cuộc trò chuyện giữa {user_name} và {sender_name}",
                "ownerEmail": sender_email,
                "ownerName": sender_name,
                "ownerAvatarUrl": target_req.get("senderAvatarUrl") or "",
                "joinPolicy": "open",
                "memberCount": 2,
                "members": [sender_email, user_email],
                "pendingRequests": [],
                "isDirect": True,
                "directPartnerEmail": user_email,
                "directPartnerName": user_name,
                "directPartnerAvatarUrl": payload.get("userAvatarUrl") or "",
                "updatedAt": int(time.time() * 1000),
                "messages": [{
                    "id": f"msg-{int(time.time()*1000)}",
                    "senderEmail": "system",
                    "senderName": "Hệ Thống QuizGen AI",
                    "isSystem": True,
                    "timestamp": time.strftime("%H:%M"),
                    "text": f"🎉 {user_name} và {sender_name} đã trở thành bạn bè! Hãy gửi lời chào và bắt đầu chia sẻ học liệu cùng nhau."
                }]
            }
            groups.insert(0, new_dm)
            save_server_qgroups(groups)

    return {"status": "success", "request": target_req}


