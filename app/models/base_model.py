from datetime import datetime

class BaseModel:
    def __init__(self, fecha_creacion=None, id=None):
        self.id = id
        if fecha_creacion is None:
            #si no nos dan fecha la creamos nosotros
            self.fecha_creacion = datetime.now().strftime("%Y-%m-%d")
        else:
            #si tiene fecha asignada usamos la que tiene asignada 
            self.fecha_creacion = fecha_creacion
    def __str__(self):
        return f"Tu ID es: {self.id}\nFue creado en: {self.fecha_creacion}"
    def resumen(self):
        pass
