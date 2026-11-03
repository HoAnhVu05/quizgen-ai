import os
import hmac
import hashlib
import base64
import json
import time
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("SECRET_KEY", "quizgen-super-secret-academic-key-2026")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

security = HTTPBearer(auto_error=False)


def decode_jwt_token(token: str) -> Dict[str, Any]:
    """
    Giải mã và xác thực chữ ký HMAC-SHA256 của JWT token:
    - Kiểm tra cấu trúc chuẩn (header.payload.signature)
    - Xác thực chữ ký với SECRET_KEY
    - Kiểm tra thời gian hết hạn (claim 'exp')
    """
    parts = token.strip().split(".")
    if len(parts) != 3:
        raise ValueError("Cấu trúc JWT không hợp lệ (yêu cầu đúng 3 phần phân tách bởi dấu chấm).")

    header_b64, payload_b64, signature_b64 = parts

    # 1. Xác thực chữ ký HMAC-SHA256
    msg = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).digest()

    sig_padding = "=" * (-len(signature_b64) % 4)
    try:
        actual_sig = base64.urlsafe_b64decode(signature_b64 + sig_padding)
    except Exception:
        raise ValueError("Chữ ký JWT không phải định dạng base64url hợp lệ.")

    if not hmac.compare_digest(expected_sig, actual_sig):
        raise ValueError("Chữ ký JWT không hợp lệ hoặc đã bị can thiệp.")

    # 2. Giải mã Payload
    payload_padding = "=" * (-len(payload_b64) % 4)
    try:
        payload_bytes = base64.urlsafe_b64decode(payload_b64 + payload_padding)
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception as e:
        raise ValueError(f"Không thể đọc payload JWT: {str(e)}")

    # 3. Kiểm tra hạn sử dụng (exp)
    exp = payload.get("exp")
    if exp is not None:
        current_time = int(time.time())
        if current_time > exp:
            raise ValueError(f"Token đã hết hạn từ thời điểm {exp} (hiện tại: {current_time}).")

    return payload


def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id")
) -> str:
    """
    Trích xuất user_id thực tế từ JWT token hoặc header X-User-Id (được API Gateway chuyển tiếp).
    Loại bỏ hoàn toàn việc fix cứng 'lec-001'.
    """
    # 1. Ưu tiên tiêu đề X-User-Id (nếu được chuyển tiếp từ API Gateway / Service Mesh tin cậy)
    if x_user_id and x_user_id.strip():
        return x_user_id.strip()

    # 2. Lấy raw token từ Authorization header (Bearer ...)
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials.strip()
    elif authorization:
        auth_str = authorization.strip()
        if auth_str.lower().startswith("bearer "):
            token = auth_str[7:].strip()
        else:
            token = auth_str

    if not token:
        # Nếu không có token xác thực, trả về mã 401 Unauthorized theo chuẩn HTTP
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu xác thực JWT. Vui lòng cung cấp tiêu đề 'Authorization: Bearer <token>' hợp lệ.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        payload = decode_jwt_token(token)
        user_id = payload.get("id") or payload.get("user_id") or payload.get("sub")
        if not user_id:
            raise ValueError("Payload của token không chứa định danh người dùng ('id', 'user_id' hoặc 'sub').")
        return str(user_id)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Xác thực thất bại: {str(ve)}",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Lỗi xác thực danh tính người dùng: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )


def get_optional_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id")
) -> Optional[str]:
    """Phiên bản tùy chọn cho các truy vấn mở rộng, không bắt buộc đăng nhập"""
    try:
        return get_current_user_id(credentials, authorization, x_user_id)
    except HTTPException:
        return None
