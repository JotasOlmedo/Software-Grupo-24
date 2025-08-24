// js/roleAssignment.js
document.addEventListener("DOMContentLoaded", () => {
  const userSelect = document.getElementById("selectUsuario");
  const roleSelect = document.getElementById("selectRol");
  const form = document.getElementById("formAsignarRol");
  const mensaje = document.getElementById("mensajeRol");
  const usuarioAdmin = localStorage.getItem("usuario");

  // 1. Cargar usuarios
  fetch("http://localhost:3000/api/usuarios")
    .then(res => res.json())
    .then(data => {
      data.forEach(user => {
        const option = document.createElement("option");
        option.value = user.id_usuario;
        option.textContent = user.nombre + " (" + user.correo + ")";
        userSelect.appendChild(option);
      });
    });

  // 2. Cargar roles
  fetch("http://localhost:3000/api/roles")
    .then(res => res.json())
    .then(data => {
      data.forEach(rol => {
        const option = document.createElement("option");
        option.value = rol.id;
        option.textContent = rol.nombre;
        roleSelect.appendChild(option);
      });
    });

  // 3. Enviar asignación
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const usuario = userSelect.value;
    const rol = roleSelect.value;

    if (!usuario || !rol) {
      mensaje.innerText = "Selecciona un usuario y un rol.";
      mensaje.style.color = "red";
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/usuarios/asignar-rol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuario, rol_id: rol, usuarioAdmin })
      });

      const data = await res.json();
      mensaje.innerText = data.message;
      mensaje.style.color = res.ok ? "green" : "red";
    } catch (err) {
      mensaje.innerText = "Error de conexión con el servidor.";
      mensaje.style.color = "red";
    }
  });
});
