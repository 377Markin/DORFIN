import sys
sys.path.insert(0, 'app/models')
from app.models.user import User

def test_verificar_contrasena_correcta():
    u = User("Mahicol", 19, 177, 97, "Hipertrofia", "mahi@gmail.com", "1234", "04/19/2026")
    assert u.verificar_contrasena("1234") == True

def test_verificar_email_correcto():
    u = User("Mahicol", 19, 177, 97, "Hipertrofia", "mahi@gmail.com", "1234", "04/19/2026")
    assert u.email == "mahi@gmail.com"

def test_cambiar_contrasena():
    u = User("Mahicol", 19, 177, 97, "Hipertrofia", "mahi@gmail.com", "1234", "04/19/2026")
    u.cambiar_contrasena("1234", "nueva123")
    assert u.verificar_contrasena("nueva123") == True

def test_cambiar_contrasena_incorrecta():
    u = User("Mahicol", 19, 177, 97, "Hipertrofia", "mahi@gmail.com", "1234", "04/19/2026")
    u.cambiar_contrasena("wrongpass", "nueva123")
    assert u.verificar_contrasena("1234") == True 