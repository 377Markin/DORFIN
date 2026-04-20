from sqlalchemy import Column, Integer, String
from config import Base
from app.models.base_model import BaseModel

class User(BaseModel, Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    nombre = Column(String)
    edad = Column(Integer)
    altura = Column(Integer)
    peso = Column(Integer)
    meta = Column(String)
    fecha_creacion = Column(String)
    email = Column(String, unique=True, nullable=False)
    contrasena = Column(String, nullable=False)
    
    def __init__(self, nombre:str, edad:int, altura:int, peso:int, meta:str, email:str, contrasena:str, fecha_creacion = None):
        super().__init__(fecha_creacion)
        self.nombre = nombre
        self.edad = edad
        self.altura = altura
        self.peso = peso
        self.meta = meta
        self.email = email
        self.contrasena = contrasena
    
    def verificar_contrasena(self, contrasena_ingresada):
        return self.contrasena == contrasena_ingresada
    
    def cambiar_contrasena(self,contrasena_actual, contrasena_nueva):
        try:
            if self.verificar_contrasena(contrasena_actual):
                self.contrasena = contrasena_nueva
                return "Contraseña cambiada exitosamente"
            else:
                return "La contraseña no es correcta. Inténtalo de nuevo"
        except Exception as e:
            return f"Error: {e}"
    
    def __str__(self):
        return f"Hola {self.nombre}! estas listo para seguir cumpliendo tu objetivo {self.meta}?"
    
    def resumen(self):
        return f'Nombre:\t\t{self.nombre}\nEdad:\t\t{self.edad}\nAltura:\t\t{self.altura}\nPeso:\t\t{self.peso}\nObjetivo:\t{self.meta}\nFecha de creacion:\t{self.fecha_creacion}'
    
    def saludar(self):
        mensajes = {
        "Hipertrofia": "¡Dale con toda a reventar esas fibras!",
        "Bajar de peso": "¡A quemar grasa, nadie lo hará por ti!",
        "Powerlifting": "¡Vamos máquina de mover peso!",
        "Definicion": "¡No te rindas, ya casi se ven esos cortes!",
        "Volumen": "¡Tu puedes, devorador de pollos!"
    }
        objetivo = self.meta.capitalize()
        saludo = mensajes.get(objetivo, "¡A darle con toda, maquina!")
        return f"{self.nombre}: {saludo}"
