from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt
from passlib.context import CryptContext
from .models import LecturerCreate, LecturerResponse, TokenResponse

app = FastAPI(title="QuizGen AI - Auth Service", version="1.0.0")

SECRET_KEY = "quizgen-super-secret-academic-key-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# In-memory mock DB for university lecturers
MOCK_USERS_DB = {
    "lecturer@vnu.edu.vn": {
        "id": "lec-001",
        "email": "lecturer@vnu.edu.vn",
        "full_name": "Nguyễn Văn A",
        "academic_title": "TS.",
        "university": "Đại học Quốc gia",
        "department": "Khoa Kinh tế & Quản trị",
        "hashed_password": pwd_context.hash("academic123"),
        "role": "lecturer",
        "is_active": True,
        "created_at": datetime.now(),
    }
}

@app.get("/health")
def health():
    return {"status": "healthy", "service": "auth-service"}

@app.post("/register", response_model=LecturerResponse)
def register(user_in: LecturerCreate):
    if user_in.email in MOCK_USERS_DB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản email trường này đã được đăng ký."
        )
    user_record = {
        "id": f"lec-{len(MOCK_USERS_DB) + 1:03d}",
        "email": user_in.email,
        "full_name": user_in.full_name,
        "academic_title": user_in.academic_title,
        "university": user_in.university,
        "department": user_in.department,
        "hashed_password": pwd_context.hash(user_in.password),
        "role": "lecturer",
        "is_active": True,
        "created_at": datetime.now(),
    }
    MOCK_USERS_DB[user_in.email] = user_record
    return user_record

@app.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = MOCK_USERS_DB.get(form_data.username)
    if not user or not pwd_context.verify(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác."
        )
    
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": user["email"], "exp": expire, "role": user["role"], "id": user["id"]}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": encoded_jwt,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user
    }

@app.get("/me", response_model=LecturerResponse)
def get_me(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None or email not in MOCK_USERS_DB:
            raise HTTPException(status_code=401, detail="Token không hợp lệ.")
        return MOCK_USERS_DB[email]
    except Exception:
        raise HTTPException(status_code=401, detail="Xác thực không hợp lệ.")
