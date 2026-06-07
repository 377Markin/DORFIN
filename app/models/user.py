from sqlalchemy import Column, Integer, String
from config import Base
from app.models.base_model import BaseModel


class User(BaseModel, Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String, nullable=False)
    fecha_nacimiento = Column(String)
    altura = Column(Integer)
    peso = Column(Integer)
    meta = Column(String)
    fecha_creacion = Column(String)
    email = Column(String, unique=True, nullable=False, index=True)
    contrasena = Column(String, nullable=False)

    def __init__(self, nombre: str, email: str, contrasena: str,
                 fecha_nacimiento: str = None, altura: int = None, peso: int = None,
                 meta: str = None, fecha_creacion=None):
        super().__init__(fecha_creacion)
        self.nombre = nombre
        self.email = email
        self.contrasena = contrasena
        self.fecha_nacimiento = fecha_nacimiento
        self.altura = altura
        self.peso = peso
        self.meta = meta

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "email": self.email,
            "fecha_nacimiento": self.fecha_nacimiento,
            "altura": self.altura,
            "peso": self.peso,
            "meta": self.meta,
            "fecha_creacion": str(self.fecha_creacion) if self.fecha_creacion else None,
        }

    def __str__(self):
        return f"Usuario: {self.nombre} <{self.email}>"