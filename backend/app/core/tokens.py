from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe
from uuid import uuid4
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import ph, create_access_token
from app.models.refresh_token import RefreshToken

def _now_utc():
    return datetime.now(timezone.utc)

def issue_refresh_token(db: Session, user_id: str) -> str:
    token_id = str(uuid4())
    secret = token_urlsafe(32)
    token_plain = f"{token_id}.{secret}"
    token_hash = ph.hash(secret)
    expires = _now_utc() + timedelta(days=settings.refresh_token_expires_days)
    row = RefreshToken(id=token_id, user_id=user_id, token_hash=token_hash, expires_at=expires)
    db.add(row)
    db.commit()
    return token_plain

def rotate_refresh_token(db: Session, token_plain: str) -> tuple[str, str]:
    try:
        token_id, secret = token_plain.split(".", 1)
    except ValueError:
        raise ValueError("invalid refresh token format")
    row = db.get(RefreshToken, token_id)
    if not row or row.revoked_at is not None or row.expires_at <= _now_utc():
        raise ValueError("refresh token invalid/expired")
    try:
        ph.verify(row.token_hash, secret)
    except Exception:
        raise ValueError("refresh token invalid")
    # revoke old
    row.revoked_at = _now_utc()
    db.add(row)
    db.commit()
    # issue new
    new_refresh = issue_refresh_token(db, str(row.user_id))
    new_access = create_access_token(str(row.user_id))
    return new_access, new_refresh

def revoke_refresh_token(db: Session, token_plain: str) -> None:
    try:
        token_id, _ = token_plain.split(".", 1)
    except ValueError:
        return
    row = db.get(RefreshToken, token_id)
    if row and row.revoked_at is None:
        row.revoked_at = _now_utc()
        db.add(row)
        db.commit()
