document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetForm");
  const mensaje = document.getElementById("mensaje");

  // Obtener token desde la URL
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (!token) {
    mensaje.innerText = "Token inválido o ausente.";
    form.style.display = "none";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nueva = document.getElementById("nuevaContrasena").value;
    const repetir = document.getElementById("confirmarContrasena").value;

    if (nueva !== repetir) {
      mensaje.innerText = "Las contraseñas no coinciden.";
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/usuarios/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nuevaContrasena: nueva }),
      });

      const data = await res.json();

      if (res.ok) {
        mensaje.style.color = "green";
      } else {
        mensaje.style.color = "red";
      }

      mensaje.innerText = data.message;
    } catch (err) {
      mensaje.style.color = "red";
      mensaje.innerText = "Error al conectar con el servidor.";
    }
  });
});
