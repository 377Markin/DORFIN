from sqlalchemy import Column, Integer, String, Float, JSON
from config import Base
from app.models.base_model import BaseModel


class Mesociclo(BaseModel, Base):
    __tablename__ = 'mesociclos'

    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id = Column(Integer, nullable=False, index=True)
    fecha_inicio = Column(String, nullable=False)
    peso_inicial = Column(Float)
    medidas = Column(JSON, default={})
    meta = Column(String, default='Hipertrofia')
    duracion_semanas = Column(Integer, default=4)
    frecuencia_medidas = Column(String, default='semanal')
    historial_medidas = Column(JSON, default=[])
    fecha_creacion = Column(String)

    def __init__(self, usuario_id, fecha_inicio, peso_inicial=None,
                    medidas=None, meta='Hipertrofia', duracion_semanas=4,
                    frecuencia_medidas='semanal', historial_medidas=None,
                    fecha_creacion=None):
        super().__init__(fecha_creacion)
        self.usuario_id = usuario_id
        self.fecha_inicio = fecha_inicio
        self.peso_inicial = peso_inicial
        self.medidas = medidas or {}
        self.meta = meta
        self.duracion_semanas = duracion_semanas
        self.frecuencia_medidas = frecuencia_medidas
        self.historial_medidas = historial_medidas or []

    def to_dict(self):
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "fecha_inicio": self.fecha_inicio,
            "peso_inicial": self.peso_inicial,
            "medidas": self.medidas or {},
            "meta": self.meta,
            "duracion_semanas": self.duracion_semanas,
            "frecuencia_medidas": self.frecuencia_medidas,
            "historial_medidas": self.historial_medidas or [],
            "fecha_creacion": str(self.fecha_creacion) if self.fecha_creacion else None,
        }