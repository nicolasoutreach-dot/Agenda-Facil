# app/api/__init__.py
from __future__ import annotations

import importlib
import logging
from typing import Final
from fastapi import APIRouter

__all__ = [
    "API_V1_PREFIX",
    "tags_metadata",
    "get_api_router",
    "router",
]

log = logging.getLogger(__name__)

# Prefix de versão (permite coexistir /v1, /v2 no futuro)
API_V1_PREFIX: Final[str] = "/v1"

# Metadados de tags para a documentação (opcional)
tags_metadata = [
    {"name": "Auth", "description": "Autenticação, login/logout, refresh de tokens."},
    {
        "name": "Providers",
        "description": "Gestão do prestador (perfil, profissionais, serviços, horários).",
    },
    {
        "name": "Availability",
        "description": "Janelas de atendimento, bloqueios, folgas e regras de agendamento.",
    },
    {
        "name": "Appointments",
        "description": "Agendamentos: CRUD e status (Confirmado, Pendente, Finalizado, Cancelado, No-show).",
    },
    {"name": "__internal__", "description": "Rotas internas (healthcheck, utilitários)."},
]


def _include_v1_routes(r: APIRouter) -> None:
    """
    Importa e anexa os sub-routers da API v1.
    - Usa importlib para reduzir riscos de ciclos de import.
    - Tolera módulos ausentes (útil em desenvolvimento parcial).
    """
    specs = [
        ("app.api.auth", "router", "/auth", ["Auth"]),
        ("app.api.providers", "router", "/providers", ["Providers"]),
        # Availability como subdomínio de providers reflete a hierarquia de negócio:
        ("app.api.availability", "router", "/providers", ["Availability"]),
        ("app.api.appointments", "router", "/appointments", ["Appointments"]),
    ]

    for mod_path, attr, prefix, tags in specs:
        try:
            mod = importlib.import_module(mod_path)
            sub_router = getattr(mod, attr)
            r.include_router(sub_router, prefix=prefix, tags=tags)
        except ModuleNotFoundError as e:
            # Tenta import relativo como fallback (caso o pacote raiz não esteja no PYTHONPATH)
            try:
                pkg_name = __name__  # "app.api"
                rel_name = "." + mod_path.rsplit(".", 1)[-1]  # ".auth", ".providers", etc.
                mod = importlib.import_module(rel_name, package=pkg_name)
                sub_router = getattr(mod, attr)
                r.include_router(sub_router, prefix=prefix, tags=tags)
            except Exception as ee:
                log.debug("API módulo ausente/ignorado: %s (%s / %s)",)