import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import Base, engine

from app.models import rutina_ejercicio  # noqa: F401
from app.controllers.auth import router as auth_router
from app.controllers.training_logs import router as logs_router
from app.controllers.routines import router as routines_router
from app.controllers.mesociclos import router as mesos_router
from app.controllers.exercises import router as exercises_router
from app.controllers.rutina_ejercicios import router as rutina_ejercicios_router

# Crear todas las tablas al iniciar
Base.metadata.create_all(engine)

app = FastAPI(
    title="DORFIN API",
    description="API para gestión de entrenamiento fitness",
    version="2.0.0",
)

# ── CORS ────────────────────────────────────────────────────
origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(logs_router)
app.include_router(routines_router)
app.include_router(mesos_router)
app.include_router(exercises_router)
app.include_router(rutina_ejercicios_router)


@app.get("/", tags=["Health"])
def health():
    return {"status": "ok", "version": "2.0.0", "docs": "/docs"}