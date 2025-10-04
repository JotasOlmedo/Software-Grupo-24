document.addEventListener("DOMContentLoaded", () => {
  const userList = document.getElementById("userList");
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const usuarioAdmin = currentUser ? currentUser.name : "Admin_desconocido";

  // Modal de edición
  const modal = document.createElement("div");
  modal.id = "modalEditar";
  modal.className = "hidden fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center";
  modal.innerHTML = `
    <div class="bg-white p-6 rounded w-96">
      <h2 class="text-lg font-bold mb-4">Editar Usuario</h2>
      <form id="formEditar" class="space-y-2">
        <input type="hidden" id="editarId">
        <label>Nombre</label>
        <input type="text" id="editarNombre" class="border p-2 w-full mb-2">
        <label>Apellido</label>
        <input type="text" id="editarApellido" class="border p-2 w-full mb-2">
        <label>RUT</label>
        <input type="text" id="editarRut" class="border p-2 w-full mb-2">
        <label>Correo</label>
        <input type="email" id="editarCorreo" class="border p-2 w-full mb-2">
        <label>Contraseña (opcional)</label>
        <input type="password" id="editarContrasena" class="border p-2 w-full mb-2">
        <div class="flex justify-end gap-2">
          <button type="button" id="cerrarModal" class="bg-gray-400 px-3 py-1 rounded">Cancelar</button>
          <button type="submit" class="bg-blue-500 text-white px-3 py-1 rounded">Guardar</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const cerrarModal = () => modal.classList.add("hidden");
  document.getElementById("cerrarModal").addEventListener("click", cerrarModal);

  // Cargar usuarios
  const cargarUsuarios = async () => {
    try {
      const resUsuarios = await fetch("http://localhost:3000/api/usuarios");
      if (!resUsuarios.ok) throw new Error("No se pudo cargar usuarios");
      const usuarios = await resUsuarios.json();

      const resRoles = await fetch("http://localhost:3000/api/roles");
      const roles = await resRoles.ok ? await resRoles.json() : [];

      userList.innerHTML = "";
      if (!usuarios.length) {
        userList.innerHTML = `<p class="text-gray-600">No hay usuarios registrados.</p>`;
        return;
      }

      const table = document.createElement("table");
      table.className = "w-full border-collapse";
      table.innerHTML = `
        <thead>
          <tr class="bg-gray-200">
            <th class="border p-2 text-left">Nombre</th>
            <th class="border p-2 text-left">Apellido</th>
            <th class="border p-2 text-left">RUT</th>
            <th class="border p-2 text-left">Correo</th>
            <th class="border p-2 text-left">Rol</th>
            <th class="border p-2 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${usuarios.map(u => `
            <tr>
              <td class="border p-2">${u.nombre}</td>
              <td class="border p-2">${u.apellido}</td>
              <td class="border p-2">${u.rut || ''}</td>
              <td class="border p-2">${u.correo}</td>
              <td class="border p-2">${roles.find(r => r.id === u.rol_id)?.nombre || '---'}</td>
              <td class="border p-2 flex gap-2">
                <button data-id="${u.id}" class="editar bg-green-500 text-white px-2 py-1 rounded">Editar</button>
                <button data-id="${u.id}" class="desactivar bg-red-500 text-white px-2 py-1 rounded">Desactivar</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      `;
      userList.appendChild(table);

      // Eventos botones
      document.querySelectorAll(".editar").forEach(btn => {
        btn.addEventListener("click", () => abrirModal(usuarios.find(u => u.id == btn.dataset.id)));
      });
      document.querySelectorAll(".desactivar").forEach(btn => {
        btn.addEventListener("click", () => desactivarUsuario(btn.dataset.id));
      });

    } catch (err) {
      console.error(err);
      userList.innerHTML = `<p class="text-red-600">Error al cargar usuarios</p>`;
    }
  };

  // Abrir modal con datos del usuario
  const abrirModal = (usuario) => {
    modal.classList.remove("hidden");
    document.getElementById("editarId").value = usuario.id;
    document.getElementById("editarNombre").value = usuario.nombre;
    document.getElementById("editarApellido").value = usuario.apellido;
    document.getElementById("editarRut").value = usuario.rut || '';
    document.getElementById("editarCorreo").value = usuario.correo;
    document.getElementById("editarContrasena").value = "";
  };

  // Guardar cambios
  document.getElementById("formEditar").addEventListener("submit", async e => {
    e.preventDefault();
    const id = document.getElementById("editarId").value;
    const nombre = document.getElementById("editarNombre").value;
    const apellido = document.getElementById("editarApellido").value;
    const rut = document.getElementById("editarRut").value;
    const correo = document.getElementById("editarCorreo").value;
    const contrasena = document.getElementById("editarContrasena").value;

    try {
      const res = await fetch(`http://localhost:3000/api/usuarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, apellido, rut, correo, contrasena, usuarioAdmin })
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { message: text }; }

      if (!res.ok) throw new Error(data.message || "Error al actualizar usuario");

      alert(data.message);
      cerrarModal();
      cargarUsuarios();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

    // Desactivar usuario → cambiar rol_id a 4
    const desactivarUsuario = async (id) => {
    if (!confirm("¿Seguro deseas desactivar este usuario?")) return;
    try {
        const res = await fetch(`http://localhost:3000/api/usuarios/${id}`, {
        method: "PUT", // usamos PUT para modificar el usuario
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol_id: 4, usuarioAdmin})
        });

        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { message: text }; }

        if (!res.ok) throw new Error(data.message || "Error al desactivar usuario");

        alert(data.message);
        cargarUsuarios();
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
    };

  // Inicializar
  cargarUsuarios();
});
