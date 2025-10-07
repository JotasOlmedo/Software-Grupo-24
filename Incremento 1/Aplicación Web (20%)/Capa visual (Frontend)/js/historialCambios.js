document.addEventListener("DOMContentLoaded", () => {
  const tabla = document.getElementById("tablaHistorial");
  const filtroTexto = document.getElementById("filtroTexto");
  const filtroAccion = document.getElementById("filtroAccion");
  const filtroDesde = document.getElementById("filtroDesde");
  const filtroHasta = document.getElementById("filtroHasta");
  const contador = document.getElementById("totalRegistros");

  let historial = [];

  const hora = new Date("2025-06-16T04:00:00.000Z").toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const cargarDatos = async () => {
    const res = await fetch("http://localhost:3000/api/historial");
    const data = await res.json();
    historial = data;
    renderTabla();
  };

  const renderTabla = () => {
    const texto = filtroTexto.value.toLowerCase();
    const accion = filtroAccion.value;
    const desde = filtroDesde.value;
    const hasta = filtroHasta.value;

    const filtrado = historial.filter(h => {
      const coincideTexto = [h.usuario, h.accion, h.detalles].some(t => t.toLowerCase().includes(texto));
      const coincideAccion = accion === "" || h.accion === accion;
      const coincideFechaDesde = !desde || h.fecha >= desde;
      const coincideFechaHasta = !hasta || h.fecha <= hasta;
      return coincideTexto && coincideAccion && coincideFechaDesde && coincideFechaHasta;
    });

    tabla.innerHTML = "";
    filtrado.forEach(h => {
      const fila = `
        <tr>
          <td>${h.usuario}</td>
          <td>${h.fecha}</td>
          <td>${h.hora}</td>
          <td><span class="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">${h.accion}</span></td>
          <td>${h.detalles}</td>
        </tr>`;
      tabla.innerHTML += fila;
    });

    contador.innerText = `Mostrando ${filtrado.length} registro(s) de actividades`;
  };

  [filtroTexto, filtroAccion, filtroDesde, filtroHasta].forEach(el => el.addEventListener("input", renderTabla));

  cargarDatos();
});
