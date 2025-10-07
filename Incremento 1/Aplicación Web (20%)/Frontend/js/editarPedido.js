document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("pedidosContainer");
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const usuarioAdmin = currentUser ? currentUser.name : "Admin_desconocido";

  if (!container) return;

  // Función para obtener pedidos desde backend
  const obtenerPedidos = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/pedidos");
      return await res.json();
    } catch (err) {
      console.error("Error al obtener pedidos:", err);
      return [];
    }
  };

  // Función para obtener choferes
  const obtenerChoferes = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/usuarios/choferes");
      return await res.json();
    } catch (err) {
      console.error("Error al obtener choferes:", err);
      return [];
    }
  };

  // Función para mostrar mensajes
  function mostrarMensaje(texto, tipo = "exito") {
    const msgDiv = document.getElementById("mensaje");
    msgDiv.textContent = texto;

    // Estilos según tipo de mensaje
    if (tipo === "exito") {
      msgDiv.className = "p-3 rounded-md bg-green-500 text-white font-semibold";
    } else {
      msgDiv.className = "p-3 rounded-md bg-red-500 text-white font-semibold";
    }

    // Mostrar
    msgDiv.classList.remove("hidden");

    // Ocultar después de 3 segundos
    setTimeout(() => {
      msgDiv.classList.add("hidden");
    }, 3000);
  }

  // Función para actualizar un pedido
  const actualizarPedido = async (pedidoId, estado, choferId, metodoPago) => {
    try {
      const res = await fetch(`http://localhost:3000/api/pedidos/${pedidoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, chofer_id: choferId, metodoPago, usuarioAdmin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al actualizar pedido");
      mostrarMensaje(`Pedido ${pedidoId} actualizado correctamente`, "exito");
    } catch (err) {
      console.error(err);
      alert("Error al actualizar pedido");
    }
  };

  const pedidos = await obtenerPedidos();
  const choferes = await obtenerChoferes();

  pedidos.forEach(pedido => {
    const card = document.createElement("div");
    card.className = "shadow-lg bg-white/80 backdrop-blur-sm p-4 rounded-xl";

    // Select de estado
    const estados = ["Pendiente", "En Proceso", "Entregado", "Cancelado"];
    const estadoSelect = document.createElement("select");
    estadoSelect.className = "border border-gray-300 rounded-md px-2 py-1 mb-2 w-full";
    estados.forEach(e => {
      const opt = document.createElement("option");
      opt.value = e;
      opt.textContent = e;
      if (e === pedido.estado) opt.selected = true;
      estadoSelect.appendChild(opt);
    });

    // Select de chofer
    const choferSelect = document.createElement("select");
    choferSelect.className = "border border-gray-300 rounded-md px-2 py-1 mb-2 w-full";
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "Sin chofer";
    choferSelect.appendChild(defaultOpt);

    choferes.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.nombre} ${c.apellido} (ID: ${c.id})`;
      if (c.id === pedido.chofer_id) opt.selected = true;
      choferSelect.appendChild(opt);
    });

    // Select de método de pago (oculto inicialmente)
    const metodoPagoSelect = document.createElement("select");
    metodoPagoSelect.className = "border border-gray-300 rounded-md px-2 py-1 mb-2 w-full hidden";
    ["Efectivo", "Transferencia", "Tarjeta"].forEach(m => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      if (m === pedido.metodopago) opt.selected = true;
      metodoPagoSelect.appendChild(opt);
    });

    // Mostrar/ocultar método de pago al cambiar estado
    estadoSelect.addEventListener("change", () => {
      if (estadoSelect.value === "Entregado") {
        metodoPagoSelect.classList.remove("hidden");
      } else {
        metodoPagoSelect.classList.add("hidden");
      }
    });

    // Botón guardar
    const btnGuardar = document.createElement("button");
    btnGuardar.textContent = "Guardar cambios";
    btnGuardar.className = "mt-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700";
    btnGuardar.onclick = () => {
      const choferId = choferSelect.value ? Number(choferSelect.value) : null;
      let metodoPago = pedido.metodopago;
      if (estadoSelect.value === "Entregado") {
        metodoPago = metodoPagoSelect.value;
        if (!metodoPago) {
          alert("Debes seleccionar un método de pago antes de guardar.");
          return;
        }
      }
      actualizarPedido(pedido.id_pedido, estadoSelect.value, choferId, metodoPago);
    };

    card.innerHTML = `
      <h3 class="text-lg font-semibold mb-1">Pedido ID: ${pedido.id_pedido}</h3>
      <p class="text-gray-600 mb-1">Cliente: ${pedido.nombre}</p>
      <p class="text-gray-600 mb-1">Fecha: ${pedido.fecha}</p>
      <p class="text-gray-600 mb-1">Monto Total: $${pedido.montototal}</p>
    `;
    card.appendChild(estadoSelect);
    card.appendChild(choferSelect);
    card.appendChild(metodoPagoSelect);
    card.appendChild(btnGuardar);

    container.appendChild(card);

    // Mostrar método de pago si el pedido ya está entregado
    if (pedido.estado === "Entregado") {
      metodoPagoSelect.classList.remove("hidden");
    }
  });

  window.lucide.createIcons();
});
