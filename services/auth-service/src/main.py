import os
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import select

from .database import engine, Base, get_db
from .models import UserDB, LecturerCreate, LecturerResponse, TokenResponse

app = FastAPI(title="QuizGen AI - Auth Service", version="1.0.0")

SECRET_KEY = os.getenv("SECRET_KEY", "quizgen-super-secret-academic-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Khởi tạo bảng và nạp tài khoản mẫu nếu chưa tồn tại
@app.on_event("startup")
def startup_db():
    try:
        Base.metadata.create_all(bind=engine)
        # Nạp dữ liệu giảng viên mẫu ban đầu nếu bảng trống
        db = next(get_db())
        existing = db.execute(select(UserDB).filter_by(email="lecturer@vnu.edu.vn")).scalar_one_or_none()
        if not existing:
            default_user = UserDB(
                id="lec-001",
                email="lecturer@vnu.edu.vn",
                full_name="Nguyễn Văn A",
                academic_title="TS.",
                university="Đại học Quốc gia",
                department="Khoa Kinh tế & Quản trị",
                password_hash=pwd_context.hash("academic123"),
                role="lecturer",
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(default_user)
            db.commit()
    except Exception as e:
        print(f"[AUTH-SERVICE] DB Init warning: {e}")

@app.get("/health")
def health():
    return {"status": "healthy", "service": "auth-service"}

@app.post("/register", response_model=LecturerResponse)
def register(user_in: LecturerCreate, db: Session = Depends(get_db)):
    existing = db.execute(select(UserDB).filter_by(email=user_in.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản email trường này đã được đăng ký."
        )

    # Đếm số lượng để tạo ID chuẩn: lec-001, lec-002
    count = db.query(UserDB).count()
    user_id = f"lec-{count + 1:03d}"

    new_user = UserDB(
        id=user_id,
        email=user_in.email,
        full_name=user_in.full_name,
        academic_title=user_in.academic_title,
        university=user_in.university,
        department=user_in.department,
        password_hash=pwd_context.hash(user_in.password),
        role="lecturer",
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.execute(select(UserDB).filter_by(email=form_data.username)).scalar_one_or_none()
    if not user or not pwd_context.verify(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác."
        )
    
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": user.email, "exp": expire, "role": user.role, "id": user.id}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": encoded_jwt,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user
    }

@app.get("/me", response_model=LecturerResponse)
def get_me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Token không hợp lệ.")
        user = db.execute(select(UserDB).filter_by(email=email)).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="Không tìm thấy người dùng.")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Xác thực không hợp lệ.")
