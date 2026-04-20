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
    
    def __init__(self, nombre:str, edad:int, altura:int, peso:int, meta:str, email:str, contrasena:str, fecha_creacion:str):
        super().__init__(fecha_creacion)
        self.nombre = nombre
        self.edad = edad
        self.altura = altura
        self.peso = peso
        self.meta = meta
        self.__email = email
        self.__contrasena = contrasena
    
    @property
    def email(self):
        return self.__email
    
    @email.setter
    def email(self, nuevo_email):
        self.__email = nuevo_email
    
    def verificar_contrasena(self, contrasena_ingresada):
        return self.__contrasena == contrasena_ingresada
    
    def cambiar_contrasena(self,contrasena_actual, contrasena_nueva):
        try:
            if self.verificar_contrasena(contrasena_actual):
                self.__contrasena = contrasena_nueva
                return "Contraseña cambiada exitosamente"
            else:
                return "La contraseña no es correcta. Inténtalo de nuevo"
        except Exception as e:
            return f"Error: {e}"
    
    def __str__(self):
        return f"Hola {self.nombre}! estas listo para seguir cumpliendo tu objetivo {self.meta}?"
    
    def resumen(self):
        return f'Nombre:\t\t{self.nombre}\nEdad:\t\t{self.edad}\nAltura:\t\t{self.altura}\nPeso:\t\t{self.peso}\nObjetivo:\t{self.meta}\nFecha de creacion:\t{self.fecha_creacion}'
