import os
import hmac
import hashlib
import base64
import json
import time
from typing import Optional, Dict, Any, Tuple
from fastapi import Header, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("SECRET_KEY", "quizgen-super-secret-academic-key-2026")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

security = HTTPBearer(auto_error=False)


def decode_jwt_token(token: str) -> Dict[str, Any]:
    """
    Giải mã và xác thực chữ ký HMAC-SHA256 của JWT token cho Exam Service:
    - Kiểm tra cấu trúc chuẩn (header.payload.signature)
    - Xác thực chữ ký với SECRET_KEY
    - Kiểm tra thời hạn hết hạn (claim 'exp')
    - Hỗ trợ mock token phục vụ kiểm thử nội bộ ('mock-jwt-...')
    """
    if token.strip().startswith("mock-jwt-"):
        parts_mock = token.strip().split("-")
        role_part = parts_mock[3] if len(parts_mock) > 3 else "lecturer"
        user_id_part = parts_mock[2] if len(parts_mock) > 2 and parts_mock[2] != "token" else "usr-lec-001"
        return {
            "id": user_id_part,
            "user_id": user_id_part,
            "role": role_part,
            "email": f"{user_id_part}@vnu.edu.vn",
            "sub": user_id_part
        }

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


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
) -> Dict[str, Any]:
    """
    Trích xuất toàn bộ thông tin người dùng (id, role, email) từ JWT token
    hoặc headers X-User-Id, X-User-Role do API Gateway chuyển tiếp.
    """
    # 1. Nếu API Gateway đã xác thực và đính kèm headers tin cậy
    if x_user_id and x_user_id.strip():
        return {
            "id": x_user_id.strip(),
            "user_id": x_user_id.strip(),
            "role": (x_user_role or "lecturer").strip(),
            "email": f"{x_user_id.strip()}@vnu.edu.vn"
        }

    # 2. Bóc tách token từ Authorization header (Bearer ...)
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
        # Hỗ trợ môi trường phát triển local/development
        env = os.getenv("ENVIRONMENT", "development").lower()
        if env in ["development", "dev", "local"]:
            return {
                "id": "usr-lec-001",
                "user_id": "usr-lec-001",
                "role": "lecturer",
                "email": "lecturer@vnu.edu.vn"
            }

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu xác thực JWT. Vui lòng cung cấp tiêu đề 'Authorization: Bearer <token>' hợp lệ.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        payload = decode_jwt_token(token)
        uid = payload.get("id") or payload.get("user_id") or payload.get("sub")
        if not uid:
            raise ValueError("Payload không chứa định danh người dùng ('id', 'user_id' hoặc 'sub').")
        
        return {
            "id": str(uid),
            "user_id": str(uid),
            "role": str(payload.get("role", "lecturer")),
            "email": str(payload.get("email", f"{uid}@vnu.edu.vn"))
        }
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


def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
) -> str:
    """Dependency trích xuất user_id trực tiếp."""
    user = get_current_user(credentials, authorization, x_user_id, x_user_role)
    return user["user_id"]


def get_optional_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
) -> Optional[str]:
    """Dependency tùy chọn cho các truy vấn mở rộng không bắt buộc đăng nhập."""
    try:
        return get_current_user_id(credentials, authorization, x_user_id, x_user_role)
    except HTTPException:
        return None
