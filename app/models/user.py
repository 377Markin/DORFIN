from base_model import BaseModel

class User(BaseModel):
    def __init__(self, nombre:str, edad:int, altura:int, peso:int, meta:str, email:str, contrasena:str, fecha_creacion:str):
        super().__init__(fecha_creacion)
        self.nombre = nombre
        self.edad = edad
        self.altura = altura
        self.peso = peso
        self.meta = meta
        self.email = email
        self.contrasena = contrasena
    
    def __str__(self):
        return f"Hola {self.nombre}! estas listo para seguir cumpliendo tu objetivo {self.meta}?"

