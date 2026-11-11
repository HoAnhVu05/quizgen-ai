import os
import uuid
import json
import hashlib
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from fastapi import FastAPI, HTTPException, status, Depends, Header
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

try:
    from jose import jwt
except ImportError:
    import jwt

from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import select

from .database import engine, Base, get_db
from .models import (
    UserDB,
    UserTokenDB,
    UniversityDB,
    FacultyDB,
    LecturerCreate,
    LecturerResponse,
    TokenResponse,
    RefreshTokenRequest,
    UniversityResponse,
    FacultyResponse
)
from .cache import cache

app = FastAPI(
    title="QuizGen AI - Auth Service",
    version="1.1.0",
    description="Microservice quản lý Tài khoản học thuật ĐHQG, Xác thực đa vai trò (Lecturer, Head of Dept, Admin) & Auto Refresh Token"
)

SECRET_KEY = os.getenv("SECRET_KEY", "quizgen-super-secret-academic-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def create_access_token(user: UserDB) -> str:
    """Tạo Access Token JWT có hạn dùng ngắn (30 phút)"""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": user.email,
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
        "token_type": "access",
        "exp": expire
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user: UserDB) -> Tuple[str, datetime]:
    """Tạo Refresh Token JWT có hạn dùng dài (7 ngày) phục vụ tái cấp token tự động"""
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "sub": user.email,
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "token_type": "refresh",
        "exp": expire
    }
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return token, expire


# Khởi tạo bảng và nạp tài khoản 3 vai trò chuẩn nếu chưa tồn tại
@app.on_event("startup")
def startup_db():
    try:
        Base.metadata.create_all(bind=engine)
        db = next(get_db())

        # 1. Nạp danh mục trường và khoa mẫu
        if not db.query(UniversityDB).first():
            vnu = UniversityDB(id="uni-vnu", code="VNU", name="Đại học Quốc gia", city="Hà Nội", website="https://vnu.edu.vn")
            hust = UniversityDB(id="uni-hust", code="HUST", name="Đại học Bách Khoa", city="Hà Nội", website="https://hust.edu.vn")
            db.add_all([vnu, hust])
            db.commit()

            fac1 = FacultyDB(id="fac-fit", university_id="uni-vnu", code="FIT", name="Khoa Công nghệ Thông tin", dean_name="GS.TS. Lê Hoài An")
            fac2 = FacultyDB(id="fac-fba", university_id="uni-vnu", code="FBA", name="Khoa Kinh tế & Quản trị", dean_name="PGS.TS. Trần Văn Nam")
            fac3 = FacultyDB(id="fac-qa", university_id="uni-vnu", code="QA", name="Phòng Khảo thí & Đảm bảo Chất lượng", dean_name="ThS. Lê Hoàng Nam")
            db.add_all([fac1, fac2, fac3])
            db.commit()

        # 2. Nạp dữ liệu tài khoản 3 vai trò mẫu chuẩn mực
        default_accounts = [
            {
                "id": "usr-lec-001",
                "email": "lecturer@vnu.edu.vn",
                "full_name": "Nguyễn Văn An",
                "academic_title": "TS.",
                "university": "Đại học Quốc gia",
                "department": "Khoa Công nghệ Thông tin",
                "password": "academic123",
                "role": "lecturer"
            },
            {
                "id": "usr-head-001",
                "email": "truongbomon@vnu.edu.vn",
                "full_name": "Trần Thị Mai",
                "academic_title": "PGS. TS.",
                "university": "Đại học Quốc gia",
                "department": "Bộ môn Hệ thống Thông tin",
                "password": "academic123",
                "role": "head_of_department"
            },
            {
                "id": "usr-adm-001",
                "email": "quizgen.ai.team@gmail.com",
                "full_name": "Ban Quản trị QuizGen AI",
                "academic_title": "Admin",
                "university": "Trường Đại học Giao thông Vận tải TP.HCM (UTH)",
                "department": "Ban Quản trị Hệ thống QuizGen AI",
                "password": "Admin@123456",
                "role": "admin"
            }
        ]

        for acc in default_accounts:
            existing = db.execute(select(UserDB).filter_by(email=acc["email"])).scalar_one_or_none()
            if not existing:
                user_obj = UserDB(
                    id=acc["id"],
                    email=acc["email"],
                    full_name=acc["full_name"],
                    academic_title=acc["academic_title"],
                    university=acc["university"],
                    department=acc["department"],
                    password_hash=pwd_context.hash(acc["password"]),
                    role=acc["role"],
                    is_active=True,
                    created_at=datetime.utcnow()
                )
                db.add(user_obj)
        db.commit()
    except Exception as e:
        print(f"[AUTH-SERVICE] DB Init warning: {e}")


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "auth-service",
        "roles_supported": ["lecturer", "head_of_department", "admin"],
        "token_refresh_enabled": True
    }


@app.post("/register", response_model=LecturerResponse)
def register(user_in: LecturerCreate, db: Session = Depends(get_db)):
    existing = db.execute(select(UserDB).filter_by(email=user_in.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản email trường này đã được đăng ký."
        )

    role = user_in.role or "lecturer"
    count = db.query(UserDB).count()
    user_id = f"usr-{role[:3]}-{count + 1:03d}"

    new_user = UserDB(
        id=user_id,
        email=user_in.email,
        full_name=user_in.full_name,
        academic_title=user_in.academic_title,
        university=user_in.university,
        department=user_in.department,
        password_hash=pwd_context.hash(user_in.password),
        role=role,
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Xác thực đăng nhập đa vai trò (Giảng viên, Trưởng bộ môn, Quản trị Khảo thí):
    Cấp phát đồng thời Access Token (30 phút) và Refresh Token (7 ngày).
    """
    user = db.execute(select(UserDB).filter_by(email=form_data.username)).scalar_one_or_none()
    if not user or not pwd_context.verify(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản này hiện đang bị tạm khóa. Vui lòng liên hệ quản trị khảo thí."
        )

    access_token = create_access_token(user)
    refresh_token, refresh_exp = create_refresh_token(user)

    # Lưu vết refresh token vào bảng user_tokens
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    token_record = UserTokenDB(
        id=f"tok-{uuid.uuid4().hex[:12]}",
        user_id=user.id,
        token_hash=token_hash,
        token_type="refresh",
        device_info="web",
        expires_at=refresh_exp,
        revoked=False
    )
    db.add(token_record)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user
    }


@app.post("/refresh", response_model=TokenResponse)
def refresh_token_endpoint(
    req: Optional[RefreshTokenRequest] = None,
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    Tự động tái cấp mã truy cập mới (Auto Token Refresh) khi Access Token JWT hết hạn:
    1. Kiểm tra chữ ký & thời hạn của Refresh Token
    2. Kiểm tra tính hợp lệ trong Redis Blacklist và CSDL
    3. Cấp mới cặp Access Token + Refresh Token (Rotation) và duy trì phiên đăng nhập không ngắt quãng
    """
    token = None
    if req and req.refresh_token:
        token = req.refresh_token.strip()
    elif authorization:
        auth_str = authorization.strip()
        if auth_str.lower().startswith("bearer "):
            token = auth_str[7:].strip()
        else:
            token = auth_str

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thiếu refresh_token trong yêu cầu (vui lòng gửi qua body JSON hoặc Authorization header)."
        )

    # Kiểm tra Redis Blacklist
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    if cache.is_token_revoked(token_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mã làm mới (Refresh Token) đã bị thu hồi hoặc đã đăng xuất. Vui lòng đăng nhập lại."
        )

    # Kiểm tra trạng thái trong CSDL
    token_record = db.execute(select(UserTokenDB).filter_by(token_hash=token_hash)).scalar_one_or_none()
    if token_record and token_record.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mã làm mới này đã bị vô hiệu hóa."
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("token_type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã xác thực gửi lên không phải Refresh Token hợp lệ."
            )

        email = payload.get("sub") or payload.get("email")
        user = db.execute(select(UserDB).filter_by(email=email)).scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tài khoản người dùng không tồn tại hoặc đã bị vô hiệu hóa."
            )

        # Cấp cặp Token mới
        new_access = create_access_token(user)
        new_refresh, new_exp = create_refresh_token(user)

        # Vô hiệu hóa refresh token cũ (Token Rotation)
        if token_record:
            token_record.revoked = True
        cache.revoke_token(token_hash, ttl=3600)

        # Lưu refresh token mới
        new_hash = hashlib.sha256(new_refresh.encode()).hexdigest()
        new_tok_rec = UserTokenDB(
            id=f"tok-{uuid.uuid4().hex[:12]}",
            user_id=user.id,
            token_hash=new_hash,
            token_type="refresh",
            device_info="web_rotated",
            expires_at=new_exp,
            revoked=False
        )
        db.add(new_tok_rec)
        db.commit()

        return {
            "access_token": new_access,
            "refresh_token": new_refresh,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên làm việc đã hết hạn hoàn toàn (Refresh Token expired). Vui lòng đăng nhập lại."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Xác thực mã làm mới thất bại: {str(e)}"
        )


@app.post("/logout")
def logout(
    req: Optional[RefreshTokenRequest] = None,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Đăng xuất an toàn: Thu hồi đồng thời Access Token và Refresh Token vào Redis Blacklist"""
    if token:
        access_hash = hashlib.sha256(token.encode()).hexdigest()
        cache.revoke_token(access_hash, ttl=ACCESS_TOKEN_EXPIRE_MINUTES * 60)

    if req and req.refresh_token:
        rf_hash = hashlib.sha256(req.refresh_token.encode()).hexdigest()
        cache.revoke_token(rf_hash, ttl=REFRESH_TOKEN_EXPIRE_DAYS * 86400)
        tok_rec = db.execute(select(UserTokenDB).filter_by(token_hash=rf_hash)).scalar_one_or_none()
        if tok_rec:
            tok_rec.revoked = True
            db.commit()

    return {"status": "success", "message": "Đăng xuất thành công, toàn bộ token đã bị thu hồi."}


@app.get("/me", response_model=LecturerResponse)
def get_me(token: Optional[str] = Depends(oauth2_scheme), authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    raw_token = token
    if not raw_token and authorization:
        auth_str = authorization.strip()
        if auth_str.lower().startswith("bearer "):
            raw_token = auth_str[7:].strip()
        else:
            raw_token = auth_str

    if not raw_token:
        raise HTTPException(status_code=401, detail="Yêu cầu tiêu đề Authorization: Bearer <token>")

    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    if cache.is_token_revoked(token_hash):
        raise HTTPException(status_code=401, detail="Phiên làm việc đã kết thúc (Token đã bị thu hồi).")

    try:
        payload = jwt.decode(raw_token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub") or payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Token không hợp lệ.")
        user = db.execute(select(UserDB).filter_by(email=email)).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="Không tìm thấy người dùng.")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token đã hết hạn. Vui lòng gọi /refresh để lấy token mới.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Xác thực không hợp lệ.")


@app.get("/universities", response_model=List[UniversityResponse])
def get_universities(db: Session = Depends(get_db)):
    """Danh mục các trường đại học cho màn hình Đăng ký"""
    return db.query(UniversityDB).all()


@app.get("/faculties", response_model=List[FacultyResponse])
def get_faculties(university_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Danh mục các khoa đào tạo cho màn hình Đăng ký"""
    query = db.query(FacultyDB)
    if university_id:
        query = query.filter(FacultyDB.university_id == university_id)
    return query.all()


class GoogleAuthRequest(BaseModel):
    google_access_token: Optional[str] = None
    access_token: Optional[str] = None
    id_token: Optional[str] = None
    credential: Optional[str] = None
    client_id: Optional[str] = None
    role: Optional[str] = "lecturer"
    academic_title: Optional[str] = "ThS."
    university: Optional[str] = "Đại học Quốc gia"
    department: Optional[str] = "Khoa Công nghệ Thông tin"


def _fetch_google_json(req_url: str, headers: Optional[dict] = None) -> dict:
    req = urllib.request.Request(req_url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token Google OAuth không hợp lệ hoặc đã hết hạn."
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Không thể kết nối máy chủ xác thực Google: {str(exc)}"
        ) from exc


@app.post("/google")
def login_with_google(req_data: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Xác thực tài khoản qua Google OAuth 2.0 (kiểm tra trực tiếp với Google APIs)."""
    google_access_token = (req_data.google_access_token or req_data.access_token or "").strip()
    id_token = (req_data.id_token or req_data.credential or "").strip()
    expected_client_id = (os.getenv("GOOGLE_CLIENT_ID") or req_data.client_id or "").strip()

    if not google_access_token and not id_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thiếu google_access_token hoặc id_token để xác thực Google OAuth 2.0."
        )

    if google_access_token:
        token_info = _fetch_google_json(
            f"https://www.googleapis.com/oauth2/v3/tokeninfo?access_token={urllib.parse.quote(google_access_token)}"
        )
        user_info = _fetch_google_json(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {google_access_token}"}
        )
        token_aud = token_info.get("aud") or token_info.get("azp")
        if expected_client_id and token_aud and token_aud != expected_client_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google Client ID không khớp.")
        email = (user_info.get("email") or token_info.get("email") or "").strip().lower()
        verified = user_info.get("email_verified") in (True, "true") or token_info.get("email_verified") in (True, "true")
        full_name = (user_info.get("name") or user_info.get("given_name") or email.split("@")[0]).strip()
        avatar_url = user_info.get("picture") or ""
    else:
        token_info = _fetch_google_json(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(id_token)}"
        )
        if expected_client_id and token_info.get("aud") and token_info.get("aud") != expected_client_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google ID token Client ID không khớp.")
        email = (token_info.get("email") or "").strip().lower()
        verified = token_info.get("email_verified") in (True, "true")
        full_name = (token_info.get("name") or token_info.get("given_name") or email.split("@")[0]).strip()
        avatar_url = token_info.get("picture") or ""

    if not email or not verified:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email Google chưa được xác minh.")

    user = db.execute(select(UserDB).filter_by(email=email)).scalar_one_or_none()
    if not user:
        requested_role = req_data.role if req_data.role in ("lecturer", "head_of_department", "admin") else "lecturer"
        user = UserDB(
            id=f"usr-gg-{uuid.uuid4().hex[:8]}",
            email=email,
            full_name=full_name,
            academic_title=req_data.academic_title or "ThS.",
            university=req_data.university or "Đại học Quốc gia",
            department=req_data.department or "Khoa Công nghệ Thông tin",
            password_hash=pwd_context.hash(uuid.uuid4().hex),
            role=requested_role,
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản này hiện đang bị tạm khóa.")

    access_token = create_access_token(user)
    refresh_token, refresh_exp = create_refresh_token(user)
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    db.add(UserTokenDB(
        id=f"tok-{uuid.uuid4().hex[:12]}",
        user_id=user.id,
        token_hash=token_hash,
        token_type="refresh",
        device_info="google_oauth2",
        expires_at=refresh_exp,
        revoked=False
    ))
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "auth_provider": "google",
        "google_verified": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "academic_title": user.academic_title,
            "university": user.university,
            "department": user.department,
            "role": user.role,
            "avatar_url": avatar_url,
            "auth_provider": "google",
            "is_active": user.is_active,
            "created_at": user.created_at,
        }
    }
