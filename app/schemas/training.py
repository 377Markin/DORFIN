from pydantic import BaseModel
from typing import Optional, List


class TrainingLogCreate(BaseModel):
    ejercicio_id: int
    series: int
    repeticiones: str
    rir: float
    descanso: str
    fecha: Optional[str] = None
    anotaciones: Optional[str] = "Sin anotaciones"


class TrainingLogResponse(BaseModel):
    id: int
    usuario_id: int
    ejercicio_id: int
    series: int
    repeticiones: str
    rir: float
    descanso: str
    fecha: Optional[str] = None
    anotaciones: Optional[str] = None
    fecha_creacion: Optional[str] = None

    class Config:
        from_attributes = True


class ExerciseCreate(BaseModel):
    nombre: str
    musculo: str
    descripcion: str


class ExerciseResponse(BaseModel):
    id: int
    nombre: str
    musculo: str
    descripcion: str
    fecha_creacion: Optional[str] = None

    class Config:
        from_attributes = True


class RoutineCreate(BaseModel):
    nombre: str
    dia: int
    ejercicio_ids: Optional[List[int]] = []


class RoutineResponse(BaseModel):
    id: int
    nombre: str
    dia: int
    fecha_creacion: Optional[str] = None
    completado_hoy: Optional[bool] = False

    class Config:
        from_attributes = True


class MesocicloCreate(BaseModel):
    fecha_inicio: str
    peso_inicial: int
    medidas: Optional[dict] = {}
    meta: Optional[str] = 'Hipertrofia'
    duracion_semanas: Optional[int] = 4
    frecuencia_medidas: Optional[str] = 'semanal'


class MesocicloResponse(BaseModel):
    id: int
    usuario_id: int
    fecha_inicio: str
    peso_inicial: int
    medidas: Optional[dict] = {}
    meta: Optional[str] = None
    duracion_semanas: Optional[int] = None
    frecuencia_medidas: Optional[str] = None
    historial_medidas: Optional[list] = []
    fecha_creacion: Optional[str] = None

    class Config:
        from_attributes = True


class MedidaSnapshot(BaseModel):
    fecha: str
    semana: int
    medidas: dict

    class Config:
        from_attributes = True


class WeeklyVolume(BaseModel):
    semana: str
    volumen: float


class PersonalRecord(BaseModel):
    ejercicio_id: int
    ejercicio_nombre: str
    peso_max: float
    fecha: str


class UserStatsResponse(BaseModel):
    entrenos_mes: int
    kg_totales_mes: float
    prs_nuevos: int
    volumen_semanal: List[WeeklyVolume]
    personal_records: List[PersonalRecord]


class DiaCompletado(BaseModel):
    dia: str
    completado: bool


class StreakResponse(BaseModel):
    racha: int
    dias_completados: List[DiaCompletado]


class RutinaEjercicioCreate(BaseModel):
    nombre: str
    musculo: Optional[str] = None
    descripcion: Optional[str] = None
    series: Optional[int] = 4
    descanso: Optional[int] = 90
    rir_objetivo: Optional[List[int]] = None


class RutinaEjercicioResponse(BaseModel):
    id: int
    rutina_id: int
    nombre: str
    musculo: Optional[str] = None
    descripcion: Optional[str] = None
    series: Optional[int] = 4
    descanso: Optional[int] = 90
    rir_objetivo: Optional[List[int]] = None