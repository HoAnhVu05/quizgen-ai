from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, Integer, Text, DateTime, JSON
from .database import Base, DATABASE_URL

SCHEMA_NAME = "exams" if DATABASE_URL.startswith("postgresql") else None

# ====================================================================
# SQLALCHEMY ORM MODELS
# ====================================================================
class QuestionDB(Base):
    __tablename__ = "questions"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True, index=True)
    document_id = Column(String(50), nullable=True, index=True)
    source_chunk_id = Column(String(100), nullable=False)
    textbook_name = Column(String(255), nullable=False)
    chapter = Column(String(255), nullable=False)
    bloom_level = Column(String(30), nullable=False, index=True) # Nhận biết, Thông hiểu, Vận dụng, Phân tích
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False) # [{"id": "opt-a", "label": "A", "text": "..."}]
    correct_answer_id = Column(String(20), nullable=False)
    explanation = Column(Text, nullable=True)
    confidence_score = Column(Integer, default=95)
    status = Column(String(20), default="pending", index=True) # pending, approved, rejected
    created_by = Column(String(50), default="lec-001")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExamDB(Base):
    __tablename__ = "exams"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, default="lec-001", index=True)
    title = Column(String(255), nullable=False)
    subject = Column(String(150), nullable=False)
    faculty = Column(String(150), default="Khoa Kinh tế & Quản trị")
    university = Column(String(150), default="ĐẠI HỌC QUỐC GIA")
    duration_minutes = Column(Integer, default=60)
    exam_codes = Column(JSON, nullable=False) # ["101", "102", "103", "104"]
    selected_question_ids = Column(JSON, nullable=False)
    format = Column(String(20), default="docx")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# ====================================================================
# PYDANTIC SCHEMAS
# ====================================================================
class OptionSchema(BaseModel):
    id: str
    label: str
    text: str

class QuestionUpdateSchema(BaseModel):
    question: Optional[str] = None
    options: Optional[List[OptionSchema]] = None
    correctAnswerId: Optional[str] = None
    explanation: Optional[str] = None

class QuestionStatusUpdate(BaseModel):
    status: str # approved | rejected | pending

class BatchApproveRequest(BaseModel):
    questionIds: List[str]

class ExportDocxRequest(BaseModel):
    exam_title: Optional[str] = "Đề thi Giữa kỳ Học kỳ II"
    examTitle: Optional[str] = None
    subject: Optional[str] = "Kinh tế vi mô"
    subjectName: Optional[str] = None
    exam_code: Optional[str] = "101"
    examCode: Optional[str] = None
    questions: Optional[List[Dict[str, Any]]] = None
    selectedQuestionIds: Optional[List[str]] = None

    def get_title(self) -> str:
        return self.examTitle or self.exam_title or "ĐỀ THI KẾT THÚC HỌC PHẦN"

    def get_subject(self) -> str:
        return self.subjectName or self.subject or "Kinh tế vi mô"

    def get_code(self) -> str:
        return self.examCode or self.exam_code or "101"

class ExportQtiRequest(BaseModel):
    title: str = "Quiz Canvas LMS"
    questions: List[Dict[str, Any]]
