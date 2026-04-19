from base_model import BaseModel
from user import User

class Mesociclo(BaseModel):
    def __init__(self, usuario:User, fecha_inicio:str, peso_inicial:int, fecha_creacion, id=None):
        super().__init__(fecha_creacion, id)
        self.usuario = usuario
        self.fecha_inicio = fecha_inicio
        self.peso_inicial = peso_inicial
        self.medidas = {}
    def __str__(self):
        return f'Usuario: {self.usuario.nombre}\ninicio del mesociclo: {self.fecha_inicio}\nPeso inicial: {self.peso_inicial}kg'

