document.addEventListener("DOMContentLoaded", () => {
  // --------- Referencias Inventario ----------
  const tablaReporte = document.getElementById("tablaReporte");
  const totalGeneral = document.getElementById("totalCilindros");
  const totalLlenos = document.getElementById("totalLlenos");
  const totalVacios = document.getElementById("totalVacios");
  const botonPDFInventario = document.getElementById("btnExportarPDF");
  const botonExcelInventario = document.getElementById("btnExportarExcel");

  // --------- Referencias Pedidos por Chofer ----------
  const selectChofer = document.getElementById("selectChofer");
  const inputFecha = document.getElementById("inputFecha");
  const btnFiltrar = document.getElementById("btnFiltrar");
  const tablaPedidosChofer = document.getElementById("tablaPedidosChofer");
  const botonPDFPedidos = document.getElementById("btnExportarPDFPedidos");
  const botonExcelPedidos = document.getElementById("btnExportarExcelPedidos");

  // --------- Utils ---------
  function fechaHoyFormateada() {
    const hoy = new Date();
    return hoy.toISOString().split("T")[0];
  }
  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); }
    catch { return {}; }
  }

  async function registrarHistorialAccion(accion, detalles = null) {
    const user = getCurrentUser(); 
    if (!user?.id) return;

    try {
      await fetch("http://localhost:3000/api/historial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: user.name,
          accion,
          detalles
        })
      });
    } catch (err) {
      console.error("Error enviando historial:", err);
    }
  }

  // ===== Modal helpers =====
  function openModalPwd() {
    const modal = document.getElementById('modalConfirmPwd');
    const input = document.getElementById('inputPwdConfirm');
    const msg = document.getElementById('msgPwdError');
    if (!modal) { alert("No se encontró el modal de confirmación"); return; }
    msg.classList.add('hidden');
    input.value = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => input.focus(), 0);
  }
  function closeModalPwd() {
    const modal = document.getElementById('modalConfirmPwd');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  // Pide la contraseña al usuario (modal) y devuelve Promise<string|null>
  function promptPassword() {
    return new Promise((resolve) => {
      openModalPwd();
      const btnOk = document.getElementById('btnPwdOk');
      const btnCancel = document.getElementById('btnPwdCancel');
      const inputPwd = document.getElementById('inputPwdConfirm');
      const msgErr = document.getElementById('msgPwdError');

      const cleanup = () => {
        btnOk.removeEventListener('click', onOk);
        btnCancel.removeEventListener('click', onCancel);
        inputPwd.removeEventListener('keydown', onEnter);
      };
      const onOk = () => {
        const pwd = inputPwd.value.trim();
        if (!pwd) { msgErr.textContent = 'Ingrese su contraseña'; msgErr.classList.remove('hidden'); return; }
        msgErr.classList.add('hidden');
        cleanup(); closeModalPwd(); resolve(pwd);
      };
      const onCancel = () => { cleanup(); closeModalPwd(); resolve(null); };
      const onEnter = (e) => { if (e.key === 'Enter') onOk(); };

      btnOk.addEventListener('click', onOk);
      btnCancel.addEventListener('click', onCancel);
      inputPwd.addEventListener('keydown', onEnter);
    });
  }

  // ===== Backend: confirmar contraseña (SIN token) =====
  async function confirmarAntesDeExportar(userId, password) {
    const res = await fetch(`http://localhost:3000/api/usuarios/${userId}/confirmar-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualPassword: password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No autorizado");
    return true;
  }

  // Envoltorio: pide contraseña y luego ejecuta la acción
  function guardedAction(actionFn) {
    return async () => {
      const user = getCurrentUser();
      if (!user?.id) { alert('No hay usuario en sesión.'); return; }
      const pwd = await promptPassword();
      if (!pwd) return; // cancelado
      try {
        await confirmarAntesDeExportar(user.id, pwd);
        actionFn();
      } catch (e) {
        alert(e.message || 'No autorizado');
      }
    };
  }

  // ======================
  // REPORTE INVENTARIO
  // ======================
  fetch("http://localhost:3000/api/inventario/reporte-diario")
    .then(res => res.json())
    .then(data => {
      const agrupado = {};
      data.forEach(({ tipo, estado, cantidad }) => {
        if (!agrupado[tipo]) agrupado[tipo] = { Lleno: 0, Vacío: 0 };
        agrupado[tipo][estado] = parseInt(cantidad, 10);
      });

      let total = 0, llenos = 0, vacios = 0;

      Object.keys(agrupado).forEach(tipo => {
        const llenosTipo = agrupado[tipo]["Lleno"] || 0;
        const vaciosTipo = agrupado[tipo]["Vacío"] || 0;
        const subtotal = llenosTipo + vaciosTipo;
        total += subtotal; llenos += llenosTipo; vacios += vaciosTipo;

        const rowLleno = `
          <tr>
            <td class="text-center">${tipo}</td>
            <td class="text-center">${llenosTipo}</td>
            <td><span class="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">Llenos</span></td>
            <td class="text-center">${subtotal}</td>
          </tr>`;
        const rowVacio = `
          <tr>
            <td class="text-center">${tipo}</td>
            <td class="text-center">${vaciosTipo}</td>
            <td><span class="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded">Vacíos</span></td>
            <td class="text-center">${subtotal}</td>
          </tr>`;

        if (llenosTipo) tablaReporte.innerHTML += rowLleno;
        if (vaciosTipo) tablaReporte.innerHTML += rowVacio;
      });

      totalGeneral.innerText = total;
      totalLlenos.innerText = llenos;
      totalVacios.innerText = vacios;

      console.log("Usuario actual:", getCurrentUser());
    });

  // ===== Exportadores (Inventario) =====
  function exportInventarioPDF() {
    const contenido = document.querySelector("#tablaReporte")?.closest("table");
    if (!contenido) return alert("No hay tabla para exportar");
    const nombre = `reporte_${fechaHoyFormateada()}.pdf`;
    html2pdf().from(contenido).set({
      margin: 10,
      filename: nombre,
      jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
      html2canvas: { scale: 2 }
    }).save();
    registrarHistorialAccion("Exportación de datos sensibles", `El usuario exportó Inventario en PDF (${nombre})`);
  }
  function exportInventarioExcel() {
    const tablaHTML = document.getElementById("tablaReporte")?.closest("table");
    if (!tablaHTML) return alert("No hay tabla para exportar");
    const wb = XLSX.utils.table_to_book(tablaHTML, { sheet: "Reporte" });
    const nombre = `reporte_${fechaHoyFormateada()}.xlsx`;
    XLSX.writeFile(wb, `reporte_${fechaHoyFormateada()}.xlsx`);
    registrarHistorialAccion("Exportación de datos sensibles", `El usuario exportó Inventario en Excel (${nombre})`);
  }

  // ===== Listeners protegidos (Inventario) =====
  if (botonPDFInventario)  botonPDFInventario.addEventListener("click", guardedAction(exportInventarioPDF));
  if (botonExcelInventario) botonExcelInventario.addEventListener("click", guardedAction(exportInventarioExcel));

  // ======================
  // REPORTE DE PEDIDOS POR CHOFER
  // ======================
  fetch("http://localhost:3000/api/usuarios/choferes")
    .then(res => res.json())
    .then(choferes => {
      choferes.forEach(chofer => {
        const option = document.createElement("option");
        option.value = chofer.id;
        option.textContent = `${chofer.nombre} (ID=${chofer.id})`;
        selectChofer.appendChild(option);
      });
    });

  if (btnFiltrar) {
    btnFiltrar.addEventListener("click", () => {
      const choferId = selectChofer.value;
      const fecha = inputFecha.value;
      let url = "";

      if (!choferId || !fecha) {
        alert("Debe seleccionar un chofer y una fecha");
        return;
      }

      if (choferId === "all") {
        url = `http://localhost:3000/api/pedidos/reporte-chofer?fecha=${encodeURIComponent(fecha)}`;
      } else {
        url = `http://localhost:3000/api/pedidos/reporte-chofer?chofer_id=${encodeURIComponent(choferId)}&fecha=${encodeURIComponent(fecha)}`;
      }

      fetch(url)
        .then(res => res.json())
        .then(pedidos => {
          tablaPedidosChofer.innerHTML = "";

          if (!Array.isArray(pedidos) || pedidos.length === 0) {
            tablaPedidosChofer.innerHTML = `
              <tr>
                <td colspan="4" class="text-center text-gray-500 p-4">
                  No hay pedidos para este filtro
                </td>
              </tr>`;
            return;
          }

          pedidos.forEach(p => {
            const row = `
              <tr>
                <td class="text-center">${p.id_pedido}</td>
                <td class="text-center">${p.cliente_nombre}</td>
                <td class="text-center">${p.direccion}</td>
                <td class="text-center">
                  <span class="px-2 py-1 rounded text-xs font-semibold 
                    ${p.estado === "Entregado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}">
                    ${p.estado}
                  </span>
                </td>
              </tr>`;
            tablaPedidosChofer.innerHTML += row;
          });
        });
    });
  }

  // ===== Exportadores (Pedidos) =====
  function exportPedidosPDF() {
    const tabla = document.getElementById("tablaPedidosChofer")?.closest("table");
    if (!tabla) return alert("No hay tabla para exportar");
    const choferId = document.getElementById("selectChofer").value || "sin_chofer";
    const nombre = `reporte_pedidos_chofer_${choferId}_${fechaHoyFormateada()}.pdf`;
    html2pdf().from(tabla).set({
      margin: 10,
      filename: nombre,
      jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
      html2canvas: { scale: 2 }
    }).save();
    registrarHistorialAccion("Exportación de datos sensibles", `El usuario exportó pedidos por chofer (ID=${choferId}) en PDF (${nombre})`);
  }
  function exportPedidosExcel() {
    const tabla = document.getElementById("tablaPedidosChofer")?.closest("table");
    if (!tabla) return alert("No hay tabla para exportar");
    const choferId = document.getElementById("selectChofer").value || "sin_chofer";
    const wb = XLSX.utils.table_to_book(tabla, { sheet: "Pedidos" });
    const nombre = `reporte_pedidos_chofer_${choferId}_${fechaHoyFormateada()}.xlsx`;
    XLSX.writeFile(wb, `reporte_pedidos_chofer_${choferId}_${fechaHoyFormateada()}.xlsx`);
    registrarHistorialAccion("Exportación de datos sensibles", `El usuario exportó pedidos por chofer (ID=${choferId}) en Excel (${nombre})`);
  }

  // ===== Listeners protegidos (Pedidos) =====
  if (botonPDFPedidos)   botonPDFPedidos.addEventListener("click", guardedAction(exportPedidosPDF));
  if (botonExcelPedidos) botonExcelPedidos.addEventListener("click", guardedAction(exportPedidosExcel));
});
