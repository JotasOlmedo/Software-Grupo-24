document.addEventListener("DOMContentLoaded", () => {
  const rolSelect = document.getElementById("selectRolPermiso");
  const contenedorPermisos = document.getElementById("listaPermisos");
  const guardarBtn = document.getElementById("btnGuardarPermisos");
  const guardarWrapper = document.getElementById("guardarWrapper");
  const mensaje = document.getElementById("mensajePermisos");
  const usuarioAdmin = localStorage.getItem("usuario");

  const MODULOS = [
    {
      nombre: "Gestión de Usuarios",
      id: "usuarios",
      acciones: ["crear", "leer", "editar", "eliminar"]
    },
    {
      nombre: "Inventario de Cilindros",
      id: "inventario",
      acciones: ["crear", "leer", "editar", "eliminar"]
    },
    {
      nombre: "Reportes",
      id: "reportes",
      acciones: ["crear", "leer", "editar", "eliminar"]
    },
    {
      nombre: "Configuración",
      id: "configuracion",
      acciones: ["crear", "leer", "editar", "eliminar"]
    }
  ];

  // Cargar roles
  fetch("http://localhost:3000/api/roles")
    .then(res => res.json())
    .then(data => {
      data.forEach(rol => {
        const option = document.createElement("option");
        option.value = rol.id;
        option.textContent = rol.nombre;
        rolSelect.appendChild(option);
      });
    });

  // Al seleccionar un rol, cargar permisos actuales
  rolSelect.addEventListener("change", async () => {
    const rolId = rolSelect.value;
    contenedorPermisos.innerHTML = "";

    if (!rolId) return;

    const res = await fetch(`http://localhost:3000/api/roles/${rolId}/permisos`);
    const data = await res.json();
    const permisosActuales = data.permisos || [];

    MODULOS.forEach(modulo => {
      const card = document.createElement("div");
      card.className = "p-4 rounded-lg shadow bg-white space-y-2 mb-4";
      const title = `<h3 class="font-bold text-lg">${modulo.nombre}</h3><p class="text-sm text-gray-500">Permisos para ${modulo.id}</p>`;

      const checks = modulo.acciones.map(accion => {
        const permisoKey = `${modulo.id}.${accion}`;
        const checked = permisosActuales.includes(permisoKey) ? 'checked' : '';
        return `
          <label class="inline-flex items-center gap-2">
            <input type="checkbox" value="${permisoKey}" ${checked}>
            ${accion.charAt(0).toUpperCase() + accion.slice(1)}
          </label>
        `;
      }).join('');

      card.innerHTML = title + `<div class="flex gap-4 flex-wrap mt-2">${checks}</div>`;
      contenedorPermisos.appendChild(card);
    });

    // Mostrar contenido
    contenedorPermisos.classList.remove("hidden");
    guardarWrapper.classList.remove("hidden");
  });

  // Guardar permisos actualizados
  guardarBtn.addEventListener("click", async () => {
    const rolId = rolSelect.value;
    const checkboxes = contenedorPermisos.querySelectorAll("input[type='checkbox']");
    const permisosSeleccionados = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    try {
      const res = await fetch(`http://localhost:3000/api/roles/${rolId}/permisos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permisos: permisosSeleccionados, usuarioAdmin })
      });
      const data = await res.json();
      mensaje.innerText = data.message;
      mensaje.style.color = res.ok ? "green" : "red";
    } catch (err) {
      mensaje.innerText = "Error al guardar los permisos";
      mensaje.style.color = "red";
    }
  });
});
