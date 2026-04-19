class Routine:
    def __init__(self, nombre:str, dia:int):
        self.nombre = nombre
        self.dia = dia
        self.ejercicios = []
    
    def __str__(self):
        return f"Split: {self.nombre}\nDia: {self.dia}\nejercicios: {self.ejercicios}"



