from base_model import BaseModel

class Exercise(BaseModel):
    def __init__(self, nombre:str, musculo:str, descripcion:str, fecha_creacion:str):
        super().__init__(fecha_creacion)
        self.nombre = nombre
        self.musculo = musculo
        self.descripcion = descripcion
    
    def __str__(self):
        return f'\nEJERCICIO: {self.nombre}\nMusculo: {self.musculo}\nDescripcion: {self.descripcion}'
    
    def resumen(self):
        return f'Nombre del ejercicio:\t{self.nombre}\nMusculo que trabaja:\t{self.musculo}\nDescripcion del ejercicio:\t{self.descripcion}\nFecha de creacion:\t{self.fecha_creacion}'

