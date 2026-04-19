from base_model import BaseModel

class Routine(BaseModel):
    def __init__(self, nombre:str, dia:int, fecha_creacion:str):
        super().__init__(fecha_creacion)
        self.nombre = nombre
        self.dia = dia
        self.ejercicios = []
    
    def __str__(self):
        return f"Split: {self.nombre}\nDia: {self.dia}\nejercicios: {self.ejercicios}"



