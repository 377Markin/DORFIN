from sqlalchemy import Column, String, Integer, Float, Date
from datetime import datetime
from config import Base
from app.models.base_model import BaseModel


class TrainingLog(BaseModel, Base):
    __tablename__ = 'training_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id = Column(Integer, nullable=False, index=True)
    ejercicio_id = Column(Integer, nullable=False, index=True)
    series = Column(Integer)
    repeticiones = Column(String)
    rir = Column(Float)
    descanso = Column(String)
    fecha = Column(Date)
    fecha_creacion = Column(Date)
    anotaciones = Column(String, default='Sin anotaciones')
    nombre_ejercicio = Column(String, nullable=True)

    def __init__(self, usuario_id: int, ejercicio_id: int, series: int,
                    repeticiones: str, rir: float, descanso: str,
                    fecha: str = None, fecha_creacion=None,
                    anotaciones: str = 'Sin anotaciones',
                    nombre_ejercicio: str = None):
        super().__init__(fecha_creacion)
        self.usuario_id = usuario_id
        self.ejercicio_id = ejercicio_id
        self.series = series
        self.repeticiones = repeticiones
        self.rir = rir
        self.descanso = descanso
        self.anotaciones = anotaciones
        self.nombre_ejercicio = nombre_ejercicio
        self.fecha = fecha or datetime.now().strftime("%Y-%m-%d")

    def to_dict(self):
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "ejercicio_id": self.ejercicio_id,
            "series": self.series,
            "repeticiones": self.repeticiones,
            "rir": self.rir,
            "descanso": self.descanso,
            "fecha": str(self.fecha) if self.fecha else None,
            "anotaciones": self.anotaciones,
            "nombre_ejercicio": self.nombre_ejercicio,
            "fecha_creacion": str(self.fecha_creacion) if self.fecha_creacion else None,
        }
