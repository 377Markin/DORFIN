from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.training import ExerciseCreate, ExerciseResponse
from app.models.exercise import Exercise
from app.utils.deps import get_db, get_current_user
from app.models.user import User
from app.services.exercise_service import conexion

router = APIRouter(prefix="/ejercicios", tags=["Ejercicios"])


@router.get("/", response_model=List[dict])
def list_exercises(
    fuente: str = "local",
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    fuente=local → ejercicios de la DB propia.
    fuente=wger  → ejercicios de la API externa Wger.
    """
    if fuente == "wger":
        return conexion()

    exercises = db.query(Exercise).offset(offset).limit(limit).all()
    return [
        {
            "id": e.id,
            "nombre": e.nombre,
            "musculo": e.musculo,
            "descripcion": e.descripcion,
            "imagen_url": None,  # placeholder hasta que agregues imágenes
        }
        for e in exercises
    ]


@router.post("/", response_model=ExerciseResponse, status_code=201)
def create_exercise(
    body: ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exercise = Exercise(
        nombre=body.nombre,
        musculo=body.musculo,
        descripcion=body.descripcion,
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return {
        "id": exercise.id,
        "nombre": exercise.nombre,
        "musculo": exercise.musculo,
        "descripcion": exercise.descripcion,
        "fecha_creacion": str(exercise.fecha_creacion) if exercise.fecha_creacion else None,
    }


@router.get("/{exercise_id}", response_model=dict)
def get_exercise(exercise_id: int, db: Session = Depends(get_db)):
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    return {
        "id": exercise.id,
        "nombre": exercise.nombre,
        "musculo": exercise.musculo,
        "descripcion": exercise.descripcion,
        "imagen_url": None,
    }
