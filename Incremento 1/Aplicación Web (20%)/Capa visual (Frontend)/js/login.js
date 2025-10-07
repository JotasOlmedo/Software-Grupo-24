document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const mensaje = document.getElementById("mensaje");

  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const correo = document.getElementById("correo").value;
    const contrasena = document.getElementById("contrasena").value;

    try {
      const response = await fetch("http://localhost:3000/api/usuarios/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ correo, contrasena }),
      });

      const data = await response.json();

      if (data.message === "Login correcto") {
        // Puedes guardar algo en localStorage si quieres
        localStorage.setItem("usuario", data.nombre);
        window.location.href = "Dashboard.html";
      } else {
        mensaje.innerText = data.message;
      }
    } catch (error) {
      mensaje.innerText = "Error de conexión con el servidor.";
    }
  });
});