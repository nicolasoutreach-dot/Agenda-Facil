from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.user import User
from app.schemas.auth import SignupIn, LoginIn, TokenOut, RefreshIn
from app.core.security import hash_password, verify_password, create_access_token
from app.core.tokens import issue_refresh_token, rotate_refresh_token, revoke_refresh_token

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/signup", status_code=201, response_model=TokenOut)
def signup(payload: SignupIn, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=409, detail="email already registered")
    user = User(email=payload.email, password_hash=hash_password(payload.password), full_name=payload.full_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    access = create_access_token(str(user.id))
    refresh = issue_refresh_token(db, str(user.id))
    return {"access_token": access, "refresh_token": refresh}

@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")
    access = create_access_token(str(user.id))
    refresh = issue_refresh_token(db, str(user.id))
    return {"access_token": access, "refresh_token": refresh}

@router.post("/refresh", response_model=TokenOut)
def refresh(data: RefreshIn, db: Session = Depends(get_db)):
    try:
        access, refresh = rotate_refresh_token(db, data.refresh_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="invalid refresh token")
    return {"access_token": access, "refresh_token": refresh}

@router.post("/logout")
def logout(data: RefreshIn, db: Session = Depends(get_db)):
    revoke_refresh_token(db, data.refresh_token)
    return {"ok": True}
