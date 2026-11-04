import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
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
    source_chunk_id = Column(String(100), nullable=False, index=True)
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
    selected_question_ids = Column(JSON, nullable=False) # ["q-1", "q-2"]
    format = Column(String(20), default="docx") # docx, pdf, qti
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


# ====================================================================
# PYDANTIC SCHEMAS
# ====================================================================
class OptionSchema(BaseModel):
    id: str
    label: Optional[str] = "A"
    text: str


class QuestionCreateSchema(BaseModel):
    id: Optional[str] = None
    document_id: Optional[str] = None
    documentId: Optional[str] = None
    source_chunk_id: Optional[str] = "chunk-default"
    sourceChunkId: Optional[str] = None
    textbook_name: Optional[str] = "GiaoTrinh_Chung.pdf"
    textbookName: Optional[str] = None
    chapter: Optional[str] = "Chương 1"
    bloom_level: Optional[str] = "Nhận biết"
    bloomLevel: Optional[str] = None
    question_text: Optional[str] = None
    question: Optional[str] = None
    options: List[OptionSchema]
    correct_answer_id: Optional[str] = None
    correctAnswerId: Optional[str] = None
    explanation: Optional[str] = ""
    confidence_score: Optional[int] = 95
    confidenceScore: Optional[int] = None
    status: Optional[str] = "pending"
    created_by: Optional[str] = "lec-001"

    def get_question_text(self) -> str:
        return self.question or self.question_text or ""

    def get_source_chunk_id(self) -> str:
        return self.sourceChunkId or self.source_chunk_id or "chunk-default"

    def get_textbook_name(self) -> str:
        return self.textbookName or self.textbook_name or "GiaoTrinh_Chung.pdf"

    def get_bloom_level(self) -> str:
        return self.bloomLevel or self.bloom_level or "Nhận biết"

    def get_correct_answer_id(self) -> str:
        return self.correctAnswerId or self.correct_answer_id or (self.options[0].id if self.options else "")

    def get_confidence_score(self) -> int:
        return self.confidenceScore if self.confidenceScore is not None else (self.confidence_score or 95)


class QuestionUpdateSchema(BaseModel):
    question: Optional[str] = None
    question_text: Optional[str] = None
    questionText: Optional[str] = None
    options: Optional[List[OptionSchema]] = None
    correctAnswerId: Optional[str] = None
    correct_answer_id: Optional[str] = None
    explanation: Optional[str] = None
    bloomLevel: Optional[str] = None
    bloom_level: Optional[str] = None
    confidenceScore: Optional[int] = None
    confidence_score: Optional[int] = None

    def get_text(self) -> Optional[str]:
        return self.questionText or self.question or self.question_text

    def get_answer_id(self) -> Optional[str]:
        return self.correctAnswerId or self.correct_answer_id

    def get_bloom(self) -> Optional[str]:
        return self.bloomLevel or self.bloom_level


class QuestionStatusUpdate(BaseModel):
    status: str # approved | rejected | pending


class BatchApproveRequest(BaseModel):
    questionIds: Optional[List[str]] = None
    question_ids: Optional[List[str]] = None

    def get_ids(self) -> List[str]:
        return self.questionIds or self.question_ids or []


class GenerateVariantsRequest(BaseModel):
    questionIds: Optional[List[str]] = None
    selectedQuestionIds: Optional[List[str]] = None
    questions: Optional[List[Dict[str, Any]]] = None
    examCodeCount: int = 4
    baseExamCode: int = 101
    shuffleQuestions: bool = True
    shuffleOptions: bool = True


class ExportDocxRequest(BaseModel):
    exam_title: Optional[str] = None
    examTitle: Optional[str] = None
    title: Optional[str] = None
    subject: Optional[str] = None
    subjectName: Optional[str] = None
    faculty: Optional[str] = None
    facultyName: Optional[str] = None
    department: Optional[str] = None
    university: Optional[str] = None
    universityName: Optional[str] = None
    schoolName: Optional[str] = None
    school: Optional[str] = None
    exam_code: Optional[str] = None
    examCode: Optional[str] = None
    code: Optional[str] = None
    duration_minutes: Optional[int] = None
    durationMinutes: Optional[int] = None
    duration: Optional[int] = None
    questions: Optional[List[Dict[str, Any]]] = None
    selectedQuestionIds: Optional[List[str]] = None
    includeAnswerKey: bool = True
    include_answer_key: Optional[bool] = None
    includeExplanation: bool = False
    include_explanation: Optional[bool] = None

    def get_title(self) -> str:
        return self.examTitle or self.exam_title or self.title or "ĐỀ THI KẾT THÚC HỌC PHẦN"

    def get_subject(self) -> str:
        return self.subjectName or self.subject or "Kinh tế vi mô"

    def get_faculty(self) -> str:
        return self.facultyName or self.faculty or self.department or "Khoa Kinh tế & Quản trị"

    def get_university(self) -> str:
        return self.universityName or self.university or self.schoolName or self.school or "ĐẠI HỌC QUỐC GIA"

    def get_code(self) -> str:
        return str(self.examCode or self.exam_code or self.code or "101")

    def get_duration(self) -> int:
        return self.durationMinutes or self.duration_minutes or self.duration or 60

    def get_include_answer_key(self) -> bool:
        if self.include_answer_key is not None:
            return self.include_answer_key
        return self.includeAnswerKey

    def get_include_explanation(self) -> bool:
        if self.include_explanation is not None:
            return self.include_explanation
        return self.includeExplanation


class ExportPdfRequest(BaseModel):
    exam_title: Optional[str] = None
    examTitle: Optional[str] = None
    title: Optional[str] = None
    subject: Optional[str] = None
    subjectName: Optional[str] = None
    faculty: Optional[str] = None
    facultyName: Optional[str] = None
    department: Optional[str] = None
    university: Optional[str] = None
    universityName: Optional[str] = None
    schoolName: Optional[str] = None
    school: Optional[str] = None
    exam_code: Optional[str] = None
    examCode: Optional[str] = None
    code: Optional[str] = None
    duration_minutes: Optional[int] = None
    durationMinutes: Optional[int] = None
    duration: Optional[int] = None
    questions: Optional[List[Dict[str, Any]]] = None
    selectedQuestionIds: Optional[List[str]] = None
    includeAnswerKey: bool = True
    include_answer_key: Optional[bool] = None
    includeExplanation: bool = False
    include_explanation: Optional[bool] = None
    includeOmrSheet: bool = False
    include_omr_sheet: Optional[bool] = None

    def get_title(self) -> str:
        return self.examTitle or self.exam_title or self.title or "ĐỀ THI KẾT THÚC HỌC PHẦN"

    def get_subject(self) -> str:
        return self.subjectName or self.subject or "Kinh tế vi mô"

    def get_faculty(self) -> str:
        return self.facultyName or self.faculty or self.department or "Khoa Kinh tế & Quản trị"

    def get_university(self) -> str:
        return self.universityName or self.university or self.schoolName or self.school or "ĐẠI HỌC QUỐC GIA"

    def get_code(self) -> str:
        return str(self.examCode or self.exam_code or self.code or "101")

    def get_duration(self) -> int:
        return self.durationMinutes or self.duration_minutes or self.duration or 60

    def get_include_answer_key(self) -> bool:
        if self.include_answer_key is not None:
            return self.include_answer_key
        return self.includeAnswerKey

    def get_include_explanation(self) -> bool:
        if self.include_explanation is not None:
            return self.include_explanation
        return self.includeExplanation

    def get_include_omr_sheet(self) -> bool:
        if self.include_omr_sheet is not None:
            return self.include_omr_sheet
        return self.includeOmrSheet


class UnifiedExportRequest(BaseModel):
    selectedQuestionIds: Optional[List[str]] = None
    selected_question_ids: Optional[List[str]] = None
    universityName: Optional[str] = None
    university: Optional[str] = None
    schoolName: Optional[str] = None
    school: Optional[str] = None
    facultyName: Optional[str] = None
    faculty: Optional[str] = None
    department: Optional[str] = None
    examTitle: Optional[str] = None
    exam_title: Optional[str] = None
    title: Optional[str] = None
    subjectName: Optional[str] = None
    subject: Optional[str] = None
    examCode: Optional[str] = None
    exam_code: Optional[str] = None
    code: Optional[str] = None
    durationMinutes: Optional[int] = None
    duration_minutes: Optional[int] = None
    duration: Optional[int] = None
    examCodeCount: Optional[int] = 4
    exam_code_count: Optional[int] = None
    shuffleQuestions: Optional[bool] = True
    shuffleOptions: Optional[bool] = True
    includeAnswerKey: Optional[bool] = True
    include_answer_key: Optional[bool] = None
    includeExplanation: Optional[bool] = False
    include_explanation: Optional[bool] = None
    includeOmrSheet: Optional[bool] = False
    include_omr_sheet: Optional[bool] = None
    format: Optional[str] = "docx" # docx | pdf | qti
    questions: Optional[List[Dict[str, Any]]] = None

    def get_university(self) -> str:
        return self.universityName or self.university or self.schoolName or self.school or "ĐẠI HỌC QUỐC GIA"

    def get_faculty(self) -> str:
        return self.facultyName or self.faculty or self.department or "Khoa Kinh tế & Quản trị"

    def get_title(self) -> str:
        return self.examTitle or self.exam_title or self.title or "ĐỀ THI KẾT THÚC HỌC PHẦN"

    def get_subject(self) -> str:
        return self.subjectName or self.subject or "Kinh tế vi mô"

    def get_code(self) -> str:
        return str(self.examCode or self.exam_code or self.code or "101")

    def get_duration(self) -> int:
        return self.durationMinutes or self.duration_minutes or self.duration or 60

    def get_include_answer_key(self) -> bool:
        if self.include_answer_key is not None:
            return self.include_answer_key
        return self.includeAnswerKey if self.includeAnswerKey is not None else True

    def get_include_explanation(self) -> bool:
        if self.include_explanation is not None:
            return self.include_explanation
        return self.includeExplanation if self.includeExplanation is not None else False

    def get_include_omr_sheet(self) -> bool:
        if self.include_omr_sheet is not None:
            return self.include_omr_sheet
        return self.includeOmrSheet if self.includeOmrSheet is not None else False


class ExportQtiRequest(BaseModel):
    title: str = "Quiz Canvas LMS"
    questions: Optional[List[Dict[str, Any]]] = None
    selectedQuestionIds: Optional[List[str]] = None


class CreateExamRecordRequest(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = "lec-001"
    userId: Optional[str] = None
    title: Optional[str] = None
    examTitle: Optional[str] = None
    exam_title: Optional[str] = None
    subject: Optional[str] = None
    subjectName: Optional[str] = None
    faculty: Optional[str] = "Khoa Kinh tế & Quản trị"
    facultyName: Optional[str] = None
    department: Optional[str] = None
    university: Optional[str] = "ĐẠI HỌC QUỐC GIA"
    universityName: Optional[str] = None
    schoolName: Optional[str] = None
    school: Optional[str] = None
    duration_minutes: Optional[int] = 60
    durationMinutes: Optional[int] = None
    duration: Optional[int] = None
    exam_codes: Optional[List[str]] = None
    examCodes: Optional[List[str]] = None
    examCodeCount: Optional[int] = None
    selected_question_ids: Optional[List[str]] = None
    selectedQuestionIds: Optional[List[str]] = None
    questionIds: Optional[List[str]] = None
    questions: Optional[List[Dict[str, Any]]] = None
    format: Optional[str] = "docx"
    variants: Optional[List[Dict[str, Any]]] = None

    def get_user_id(self) -> str:
        return self.userId or self.user_id or "lec-001"

    def get_title(self) -> str:
        return self.examTitle or self.exam_title or self.title or "ĐỀ THI KẾT THÚC HỌC PHẦN"

    def get_subject(self) -> str:
        return self.subjectName or self.subject or "Kinh tế vi mô"

    def get_faculty(self) -> str:
        return self.facultyName or self.faculty or self.department or "Khoa Kinh tế & Quản trị"

    def get_university(self) -> str:
        return self.universityName or self.university or self.schoolName or self.school or "ĐẠI HỌC QUỐC GIA"

    def get_duration(self) -> int:
        return self.durationMinutes or self.duration_minutes or self.duration or 60

    def get_exam_codes(self) -> List[str]:
        if self.examCodes:
            return self.examCodes
        if self.exam_codes:
            return self.exam_codes
        count = self.examCodeCount or 1
        return [str(101 + i) for i in range(count)]

    def get_question_ids(self) -> List[str]:
        ids = self.selectedQuestionIds or self.selected_question_ids or self.questionIds
        if ids:
            return ids
        if self.questions:
            return [q.get("id") for q in self.questions if q.get("id")]
        return []


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
