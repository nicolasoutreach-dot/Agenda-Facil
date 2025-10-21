from pydantic import BaseModel
import os
from datetime import timedelta

class Settings(BaseModel):
    app_env: str = os.getenv("APP_ENV", "dev")
    secret_key: str = os.getenv("SECRET_KEY", "change-me")
    access_token_expires_min: int = int(os.getenv("ACCESS_TOKEN_EXPIRES_MIN", "30"))
    refresh_token_expires_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRES_DAYS", "30"))

    database_url: str = os.getenv("DATABASE_URL", "postgresql+psycopg://appuser:apppwd@localhost:5432/appdb")
    celery_broker_url: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    celery_result_backend: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

    class Config:
        arbitrary_types_allowed = True

settings = Settings()
