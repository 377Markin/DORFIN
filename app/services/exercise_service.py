import requests

def conexion():
    url = "https://wger.de/api/v2/exerciseinfo/?format=json&language=2&limit=20"
    try:
        respuesta = requests.get(url, timeout=10)
        respuesta.raise_for_status()
        datos = respuesta.json()
        
        ejercicios = []
        for ejercicio in datos.get('results', []):
            # Buscar el nombre en inglés (language=2)
            nombre = "Sin nombre"
            for traduccion in ejercicio.get('translations', []):
                if traduccion.get('language') == 2:
                    nombre = traduccion.get('name', 'Sin nombre')
                    break
            
            ejercicios.append({
                "id": ejercicio.get('id'),
                "nombre": nombre,
                "categoria": ejercicio.get('category', {}).get('name', ''),
                "musculos": [m.get('name') for m in ejercicio.get('muscles', [])],
            })
        
        return ejercicios
    
    except requests.exceptions.Timeout:
        return {"error": "Wger no respondió a tiempo"}
    except requests.exceptions.ConnectionError:
        return {"error": "No hay conexión con Wger"}
    except Exception as e:
        return {"error": str(e)}