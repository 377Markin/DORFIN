from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta
from typing import List

from app.schemas.training import (
    TrainingLogCreate, TrainingLogResponse,
    UserStatsResponse, StreakResponse,
    WeeklyVolume, PersonalRecord, DiaCompletado
)
from app.models.traininglog import TrainingLog
from app.models.exercise import Exercise
from app.models.rutina_ejercicio import RutinaEjercicio
from app.models.routine import Routine
from app.utils.deps import get_db, get_current_user
from app.models.user import User

router = APIRouter(prefix="/training-logs", tags=["Training Logs"])


def _get_nombre_ejercicio(db: Session, ejercicio_id: int, log: 'TrainingLog | None' = None) -> str:
    # Primero intenta usar el nombre guardado en el propio log (sobrevive a borrados)
    if log and getattr(log, 'nombre_ejercicio', None):
        return log.nombre_ejercicio
    rej = db.query(RutinaEjercicio).filter(RutinaEjercicio.id == ejercicio_id).first()
    if rej:
        return rej.nombre
    ex = db.query(Exercise).filter(Exercise.id == ejercicio_id).first()
    if ex:
        return ex.nombre
    return f"Ejercicio {ejercicio_id}"


def _parse_peso(anotaciones) -> float:
    try:
        return float(str(anotaciones).strip())
    except (ValueError, TypeError):
        return 0.0


@router.get("/", response_model=List[TrainingLogResponse])
def list_logs(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = (
        db.query(TrainingLog)
        .filter(TrainingLog.usuario_id == current_user.id)
        .order_by(TrainingLog.fecha.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [log.to_dict() for log in logs]


@router.post("/", response_model=TrainingLogResponse, status_code=201)
def create_log(
    body: TrainingLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    nombre_guardado = _get_nombre_ejercicio(db, body.ejercicio_id)

    log = TrainingLog(
        usuario_id=current_user.id,
        ejercicio_id=body.ejercicio_id,
        series=body.series,
        repeticiones=body.repeticiones,
        rir=body.rir,
        descanso=body.descanso,
        fecha=body.fecha,
        anotaciones=body.anotaciones or "0",
        nombre_ejercicio=nombre_guardado,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log.to_dict()


@router.get("/streak", response_model=StreakResponse)
def get_streak(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
    week_days = [start_of_week + timedelta(days=i) for i in range(7)]
    day_labels = ["L", "M", "M", "J", "V", "S", "D"]

    cutoff = today - timedelta(days=90)
    log_dates_raw = (
        db.query(func.distinct(TrainingLog.fecha))
        .filter(
            TrainingLog.usuario_id == current_user.id,
            TrainingLog.fecha >= cutoff,
        )
        .all()
    )
    log_dates = {r[0] for r in log_dates_raw if r[0] is not None}

    streak = 0
    check = today
    while check in log_dates or (check == today and today not in log_dates):
        if check in log_dates:
            streak += 1
            check -= timedelta(days=1)
        else:
            break

    dias_completados = [
        DiaCompletado(dia=day_labels[i], completado=(d in log_dates))
        for i, d in enumerate(week_days)
    ]
    return StreakResponse(racha=streak, dias_completados=dias_completados)


@router.get("/stats", response_model=UserStatsResponse)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    start_of_month = today.replace(day=1)

    all_logs = (
        db.query(TrainingLog)
        .filter(TrainingLog.usuario_id == current_user.id)
        .all()
    )

    month_logs = [
        log for log in all_logs
        if log.fecha and str(log.fecha) >= str(start_of_month)
    ]

    entrenos_mes = len({str(log.fecha) for log in month_logs})

    kg_totales = 0.0
    for log in month_logs:
        peso = _parse_peso(log.anotaciones)
        kg_totales += peso

    # PRs agrupados por nombre normalizado — evita duplicados entre rutinas
    exercise_best: dict = {}
    for log in all_logs:
        eid = log.ejercicio_id
        nombre = _get_nombre_ejercicio(db, eid, log)
        nombre_key = nombre.lower().strip()
        peso = _parse_peso(log.anotaciones)
        try:
            reps = int(str(log.repeticiones).split(",")[0])
        except (ValueError, AttributeError):
            reps = 0
        rir = float(log.rir) if log.rir is not None else 4.0

        if nombre_key not in exercise_best:
            exercise_best[nombre_key] = {
                "peso": peso, "reps": reps, "rir": rir,
                "fecha": str(log.fecha), "nombre": nombre, "eid": eid
            }
        else:
            prev = exercise_best[nombre_key]
            if (peso > prev["peso"] or
                (peso == prev["peso"] and reps > prev["reps"]) or
                (peso == prev["peso"] and reps == prev["reps"] and rir < prev["rir"])):
                exercise_best[nombre_key] = {
                    "peso": peso, "reps": reps, "rir": rir,
                    "fecha": str(log.fecha), "nombre": nombre, "eid": eid
                }

    prs: List[PersonalRecord] = []
    prs_nuevos = 0
    for nombre_key, data in exercise_best.items():
        if data["peso"] == 0:
            continue
        pr = PersonalRecord(
            ejercicio_id=data["eid"],
            ejercicio_nombre=data["nombre"],
            peso_max=data["peso"],
            fecha=data["fecha"],
        )
        prs.append(pr)
        if data["fecha"] and data["fecha"] >= str(start_of_month):
            prs_nuevos += 1

    weekly: dict = {}
    for log in all_logs:
        if not log.fecha:
            continue
        try:
            log_date = log.fecha if isinstance(log.fecha, date) else date.fromisoformat(str(log.fecha))
            week_start = log_date - timedelta(days=log_date.weekday())
            weeks_ago = (today - week_start).days // 7
            if weeks_ago > 3:
                continue
            label = f"S{4 - weeks_ago}"
            if label not in weekly:
                weekly[label] = 0.0
            peso = _parse_peso(log.anotaciones)
            weekly[label] += peso
        except Exception:
            pass

    volumen_semanal = [
        WeeklyVolume(semana=k, volumen=round(v, 1))
        for k, v in sorted(weekly.items())
    ]

    return UserStatsResponse(
        entrenos_mes=entrenos_mes,
        kg_totales_mes=round(kg_totales, 1),
        prs_nuevos=prs_nuevos,
        volumen_semanal=volumen_semanal,
        personal_records=sorted(prs, key=lambda x: x.peso_max, reverse=True)[:10],
    )


@router.get("/ultimo/{ejercicio_id}", response_model=TrainingLogResponse)
def get_ultimo_log(
    ejercicio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = (
        db.query(TrainingLog)
        .filter(
            TrainingLog.usuario_id == current_user.id,
            TrainingLog.ejercicio_id == ejercicio_id,
        )
        .order_by(TrainingLog.fecha.desc(), TrainingLog.id.desc())
        .first()
    )
    if not log:
        raise HTTPException(
            status_code=404,
            detail=f"No hay registros previos para el ejercicio {ejercicio_id}"
        )
    return log.to_dict()


@router.get("/{log_id}", response_model=TrainingLogResponse)
def get_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = (
        db.query(TrainingLog)
        .filter(TrainingLog.id == log_id, TrainingLog.usuario_id == current_user.id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Log no encontrado")
    return log.to_dict()


@router.get("/ejercicio/{ejercicio_id}/historial")
def get_historial_ejercicio(
    ejercicio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = (
        db.query(TrainingLog)
        .filter(
            TrainingLog.usuario_id == current_user.id,
            TrainingLog.ejercicio_id == ejercicio_id,
        )
        .order_by(TrainingLog.fecha.asc(), TrainingLog.id.asc())
        .all()
    )
    nombre = _get_nombre_ejercicio(db, ejercicio_id, logs[0] if logs else None)
    return {
        "ejercicio_id": ejercicio_id,
        "ejercicio_nombre": nombre,
        "logs": [
            {
                "fecha": str(log.fecha),
                "peso": _parse_peso(log.anotaciones),
                "repeticiones": int(str(log.repeticiones).split(",")[0]) if log.repeticiones else 0,
                "rir": log.rir,
                "series": log.series,
            }
            for log in logs
        ]
    }


@router.get("/ejercicio/nombre/{nombre}/historial")
def get_historial_por_nombre(
    nombre: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from urllib.parse import unquote
    nombre_decoded = unquote(nombre).lower().strip()

    rutinas_usuario = db.query(Routine.id).filter(Routine.usuario_id == current_user.id).subquery()

    ejercicios_ids = db.query(RutinaEjercicio.id).filter(
        RutinaEjercicio.rutina_id.in_(rutinas_usuario),
        func.lower(RutinaEjercicio.nombre) == nombre_decoded
    ).all()
    ids = [e[0] for e in ejercicios_ids]

    ejercicios_globales = db.query(Exercise.id).filter(
        func.lower(Exercise.nombre) == nombre_decoded
    ).all()
    ids += [e[0] for e in ejercicios_globales]

    if not ids:
        return {"ejercicio_nombre": nombre, "logs": []}

    logs = (
        db.query(TrainingLog)
        .filter(
            TrainingLog.usuario_id == current_user.id,
            TrainingLog.ejercicio_id.in_(ids),
        )
        .order_by(TrainingLog.fecha.asc(), TrainingLog.id.asc())
        .all()
    )

    return {
        "ejercicio_nombre": nombre,
        "logs": [
            {
                "fecha": str(log.fecha),
                "peso": _parse_peso(log.anotaciones),
                "repeticiones": int(str(log.repeticiones).split(",")[0]) if log.repeticiones else 0,
                "rir": log.rir,
                "series": log.series,
            }
            for log in logs
        ]
    }

@router.get("/historial/semanal")
def get_historial_semanal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Logs agrupados por semana y fecha para el historial completo."""
    from collections import defaultdict
    
    logs = (
        db.query(TrainingLog)
        .filter(
            TrainingLog.usuario_id == current_user.id,
            TrainingLog.ejercicio_id != 0,  # Excluir días de descanso
        )
        .order_by(TrainingLog.fecha.desc(), TrainingLog.id.desc())
        .all()
    )

    # Agrupar por semana → fecha → ejercicios
    semanas: dict = defaultdict(lambda: defaultdict(list))
    for log in logs:
        if not log.fecha:
            continue
        try:
            log_date = log.fecha if isinstance(log.fecha, date) else date.fromisoformat(str(log.fecha))
            week_start = log_date - timedelta(days=log_date.weekday())
            week_key = str(week_start)
            date_key = str(log_date)
            semanas[week_key][date_key].append({
                "nombre": _get_nombre_ejercicio(db, log.ejercicio_id, log),
                "peso": _parse_peso(log.anotaciones),
                "repeticiones": int(str(log.repeticiones).split(",")[0]) if log.repeticiones else 0,
                "rir": log.rir,
                "series": log.series,
            })
        except Exception:
            pass

    resultado = []
    for week_key in sorted(semanas.keys(), reverse=True):
        dias = []
        for date_key in sorted(semanas[week_key].keys(), reverse=True):
            dias.append({
                "fecha": date_key,
                "ejercicios": semanas[week_key][date_key]
            })
        resultado.append({
            "semana_inicio": week_key,
            "dias": dias,
        })

    return resultado

@router.delete("/{log_id}", status_code=204)
def delete_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = (
        db.query(TrainingLog)
        .filter(TrainingLog.id == log_id, TrainingLog.usuario_id == current_user.id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Log no encontrado")
    db.delete(log)
    db.commit()