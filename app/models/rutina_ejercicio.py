from sqlalchemy import Column, Integer, String, ForeignKey
from config import Base
import json

class RutinaEjercicio(Base):
    __tablename__ = "rutina_ejercicios"

    id = Column(Integer, primary_key=True, index=True)
    rutina_id = Column(Integer, ForeignKey("routines.id", ondelete="CASCADE"), nullable=False)
    nombre = Column(String(100), nullable=False)
    musculo = Column(String(100), nullable=True)
    descripcion = Column(String(300), nullable=True)
    series = Column(Integer, default=4)
    descanso = Column(Integer, default=90)
    rir_objetivo = Column(String, nullable=True)  # JSON array ej: "[1,1,0,0]"

    def to_dict(self):
        rir_list = None
        if self.rir_objetivo:
            try:
                rir_list = json.loads(self.rir_objetivo)
            except Exception:
                rir_list = None
        return {
            "id": self.id,
            "rutina_id": self.rutina_id,
            "nombre": self.nombre,
            "musculo": self.musculo,
            "descripcion": self.descripcion,
            "series": self.series or 4,
            "descanso": self.descanso or 90,
            "rir_objetivo": rir_list,
        }