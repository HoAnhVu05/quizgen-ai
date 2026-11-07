from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GATEWAY_PORT: int = 8000
    SECRET_KEY: str = "quizgen-super-secret-academic-key-2026"
    ALGORITHM: str = "HS256"
    
    # Downstream Microservices URLs
    AUTH_SERVICE_URL: str = "http://localhost:8001"
    DOCUMENT_SERVICE_URL: str = "http://localhost:8002"
    RAG_SERVICE_URL: str = "http://localhost:8003"
    AI_SERVICE_URL: str = "http://localhost:8004"
    EXAM_SERVICE_URL: str = "http://localhost:8005"

    class Config:
        env_file = ".env"

settings = Settings()
