from sqlalchemy import Column, Integer, String, Date
from config import Base
from app.models.base_model import BaseModel


class Routine(BaseModel, Base):
    __tablename__ = 'routines'

    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id = Column(Integer, nullable=False, index=True)
    nombre = Column(String, nullable=False)
    dia = Column(Integer, nullable=False)
    fecha_creacion = Column(Date)
    completado_fecha = Column(Date, nullable=True)

    def __init__(self, usuario_id: int, nombre: str, dia: int, fecha_creacion=None):
        super().__init__(fecha_creacion)
        self.usuario_id = usuario_id
        self.nombre = nombre
        self.dia = dia

    def to_dict(self):
        from datetime import date
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "nombre": self.nombre,
            "dia": self.dia,
            "fecha_creacion": str(self.fecha_creacion) if self.fecha_creacion else None,
            "completado_hoy": self.completado_fecha == date.today(),
        }