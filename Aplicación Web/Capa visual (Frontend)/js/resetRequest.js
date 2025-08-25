document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetForm");
  const mensaje = document.getElementById("mensaje");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const correo = document.getElementById("email").value;

    try {
      const res = await fetch("http://localhost:3000/api/usuarios/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo }),
      });

      const data = await res.json();

      if (res.ok) {
        mensaje.style.color = "green";
      } else {
        mensaje.style.color = "red";
      }

      mensaje.innerText = data.message;
    } catch (error) {
      mensaje.style.color = "red";
      mensaje.innerText = "Error de conexión con el servidor.";
    }
  });
});
