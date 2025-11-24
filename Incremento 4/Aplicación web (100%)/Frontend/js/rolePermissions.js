document.addEventListener("DOMContentLoaded", () => {
  const rolSelect = document.getElementById("selectRolPermiso");
  const contenedorPermisos = document.getElementById("listaPermisos");
  const guardarBtn = document.getElementById("btnGuardarPermisos");
  const guardarWrapper = document.getElementById("guardarWrapper");
  const mensaje = document.getElementById("mensajePermisos");
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const usuarioAdmin = currentUser ? currentUser.name : "Admin_desconocido";

  // Agregar texto informativo
  const infoTexto = document.createElement("p");
  infoTexto.innerText = "Las secciones y subsecciones seleccionadas serán visibles para este rol.";
  infoTexto.className = "text-gray-700 mb-4 font-medium";
  contenedorPermisos.parentNode.insertBefore(infoTexto, contenedorPermisos);

  // Definimos las secciones con subsecciones
  const SECCIONES = [
    {
      nombre: "Administración de Usuarios",
      id: "usuarios",
      subsecciones: [
        { nombre: "Gestión de Usuario", id: "gestionUsuarios" },
        { nombre: "Permisos por Módulo", id: "permisos" },
        { nombre: "Inicios de Sesión", id: "logs" }
      ]
    },
    {
      nombre: "Gestión de Inventario",
      id: "inventario",
      subsecciones: [
        { nombre: "Registrar Cilindros", id: "registrarCilindros" },
        { nombre: "Estado de Cilindros", id: "estadoCilindros" },
        { nombre: "Buscar Cilindros", id: "buscarCilindros" },
        { nombre: "Registrar Pérdidas", id: "perdidas" },
        { nombre: "Alertas de Reposición", id: "alertasReposicion" },
        { nombre: "Sugerencias de Reabastecimiento", id: "reabastecimiento" }
      ]
    },
    {
      nombre: "Gestión de Clientes y Pedidos",
      id: "clientesPedidos",
      subsecciones: [
        { nombre: "Registrar Cliente", id: "registrarCliente" },
        { nombre: "Registrar Pedido", id: "registrarPedido" },
        { nombre: "Historial de Pedidos", id: "historialPedidos" },
        { nombre: "Editar Pedidos", id: "editarPedidos" },
        { nombre: "Rutas Optimizadas", id: "rutasOptimizadas" }
      ]
    },
    {
      nombre: "Reportes y Consultas",
      id: "reportes",
      subsecciones: [
        { nombre: "Reportes Diarios", id: "reportesDiarios" },
        { nombre: "Historial", id: "historial" },
        { nombre: "Perfil Móvil", id: "perfilMovil" },
      ]
    },

    {
      nombre: "Estadisticas y Análisis",
      id: "estadisticas",
      subsecciones: [
        { nombre: "Estadísticas Semanales", id: "estadisticasSemanales" },
        { nombre: "Evolución Mensual", id: "evolucionMensual" },
        { nombre: "Objetivos Mensuales", id: "objetivos" },
        { nombre: "Mapa de Calor", id: "mapaCalor" },
      ]
    },
    {
      nombre: "Gestión de Flota",
      id: "flota",
      subsecciones: [
        { nombre: "Vehículos", id: "vehiculos" },
      ]
    },
    {
      nombre: "Comunicación",
      id: "comunicacion",
      subsecciones: [
        { nombre: "Notificaciones", id: "notificaciones" },
        { nombre: "Mensajes Fijados", id: "mensajesFijados" },
        { nombre: "Chat", id: "chat" },
      ]
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

    SECCIONES.forEach(seccion => {
      const card = document.createElement("div");
      card.className = "p-4 rounded-lg shadow bg-white space-y-2 mb-4";

      // Checkbox principal de la sección
      const seccionId = `seccion.${seccion.id}`;
      const checkedSeccion = permisosActuales.includes(seccionId) ? "checked" : "";
      const header = `
        <label class="flex items-center gap-2 font-bold text-lg">
          <input type="checkbox" value="${seccionId}" class="checkbox-seccion" ${checkedSeccion}>
          ${seccion.nombre}
        </label>
      `;

      // Sub-secciones
      const checks = seccion.subsecciones.map(sub => {
        const permisoKey = `subseccion.${sub.id}`;
        const checked = permisosActuales.includes(permisoKey) ? "checked" : "";
        return `
          <label class="inline-flex items-center gap-2 ml-6">
            <input type="checkbox" value="${permisoKey}" class="checkbox-subseccion" data-seccion="${seccionId}" ${checked}>
            ${sub.nombre}
          </label>
        `;
      }).join("");

      card.innerHTML = header + `<div class="flex flex-col gap-2 mt-2">${checks}</div>`;
      contenedorPermisos.appendChild(card);
    });

    // Lógica de selección sección ↔ subsecciones
    contenedorPermisos.querySelectorAll(".checkbox-seccion").forEach(chk => {
      chk.addEventListener("change", e => {
        const seccionId = e.target.value;
        const checked = e.target.checked;
        contenedorPermisos.querySelectorAll(`.checkbox-subseccion[data-seccion="${seccionId}"]`)
          .forEach(sub => sub.checked = checked);
      });
    });

    contenedorPermisos.querySelectorAll(".checkbox-subseccion").forEach(chk => {
      chk.addEventListener("change", e => {
        const seccionId = e.target.dataset.seccion;
        const todas = contenedorPermisos.querySelectorAll(`.checkbox-subseccion[data-seccion="${seccionId}"]`);
        const todasMarcadas = Array.from(todas).every(sub => sub.checked);
        const seccionChk = contenedorPermisos.querySelector(`.checkbox-seccion[value="${seccionId}"]`);
        seccionChk.checked = todasMarcadas;
      });
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
