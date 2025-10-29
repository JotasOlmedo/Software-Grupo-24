const API_URL = "http://localhost:3000/api"

let map
let directionsService
let directionsRenderer
let pedidosPendientes = []
let choferId = null // ID global del chofer
let rutaActual = null
let updateInterval = null
const google = window.google

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}")
  } catch {
    return {}
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const currentUser = getCurrentUser()
  choferId = currentUser?.id

  if (!choferId) {
    alert("No se encontró el ID del chofer. Por favor inicie sesión.")
    return
  }

  await cargarDatosChofer(choferId)
  await cargarPedidosPendientes(choferId)
  initMap()
  setupEventListeners()
})

async function cargarDatosChofer() {
  try {
    const res = await fetch(`${API_URL}/usuarios/${choferId}`)
    if (!res.ok) throw new Error("Error al cargar datos del chofer")

    const chofer = await res.json()
    document.getElementById("choferNombre").textContent = `${chofer.nombre} ${chofer.apellido || ""}`
  } catch (err) {
    console.error("Error:", err)
    document.getElementById("choferNombre").textContent = "Error al cargar datos"
  }
}

async function cargarPedidosPendientes() {
  try {
    const res = await fetch(`${API_URL}/rutas/pedidos-pendientes/${choferId}`)
    if (!res.ok) throw new Error("Error al cargar pedidos")

    pedidosPendientes = await res.json()
    document.getElementById("totalEntregas").textContent = pedidosPendientes.length

    mostrarListaEntregas()
  } catch (err) {
    console.error("Error:", err)
    alert("Error al cargar pedidos pendientes")
  }
}

function mostrarListaEntregas() {
  const lista = document.getElementById("listaEntregas")

  if (pedidosPendientes.length === 0) {
    lista.innerHTML = `
      <div class="p-6 text-center text-gray-500">
        <i class="fas fa-check-circle text-4xl mb-2"></i>
        <p>No hay entregas pendientes</p>
      </div>
    `
    return
  }

  lista.innerHTML = pedidosPendientes
    .map((pedido, index) => {
      // Formatear la fecha y hora estimada de llegada (si existe)
      let llegadaEstimada = ""
      if (pedido.fechaentrega) {
        const fecha = new Date(pedido.fechaentrega)
        llegadaEstimada = fecha.toLocaleString("es-CL", {
          dateStyle: "short",
          timeStyle: "short",
          hour12: false,
        })
      }

      return `
        <div class="p-4 hover:bg-gray-50 transition" data-pedido-id="${pedido.id_pedido}">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              ${index + 1}
            </div>
            <div class="flex-1">
              <h4 class="font-semibold text-gray-800">${pedido.cliente_nombre}</h4>
              <p class="text-sm text-gray-600 mt-1">
                <i class="fas fa-map-marker-alt text-red-500 mr-1"></i>
                ${pedido.direccion}
              </p>
              <p class="text-sm text-gray-500 mt-1">
                <i class="fas fa-phone text-green-500 mr-1"></i>
                ${pedido.telefono || "No disponible"}
              </p>
              <p class="text-sm font-semibold text-blue-600 mt-1">
                Monto: $${Number.parseFloat(pedido.montototal).toLocaleString()}
              </p>
              ${
                llegadaEstimada
                  ? `<p class="text-sm text-gray-700 mt-1">
                      <i class="fas fa-clock text-yellow-500 mr-1"></i>
                      Llegada estimada: <span class="font-medium">${llegadaEstimada}</span>
                    </p>`
                  : ""
              }
            </div>
            <button 
              onclick="completarEntrega(${pedido.id_pedido})"
              class="text-green-600 hover:text-green-700 hidden"
              id="btnCompletar-${pedido.id_pedido}">
              <i class="fas fa-check-circle text-2xl"></i>
            </button>
          </div>
        </div>
      `
    })
    .join("")
}

function initMap() {
  // Default
  const defaultCenter = { lat: -33.4489, lng: -70.6693 }

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: defaultCenter,
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
  })

  directionsService = new google.maps.DirectionsService()
  directionsRenderer = new google.maps.DirectionsRenderer({
    map: map,
    suppressMarkers: false,
    polylineOptions: {
      strokeColor: "#2563eb",
      strokeWeight: 5,
    },
  })
}

function setupEventListeners() {
  document.getElementById("btnOptimizarRuta").addEventListener("click", optimizarRuta)
  document.getElementById("btnIniciarRuta").addEventListener("click", iniciarRuta)
}

async function optimizarRuta() {
  if (pedidosPendientes.length === 0) {
    alert("No hay entregas pendientes para optimizar")
    return
  }

  const btnOptimizar = document.getElementById("btnOptimizarRuta")
  btnOptimizar.disabled = true
  btnOptimizar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Optimizando...'

  try {
    const origin = "Av. Libertador Bernardo O'Higgins 1234, Santiago, Chile" // bodega

    const waypoints = pedidosPendientes.map((pedido) => ({
      location: pedido.direccion,
      stopover: true,
    }))

    const destination = pedidosPendientes[pedidosPendientes.length - 1].direccion

    const request = {
      origin,
      destination,
      waypoints: waypoints.slice(0, -1),
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING,
    }

    directionsService.route(request, async (result, status) => {
      if (status === google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result)

        const route = result.routes[0]
        const orderedPedidos = route.waypoint_order.map((i) => pedidosPendientes[i])
        orderedPedidos.push(pedidosPendientes[pedidosPendientes.length - 1]) // Add final destination
        pedidosPendientes = orderedPedidos
        mostrarListaEntregas()

        let totalDistance = 0
        let totalDuration = 0
        route.legs.forEach((leg) => {
          totalDistance += leg.distance.value
          totalDuration += leg.duration.value
        })

        document.getElementById("distanciaTotal").textContent = `${(totalDistance / 1000).toFixed(2)} km`
        document.getElementById("tiempoEstimado").textContent = `${Math.round(totalDuration / 60)} min`

        const rutaId = await guardarRutasTramos(route)

        if (rutaId) {
          rutaActual = {
            id_ruta: rutaId,
            origen: origin,
            destino: destination,
            distancia: totalDistance / 1000,
          }

          document.getElementById("btnIniciarRuta").classList.remove("hidden")

          alert("Ruta optimizada y guardada correctamente.")
        } else {
          throw new Error("No se pudo guardar la ruta")
        }
      } else {
        throw new Error("No se pudo calcular la ruta: " + status)
      }
    })
  } catch (err) {
    console.error("Error al optimizar ruta:", err)
    alert("Error al optimizar la ruta.")
  } finally {
    btnOptimizar.disabled = false
    btnOptimizar.innerHTML = '<i class="fas fa-route mr-2"></i>Optimizar Ruta'
  }
}

async function guardarRutasTramos(route) {
  try {
    const legs = route.legs
    let lastRutaId = null
    let tiempoAcumulado = 0 // ⏱️ tiempo total acumulado para calcular llegada encadenada

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i]
      const origen = leg.start_address
      const destino = leg.end_address
      const distancia = leg.distance.value / 1000 // km
      const duracion_segundos = leg.duration.value // segundos desde Google Maps
      const tiempo_estimado = Math.ceil(duracion_segundos / 60) // minutos aproximados

      // Agregar duración acumulada para destinos encadenados
      tiempoAcumulado += tiempo_estimado

      const pedido = pedidosPendientes[i] || pedidosPendientes[pedidosPendientes.length - 1]
      if (!pedido || !pedido.id_pedido) {
        console.warn(`⚠️ No se encontró pedido para leg ${i}, saltando...`)
        continue
      }

      const rutaData = {
        origen,
        destino,
        distancia,
        tiempo_estimado, 
        tiempo_acumulado: tiempoAcumulado, 
        pedido_id: pedido.id_pedido,
        chofer_id: choferId
      }

      console.log("[DEBUG rutaData]", rutaData)

      const res = await fetch(`${API_URL}/rutas/guardar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rutaData)
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error(`Error guardando tramo ${i}:`, errorText)
        continue
      }

      const resultado = await res.json()
      lastRutaId = resultado.id_ruta
    }

    return lastRutaId
  } catch (err) {
    console.error("Error al guardar rutas tramo a tramo:", err)
    return null
  }
}


async function iniciarRuta() {
  if (!rutaActual) {
    alert("Primero debe optimizar la ruta")
    return
  }

  try {
    const pedidoIds = pedidosPendientes.map((p) => p.id_pedido)

    const res = await fetch(`${API_URL}/rutas/iniciar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pedido_ids: pedidoIds,
        ruta_id: rutaActual.id_ruta,
      }),
    })

    if (!res.ok) throw new Error("Error al iniciar ruta")

    pedidosPendientes.forEach((pedido) => {
      const btn = document.getElementById(`btnCompletar-${pedido.id_pedido}`)
      if (btn) btn.classList.remove("hidden")
    })

    document.getElementById("btnIniciarRuta").classList.add("hidden")
    document.getElementById("btnOptimizarRuta").classList.add("hidden")

    iniciarActualizacionTiempoReal()

    alert("Ruta iniciada. ¡Buena suerte con las entregas!")
  } catch (err) {
    console.error("Error:", err)
    alert("Error al iniciar la ruta")
  }
}

function iniciarActualizacionTiempoReal() {
  updateInterval = setInterval(async () => {
    console.log("Actualizando tiempo estimado con tráfico en tiempo real...")

    try {
      const origin = "Av. Libertador Bernardo O'Higgins 1234, Santiago, Chile"
      const destination = pedidosPendientes[pedidosPendientes.length - 1].direccion
      const waypoints = pedidosPendientes.slice(0, -1).map((p) => ({
        location: p.direccion,
        stopover: true,
      }))

      const request = {
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
        },
      }

      directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          let totalDuration = 0
          result.routes[0].legs.forEach((leg) => {
            totalDuration += leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value
          })

          document.getElementById("tiempoEstimado").textContent = `${Math.round(totalDuration / 60)} min`

          console.log("[v0] Tiempo estimado actualizado:", Math.round(totalDuration / 60), "min")
        }
      })
    } catch (err) {
      console.error("[v0] Error al actualizar tiempo estimado:", err)
    }
  }, 900000) 
}

async function completarEntrega(pedidoId) {
  if (!confirm("¿Confirmar que la entrega fue completada?")) {
    return
  }

  try {
    const res = await fetch(`${API_URL}/rutas/completar-entrega`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedido_id: pedidoId }),
    })

    if (!res.ok) throw new Error("Error al completar entrega")

    pedidosPendientes = pedidosPendientes.filter((p) => p.id_pedido !== pedidoId)
    document.getElementById("totalEntregas").textContent = pedidosPendientes.length

    const elemento = document.querySelector(`[data-pedido-id="${pedidoId}"]`)
    if (elemento) elemento.remove()

    alert("Entrega completada correctamente")

    if (pedidosPendientes.length === 0) {
      if (updateInterval) {
        clearInterval(updateInterval)
      }
      alert("¡Todas las entregas completadas! Excelente trabajo.")
    }
  } catch (err) {
    console.error("Error:", err)
    alert("Error al completar la entrega")
  }
}

window.addEventListener("beforeunload", () => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
