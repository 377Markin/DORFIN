from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.training import RutinaEjercicioCreate, RutinaEjercicioResponse
from app.models.rutina_ejercicio import RutinaEjercicio
from app.models.routine import Routine
from app.utils.deps import get_db, get_current_user
from app.models.user import User
from app.models.traininglog import TrainingLog

router = APIRouter(prefix="/rutinas/{rutina_id}/ejercicios", tags=["Rutina Ejercicios"])


@router.get("/", response_model=List[RutinaEjercicioResponse])
def list_ejercicios(
    rutina_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rutina = db.query(Routine).filter(
        Routine.id == rutina_id,
        Routine.usuario_id == current_user.id
    ).first()
    if not rutina:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")

    ejercicios = db.query(RutinaEjercicio).filter(
        RutinaEjercicio.rutina_id == rutina_id
    ).all()
    return [e.to_dict() for e in ejercicios]


@router.post("/", response_model=RutinaEjercicioResponse, status_code=201)
def create_ejercicio(
    rutina_id: int,
    body: RutinaEjercicioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rutina = db.query(Routine).filter(
        Routine.id == rutina_id,
        Routine.usuario_id == current_user.id
    ).first()
    if not rutina:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")

    import json
    ejercicio = RutinaEjercicio(
        rutina_id=rutina_id,
        nombre=body.nombre,
        musculo=body.musculo,
        descripcion=body.descripcion,
        series=body.series,
        descanso=body.descanso,
        rir_objetivo=json.dumps(body.rir_objetivo) if body.rir_objetivo else None,
    )
    db.add(ejercicio)
    db.commit()
    db.refresh(ejercicio)
    return ejercicio.to_dict()


@router.delete("/{ejercicio_id}", status_code=204)
def delete_ejercicio(
    rutina_id: int,
    ejercicio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rutina = db.query(Routine).filter(
        Routine.id == rutina_id,
        Routine.usuario_id == current_user.id
    ).first()
    if not rutina:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")

    ejercicio = db.query(RutinaEjercicio).filter(
        RutinaEjercicio.id == ejercicio_id,
        RutinaEjercicio.rutina_id == rutina_id
    ).first()
    if not ejercicio:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")

    # Borrar logs asociados a este ejercicio antes de borrarlo
    db.query(TrainingLog).filter(TrainingLog.ejercicio_id == ejercicio_id).delete()
    db.delete(ejercicio)
    db.commit()

