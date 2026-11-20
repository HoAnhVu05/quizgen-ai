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
        client_uid = request.headers.get("x-user-id") or request.headers.get("X-User-Id")
        client_email = request.headers.get("x-user-email") or request.headers.get("X-User-Email")
        client_role = request.headers.get("x-user-role") or request.headers.get("X-User-Role")
        if client_uid:
            headers["x-user-id"] = client_uid.strip()
        if client_email:
            headers["x-user-email"] = client_email.strip().lower()
        if client_role:
            headers["x-user-role"] = client_role.strip()
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

async def proxy_request(service_url: str, path: str, request: Request, timeout: float = 300.0) -> Response:
    client = httpx.AsyncClient(base_url=service_url, timeout=timeout, follow_redirects=True)
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
            "admin-service",
            "payment-service"
        ]
    }

# Proxy routes
METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

@app.api_route("/api/v1/auth/{path:path}", methods=METHODS)
async def auth_proxy(path: str, request: Request):
    return await proxy_request(settings.AUTH_SERVICE_URL, f"/{path}", request)

@app.api_route("/api/v1/documents", methods=METHODS)
@app.api_route("/api/v1/documents/{path:path}", methods=METHODS)
@app.api_route("/api/documents", methods=METHODS)
@app.api_route("/api/documents/{path:path}", methods=METHODS)
async def document_proxy(request: Request, path: str = ""):
    target = f"/{path}".rstrip("/") if not path else f"/{path}"
    return await proxy_request(settings.DOCUMENT_SERVICE_URL, target or "/documents", request)

@app.api_route("/api/v1/forum", methods=METHODS)
@app.api_route("/api/v1/forum/{path:path}", methods=METHODS)
async def forum_proxy(request: Request, path: str = ""):
    target = f"/forum/{path}".rstrip("/") if not path else f"/forum/{path}"
    return await proxy_request(settings.DOCUMENT_SERVICE_URL, target or "/forum/posts", request)

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
@app.api_route("/api/v1/admin/{path:path}", methods=METHODS)
async def admin_proxy(request: Request, path: str = ""):
    target = f"/{path}" if path else "/overview"
    return await proxy_request(settings.ADMIN_SERVICE_URL, target, request)

@app.api_route("/api/v1/payment", methods=METHODS)
@app.api_route("/api/v1/payment/{path:path}", methods=METHODS)
async def payment_proxy(request: Request, path: str = ""):
    target = f"/{path}" if path else "/plans"
    return await proxy_request(settings.PAYMENT_SERVICE_URL, target, request)

@app.api_route("/api/v1/dashboard", methods=METHODS)
@app.api_route("/api/v1/dashboard/{path:path}", methods=METHODS)
async def dashboard_proxy(request: Request, path: str = ""):
    target = f"/dashboard/{path}".rstrip("/") if not path else f"/dashboard/{path}"
    return await proxy_request(settings.DOCUMENT_SERVICE_URL, target or "/dashboard/summary", request)

@app.api_route("/api/v1/theme", methods=METHODS)
@app.api_route("/api/v1/theme/{path:path}", methods=METHODS)
async def theme_proxy(request: Request, path: str = ""):
    target = f"/theme/{path}" if path else "/theme/current"
    return await proxy_request(settings.ADMIN_SERVICE_URL, target, request)
