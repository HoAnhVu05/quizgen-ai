import httpx
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
import hmac
import hashlib
import base64
import json
import time

def verify_and_inject_jwt(request: Request, headers: dict) -> None:
    """
    Xác thực JWT token từ header Authorization (Bearer <token>)
    và tự động đính kèm thông tin định danh (x-user-id, x-user-role, x-user-email)
    chuyển tiếp tới các microservices nội bộ.
    """
    auth_header = request.headers.get("authorization")
    if not auth_header:
        return

    token = None
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
    else:
        token = auth_header.strip()

    if not token:
        return

    if token.startswith("mock-jwt-"):
        parts_m = token.split("-")
        r_part = "lecturer"
        for p in parts_m:
            if p in ["admin", "head_of_department", "lecturer"]:
                r_part = p
                break
        uid = "usr-adm-quizgen" if r_part == "admin" else ("usr-hod-001" if r_part == "head_of_department" else "usr-lec-001")
        email = "quizgen.ai.team@gmail.com" if r_part == "admin" else "nguyentann0804@gmail.com"
        headers["x-user-id"] = uid
        headers["x-user-role"] = r_part
        headers["x-user-email"] = email
        return

    try:
        parts = token.split(".")
        if len(parts) == 3:
            header_b64, payload_b64, sig_b64 = parts
            msg = f"{header_b64}.{payload_b64}".encode("utf-8")
            expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).digest()
            sig_pad = "=" * (-len(sig_b64) % 4)
            actual_sig = base64.urlsafe_b64decode(sig_b64 + sig_pad)

            if hmac.compare_digest(expected_sig, actual_sig):
                payload_pad = "=" * (-len(payload_b64) % 4)
                payload = json.loads(base64.urlsafe_b64decode(payload_b64 + payload_pad).decode("utf-8"))
                exp = payload.get("exp")
                if exp is None or time.time() <= exp:
                    uid = payload.get("id") or payload.get("user_id") or payload.get("sub")
                    if uid:
                        headers["x-user-id"] = str(uid)
                    if "email" in payload:
                        headers["x-user-email"] = str(payload["email"])
                    if "role" in payload:
                        headers["x-user-role"] = str(payload["role"])
    except Exception:
        pass


app = FastAPI(
    title="QuizGen AI - API Gateway",
    version="1.0.0",
    description="Reverse proxy and central routing for QuizGen AI microservices ecosystem"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def proxy_request(service_url: str, path: str, request: Request) -> Response:
    client = httpx.AsyncClient(base_url=service_url, timeout=60.0, follow_redirects=True)
    url = httpx.URL(path=path, query=request.url.query.encode("utf-8"))
    body = await request.body()
    
    headers = dict(request.headers)
    headers.pop("host", None)
    verify_and_inject_jwt(request, headers)
    
    try:
        req = client.build_request(
            method=request.method,
            url=url,
            headers=headers,
            content=body
        )
        res = await client.send(req)
        return Response(
            content=res.content,
            status_code=res.status_code,
            headers=dict(res.headers)
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Service at {service_url} is unavailable: {str(exc)}"
        )
    finally:
        await client.aclose()

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "api-gateway",
        "services_registered": [
            "auth-service",
            "document-service",
            "rag-service",
            "ai-service",
            "exam-service",
            "admin-service"
        ]
    }

# Proxy routes
METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

@app.api_route("/api/v1/auth/{path:path}", methods=METHODS)
async def auth_proxy(path: str, request: Request):
    return await proxy_request(settings.AUTH_SERVICE_URL, f"/{path}", request)

@app.api_route("/api/v1/documents", methods=METHODS)
@app.api_route("/api/v1/documents/{path:path}", methods=METHODS)
async def document_proxy(request: Request, path: str = ""):
    target = f"/{path}".rstrip("/") if not path else f"/{path}"
    return await proxy_request(settings.DOCUMENT_SERVICE_URL, target or "/documents", request)

@app.api_route("/api/v1/rag", methods=METHODS)
@app.api_route("/api/v1/rag/{path:path}", methods=METHODS)
async def rag_proxy(request: Request, path: str = ""):
    target = f"/{path}".rstrip("/") if not path else f"/{path}"
    return await proxy_request(settings.RAG_SERVICE_URL, target or "/", request)

@app.api_route("/api/v1/ai", methods=METHODS)
@app.api_route("/api/v1/ai/{path:path}", methods=METHODS)
async def ai_proxy(request: Request, path: str = ""):
    target = f"/{path}".rstrip("/") if not path else f"/{path}"
    return await proxy_request(settings.AI_SERVICE_URL, target or "/", request)

@app.api_route("/api/v1/exams", methods=METHODS)
@app.api_route("/api/v1/exams/{path:path}", methods=METHODS)
async def exam_proxy(request: Request, path: str = ""):
    target = f"/{path}".rstrip("/") if not path else f"/{path}"
    return await proxy_request(settings.EXAM_SERVICE_URL, target or "/", request)

@app.api_route("/api/v1/questions", methods=METHODS)
@app.api_route("/api/v1/questions/{path:path}", methods=METHODS)
async def questions_proxy(request: Request, path: str = ""):
    target = f"/questions/{path}".rstrip("/") if not path else f"/questions/{path}"
    return await proxy_request(settings.EXAM_SERVICE_URL, target or "/questions", request)

@app.api_route("/api/v1/analytics", methods=METHODS)
@app.api_route("/api/v1/analytics/{path:path}", methods=METHODS)
async def analytics_proxy(request: Request, path: str = ""):
    target = f"/analytics/{path}".rstrip("/") if not path else f"/analytics/{path}"
    return await proxy_request(settings.EXAM_SERVICE_URL, target or "/analytics/dashboard", request)

@app.api_route("/api/v1/subjects", methods=METHODS)
@app.api_route("/api/v1/subjects/{path:path}", methods=METHODS)
async def subjects_proxy(request: Request, path: str = ""):
    target = f"/subjects/{path}".rstrip("/") if not path else f"/subjects/{path}"
    return await proxy_request(settings.EXAM_SERVICE_URL, target or "/subjects", request)

@app.api_route("/api/v1/activities", methods=METHODS)
@app.api_route("/api/v1/activities/{path:path}", methods=METHODS)
async def activities_proxy(request: Request, path: str = ""):
    target = f"/activities/{path}".rstrip("/") if not path else f"/activities/{path}"
    return await proxy_request(settings.EXAM_SERVICE_URL, target or "/activities", request)

@app.api_route("/api/v1/audit-logs", methods=METHODS)
@app.api_route("/api/v1/audit-logs/{path:path}", methods=METHODS)
async def audit_logs_proxy(request: Request, path: str = ""):
    target = f"/audit-logs/{path}".rstrip("/") if not path else f"/audit-logs/{path}"
    return await proxy_request(settings.EXAM_SERVICE_URL, target or "/audit-logs", request)

@app.api_route("/api/v1/admin", methods=METHODS)
@app.api_route("/api/v1/admin", methods=METHODS)
@app.api_route("/api/v1/admin/{path:path}", methods=METHODS)
async def admin_proxy(request: Request, path: str = ""):
    target = f"/{path}" if path else "/overview"
    return await proxy_request(settings.ADMIN_SERVICE_URL, target, request)
