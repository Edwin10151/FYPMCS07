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
    llm_model: str = os.getenv("LLM_MODEL", "")
    llm_timeout_seconds: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "120"))
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME", "").strip()
    smtp_app_password: str = os.getenv("SMTP_APP_PASSWORD", "").strip()
    email_from: str = os.getenv("EMAIL_FROM", "").strip()

    @property
    def email_configured(self) -> bool:
        return bool(self.smtp_username and self.smtp_app_password and self.email_from)


@lru_cache
def get_settings() -> Settings:
    return Settings()
