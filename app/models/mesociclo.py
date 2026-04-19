from base_model import BaseModel
from app.models.user import User
from app.models.base_model import BaseModel

class Mesociclo(BaseModel):
    def __init__(self, usuario:User, fecha_inicio:str, peso_inicial:int, fecha_creacion, id=None):
        super().__init__(fecha_creacion, id)
        self.usuario = usuario
        self.fecha_inicio = fecha_inicio
        self.peso_inicial = peso_inicial
        self.medidas = {}
    def __str__(self):
        return f'Usuario: {self.usuario.nombre}\ninicio del mesociclo: {self.fecha_inicio}\nPeso inicial: {self.peso_inicial}kg'
    
    def resumen(self):
        return f'Nombre de usuario:\t\t\t{self.usuario.nombre}\nFecha que inicio el mesociclo:\t\t\t{self.fecha_inicio}\nPeso con el que iniciaste\t\t\t{self.peso_inicial}\nEsta informacion la actualizaste en\t\t\t{self.fecha_creacion}'

