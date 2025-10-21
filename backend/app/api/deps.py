from typing import Generator
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app.db.session import SessionLocal
from app.core.config import settings

ALGO = "HS256"
auth_scheme = HTTPBearer()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user_id(token: HTTPAuthorizationCredentials = Depends(auth_scheme)) -> str:
    try:
        payload = jwt.decode(token.credentials, settings.secret_key, algorithms=[ALGO])
        sub = payload.get("sub")
        if not sub:
            raise ValueError("no sub")
        return sub
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="invalid token")
