# DORFIN - Training Manager

**DORFIN** es una herramienta de gestión de entrenamiento de fuerza diseñada para eliminar la fricción al registrar series, repeticiones y RIR (*Repetitions in Reserve*), permitiendo que el atleta se enfoque en lo que importa: el rendimiento.

---

## Stack Tecnológico

- **Backend:** Python 3 + FastAPI
- **Base de datos:** PostgreSQL + SQLAlchemy ORM
- **Frontend:** React PWA *(en desarrollo)*
- **API externa:** Wger Workout Manager

---

## Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/377Markin/DORFIN.git
cd DORFIN
```

### 2. Crear y activar el entorno virtual

```bash
python -m venv venv
source venv/bin/activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```
DATABASE_URL=postgresql://tu_usuario@localhost:5432/dorfin
```

> Reemplaza `tu_usuario` con tu usuario de PostgreSQL. Asegúrate de tener una base de datos llamada `dorfin` creada.

### 5. Levantar el servidor

```bash
uvicorn main:app --reload
```

La API estará disponible en: `http://127.0.0.1:8000`

Documentación interactiva: `http://127.0.0.1:8000/docs`

---

## Estructura del Proyecto

```
DORFIN/
├── app/
│   ├── models/          # Modelos POO con SQLAlchemy
│   ├── services/        # Lógica de negocio y CRUD
│   └── controllers/     # Endpoints FastAPI
├── config/              # Configuración de la base de datos
├── tests/               # Pruebas unitarias con pytest
├── main.py              # Punto de entrada de la aplicación
├── requirements.txt
└── README.md
```

---

## Pruebas Unitarias

```bash
pytest tests/ -v
```

---

## Características Principales

- Registro de entrenamiento con series, repeticiones y RIR
- Historial de carga por ejercicio
- Integración con Wger para catálogo de ejercicios
- Arquitectura modular con separación de responsabilidades
- Encapsulamiento y herencia en los modelos de datos

---

## Control de Versiones

El proyecto sigue el modelo **Gitflow**:

- `main` → código estable / producción
- `develop` → integración del sprint actual
- `feature/*` → desarrollo de funcionalidades específicas