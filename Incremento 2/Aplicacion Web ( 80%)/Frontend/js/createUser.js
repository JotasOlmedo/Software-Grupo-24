document.getElementById("createUserForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const mensajeUsuario = document.getElementById("mensajeUsuario");
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const usuarioAdmin = currentUser ? currentUser.name : "Admin_desconocido";

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
        if (!pwd) {
          msgErr.textContent = 'Ingrese su contraseña';
          msgErr.classList.remove('hidden');
          return;
        }
        msgErr.classList.add('hidden');
        cleanup(); 
        closeModalPwd(); 
        resolve(pwd);
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

  // ===== Función para crear usuario =====
  async function crearUsuario() {
    const user = {
      nombre: document.getElementById("nombre").value.trim(),
      apellido: document.getElementById("apellido").value.trim(),
      correo: document.getElementById("correo").value.trim(),
      rut: document.getElementById("rut").value.trim(),
      contrasena: document.getElementById("contrasena").value.trim(),
      rol_id: document.getElementById("rol_id").value,
      usuarioAdmin
    };

    if (!user.nombre || !user.apellido || !user.correo || !user.rut || !user.contrasena || !user.rol_id) {
      mensajeUsuario.textContent = "Por favor completa todos los campos.";
      mensajeUsuario.classList.remove("text-green-600");
      mensajeUsuario.classList.add("text-red-600");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/usuarios/crear-usuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      const data = await res.json();

      if (res.ok) {
        mensajeUsuario.textContent = data.message || "Usuario creado con éxito ✅";
        mensajeUsuario.classList.remove("text-red-600");
        mensajeUsuario.classList.add("text-green-600");
        document.getElementById("createUserForm").reset();
      } else {
        mensajeUsuario.textContent = data.message || "Error al crear usuario";
        mensajeUsuario.classList.remove("text-green-600");
        mensajeUsuario.classList.add("text-red-600");
      }
    } catch (err) {
      console.error(err);
      mensajeUsuario.textContent = "Error de conexión con el servidor";
      mensajeUsuario.classList.remove("text-green-600");
      mensajeUsuario.classList.add("text-red-600");
    }
  }

  // ===== Guarded action =====
  async function guardedAction(actionFn) {
    if (!currentUser?.id) { alert('No hay usuario en sesión.'); return; }
    const pwd = await promptPassword();
    if (!pwd) return; // cancelado
    try {
      await confirmarAntesDeExportar(currentUser.id, pwd);
      actionFn();
    } catch (e) {
      alert(e.message || 'No autorizado');
    }
  }

  // Ejecuta la acción protegida
  guardedAction(crearUsuario);

});
