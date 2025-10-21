from pydantic import BaseModel, EmailStr

class SignupIn(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshIn(BaseModel):
    refresh_token: str
