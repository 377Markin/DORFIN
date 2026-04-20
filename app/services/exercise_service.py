import requests

def conexion():
    url = "https://wger.de/api/v2/exercise/?status=2"   
    try:
        respuesta = requests.get(url)
        datos = respuesta.json()
        return datos.get('results', [])
    except Exception as e:
        return f"Error {e}"

if __name__ == "__main__":
    resultado = conexion()
    if isinstance(resultado, list) and len(resultado) > 0:
        print("--- PRUEBA MANUAL EXITOSA ---")
        print(f"Se encontraron {len(resultado)} ejercicios.")
    else:
        print("No se recibieron datos.")