document.addEventListener("DOMContentLoaded", async () => {
  await cargarAlertas()
  window.lucide.createIcons()
})

async function cargarAlertas() {
  const listaAlertas = document.getElementById("listaAlertas")
  const sinAlertas = document.getElementById("sinAlertas")

  try {
    const response = await fetch("http://localhost:3000/api/notificaciones/stock/activas")
    const alertas = await response.json()

    listaAlertas.innerHTML = ""

    if (alertas.length === 0) {
      sinAlertas.classList.remove("hidden")
      return
    }

    sinAlertas.classList.add("hidden")

    alertas.forEach((alerta) => {
      const div = document.createElement("div")
      div.className =
        "bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"

      const fecha = new Date(alerta.fecha).toLocaleDateString("es-CL", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

      div.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="flex items-start flex-1">
            <div class="flex-shrink-0">
              <i data-lucide="alert-triangle" class="w-6 h-6 text-amber-600"></i>
            </div>
            <div class="ml-3 flex-1">
              <h3 class="text-lg font-semibold text-gray-900">Alerta de Stock</h3>
              <p class="text-gray-700 mt-1">${alerta.mensaje}</p>
              <p class="text-sm text-gray-500 mt-2">
                <i data-lucide="calendar" class="w-4 h-4 inline mr-1"></i>
                ${fecha}
              </p>
              <span class="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                ${alerta.estado.toUpperCase()}
              </span>
            </div>
          </div>
          <div class="flex gap-2 ml-4">
            <button 
              onclick="marcarPendiente(${alerta.notificacion_id})" 
              class="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" 
              title="Marcar como pendiente">
              <i data-lucide="clock" class="w-5 h-5"></i>
            </button>
            <button 
              onclick="eliminarAlerta(${alerta.notificacion_id})" 
              class="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors" 
              title="Eliminar alerta">
              <i data-lucide="trash-2" class="w-5 h-5"></i>
            </button>
          </div>
        </div>
      `

      listaAlertas.appendChild(div)
    })

    window.lucide.createIcons()
  } catch (error) {
    console.error("Error al cargar alertas:", error)
    listaAlertas.innerHTML = `
      <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
        <div class="flex items-center">
          <i data-lucide="alert-circle" class="w-6 h-6 text-red-600 mr-3"></i>
          <p class="text-red-700">Error al cargar las alertas. Por favor, intenta nuevamente.</p>
        </div>
      </div>
    `
    window.lucide.createIcons()
  }
}

async function marcarPendiente(notificacionId) {
  if (!confirm("¿Deseas marcar esta alerta como pendiente?")) return

  try {
    const response = await fetch(`http://localhost:3000/api/notificaciones/${notificacionId}/pendiente`, {
      method: "PUT",
    })

    if (response.ok) {
      await cargarAlertas()
      mostrarMensaje("Alerta marcada como pendiente", "success")
    } else {
      mostrarMensaje("Error al actualizar la alerta", "error")
    }
  } catch (error) {
    console.error("Error al marcar como pendiente:", error)
    mostrarMensaje("Error al actualizar la alerta", "error")
  }
}

async function eliminarAlerta(notificacionId) {
  if (!confirm("¿Estás seguro de que deseas eliminar esta alerta?")) return

  try {
    const response = await fetch(`http://localhost:3000/api/notificaciones/${notificacionId}`, {
      method: "DELETE",
    })

    if (response.ok) {
      await cargarAlertas()
      mostrarMensaje("Alerta eliminada correctamente", "success")
    } else {
      mostrarMensaje("Error al eliminar la alerta", "error")
    }
  } catch (error) {
    console.error("Error al eliminar alerta:", error)
    mostrarMensaje("Error al eliminar la alerta", "error")
  }
}

function mostrarMensaje(mensaje, tipo) {
  const color = tipo === "success" ? "green" : "red"
  const icono = tipo === "success" ? "check-circle" : "alert-circle"

  const div = document.createElement("div")
  div.className = `fixed top-4 right-4 bg-${color}-50 border-l-4 border-${color}-400 p-4 rounded-lg shadow-lg z-50 animate-fade-in`
  div.innerHTML = `
    <div class="flex items-center">
      <i data-lucide="${icono}" class="w-5 h-5 text-${color}-600 mr-3"></i>
      <p class="text-${color}-700">${mensaje}</p>
    </div>
  `

  document.body.appendChild(div)
  window.lucide.createIcons()

  setTimeout(() => {
    div.remove()
  }, 3000)
}
