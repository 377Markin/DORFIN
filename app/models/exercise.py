from config import Base
from sqlalchemy import Column, Integer, String, Date
from app.models.base_model import BaseModel

class Exercise(BaseModel, Base):
    __tablename__ = 'exercises'
    id = Column(Integer, primary_key=True)
    nombre = Column(String)
    musculo = Column(String)
    descripcion = Column(String)
    fecha_creacion = Column(Date)

    def __init__(self, nombre:str, musculo:str, descripcion:str, fecha_creacion:str):
        super().__init__(fecha_creacion)
        self.nombre = nombre
        self.musculo = musculo
        self.descripcion = descripcion
    
    def __str__(self):
        return f'\nEJERCICIO: {self.nombre}\nMusculo: {self.musculo}\nDescripcion: {self.descripcion}'
    
    def resumen(self):
        return f'Nombre del ejercicio:\t{self.nombre}\nMusculo que trabaja:\t{self.musculo}\nDescripcion del ejercicio:\t{self.descripcion}\nFecha de creacion:\t{self.fecha_creacion}'

