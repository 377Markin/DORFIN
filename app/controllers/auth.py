from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.schemas.auth import (
    RegisterRequest, LoginRequest, OAuthRequest,
    TokenResponse, RefreshRequest, UserResponse
)
from app.models.user import User
from app.utils.jwt import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token
)
from app.utils.deps import get_db, get_current_user

router = APIRouter(prefix="/auth", tags=["Autenticación"])


def _build_token_response(user: User) -> dict:
    payload = {"sub": str(user.id), "email": user.email}
    return {
        "access_token": create_access_token(payload),
        "refresh_token": create_refresh_token(payload),
        "token_type": "bearer",
        "user": user.to_dict(),
    }


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    hashed = hash_password(body.contrasena)
    user = User(
        nombre=body.nombre,
        email=body.email,
        contrasena=hashed,
        fecha_nacimiento=body.fecha_nacimiento,
        altura=body.altura,
        peso=body.peso,
        meta=body.meta,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _build_token_response(user)

from pydantic import BaseModel as PydanticBase

class CheckEmailRequest(PydanticBase):
    email: str

@router.post("/check-email")
def check_email(body: CheckEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    return {"exists": user is not None}

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.contrasena, user.contrasena):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return _build_token_response(user)


@router.post("/google", response_model=TokenResponse)
def google_oauth(body: OAuthRequest, db: Session = Depends(get_db)):
    """
    Verificar el id_token de Google usando google-auth library.
    Por ahora retorna error claro hasta configurar GOOGLE_CLIENT_ID.
    """
    import os
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(
            status_code=501,
            detail="Google OAuth no configurado. Agrega GOOGLE_CLIENT_ID al .env"
        )
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        idinfo = google_id_token.verify_oauth2_token(
            body.id_token, google_requests.Request(), client_id
        )
        email = idinfo["email"]
        nombre = idinfo.get("name", email.split("@")[0])
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token de Google inválido: {str(e)}")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(nombre=nombre, email=email, contrasena=hash_password("oauth_google"))
        db.add(user)
        db.commit()
        db.refresh(user)
    return _build_token_response(user)


@router.post("/apple", response_model=TokenResponse)
def apple_oauth(body: OAuthRequest, db: Session = Depends(get_db)):
    """Apple Sign In — requiere configuración adicional."""
    raise HTTPException(
        status_code=501,
        detail="Apple OAuth — configura APPLE_CLIENT_ID y APPLE_TEAM_ID en .env"
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token de refresh inválido")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return _build_token_response(user)


@router.post("/logout")
def logout():
    # Con JWT stateless el logout se maneja en el cliente borrando los tokens.
    # Para invalidación real, implementar una blacklist en Redis.
    return {"message": "Sesión cerrada exitosamente"}

@router.delete("/me", status_code=204)
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.delete(current_user)
    db.commit()

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(
    updates: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed = {"nombre", "edad", "altura", "peso", "meta"}
    for key, value in updates.items():
        if key in allowed:
            setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return current_user
