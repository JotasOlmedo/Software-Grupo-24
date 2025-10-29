document.addEventListener("DOMContentLoaded", () => {
  const tipoSelect = document.getElementById("busquedaTipo");
  const estadoSelect = document.getElementById("busquedaEstado");
  const botonBuscar = document.getElementById("btnBuscarCilindros");
  const resumen = document.getElementById("resumenResultados");
  const contenedor = document.getElementById("resultados");
  const tablaContenedor = document.getElementById("tablaResultados");

  let cilindros = [];

  const cargarCilindros = async () => {
    const res = await fetch("http://localhost:3000/api/cilindros");
    const data = await res.json();
    cilindros = data;
  };

  const renderTabla = (filtrados) => {
    tablaContenedor.innerHTML = "";
    if (filtrados.length === 0) {
      resumen.innerText = "No se encontraron cilindros con esos criterios.";
      return;
    }

    resumen.innerText = `Se encontraron ${filtrados.length} cilindro(s) que coinciden con los criterios`;

    const tabla = document.createElement("table");
    tabla.className = "w-full table-auto text-sm text-left border-collapse";
    tabla.innerHTML = `
      <thead>
        <tr class="bg-gray-100 text-gray-700">
          <th class="px-4 py-2">ID</th>
          <th class="px-4 py-2">Tipo</th>
          <th class="px-4 py-2">Estado</th>
          <th class="px-4 py-2">Ubicación</th>
        </tr>
      </thead>
      <tbody>
        ${filtrados.map(c => `
          <tr class="border-t">
            <td class="px-4 py-2">${c.id.toString().padStart(3, '0')}</td>
            <td class="px-4 py-2">${c.tipo}</td>
            <td class="px-4 py-2">
              <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${c.estado === 'Lleno' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                ${c.estado.toLowerCase()}
              </span>
            </td>
            <td class="px-4 py-2">${c.ubicacion}</td>
          </tr>
        `).join("")}
      </tbody>
    `;

    tablaContenedor.appendChild(tabla);
    contenedor.classList.remove("hidden");
  };

  botonBuscar.addEventListener("click", () => {
    const tipo = tipoSelect.value;
    const estado = estadoSelect.value;

    const resultado = cilindros.filter(c => {
      return (
        (tipo === "" || c.tipo === tipo) &&
        (estado === "" || c.estado === estado)
      );
    });

    renderTabla(resultado);
  });

  cargarCilindros();
});
