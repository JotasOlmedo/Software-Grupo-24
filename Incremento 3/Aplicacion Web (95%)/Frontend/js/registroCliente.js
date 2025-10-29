document.addEventListener("DOMContentLoaded", () => {
  const clienteNombre = document.getElementById("clienteNombre");
  const clienteDireccion = document.getElementById("clienteDireccion");
  const clienteTelefono = document.getElementById("clienteTelefono");
  const registrarClienteBtn = document.getElementById("registrarCliente");
  const mensajeCliente = document.getElementById("mensajeCliente");
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const usuarioAdmin = currentUser?.name || null;

  registrarClienteBtn.addEventListener("click", async () => {
    mensajeCliente.innerText = "";
    mensajeCliente.style.color = "red";

    // Validar campos obligatorios
    if (!clienteNombre.value.trim() || !clienteDireccion.value.trim() || !clienteTelefono.value.trim()) {
      mensajeCliente.innerText = "Todos los campos son obligatorios.";
      return;
    }

    if (!usuarioAdmin) {
        mensajeCliente.innerText = "No se detectó usuario logueado. No se puede registrar historial.";
        mensajeCliente.style.color = "red";
        return;
    }

    const payload = {
      nombre: clienteNombre.value.trim(),
      direccion: clienteDireccion.value.trim(),
      telefono: clienteTelefono.value.trim(),
      usuarioAdmin // agregado para registrar historial
    };

    try {
      const res = await fetch("http://localhost:3000/api/clientes/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        mensajeCliente.style.color = "green";
        mensajeCliente.innerText = "Cliente registrado correctamente. ID: " + data.id_cliente;

        // Limpiar formulario
        clienteNombre.value = "";
        clienteDireccion.value = "";
        clienteTelefono.value = "";
      } else {
        mensajeCliente.innerText = data.message || "Error al registrar cliente.";
      }
    } catch (err) {
      console.error(err);
      mensajeCliente.innerText = "Error al conectar con el servidor.";
    }
  });
});
