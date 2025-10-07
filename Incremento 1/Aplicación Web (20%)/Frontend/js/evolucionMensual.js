const API_URL = "http://localhost:3000/api"

let chartEvolucion = null

document.addEventListener("DOMContentLoaded", () => {
  cargarDatos()

  document.getElementById("btnCargar").addEventListener("click", cargarDatos)
})

async function cargarDatos() {
  try {
    const anio = document.getElementById("selectAnio").value

    const response = await fetch(`${API_URL}/estadisticas/evolucion-mensual?anio=${anio}`)
    const data = await response.json()
    console.log("Respuesta API:", data)


    renderizarGrafico(data)
    renderizarTabla(data)
  } catch (error) {
    console.error("Error al cargar evolución mensual:", error)
    alert("Error al cargar datos")
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
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ]

  // Convertir el array de datos en un objeto para acceso rápido por mes
  const datosPorMes = {}
  data.datos.forEach(m => {
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
