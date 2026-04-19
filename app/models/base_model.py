class BaseModel:
    def __init__(self, fecha_creacion:str, id=None):
        self.id = id
        self.fecha_creacion = fecha_creacion
    def __str__(self):
        return f"Tu ID es: {self.id}\nFue creado en: {self.fecha_creacion}"
    def resumen(self):
        pass
    