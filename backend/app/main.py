from fastapi import FastAPI
from app.core.config import settings
from app.api import auth, availability, appointments, health, providers

def create_app() -> FastAPI:
    app = FastAPI(title="MVP Backend", version="0.1.0")
    # Routers
    app.include_router(health.router, tags=["health"])
    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(availability.router, prefix="/providers", tags=["availability"])
    app.include_router(providers.router, prefix="/providers", tags=["providers"])
    app.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
    return app

app = create_app()
