document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formPerdida");
  const tipo = document.getElementById("tipoPerdida");
  const descripcion = document.getElementById("descripcionPerdida");
  const fecha = document.getElementById("fechaPerdida");
  const tipoCilindro = document.getElementById("tipoCilindro");
  const mensaje = document.getElementById("mensajePerdida");
  const usuario = localStorage.getItem("usuario");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!tipo.value || !descripcion.value.trim() || !fecha.value || !tipoCilindro.value) {
      mensaje.innerText = "Todos los campos son obligatorios.";
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
          tipo_cilindro: tipoCilindro.value,
          usuario
        })
      });

      const data = await res.json();
      mensaje.innerText = data.message;
      mensaje.style.color = res.ok ? "green" : "red";
      if (res.ok) form.reset();

    } catch (err) {
      mensaje.innerText = "Error al conectar con el servidor.";
      mensaje.style.color = "red";
    }
  });
});
