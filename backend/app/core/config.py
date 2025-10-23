# app/core/config.py
"""
Config sem BaseSettings/pydantic-settings.
Por quê: evitar ModuleNotFoundError no worker e manter leitura por variáveis de ambiente.
"""

from __future__ import annotations

import os
from datetime import timedelta
from functools import lru_cache
from pydantic import BaseModel

# Opcional: carregar .env se python-dotenv existir (não é obrigatório)
try:  # por quê: conveniência local sem criar dependência dura
    from dotenv import load_dotenv  # type: ignore
    load_dotenv(os.getenv("APP_ENV_FILE", ".env"))
except Exception:
    pass


class Settings(BaseModel):
    # Ambiente / segurança
    app_env: str = os.getenv("APP_ENV", "dev")
    secret_key: str = os.getenv("SECRET_KEY", "change-me")

    # JWT
    access_token_expires_min: int = int(os.getenv("ACCESS_TOKEN_EXPIRES_MIN", "30"))
    refresh_token_expires_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRES_DAYS", "30"))

    # Banco / Celery
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://appuser:apppwd@localhost:5432/appdb",
    )
    celery_broker_url: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    celery_result_backend: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

    # Notificações
    notif_http_base_url: str = os.getenv("NOTIF_HTTP_BASE_URL", "https://example-notifier.local")
    notif_http_api_key: str = os.getenv("NOTIF_HTTP_API_KEY", "dev-key")

    notif_circuit_fail_max: int = int(os.getenv("NOTIF_CIRCUIT_FAIL_MAX", "5"))
    notif_circuit_reset_seconds: int = int(os.getenv("NOTIF_CIRCUIT_RESET_SECONDS", "60"))

    notif_retry_max_attempts: int = int(os.getenv("NOTIF_RETRY_MAX_ATTEMPTS", "5"))
    notif_retry_backoff_base: float = float(os.getenv("NOTIF_RETRY_BACKOFF_BASE", "1.0"))
    notif_retry_backoff_max: float = float(os.getenv("NOTIF_RETRY_BACKOFF_MAX", "16.0"))

    notif_requeue_stale_seconds: int = int(os.getenv("NOTIF_REQUEUE_STALE_SECONDS", "120"))
    notif_failed_max_attempts: int = int(os.getenv("NOTIF_FAILED_MAX_ATTEMPTS", "5"))

    # Utilidades (timedelta)
    @property
    def access_token_expires(self) -> timedelta:
        return timedelta(minutes=self.access_token_expires_min)

    @property
    def refresh_token_expires(self) -> timedelta:
        return timedelta(days=self.refresh_token_expires_days)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    # por quê: singleton; evita reprocessar env a cada import
    return Settings()


# Único ponto de acesso
settings = get_settings()

__all__ = ["Settings", "get_settings", "settings"]
