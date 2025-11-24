document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("pedidosContainer")
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const usuarioAdmin = currentUser ? currentUser.name : "Admin_desconocido"
  // Modal elements
  const overlay = document.getElementById("inspeccionOverlay")
  const modal = document.getElementById("inspeccionModal")
  const form = document.getElementById("inspeccionForm")
  const pedidoIdInspeccion = document.getElementById("pedidoIdInspeccion")
  const vehiculoSelect = document.getElementById("vehiculoSelect")
  const choferInspeccionSelect = document.getElementById("choferInspeccionSelect")
  const listaCilindrosInspeccion = document.getElementById("listaCilindrosInspeccion")
  const obsGenerales = document.getElementById("obsGenerales")
  const btnCancelarInspeccion = document.getElementById("btnCancelarInspeccion")
  const btnCerrarInspeccion = document.getElementById("btnCerrarInspeccion")

  const fechaDesde = document.getElementById("fechaDesde")
  const fechaHasta = document.getElementById("fechaHasta")
  const btnAplicarFiltro = document.getElementById("btnAplicarFiltro")
  const btnLimpiarFiltro = document.getElementById("btnLimpiarFiltro")
  const filtroActivo = document.getElementById("filtroActivo")
  const filtroTexto = document.getElementById("filtroTexto")

  if (!container) return

  // Función para obtener pedidos desde backend
  const obtenerPedidos = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/pedidos")
      return await res.json()
    } catch (err) {
      console.error("Error al obtener pedidos:", err)
      return []
    }
  }

  // Función para obtener choferes
  const obtenerChoferes = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/usuarios/choferes")
      return await res.json()
    } catch (err) {
      console.error("Error al obtener choferes:", err)
      return []
    }
  }

  // Función para obtener vehículos
  const obtenerVehiculos = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/vehiculos")
      return await res.json()
    } catch (err) {
      console.error("Error al obtener vehículos:", err)
      return []
    }
  }

  // Función para obtener detalles de pedido (cilindros)
  const obtenerDetallesPedido = async (pedidoId) => {
    try {
      const res = await fetch(`http://localhost:3000/api/pedidos/detalle/listar/${pedidoId}`)
      return await res.json()
    } catch (err) {
      console.error("Error al obtener detalles del pedido:", err)
      return []
    }
  }

  // Función para obtener cilindros disponibles
  const obtenerCilindrosDisponibles = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/cilindros/disponibles")
      return await res.json()
    } catch (err) {
      console.error("Error al obtener cilindros disponibles:", err)
      return []
    }
  }

  // Función para mostrar mensajes
  function mostrarMensaje(texto, tipo = "exito") {
    const msgDiv = document.getElementById("mensaje")
    msgDiv.textContent = texto

    // Estilos según tipo de mensaje
    if (tipo === "exito") {
      msgDiv.className = "p-3 rounded-md bg-green-500 text-white font-semibold"
    } else {
      msgDiv.className = "p-3 rounded-md bg-red-500 text-white font-semibold"
    }

    // Mostrar
    msgDiv.classList.remove("hidden")

    // Ocultar después de 3 segundos
    setTimeout(() => {
      msgDiv.classList.add("hidden")
    }, 3000)
  }

  // Función para actualizar un pedido
  const actualizarPedido = async (pedidoId, estado, choferId, metodoPago, extra = {}) => {
    try {
      const res = await fetch(`http://localhost:3000/api/pedidos/${pedidoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, chofer_id: choferId, metodoPago, usuarioAdmin, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Error al actualizar pedido")
      mostrarMensaje(`Pedido ${pedidoId} actualizado correctamente`, "exito")
      return data
    } catch (err) {
      console.error(err)
      alert(err.message || "Error al actualizar pedido")
      throw err
    }
  }

  let pedidos = await obtenerPedidos()
  const choferes = await obtenerChoferes()
  const vehiculos = await obtenerVehiculos()

  // Ordenar por id_pedido DESC para consistencia visual
  pedidos = pedidos.slice().sort((a, b) => Number(b.id_pedido) - Number(a.id_pedido))

  const filtrarPedidosPorFecha = () => {
    const desde = fechaDesde.value
    const hasta = fechaHasta.value

    if (!desde && !hasta) {
      return pedidos
    }

    return pedidos.filter((pedido) => {
      const fechaPedido = new Date(pedido.fecha)

      if (desde && hasta) {
        const fechaDesdeObj = new Date(desde)
        const fechaHastaObj = new Date(hasta)
        return fechaPedido >= fechaDesdeObj && fechaPedido <= fechaHastaObj
      } else if (desde) {
        const fechaDesdeObj = new Date(desde)
        return fechaPedido >= fechaDesdeObj
      } else if (hasta) {
        const fechaHastaObj = new Date(hasta)
        return fechaPedido <= fechaHastaObj
      }

      return true
    })
  }

  const renderizarPedidos = (pedidosFiltrados) => {
    container.innerHTML = ""

    if (pedidosFiltrados.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12">
          <i data-lucide="search-x" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
          <p class="text-gray-600 text-lg">No se encontraron pedidos con los filtros aplicados</p>
        </div>
      `
      window.lucide.createIcons()
      return
    }

    pedidosFiltrados.forEach((pedido) => {
      const card = document.createElement("div")
      card.className = "shadow-lg bg-white/80 backdrop-blur-sm p-4 rounded-xl"

      // Select de estado
      const estados = ["Pendiente", "En Proceso", "Entregado", "Cancelado"]
      const estadoSelect = document.createElement("select")
      estadoSelect.className = "border border-gray-300 rounded-md px-2 py-1 mb-2 w-full"
      estados.forEach((e) => {
        const opt = document.createElement("option")
        opt.value = e
        opt.textContent = e
        if (e === pedido.estado) opt.selected = true
        estadoSelect.appendChild(opt)
      })

      // Select de chofer
      const choferSelect = document.createElement("select")
      choferSelect.className = "border border-gray-300 rounded-md px-2 py-1 mb-2 w-full"
      const defaultOpt = document.createElement("option")
      defaultOpt.value = ""
      defaultOpt.textContent = "Sin chofer"
      choferSelect.appendChild(defaultOpt)

      choferes.forEach((c) => {
        const opt = document.createElement("option")
        opt.value = c.id
        opt.textContent = `${c.nombre} ${c.apellido} (ID: ${c.id})`
        if (c.id === pedido.chofer_id) opt.selected = true
        choferSelect.appendChild(opt)
      })

      // Select de método de pago (oculto inicialmente)
      const metodoPagoSelect = document.createElement("select")
      metodoPagoSelect.className = "border border-gray-300 rounded-md px-2 py-1 mb-2 w-full hidden"
      ;["Efectivo", "Transferencia", "Tarjeta"].forEach((m) => {
        const opt = document.createElement("option")
        opt.value = m
        opt.textContent = m
        if (m === pedido.metodopago) opt.selected = true
        metodoPagoSelect.appendChild(opt)
      })

      // Mostrar/ocultar método de pago o levantar modal de inspección
      estadoSelect.addEventListener("change", async () => {
        if (estadoSelect.value === "Entregado") {
          metodoPagoSelect.classList.remove("hidden")
        } else {
          metodoPagoSelect.classList.add("hidden")
        }
        if (estadoSelect.value === "En Proceso") {
          await abrirInspeccionParaPedido(pedido)
        }
      })

      // Botón guardar
      const btnGuardar = document.createElement("button")
      btnGuardar.textContent = "Guardar cambios"
      btnGuardar.className = "mt-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
      btnGuardar.onclick = async () => {
        const choferId = choferSelect.value ? Number(choferSelect.value) : null
        let metodoPago = pedido.metodopago
        if (estadoSelect.value === "Entregado") {
          metodoPago = metodoPagoSelect.value
          if (!metodoPago) {
            alert("Debes seleccionar un método de pago antes de guardar.")
            return
          }
        }
        // Para "En Proceso" el flujo se completa desde el modal
        if (estadoSelect.value !== "En Proceso") {
          try {
            await actualizarPedido(pedido.id_pedido, estadoSelect.value, choferId, metodoPago)
            window.location.reload()
          } catch {}
        }
      }

      card.innerHTML = `
        <h3 class="text-lg font-semibold mb-1">Pedido ID: ${pedido.id_pedido}</h3>
        <p class="text-gray-600 mb-1">Cliente: ${pedido.nombre}</p>
        <p class="text-gray-600 mb-1">Fecha: ${pedido.fecha}</p>
        <p class="text-gray-600 mb-1"><span class="font-medium">Cilindros:</span> <span class="text-teal-700">${pedido.cilindros_resumen || "Sin cilindros"}</span></p>
        <p class="text-gray-600 mb-1">Monto Total: $${pedido.montototal}</p>
      `
      card.appendChild(estadoSelect)
      card.appendChild(choferSelect)
      card.appendChild(metodoPagoSelect)
      card.appendChild(btnGuardar)

      container.appendChild(card)

      // Mostrar método de pago si el pedido ya está entregado
      if (pedido.estado === "Entregado") {
        metodoPagoSelect.classList.remove("hidden")
      }
    })

    window.lucide.createIcons()
  }

  // Helper: abrir/cerrar modal
  const abrirModal = () => {
    overlay.classList.remove("hidden")
    modal.classList.remove("hidden")
    modal.classList.add("flex")
  }
  const cerrarModal = () => {
    overlay.classList.add("hidden")
    modal.classList.add("hidden")
    modal.classList.remove("flex")
    form.reset()
    listaCilindrosInspeccion.innerHTML = ""
  }
  btnCancelarInspeccion?.addEventListener("click", cerrarModal)
  btnCerrarInspeccion?.addEventListener("click", cerrarModal)
  overlay?.addEventListener("click", cerrarModal)

  // Rellena selects de vehículo y chofer del modal
  const poblarSelectsModal = () => {
    vehiculoSelect.innerHTML = ""
    const optVacio = document.createElement("option")
    optVacio.value = ""
    optVacio.textContent = "Seleccione un vehículo"
    vehiculoSelect.appendChild(optVacio)
    vehiculos.forEach((v) => {
      const opt = document.createElement("option")
      opt.value = v.id_transporte
      opt.textContent = `${v.patente} - ${v.conductor || "Sin conductor"}`
      vehiculoSelect.appendChild(opt)
    })

    choferInspeccionSelect.innerHTML = ""
    const optChoferVacio = document.createElement("option")
    optChoferVacio.value = ""
    optChoferVacio.textContent = "Sin chofer"
    choferInspeccionSelect.appendChild(optChoferVacio)
    choferes.forEach((c) => {
      const opt = document.createElement("option")
      opt.value = c.id
      opt.textContent = `${c.nombre} ${c.apellido} (ID:${c.id})`
      choferInspeccionSelect.appendChild(opt)
    })
  }

  // Abre y construye el modal para un pedido concreto
  const abrirInspeccionParaPedido = async (pedido) => {
    pedidoIdInspeccion.value = pedido.id_pedido
    poblarSelectsModal()
    // Preseleccionar chofer si el pedido ya tiene
    if (pedido.chofer_id) {
      choferInspeccionSelect.value = String(pedido.chofer_id)
    }
    obsGenerales.value = ""

    const [detalles, disponibles] = await Promise.all([
      obtenerDetallesPedido(pedido.id_pedido),
      obtenerCilindrosDisponibles(),
    ])

    // Mapa de cilindros disponibles por tipo
    const disponiblesPorTipo = disponibles.reduce((acc, c) => {
      // filtro extra en cliente: solo estado null o 'Lleno'
      const estadoOk = !c.estado || c.estado === "Lleno"
      if (!estadoOk) return acc
      acc[c.tipo] = acc[c.tipo] || []
      acc[c.tipo].push(c)
      return acc
    }, {})

    // Render de cada cilindro del pedido
    listaCilindrosInspeccion.innerHTML = ""
    detalles.forEach((d, idx) => {
      const wrap = document.createElement("div")
      wrap.className = "border rounded-lg p-3"
      wrap.innerHTML = `
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div class="text-sm text-gray-500">Cilindro ID</div>
            <div class="font-medium">${d.id_cilindro}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Tipo</div>
            <div class="font-medium">${d.tipo_cilindro}</div>
          </div>
          <div class="flex items-center gap-3">
            <label class="inline-flex items-center gap-1">
              <input type="radio" name="ok_${d.id_cilindro}" value="ok" class="text-teal-600" checked />
              <span>Aprobado</span>
            </label>
            <label class="inline-flex items-center gap-1">
              <input type="radio" name="ok_${d.id_cilindro}" value="replace" class="text-teal-600" />
              <span>Reemplazar</span>
            </label>
          </div>
        </div>
        <div class="mt-3 hidden" id="repWrap_${d.id_cilindro}">
          <label class="block text-sm text-gray-600 mb-1">Seleccione reemplazo del mismo tipo</label>
          <select id="repSel_${d.id_cilindro}" class="w-full border rounded-md px-2 py-2"></select>
        </div>
        <div class="mt-3">
          <input id="obs_${d.id_cilindro}" class="w-full border rounded-md px-3 py-2" placeholder="Observación para este cilindro (opcional)" />
        </div>
      `

      // Poblar reemplazos
      const repWrap = wrap.querySelector(`#repWrap_${d.id_cilindro}`)
      const repSel = wrap.querySelector(`#repSel_${d.id_cilindro}`)
      const mismosTipo = (disponiblesPorTipo[d.tipo_cilindro] || []).filter((c) => c.id !== d.id_cilindro)
      // Opción vacía
      const opt0 = document.createElement("option")
      opt0.value = ""
      opt0.textContent = "Seleccione un cilindro de reemplazo"
      repSel.appendChild(opt0)
      mismosTipo.forEach((c) => {
        const opt = document.createElement("option")
        opt.value = c.id
        opt.textContent = `ID ${c.id} - ${c.tipo}`
        repSel.appendChild(opt)
      })

      // Radios comportamiento
      const radios = wrap.querySelectorAll(`input[name="ok_${d.id_cilindro}"]`)
      radios.forEach((r) => {
        r.addEventListener("change", () => {
          if (r.value === "replace" && r.checked) {
            repWrap.classList.remove("hidden")
          } else if (r.value === "ok" && r.checked) {
            repWrap.classList.add("hidden")
            repSel.value = ""
          }
        })
      })

      listaCilindrosInspeccion.appendChild(wrap)
    })

    abrirModal()
  }

  btnAplicarFiltro?.addEventListener("click", () => {
    const pedidosFiltrados = filtrarPedidosPorFecha()
    renderizarPedidos(pedidosFiltrados)
    const desde = fechaDesde.value
    const hasta = fechaHasta.value

    if (desde || hasta) {
      let mensaje = "Filtro activo: "
      if (desde && hasta) {
        mensaje += `desde ${desde} hasta ${hasta}`
      } else if (desde) {
        mensaje += `desde ${desde}`
      } else {
        mensaje += `hasta ${hasta}`
      }
      filtroTexto.textContent = mensaje
      filtroActivo.classList.remove("hidden")
    }
  })

  btnLimpiarFiltro?.addEventListener("click", () => {
    fechaDesde.value = ""
    fechaHasta.value = ""
    filtroActivo.classList.add("hidden")
    renderizarPedidos(pedidos)
  })

  renderizarPedidos(pedidos)

  // Submit del modal de inspección
  form?.addEventListener("submit", async (e) => {
    e.preventDefault()
    const pedidoId = Number(pedidoIdInspeccion.value)
    const vehiculoId = vehiculoSelect.value ? Number(vehiculoSelect.value) : null
    const choferId = choferInspeccionSelect.value ? Number(choferInspeccionSelect.value) : null

    if (!vehiculoId) {
      alert("Debe seleccionar un vehículo para iniciar el despacho.")
      return
    }

    if (!choferId) {
      alert("Debe asignar un chofer para iniciar el despacho.")
      return
    }

    // Construir inspección por cilindro
    const detalles = await obtenerDetallesPedido(pedidoId)
    const cilindros = []
    for (const d of detalles) {
      const radios = document.querySelectorAll(`input[name="ok_${d.id_cilindro}"]`)
      let enCondiciones = true
      radios.forEach((r) => {
        if (r.checked && r.value === "replace") enCondiciones = false
      })
      const obs = document.getElementById(`obs_${d.id_cilindro}`).value?.trim()
      if (enCondiciones) {
        cilindros.push({ cilindro_id: d.id_cilindro, en_condiciones: true, comentarios: obs || undefined })
      } else {
        const repSel = document.getElementById(`repSel_${d.id_cilindro}`)
        const repId = repSel.value ? Number(repSel.value) : null
        if (!repId) {
          alert(`Debe seleccionar cilindro de reemplazo para el cilindro ${d.id_cilindro}`)
          return
        }
        cilindros.push({
          cilindro_id: d.id_cilindro,
          en_condiciones: false,
          cilindro_reemplazo_id: repId,
          comentarios: obs || undefined,
        })
      }
    }

    const extra = {
      vehiculo_id: vehiculoId,
      inspeccion: {
        cilindros,
        observaciones: obsGenerales.value?.trim() || undefined,
      },
    }

    try {
      await actualizarPedido(pedidoId, "En Proceso", choferId, null, extra)
      cerrarModal()
      window.location.reload()
    } catch {}
  })
})
