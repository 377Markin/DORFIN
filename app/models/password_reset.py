from sqlalchemy import Column, Integer, String, Boolean, DateTime
from config import Base

class PasswordResetCode(Base):
    __tablename__ = 'password_reset_codes'

    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id = Column(Integer, nullable=False)
    codigo = Column(String(6), nullable=False)
    expira_en = Column(DateTime, nullable=False)
    usado = Column(Boolean, default=False)