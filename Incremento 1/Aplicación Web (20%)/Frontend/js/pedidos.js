document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput")
  const statusFilter = document.getElementById("statusFilter")
  const paymentFilter = document.getElementById("paymentFilter")
  const botonBuscar = document.getElementById("btnBuscarPedidos")
  const resumen = document.getElementById("resumenResultados")
  const contenedor = document.getElementById("resultados")
  const tablaContenedor = document.getElementById("tablaResultados")

  let pedidos = []

  const cargarPedidos = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/pedidos")
      const data = await res.json()
      pedidos = data
      updateStats()
    } catch (error) {
      console.error("Error loading orders:", error)
      resumen.innerText = "Error de conexión al cargar los pedidos"
    }
  }

  const renderTabla = (filtrados) => {
    tablaContenedor.innerHTML = ""
    if (filtrados.length === 0) {
      resumen.innerText = "No se encontraron pedidos con esos criterios."
      return
    }

    resumen.innerText = `Se encontraron ${filtrados.length} pedido(s) que coinciden con los criterios`

    const tabla = document.createElement("table")
    tabla.className = "w-full table-auto text-sm text-left border-collapse"
    tabla.innerHTML = `
      <thead>
        <tr class="bg-gray-100 text-gray-700">
          <th class="px-4 py-2">ID</th>
          <th class="px-4 py-2">Cliente</th>
          <th class="px-4 py-2">Estado</th>
          <th class="px-4 py-2">Chofer</th>
          <th class="px-4 py-2">Pago</th>
          <th class="px-4 py-2">Monto</th>
          <th class="px-4 py-2">Fecha</th>
          <th class="px-4 py-2">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${filtrados
          .map(
            (p) => `
          <tr class="border-t hover:bg-gray-50">
            <td class="px-4 py-2">#${p.id_pedido.toString().padStart(3, "0")}</td>
            <td class="px-4 py-2">
              <div class="text-sm font-medium">${p.cliente_nombre || "N/A"}</div>
              <div class="text-xs text-gray-500">${p.cliente_telefono || ""}</div>
            </td>
            <td class="px-4 py-2">
              <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(p.estado)}">
                ${p.estado || "pendiente"}
              </span>
            </td>
            <td class="px-4 py-2">
              ${
                p.chofer_nombre
                  ? `<div class="text-sm">${p.chofer_nombre}</div><div class="text-xs text-gray-500">ID: ${p.chofer_id}</div>`
                  : '<span class="text-sm text-gray-500 italic">Sin asignar</span>'
              }
            </td>
            <td class="px-4 py-2">
              <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${getPaymentColor(p.metodopago)}">
                ${p.metodopago || "pendiente"}
              </span>
            </td>
            <td class="px-4 py-2">$${p.montototal || "0.00"}</td>
            <td class="px-4 py-2">${formatDate(p.fechapedido)}</td>
            <td class="px-4 py-2">
              <div class="flex gap-1">
                <button onclick="openDriverAssignment(${p.id_pedido})" class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs">
                  ${p.chofer_nombre ? "Cambiar" : "Asignar"}
                </button>
                <button onclick="viewOrderDetails(${p.id_pedido})" class="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs">
                  Ver
                </button>
              </div>
            </td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    `

    tablaContenedor.appendChild(tabla)
    contenedor.classList.remove("hidden")
  }

  const filtrarPedidos = () => {
    const searchTerm = searchInput.value.toLowerCase()
    const status = statusFilter.value
    const payment = paymentFilter.value

    const resultado = pedidos.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.id_pedido.toString().includes(searchTerm) ||
        (p.cliente_nombre && p.cliente_nombre.toLowerCase().includes(searchTerm)) ||
        (p.chofer_nombre && p.chofer_nombre.toLowerCase().includes(searchTerm))

      const matchesStatus = !status || p.estado === status

      const matchesPayment =
        !payment || (payment === "pendiente" && !p.metodopago) || (payment === "pagado" && p.metodopago)

      return matchesSearch && matchesStatus && matchesPayment
    })

    renderTabla(resultado)
  }

  const getStatusColor = (estado) => {
    switch (estado) {
      case "entregado":
        return "bg-green-100 text-green-700"
      case "en_ruta":
        return "bg-blue-100 text-blue-700"
      case "asignado":
        return "bg-yellow-100 text-yellow-700"
      case "cancelado":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getPaymentColor = (metodopago) => {
    return metodopago ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const updateStats = () => {
    const total = pedidos.length
    const pending = pedidos.filter((p) => p.estado === "pendiente").length
    const delivered = pedidos.filter((p) => p.estado === "entregado").length

    document.getElementById("totalOrders").textContent = total
    document.getElementById("pendingOrders").textContent = pending
    document.getElementById("deliveredOrders").textContent = delivered
  }

  if (botonBuscar) {
    botonBuscar.addEventListener("click", filtrarPedidos)
  }

  searchInput.addEventListener("keyup", filtrarPedidos)
  statusFilter.addEventListener("change", filtrarPedidos)
  paymentFilter.addEventListener("change", filtrarPedidos)

  window.openDriverAssignment = (orderId) => {
    const order = pedidos.find((o) => o.id_pedido === orderId)
    if (!order) return

    alert(
      `Función de asignación de chofer para pedido #${orderId}\nCliente: ${order.cliente_nombre}\nEstado actual: ${order.estado}`,
    )
  }

  window.viewOrderDetails = (orderId) => {
    const order = pedidos.find((o) => o.id_pedido === orderId)
    if (!order) return

    alert(
      `Detalles del pedido #${orderId}\nCliente: ${order.cliente_nombre}\nMonto: $${order.montototal}\nFecha: ${formatDate(order.fechapedido)}`,
    )
  }

  window.refreshOrders = () => {
    cargarPedidos()
  }

  window.exportOrders = () => {
    alert("Función de exportación - implementar según necesidades")
  }

  cargarPedidos()
})
