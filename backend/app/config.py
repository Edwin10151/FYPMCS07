from functools import lru_cache
from pydantic import BaseModel
import os


class Settings(BaseModel):
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://mcs07:mcs07-dev-password@localhost:5432/mcs07",
    )
    secret_key: str = os.getenv("SECRET_KEY", "mcs07-dev-secret")
    demo_password: str = os.getenv("DEMO_PASSWORD", "Password123!")
    cors_origins: list[str] = [
        item.strip()
        for item in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080",
        ).split(",")
        if item.strip()
    ]
    llm_provider: str = os.getenv("LLM_PROVIDER", "mock")
    local_llm_url: str = os.getenv("LOCAL_LLM_URL", "http://localhost:11434")


@lru_cache
def get_settings() -> Settings:
    return Settings()

