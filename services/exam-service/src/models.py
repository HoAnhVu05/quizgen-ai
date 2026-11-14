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
    image_url = Column(Text, nullable=True) # [SCRUM-90] Đường dẫn ảnh sơ đồ / đồ thị hoặc base64 data URI
    has_formula = Column(Boolean, default=False, nullable=False) # [SCRUM-90] Cờ câu hỏi có công thức LaTeX
    image_caption = Column(Text, nullable=True) # [SCRUM-90] Chú thích hình vẽ
    created_by = Column(String(50), default="lecturer")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExamDB(Base):
    __tablename__ = "exams"
    __table_args__ = {"schema": SCHEMA_NAME} if SCHEMA_NAME else ()

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, default="lecturer", index=True)
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
    user_id = Column(String(50), nullable=False, default="lecturer", index=True)
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
    """
    [SCRUM-58] Bảng ghi nhận lịch sử khảo thí và toàn bộ vết chỉnh sửa câu hỏi của giảng viên
    """
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
    action = Column(String(50), nullable=False, index=True) # inline_edit, approve, reject, status_change, regenerate, update_bloom
    previous_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    change_summary = Column(Text, nullable=True)
    field_changes = Column(JSON, nullable=True)
    edit_reason = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    performed_at = Column(DateTime, default=datetime.utcnow, index=True)

    question = relationship("QuestionDB")


# ====================================================================
# PYDANTIC SCHEMAS
# ====================================================================
class OptionSchema(BaseModel):
    id: str
    label: str
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
    created_by: Optional[str] = None
    image_url: Optional[str] = None
    imageUrl: Optional[str] = None
    has_formula: bool = False
    hasFormula: Optional[bool] = None
    image_caption: Optional[str] = None
    imageCaption: Optional[str] = None

    def get_image_url(self) -> Optional[str]:
        return self.imageUrl or self.image_url

    def get_has_formula(self) -> bool:
        if self.hasFormula is not None:
            return self.hasFormula
        return self.has_formula

    def get_image_caption(self) -> Optional[str]:
        return self.imageCaption or self.image_caption

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
    lecturerId: Optional[str] = None
    lecturer_id: Optional[str] = None
    editReason: Optional[str] = None
    edit_reason: Optional[str] = None
    action: Optional[str] = None
    image_url: Optional[str] = None
    imageUrl: Optional[str] = None
    has_formula: Optional[bool] = None
    hasFormula: Optional[bool] = None
    image_caption: Optional[str] = None
    imageCaption: Optional[str] = None

    def get_question_text(self) -> Optional[str]:
        return self.questionText or self.question or self.question_text

    def get_text(self) -> Optional[str]:
        return self.get_question_text()

    def get_correct_answer_id(self) -> Optional[str]:
        return self.correctAnswerId or self.correct_answer_id

    def get_answer_id(self) -> Optional[str]:
        return self.get_correct_answer_id()

    def get_bloom_level(self) -> Optional[str]:
        return self.bloomLevel or self.bloom_level

    def get_bloom(self) -> Optional[str]:
        return self.get_bloom_level()

    def get_confidence_score(self) -> Optional[int]:
        return self.confidenceScore or self.confidence_score

    def get_lecturer_id(self) -> Optional[str]:
        return self.lecturerId or self.lecturer_id

    def get_edit_reason(self) -> Optional[str]:
        return self.editReason or self.edit_reason


class QuestionReviewRequest(BaseModel):
    action: str # approve, reject, inline_edit, regenerate, update_bloom
    lecturerId: Optional[str] = None
    lecturer_id: Optional[str] = None
    editReason: Optional[str] = None
    edit_reason: Optional[str] = None
    comment: Optional[str] = None
    bloomLevel: Optional[str] = None
    bloom_level: Optional[str] = None


class QuestionStatusUpdate(BaseModel):
    status: str # approved | rejected | pending
    lecturerId: Optional[str] = None
    lecturer_id: Optional[str] = None
    reason: Optional[str] = None


class BatchApproveRequest(BaseModel):
    questionIds: Optional[List[str]] = None
    question_ids: Optional[List[str]] = None
    lecturerId: Optional[str] = None

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


class QuestionAuditLogResponse(BaseModel):
    id: str
    questionId: str
    lecturerId: str
    action: str
    changeSummary: Optional[str] = None
    fieldChanges: Optional[Dict[str, Any]] = None
    editReason: Optional[str] = None
    previousState: Optional[Dict[str, Any]] = None
    newState: Optional[Dict[str, Any]] = None
    ipAddress: Optional[str] = None
    performedAt: Optional[str] = None

    class Config:
        from_attributes = True


class BloomLevelStat(BaseModel):
    level: str
    english: str
    count: int
    percentage: float
    targetPercentage: float
    deviation: float
    color: str
    badgeColor: str


class BloomTaxonomyResponse(BaseModel):
    totalQuestions: int
    filter: Dict[str, Any]
    distribution: Dict[str, BloomLevelStat]
    summary: Dict[str, Any]
    pedagogicalRecommendation: str
    generatedAt: str


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
    includeOmrSheet: bool = True
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
    config: Optional[Dict[str, Any]] = None
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
    includeOmrSheet: Optional[bool] = True
    include_omr_sheet: Optional[bool] = None
    format: Optional[str] = "docx" # docx | pdf | qti | zip | bundle
    baseExamCode: Optional[int] = 101
    base_exam_code: Optional[int] = None
    questions: Optional[List[Dict[str, Any]]] = None

    def get_university(self) -> str:
        cfg = self.config if isinstance(self.config, dict) else {}
        return (
            self.universityName or self.university or self.schoolName or self.school or
            cfg.get("universityName") or cfg.get("university") or cfg.get("schoolName") or cfg.get("school") or
            "TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM"
        )

    def get_faculty(self) -> str:
        cfg = self.config if isinstance(self.config, dict) else {}
        return (
            self.facultyName or self.faculty or self.department or
            cfg.get("facultyName") or cfg.get("faculty") or cfg.get("department") or
            "KHOA CÔNG NGHỆ THÔNG TIN"
        )

    def get_title(self) -> str:
        cfg = self.config if isinstance(self.config, dict) else {}
        return self.examTitle or self.exam_title or self.title or cfg.get("examTitle") or cfg.get("title") or "ĐỀ THI KẾT THÚC HỌC PHẦN"

    def get_subject(self) -> str:
        cfg = self.config if isinstance(self.config, dict) else {}
        return self.subjectName or self.subject or cfg.get("subjectName") or cfg.get("subject") or "Kinh tế vi mô"

    def get_code(self) -> str:
        cfg = self.config if isinstance(self.config, dict) else {}
        return str(self.examCode or self.exam_code or self.code or cfg.get("examCode") or cfg.get("code") or "101")

    def get_base_code(self) -> int:
        cfg = self.config if isinstance(self.config, dict) else {}
        if self.base_exam_code is not None:
            return self.base_exam_code
        if self.baseExamCode is not None:
            return self.baseExamCode
        if cfg.get("baseExamCode") is not None:
            return int(cfg["baseExamCode"])
        code_str = self.get_code()
        return int(code_str) if code_str.isdigit() else 101

    def get_exam_code_count(self) -> int:
        cfg = self.config if isinstance(self.config, dict) else {}
        return self.exam_code_count or self.examCodeCount or cfg.get("examCodeCount") or 4

    def get_duration(self) -> int:
        cfg = self.config if isinstance(self.config, dict) else {}
        return self.durationMinutes or self.duration_minutes or self.duration or cfg.get("durationMinutes") or cfg.get("duration") or 60

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
        if self.includeOmrSheet is not None:
            return self.includeOmrSheet
        return True


class ExportOmrRequest(BaseModel):
    universityName: Optional[str] = None
    university: Optional[str] = None
    facultyName: Optional[str] = None
    faculty: Optional[str] = None
    subjectName: Optional[str] = None
    subject: Optional[str] = None
    examCode: Optional[str] = None
    exam_code: Optional[str] = None

    def get_university(self) -> str:
        return self.universityName or self.university or "ĐẠI HỌC QUỐC GIA"

    def get_faculty(self) -> str:
        return self.facultyName or self.faculty or "Khoa Kinh tế & Quản trị"

    def get_subject(self) -> str:
        return self.subjectName or self.subject or "Kinh tế vi mô"

    def get_code(self) -> str:
        return str(self.examCode or self.exam_code or "101")


class ExportBundleRequest(BaseModel):
    selectedQuestionIds: Optional[List[str]] = None
    selected_question_ids: Optional[List[str]] = None
    universityName: Optional[str] = None
    university: Optional[str] = None
    facultyName: Optional[str] = None
    faculty: Optional[str] = None
    examTitle: Optional[str] = None
    exam_title: Optional[str] = None
    title: Optional[str] = None
    subjectName: Optional[str] = None
    subject: Optional[str] = None
    durationMinutes: Optional[int] = None
    duration_minutes: Optional[int] = None
    duration: Optional[int] = None
    examCodeCount: Optional[int] = 4
    exam_code_count: Optional[int] = None
    baseExamCode: Optional[int] = 101
    base_exam_code: Optional[int] = None
    shuffleQuestions: Optional[bool] = True
    shuffleOptions: Optional[bool] = True
    includeAnswerKey: Optional[bool] = True
    includeExplanation: Optional[bool] = True
    includeOmrSheet: Optional[bool] = True
    questions: Optional[List[Dict[str, Any]]] = None

    def get_university(self) -> str:
        return self.universityName or self.university or "ĐẠI HỌC QUỐC GIA"

    def get_faculty(self) -> str:
        return self.facultyName or self.faculty or "Khoa Kinh tế & Quản trị"

    def get_title(self) -> str:
        return self.examTitle or self.exam_title or self.title or "ĐỀ THI KẾT THÚC HỌC PHẦN"

    def get_subject(self) -> str:
        return self.subjectName or self.subject or "Kinh tế vi mô"

    def get_duration(self) -> int:
        return self.durationMinutes or self.duration_minutes or self.duration or 60

    def get_exam_code_count(self) -> int:
        return self.exam_code_count or self.examCodeCount or 4

    def get_base_code(self) -> int:
        return self.base_exam_code or self.baseExamCode or 101


class ExportQtiRequest(BaseModel):
    title: str = "Quiz Canvas LMS"
    format: Optional[str] = "zip" # zip (IMS QTI 2.1 Content Package) hoặc xml (Moodle XML)
    questions: Optional[List[Dict[str, Any]]] = None
    selectedQuestionIds: Optional[List[str]] = None


class CreateExamRecordRequest(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
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
        return self.userId or self.user_id

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
