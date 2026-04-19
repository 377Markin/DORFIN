from user import User
from exercise import Exercise

class TrainingLog:
    def __init__(self, usuario:User, ejercicio:Exercise, series:int, repeticiones:str, rir:float, descanso:str, fecha:str, anotaciones:str = ('Sin anotaciones')):
        self.usuario = usuario
        self.ejercicio = ejercicio
        self.series = series
        self.repeticiones = repeticiones
        self.rir = rir
        self.descanso = descanso
        self.fecha = fecha 
        self.anotaciones = anotaciones
    def __str__(self):
        return f'Bienvenido {self.usuario.nombre}\nEjercicio: \t{self.ejercicio.nombre}\nRepeticiones: \t{self.repeticiones}\nRIR: \t\t{self.rir}\nDescanso: \t{self.descanso}\nAnotaciones: \t{self.anotaciones}\nFecha: \t\t{self.fecha}'
