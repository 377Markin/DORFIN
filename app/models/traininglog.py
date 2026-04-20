from config import Base
from app.models.user import User
from app.models.exercise import Exercise
from app.models.base_model import BaseModel
from sqlalchemy import Column, String, Integer, Float, Date
from datetime import datetime

class TrainingLog(BaseModel, Base):
    __tablename__ = 'training_logs'
    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer)
    ejercicio_id = Column(Integer)
    series = Column(Integer)
    repeticiones = Column(String)
    rir = Column(Float)
    descanso = Column(String)
    fecha = Column(Date)
    fecha_creacion = Column(Date)
    anotaciones = Column(String)
    def __init__(self, usuario:User, ejercicio:Exercise, series:int, repeticiones:str, rir:float, descanso:str, fecha:str, fecha_creacion = None, anotaciones:str = ('Sin anotaciones')):
        super().__init__(fecha_creacion)
        
        if fecha is None:
            self.fecha = datetime.now().strftime("%Y-%m-%d")
        else:
            self.fecha = fecha
        
        self.usuario_id = usuario.id
        self.ejercicio_id = ejercicio.id
        self.series = series
        self.repeticiones = repeticiones
        self.rir = rir
        self.descanso = descanso
        self.anotaciones = anotaciones
    def __str__(self):
        return f'Bienvenido {self.usuario_id}\nEjercicio: \t{self.ejercicio_id}\nRepeticiones: \t{self.repeticiones}\nRIR: \t\t{self.rir}\nDescanso: \t{self.descanso}\nAnotaciones: \t{self.anotaciones}\nFecha: \t\t{self.fecha}'
