from config import Base, engine
from app.models.user import User
from app.models.exercise import Exercise
from app.models.routine import Routine
from app.models.traininglog import TrainingLog

Base.metadata.create_all(engine)
print("Tablas creadas exitosamente")