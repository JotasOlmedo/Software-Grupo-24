document.addEventListener("DOMContentLoaded", () => {
  const changePasswordForm = document.getElementById("changePasswordForm")
  const currentPasswordInput = document.getElementById("currentPassword")
  const newPasswordInput = document.getElementById("newPassword")
  const changePasswordMsg = document.getElementById("changePasswordMsg")

  // Elementos del DOM
  const elements = {
    userName: document.getElementById("userName"),
    userEmail: document.getElementById("userEmail"),
    userRole: document.getElementById("userRole"),
    totalActions: document.getElementById("totalActions"),
    todayActions: document.getElementById("todayActions"),
    recentActivityContainer: document.getElementById("recentActivityContainer"),
    refreshProfile: document.getElementById("refreshProfile"),
    lastSync: document.getElementById("lastSync"),
  }

  // Declare lucide variable
  const lucide = window.lucide

  // Última sincronización (Date)
  let lastSyncTime = null

  // Cargar datos del perfil
  loadProfileData()

  // Event listeners
  if (elements.refreshProfile) {
    elements.refreshProfile.addEventListener("click", () => {
      loadProfileData()
    })
  }

  // Actualizar timestamp cada minuto
  setInterval(updateLastSync, 60000)

  // Intenta obtener el usuario actual de varias fuentes:
  // 1) sessionStorage 'currentUser' (JSON)
  // 2) localStorage 'currentUser' (JSON)
  // 3) fallback antiguo 'usuario' (nombre)
  // 4) endpoint /api/me
  async function getCurrentUser() {
    try {
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
      if (!token) throw new Error("No hay token de autenticación");

      const resp = await fetch("http://localhost:3000/api/me", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const me = await resp.json();

      sessionStorage.setItem("currentUser", JSON.stringify(me));
      return me;

    } catch (err) {

      // Fallback: sessionStorage
      const fromSession = sessionStorage.getItem("currentUser");
      if (fromSession) return JSON.parse(fromSession);

      // Fallback: localStorage
      const fromLocal = localStorage.getItem("currentUser");
      if (fromLocal) return JSON.parse(fromLocal);

      return null;
    }
  }

  // Carga el perfil usando el usuario obtenido
  async function loadProfileData() {

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      showError("No se pudo determinar el usuario autenticado");
      return;
    }

    // Datos normalizados
    const userData = {
      name: currentUser.name || currentUser.nombre || "Usuario",
      email: currentUser.email || currentUser.correo || "",
      role: currentUser.role || currentUser.rol || "Usuario",
      id: currentUser.id || currentUser.userId || null,
      token: currentUser.token || null,
    };

    // Actualizar UI
    if (elements.userName) elements.userName.textContent = userData.name;
    if (elements.userEmail) elements.userEmail.textContent = userData.email;
    if (elements.userRole) elements.userRole.textContent = userData.role;

    // Cargar actividad reciente
    await loadRecentActivity(userData);

    lastSyncTime = new Date();
    updateLastSync();
  }

  // Ahora recibe userData para filtrar actividad por ese usuario
  async function loadRecentActivity(userData) {
    try {
      const headers = {}
      if (userData && userData.token) {
        headers["Authorization"] = `Bearer ${userData.token}`
      }
      headers["Content-Type"] = "application/json"

      // Construir query params para que el backend devuelva solo el historial del usuario
      const params = new URLSearchParams()
      if (userData.id) params.set("userId", userData.id)
      if (userData.email) params.set("email", userData.email)
      if (userData.name) params.set("usuario", userData.name)

      const baseUrl = "http://localhost:3000/api/historial"
      const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl

      // <-- QUITAR credentials: "include" aquí
      const response = await fetch(url, {
        headers, // sin credentials
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      let historialData = await response.json()
      // Si backend devuelve objeto con { rows: [...] }, extraer rows
      if (historialData && Array.isArray(historialData.rows)) {
        historialData = historialData.rows
      }

      if (!Array.isArray(historialData)) {
        historialData = []
      }

      // Fallback: filtrar localmente por si el backend no soportó bien el filtro
      const filtered = historialData.filter((item) => {
        // Normalizar posibles campos del item
        const itemEmail = (item.email || item.correo || "").toString().toLowerCase()
        const itemUsuario = (item.usuario || item.nombre || "").toString().toLowerCase()
        const itemUsuarioId = item.usuarioId || item.userId || item.id || null

        // Comparadores del usuario actual
        const userEmail = (userData.email || "").toString().toLowerCase()
        const userName = (userData.name || "").toString().toLowerCase()
        const userId = userData.id !== null && userData.id !== undefined ? userData.id.toString() : null

        if (userEmail && itemEmail && itemEmail === userEmail) return true
        if (userId && itemUsuarioId && itemUsuarioId.toString() === userId) return true
        if (userName && itemUsuario && itemUsuario === userName) return true

        return false
      })

      // Procesar datos para estadísticas con el conjunto filtrado
      const today = new Date().toISOString().split("T")[0]
      const todayActivities = filtered.filter((item) => item.fecha === today)

      // Actualizar estadísticas
      if (elements.totalActions) {
        elements.totalActions.textContent = filtered.length
      }
      if (elements.todayActions) {
        elements.todayActions.textContent = todayActivities.length
      }

      // Mostrar actividad reciente (últimos 7 registros)
      const recentActivities = filtered.slice(0, 7)
      displayRecentActivity(recentActivities)
    } catch (error) {
      showActivityError(userData)
    }
  }

  function displayRecentActivity(activities) {

    if (!elements.recentActivityContainer) return

    if (activities.length === 0) {
      elements.recentActivityContainer.innerHTML = `
                <div class="text-center py-6 text-gray-500">
                    <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 text-gray-400"></i>
                    <p class="text-sm">No hay actividad reciente</p>
                </div>
            `
      lucide && lucide.createIcons && lucide.createIcons()
      return
    }

    const activityHTML = activities
      .map((activity) => {
        const icon = getActivityIcon(activity.accion)
        const color = getActivityColor(activity.accion)

        return `
                <div class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div class="w-8 h-8 ${color.bg} rounded-full flex items-center justify-center flex-shrink-0">
                        <i data-lucide="${icon}" class="w-4 h-4 ${color.text}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">${activity.accion}</p>
                        <p class="text-xs text-gray-600 truncate">${activity.detalles || ""}</p>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-xs text-gray-500">${activity.usuario || ""}</span>
                            <span class="text-xs text-gray-400">•</span>
                            <span class="text-xs text-gray-500">${formatDate(activity.fecha)} ${activity.hora || ""}</span>
                        </div>
                    </div>
                </div>
            `
      })
      .join("")

    elements.recentActivityContainer.innerHTML = activityHTML
    lucide && lucide.createIcons && lucide.createIcons()
  }

  function getActivityIcon(action) {
    const iconMap = {
      "Registro de cilindros": "package",
      "Cambio de estado": "settings",
      "Registro de pérdida": "alert-circle",
      "Generación de reporte": "file-text",
      "Asignación de rol": "users",
    }
    return iconMap[action] || "activity"
  }

  function getActivityColor(action) {
    const colorMap = {
      "Registro de cilindros": { bg: "bg-purple-100", text: "text-purple-600" },
      "Cambio de estado": { bg: "bg-orange-100", text: "text-orange-600" },
      "Registro de pérdida": { bg: "bg-red-100", text: "text-red-600" },
      "Generación de reporte": { bg: "bg-cyan-100", text: "text-cyan-600" },
      "Asignación de rol": { bg: "bg-blue-100", text: "text-blue-600" },
    }
    return colorMap[action] || { bg: "bg-gray-100", text: "text-gray-600" }
  }

  function formatDate(dateString) {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateString === today.toISOString().split("T")[0]) {
      return "Hoy"
    } else if (dateString === yesterday.toISOString().split("T")[0]) {
      return "Ayer"
    } else {
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      })
    }
  }

  function showActivityError(userData) {
    if (!elements.recentActivityContainer) return

    elements.recentActivityContainer.innerHTML = `
            <div class="text-center py-6">
                <div class="w-12 h-12 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-3">
                    <i data-lucide="wifi-off" class="w-6 h-6 text-red-600"></i>
                </div>
                <p class="text-sm text-gray-600 mb-2">Error al cargar la actividad</p>
                <button id="retryActivity" class="text-blue-600 text-sm hover:text-blue-800">
                    Intentar nuevamente
                </button>
            </div>
        `
    lucide && lucide.createIcons && lucide.createIcons()

    // Adjuntar listener al botón creado
    const retryBtn = document.getElementById("retryActivity")
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        if (userData) {
          loadRecentActivity(userData)
        } else {
          // Si no tenemos userData, recargar todo el perfil
          loadProfileData()
        }
      })
    }
  }

  function showError(message) {
  }

  function updateLastSync() {
    if (elements.lastSync) {
      if (!lastSyncTime) {
        elements.lastSync.textContent = ""
        return
      }
      const diffMs = Date.now() - lastSyncTime.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)
      if (diffMinutes === 0) {
        elements.lastSync.textContent = "Hace unos segundos"
      } else if (diffMinutes === 1) {
        elements.lastSync.textContent = "Hace 1 min"
      } else {
        elements.lastSync.textContent = `Hace ${diffMinutes} min`
      }
    }
  }

  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const currentUser = await getCurrentUser()
      console.log("Usuario actual para cambio de contraseña:", currentUser)
      if (!currentUser || !currentUser.id) {
        changePasswordMsg.textContent = "Usuario no autenticado"
        changePasswordMsg.className = "text-red-600"
        return
      }

      const actualPassword = currentPasswordInput.value
      const nuevaPassword = newPasswordInput.value

      try {
        const resp = await fetch(`http://localhost:3000/api/usuarios/${currentUser.id}/password`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({ actualPassword, nuevaPassword })
        })

        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error || "Error al cambiar contraseña")

        changePasswordMsg.textContent = "Contraseña cambiada con éxito ✅"
        changePasswordMsg.className = "text-green-600"
        changePasswordForm.reset()
      } catch (err) {
        changePasswordMsg.textContent = err.message
        changePasswordMsg.className = "text-red-600"
      }
    })
  }
})
