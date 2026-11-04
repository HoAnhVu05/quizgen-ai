from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, Integer, Text, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .database import Base, DATABASE_URL

SCHEMA_NAME = "exams" if DATABASE_URL.startswith("postgresql") else None

# ====================================================================
# SQLALCHEMY ORM MODELS
# ====================================================================
class SubjectDB(Base):
    __tablename__ = "subjects"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True)
    code = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    credits = Column(Integer, default=3)
    faculty_id = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    learning_outcomes = relationship("LearningOutcomeDB", back_populates="subject", cascade="all, delete-orphan")


class LearningOutcomeDB(Base):
    __tablename__ = "learning_outcomes"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True)
    subject_id = Column(
        String(50), 
        ForeignKey(f"{SCHEMA_NAME}.subjects.id" if SCHEMA_NAME else "subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    code = Column(String(20), nullable=False)
    description = Column(Text, nullable=False)
    bloom_target = Column(String(30), default="Thông hiểu")
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("SubjectDB", back_populates="learning_outcomes")


class QuestionCLODB(Base):
    __tablename__ = "question_clos"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    question_id = Column(String(50), primary_key=True)
    clo_id = Column(String(50), primary_key=True)


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

    variants = relationship("ExamVariantDB", back_populates="exam", cascade="all, delete-orphan")


class ExamVariantDB(Base):
    __tablename__ = "exam_variants"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True)
    exam_id = Column(
        String(50), 
        ForeignKey(f"{SCHEMA_NAME}.exams.id" if SCHEMA_NAME else "exams.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    exam_code = Column(String(10), nullable=False)
    question_sequence = Column(JSON, nullable=False)
    options_permutation = Column(JSON, nullable=True)
    answer_keys = Column(JSON, nullable=False)
    file_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    exam = relationship("ExamDB", back_populates="variants")


class SystemActivityDB(Base):
    __tablename__ = "system_activities"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), nullable=False, default="lec-001", index=True)
    action_type = Column(String(100), nullable=False) # export_exam, approve_question, extract_textbook
    title = Column(String(255), nullable=False)
    detail = Column(Text, nullable=False)
    icon_name = Column(String(50), default="FileText")
    badge_color = Column(String(100), default="text-indigo-400 bg-indigo-500/10 border-indigo-500/20")
    meta_info = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)



class ExamAuditLogDB(Base):
    __tablename__ = "exam_audit_logs"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True)
    exam_id = Column(
        String(50),
        ForeignKey(f"{SCHEMA_NAME}.exams.id" if SCHEMA_NAME else "exams.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id = Column(String(50), nullable=False, index=True)
    action = Column(String(50), nullable=False, index=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    performed_at = Column(DateTime, default=datetime.utcnow, index=True)

    exam = relationship("ExamDB")


class QuestionAuditLogDB(Base):
    __tablename__ = "question_audit_logs"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True)
    question_id = Column(
        String(50),
        ForeignKey(f"{SCHEMA_NAME}.questions.id" if SCHEMA_NAME else "questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    lecturer_id = Column(String(50), nullable=False, index=True)
    action = Column(String(50), nullable=False, index=True)
    previous_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    performed_at = Column(DateTime, default=datetime.utcnow, index=True)

    question = relationship("QuestionDB")

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

class SubjectResponse(BaseModel):
    id: str
    code: str
    name: str
    credits: int
    description: Optional[str] = None

    class Config:
        from_attributes = True

class ActivityResponse(BaseModel):
    id: str
    action: str
    detail: str
    time: str
    icon: str
    color: str

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

class UnifiedExportRequest(BaseModel):
    selectedQuestionIds: Optional[List[str]] = None
    universityName: Optional[str] = "ĐẠI HỌC QUỐC GIA"
    facultyName: Optional[str] = "Khoa Kinh tế & Quản trị"
    examTitle: Optional[str] = "ĐỀ THI KẾT THÚC HỌC PHẦN"
    subjectName: Optional[str] = "Kinh tế vi mô"
    durationMinutes: Optional[int] = 60
    examCodeCount: Optional[int] = 4
    shuffleQuestions: Optional[bool] = True
    shuffleOptions: Optional[bool] = True
    includeAnswerKey: Optional[bool] = True
    includeExplanation: Optional[bool] = False
    format: Optional[str] = "docx" # docx | pdf | qti
    questions: Optional[List[Dict[str, Any]]] = None

class ExportQtiRequest(BaseModel):
    title: str = "Quiz Canvas LMS"
    questions: List[Dict[str, Any]]
