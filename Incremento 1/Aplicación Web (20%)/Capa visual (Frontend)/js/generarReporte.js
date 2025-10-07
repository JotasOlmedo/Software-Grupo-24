document.addEventListener("DOMContentLoaded", () => {
  const tabla = document.getElementById("tablaReporte");
  const totalGeneral = document.getElementById("totalCilindros");
  const totalLlenos = document.getElementById("totalLlenos");
  const totalVacios = document.getElementById("totalVacios");
  const botonPDF = document.getElementById("btnExportarPDF");
  const botonExcel = document.getElementById("btnExportarExcel");

  fetch("http://localhost:3000/api/inventario/reporte-diario")
    .then(res => res.json())
    .then(data => {
      const agrupado = {};

      data.forEach(({ tipo, estado, cantidad }) => {
        if (!agrupado[tipo]) agrupado[tipo] = { Lleno: 0, Vacío: 0 };
        agrupado[tipo][estado] = parseInt(cantidad);
      });

      let total = 0, llenos = 0, vacios = 0;

      Object.keys(agrupado).forEach(tipo => {
        const llenosTipo = agrupado[tipo]["Lleno"] || 0;
        const vaciosTipo = agrupado[tipo]["Vacío"] || 0;
        const subtotal = llenosTipo + vaciosTipo;
        total += subtotal;
        llenos += llenosTipo;
        vacios += vaciosTipo;

        const rowLleno = `
          <tr>
            <td>${tipo}</td>
            <td>${llenosTipo}</td>
            <td><span class="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">Llenos</span></td>
            <td>${subtotal}</td>
          </tr>`;

        const rowVacio = `
          <tr>
            <td>${tipo}</td>
            <td>${vaciosTipo}</td>
            <td><span class="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded">Vacíos</span></td>
            <td>${subtotal}</td>
          </tr>`;

        if (llenosTipo) tabla.innerHTML += rowLleno;
        if (vaciosTipo) tabla.innerHTML += rowVacio;
      });

      totalGeneral.innerText = total;
      totalLlenos.innerText = llenos;
      totalVacios.innerText = vacios;
    });

  function fechaHoyFormateada() {
    const hoy = new Date();
    return hoy.toISOString().split("T")[0]; // yyyy-mm-dd
  }

  // Exportar a PDF
  botonPDF.addEventListener("click", () => {
    const contenido = document.querySelector("#tablaReporte").closest("table");
    const nombre = `reporte_${fechaHoyFormateada()}.pdf`;
    html2pdf().from(contenido).set({ margin: 1, filename: nombre }).save();
  });

  // Exportar a Excel
  botonExcel.addEventListener("click", () => {
    const tablaHTML = document.getElementById("tablaReporte").closest("table");
    const wb = XLSX.utils.table_to_book(tablaHTML, { sheet: "Reporte" });
    XLSX.writeFile(wb, `reporte_${fechaHoyFormateada()}.xlsx`);
  });
});
