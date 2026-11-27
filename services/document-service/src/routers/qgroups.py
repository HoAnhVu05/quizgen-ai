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
from ..auth import get_current_user_id, get_optional_user_id, get_optional_user_info
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

@router.post("/documents/qgroups/upload-attachment")
@router.post("/qgroups/upload-attachment")
async def upload_qgroup_attachment(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail=f"Dung lượng tệp vượt quá giới hạn tối đa 25MB ({len(content) / (1024*1024):.1f} MB)."
            )
        orig_name = file.filename or "file"
        safe_base = "".join(c if (c.isalnum() or c in "._-") else "_" for c in orig_name)
        safe_base = re.sub(r'_+', '_', safe_base).strip('._')
        if not safe_base:
            safe_base = "attachment"
        disk_name = f"{uuid.uuid4().hex[:8]}_{safe_base}"
        disk_path = QGROUP_ATTACHMENTS_DIR / disk_name
        with open(disk_path, "wb") as f:
            f.write(content)
        
        size_bytes = len(content)
        formatted_size = f"{size_bytes / (1024 * 1024):.1f} MB" if size_bytes > 1024 * 1024 else f"{round(size_bytes / 1024)} KB"
        
        is_image = (file.content_type or "").startswith("image/")
        is_video = (file.content_type or "").startswith("video/")
        is_audio = (file.content_type or "").startswith("audio/")
        att_type = "image" if is_image else "video" if is_video else "audio" if is_audio else "file"
        
        file_url = f"/api/v1/documents/qgroups/attachments/{disk_name}"
        return {
            "status": "success",
            "fileUrl": file_url,
            "name": orig_name,
            "size": formatted_size,
            "type": att_type,
            "fileType": file.content_type or "application/octet-stream",
        }
    except Exception as e:
        logger.error(f"Error uploading qgroup attachment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/qgroups/attachments/{filename}")
@router.get("/qgroups/attachments/{filename}")
async def get_qgroup_attachment(filename: str, download: bool = False):
    import urllib.parse
    unquoted_name = urllib.parse.unquote(filename)
    file_path = _resolve_safe_attachment([QGROUP_ATTACHMENTS_DIR, FORUM_ATTACHMENTS_DIR], filename)

    orig_name = unquoted_name.split("_", 1)[1] if "_" in unquoted_name else unquoted_name
    import mimetypes
    content_type, _ = mimetypes.guess_type(orig_name)

    # Audio/Video explicit MIME types override
    AUDIO_EXT_MAP = {
        ".webm": "audio/webm",
        ".weba": "audio/webm",
        ".ogg": "audio/ogg",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".m4a": "audio/aac",
        ".aac": "audio/aac",
    }
    ext = file_path.suffix.lower()
    if ext in AUDIO_EXT_MAP:
        content_type = AUDIO_EXT_MAP[ext]
    elif not content_type:
        content_type = "application/octet-stream"

    # Prevent Stored XSS via inline active content (HTML/SVG/JS)
    UNSAFE_INLINE_EXTS = {".html", ".htm", ".svg", ".xhtml", ".xml", ".js", ".mjs"}
    disp_type = "attachment" if (download or ext in UNSAFE_INLINE_EXTS) else "inline"
    encoded_filename = urllib.parse.quote(orig_name)
    ascii_filename = orig_name.encode("ascii", "ignore").decode("ascii").strip() or "attachment"
    headers = {
        "Content-Disposition": f"{disp_type}; filename=\"{ascii_filename}\"; filename*=UTF-8''{encoded_filename}",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*",
    }
    return FileResponse(file_path, media_type=content_type, headers=headers)

@router.get("/qgroups")
@router.get("/documents/qgroups")
def get_qgroups(email: Optional[str] = Query(None), request: Request = None):
    groups = load_server_qgroups()
    user_email = email
    if not user_email and request:
        user_email = request.headers.get("x-user-email")
    filtered = groups
    if user_email:
        clean = user_email.strip().lower()
        filtered = [
            g for g in groups
            if clean == (g.get("ownerEmail") or "").strip().lower()
            or clean == (g.get("directPartnerEmail") or "").strip().lower()
            or clean in [str(m).strip().lower() for m in g.get("members", [])]
        ]

    # Bổ sung avatar hệ thống cho nhóm và tin nhắn nếu còn thiếu
    avatar_map = get_system_avatar_map()
    if avatar_map:
        for g in filtered:
            if g.get("isDirect"):
                p_email = (g.get("directPartnerEmail") or "").strip().lower()
                o_email = (g.get("ownerEmail") or "").strip().lower()
                if not g.get("directPartnerAvatarUrl") and p_email in avatar_map:
                    g["directPartnerAvatarUrl"] = avatar_map[p_email]
                if not g.get("ownerAvatarUrl") and o_email in avatar_map:
                    g["ownerAvatarUrl"] = avatar_map[o_email]
            for m in g.get("messages", []):
                s_email = (m.get("senderEmail") or "").strip().lower()
                if not m.get("senderAvatarUrl") and s_email in avatar_map:
                    m["senderAvatarUrl"] = avatar_map[s_email]
    return filtered

@router.post("/qgroups")
@router.post("/documents/qgroups")
async def save_qgroups_endpoint(request: Request):
    payload = await request.json()
    if isinstance(payload, list):
        current = load_server_qgroups()
        current_map = {(g.get("id") or g.get("code")): g for g in current if (g.get("id") or g.get("code"))}
        for g in payload:
            gid = g.get("id") or g.get("code")
            if gid:
                current_map[gid] = g
            else:
                current.append(g)
        new_list = list(current_map.values())
        save_server_qgroups(new_list)
        return {"status": "success", "count": len(new_list), "data": new_list}
    elif isinstance(payload, dict):
        if "groups" in payload and isinstance(payload["groups"], list):
            current = load_server_qgroups()
            current_map = {(g.get("id") or g.get("code")): g for g in current if (g.get("id") or g.get("code"))}
            for g in payload["groups"]:
                gid = g.get("id") or g.get("code")
                if gid:
                    current_map[gid] = g
                else:
                    current.append(g)
            new_list = list(current_map.values())
            save_server_qgroups(new_list)
            return {"status": "success", "count": len(new_list), "data": new_list}
        else:
            current = load_server_qgroups()
            idx = next((i for i, g in enumerate(current) if g.get("id") == payload.get("id") or g.get("code") == payload.get("code")), -1)
            if idx >= 0:
                current[idx] = payload
            else:
                current.insert(0, payload)
            save_server_qgroups(current)
            return {"status": "success", "data": current}
    return {"status": "error", "message": "Invalid payload format"}

@router.post("/qgroups/{group_id}/messages")
@router.post("/documents/qgroups/{group_id}/messages")
async def add_qgroup_message(group_id: str, request: Request):
    msg = await request.json()
    msg_id = str(msg.get("id") or "").strip()
    
    # Bổ sung senderAvatarUrl tự động từ hệ thống nếu chưa có
    if not msg.get("senderAvatarUrl") and msg.get("senderEmail"):
        avatar_map = get_system_avatar_map()
        s_email = str(msg.get("senderEmail")).strip().lower()
        if s_email in avatar_map:
            msg["senderAvatarUrl"] = avatar_map[s_email]

    groups = load_server_qgroups()
    now_ms = int(time.time() * 1000)
    for g in groups:
        if str(g.get("id")) == str(group_id) or str(g.get("code")) == str(group_id):
            if "messages" not in g or not isinstance(g["messages"], list):
                g["messages"] = []
            # Chống trùng lặp tin nhắn nếu msg_id đã tồn tại
            if msg_id and any(str(m.get("id")) == msg_id for m in g["messages"]):
                return {"status": "success", "message": msg, "duplicate": True}
            g["messages"].append(msg)
            g["updatedAt"] = now_ms
            save_server_qgroups(groups)
            return {"status": "success", "message": msg}
    # Nếu chưa tìm thấy nhóm cụ thể, tạo hoặc lưu vào nhóm đầu tiên phù hợp
    return {"status": "error", "message": "Không tìm thấy nhóm tương ứng"}

@router.post("/qgroups/{group_id}/read")
@router.post("/documents/qgroups/{group_id}/read")
async def mark_qgroup_read(group_id: str, request: Request):
    payload = await request.json()
    user_email = str(payload.get("userEmail") or "").strip().lower()
    if not user_email:
        return {"status": "error", "message": "userEmail is required"}
    groups = load_server_qgroups()
    changed = False
    for g in groups:
        if str(g.get("id")) == str(group_id) or str(g.get("code")) == str(group_id):
            for m in g.get("messages", []):
                read_by = m.get("readBy", [])
                if not isinstance(read_by, list):
                    read_by = []
                if user_email not in [r.lower() for r in read_by]:
                    read_by.append(user_email)
                    m["readBy"] = read_by
                    changed = True
            break
    if changed:
        save_server_qgroups(groups)
    return {"status": "success", "changed": changed}

@router.delete("/qgroups/{group_id}")
@router.delete("/documents/qgroups/{group_id}")
def delete_qgroup_endpoint(group_id: str):
    """Xóa bỏ hoàn toàn một nhóm chat hoặc cuộc trò chuyện trực tiếp 1-1"""
    groups = load_server_qgroups()
    cleaned = [g for g in groups if str(g.get("id")) != str(group_id) and str(g.get("code")) != str(group_id)]
    save_server_qgroups(cleaned)
    return {"status": "success", "message": f"Đã xóa nhóm {group_id}", "remaining": len(cleaned)}

@router.post("/qgroups/{group_id}/messages/{message_id}/reaction")
@router.post("/documents/qgroups/{group_id}/messages/{message_id}/reaction")
async def toggle_message_reaction_endpoint(group_id: str, message_id: str, request: Request):
    """Đồng bộ thả/hủy cảm xúc tin nhắn vĩnh viễn vào CSDL máy chủ"""
    payload = await request.json()
    emoji = str(payload.get("emoji") or "").strip()
    user_email = str(payload.get("userEmail") or "").strip().lower()
    if not emoji or not user_email:
        return {"status": "error", "message": "emoji and userEmail are required"}
    
    groups = load_server_qgroups()
    changed = False
    updated_reactions = {}
    for g in groups:
        if str(g.get("id")) == str(group_id) or str(g.get("code")) == str(group_id):
            for m in g.get("messages", []):
                if str(m.get("id")) == str(message_id):
                    reactions = m.get("reactions") or {}
                    if not isinstance(reactions, dict):
                        reactions = {}
                    users = reactions.get(emoji, [])
                    if not isinstance(users, list):
                        users = []
                    users_clean = [u.strip().lower() for u in users]
                    if user_email in users_clean:
                        users = [u for u in users if u.strip().lower() != user_email]
                    else:
                        users.append(user_email)
                    
                    if users:
                        reactions[emoji] = users
                    elif emoji in reactions:
                        del reactions[emoji]
                    m["reactions"] = reactions
                    updated_reactions = reactions
                    changed = True
                    break
            break
    if changed:
        save_server_qgroups(groups)
        return {"status": "success", "reactions": updated_reactions}
    return {"status": "error", "message": "Không tìm thấy tin nhắn"}

@router.post("/qgroups/{group_id}/messages/{message_id}/recall")
@router.post("/documents/qgroups/{group_id}/messages/{message_id}/recall")
async def recall_message_endpoint(group_id: str, message_id: str):
    """Thu hồi tin nhắn vĩnh viễn trên máy chủ"""
    groups = load_server_qgroups()
    changed = False
    for g in groups:
        if str(g.get("id")) == str(group_id) or str(g.get("code")) == str(group_id):
            for m in g.get("messages", []):
                if str(m.get("id")) == str(message_id):
                    m["isRecalled"] = True
                    m["text"] = "Tin nhắn đã được thu hồi"
                    m["attachment"] = None
                    m["sharedPost"] = None
                    changed = True
                    break
            break
    if changed:
        save_server_qgroups(groups)
        return {"status": "success", "message": "Đã thu hồi tin nhắn"}
    return {"status": "error", "message": "Không tìm thấy tin nhắn"}

@router.delete("/qgroups/{group_id}/messages/{message_id}")
@router.delete("/documents/qgroups/{group_id}/messages/{message_id}")
def delete_message_endpoint(group_id: str, message_id: str):
    """Xóa tin nhắn vĩnh viễn khỏi máy chủ"""
    groups = load_server_qgroups()
    changed = False
    for g in groups:
        if str(g.get("id")) == str(group_id) or str(g.get("code")) == str(group_id):
            before = len(g.get("messages", []))
            g["messages"] = [m for m in g.get("messages", []) if str(m.get("id")) != str(message_id)]
            if len(g["messages"]) != before:
                changed = True
            break
    if changed:
        save_server_qgroups(groups)
        return {"status": "success", "message": "Đã xóa tin nhắn"}
    return {"status": "error", "message": "Không tìm thấy tin nhắn"}

@router.patch("/qgroups/{group_id}/messages/{message_id}")
@router.patch("/documents/qgroups/{group_id}/messages/{message_id}")
async def edit_message_endpoint(group_id: str, message_id: str, request: Request):
    """Cập nhật nội dung hoặc danh sách tệp đính kèm tin nhắn vào CSDL máy chủ"""
    payload = await request.json()
    new_text = payload.get("text")
    attachments = payload.get("attachments")
    groups = load_server_qgroups()
    changed = False
    for g in groups:
        if str(g.get("id")) == str(group_id) or str(g.get("code")) == str(group_id):
            for m in g.get("messages", []):
                if str(m.get("id")) == str(message_id):
                    if new_text is not None:
                        m["text"] = str(new_text).strip()
                        m["isEdited"] = True
                    if attachments is not None:
                        m["attachments"] = attachments
                        m["attachment"] = attachments[0] if len(attachments) > 0 else None
                    changed = True
                    break
            break
    if changed:
        save_server_qgroups(groups)
        return {"status": "success", "message": "Đã cập nhật tin nhắn"}
    return {"status": "error", "message": "Không tìm thấy tin nhắn"}

@router.post("/qgroups/{group_id}/messages/{message_id}/pin")
@router.post("/documents/qgroups/{group_id}/messages/{message_id}/pin")
def pin_message_endpoint(group_id: str, message_id: str):
    """Ghim hoặc bỏ ghim tin nhắn trên máy chủ"""
    groups = load_server_qgroups()
    changed = False
    is_pinned = False
    for g in groups:
        if str(g.get("id")) == str(group_id) or str(g.get("code")) == str(group_id):
            for m in g.get("messages", []):
                if str(m.get("id")) == str(message_id):
                    m["isPinned"] = not m.get("isPinned", False)
                    is_pinned = m["isPinned"]
                    changed = True
                    break
            break
    if changed:
        save_server_qgroups(groups)
        return {"status": "success", "isPinned": is_pinned}
    return {"status": "error", "message": "Không tìm thấy tin nhắn"}


@router.post("/qgroups/{group_id}/join-by-code")
@router.post("/documents/qgroups/{group_id}/join-by-code")
async def join_qgroup_by_code(group_id: str, request: Request):
    payload = await request.json()
    user_email = (payload.get("userEmail") or "").strip().lower()
    user_name = payload.get("userName") or "Giảng viên"
    user_title = payload.get("userTitle") or "ThS."
    
    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id) or str(g.get("code", "")).upper() == str(group_id).upper()), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm tương ứng")
    
    members = target.get("members", [])
    if any(m.lower() == user_email for m in members):
        return {"status": "already_member", "message": "Bạn đã là thành viên của nhóm này", "group": target}
    
    policy = target.get("joinPolicy", "open")
    now_ms = int(time.time() * 1000)
    
    if policy == "invite_only":
        return {
            "status": "invite_only",
            "message": "Nhóm này đang đặt chế độ Riêng tư (Chỉ tham gia khi được Trưởng nhóm mời trực tiếp).",
            "group": target
        }
    
    if policy == "approval_required":
        reqs = target.get("pendingRequests", [])
        if any(r.get("email", "").lower() == user_email for r in reqs):
            return {
                "status": "pending_exists",
                "message": "Bạn đã gửi yêu cầu tham gia trước đó. Vui lòng chờ Trưởng nhóm phê duyệt.",
                "group": target
            }
        req_id = f"req-{now_ms}"
        req_item = {
            "id": req_id,
            "email": user_email,
            "name": user_name,
            "title": user_title,
            "requestedAt": time.strftime("%H:%M %d/%m")
        }
        reqs.append(req_item)
        target["pendingRequests"] = reqs
        target["updatedAt"] = now_ms

        # Tạo tin nhắn thông báo ra ngoài kênh chat cho Trưởng nhóm biết và duyệt
        msgs = target.get("messages", [])
        msgs.append({
            "id": f"msg-req-{now_ms}",
            "senderEmail": "system",
            "senderName": "Hệ Thống Phê Duyệt",
            "isSystem": True,
            "isJoinRequest": True,
            "joinRequestId": req_id,
            "joinUserEmail": user_email,
            "joinUserName": user_name,
            "joinUserTitle": user_title,
            "timestamp": time.strftime("%H:%M"),
            "text": f"🔔 {user_title} {user_name} ({user_email}) vừa gửi yêu cầu tham gia phòng qua mã liên kết. Trưởng nhóm vui lòng xét duyệt.",
        })
        target["messages"] = msgs

        save_server_qgroups(groups)
        return {
            "status": "pending_approval",
            "message": f"Đã gửi yêu cầu tham gia tới Trưởng nhóm {target.get('ownerName', '')}! Vui lòng chờ phê duyệt.",
            "group": target
        }
    
    # Policy == 'open'
    members.append(user_email)
    target["members"] = members
    target["memberCount"] = len(members)
    target["updatedAt"] = now_ms
    
    msgs = target.get("messages", [])
    msgs.append({
        "id": f"msg-{now_ms}",
        "senderEmail": "system",
        "senderName": "Hệ Thống Q-Group",
        "isSystem": True,
        "timestamp": time.strftime("%H:%M"),
        "text": f"👋 {user_name} ({user_email}) đã tham gia nhóm qua mã phòng."
    })
    target["messages"] = msgs
    save_server_qgroups(groups)
    return {
        "status": "joined",
        "message": f"Chào mừng bạn gia nhập nhóm {target.get('name', '')}!",
        "group": target
    }

@router.post("/qgroups/{group_id}/respond-join-request")
@router.post("/documents/qgroups/{group_id}/respond-join-request")
async def respond_join_request(group_id: str, request: Request):
    payload = await request.json()
    req_id = payload.get("requestId")
    target_email = (payload.get("targetEmail") or "").strip().lower()
    action = payload.get("action")  # "approve" or "reject"
    admin_name = payload.get("adminName") or "Trưởng nhóm"
    
    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id)), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
    
    reqs = target.get("pendingRequests", [])
    matched_req = next((r for r in reqs if r.get("id") == req_id or r.get("email", "").lower() == target_email), None)
    if not matched_req:
        return {"status": "error", "message": "Không tìm thấy yêu cầu tham gia"}
    
    target["pendingRequests"] = [r for r in reqs if r.get("id") != matched_req.get("id") and r.get("email", "").lower() != target_email]
    now_ms = int(time.time() * 1000)
    target["updatedAt"] = now_ms
    
    # Cập nhật trạng thái tin nhắn yêu cầu tham gia
    msgs = target.get("messages", [])
    for m in msgs:
        if m.get("isJoinRequest") and (m.get("joinRequestId") == matched_req.get("id") or m.get("joinUserEmail", "").lower() == target_email):
            m["isJoinRequestHandled"] = True
            m["joinRequestStatus"] = action
            m["text"] = f"{'✓ Đã phê duyệt' if action == 'approve' else '✕ Đã từ chối'} yêu cầu của {matched_req.get('name', target_email)} ({target_email}) gia nhập nhóm bởi {admin_name}."

    if action == "approve":
        members = target.get("members", [])
        eff_email = matched_req.get("email", "").lower()
        if eff_email and eff_email not in [m.lower() for m in members]:
            members.append(eff_email)
            target["members"] = members
            target["memberCount"] = len(members)
        
        msgs.append({
            "id": f"msg-{now_ms}",
            "senderEmail": "system",
            "senderName": "Hệ Thống Q-Group",
            "isSystem": True,
            "timestamp": time.strftime("%H:%M"),
            "text": f"🎉 Trưởng nhóm {admin_name} đã phê duyệt cho {matched_req.get('name', 'Thành viên')} ({eff_email}) gia nhập nhóm!"
        })
    target["messages"] = msgs
    save_server_qgroups(groups)
    return {"status": "success", "action": action, "group": target}

@router.post("/qgroups/{group_id}/members")
@router.post("/documents/qgroups/{group_id}/members")
async def add_qgroup_member(group_id: str, request: Request):
    payload = await request.json()
    new_email = (payload.get("email") or payload.get("userEmail") or payload.get("targetEmail") or "").strip().lower()
    member_name = payload.get("name") or payload.get("userName") or payload.get("fullName") or new_email
    inviter_name = payload.get("inviterName") or "Đồng nghiệp"
    client_group = payload.get("group")

    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id) or str(g.get("code")) == str(group_id)), None)
    if not target and client_group and isinstance(client_group, dict):
        target = client_group
        groups.insert(0, target)

    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")

    members = target.get("members", [])
    if new_email and new_email not in [str(m).strip().lower() for m in members]:
        members.append(new_email)
        target["members"] = members
        target["memberCount"] = len(members)
        now_ms = int(time.time() * 1000)
        target["updatedAt"] = now_ms
        msgs = target.get("messages", [])
        msgs.append({
            "id": f"msg-{now_ms}",
            "senderEmail": "system",
            "senderName": "Hệ Thống Q-Group",
            "isSystem": True,
            "timestamp": time.strftime("%H:%M"),
            "text": f"🎉 {inviter_name} đã thêm {member_name} ({new_email}) vào kênh #{target.get('name', 'kênh')}."
        })
        target["messages"] = msgs
        save_server_qgroups(groups)

    return {"status": "success", "group": target}

@router.patch("/qgroups/{group_id}")
@router.patch("/documents/qgroups/{group_id}")
async def patch_qgroup(group_id: str, request: Request):
    payload = await request.json()
    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id) or str(g.get("code")) == str(group_id)), None)
    if not target and payload.get("group") and isinstance(payload.get("group"), dict):
        target = payload.get("group")
        groups.insert(0, target)

    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")

    for key, value in payload.items():
        if key in ("members", "memberCount", "name", "description", "department", "joinPolicy", "muted", "pinned"):
            target[key] = value

    now_ms = int(time.time() * 1000)
    target["updatedAt"] = now_ms
    save_server_qgroups(groups)
    return {"status": "success", "group": target}

@router.post("/qgroups/{group_id}/kick-member")
@router.post("/documents/qgroups/{group_id}/kick-member")
async def kick_qgroup_member(group_id: str, request: Request):
    payload = await request.json()
    target_email = (payload.get("targetEmail") or "").strip().lower()
    target_name = payload.get("targetName") or target_email
    admin_name = payload.get("adminName") or "Trưởng nhóm"
    
    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id)), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
    
    owner = (target.get("ownerEmail") or "").lower()
    if target_email == owner:
        return {"status": "error", "message": "Không thể loại Trưởng nhóm khỏi phòng"}
    
    members = target.get("members", [])
    new_members = [m for m in members if m.lower() != target_email]
    target["members"] = new_members
    target["memberCount"] = len(new_members)
    now_ms = int(time.time() * 1000)
    target["updatedAt"] = now_ms
    
    msgs = target.get("messages", [])
    msgs.append({
        "id": f"msg-{now_ms}",
        "senderEmail": "system",
        "senderName": "Hệ Thống Q-Group",
        "isSystem": True,
        "timestamp": time.strftime("%H:%M"),
        "text": f"⚠️ Trưởng nhóm {admin_name} đã loại {target_name} ({target_email}) khỏi nhóm."
    })
    target["messages"] = msgs
    save_server_qgroups(groups)
    return {"status": "success", "group": target}

@router.post("/qgroups/{group_id}/transfer-owner")
@router.post("/documents/qgroups/{group_id}/transfer-owner")
async def transfer_qgroup_owner(group_id: str, request: Request):
    """Chuyển giao quyền Trưởng nhóm cho thành viên khác (kèm tùy chọn rời nhóm)"""
    payload = await request.json()
    current_owner_email = (payload.get("currentOwnerEmail") or "").strip().lower()
    new_owner_email = (payload.get("newOwnerEmail") or "").strip().lower()
    new_owner_name = payload.get("newOwnerName") or new_owner_email
    current_owner_name = payload.get("currentOwnerName") or "Trưởng nhóm"
    also_leave = bool(payload.get("alsoLeave", False))

    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id) or str(g.get("code", "")).upper() == str(group_id).upper()), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")

    if target.get("ownerEmail", "").strip().lower() != current_owner_email:
        raise HTTPException(status_code=403, detail="Chỉ Trưởng nhóm hiện tại mới có quyền nhượng quyền")

    target["ownerEmail"] = new_owner_email
    target["ownerName"] = new_owner_name
    now_ms = int(time.time() * 1000)
    target["updatedAt"] = now_ms

    msgs = target.get("messages", [])
    if also_leave:
        members = target.get("members", [])
        new_members = [m for m in members if m.lower() != current_owner_email]
        target["members"] = new_members
        target["memberCount"] = len(new_members)
        msgs.append({
            "id": f"msg-{now_ms}",
            "senderEmail": "system",
            "senderName": "Hệ Thống Q-Group",
            "isSystem": True,
            "timestamp": time.strftime("%H:%M"),
            "text": f"👑 {current_owner_name} đã nhượng quyền Trưởng nhóm cho {new_owner_name} ({new_owner_email}) và rời khỏi nhóm."
        })
    else:
        msgs.append({
            "id": f"msg-{now_ms}",
            "senderEmail": "system",
            "senderName": "Hệ Thống Q-Group",
            "isSystem": True,
            "timestamp": time.strftime("%H:%M"),
            "text": f"👑 {current_owner_name} đã nhượng quyền Trưởng nhóm cho {new_owner_name} ({new_owner_email})."
        })
    target["messages"] = msgs
    save_server_qgroups(groups)
    return {"status": "success", "group": target}

@router.post("/qgroups/{group_id}/disband")
@router.post("/documents/qgroups/{group_id}/disband")
async def disband_qgroup(group_id: str, request: Request):
    """Giải tán nhóm hoàn toàn (chỉ Trưởng nhóm mới có quyền)"""
    payload = await request.json()
    owner_email = (payload.get("ownerEmail") or "").strip().lower()

    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id) or str(g.get("code", "")).upper() == str(group_id).upper()), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")

    if target.get("ownerEmail", "").strip().lower() != owner_email:
        raise HTTPException(status_code=403, detail="Chỉ Trưởng nhóm mới có quyền giải tán nhóm")

    cleaned = [g for g in groups if str(g.get("id")) != str(group_id) and str(g.get("code", "")).upper() != str(group_id).upper()]
    save_server_qgroups(cleaned)
    return {"status": "success", "message": f"Đã giải tán nhóm {target.get('name')}"}

@router.post("/qgroups/{group_id}/leave")
@router.post("/documents/qgroups/{group_id}/leave")
async def leave_qgroup(group_id: str, request: Request):
    payload = await request.json()
    user_email = (payload.get("userEmail") or "").strip().lower()
    user_name = payload.get("userName") or user_email
    
    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id)), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
    
    members = target.get("members", [])
    new_members = [m for m in members if m.lower() != user_email]
    target["members"] = new_members
    target["memberCount"] = len(new_members)
    now_ms = int(time.time() * 1000)
    target["updatedAt"] = now_ms
    
    msgs = target.get("messages", [])
    msgs.append({
        "id": f"msg-{now_ms}",
        "senderEmail": "system",
        "senderName": "Hệ Thống Q-Group",
        "isSystem": True,
        "timestamp": time.strftime("%H:%M"),
        "text": f"🚪 {user_name} ({user_email}) đã rời khỏi nhóm."
    })
    target["messages"] = msgs
    save_server_qgroups(groups)
    return {"status": "success", "group": target}


@router.post("/qgroups/{group_id}/settings")
@router.post("/documents/qgroups/{group_id}/settings")
async def update_qgroup_settings(group_id: str, request: Request):
    payload = await request.json()
    name = payload.get("name")
    department = payload.get("department")
    description = payload.get("description")
    join_policy = payload.get("joinPolicy")  # 'open' | 'approval_required' | 'invite_only'
    admin_name = payload.get("adminName") or "Trưởng nhóm"
    
    groups = load_server_qgroups()
    target = next((g for g in groups if str(g.get("id")) == str(group_id)), None)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
    
    old_policy = target.get("joinPolicy", "open")
    if name:
        target["name"] = name
    if department is not None:
        target["department"] = department
    if description is not None:
        target["description"] = description
    
    policy_changed = False
    if join_policy and join_policy != old_policy:
        target["joinPolicy"] = join_policy
        policy_changed = True
    
    now_ms = int(time.time() * 1000)
    target["updatedAt"] = now_ms
    
    if policy_changed:
        policy_names = {
            "open": "Công khai (Bất kỳ ai có mã đều vào ngay)",
            "approval_required": "Cần phê duyệt (Trưởng nhóm duyệt mới được vào)",
            "invite_only": "Riêng tư (Chỉ khi được mời trực tiếp)"
        }
        policy_label = policy_names.get(join_policy, join_policy)
        msgs = target.get("messages", [])
        msgs.append({
            "id": f"msg-{now_ms}",
            "senderEmail": "system",
            "senderName": "Hệ Thống Q-Group",
            "isSystem": True,
            "timestamp": time.strftime("%H:%M"),
            "text": f"⚙️ Trưởng nhóm {admin_name} đã cập nhật chế độ tham gia: **{policy_label}**"
        })
        target["messages"] = msgs
        
    save_server_qgroups(groups)
    return {"status": "success", "group": target}

@router.get("/dashboard/summary")
@router.get("/documents/dashboard/summary")
def get_dashboard_summary(
    user_id: Optional[str] = Query(None),
    current_user_info: Optional[Dict[str, Any]] = Depends(get_optional_user_info),
    db: Session = Depends(get_db)
):
    target_uid = user_id or (current_user_info.get("sub") if current_user_info else None)
    my_docs_count = 0
    if target_uid:
        target_uids = [target_uid]
        if target_uid in ["usr-lec-001", "usr-lec-003", "lec-001"]:
            target_uids = ["usr-lec-001", "usr-lec-003", "lec-001"]
        my_docs_count = db.query(DocumentDB).filter(DocumentDB.user_id.in_(target_uids)).count()
    shared_docs = db.query(DocumentDB).filter(DocumentDB.is_shared == 1).all()

    return {
        "status": "success",
        "data": {
            "stats": {
                "textbooksIndexed": my_docs_count,
                "totalShared": len(shared_docs)
            },
            "sharedDocuments": [
                {
                    "id": d.id,
                    "name": d.name,
                    "totalPages": d.total_pages or 100,
                    "uploadedAt": d.created_at.strftime("%d/%m/%Y") if d.created_at else "Hôm nay",
                    "subject": "Khoa Chuyên Ngành"
                }
                for d in shared_docs
            ]
        }
    }

@router.get("/qgroups/invitations")
@router.get("/documents/qgroups/invitations")
def get_qgroup_invitations(email: Optional[str] = None, type: Optional[str] = None, role: Optional[str] = None):
    invs = load_server_invitations()
    query_type = type or role or "received"
    if email:
        clean_email = email.strip().lower()
        if query_type == "sent":
            invs = [
                i for i in invs
                if i.get("inviterEmail", "").strip().lower() == clean_email
            ]
        elif query_type == "all":
            invs = [
                i for i in invs
                if i.get("targetEmail", "").strip().lower() == clean_email or
                   i.get("inviterEmail", "").strip().lower() == clean_email
            ]
        else:
            invs = [
                i for i in invs
                if i.get("targetEmail", "").strip().lower() == clean_email or
                   i.get("targetEmail", "").strip().lower().replace("@gmai.com", "@gmail.com") == clean_email or
                   clean_email.replace("@gmai.com", "@gmail.com") in i.get("targetEmail", "").strip().lower()
            ]
    return invs

@router.post("/qgroups/invitations")
@router.post("/documents/qgroups/invitations")
async def create_qgroup_invitation(request: Request):
    payload = await request.json()
    invs = load_server_invitations()
    target_email = payload.get("targetEmail", "").strip()
    if target_email.endswith("@gmai.com"):
        target_email = target_email.replace("@gmai.com", "@gmail.com")
        payload["targetEmail"] = target_email

    invs = [i for i in invs if not (i.get("groupId") == payload.get("groupId") and i.get("targetEmail", "").lower() == target_email.lower())]
    invs.insert(0, payload)
    save_server_invitations(invs)
    return {"status": "success", "invitation": payload}

@router.post("/qgroups/invitations/{inv_id}/respond")
@router.post("/documents/qgroups/invitations/{inv_id}/respond")
async def respond_qgroup_invitation(inv_id: str, request: Request):
    payload = await request.json()
    action = payload.get("action")
    user_email = (payload.get("userEmail") or "").strip().lower()
    user_name = payload.get("userName") or "Giảng viên"

    invs = load_server_invitations()
    target_inv = next((i for i in invs if i.get("id") == inv_id), None)
    if not target_inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    target_inv["status"] = "accepted" if action == "accept" else "rejected"
    save_server_invitations(invs)

    if action == "accept":
        groups = load_server_qgroups()
        target_group = next((g for g in groups if g.get("id") == target_inv.get("groupId")), None)
        if target_group:
            members = target_group.get("members", [])
            eff_email = user_email or target_inv.get("targetEmail", "").lower()
            if eff_email and eff_email not in [m.lower() for m in members]:
                members.append(eff_email)
                target_group["members"] = members
                target_group["memberCount"] = len(members)
                msgs = target_group.get("messages", [])
                inviter_name = target_inv.get("inviterName") or "Trưởng nhóm"
                msgs.append({
                    "id": f"msg-{int(time.time()*1000)}",
                    "senderEmail": "system",
                    "senderName": "Hệ Thống Q-Group",
                    "isSystem": True,
                    "timestamp": time.strftime("%H:%M"),
                    "text": f"🎉 {user_name} ({eff_email}) đã chấp nhận lời mời của {inviter_name} và chính thức tham gia kênh #{target_group.get('name', 'kênh')}!"
                })
                target_group["messages"] = msgs
                save_server_qgroups(groups)

    return {"status": "success", "invitation": target_inv}


