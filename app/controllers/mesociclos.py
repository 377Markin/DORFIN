from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.training import MesocicloCreate, MesocicloResponse
from app.models.mesociclo import Mesociclo
from app.utils.deps import get_db, get_current_user
from app.models.user import User

router = APIRouter(prefix="/mesociclos", tags=["Mesociclos"])


@router.get("/", response_model=List[MesocicloResponse])
def list_mesociclos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = (
        db.query(Mesociclo)
        .filter(Mesociclo.usuario_id == current_user.id)
        .order_by(Mesociclo.fecha_inicio.desc())
        .all()
    )
    return [m.to_dict() for m in items]


@router.post("/", response_model=MesocicloResponse, status_code=201)
def create_mesociclo(
    body: MesocicloCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meso = Mesociclo(
        usuario_id=current_user.id,
        fecha_inicio=body.fecha_inicio,
        peso_inicial=body.peso_inicial,
        medidas=body.medidas or {},
    )
    db.add(meso)
    db.commit()
    db.refresh(meso)
    return meso.to_dict()


@router.get("/activo", response_model=MesocicloResponse)
def get_active_mesociclo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna el mesociclo más reciente del usuario."""
    meso = (
        db.query(Mesociclo)
        .filter(Mesociclo.usuario_id == current_user.id)
        .order_by(Mesociclo.fecha_inicio.desc())
        .first()
    )
    if not meso:
        raise HTTPException(status_code=404, detail="No hay mesociclos activos")
    return meso.to_dict()


@router.get("/{meso_id}", response_model=MesocicloResponse)
def get_mesociclo(
    meso_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meso = (
        db.query(Mesociclo)
        .filter(Mesociclo.id == meso_id, Mesociclo.usuario_id == current_user.id)
        .first()
    )
    if not meso:
        raise HTTPException(status_code=404, detail="Mesociclo no encontrado")
    return meso.to_dict()

@router.post("/{meso_id}/medidas", response_model=MesocicloResponse)
def agregar_medidas(
    meso_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Agrega un snapshot de medidas corporales al historial."""
    meso = (
        db.query(Mesociclo)
        .filter(Mesociclo.id == meso_id, Mesociclo.usuario_id == current_user.id)
        .first()
    )
    if not meso:
        raise HTTPException(status_code=404, detail="Mesociclo no encontrado")

    from datetime import date
    snapshot = {
        "fecha": str(date.today()),
        "semana": body.get("semana", 1),
        "mes": body.get("mes", 1),
        "medidas": body.get("medidas", {}),
    }
    historial = list(meso.historial_medidas or [])
    historial.append(snapshot)
    meso.historial_medidas = historial
    db.commit()
    db.refresh(meso)
    return meso.to_dict()

@router.put("/{meso_id}", response_model=MesocicloResponse)
def update_mesociclo(
    meso_id: int,
    body: MesocicloCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meso = (
        db.query(Mesociclo)
        .filter(Mesociclo.id == meso_id, Mesociclo.usuario_id == current_user.id)
        .first()
    )
    if not meso:
        raise HTTPException(status_code=404, detail="Mesociclo no encontrado")
    meso.fecha_inicio = body.fecha_inicio
    meso.peso_inicial = body.peso_inicial
    meso.medidas = body.medidas or {}
    meso.meta = body.meta or meso.meta
    meso.duracion_semanas = body.duracion_semanas or meso.duracion_semanas
    meso.frecuencia_medidas = body.frecuencia_medidas or meso.frecuencia_medidas
    db.commit()
    db.refresh(meso)
    return meso.to_dict()
