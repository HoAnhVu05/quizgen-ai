from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GATEWAY_PORT: int = 8000
    SECRET_KEY: str = "quizgen-super-secret-academic-key-2026"
    ALGORITHM: str = "HS256"
    
    # Downstream Microservices URLs
    AUTH_SERVICE_URL: str = "http://127.0.0.1:8001"
    DOCUMENT_SERVICE_URL: str = "http://127.0.0.1:8002"
    RAG_SERVICE_URL: str = "http://127.0.0.1:8003"
    AI_SERVICE_URL: str = "http://127.0.0.1:8004"
    EXAM_SERVICE_URL: str = "http://127.0.0.1:8005"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
