document.addEventListener("DOMContentLoaded", async () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  if (!currentUser) {
    window.location.href = "index.html"
    return
  }

  const crearSection = document.getElementById("crearNotificacionSection")
  const formNotificacion = document.getElementById("formNotificacion")
  const listaNotificaciones = document.getElementById("listaNotificaciones")
  const sinNotificaciones = document.getElementById("sinNotificaciones")

  // Mostrar sección de crear notificación solo para admin
  crearSection.style.display = currentUser.rol_id === 1 ? "block" : "none"

  // Cargar notificaciones
  await cargarNotificaciones()

  // Solo admin puede enviar notificación
  if (currentUser.rol_id === 1) {
    formNotificacion.addEventListener("submit", async (e) => {
      e.preventDefault()
      const mensaje = document.getElementById("mensaje").value

      try {
        const response = await fetch("http://localhost:3000/api/notificaciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mensaje: mensaje,
            usuario_admin: currentUser.usuario_id,
          }),
        })

        if (response.ok) {
          alert("Notificación enviada correctamente")
          formNotificacion.reset()
          await cargarNotificaciones()
        } else {
          alert("Error al enviar notificación")
        }
      } catch (error) {
        console.error("Error:", error)
        alert("Error al enviar notificación")
      }
    })
  }

  async function cargarNotificaciones() {
    try {
      const response = await fetch(`http://localhost:3000/api/notificaciones`)
      const notificaciones = await response.json()
      listaNotificaciones.innerHTML = ""

      if (notificaciones.length === 0) {
        sinNotificaciones.classList.remove("hidden")
        return
      }
      sinNotificaciones.classList.add("hidden")

      notificaciones.forEach((notif) => {
        const div = document.createElement("div")
        div.className = "p-4 rounded-lg border-l-4 bg-blue-50 border-blue-500"

        const fecha = new Date(notif.fecha_creacion).toLocaleString("es-CL")

        div.innerHTML = `
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm text-gray-600">${fecha}</span>
              </div>
              <p class="text-gray-800">${notif.mensaje}</p>
            </div>
            ${
              currentUser.rol_id === 1
                ? `<div class="flex gap-2 ml-4">
                     <button onclick="eliminarNotificacion(${notif.notificacion_id})" class="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Eliminar">
                       <i data-lucide="trash-2" class="w-4 h-4"></i>
                     </button>
                   </div>`
                : ""
            }
          </div>
        `
        listaNotificaciones.appendChild(div)
      })

      if (lucide) lucide.createIcons()
    } catch (error) {
      console.error("Error al cargar notificaciones:", error)
    }
  }

  // Solo admin puede eliminar
  if (currentUser.rol_id === 1) {
    window.eliminarNotificacion = async (notificacionId) => {
      if (!confirm("¿Estás seguro de eliminar esta notificación?")) return
      try {
        const response = await fetch(`http://localhost:3000/api/notificaciones/${notificacionId}`, {
          method: "DELETE",
        })
        if (response.ok) await cargarNotificaciones()
      } catch (error) {
        console.error("Error:", error)
      }
    }
  }
})
