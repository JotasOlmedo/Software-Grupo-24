document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("formPerdida");
  const tipo = document.getElementById("tipoPerdida");
  const descripcion = document.getElementById("descripcionPerdida");
  const fecha = document.getElementById("fechaPerdida");
  const tipoCilindro = document.getElementById("tipoCilindro");
  const mensaje = document.getElementById("mensajePerdida");

  // Obtener usuario logueado
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const usuarioId = currentUser ? currentUser.id : null;

  // Función para cargar cilindros disponibles
  async function cargarCilindros() {
    try {
      const res = await fetch("http://localhost:3000/api/cilindros/disponibles");
      const cilindros = await res.json();

      tipoCilindro.innerHTML = ""; // limpiar opciones previas
      cilindros.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = `ID ${c.id} - ${c.tipo}`;
        tipoCilindro.appendChild(option);
      });
    } catch (err) {
      console.error("Error al cargar cilindros:", err);
    }
  }

  // Cargar cilindros al inicio
  await cargarCilindros();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!tipo.value || !descripcion.value.trim() || !fecha.value || !tipoCilindro.value) {
      mensaje.innerText = "Todos los campos son obligatorios.";
      mensaje.style.color = "red";
      return;
    }

    if (!usuarioId) {
      mensaje.innerText = "No hay un usuario logueado.";
      mensaje.style.color = "red";
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/perdidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: tipo.value,
          descripcion: descripcion.value.trim(),
          fecha: fecha.value,
          id_cilindro: tipoCilindro.value,
          id_usuario: usuarioId
        })
      });

      const data = await res.json();
      console.log('Respuesta backend:', data);

      mensaje.innerText = data.message;
      mensaje.style.color = res.ok ? "green" : "red";

      if (res.ok) {
        form.reset();
        // Recargar cilindros para que los perdidos no aparezcan
        await cargarCilindros();
      }

    } catch (err) {
      mensaje.innerText = "Error al conectar con el servidor.";
      mensaje.style.color = "red";
      console.error(err);
    }
  });
});
