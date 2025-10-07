const API_URL = "http://localhost:3000/api"

let chartVentasDia = null
let chartVentasTipo = null

document.addEventListener("DOMContentLoaded", () => {
  // Establecer fechas por defecto (última semana)
  const hoy = new Date()
  const hace7Dias = new Date(hoy)
  hace7Dias.setDate(hace7Dias.getDate() - 7)

  document.getElementById("fechaFin").valueAsDate = hoy
  document.getElementById("fechaInicio").valueAsDate = hace7Dias

  // Cargar estadísticas iniciales
  cargarEstadisticas()

  // Evento del botón filtrar
  document.getElementById("btnFiltrar").addEventListener("click", cargarEstadisticas)
})

async function cargarEstadisticas() {
  try {
    const fechaInicio = document.getElementById("fechaInicio").value
    const fechaFin = document.getElementById("fechaFin").value

    const response = await fetch(`${API_URL}/estadisticas/semanales?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`)
    const data = await response.json()

    // Actualizar tarjetas de resumen
    document.getElementById("totalClientes").textContent = data.total_clientes || 0
    document.getElementById("entregasFallidas").textContent = data.entregas_fallidas || 0

    const totalPedidos = data.ventas_por_dia.reduce((sum, dia) => sum + Number.parseInt(dia.total_pedidos), 0)
    document.getElementById("totalPedidos").textContent = totalPedidos

    // Renderizar gráficos
    renderizarGraficoVentasDia(data.ventas_por_dia)
    renderizarGraficoVentasTipo(data.ventas_por_tipo)
  } catch (error) {
    console.error("Error al cargar estadísticas:", error)
    alert("Error al cargar estadísticas")
  }
}

function renderizarGraficoVentasDia(datos) {
  const ctx = document.getElementById("chartVentasDia").getContext("2d")

  if (chartVentasDia) {
    chartVentasDia.destroy()
  }

  const labels = datos.map((d) => d.dia)
  const ventas = datos.map((d) => Number.parseFloat(d.total_ventas) || 0)
  const pedidos = datos.map((d) => Number.parseInt(d.total_pedidos) || 0)

  chartVentasDia = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Total Ventas ($)",
          data: ventas,
          backgroundColor: "rgba(59, 130, 246, 0.5)",
          borderColor: "rgb(59, 130, 246)",
          borderWidth: 1,
        },
        {
          label: "Cantidad Pedidos",
          data: pedidos,
          backgroundColor: "rgba(16, 185, 129, 0.5)",
          borderColor: "rgb(16, 185, 129)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  })
}

function renderizarGraficoVentasTipo(datos) {
  console.log("Data estadisticas:", datos) // ✅ usar el parámetro

  const ctx = document.getElementById("chartVentasTipo").getContext("2d")

  if (chartVentasTipo) {
    chartVentasTipo.destroy()
  }

  const labels = datos.map((d) => `Cilindro ${d.tipo}`)
  const cantidades = datos.map((d) => Number.parseInt(d.cantidad_vendida) || 0)

  const colores = [
    "rgba(59, 130, 246, 0.7)",
    "rgba(16, 185, 129, 0.7)",
    "rgba(251, 146, 60, 0.7)",
    "rgba(239, 68, 68, 0.7)",
    "rgba(168, 85, 247, 0.7)",
  ]

  chartVentasTipo = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: cantidades,
          backgroundColor: colores,
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  })
}
