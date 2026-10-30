import httpx
from fastapi import FastAPI, Request, Response, HTTPException, Depends
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

# Helper function to proxy requests to downstream microservices
async def proxy_request(service_url: str, path: str, request: Request) -> Response:
    client = httpx.AsyncClient(base_url=service_url, timeout=60.0)
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

# Routes proxying to respective microservices
@app.api_route("/api/v1/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def auth_proxy(path: str, request: Request):
    return await proxy_request(settings.AUTH_SERVICE_URL, f"/{path}", request)

@app.api_route("/api/v1/documents/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def document_proxy(path: str, request: Request):
    return await proxy_request(settings.DOCUMENT_SERVICE_URL, f"/{path}", request)

@app.api_route("/api/v1/rag/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def rag_proxy(path: str, request: Request):
    return await proxy_request(settings.RAG_SERVICE_URL, f"/{path}", request)

@app.api_route("/api/v1/ai/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def ai_proxy(path: str, request: Request):
    return await proxy_request(settings.AI_SERVICE_URL, f"/{path}", request)

@app.api_route("/api/v1/exams/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def exam_proxy(path: str, request: Request):
    return await proxy_request(settings.EXAM_SERVICE_URL, f"/{path}", request)
