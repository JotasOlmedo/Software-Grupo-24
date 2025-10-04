document.addEventListener("DOMContentLoaded", () => {
  const pedidoClienteId = document.getElementById("pedidoClienteId");
  const pedidoFecha = document.getElementById("pedidoFecha");
  const pedidoMetodoPago = document.getElementById("pedidoMetodoPago");
  const pedidoChofer = document.getElementById("pedidoChofer");
  const registrarPedidoBtn = document.getElementById("registrarPedido");
  const mensajePedido = document.getElementById("mensajePedido");
  const detallesContainer = document.getElementById("detallesContainer");
  const agregarDetalleBtn = document.getElementById("agregarDetalle");
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const usuarioAdmin = currentUser?.name || null;

  // Cargar clientes
  const cargarClientes = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/clientes");
      const clientes = await res.json();

      pedidoClienteId.innerHTML = '<option value="">Seleccione un cliente</option>';
      clientes.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id_cliente;
        option.textContent = c.nombre;
        pedidoClienteId.appendChild(option);
      });
    } catch (err) {
      console.error("Error al cargar clientes:", err);
      mensajePedido.innerText = "No se pudieron cargar los clientes.";
      mensajePedido.style.color = "red";
    }
  };
  cargarClientes();

  // Cargar choferes
  const cargarChoferes = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/usuarios/choferes");
      const choferes = await response.json();


      const select = document.getElementById("pedidoChoferId");
      select.innerHTML = '<option value="">Seleccione un chofer</option>'; // limpia primero

      choferes.forEach((chofer) => {
        const option = document.createElement("option");
        option.value = chofer.id;        // id del usuario/chofer
        option.textContent = `${chofer.nombre} ${chofer.apellido} (ID: ${chofer.id})`;
        select.appendChild(option);
      });
    } catch (error) {
      console.error("Error al cargar choferes:", error);
    }
  };

  cargarChoferes();

  // Cargar cilindros
  const cargarCilindros = async (select) => {
    try {
      const res = await fetch("http://localhost:3000/api/cilindros/disponibles");
      const cilindros = await res.json();

      select.innerHTML = '<option value="">Seleccione cilindro</option>';

      // Agrupar por tipo y mostrar stock real
      const stockPorTipo = {};
      cilindros.forEach(c => {
        if (!stockPorTipo[c.tipo]) stockPorTipo[c.tipo] = [];
        stockPorTipo[c.tipo].push(c.id);
      });

      Object.keys(stockPorTipo).forEach(tipo => {
        const opt = document.createElement("option");
        opt.value = tipo; // <-- enviamos tipo, no id individual
        opt.textContent = `${tipo} - Stock: ${stockPorTipo[tipo].length}`;
        select.appendChild(opt);
      });
    } catch (err) {
      console.error("Error al cargar cilindros:", err);
    }
  };

  // Agregar nueva fila de detalle
  const agregarFilaDetalle = () => {
    const fila = document.createElement("div");
    fila.classList.add("detalle-row", "grid", "grid-cols-3", "gap-2");

    fila.innerHTML = `
      <select class="detalleCilindro h-12 border border-gray-300 rounded-md px-2"></select>
      <input type="number" class="detalleCantidad h-12 border border-gray-300 rounded-md px-2" placeholder="Cantidad"/>
      <input type="number" class="detallePrecio h-12 border border-gray-300 rounded-md px-2" placeholder="Precio Unitario"/>
    `;

    if (detallesContainer.querySelectorAll(".detalle-row").length >= 1) {
      const btnEliminar = document.createElement("button");
      btnEliminar.textContent = "Eliminar";
      btnEliminar.classList.add("bg-red-500", "text-white", "px-3", "rounded-md");
      btnEliminar.onclick = () => fila.remove();
      fila.appendChild(btnEliminar);
    }

    detallesContainer.appendChild(fila);
    const selectCilindro = fila.querySelector(".detalleCilindro");
    cargarCilindros(selectCilindro);
  };

  // Inicializar con una fila
  agregarFilaDetalle();

  // Botón agregar detalle
  agregarDetalleBtn.addEventListener("click", () => {
    agregarFilaDetalle();
  });

  // Obtener detalles
  const obtenerDetalles = () => {
    const filas = detallesContainer.querySelectorAll(".detalle-row");
    const detalles = [];

    filas.forEach(fila => {
      const tipo = fila.querySelector(".detalleCilindro").value;
      const cantidad = parseInt(fila.querySelector(".detalleCantidad").value) || 0;
      const precio = parseFloat(fila.querySelector(".detallePrecio").value) || 0;

      if (tipo && cantidad > 0 && precio > 0) {
        detalles.push({ tipo, cantidad, preciounitario: precio });
      }
    });

    return detalles;
  };

  // Registrar pedido + detalles
  registrarPedidoBtn.addEventListener("click", async () => {
    mensajePedido.innerText = "";
    mensajePedido.style.color = "red";

    if (!pedidoClienteId.value || !pedidoFecha.value || !pedidoMetodoPago.value) {
      mensajePedido.innerText = "Todos los campos obligatorios del pedido deben completarse.";
      return;
    }

    const detalles = obtenerDetalles();
    if (detalles.length === 0) {
      mensajePedido.innerText = "Agregue al menos un detalle de pedido.";
      return;
    }
    const filas = detallesContainer.querySelectorAll(".detalle-row");
    if (filas.length === 0) {
      mensajePedido.innerText = "Agregue al menos un detalle de pedido.";
      return;
    }

    // Calcular montototal sumando cantidad * precio unitario de cada fila
    const montoTotal = Array.from(filas).reduce((acc, fila) => {
      const cantidad = parseInt(fila.querySelector(".detalleCantidad").value) || 0;
      const precio = parseFloat(fila.querySelector(".detallePrecio").value) || 0;
      return acc + (cantidad * precio);
    }, 0);

    try {
      // Registrar pedido
      const payloadPedido = {
        cliente_id: pedidoClienteId.value,
        fecha: pedidoFecha.value,
        metodoPago: pedidoMetodoPago.value,
        chofer_id: pedidoChoferId.value || null,
        montototal: montoTotal,
        usuarioAdmin: usuarioAdmin
      };

      const resPedido = await fetch("http://localhost:3000/api/pedidos/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadPedido)
      });

      const dataPedido = await resPedido.json();
      if (!resPedido.ok) {
        mensajePedido.innerText = dataPedido.message || "Error al registrar pedido.";
        return;
      }

      const pedidoId = dataPedido.pedidoId;

      // Registrar cada detalle
      for (const det of detalles) {
        const resDetalle = await fetch("http://localhost:3000/api/pedidos/detalle/registrar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...det, id_pedido: pedidoId })
        });

        const dataDetalle = await resDetalle.json();
        if (!resDetalle.ok) {
          mensajePedido.innerText = dataDetalle.message || "Error al registrar detalle de pedido.";
          return;
        }
      }

      mensajePedido.style.color = "green";
      mensajePedido.innerText = `Pedido y detalles registrados correctamente. ID Pedido: ${pedidoId}`;

      // Limpiar formulario
      pedidoClienteId.value = "";
      pedidoFecha.value = "";
      pedidoMetodoPago.value = "";
      pedidoChoferId.value = "";
      detallesContainer.innerHTML = "";
      agregarFilaDetalle(); // fila inicial
    } catch (err) {
      console.error(err);
      mensajePedido.innerText = "Error al conectar con el servidor.";
    }
  });
});
