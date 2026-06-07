from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.training import RoutineCreate, RoutineResponse
from app.models.routine import Routine
from app.utils.deps import get_db, get_current_user
from app.models.user import User
from app.models.rutina_ejercicio import RutinaEjercicio
from app.models.traininglog import TrainingLog

router = APIRouter(prefix="/rutinas", tags=["Rutinas"])


@router.get("/", response_model=List[RoutineResponse])
def list_routines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routines = (
        db.query(Routine)
        .filter(Routine.usuario_id == current_user.id)
        .order_by(Routine.dia)
        .all()
    )
    return [r.to_dict() for r in routines]


@router.post("/", response_model=RoutineResponse, status_code=201)
def create_routine(
    body: RoutineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routine = Routine(
        usuario_id=current_user.id,
        nombre=body.nombre,
        dia=body.dia,
    )
    db.add(routine)
    db.commit()
    db.refresh(routine)
    return routine.to_dict()


@router.get("/{routine_id}", response_model=RoutineResponse)
def get_routine(
    routine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routine = (
        db.query(Routine)
        .filter(Routine.id == routine_id, Routine.usuario_id == current_user.id)
        .first()
    )
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    return routine.to_dict()


@router.put("/{routine_id}", response_model=RoutineResponse)
def update_routine(
    routine_id: int,
    body: RoutineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routine = (
        db.query(Routine)
        .filter(Routine.id == routine_id, Routine.usuario_id == current_user.id)
        .first()
    )
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    routine.nombre = body.nombre
    routine.dia = body.dia
    db.commit()
    db.refresh(routine)
    return routine.to_dict()

@router.delete("/{routine_id}", status_code=204)
def delete_routine(
    routine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routine = (
        db.query(Routine)
        .filter(Routine.id == routine_id, Routine.usuario_id == current_user.id)
        .first()
    )
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")

    # Borrar logs de todos los ejercicios de esta rutina
    ejercicios = db.query(RutinaEjercicio).filter(RutinaEjercicio.rutina_id == routine_id).all()
    for ej in ejercicios:
        db.query(TrainingLog).filter(TrainingLog.ejercicio_id == ej.id).delete()

    # Borrar los ejercicios de la rutina
    db.query(RutinaEjercicio).filter(RutinaEjercicio.rutina_id == routine_id).delete()

    db.delete(routine)
    db.commit()

from datetime import date

@router.post("/{routine_id}/completar", response_model=RoutineResponse)
def completar_rutina(
    routine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routine = (
        db.query(Routine)
        .filter(Routine.id == routine_id, Routine.usuario_id == current_user.id)
        .first()
    )
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    routine.completado_fecha = date.today()
    db.commit()
    db.refresh(routine)
    return routine.to_dict()
@router.post("/{routine_id}/descanso", response_model=RoutineResponse)
def registrar_descanso(
    routine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routine = (
        db.query(Routine)
        .filter(Routine.id == routine_id, Routine.usuario_id == current_user.id)
        .first()
    )
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    if not routine.nombre.lower().strip().__contains__('descanso'):
        raise HTTPException(status_code=400, detail="Esta rutina no es un día de descanso")
    
    # Guarda un TrainingLog especial con ejercicio_id=0 para que cuente en la racha
    log_existente = db.query(TrainingLog).filter(
        TrainingLog.usuario_id == current_user.id,
        TrainingLog.ejercicio_id == 0,
        TrainingLog.fecha == date.today(),
    ).first()
    
    if not log_existente:
        log = TrainingLog(
            usuario_id=current_user.id,
            ejercicio_id=0,
            series=0,
            repeticiones="0",
            rir=0,
            descanso="0",
            fecha=str(date.today()),
            anotaciones="0",
            nombre_ejercicio="Descanso",
        )
        db.add(log)
    
    routine.completado_fecha = date.today()
    db.commit()
    db.refresh(routine)
    return routine.to_dict()