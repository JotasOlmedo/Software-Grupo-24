document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("tablaCilindros");
  const filtroTipo = document.getElementById("filtroTipo");
  const filtroEstado = document.getElementById("filtroEstado");
  const botonActualizar = document.getElementById("btnActualizarEstado");
  const nuevoEstado = document.getElementById("nuevoEstado");
  const mensaje = document.getElementById("mensajeCambio");
  const contador = document.getElementById("cantidadSeleccionados");
  const usuario = localStorage.getItem("usuario");

  let cilindros = [];

  const actualizarCantidadSeleccionados = () => {
    const seleccionados = tbody.querySelectorAll("input[type='checkbox']:checked");
    contador.innerText = seleccionados.length;
    validarBoton();
  };

  const validarBoton = () => {
    const cantidad = parseInt(contador.innerText);
    const estado = nuevoEstado.value;
    botonActualizar.disabled = cantidad === 0 || estado === "";
    botonActualizar.classList.toggle("opacity-50", botonActualizar.disabled);
    botonActualizar.classList.toggle("cursor-not-allowed", botonActualizar.disabled);
  };

  const cargarCilindros = async () => {
    const res = await fetch("http://localhost:3000/api/cilindros");
    const data = await res.json();
    cilindros = data;
    renderTabla();
  };

  function renderTabla() {
    const tipoFiltro = filtroTipo.value;
    const estadoFiltro = filtroEstado.value;

    const filtrados = cilindros.filter(c => {
      return (
        (tipoFiltro === "" || c.tipo === tipoFiltro) &&
        (estadoFiltro === "" || c.estado === estadoFiltro)
      );
    });

    tbody.innerHTML = "";
    filtrados.forEach(c => {
      const fila = document.createElement("tr");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = c.id;
      checkbox.addEventListener("change", actualizarCantidadSeleccionados);

      fila.innerHTML = `
        <td></td>
        <td>${c.id}</td>
        <td>${c.tipo}</td>
        <td>${c.estado}</td>
        <td>${c.ubicacion}</td>
      `;
      fila.children[0].appendChild(checkbox);
      tbody.appendChild(fila);
    });

    const checkAll = document.getElementById("checkAllCilindros");
    if (checkAll) {
      checkAll.checked = false;
      checkAll.addEventListener("change", () => {
        const checkboxes = tbody.querySelectorAll("input[type='checkbox']");
        checkboxes.forEach(cb => {
          cb.checked = checkAll.checked;
        });
        actualizarCantidadSeleccionados();
      });
    }
    actualizarCantidadSeleccionados();
  }

  filtroTipo.addEventListener("change", renderTabla);
  filtroEstado.addEventListener("change", renderTabla);
  nuevoEstado.addEventListener("change", validarBoton);

  botonActualizar.addEventListener("click", async () => {
    const seleccionados = Array.from(tbody.querySelectorAll("input[type='checkbox']:checked")).map(cb => Number(cb.value));
    const estado = nuevoEstado.value;

    if (seleccionados.length === 0 || !estado) {
      mensaje.innerText = "Debes seleccionar cilindros y un nuevo estado";
      mensaje.style.color = "red";
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/cilindros/estado", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: seleccionados, nuevo_estado: estado, usuario })
      });
      const data = await res.json();
      mensaje.innerText = data.message;
      mensaje.style.color = res.ok ? "green" : "red";
      cargarCilindros();
    } catch (err) {
      mensaje.innerText = "Error al actualizar el estado";
      mensaje.style.color = "red";
    }
  });

  cargarCilindros();
});
