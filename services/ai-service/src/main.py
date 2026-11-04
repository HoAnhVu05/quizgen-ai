import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
import httpx

# Load .env file (both local and root directory)
try:
    from dotenv import load_dotenv
    load_dotenv()
    root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.env"))
    if os.path.exists(root_env):
        load_dotenv(root_env)
except Exception:
    pass

from .database import engine, Base, get_db, SessionLocal
from .models import AIGenerationJobDB, BloomPresetDB, GenerateRequest
from .generator import QuestionGenerator
from .cache import cache
from .auth import get_current_user_id, get_optional_user_id

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
    return {
        "status": "healthy",
        "service": "ai-service",
        "llm_engine": "gemini-1.5-flash",
        "has_api_key": bool(os.getenv("GEMINI_API_KEY"))
    }

@app.get("/presets")
def get_presets(db: Session = Depends(get_db)):
    presets = db.query(BloomPresetDB).all()
    return presets

@app.post("/generate")
@app.post("/generate-questions")
async def generate_questions(
    req: GenerateRequest,
    user_id: Optional[str] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    # Dùng user_id từ JWT nếu có, hỗ trợ fallback 'lec-001' khi Frontend đang phát triển cục bộ
    effective_user_id = user_id or "lec-001"

    # Kiểm tra Rate Limit qua Redis (Section 5 Spec: 10 lượt/phút)
    allowed, remaining = cache.check_ai_rate_limit(user_id=effective_user_id, limit=10, window_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Bạn đã vượt quá giới hạn 10 yêu cầu sinh đề / phút. Vui lòng thử lại sau giây lát."
        )

    document_id = req.get_document_id()
    bloom_matrix = req.get_bloom_matrix()
    total_req = sum(bloom_matrix.values())

    # 1. Tạo bản ghi Job trong PostgreSQL
    job_id = f"job-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    job = AIGenerationJobDB(
        id=job_id,
        user_id=effective_user_id,
        document_id=document_id,
        chapters=req.chapters,
        bloom_matrix=bloom_matrix,
        total_requested=total_req,
        status="processing",
        created_at=datetime.utcnow()
    )
    db.add(job)
    db.commit()

    # 2. Truy xuất ngữ cảnh RAG từ RAG Service
    query_text = " ".join(req.chapters) if req.chapters else "kinh tế học vi mô quy luật cung cầu"
    primary_chapter = req.chapters[0] if req.chapters else "Chương 3: Cung - Cầu và Cơ chế cân bằng giá cả thị trường"
    retrieved_chunks = []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
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
                "text": "Quy luật cầu (Law of Demand) chỉ ra rằng: trong điều kiện các yếu tố khác không đổi (ceteris paribus), khi mức giá của một hàng hóa tăng lên thì lượng cầu về hàng hóa đó sẽ giảm xuống và ngược lại."
            },
            {
                "chunk_id": "chunk-2",
                "page_number": 68,
                "text": "Độ co giãn của cầu theo giá đo lường mức độ phản ứng của lượng cầu trước sự thay đổi của giá cả. Khi cầu co giãn mạnh (|PED| > 1), việc giảm giá sẽ làm tăng tổng doanh thu."
            }
        ]

    # 3. Kích hoạt sinh câu hỏi bằng LLM Gemini hoặc Fallback ma trận chuẩn
    try:
        questions = await generator.generate_questions_from_context(
            chunks=retrieved_chunks,
            bloom_matrix=bloom_matrix,
            document_id=document_id,
            chapter_name=primary_chapter
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

@app.post("/regenerate-question/{question_id}")
@app.post("/regenerate/{question_id}")
async def regenerate_question_endpoint(
    question_id: str,
    req: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    """API Màn hình 4: Tái tạo riêng lẻ 1 câu hỏi khi giảng viên yêu cầu"""
    effective_user_id = user_id or "lec-001"
    allowed, _ = cache.check_ai_rate_limit(user_id=effective_user_id, limit=20, window_seconds=60)
    if not allowed:
        raise HTTPException(status_code=429, detail="Bạn thao tác quá nhanh. Vui lòng thử lại sau giây lát.")

    current_q = req or {}
    chunk_context = {
        "id": current_q.get("sourceChunkId") or current_q.get("source_chunk_id") or "chunk-1",
        "pageNumber": current_q.get("pageNumber", 42)
    }
    bloom_lvl = current_q.get("bloomLevel") or current_q.get("bloom_level") or "Thông hiểu"

    new_q = await generator.regenerate_single_question(
        question_id=question_id,
        current_question=current_q,
        chunk_context=chunk_context,
        bloom_level=bloom_lvl
    )
    return {
        "success": True,
        "question": new_q
    }

@app.get("/jobs/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Tra cứu trạng thái tiến trình Job sinh đề"""
    job = db.query(AIGenerationJobDB).filter(AIGenerationJobDB.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy Job {job_id}")
    return {
        "jobId": job.id,
        "status": job.status,
        "documentId": job.document_id,
        "totalRequested": job.total_requested,
        "totalGenerated": job.total_generated,
        "createdAt": job.created_at.isoformat() if job.created_at else None,
        "completedAt": job.completed_at.isoformat() if job.completed_at else None
    }
