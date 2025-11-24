document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("tbodyLogins");
  const vacio = document.getElementById("vacio");
  const totalRegistros = document.getElementById("totalRegistros");
  const filtroUsuario = document.getElementById("filtroUsuario");
  const filtroDesde = document.getElementById("filtroDesde");
  const filtroHasta = document.getElementById("filtroHasta");
  const btnFiltrar = document.getElementById("btnFiltrar");

  async function cargarLogins() {
    let url = 'http://localhost:3000/api/historial/logins?';
    if (filtroUsuario.value) url += `usuario=${encodeURIComponent(filtroUsuario.value)}&`;
    if (filtroDesde.value) url += `fechaInicio=${filtroDesde.value}&`;
    if (filtroHasta.value) url += `fechaFin=${filtroHasta.value}&`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      tbody.innerHTML = '';
      if (data.length === 0) {
        vacio.classList.remove("hidden");
        totalRegistros.textContent = "Total de registros: 0";
        return;
      }

      vacio.classList.add("hidden");

      data.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="text-center">${row.usuario}</td>
          <td class="text-center">${row.fecha}</td>
          <td class="text-center">${row.hora}</td>
          <td class="text-center">${row.accion}</td>
        `;
        tbody.appendChild(tr);
      });

      totalRegistros.textContent = `Total de registros: ${data.length}`;
    } catch (err) {
      console.error("Error al cargar logins:", err);
    }
  }

  btnFiltrar.addEventListener("click", cargarLogins);

  // Cargar al inicio
  cargarLogins();
});
