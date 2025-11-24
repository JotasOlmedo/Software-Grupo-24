const API_URL = "http://localhost:3000/api"

let chartEvolucion = null
let chartComparativa = null
let datosGlobales = null

document.addEventListener("DOMContentLoaded", () => {
  cargarDatos()

  document.getElementById("btnCargar").addEventListener("click", cargarDatos)

  document.getElementById("btnGenerarComparativa").addEventListener("click", generarComparativa)

  document.querySelectorAll(".tipo-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", generarComparativa)
  })

  document.getElementById("selectMesComparativa").addEventListener("change", generarComparativa)

  document.getElementById("btnConsultarTiempo").addEventListener("click", consultarTiempoPromedio)
})

async function cargarDatos() {
  try {
    const anio = document.getElementById("selectAnio").value

    const response = await fetch(`${API_URL}/estadisticas/evolucion-mensual?anio=${anio}`)
    const data = await response.json()
    console.log("Respuesta API:", data)

    datosGlobales = data

    renderizarGrafico(data)
    renderizarTabla(data)

    generarComparativa()
  } catch (error) {
    console.error("Error al cargar evolución mensual:", error)
    alert("Error al cargar datos")
  }
}

async function consultarTiempoPromedio() {
  try {
    const mes = document.getElementById("selectMesTiempoEntrega").value
    const anio = document.getElementById("selectAnio").value

    const response = await fetch(`${API_URL}/estadisticas/tiempo-promedio-entrega?mes=${mes}&anio=${anio}`)
    const data = await response.json()

    const resultadoDiv = document.getElementById("resultadoTiempoEntrega")
    const mensajeDiv = document.getElementById("mensajeNoEntregas")

    if (data.mensaje) {
      // No hay entregas para el mes
      resultadoDiv.classList.add("hidden")
      mensajeDiv.classList.remove("hidden")
    } else {
      // Mostrar resultado
      mensajeDiv.classList.add("hidden")
      resultadoDiv.classList.remove("hidden")

      document.getElementById("tiempoPromedioValor").textContent = `${data.tiempoPromedio} días`
      document.getElementById("totalEntregasTexto").textContent = `${data.totalEntregas} entregas realizadas`
    }

    // Reinicializar iconos de Lucide
    if (window.lucide) {
      window.lucide.createIcons()
    }
  } catch (error) {
    console.error("Error al consultar tiempo promedio:", error)
    alert("Error al consultar tiempo promedio de entrega")
  }
}

function renderizarGrafico(data) {
  const ctx = document.getElementById("chartEvolucion").getContext("2d")

  if (chartEvolucion) {
    chartEvolucion.destroy()
  }

  // Preparar datos por tipo de cilindro
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  const tipos = ["5kg", "11kg", "15kg", "45kg"]
  const colores = {
    "5kg": "rgb(59, 130, 246)",
    "11kg": "rgb(16, 185, 129)",
    "15kg": "rgb(251, 146, 60)",
    "45kg": "rgb(239, 68, 68)",
  }

  const datasets = tipos.map((tipo) => {
    const datosPorMes = new Array(12).fill(0)

    data.datos.forEach((mes) => {
      if (mes.tipos[tipo]) {
        datosPorMes[mes.mes - 1] = mes.tipos[tipo].cantidad
      }
    })

    return {
      label: `Cilindro ${tipo} kg`,
      data: datosPorMes,
      borderColor: colores[tipo],
      backgroundColor: colores[tipo] + "33",
      tension: 0.4,
      fill: false,
    }
  })

  chartEvolucion = new Chart(ctx, {
    type: "line",
    data: {
      labels: meses,
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Cantidad Vendida",
          },
        },
      },
    },
  })
}

function renderizarTabla(data) {
  const tbody = document.getElementById("tablaDetalle")
  tbody.innerHTML = ""

  const mesesNombres = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  // Convertir el array de datos en un objeto para acceso rápido por mes
  const datosPorMes = {}
  data.datos.forEach((m) => {
    datosPorMes[Number(m.mes)] = m.tipos
  })

  for (let i = 1; i <= 12; i++) {
    const tipos = datosPorMes[i] || {}

    const cant5 = tipos["5kg"]?.cantidad || 0
    const cant11 = tipos["11kg"]?.cantidad || 0
    const cant15 = tipos["15kg"]?.cantidad || 0
    const cant45 = tipos["45kg"]?.cantidad || 0
    const total = cant5 + cant11 + cant15 + cant45

    const tr = document.createElement("tr")
    tr.className = "border-b hover:bg-gray-50"
    tr.innerHTML = `
      <td class="py-3 px-4">${mesesNombres[i - 1]}</td>
      <td class="text-right py-3 px-4">${cant5}</td>
      <td class="text-right py-3 px-4">${cant11}</td>
      <td class="text-right py-3 px-4">${cant15}</td>
      <td class="text-right py-3 px-4">${cant45}</td>
      <td class="text-right py-3 px-4 font-semibold">${total}</td>
    `
    tbody.appendChild(tr)
  }
}

function generarComparativa() {
  if (!datosGlobales) return

  const mesSeleccionado = Number.parseInt(document.getElementById("selectMesComparativa").value)
  const checkboxes = document.querySelectorAll(".tipo-checkbox:checked")
  const tiposSeleccionados = Array.from(checkboxes).map((cb) => cb.value)

  const mensajeNoData = document.getElementById("mensajeNoData")

  // Validate at least one type is selected
  if (tiposSeleccionados.length === 0) {
    mensajeNoData.classList.remove("hidden")
    if (chartComparativa) {
      chartComparativa.destroy()
      chartComparativa = null
    }
    return
  }

  mensajeNoData.classList.add("hidden")

  const datosMes = datosGlobales.datos.find((m) => Number(m.mes) === mesSeleccionado)

  const labels = []
  const cantidades = []
  const colores = {
    "5kg": "rgb(59, 130, 246)",
    "11kg": "rgb(16, 185, 129)",
    "15kg": "rgb(251, 146, 60)",
    "45kg": "rgb(239, 68, 68)",
  }
  const backgroundColors = []

  console.log(datosMes, cantidades)

  tiposSeleccionados.forEach((tipo) => {
    labels.push(`Cilindro ${tipo}`)
    const cantidad = datosMes?.tipos[tipo]?.cantidad || 0
    cantidades.push(cantidad)
    backgroundColors.push(colores[tipo])
  })

  const ctx = document.getElementById("chartComparativa").getContext("2d")

  if (chartComparativa) {
    chartComparativa.destroy()
  }

  const mesesNombres = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  chartComparativa = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: `Ventas en ${mesesNombres[mesSeleccionado - 1]}`,
          data: cantidades,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map((color) => color.replace("rgb", "rgba").replace(")", ", 1)")),
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${context.parsed.y} unidades`,
          },
        },
        title: {
          display: true,
          text: `Comparativa de Ventas - ${mesesNombres[mesSeleccionado - 1]} ${datosGlobales.anio}`,
          font: {
            size: 16,
            weight: "bold",
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Cantidad Vendida (unidades)",
          },
          ticks: {
            stepSize: 1,
          },
        },
        x: {
          title: {
            display: true,
            text: "Tipo de Cilindro",
          },
        },
      },
    },
  })
}
