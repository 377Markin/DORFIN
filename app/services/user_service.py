from config import SessionLocal
from app.models.user import User

def crear_usuario(nombre, edad, altura, peso, meta, email, contrasena, fecha_creacion):
    db = SessionLocal() 
    try:
        usuario = User(nombre, edad, altura, peso, meta, email, contrasena, fecha_creacion)
        db.add(usuario)
        db.commit()
        return "Usuario creado exitosamente"
    except Exception as e:
        db.rollback()
        return f"Error: {e}"
    finally:
        db.close()

def obtener_usuarios():
    db = SessionLocal()
    try:
        usuarios = db.query(User).all()
        return usuarios
    except Exception as e:
        return f'Error {e}'
    finally:
        db.close()

def actualizar_usuario(id, nuevo_peso):
    db = SessionLocal()
    try:
        usuario = db.query(User).filter(User.id == id).first()
        if usuario is None:
            return "Usuario no encontrado"
        usuario.peso = nuevo_peso
        db.commit()
        return "Usuario actualizado exitosamente"
    except Exception as e:
        db.rollback()
        return f'Erorr {e}'
    finally:
        db.close()

def eliminar_usuario(id):
    db = SessionLocal()
    try:
        usuario = db.query(User).filter(User.id == id).first()
        if usuario is None:
            return "Usuario no encontrado"
        db.delete(usuario)
        db.commit()
        return "Usuario borrado exitosamente"
    except Exception as e:
        db.rollback()
        return f'Error {e}'
    finally:
        db.close()