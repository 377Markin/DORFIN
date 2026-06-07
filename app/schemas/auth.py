from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterRequest(BaseModel):
    nombre: str
    email: EmailStr
    contrasena: str
    fecha_nacimiento: str
    altura: int
    peso: int
    meta: str


class LoginRequest(BaseModel):
    email: EmailStr
    contrasena: str


class OAuthRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    nombre: str
    email: str
    fecha_nacimiento: Optional[str] = None
    altura: Optional[int] = None
    peso: Optional[int] = None
    meta: Optional[str] = None
    foto_url: Optional[str] = None
    fecha_creacion: Optional[str] = None

    class Config:
        from_attributes = True