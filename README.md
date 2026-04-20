# DORFIN
Herramienta de gestión de entrenamiento de fuerza. FastAPI + PostgreSQL + React PWA.

# DORFIN - Training Manager

**DORFIN** es una solución integral diseñada para optimizar el registro de entrenamiento de fuerza. El objetivo principal es eliminar la fricción al anotar series, repeticiones y RIR (*Repetitions in Reserve*), permitiendo que el atleta se enfoque en lo que realmente importa: el rendimiento.

## Características Principales
* **Registro Inteligente:** Minimiza el tiempo de anotación entre series.
* **Memoria de Carga:** Sugiere automáticamente los pesos levantados en la sesión anterior.
* **Enciclopedia de Ejercicios:** Integración con APIs externas para consultar guías técnicas.
* **Arquitectura Robusta:** Construido con **FastAPI**, **PostgreSQL** y **SQLAlchemy**.

---

## Instalación y Configuración

### 1. Clonar el repositorio y preparar el entorno
```bash
# Activar el entorno virtual (en Arch Linux)
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt