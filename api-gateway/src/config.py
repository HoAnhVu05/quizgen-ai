from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GATEWAY_PORT: int = 8000
    SECRET_KEY: str = "quizgen-super-secret-academic-key-2026"
    ALGORITHM: str = "HS256"
    
    # Downstream Microservices URLs
    AUTH_SERVICE_URL: str = "http://auth-service:8001"
    DOCUMENT_SERVICE_URL: str = "http://document-service:8002"
    RAG_SERVICE_URL: str = "http://rag-service:8003"
    AI_SERVICE_URL: str = "http://ai-service:8004"
    EXAM_SERVICE_URL: str = "http://exam-service:8005"

    class Config:
        env_file = ".env"

settings = Settings()
