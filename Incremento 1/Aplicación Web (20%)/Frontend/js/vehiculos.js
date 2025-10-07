const API_URL = "http://localhost:3000/api"

document.addEventListener("DOMContentLoaded", () => {
  cargarChoferes()
  cargarVehiculos()

  document.getElementById("formVehiculo").addEventListener("submit", registrarVehiculo)
})

async function cargarChoferes() {
  try {
    const response = await fetch(`${API_URL}/vehiculos/choferes`)
    const choferes = await response.json()

    const select = document.getElementById("conductorId")
    select.innerHTML = '<option value="">Seleccione un chofer</option>'

    choferes.forEach((chofer) => {
      const option = document.createElement("option")
      option.value = chofer.id
      option.textContent = `${chofer.nombre} ${chofer.apellido} (${chofer.correo})`
      select.appendChild(option)
    })
  } catch (error) {
    console.error("Error al cargar choferes:", error)
  }
}

async function cargarVehiculos() {
  try {
    const response = await fetch(`${API_URL}/vehiculos`)
    const vehiculos = await response.json()

    const tbody = document.getElementById("tablaVehiculos")
    tbody.innerHTML = ""

    if (vehiculos.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay vehículos registrados</td></tr>'
      return
    }

    vehiculos.forEach((vehiculo) => {
      const tr = document.createElement("tr")
      tr.className = "border-b hover:bg-gray-50"
      tr.innerHTML = `
        <td class="py-3 px-4">${vehiculo.id_transporte}</td>
        <td class="py-3 px-4 font-semibold">${vehiculo.patente}</td>
        <td class="py-3 px-4">${vehiculo.conductor || "Sin asignar"}</td>
        <td class="py-3 px-4">${vehiculo.capacidad ? vehiculo.capacidad + " kg" : "N/A"}</td>
        <td class="py-3 px-4 text-center">
          <button onclick="eliminarVehiculo(${vehiculo.id_transporte}, '${vehiculo.patente}')" 
                  class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm">
            Eliminar
          </button>
        </td>
      `
      tbody.appendChild(tr)
    })
  } catch (error) {
    console.error("Error al cargar vehículos:", error)
  }
}

async function registrarVehiculo(e) {
  e.preventDefault()

  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const usuarioAdmin = currentUser ? currentUser.nombre : "Admin"

  const datos = {
    patente: document.getElementById("patente").value.trim().toUpperCase(),
    conductor_id: Number.parseInt(document.getElementById("conductorId").value),
    capacidad: document.getElementById("capacidad").value
      ? Number.parseInt(document.getElementById("capacidad").value)
      : null,
    usuario_admin: usuarioAdmin,
  }

  try {
    const response = await fetch(`${API_URL}/vehiculos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    })

    const result = await response.json()

    if (response.ok) {
      alert("Vehículo registrado correctamente")
      document.getElementById("formVehiculo").reset()
      cargarVehiculos()
    } else {
      alert(result.message || "Error al registrar vehículo")
    }
  } catch (error) {
    console.error("Error al registrar vehículo:", error)
    alert("Error al registrar vehículo")
  }
}

async function eliminarVehiculo(id, patente) {
  if (!confirm(`¿Está seguro de eliminar el vehículo con patente ${patente}?`)) {
    return
  }

  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const usuarioAdmin = currentUser ? currentUser.nombre : "Admin"

  try {
    const response = await fetch(`${API_URL}/vehiculos/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario_admin: usuarioAdmin }),
    })

    const result = await response.json()

    if (response.ok) {
      alert("Vehículo eliminado correctamente")
      cargarVehiculos()
    } else {
      alert(result.message || "Error al eliminar vehículo")
    }
  } catch (error) {
    console.error("Error al eliminar vehículo:", error)
    alert("Error al eliminar vehículo")
  }
}
