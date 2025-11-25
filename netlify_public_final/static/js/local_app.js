
/* local_app.js
  Minimal localStorage-based backend replacement for the converted Flask app.
  It stores three main collections in localStorage:
  - libros: array of book objects {id, titulo, autor, disponible:true/false, ...}
  - usuarios: array of user objects {id, nombre, correo, ...}
  - prestamos: array of loan objects {id, libro_id, usuario_id, fecha_prestamo, fecha_devolucion|null}
*/

(function () {
  // Helpers
  function uuid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
  function load(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || []; } catch(e) { return []; }
  }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  // Initialize collections if empty
  if (!localStorage.getItem('libros')) {
    // Optional sample data - kept minimal to match original look but you wanted original, no extra flair
    save('libros', [
      {"id":"b1","titulo":"Programacion en Python","autor":"Autor A","disponible":true},
      {"id":"b2","titulo":"Estructuras de Datos","autor":"Autor B","disponible":true}
    ]);
  }
  if (!localStorage.getItem('usuarios')) {
    save('usuarios', [
      {"id":"u1","nombre":"Admin","correo":"admin@example.com"}
    ]);
  }
  if (!localStorage.getItem('prestamos')) {
    save('prestamos', []);
  }

  // Core functions
  const state = {
    libros: load('libros'),
    usuarios: load('usuarios'),
    prestamos: load('prestamos')
  };

  function sync() {
    save('libros', state.libros);
    save('usuarios', state.usuarios);
    save('prestamos', state.prestamos);
  }

  // Renderers (update counts and basic lists if placeholders exist)
  function renderCounts() {
    const totalLibros = state.libros.length;
    const disponibles = state.libros.filter(b=>b.disponible).length;
    const totalUsuarios = state.usuarios.length;
    const totalPrestamos = state.prestamos.length;
    const map = {
      total_libros: totalLibros,
      libros_disponibles: disponibles,
      total_usuarios: totalUsuarios,
      total_prestamos: totalPrestamos
    };
    Object.keys(map).forEach(k=>{
      const el = document.getElementById(k);
      if (el) el.textContent = map[k];
    });
  }

  function renderBookLists() {
    // Try to render into common containers if exist
    const booksContainer = document.getElementById('books_list') || document.getElementById('libros_list');
    if (booksContainer) {
      booksContainer.innerHTML = '';
      state.libros.forEach(b => {
        const div = document.createElement('div');
        div.className = 'book-item';
        div.innerHTML = '<strong>' + escapeHtml(b.titulo) + '</strong> — ' + escapeHtml(b.autor)
          + (b.disponible ? ' <em>(Disponible)</em>' : ' <em>(Prestado)</em>')
          + ' <button data-id="'+b.id+'" class="borrow-btn">Prestar</button>';
        booksContainer.appendChild(div);
      });
    }
    // Attach borrow buttons
    document.querySelectorAll('.borrow-btn').forEach(btn => {
      btn.onclick = function(e) {
        const id = this.getAttribute('data-id');
        // open a simple prompt to choose user id
        const userList = state.usuarios.map(u=>u.id+':'+u.nombre).join('\\n');
        const chosen = prompt('Elige usuario (id:nombre)\\n'+userList);
        if (!chosen) return;
        const uid = chosen.split(':')[0];
        createPrestamo(id, uid);
      };
    });
  }

  function renderUserLists() {
    const usersContainer = document.getElementById('users_list') || document.getElementById('usuarios_list');
    if (usersContainer) {
      usersContainer.innerHTML = '';
      state.usuarios.forEach(u => {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.innerHTML = '<strong>' + escapeHtml(u.nombre) + '</strong> — ' + escapeHtml(u.correo)
          + ' <button data-id="'+u.id+'" class="del-user">Eliminar</button>';
        usersContainer.appendChild(div);
      });
    }
    document.querySelectorAll('.del-user').forEach(btn=>{
      btn.onclick = function(){ const id=this.getAttribute('data-id'); deleteUser(id); };
    });
  }

  // CRUD operations
  function addUser(nombre, correo) {
    const id = uuid();
    state.usuarios.push({id, nombre, correo});
    sync(); renderCounts(); renderUserLists();
  }
  function addBook(titulo, autor) {
    const id = uuid();
    state.libros.push({id, titulo, autor, disponible:true});
    sync(); renderCounts(); renderBookLists();
  }
  function createPrestamo(libro_id, usuario_id) {
    const libro = state.libros.find(l=>l.id==libro_id);
    if (!libro) return alert('Libro no encontrado');
    if (!libro.disponible) return alert('Libro no disponible');
    libro.disponible = false;
    const id = uuid();
    state.prestamos.push({id, libro_id, usuario_id, fecha_prestamo: new Date().toISOString(), fecha_devolucion: null});
    sync(); renderCounts(); renderBookLists();
    alert('Prestamo creado');
  }
  function devolverPrestamo(prestamo_id) {
    const p = state.prestamos.find(x=>x.id==prestamo_id);
    if (!p) return;
    p.fecha_devolucion = new Date().toISOString();
    const libro = state.libros.find(l=>l.id==p.libro_id);
    if (libro) libro.disponible = true;
    sync(); renderCounts(); renderBookLists();
  }
  function deleteUser(id) {
    state.usuarios = state.usuarios.filter(u=>u.id!==id);
    sync(); renderCounts(); renderUserLists();
  }

  // Utility to safely escape HTML
  function escapeHtml(text) {
    if (text==null) return '';
    return String(text).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
  }

  // Attachments to forms (if forms exist with ids we expect)
  function bindForms() {
    const userForm = document.getElementById('user-form') || document.querySelector('form#user-form') || document.querySelector('form[data-form="user"]');
    if (userForm) {
      userForm.addEventListener('submit', function(e){
        e.preventDefault();
        const nombre = userForm.querySelector('[name="nombre"]')?.value || userForm.querySelector('[name="name"]')?.value;
        const correo = userForm.querySelector('[name="correo"]')?.value || userForm.querySelector('[name="email"]')?.value;
        if (!nombre) return alert('Introduce nombre');
        addUser(nombre, correo||'');
        userForm.reset();
      });
    }
    const bookForm = document.getElementById('book-form') || document.querySelector('form#book-form') || document.querySelector('form[data-form="book"]');
    if (bookForm) {
      bookForm.addEventListener('submit', function(e){
        e.preventDefault();
        const titulo = bookForm.querySelector('[name="titulo"]')?.value || bookForm.querySelector('[name="title"]')?.value;
        const autor = bookForm.querySelector('[name="autor"]')?.value || bookForm.querySelector('[name="author"]')?.value;
        if (!titulo) return alert('Introduce titulo');
        addBook(titulo, autor||'');
        bookForm.reset();
      });
    }
  }

  // Initial render
  document.addEventListener('DOMContentLoaded', function(){
    // refresh state from localStorage in case other tabs changed
    state.libros = load('libros');
    state.usuarios = load('usuarios');
    state.prestamos = load('prestamos');
    renderCounts();
    renderBookLists();
    renderUserLists();
    bindForms();
    // expose in window for debugging and manual operations
    window.libros = state.libros;
    window.usuarios = state.usuarios;
    window.prestamos = state.prestamos;
    window.addUser = addUser;
    window.addBook = addBook;
    window.createPrestamo = createPrestamo;
    window.devolverPrestamo = devolverPrestamo;
  });

})();\n