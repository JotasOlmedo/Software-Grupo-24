document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("dashboardContainer")
  const searchInput = document.getElementById("searchSections")
  const noResults = document.getElementById("noResults")

  if (!container) return

  // Obtenemos el usuario y su rol directamente desde localStorage
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  if (!currentUser) return console.error("No hay usuario logueado")

  const rolId = currentUser.rol_id
  if (!rolId) return console.error("El usuario no tiene rol asignado")

  async function cargarMensajesFijados(container) {
    try {
      const response = await fetch("http://localhost:3000/api/mensajes/activos")
      const mensajes = await response.json()

      if (mensajes.length === 0) return

      // Crear contenedor principal de mensajes fijados
      const wrapperDiv = document.createElement("div")
      wrapperDiv.className = "mb-8"

      // Header con botón de toggle
      const headerDiv = document.createElement("div")
      headerDiv.className = "flex justify-between items-center cursor-pointer bg-yellow-100 p-3 rounded-lg shadow-md"
      headerDiv.innerHTML = `
        <h2 class="text-lg font-semibold text-yellow-800">Mensajes Fijados</h2>
        <button class="text-yellow-800 font-bold" id="toggleMensajes">▼</button>
      `

      wrapperDiv.appendChild(headerDiv)

      // Contenedor de los mensajes
      const mensajesDiv = document.createElement("div")
      mensajesDiv.className = "mt-4 space-y-4"

      mensajes.forEach((mensaje) => {
        const div = document.createElement("div")
        div.className = "bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-md"

        const fechaExpiracion = mensaje.fecha_expiracion
          ? `Expira: ${new Date(mensaje.fecha_expiracion).toLocaleDateString("es-CL")}`
          : ""

        div.innerHTML = `
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <i data-lucide="megaphone" class="w-6 h-6 text-yellow-600"></i>
            </div>
            <div class="ml-3 flex-1">
              <h3 class="text-lg font-semibold text-gray-900">${mensaje.titulo}</h3>
              <p class="text-gray-700 mt-1">${mensaje.contenido}</p>
              ${fechaExpiracion ? `<p class="text-sm text-gray-600 mt-2">${fechaExpiracion}</p>` : ""}
            </div>
          </div>
        `
        mensajesDiv.appendChild(div)
      })

      wrapperDiv.appendChild(mensajesDiv)
      container.insertBefore(wrapperDiv, container.firstChild)
      window.lucide.createIcons()

      // Toggle mostrar/ocultar mensajes
      const toggleBtn = headerDiv.querySelector("#toggleMensajes")
      toggleBtn.addEventListener("click", () => {
        if (mensajesDiv.style.display === "none") {
          mensajesDiv.style.display = "block"
          toggleBtn.textContent = "▼"
        } else {
          mensajesDiv.style.display = "none"
          toggleBtn.textContent = "▲"
        }
      })

      // Inicialmente colapsado si quieres
      mensajesDiv.style.display = "none"
      toggleBtn.textContent = "▲"
    } catch (error) {
      console.error("Error al cargar mensajes fijados:", error)
    }
  }
  await cargarMensajesFijados(container)

  const SECCIONES = [
    {
      nombre: "Administración de Usuarios",
      id: "usuarios",
      icono: "users",
      subsecciones: [
        {
          nombre: "Gestión de Usuario",
          id: "gestionUsuarios",
          icono: "users",
          link: "RoleAssignment.html",
          descripcion: "Gestionar usuarios del sistema",
          color: "blue",
        },
        {
          nombre: "Permisos por Módulo",
          id: "permisos",
          icono: "shield",
          link: "Permissions.html",
          descripcion: "Configurar permisos de acceso",
          color: "green",
        },
        {
          nombre: "Inicios de Sesión",
          id: "logs",
          icono: "log-in",
          link: "LoginLogs.html",
          descripcion: "Ver registros de accesos de usuarios",
          color: "purple",
        },
      ],
    },
    {
      nombre: "Gestión de Inventario",
      id: "inventario",
      icono: "package",
      subsecciones: [
        {
          nombre: "Registrar Cilindros",
          id: "registrarCilindros",
          icono: "package",
          link: "RegisterCylinders.html",
          descripcion: "Añadir nuevos cilindros al inventario",
          color: "orange",
        },
        {
          nombre: "Estado de Cilindros",
          id: "estadoCilindros",
          icono: "settings",
          link: "CylinderStatus.html",
          descripcion: "Modificar estado de cilindros",
          color: "teal",
        },
        {
          nombre: "Buscar Cilindros",
          id: "buscarCilindros",
          icono: "search",
          link: "SearchCylinders.html",
          descripcion: "Filtrar y buscar inventario",
          color: "indigo",
        },
        {
          nombre: "Registrar Pérdidas",
          id: "perdidas",
          icono: "alert-circle",
          link: "RegisterLosses.html",
          descripcion: "Reportar daños y pérdidas",
          color: "red",
        },
        {
          nombre: "Alertas de Reposición",
          id: "alertasReposicion",
          icono: "alert-triangle",
          link: "AlertasReposicion.html",
          descripcion: "Ver y gestionar alertas de stock bajo",
          color: "amber",
        },
        {
          nombre: "Sugerencias de Reabastecimiento",
          id: "reabastecimiento",
          icono: "refresh-cw",
          link: "SugerenciasReabastecimiento.html",
          descripcion: "Sugerencias basadas en historial y estacionalidad",
          color: "emerald",
        },
      ],
    },
    {
      nombre: "Gestión de Clientes y Pedidos",
      id: "clientesPedidos",
      icono: "user-plus",
      subsecciones: [
        {
          nombre: "Registrar Cliente",
          id: "registrarCliente",
          icono: "user-plus",
          link: "registroCliente.html",
          descripcion: "Agregar un nuevo cliente al sistema",
          color: "emerald",
        },
        {
          nombre: "Registrar Pedido",
          id: "registrarPedido",
          icono: "plus-circle",
          link: "RegistroPedido.html",
          descripcion: "Agregar un nuevo pedido con detalles",
          color: "cyan",
        },
        {
          nombre: "Historial de Pedidos",
          id: "historialPedidos",
          icono: "package",
          link: "ConsultaPedidos.html",
          descripcion: "Consultar todos los pedidos de un cliente específico",
          color: "pink",
        },
        {
          nombre: "Editar Pedidos",
          id: "editarPedidos",
          icono: "edit-2",
          link: "editarPedido.html",
          descripcion: "Modificar pedidos existentes",
          color: "orange",
        },
        {
          nombre: "Rutas Optimizadas",
          id: "rutasOptimizadas",
          icono: "route",
          link: "RutasOptimizadas.html",
          descripcion: "Visualizar rutas de entrega optimizadas con Google Maps",
          color: "blue",
        },
      ],
    },
    {
      nombre: "Reportes y Consultas",
      id: "reportes",
      icono: "file-text",
      subsecciones: [
        {
          nombre: "Reportes Diarios",
          id: "reportesDiarios",
          icono: "file-text",
          link: "Reports.html",
          descripcion: "Generar reportes del inventario",
          color: "violet",
        },
        {
          nombre: "Historial",
          id: "historial",
          icono: "history",
          link: "History.html",
          descripcion: "Consultar historial de cambios",
          color: "amber",
        },
        {
          nombre: "Perfil Móvil",
          id: "perfilMovil",
          icono: "smartphone",
          link: "MobileProfile.html",
          descripcion: "Revisar tu propio historial",
          color: "lime",
        },
        {
          nombre: "Documentos",
          id: "documentos",
          icono: "file-plus",
          link: "AdjuntoDocumentos.html",
          descripcion: "Adjuntar y gestionar documentos de proveedores",
          color: "cyan",
        },
      ],
    },
    {
      nombre: "Estadísticas y Análisis",
      id: "estadisticas",
      icono: "bar-chart-2",
      subsecciones: [
        {
          nombre: "Estadísticas Semanales",
          id: "estadisticasSemanales",
          icono: "trending-up",
          link: "Estadisticas.html",
          descripcion: "Ver gráficos de ventas, clientes y entregas semanales",
          color: "blue",
        },
        {
          nombre: "Evolución Mensual",
          id: "evolucionMensual",
          icono: "activity",
          link: "EvolucionMensual.html",
          descripcion: "Consultar evolución mensual de ventas por tipo de cilindro",
          color: "green",
        },
        {
          nombre: "Objetivos Mensuales",
          id: "objetivos",
          icono: "flag",
          link: "Objetivos.html",
          descripcion: "Consultar evolución mensual de ventas por tipo de cilindro",
          color: "red",
        },
        {
          nombre: "Mapa de Calor - Zonas de Entrega",
          id: "mapaCalor",
          icono: "map-pin",
          link: "MapaCalor.html",
          descripcion: "Visualizar zonas frecuentes de entrega mediante mapa de calor",
          color: "rose",
        },
      ],
    },
    {
      nombre: "Gestión de Flota",
      id: "flota",
      icono: "truck",
      subsecciones: [
        {
          nombre: "Vehículos",
          id: "vehiculos",
          icono: "truck",
          link: "Vehiculos.html",
          descripcion: "Registrar vehículos y asignar conductores",
          color: "indigo",
        },
      ],
    },
    {
      nombre: "Comunicación",
      id: "comunicacion",
      icono: "message-square",
      subsecciones: [
        {
          nombre: "Notificaciones",
          id: "notificaciones",
          icono: "bell",
          link: "Notificaciones.html",
          descripcion: "Ver y enviar notificaciones internas",
          color: "blue",
        },
        {
          nombre: "Chat",
          id: "chatInterno",
          icono: "message-circle",
          link: "chatInterno.html",
          descripcion: "Comunicación interna.",
          color: "green",
        },
        {
          nombre: "Mensajes Fijados",
          id: "mensajesFijados",
          icono: "pin",
          link: "MensajesFijados.html",
          descripcion: "Publicar anuncios importantes para el equipo",
          color: "purple",
        },
      ],
    },
  ]

  function obtenerClasesColor(color) {
    const colores = {
      blue: { bg: "bg-blue-100", hover: "group-hover:bg-blue-200", text: "text-blue-600" },
      green: { bg: "bg-green-100", hover: "group-hover:bg-green-200", text: "text-green-600" },
      purple: { bg: "bg-purple-100", hover: "group-hover:bg-purple-200", text: "text-purple-600" },
      orange: { bg: "bg-orange-100", hover: "group-hover:bg-orange-200", text: "text-orange-600" },
      teal: { bg: "bg-teal-100", hover: "group-hover:bg-teal-200", text: "text-teal-600" },
      indigo: { bg: "bg-indigo-100", hover: "group-hover:bg-indigo-200", text: "text-indigo-600" },
      red: { bg: "bg-red-100", hover: "group-hover:bg-red-200", text: "text-red-600" },
      emerald: { bg: "bg-emerald-100", hover: "group-hover:bg-emerald-200", text: "text-emerald-600" },
      cyan: { bg: "bg-cyan-100", hover: "group-hover:bg-cyan-200", text: "text-cyan-600" },
      pink: { bg: "bg-pink-100", hover: "group-hover:bg-pink-200", text: "text-pink-600" },
      violet: { bg: "bg-violet-100", hover: "group-hover:bg-violet-200", text: "text-violet-600" },
      amber: { bg: "bg-amber-100", hover: "group-hover:bg-amber-200", text: "text-amber-600" },
      lime: { bg: "bg-lime-100", hover: "group-hover:bg-lime-200", text: "text-lime-600" },
    }
    return colores[color] || colores.blue
  }

  // Obtener permisos del rol desde backend
  let permisos = []
  console.log("currentUser.rol_id:", currentUser.rol_id)

  try {
    const res = await fetch(`http://localhost:3000/api/roles/${rolId}/permisos`)
    const data = await res.json()
    permisos = data.permisos || []
    console.log("Permisos recibidos:", permisos)
  } catch (err) {
    console.error("Error al obtener permisos:", err)
    return
  }

  function renderSecciones(textoBusqueda = "") {
    container.innerHTML = ""
    let seccionesEncontradas = 0

    SECCIONES.forEach((seccion) => {
      const subseccionesVisibles = seccion.subsecciones.filter(
        (sub) => permisos.includes(`subseccion.${sub.id}`) || permisos.includes(`seccion.${seccion.id}`),
      )

      if (subseccionesVisibles.length === 0) return

      const seccionCoincide = seccion.nombre.toLowerCase().includes(textoBusqueda.toLowerCase())
      const subseccionesFiltradasPorBusqueda = subseccionesVisibles.filter(
        (sub) =>
          sub.nombre.toLowerCase().includes(textoBusqueda.toLowerCase()) ||
          sub.descripcion.toLowerCase().includes(textoBusqueda.toLowerCase()),
      )

      // Si no hay coincidencias en esta sección, omitirla
      if (textoBusqueda && !seccionCoincide && subseccionesFiltradasPorBusqueda.length === 0) return

      const sectionDiv = document.createElement("div")
      sectionDiv.className = "mb-8"

      sectionDiv.innerHTML = `
        <h2 class="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <i data-lucide="${seccion.icono}" class="w-5 h-5 text-blue-600"></i>
          ${seccion.nombre}
        </h2>
      `

      const gridDiv = document.createElement("div")
      gridDiv.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"

      const subseccionesAMostrar = textoBusqueda ? subseccionesFiltradasPorBusqueda : subseccionesVisibles

      subseccionesAMostrar.forEach((sub) => {
        const clases = obtenerClasesColor(sub.color)

        const card = document.createElement("a")
        card.href = sub.link
        card.className = "group"

        card.innerHTML = `
          <div class="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 p-4 rounded-xl">
            <div class="w-12 h-12 ${clases.bg} rounded-lg flex items-center justify-center mb-3 ${clases.hover} transition-colors">
              <i data-lucide="${sub.icono}" class="w-6 h-6 ${clases.text}"></i>
            </div>
            <h3 class="text-lg font-semibold">${sub.nombre}</h3>
            <p class="text-gray-600 text-sm">${sub.descripcion}</p>
          </div>
        `
        gridDiv.appendChild(card)
        seccionesEncontradas++
      })

      sectionDiv.appendChild(gridDiv)
      container.appendChild(sectionDiv)
    })

    if (seccionesEncontradas === 0 && textoBusqueda) {
      noResults.classList.remove("hidden")
    } else {
      noResults.classList.add("hidden")
    }

    window.lucide.createIcons()
  }

  // Renderizar secciones inicialmente
  renderSecciones()

  searchInput.addEventListener("input", (e) => {
    renderSecciones(e.target.value)
  })
})

async function cargarMensajesFijados(container) {
  try {
    const response = await fetch("http://localhost:3000/api/mensajes/activos")
    const mensajes = await response.json()

    if (mensajes.length === 0) return

    const mensajesDiv = document.createElement("div")
    mensajesDiv.className = "mb-8 space-y-4"

    mensajes.forEach((mensaje) => {
      const div = document.createElement("div")
      div.className = "bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-md"

      const fechaExpiracion = mensaje.fecha_expiracion
        ? `Expira: ${new Date(mensaje.fecha_expiracion).toLocaleDateString("es-CL")}`
        : ""

      div.innerHTML = `
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <i data-lucide="megaphone" class="w-6 h-6 text-yellow-600"></i>
          </div>
          <div class="ml-3 flex-1">
            <h3 class="text-lg font-semibold text-gray-900">${mensaje.titulo}</h3>
            <p class="text-gray-700 mt-1">${mensaje.contenido}</p>
            ${fechaExpiracion ? `<p class="text-sm text-gray-600 mt-2">${fechaExpiracion}</p>` : ""}
          </div>
        </div>
      `
      mensajesDiv.appendChild(div)
    })

    container.insertBefore(mensajesDiv, container.firstChild)
    window.lucide.createIcons()
  } catch (error) {
    console.error("Error al cargar mensajes fijados:", error)
  }
}
