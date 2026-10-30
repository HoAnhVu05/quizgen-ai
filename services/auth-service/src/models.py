from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class LecturerBase(BaseModel):
    email: EmailStr
    full_name: str
    academic_title: str  # e.g., "TS.", "PGS.TS.", "ThS."
    university: str
    department: str

class LecturerCreate(LecturerBase):
    password: str

class LecturerResponse(LecturerBase):
    id: str
    role: str = "lecturer"
    is_active: bool = True
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: LecturerResponse
