from config import Base, engine
from app.models.user import User

Base.metadata.create_all(engine)
print("Tablas creadas exitosamente")