# app/core/config.py
"""
Configuração compatível Pydantic v2/v1 com fallback seguro.
- Evita import direto de 'pydantic_settings' para não quebrar quando não instalado.
- Preserva variáveis de ambiente existentes (MAIÚSCULAS).
"""

from __future__ import annotations

import os
import importlib
from datetime import timedelta
from functools import lru_cache

# Carrega .env se python-dotenv estiver disponível (não obrigatório)
try:
    from dotenv import load_dotenv  # type: ignore

    load_dotenv(os.getenv("APP_ENV_FILE", ".env"))
except Exception:
    pass


def _resolve_base_settings():
    """
    Retorna (BaseSettingsClass, SettingsConfigDictOrNone, kind).
    kind ∈ {"v2","v1","base"} apenas para lógica condicional.
    """
    try:
        mod = importlib.import_module("pydantic_settings")  # Pydantic v2
        return mod.BaseSettings, getattr(mod, "SettingsConfigDict", None), "v2"
    except Exception:
        try:
            mod = importlib.import_module("pydantic")  # Pydantic v1
            return getattr(mod, "BaseSettings"), None, "v1"
        except Exception:
            mod = importlib.import_module("pydantic")  # Fallback BaseModel
            BaseModel = getattr(mod, "BaseModel")

            class _BaseSettings(BaseModel):  # why: manter tipagem básica sem quebrar
                pass

            return _BaseSettings, None, "base"


BaseSettings, SettingsConfigDict, _SETTINGS_KIND = _resolve_base_settings()


class Settings(BaseSettings):
    """
    Config central. Defaults lidos de env para não quebrar ambientes existentes.
    """

    # Ambiente/segurança
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

    # Config específica por versão
    if _SETTINGS_KIND == "v2" and SettingsConfigDict is not None:  # pragma: no cover
        model_config = SettingsConfigDict(
            env_file=os.getenv("APP_ENV_FILE", ".env"),
            extra="ignore",
            case_sensitive=False,
        )

    if _SETTINGS_KIND == "v1":  # pragma: no cover
        class Config:
            env_file = os.getenv("APP_ENV_FILE", ".env")
            case_sensitive = False

    # Utilidades
    @property
    def access_token_expires(self) -> timedelta:
        return timedelta(minutes=self.access_token_expires_min)

    @property
    def refresh_token_expires(self) -> timedelta:
        return timedelta(days=self.refresh_token_expires_days)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Evita reprocessar env a cada import."""
    return Settings()


settings = get_settings()

__all__ = ["Settings", "get_settings", "settings"]
