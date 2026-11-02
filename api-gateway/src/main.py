import httpx
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .config import settings

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
            "exam-service"
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
