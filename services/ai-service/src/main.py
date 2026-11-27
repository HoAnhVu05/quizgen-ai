import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import json
import re
from uuid import uuid4
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
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
from .models import (
    AIGenerationJobDB,
    BloomPresetDB,
    GenerateRequest,
    CopilotChatMessageDB,
    UserAcademicMemoryDB,
)
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

    # Lọc bỏ triệt để các chunk rác mục lục (chứa chuỗi dấu chấm .....) hoặc trang bìa xuất bản
    if retrieved_chunks:
        valid_academic_chunks = [
            c for c in retrieved_chunks
            if not re.search(r"\.{5,}", c.get("text") or c.get("text_snippet") or "")
            and not re.search(r"^\s*MỤC\s*LỤC\b", c.get("text") or c.get("text_snippet") or "", re.IGNORECASE)
        ]
        if valid_academic_chunks:
            retrieved_chunks = valid_academic_chunks

    if not retrieved_chunks:
        job.status = "failed"
        job.error_message = f"Tài liệu '{textbook_name}' chưa có dữ liệu văn bản để sinh câu hỏi."
        db.commit()
        raise HTTPException(
            status_code=400,
            detail=f"Không tìm thấy nội dung văn bản nào từ tài liệu '{textbook_name}' để sinh câu hỏi. Vui lòng kiểm tra lại tài liệu đã tải lên."
        )

    # Bổ sung danh sách hình ảnh bóc tách từ Document Service nếu các chunks chưa có
    if document_id and retrieved_chunks:
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                c_res = await client.get(f"{DOCUMENT_SERVICE_URL}/documents/{document_id}/chunks?limit=100")
                if c_res.status_code == 200:
                    raw_chunks_data = c_res.json().get("chunks", [])
                    cid_images_map = {
                        c.get("chunkId") or c.get("id"): c.get("images", [])
                        for c in raw_chunks_data
                        if c.get("images")
                    }
                    page_images_map = {
                        c.get("pageNumber") or c.get("page_number"): c.get("images", [])
                        for c in raw_chunks_data
                        if c.get("images")
                    }
                    for r_chunk in retrieved_chunks:
                        cid = r_chunk.get("chunkId") or r_chunk.get("id") or r_chunk.get("chunk_id")
                        pnum = r_chunk.get("pageNumber") or r_chunk.get("page_number")
                        imgs = cid_images_map.get(cid) or page_images_map.get(pnum, [])
                        if imgs and not r_chunk.get("images"):
                            r_chunk["images"] = imgs
                            r_chunk["associated_images"] = imgs
        except Exception as enrich_err:
            print(f"[AI-SERVICE] Bổ qua cảnh báo nạp ảnh đính kèm: {enrich_err}")

    # 3. Kích hoạt sinh câu hỏi bằng LLM Gemini hoặc Fallback ma trận chuẩn
    try:
        questions = await generator.generate_questions_from_context(
            chunks=retrieved_chunks,
            bloom_matrix=bloom_matrix,
            document_id=document_id,
            chapter_name=primary_chapter,
            textbook_name=textbook_name,
            images=req.get_images(),
            pedagogical_prompt=req.get_pedagogical_prompt(),
            domain=req.get_domain()
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

def _resolve_chat_user_id(
    user_id: Optional[str],
    x_user_email: Optional[str],
    context: Optional[Dict[str, Any]] = None,
) -> str:
    if user_id and user_id.strip():
        return user_id.strip()
    if x_user_email and x_user_email.strip():
        return x_user_email.strip().lower()
    ctx = context or {}
    if ctx.get("userEmail"):
        return str(ctx["userEmail"]).strip().lower()
    if ctx.get("userId"):
        return str(ctx["userId"]).strip()
    return "guest-copilot"


def _enrich_system_context(context: Dict[str, Any]) -> None:
    try:
        import sqlite3
        auth_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../auth-service/data/auth.db"))
        if os.path.exists(auth_db_path):
            with sqlite3.connect(auth_db_path) as a_conn:
                ac = a_conn.cursor()
                total_users = ac.execute("SELECT COUNT(*) FROM users").fetchone()[0]
                lecturers = ac.execute("SELECT COUNT(*) FROM users WHERE role='lecturer'").fetchone()[0]
                admins = ac.execute("SELECT COUNT(*) FROM users WHERE role='admin'").fetchone()[0]
                context["system_stats"] = {
                    "total_users": total_users,
                    "lecturers": lecturers,
                    "admins": admins,
                    "verified": True
                }

        docs_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../document-service/data/documents.db"))
        if os.path.exists(docs_db_path):
            with sqlite3.connect(docs_db_path) as d_conn:
                dc = d_conn.cursor()
                rows = dc.execute("SELECT id, name, total_pages FROM documents ORDER BY id ASC").fetchall()
                context["system_documents"] = [
                    {"id": r[0], "name": r[1], "totalPages": r[2]}
                    for r in rows
                ]
    except Exception as e:
        print(f"[AI-SERVICE] Warning loading system stats or documents: {e}")


def _get_user_memory_dict(db: Session, effective_user_id: str) -> Dict[str, Any]:
    mem = db.query(UserAcademicMemoryDB).filter(UserAcademicMemoryDB.user_id == effective_user_id).first()
    if not mem:
        return {}
    return {
        "userId": mem.user_id,
        "subject_areas": mem.subject_areas or [],
        "preferred_bloom_ratio": mem.preferred_bloom_ratio,
        "preferred_difficulty": mem.preferred_difficulty,
        "pedagogical_style": mem.pedagogical_style,
        "recent_edits": mem.recent_edits or [],
        "custom_notes": mem.custom_notes or [],
        "interaction_count": mem.interaction_count or 0,
        "updated_at": mem.updated_at.isoformat() if mem.updated_at else None,
    }


def _learn_from_interaction(
    db: Session,
    effective_user_id: str,
    message: str,
    context: Dict[str, Any],
    actions: Optional[List[Dict[str, Any]]] = None,
) -> None:
    try:
        mem = db.query(UserAcademicMemoryDB).filter(UserAcademicMemoryDB.user_id == effective_user_id).first()
        if not mem:
            mem = UserAcademicMemoryDB(
                user_id=effective_user_id,
                subject_areas=[],
                recent_edits=[],
                custom_notes=[],
                interaction_count=0,
            )
            db.add(mem)

        mem.interaction_count = (mem.interaction_count or 0) + 1

        doc_name = context.get("documentName") or context.get("document_name")
        if doc_name and isinstance(doc_name, str):
            clean_doc = re.sub(r"\.(pdf|docx?|txt)$", "", doc_name.strip(), flags=re.IGNORECASE)
            subjects = list(mem.subject_areas or [])
            if clean_doc and clean_doc not in subjects:
                subjects.append(clean_doc)
                mem.subject_areas = subjects[-10:]

        clean_msg = (message or "").strip()
        pref_triggers = [
            "tôi dạy", "em dạy", "mình dạy", "ưu tiên", "phong cách", "luôn dùng",
            "không dùng", "thích câu hỏi", "giải thích ngắn", "giải thích chi tiết",
            "tập trung vào", "chú trọng", "mức độ khó"
        ]
        if clean_msg and len(clean_msg) <= 240 and any(t in clean_msg.lower() for t in pref_triggers):
            notes = list(mem.custom_notes or [])
            if clean_msg not in notes:
                notes.append(clean_msg)
                mem.custom_notes = notes[-15:]

        for act in (actions or []):
            atype = act.get("type")
            adata = act.get("data") or {}
            if atype == "exam_blueprint" and isinstance(adata.get("bloomRatio"), dict):
                mem.preferred_bloom_ratio = adata["bloomRatio"]
            elif atype == "patch_question" and adata.get("diffSummary"):
                edits = list(mem.recent_edits or [])
                summary = str(adata["diffSummary"]).strip()
                if summary and summary not in edits:
                    edits.append(summary)
                    mem.recent_edits = edits[-10:]

        mem.updated_at = datetime.utcnow()
        db.commit()
    except Exception as mem_err:
        db.rollback()
        print(f"[AI-SERVICE] Memory learn warning: {mem_err}")


def _compact_attachments(attachments: Optional[List[Dict[str, Any]]]) -> Optional[List[Dict[str, Any]]]:
    if not attachments:
        return None
    compact = []
    for att in attachments[:5]:
        item = {
            "name": att.get("name"),
            "mimeType": att.get("mimeType") or att.get("type"),
            "size": att.get("size"),
        }
        # Lưu preview ảnh nhỏ (<150KB) để đồng bộ giữa thiết bị, tránh phình DB
        data_val = att.get("data") or ""
        if isinstance(data_val, str) and data_val.startswith("data:image/") and len(data_val) < 200000:
            item["data"] = data_val
        compact.append(item)
    return compact


def _save_chat_turn(
    db: Session,
    effective_user_id: str,
    message: str,
    attachments: Optional[List[Dict[str, Any]]],
    reply: str,
    actions: Optional[List[Dict[str, Any]]],
    suggested_actions: Optional[List[str]],
    rag_sources: Optional[List[Dict[str, Any]]],
    context: Dict[str, Any],
) -> None:
    try:
        now = datetime.utcnow()
        u_msg = CopilotChatMessageDB(
            id=f"usr-{uuid4().hex[:12]}",
            user_id=effective_user_id,
            role="user",
            content=message or "(Đã gửi tệp đính kèm)",
            attachments=_compact_attachments(attachments),
            screen=context.get("currentScreen"),
            document_id=context.get("documentId") or context.get("document_id"),
            created_at=now,
        )
        b_msg = CopilotChatMessageDB(
            id=f"bot-{uuid4().hex[:12]}",
            user_id=effective_user_id,
            role="assistant",
            content=reply,
            actions=actions or [],
            suggested_actions=suggested_actions or [],
            rag_sources=rag_sources or [],
            screen=context.get("currentScreen"),
            document_id=context.get("documentId") or context.get("document_id"),
            created_at=now + timedelta(milliseconds=1),
        )
        db.add(u_msg)
        db.add(b_msg)
        db.commit()
    except Exception as save_err:
        db.rollback()
        print(f"[AI-SERVICE] Warning saving chat turn: {save_err}")


@app.post("/chat")
@app.post("/ai/chat")
async def chat_copilot_endpoint(
    req: Dict[str, Any],
    user_id: Optional[str] = Depends(get_optional_user_id),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db),
):
    """API QuizGen Copilot: Trợ lý hội thoại học thuật AI (Multi-turn, Multimodal, Dynamic Memory, Structured Actions)"""
    message = str(req.get("message") or "").strip()
    attachments = req.get("attachments") or []
    if not message and not attachments:
        raise HTTPException(status_code=400, detail="Nội dung tin nhắn hoặc tệp đính kèm không được để trống.")

    history = req.get("history") or []
    context = req.get("context") or {}
    effective_user_id = _resolve_chat_user_id(user_id, x_user_email, context)
    context["userId"] = effective_user_id
    _enrich_system_context(context)

    academic_memory = _get_user_memory_dict(db, effective_user_id)
    result = await generator.chat_with_copilot(
        message=message,
        history=history,
        context=context,
        attachments=attachments,
        academic_memory=academic_memory,
    )

    reply_text = result.get("reply", "")
    actions = result.get("actions", [])
    suggestions = result.get("suggestedActions", [])
    rag_sources = result.get("ragSources", [])

    _save_chat_turn(db, effective_user_id, message, attachments, reply_text, actions, suggestions, rag_sources, context)
    _learn_from_interaction(db, effective_user_id, message, context, actions)

    return {
        "success": True,
        "reply": reply_text,
        "actions": actions,
        "suggestedActions": suggestions,
        "ragSources": rag_sources,
    }


@app.post("/chat/stream")
@app.post("/ai/chat/stream")
async def chat_copilot_stream_endpoint(
    req: Dict[str, Any],
    user_id: Optional[str] = Depends(get_optional_user_id),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db),
):
    """API Streaming SSE cho QuizGen Copilot: Trả lời theo từng token thời gian thực."""
    message = str(req.get("message") or "").strip()
    attachments = req.get("attachments") or []
    if not message and not attachments:
        raise HTTPException(status_code=400, detail="Nội dung tin nhắn hoặc tệp đính kèm không được để trống.")

    history = req.get("history") or []
    context = req.get("context") or {}
    effective_user_id = _resolve_chat_user_id(user_id, x_user_email, context)
    context["userId"] = effective_user_id
    _enrich_system_context(context)
    academic_memory = _get_user_memory_dict(db, effective_user_id)

    async def event_generator():
        final_event = None
        async for ev in generator.chat_with_copilot_stream(
            message=message,
            history=history,
            context=context,
            attachments=attachments,
            academic_memory=academic_memory,
        ):
            if ev.get("type") == "done":
                final_event = ev
            yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"

        if final_event:
            _save_chat_turn(
                db,
                effective_user_id,
                message,
                attachments,
                final_event.get("reply", ""),
                final_event.get("actions", []),
                final_event.get("suggestedActions", []),
                final_event.get("ragSources", []),
                context,
            )
            _learn_from_interaction(
                db,
                effective_user_id,
                message,
                context,
                final_event.get("actions", []),
            )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/chat/history")
@app.get("/ai/chat/history")
def get_copilot_chat_history(
    limit: int = 100,
    user_id: Optional[str] = Depends(get_optional_user_id),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db),
):
    """Lấy lịch sử hội thoại Quanta đã đồng bộ trên CSDL backend."""
    effective_user_id = _resolve_chat_user_id(user_id, x_user_email)
    rows = (
        db.query(CopilotChatMessageDB)
        .filter(CopilotChatMessageDB.user_id == effective_user_id)
        .order_by(CopilotChatMessageDB.created_at.desc())
        .limit(min(max(1, limit), 200))
        .all()
    )
    rows.reverse()
    return {
        "success": True,
        "userId": effective_user_id,
        "messages": [
            {
                "id": r.id,
                "role": r.role,
                "content": r.content,
                "attachments": r.attachments or [],
                "actions": r.actions or [],
                "suggestedActions": r.suggested_actions or [],
                "ragSources": r.rag_sources or [],
                "timestamp": r.created_at.strftime("%H:%M") if r.created_at else "",
                "createdAt": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@app.delete("/chat/history")
@app.delete("/ai/chat/history")
def clear_copilot_chat_history(
    user_id: Optional[str] = Depends(get_optional_user_id),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db),
):
    """Xóa lịch sử hội thoại Quanta của người dùng trên CSDL backend."""
    effective_user_id = _resolve_chat_user_id(user_id, x_user_email)
    deleted = (
        db.query(CopilotChatMessageDB)
        .filter(CopilotChatMessageDB.user_id == effective_user_id)
        .delete()
    )
    db.commit()
    return {"success": True, "deleted": deleted}


@app.get("/chat/memory")
@app.get("/ai/chat/memory")
def get_copilot_memory(
    user_id: Optional[str] = Depends(get_optional_user_id),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db),
):
    """Xem hồ sơ trí nhớ học thuật động của giảng viên."""
    effective_user_id = _resolve_chat_user_id(user_id, x_user_email)
    return {"success": True, "memory": _get_user_memory_dict(db, effective_user_id)}


@app.put("/chat/memory")
@app.put("/ai/chat/memory")
def update_copilot_memory(
    req: Dict[str, Any],
    user_id: Optional[str] = Depends(get_optional_user_id),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db),
):
    """Cập nhật hoặc bổ sung ghi chú/gu ra đề cho hồ sơ trí nhớ học thuật."""
    effective_user_id = _resolve_chat_user_id(user_id, x_user_email)
    mem = db.query(UserAcademicMemoryDB).filter(UserAcademicMemoryDB.user_id == effective_user_id).first()
    if not mem:
        mem = UserAcademicMemoryDB(user_id=effective_user_id, subject_areas=[], recent_edits=[], custom_notes=[])
        db.add(mem)
    if "subject_areas" in req and isinstance(req["subject_areas"], list):
        mem.subject_areas = req["subject_areas"][:15]
    if "preferred_bloom_ratio" in req:
        mem.preferred_bloom_ratio = req["preferred_bloom_ratio"]
    if "preferred_difficulty" in req:
        mem.preferred_difficulty = req["preferred_difficulty"]
    if "pedagogical_style" in req:
        mem.pedagogical_style = req["pedagogical_style"]
    if "custom_notes" in req and isinstance(req["custom_notes"], list):
        mem.custom_notes = req["custom_notes"][:20]
    mem.updated_at = datetime.utcnow()
    db.commit()
    return {"success": True, "memory": _get_user_memory_dict(db, effective_user_id)}


@app.delete("/chat/memory")
@app.delete("/ai/chat/memory")
def reset_copilot_memory(
    user_id: Optional[str] = Depends(get_optional_user_id),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db),
):
    """Đặt lại hồ sơ trí nhớ học thuật về mặc định."""
    effective_user_id = _resolve_chat_user_id(user_id, x_user_email)
    db.query(UserAcademicMemoryDB).filter(UserAcademicMemoryDB.user_id == effective_user_id).delete()
    db.commit()
    return {"success": True}
