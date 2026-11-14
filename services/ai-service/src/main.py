import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

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

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://127.0.0.1:8003")
DOCUMENT_SERVICE_URL = os.getenv("DOCUMENT_SERVICE_URL", "http://127.0.0.1:8002")

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
        "llm_engine": getattr(generator, "model_name", "gemini-2.5-flash"),
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

    # Kiểm tra Rate Limit qua Redis (Section 5 Spec)
    rate_limit_max = int(os.getenv("AI_RATE_LIMIT_PER_MINUTE", "10"))
    allowed, remaining = cache.check_ai_rate_limit(user_id=effective_user_id, limit=rate_limit_max, window_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Bạn đã vượt quá giới hạn {rate_limit_max} yêu cầu sinh đề / phút. Vui lòng thử lại sau giây lát.",
            headers={
                "X-RateLimit-Limit": str(rate_limit_max),
                "X-RateLimit-Remaining": "0",
                "Retry-After": "60"
            }
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

    # 2. Lấy tên giáo trình thực tế từ CSDL
    from sqlalchemy import text
    textbook_name = getattr(req, "document_name", None) or getattr(req, "documentName", None) or ""
    if not textbook_name:
        try:
            doc_row = db.execute(text("SELECT name FROM documents.documents WHERE id = :did"), {"did": document_id}).fetchone()
            if doc_row and doc_row[0]:
                textbook_name = doc_row[0]
        except Exception:
            pass
    if not textbook_name:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                d_res = await client.get(f"{DOCUMENT_SERVICE_URL}/documents/{document_id}")
                if d_res.status_code == 200:
                    textbook_name = d_res.json().get("name", "")
        except Exception:
            pass
    if not textbook_name:
        textbook_name = f"Tài liệu #{document_id}"

    query_text = " ".join(req.chapters) if req.chapters else (textbook_name or "kiến thức học thuật")
    primary_chapter = req.chapters[0] if req.chapters else "Nội dung trích xuất"
    retrieved_chunks = []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{RAG_SERVICE_URL}/query-context",
                json={
                    "query": query_text,
                    "document_id": document_id,
                    "chapters": req.chapters,
                    "top_k": 10
                }
            )
            if res.status_code == 200:
                retrieved_chunks = res.json().get("chunks", [])
    except Exception as e:
        print(f"[AI-SERVICE] Cảnh báo kết nối RAG Service: {e}")

    if not retrieved_chunks:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                c_res = await client.get(f"{DOCUMENT_SERVICE_URL}/documents/{document_id}/chunks?limit=50")
                if c_res.status_code == 200:
                    raw_chunks = c_res.json().get("chunks", [])
                    if req.chapters:
                        matched = [c for c in raw_chunks if any(ch.lower() in (c.get("chapter") or "").lower() for ch in req.chapters)]
                        retrieved_chunks = matched if matched else raw_chunks
                    else:
                        retrieved_chunks = raw_chunks
        except Exception as e:
            print(f"[AI-SERVICE] Cảnh báo kết nối Document Service: {e}")

    if not retrieved_chunks:
        job.status = "failed"
        job.error_message = f"Tài liệu '{textbook_name}' chưa có dữ liệu văn bản để sinh câu hỏi."
        db.commit()
        raise HTTPException(
            status_code=400,
            detail=f"Không tìm thấy nội dung văn bản nào từ tài liệu '{textbook_name}' để sinh câu hỏi. Vui lòng kiểm tra lại tài liệu đã tải lên."
        )

    # 3. Kích hoạt sinh câu hỏi bằng LLM Gemini hoặc Fallback ma trận chuẩn
    try:
        questions = await generator.generate_questions_from_context(
            chunks=retrieved_chunks,
            bloom_matrix=bloom_matrix,
            document_id=document_id,
            chapter_name=primary_chapter,
            textbook_name=textbook_name,
            images=req.get_images()
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
            "questions": questions,
            "rateLimit": {
                "limit": rate_limit_max,
                "remaining": remaining
            }
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

    img_ctx = current_q.get("imageContext") or current_q.get("image_context")
    if not img_ctx and (current_q.get("hasImage") or current_q.get("has_image")):
        img_ctx = {
            "url": current_q.get("imageUrl") or current_q.get("image_url"),
            "caption": current_q.get("imageCaption") or current_q.get("image_caption")
        }

    new_q = await generator.regenerate_single_question(
        question_id=question_id,
        current_question=current_q,
        chunk_context=chunk_context,
        bloom_level=bloom_lvl,
        image_context=img_ctx
    )
    return {
        "success": True,
        "question": new_q
    }

@app.get("/history")
@app.get("/jobs")
def get_generation_history(
    limit: int = 30,
    user_id: Optional[str] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    """Tra cứu danh sách lịch sử các đợt sinh câu hỏi AI"""
    query = db.query(AIGenerationJobDB)
    if user_id and user_id not in ["lec-001", "usr-adm-quizgen"]:
        query = query.filter(AIGenerationJobDB.user_id == user_id)
    jobs = query.order_by(AIGenerationJobDB.created_at.desc()).limit(limit).all()
    return [
        {
            "id": job.id,
            "jobId": job.id,
            "userId": job.user_id,
            "documentId": job.document_id,
            "chapters": job.chapters or [],
            "bloomMatrix": job.bloom_matrix or {},
            "totalRequested": job.total_requested,
            "totalGenerated": job.total_generated,
            "status": job.status,
            "errorMessage": job.error_message,
            "createdAt": job.created_at.isoformat() if job.created_at else None,
            "completedAt": job.completed_at.isoformat() if job.completed_at else None,
        }
        for job in jobs
    ]

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
