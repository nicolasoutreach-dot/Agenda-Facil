from datetime import datetime, timedelta, timezone
from jose import jwt
from argon2 import PasswordHasher
from app.core.config import settings

ALGO = "HS256"
ph = PasswordHasher()

def create_access_token(sub: str) -> str:
    expire = datetime.now(tz=timezone.utc) + timedelta(minutes=settings.access_token_expires_min)
    to_encode = {"sub": sub, "exp": expire}
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGO)

def verify_password(pwd: str, pwd_hash: str) -> bool:
    try:
        ph.verify(pwd_hash, pwd)
        return True
    except Exception:
        return False

def hash_password(pwd: str) -> str:
    return ph.hash(pwd)
