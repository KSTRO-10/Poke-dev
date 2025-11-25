from flask import Flask, render_template, request, redirect, url_for, flash, session
from datetime import datetime, timedelta
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

# Diccionarios para almacenar datos
libros = {
    1: {"titulo": "Python para Principiantes", "autor": "Juan Pérez", "año": 2020, "disponible": True},
    2: {"titulo": "Estructuras de Datos", "autor": "María García", "año": 2019, "disponible": True},
    3: {"titulo": "Algoritmos Avanzados", "autor": "Carlos López", "año": 2021, "disponible": True},
    4: {"titulo": "Desarrollo Web", "autor": "Ana Martínez", "año": 2022, "disponible": True},
    5: {"titulo": "Base de Datos", "autor": "Luis Rodríguez", "año": 2018, "disponible": True}
}

usuarios = {
    1: {"nombre": "Ash Ketchum", "email": "ash@pokedev.com", "libros_prestados": set()},
    2: {"nombre": "Misty Waterflower", "email": "misty@pokedev.com", "libros_prestados": set()},
    3: {"nombre": "Brock Harrison", "email": "brock@pokedev.com", "libros_prestados": set()}
}

# Diccionario de préstamos: {id_prestamo: {id_usuario, id_libro, fecha_prestamo, fecha_devolucion}}
prestamos = {}
contador_prestamo = 1

# Conjuntos para búsquedas rápidas
libros_disponibles = {1, 2, 3, 4, 5}
libros_prestados = set()
autores = {"Juan Pérez", "María García", "Carlos López", "Ana Martínez", "Luis Rodríguez"}

@app.route('/')
def index():
    return render_template('index.html', 
                         total_libros=len(libros),
                         libros_disponibles=len(libros_disponibles),
                         total_usuarios=len(usuarios),
                         prestamos_activos=len(prestamos))

@app.route('/libros')
def listar_libros():
    return render_template('libros.html', libros=libros, libros_disponibles=libros_disponibles)

@app.route('/libros/agregar', methods=['GET', 'POST'])
def agregar_libro():
    if request.method == 'POST':
        nuevo_id = max(libros.keys()) + 1 if libros else 1
        titulo = request.form['titulo']
        autor = request.form['autor']
        año = int(request.form['año'])
        
        libros[nuevo_id] = {
            "titulo": titulo,
            "autor": autor,
            "año": año,
            "disponible": True
        }
        libros_disponibles.add(nuevo_id)
        autores.add(autor)
        
        flash(f'Libro "{titulo}" agregado exitosamente', 'success')
        return redirect(url_for('listar_libros'))
    
    return render_template('agregar_libro.html')

@app.route('/usuarios')
def listar_usuarios():
    return render_template('usuarios.html', usuarios=usuarios)

@app.route('/usuarios/agregar', methods=['GET', 'POST'])
def agregar_usuario():
    if request.method == 'POST':
        nuevo_id = max(usuarios.keys()) + 1 if usuarios else 1
        nombre = request.form['nombre']
        email = request.form['email']
        
        usuarios[nuevo_id] = {
            "nombre": nombre,
            "email": email,
            "libros_prestados": set()
        }
        
        flash(f'Usuario "{nombre}" agregado exitosamente', 'success')
        return redirect(url_for('listar_usuarios'))
    
    return render_template('agregar_usuario.html')

@app.route('/prestamos')
def listar_prestamos():
    return render_template('prestamos.html', prestamos=prestamos, libros=libros, usuarios=usuarios)

@app.route('/prestamos/realizar', methods=['GET', 'POST'])
def realizar_prestamo():
    if request.method == 'POST':
        global contador_prestamo
        id_usuario = int(request.form['usuario'])
        id_libro = int(request.form['libro'])
        
        if id_libro not in libros_disponibles:
            flash('El libro no está disponible', 'error')
            return redirect(url_for('realizar_prestamo'))
        
        # Realizar préstamo
        fecha_prestamo = datetime.now()
        fecha_devolucion = fecha_prestamo + timedelta(days=14)
        
        prestamos[contador_prestamo] = {
            "id_usuario": id_usuario,
            "id_libro": id_libro,
            "fecha_prestamo": fecha_prestamo,
            "fecha_devolucion": fecha_devolucion
        }
        
        # Actualizar disponibilidad
        libros[id_libro]["disponible"] = False
        libros_disponibles.discard(id_libro)
        libros_prestados.add(id_libro)
        usuarios[id_usuario]["libros_prestados"].add(id_libro)
        
        contador_prestamo += 1
        flash('Préstamo realizado exitosamente', 'success')
        return redirect(url_for('listar_prestamos'))
    
    # Filtrar solo libros disponibles y usuarios
    return render_template('realizar_prestamo.html', 
                         libros=libros, 
                         usuarios=usuarios,
                         libros_disponibles=libros_disponibles)

@app.route('/prestamos/devolver/<int:id_prestamo>')
def devolver_libro(id_prestamo):
    if id_prestamo in prestamos:
        prestamo = prestamos[id_prestamo]
        id_libro = prestamo["id_libro"]
        id_usuario = prestamo["id_usuario"]
        
        # Actualizar disponibilidad
        libros[id_libro]["disponible"] = True
        libros_disponibles.add(id_libro)
        libros_prestados.discard(id_libro)
        usuarios[id_usuario]["libros_prestados"].discard(id_libro)
        
        # Eliminar préstamo
        del prestamos[id_prestamo]
        
        flash('Libro devuelto exitosamente', 'success')
    else:
        flash('Préstamo no encontrado', 'error')
    
    return redirect(url_for('listar_prestamos'))

@app.route('/buscar', methods=['GET', 'POST'])
def buscar():
    resultados = []
    termino = ""
    
    if request.method == 'POST':
        termino = request.form['termino'].lower()
        
        # Buscar en títulos y autores
        for id_libro, libro in libros.items():
            if (termino in libro["titulo"].lower() or 
                termino in libro["autor"].lower()):
                resultados.append({
                    "id": id_libro,
                    "libro": libro,
                    "disponible": id_libro in libros_disponibles
                })
    
    return render_template('buscar.html', resultados=resultados, termino=termino)

@app.route('/estadisticas')
def estadisticas():
    # Operaciones con conjuntos para estadísticas
    total_libros = len(libros)
    disponibles = len(libros_disponibles)
    prestados = len(libros_prestados)
    total_autores = len(autores)
    
    # Usuarios con préstamos activos
    usuarios_activos = set()
    for prestamo in prestamos.values():
        usuarios_activos.add(prestamo["id_usuario"])
    
    return render_template('estadisticas.html',
                         total_libros=total_libros,
                         disponibles=disponibles,
                         prestados=prestados,
                         total_autores=total_autores,
                         usuarios_activos=len(usuarios_activos),
                         prestamos_activos=len(prestamos),
                         autores=autores)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
