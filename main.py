from fastapi import FastAPI
from config import Base, engine
from app.services.exercise_service import conexion
from app.services.user_service import obtener_usuarios

# Crear las tablas en PostgreSQL al iniciar el servidor
Base.metadata.create_all(engine)

app = FastAPI(
    title="DORFIN API",
    description="API para gestión de entrenamiento",
    version="1.0.0"
)

@app.get("/", tags=["Inicio"])
def read_root():
    """Punto de entrada a la API"""
    return {
        "message": "DORFIN API está viva",
        "docs": "/docs"
    }

@app.get("/ejercicios", tags=["Externo"])
def get_ejercicios():
    """Obtiene ejercicios desde la API externa de Wger"""
    return conexion()

@app.get("/usuarios", tags=["Usuarios"])
def ver_usuarios():
    """Obtiene la lista de usuarios registrados en la base de datos local"""
    usuarios = obtener_usuarios()
    return [
        {
            "id": u.id, 
            "nombre": u.nombre, 
            "meta": u.meta
        } for u in usuarios
    ]