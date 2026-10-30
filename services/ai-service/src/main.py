import uuid
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from .generator import QuestionGenerator

app = FastAPI(title="QuizGen AI - AI Generation Service", version="1.0.0")
generator = QuestionGenerator()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RAG_SERVICE_URL = "http://rag-service:8003"
EXAM_SERVICE_URL = "http://exam-service:8005"

# ─── In-memory store (câu hỏi đã sinh, key = question id) ───────────────────
QUESTIONS_STORE: Dict[str, dict] = {}


# ─── Schemas ─────────────────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    documentId: str
    chapters: List[str]
    bloomMatrix: Dict[str, int]


class RegenerateRequest(BaseModel):
    bloomLevel: Optional[str] = None


# ─── Helper: chuẩn error response ────────────────────────────────────────────
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


# ════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {"status": "healthy", "service": "ai-service"}


@app.post("/generate-questions")
async def generate_questions(req: GenerateRequest):
    """
    Nhận documentId + chapters + bloomMatrix,
    truy vấn RAG để lấy context, gọi Gemini sinh câu hỏi.
    """
    # 1. Fetch chunks từ RAG service
    query_text = " ".join(req.chapters)
    retrieved_chunks = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            res = await client.post(
                f"{RAG_SERVICE_URL}/query-context",
                json={
                    "query": query_text,
                    "document_id": req.documentId,
                    "top_k": 8,
                },
            )
            if res.status_code == 200:
                retrieved_chunks = res.json().get("chunks", [])
        except Exception:
            # RAG service chưa sẵn sàng → dùng mock chunk
            retrieved_chunks = [
                {
                    "chunk_id": "chunk-mock-1",
                    "page_number": 1,
                    "text": "Quy luật cầu chỉ ra rằng khi giá tăng thì lượng cầu giảm.",
                }
            ]

    # 2. Gọi Gemini sinh câu hỏi
    try:
        questions = await generator.generate_questions_from_context(
            chunks=retrieved_chunks,
            bloom_matrix=req.bloomMatrix,
        )
    except Exception as e:
        error_response(500, f"Lỗi khi sinh câu hỏi AI: {str(e)}")

    # 3. Lưu vào QUESTIONS_STORE để dùng cho /regenerate-question
    for q in questions:
        QUESTIONS_STORE[q["id"]] = {**q, "documentId": req.documentId}

    return {
        "success": True,
        "totalGenerated": len(questions),
        "questions": questions,
    }


@app.post("/regenerate-question/{question_id}")
async def regenerate_question(question_id: str, req: RegenerateRequest = RegenerateRequest()):
    """
    Sinh lại 1 câu hỏi cụ thể khi giảng viên chưa ưng ý.
    """
    original = QUESTIONS_STORE.get(question_id)
    if not original:
        error_response(404, f"Không tìm thấy câu hỏi với id '{question_id}'.")

    bloom_level = req.bloomLevel or original.get("bloomLevel", "Nhận biết")
    chunk_id = original.get("sourceChunkId", "")

    # Lấy text của chunk gốc từ RAG service
    chunk_text = ""
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            res = await client.get(f"{RAG_SERVICE_URL}/chunks/{chunk_id}")
            if res.status_code == 200:
                chunk_text = res.json().get("textSnippet", "")
        except Exception:
            chunk_text = original.get("question", "")  # fallback dùng câu hỏi cũ

    # Sinh lại câu hỏi mới
    try:
        new_question = await generator.regenerate_single_question(
            original_question=original,
            chunk_text=chunk_text,
            bloom_level=bloom_level,
        )
    except Exception as e:
        error_response(500, f"Lỗi khi sinh lại câu hỏi: {str(e)}")

    # Ghi đè câu hỏi cũ trong store
    new_question["id"] = question_id
    new_question["documentId"] = original.get("documentId", "")
    QUESTIONS_STORE[question_id] = new_question

    return {
        "success": True,
        "question": new_question,
    }
