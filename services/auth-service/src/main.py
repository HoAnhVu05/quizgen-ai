import os
import uuid
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.context import CryptContext
from .models import LecturerCreate, LecturerResponse, TokenResponse

app = FastAPI(title="QuizGen AI - Auth Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Config đọc từ env (không hard-code) ────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "quizgen-fallback-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ─── In-memory mock DB ───────────────────────────────────────────────────────
MOCK_USERS_DB: dict = {
    "lecturer@vnu.edu.vn": {
        "id": "lec-001",
        "email": "lecturer@vnu.edu.vn",
        "fullName": "Nguyễn Văn A",
        "academicTitle": "TS.",
        "university": "Đại học Quốc gia",
        "department": "Khoa Kinh tế & Quản trị",
        "hashed_password": pwd_context.hash("academic123"),
        "role": "lecturer",
        "isActive": True,
        "createdAt": datetime.now().isoformat(),
    }
}

# ─── Helper: tạo error response chuẩn theo convention ───────────────────────
def error_response(status_code: int, message: str, details=None):
    raise HTTPException(
        status_code=status_code,
        detail={
            "error": True,
            "statusCode": status_code,
            "message": message,
            "details": details,
            "requestId": f"req-{uuid.uuid4().hex[:12]}",
        }
    )

# ─── Helper: map user record sang camelCase response ─────────────────────────
def to_lecturer_response(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "fullName": user["fullName"],
        "academicTitle": user["academicTitle"],
        "university": user["university"],
        "department": user["department"],
        "role": user.get("role", "lecturer"),
        "isActive": user.get("isActive", True),
        "createdAt": user.get("createdAt", datetime.now().isoformat()),
    }

# ─── Helper: tạo JWT token ───────────────────────────────────────────────────
def create_access_token(user: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user["email"],
        "id": user["id"],
        "role": user.get("role", "lecturer"),
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ─── Helper: lấy current user từ JWT ────────────────────────────────────────
def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email or email not in MOCK_USERS_DB:
            error_response(401, "Token không hợp lệ hoặc đã hết hạn.")
        return MOCK_USERS_DB[email]
    except JWTError:
        error_response(401, "Xác thực không hợp lệ.")


# ════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {"status": "healthy", "service": "auth-service"}


@app.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_in: LecturerCreate):
    if user_in.email in MOCK_USERS_DB:
        error_response(409, "Tài khoản email này đã được đăng ký.")

    user_id = f"lec-{len(MOCK_USERS_DB) + 1:03d}"
    user_record = {
        "id": user_id,
        "email": user_in.email,
        "fullName": user_in.full_name,
        "academicTitle": user_in.academic_title,
        "university": user_in.university,
        "department": user_in.department,
        "hashed_password": pwd_context.hash(user_in.password),
        "role": "lecturer",
        "isActive": True,
        "createdAt": datetime.now().isoformat(),
    }
    MOCK_USERS_DB[user_in.email] = user_record
    return to_lecturer_response(user_record)


@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = MOCK_USERS_DB.get(form_data.username)
    if not user or not pwd_context.verify(form_data.password, user["hashed_password"]):
        error_response(401, "Email hoặc mật khẩu không chính xác.")

    token = create_access_token(user)
    return {
        "accessToken": token,
        "tokenType": "bearer",
        "expiresIn": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": to_lecturer_response(user),
    }


@app.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return to_lecturer_response(current_user)


@app.get("/analytics/dashboard")
def get_dashboard(current_user: dict = Depends(get_current_user)):
    """
    Trả về KPI tổng quan cho Dashboard screen của Frontend.
    Hiện tại dùng mock data — sẽ kết nối DB thực ở giai đoạn sau.
    """
    return {
        "totalTextbooks": 3,
        "totalApprovedQuestions": 47,
        "totalExamsPackaged": 5,
        "pendingReviewCount": 12,
        "bloomDistribution": {
            "nhanBiet": {"count": 18, "percentage": 38},
            "thongHieu": {"count": 16, "percentage": 34},
            "vanDung": {"count": 9, "percentage": 19},
            "phanTich": {"count": 4, "percentage": 9},
        },
        "ragQuota": {
            "usedTokens": 124000,
            "maxTokens": 1000000,
            "totalChunks": 890,
        },
        "recentActivities": [
            {
                "id": "act-1",
                "action": "Sinh câu hỏi AI",
                "detail": "Giáo trình Kinh tế vi mô - Chương 3 (20 câu)",
                "time": "30 phút trước",
            },
            {
                "id": "act-2",
                "action": "Tải lên tài liệu",
                "detail": "GiaoTrinh_KinhTeViMo_2025.pdf (14.2 MB)",
                "time": "2 giờ trước",
            },
        ],
    }
