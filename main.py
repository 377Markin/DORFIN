from config import Base, engine
from app.models.user import User
from app.models.exercise import Exercise
from app.models.routine import Routine
from app.models.traininglog import TrainingLog
from app.services.user_service import obtener_usuarios, actualizar_usuario, eliminar_usuario, crear_usuario

Base.metadata.create_all(engine)
print("Tablas creadas exitosamente")

from app.services.user_service import crear_usuario

# resultado = crear_usuario("Mahicol", 19, 177, 97, "Hipertrofia", "mahi@gmail.com", "1234", "2026-04-19")
# print(resultado)

# print(actualizar_usuario(1,90))

usuarios = obtener_usuarios()
for u in usuarios:
    print(u.resumen())

# print(eliminar_usuario(2))