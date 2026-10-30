import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
import httpx

from .database import engine, Base, get_db, SessionLocal
from .models import AIGenerationJobDB, BloomPresetDB, GenerateRequest
from .generator import QuestionGenerator

app = FastAPI(title="QuizGen AI - AI Generation Service", version="1.0.0")
generator = QuestionGenerator()

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://rag-service:8003")

@app.on_event("startup")
def startup_db():
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        # Seed default Bloom presets
        existing = db.execute(select(BloomPresetDB).filter_by(id="preset-giua-ky")).scalar_one_or_none()
        if not existing:
            presets = [
                BloomPresetDB(id="preset-giua-ky", name="Đề thi Giữa kỳ", description="40% Nhận biết, 40% Thông hiểu, 20% Vận dụng", nhan_biet_pct=40, thong_hieu_pct=40, van_dung_pct=20, phan_tich_pct=0, is_default=True),
                BloomPresetDB(id="preset-cuoi-ky", name="Đề thi Cuối kỳ", description="30% Nhận biết, 40% Thông hiểu, 20% Vận dụng, 10% Phân tích", nhan_biet_pct=30, thong_hieu_pct=40, van_dung_pct=20, phan_tich_pct=10, is_default=False),
                BloomPresetDB(id="preset-quiz-15p", name="Kiểm tra 15 phút", description="70% Nhận biết, 30% Thông hiểu", nhan_biet_pct=70, thong_hieu_pct=30, van_dung_pct=0, phan_tich_pct=0, is_default=False),
            ]
            db.add_all(presets)
            db.commit()
        db.close()
    except Exception as e:
        print(f"[AI-SERVICE] DB Startup Warning: {e}")

@app.get("/health")
def health():
    return {"status": "healthy", "service": "ai-service"}

@app.get("/presets")
def get_presets(db: Session = Depends(get_db)):
    presets = db.query(BloomPresetDB).all()
    return presets

@app.post("/generate")
@app.post("/generate-questions")
async def generate_questions(req: GenerateRequest, db: Session = Depends(get_db)):
    document_id = req.get_document_id()
    bloom_matrix = req.get_bloom_matrix()
    total_req = sum(bloom_matrix.values())

    # 1. Tạo bản ghi Job trong PostgreSQL
    job_id = f"job-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    job = AIGenerationJobDB(
        id=job_id,
        user_id="lec-001",
        document_id=document_id,
        chapters=req.chapters,
        bloom_matrix=bloom_matrix,
        total_requested=total_req,
        status="processing",
        created_at=datetime.utcnow()
    )
    db.add(job)
    db.commit()

    # 2. Truy xuất ngữ cảnh RAG
    query_text = " ".join(req.chapters)
    retrieved_chunks = []
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{RAG_SERVICE_URL}/query-context",
                json={
                    "query": query_text,
                    "document_id": document_id,
                    "top_k": 8
                }
            )
            if res.status_code == 200:
                retrieved_chunks = res.json().get("chunks", [])
    except Exception:
        retrieved_chunks = [
            {
                "chunk_id": "chunk-1",
                "page_number": 42,
                "text": "Quy luật cầu (Law of Demand) chỉ ra rằng: khi giá tăng thì lượng cầu giảm và ngược lại."
            }
        ]

    # 3. Kích hoạt sinh câu hỏi bằng LLM
    try:
        questions = await generator.generate_questions_from_context(
            chunks=retrieved_chunks,
            bloom_matrix=bloom_matrix
        )

        # Cập nhật kết quả Job vào DB
        job.status = "completed"
        job.total_generated = len(questions)
        job.completed_at = datetime.utcnow()
        db.commit()

        return {
            "success": True,
            "jobId": job_id,
            "document_id": document_id,
            "documentId": document_id,
            "totalGenerated": len(questions),
            "questions": questions
        }
    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Lỗi khi sinh câu hỏi AI: {str(e)}")
