document.addEventListener("DOMContentLoaded", () => {
  const tabla = document.getElementById("tbodyPedidos");
  const filtroCliente = document.getElementById("filtroCliente");
  const filtroDesde = document.getElementById("filtroDesde");
  const filtroHasta = document.getElementById("filtroHasta");
  const totalPedidos = document.getElementById("totalPedidos");
  const vacio = document.getElementById("vacioPedidos");
  const btnLimpiar = document.getElementById("btnLimpiar");

  let pedidos = [];

  // Cargar datos desde el backend
  const cargarPedidos = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/pedidos");
      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error("Respuesta inesperada del servidor");
      }

      pedidos = data;
      renderTabla();
    } catch (err) {
      console.error("Error al cargar pedidos:", err);
      tabla.innerHTML = `<tr><td colspan="7" class="text-center text-red-500">Error al cargar los pedidos</td></tr>`;
    }
  };

  const renderTabla = () => {
    const cliente = filtroCliente.value.toLowerCase();
    const desde = filtroDesde.value;
    const hasta = filtroHasta.value;

    const filtrado = pedidos.filter(p => {
      const coincideCliente = !cliente || p.nombre.toLowerCase().includes(cliente);
      const coincideDesde = !desde || p.fecha >= desde;
      const coincideHasta = !hasta || p.fecha <= hasta;
      return coincideCliente && coincideDesde && coincideHasta;
    });

    tabla.innerHTML = "";

    if (filtrado.length === 0) {
      vacio.classList.remove("hidden");
    } else {
      vacio.classList.add("hidden");
      filtrado.forEach(p => {
        const fila = `
          <tr>
            <td class="text-center p-2">${p.id_pedido}</td>
            <td class="text-center p-2">${p.nombre}</td>
            <td class="text-center p-2">${p.fecha}</td>
            <td class="text-center p-2">${p.estado}</td>
            <td class="text-center p-2">$${p.montototal}</td>
            <td class="text-center p-2">${p.metodopago}</td>
            <td class="text-center p-2"> ${p.chofer_nombre ? `${p.chofer_nombre} ${p.chofer_apellido}` : '-'}</td>
          </tr>
        `;
        tabla.innerHTML += fila;
      });
    }

    totalPedidos.innerText = `Mostrando ${filtrado.length} pedido(s)`;
  };

  // Eventos de filtro
  [filtroCliente, filtroDesde, filtroHasta].forEach(el => el.addEventListener("input", renderTabla));

  // Limpiar filtros
  btnLimpiar.addEventListener("click", () => {
    filtroCliente.value = "";
    filtroDesde.value = "";
    filtroHasta.value = "";
    renderTabla();
  });

  cargarPedidos();
});
