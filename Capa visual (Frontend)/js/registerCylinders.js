document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formRegistroCilindro");
  const mensaje = document.getElementById("mensajeRegistro");
  const usuario = localStorage.getItem("usuario");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const tipo = document.getElementById("tipoCilindro").value;
    const cantidad = document.getElementById("cantidadCilindros").value;
    const estado = document.getElementById("estadoCilindro").value;

    if ( !tipo || !cantidad || !estado) {
      mensaje.innerText = "Todos los campos son obligatorios";
      mensaje.style.color = "red";
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/cilindros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, cantidad, estado, usuario })
      });
      const data = await res.json();

      mensaje.innerText = data.message;
      mensaje.style.color = res.ok ? "green" : "red";
      if (res.ok) form.reset();

    } catch (err) {
      mensaje.innerText = "Error al conectar con el servidor";
      mensaje.style.color = "red";
    }
  });
});
