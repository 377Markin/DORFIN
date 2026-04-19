class User:
    def __init__(self, nombre:str, edad:int, altura:int, peso:int, meta:str, email:str, contrasena:str):
        self.nombre = nombre
        self.edad = edad
        self.altura = altura
        self.peso = peso
        self.meta = meta
        self.email = email
        self.contrasena = contrasena
    
    def __str__(self):
        return f"Hola {self.nombre}! estas listo para seguir cumpliendo tu objetivo {self.meta}?"
