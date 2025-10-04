const API_URL = "http://localhost:3000/api"

document.addEventListener("DOMContentLoaded", () => {
  cargarMensajes()

  document.getElementById("formMensaje").addEventListener("submit", crearMensaje)
})

async function cargarMensajes() {
  try {
    const response = await fetch(`${API_URL}/mensajes/activos`)
    const mensajes = await response.json()

    const lista = document.getElementById("listaMensajes")
    lista.innerHTML = ""

    if (mensajes.length === 0) {
      lista.innerHTML = '<p class="text-gray-500 text-center py-4">No hay mensajes activos</p>'
      return
    }

    mensajes.forEach((mensaje) => {
      const div = document.createElement("div")
      div.className = "border border-blue-200 bg-blue-50 rounded-lg p-4"

      const fechaCreacion = new Date(mensaje.fecha_creacion).toLocaleString("es-CL")
      const fechaExpiracion = mensaje.fecha_expiracion
        ? new Date(mensaje.fecha_expiracion).toLocaleString("es-CL")
        : "Sin expiración"

      div.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">${mensaje.titulo}</h3>
            <p class="text-gray-700 mb-3">${mensaje.contenido}</p>
            <div class="text-sm text-gray-600">
              <p>Creado: ${fechaCreacion}</p>
              <p>Expira: ${fechaExpiracion}</p>
              ${mensaje.creador_nombre ? `<p>Por: ${mensaje.creador_nombre} ${mensaje.creador_apellido}</p>` : ""}
            </div>
          </div>
          <button onclick="desactivarMensaje(${mensaje.id})" 
                  class="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm">
            Desactivar
          </button>
        </div>
      `
      lista.appendChild(div)
    })
  } catch (error) {
    console.error("Error al cargar mensajes:", error)
  }
}

async function crearMensaje(e) {
  e.preventDefault()

  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const usuarioAdmin = currentUser ? currentUser.id : null

  const datos = {
    titulo: document.getElementById("titulo").value.trim(),
    contenido: document.getElementById("contenido").value.trim(),
    fecha_expiracion: document.getElementById("fechaExpiracion").value || null,
    usuario_admin: usuarioAdmin,
  }

  try {
    const response = await fetch(`${API_URL}/mensajes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    })

    const result = await response.json()

    if (response.ok) {
      alert("Mensaje publicado correctamente")
      document.getElementById("formMensaje").reset()
      cargarMensajes()
    } else {
      alert(result.message || "Error al publicar mensaje")
    }
  } catch (error) {
    console.error("Error al crear mensaje:", error)
    alert("Error al crear mensaje")
  }
}

async function desactivarMensaje(id) {
  if (!confirm("¿Está seguro de desactivar este mensaje?")) {
    return
  }

  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const usuarioAdmin = currentUser ? currentUser.id : null

  try {
    const response = await fetch(`${API_URL}/mensajes/${id}/desactivar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario_admin: usuarioAdmin }),
    })

    const result = await response.json()

    if (response.ok) {
      alert("Mensaje desactivado correctamente")
      cargarMensajes()
    } else {
      alert(result.message || "Error al desactivar mensaje")
    }
  } catch (error) {
    console.error("Error al desactivar mensaje:", error)
    alert("Error al desactivar mensaje")
  }
}
