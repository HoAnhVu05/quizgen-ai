from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
from .generator import QuestionGenerator

app = FastAPI(title="QuizGen AI - AI Generation Service", version="1.0.0")
generator = QuestionGenerator()

RAG_SERVICE_URL = "http://rag-service:8003"

class GenerateRequest(BaseModel):
    document_id: str
    chapters: List[str]
    bloom_matrix: Dict[str, int]

@app.get("/health")
def health():
    return {"status": "healthy", "service": "ai-service"}

@app.post("/generate-questions")
async def generate_questions(req: GenerateRequest):
    # 1. Fetch relevant chunks from RAG service
    query_text = " ".join(req.chapters)
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            res = await client.post(
                f"{RAG_SERVICE_URL}/query-context",
                json={
                    "query": query_text,
                    "document_id": req.document_id,
                    "top_k": 8
                }
            )
            retrieved_chunks = res.json().get("chunks", []) if res.status_code == 200 else []
        except Exception:
            # Fallback mock chunks if RAG service is running standalone
            retrieved_chunks = [
                {
                    "chunk_id": "chunk-1",
                    "page_number": 42,
                    "text": "Quy luật cầu (Law of Demand) chỉ ra rằng: khi giá tăng thì lượng cầu giảm và ngược lại."
                }
            ]

    # 2. Call LLM generator with Bloom taxonomy
    try:
        questions = await generator.generate_questions_from_context(
            chunks=retrieved_chunks,
            bloom_matrix=req.bloom_matrix
        )
        return {
            "document_id": req.document_id,
            "total_generated": len(questions),
            "questions": questions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi sinh câu hỏi AI: {str(e)}")
