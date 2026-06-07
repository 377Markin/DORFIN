# DORFIN — Guía de Instalación y Desarrollo

## Stack
- **Backend:** FastAPI + PostgreSQL + JWT
- **Frontend:** React + Vite + PWA + TailwindCSS

---

## 1. Backend — Setup

```bash
cd DORFIN-backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env .env.local
# Editar .env con tu DATABASE_URL real
```

### Variables de entorno backend (`.env`)
```
DATABASE_URL=postgresql://usuario:password@localhost:5432/dorfin
SECRET_KEY=cambia-esto-en-produccion-minimo-32-chars
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
GOOGLE_CLIENT_ID=          # Opcional — para OAuth Google
```

### Crear base de datos PostgreSQL
```sql
CREATE DATABASE dorfin;
```

### Correr el backend
```bash
uvicorn main:app --reload --port 8000
# Swagger disponible en: http://localhost:8000/docs
```

Las tablas se crean automáticamente al iniciar (`Base.metadata.create_all(engine)`).

---

## 2. Frontend PWA — Setup

```bash
cd dorfin-pwa

# Instalar dependencias
npm install

# Variables de entorno
cp .env .env.local
# VITE_API_URL=http://localhost:8000

# Desarrollo
npm run dev
# App en: http://localhost:5173

# Build producción
npm run build

# Tests
npm run test
```

---

## 3. Endpoints disponibles

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/register` | ❌ | Registrar usuario |
| POST | `/auth/login` | ❌ | Login con email/contraseña |
| POST | `/auth/google` | ❌ | OAuth Google |
| POST | `/auth/refresh` | ❌ | Renovar tokens |
| POST | `/auth/logout` | ✅ | Cerrar sesión |
| GET | `/auth/me` | ✅ | Perfil del usuario |
| GET | `/training-logs/` | ✅ | Mis logs |
| POST | `/training-logs/` | ✅ | Crear log |
| GET | `/training-logs/streak` | ✅ | Racha actual |
| GET | `/training-logs/stats` | ✅ | Stats del mes |
| GET | `/training-logs/ultimo/{ejercicio_id}` | ✅ | ⭐ Último log de un ejercicio |
| GET | `/ejercicios/` | ❌ | Lista ejercicios |
| POST | `/ejercicios/` | ✅ | Crear ejercicio |
| GET | `/rutinas/` | ✅ | Mis rutinas |
| POST | `/rutinas/` | ✅ | Crear rutina |
| GET | `/mesociclos/activo` | ✅ | Mesociclo activo |
| POST | `/mesociclos/` | ✅ | Crear mesociclo |

---

## 4. Estructura del Proyecto

```
DORFIN-backend/
├── main.py                    # FastAPI app + CORS + routers
├── requirements.txt           # Dependencias Python
├── .env                       # Variables de entorno
├── app/
│   ├── controllers/           # Endpoints REST
│   │   ├── auth.py            # JWT auth completo
│   │   ├── training_logs.py   # Logs + streak + stats
│   │   ├── routines.py        # CRUD rutinas
│   │   ├── mesociclos.py      # CRUD mesociclos
│   │   └── exercises.py       # Ejercicios
│   ├── models/                # SQLAlchemy models
│   ├── schemas/               # Pydantic DTOs
│   ├── services/              # Lógica de negocio
│   └── utils/
│       ├── jwt.py             # Tokens, hash, verify
│       └── deps.py            # FastAPI dependencies

dorfin-pwa/
├── src/
│   ├── pages/                 # Pantallas completas
│   │   ├── AuthPage.tsx       # Login / Registro
│   │   ├── HomePage.tsx       # Dashboard + racha
│   │   ├── RutinasPage.tsx    # Lista de días
│   │   ├── RutinaDetailPage.tsx # Ejercicios del día
│   │   ├── EjercicioPage.tsx  # ⭐ Ejecución + UltimaVezCard
│   │   ├── MesocicloPage.tsx  # Mapa de semanas
│   │   └── PerfilPage.tsx     # Stats + PRs
│   ├── components/
│   │   └── shared/            # BottomNav, Loading, etc.
│   ├── lib/
│   │   ├── api/               # Axios client + funciones
│   │   ├── stores/            # Zustand (auth, workout)
│   │   ├── hooks/             # React Query hooks
│   │   └── validators.ts      # Zod schemas
│   └── types/index.ts         # TypeScript types
```

---

## 5. Flujo de autenticación

```
1. Usuario ingresa email
   → Si existe → pantalla contraseña → login → JWT tokens
   → Si no existe → registro completo → JWT tokens

2. Tokens guardados en:
   - Zustand store (memoria)
   - localStorage (persistencia entre sesiones)

3. Axios interceptor adjunta Bearer token en cada request

4. Si 401 → intenta refresh automático
   → Si falla → redirect a /auth
```

---

## 6. Agregar imágenes de ejercicios

Cuando tengas tus imágenes:

1. Guárdalas en el backend como archivos estáticos:
```python
# En main.py, agregar:
from fastapi.staticfiles import StaticFiles
app.mount("/images", StaticFiles(directory="static/images"), name="images")
```

2. El campo `imagen_url` en cada ejercicio apuntará a:
```
http://localhost:8000/images/press-banca.png
```

3. El frontend ya tiene el componente `ExerciseCard` listo para mostrarlas.

---

## 7. Instalar como PWA en el celular

1. Abre `http://TU_IP_LOCAL:5173` en Chrome para Android
2. Menú → "Agregar a pantalla de inicio"
3. O en iOS Safari → Compartir → "Añadir a pantalla de inicio"

Para exponer en la red local:
```bash
npm run dev -- --host
```
