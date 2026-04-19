class Exercise:
    def __init__(self, nombre:str, musculo:str, descripcion:str):
        self.nombre = nombre
        self.musculo = musculo
        self.descripcion = descripcion
    
    def __str__(self):
        return f'\nEJERCICIO: {self.nombre}\nMusculo: {self.musculo}\nDescripcion: {self.descripcion}'
