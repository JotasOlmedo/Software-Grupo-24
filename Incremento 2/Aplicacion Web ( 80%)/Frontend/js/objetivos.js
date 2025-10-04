const API_URL = "http://localhost:3000/api"

let chartCumplimiento = null

document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date()
  document.getElementById("selectMes").value = hoy.getMonth() + 1
  document.getElementById("selectAnio").value = hoy.getFullYear()

  document.getElementById("btnCargarCumplimiento").addEventListener("click", cargarCumplimiento)
  document.getElementById("btnMostrarFormulario").addEventListener("click", mostrarFormulario)
  document.getElementById("btnCancelar").addEventListener("click", ocultarFormulario)
  document.getElementById("formObjetivo").addEventListener("submit", guardarObjetivo)

  cargarChoferes()
})

function mostrarFormulario() {
  document.getElementById("formularioObjetivos").classList.remove("hidden")
}

function ocultarFormulario() {
  document.getElementById("formularioObjetivos").classList.add("hidden")
  document.getElementById("formObjetivo").reset()
}

async function cargarChoferes() {
  try {
    const response = await fetch(`${API_URL}/usuarios/choferes`)
    const data = await response.json()

    const selectFiltro = document.getElementById("selectChofer")
    const selectFormulario = document.getElementById("choferObjetivo")

    selectFiltro.innerHTML = '<option value="">Todos los choferes</option>'
    selectFormulario.innerHTML = '<option value="">Seleccionar chofer</option>'

    data.forEach((u) => {
      const optionFiltro = document.createElement("option")
      optionFiltro.value = u.id
      optionFiltro.textContent = `${u.nombre} ${u.apellido}`
      selectFiltro.appendChild(optionFiltro)

      const optionFormulario = document.createElement("option")
      optionFormulario.value = u.id
      optionFormulario.textContent = `${u.nombre} ${u.apellido}`
      selectFormulario.appendChild(optionFormulario)
    })
  } catch (error) {
    console.error("Error al cargar choferes:", error)
  }
}


async function guardarObjetivo(e) {
  e.preventDefault()

  const mes = Number.parseInt(document.getElementById("selectMes").value)
  const anio = Number.parseInt(document.getElementById("selectAnio").value)
  const tipo_objetivo = document.getElementById("tipoObjetivo").value
  const tipo_cilindro = document.getElementById("tipoCilindro").value
  const meta_cantidad = Number.parseInt(document.getElementById("metaCantidad").value)
  const id_usuario = document.getElementById("choferObjetivo").value || null

  try {
    const response = await fetch(`${API_URL}/objetivos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mes,
        anio,
        tipo_objetivo,
        tipo_cilindro,
        meta_cantidad,
        id_usuario,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      alert("Objetivo guardado exitosamente")
      ocultarFormulario()
      cargarCumplimiento()
    } else {
      alert("Error: " + (data.error || "No se pudo guardar el objetivo"))
    }
  } catch (error) {
    console.error("Error al guardar objetivo:", error)
    alert("Error al guardar objetivo")
  }
}

async function cargarCumplimiento() {
  try {
    const mes = document.getElementById("selectMes").value
    const anio = document.getElementById("selectAnio").value
    const id_usuario = document.getElementById("selectChofer").value

    let url = `${API_URL}/objetivos/cumplimiento?mes=${mes}&anio=${anio}`
    if (id_usuario) url += `&id_usuario=${id_usuario}`

    const response = await fetch(url)
    const data = await response.json()

    console.log("Cumplimiento:", data)

    if (data.cumplimiento && data.cumplimiento.length > 0) {
      document.getElementById("seccionCumplimiento").classList.remove("hidden")
      renderizarGrafico(data.cumplimiento)
    } else {
      alert("No hay objetivos definidos para este período")
      document.getElementById("seccionCumplimiento").classList.add("hidden")
      document.getElementById("seccionDetalle").classList.add("hidden")
    }
  } catch (error) {
    console.error("Error al cargar cumplimiento:", error)
    alert("Error al cargar datos de cumplimiento")
  }
}

// ---------- Render gráfico ----------
function renderizarGrafico(cumplimiento) {
  const ctx = document.getElementById("chartCumplimiento").getContext("2d")

  if (chartCumplimiento) chartCumplimiento.destroy()

  const labels = cumplimiento.map(c => {
    const tipo = c.tipo_objetivo === "ventas" ? "Ventas" : "Entregas"
    const cilindro = c.tipo_cilindro === "general" ? "General" : c.tipo_cilindro
    return `${tipo} - ${cilindro}`
  })

  const dataMeta = cumplimiento.map(c => c.meta_cantidad)
  const dataRealizado = cumplimiento.map(c => c.realizado)

  chartCumplimiento = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [
      { label: "Meta", data: dataMeta, backgroundColor: "rgba(59, 130, 246, 0.5)", borderColor: "rgb(59, 130, 246)", borderWidth: 2 },
      { label: "Realizado", data: dataRealizado, backgroundColor: "rgba(16, 185, 129, 0.5)", borderColor: "rgb(16, 185, 129)", borderWidth: 2 },
    ]},
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              const index = context.dataIndex
              const porcentaje = cumplimiento[index].porcentaje_cumplimiento
              return `Cumplimiento: ${porcentaje}%`
            },
          },
        },
      },
      scales: { y: { beginAtZero: true, title: { display: true, text: "Cantidad" } } },
    },
  })
};
