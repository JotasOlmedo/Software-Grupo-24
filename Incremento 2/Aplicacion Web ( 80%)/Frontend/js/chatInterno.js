const API_URL = "http://localhost:3000/api/chatInterno"
const USERS_API_URL = "http://localhost:3000/api/usuarios"

let currentUser = null
let selectedUserId = null
let messagePollingInterval = null
const lucide = window.lucide 

const conversationsList = document.getElementById("conversationsList")
const emptyConversations = document.getElementById("emptyConversations")
const messagesArea = document.getElementById("messagesArea")
const welcomeMessage = document.getElementById("welcomeMessage")
const chatHeader = document.getElementById("chatHeader")
const messageInputContainer = document.getElementById("messageInputContainer")
const messageForm = document.getElementById("messageForm")
const messageInput = document.getElementById("messageInput")
const searchUsers = document.getElementById("searchUsers")
const userSearchResults = document.getElementById("userSearchResults")
const chatUserName = document.getElementById("chatUserName")
const chatUserRole = document.getElementById("chatUserRole")
const chatUserInitials = document.getElementById("chatUserInitials")

document.addEventListener("DOMContentLoaded", () => {
  const userData = localStorage.getItem("currentUser")
  if (!userData) {
    alert("Debes iniciar sesión para acceder al chat")
    window.location.href = "index.html"
    return
  }

  currentUser = JSON.parse(userData)

  loadConversations()


  messageForm.addEventListener("submit", handleSendMessage)
  searchUsers.addEventListener("input", handleUserSearch)

  // refresh  c/ 10 segundos
  setInterval(loadConversations, 10000)
})

async function loadConversations() {
  try {
    const response = await fetch(`${API_URL}/conversaciones/${currentUser.id}`)
    const data = await response.json()
    const conversaciones = data.conversaciones || []   

    if (conversaciones.length === 0) {
      conversationsList.innerHTML = ""
      emptyConversations.classList.remove("hidden")
      return
    }

    emptyConversations.classList.add("hidden")
    conversationsList.innerHTML = ""

    conversaciones.forEach((conv) => {  
      const isActive = selectedUserId === conv.otro_usuario_id
      const div = document.createElement("div")
      div.className = `p-4 cursor-pointer hover:bg-gray-50 transition-colors ${isActive ? "bg-green-50 border-l-4 border-green-600" : ""}`
      div.onclick = () => selectConversation(conv.otro_usuario_id, conv.nombre, conv.apellido, conv.rol_nombre)

      const initials = `${conv.nombre.charAt(0)}${conv.apellido.charAt(0)}`.toUpperCase()
      const lastMessagePreview = conv.ultimo_mensaje
        ? conv.ultimo_mensaje.length > 40
          ? conv.ultimo_mensaje.substring(0, 40) + "..."
          : conv.ultimo_mensaje
        : "Sin mensajes"

      const timeAgo = conv.ultimo_mensaje_fecha ? formatTimeAgo(new Date(conv.ultimo_mensaje_fecha)) : ""

      div.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
            ${initials}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <h4 class="font-semibold text-gray-900 truncate">${conv.nombre} ${conv.apellido}</h4>
              <span class="text-xs text-gray-500">${timeAgo}</span>
            </div>
            <p class="text-sm text-gray-600 truncate">${lastMessagePreview}</p>
            <p class="text-xs text-gray-500 mt-1">${conv.rol_nombre || "Usuario"}</p>
          </div>
        </div>
      `

      conversationsList.appendChild(div)
    })
  } catch (error) {
    console.error("Error al cargar conversaciones:", error)
  }
}


function selectConversation(userId, nombre, apellido, rolNombre) {
  selectedUserId = userId

  chatUserName.textContent = `${nombre} ${apellido}`
  chatUserRole.textContent = rolNombre || "Usuario" //Placeholder. A futuro, implementar c/clase
  chatUserInitials.textContent = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()

  welcomeMessage.classList.add("hidden")
  chatHeader.classList.remove("hidden")
  messageInputContainer.classList.remove("hidden")

  loadMessages()

  if (messagePollingInterval) {
    clearInterval(messagePollingInterval)
  }
  messagePollingInterval = setInterval(loadMessages, 5000)

  loadConversations()
}

async function loadMessages() {
  if (!selectedUserId) return

  try {
    const response = await fetch(`${API_URL}/conversacion/${currentUser.id}/${selectedUserId}`)
    const data = await response.json()
    const messages = data.conversacion || []


    messagesArea.innerHTML = ""

    if (messages.length === 0) {
      messagesArea.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <i data-lucide="message-square" class="w-12 h-12 mx-auto mb-2 text-gray-300"></i>
          <p>No hay mensajes aún</p>
          <p class="text-sm">Envía el primer mensaje para iniciar la conversación</p>
        </div>
      `
      lucide.createIcons()
      return
    }

    messages.forEach((msg) => {
      const isOwn = msg.id_emisor === currentUser.id
      const div = document.createElement("div")
      div.className = `flex ${isOwn ? "justify-end" : "justify-start"}`

      const time = new Date(msg.timestamp).toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      })

      div.innerHTML = `
        <div class="max-w-xs lg:max-w-md">
          <div class="${isOwn ? "bg-green-600 text-white" : "bg-gray-200 text-gray-900"} rounded-lg px-4 py-2 shadow">
            <p class="text-sm">${escapeHtml(msg.contenido)}</p>
          </div>
          <p class="text-xs text-gray-500 mt-1 ${isOwn ? "text-right" : "text-left"}">${time}</p>
        </div>
      `

      messagesArea.appendChild(div)
    })

    messagesArea.scrollTop = messagesArea.scrollHeight
  } catch (error) {
    console.error("Error al cargar mensajes:", error)
  }
}

async function handleSendMessage(e) {
  e.preventDefault()

  const contenido = messageInput.value.trim()
  if (!contenido || !selectedUserId) return

  try {
    const response = await fetch(`${API_URL}/enviar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_emisor: currentUser.id,
        id_receptor: selectedUserId,
        contenido: contenido,
      }),
    })

    if (!response.ok) {
      throw new Error("Error al enviar mensaje")
    }

    messageInput.value = ""

    await loadMessages()

    await loadConversations()
  } catch (error) {
    console.error("Error al enviar mensaje:", error)
    alert("Error al enviar el mensaje. Por favor, intenta de nuevo.")
  }
}

let searchTimeout = null
async function handleUserSearch(e) {
  const query = e.target.value.trim()

  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  if (query.length < 2) {
    userSearchResults.classList.add("hidden")
    userSearchResults.innerHTML = ""
    return
  }

  searchTimeout = setTimeout(async () => {
    try {
      const response = await fetch(`${USERS_API_URL}`)
      const users = await response.json()

      const filtered = users.filter(
        (user) =>
          user.id !== currentUser.id &&
          (user.nombre.toLowerCase().includes(query.toLowerCase()) ||
            user.apellido.toLowerCase().includes(query.toLowerCase()) ||
            user.correo.toLowerCase().includes(query.toLowerCase())),
      )

      if (filtered.length === 0) {
        userSearchResults.innerHTML = '<p class="p-2 text-sm text-gray-500">No se encontraron usuarios</p>'
        userSearchResults.classList.remove("hidden")
        return
      }

      userSearchResults.innerHTML = ""
      userSearchResults.classList.remove("hidden")

      filtered.forEach((user) => {
        const div = document.createElement("div")
        div.className = "p-2 hover:bg-gray-100 cursor-pointer rounded flex items-center gap-2"
        div.onclick = () => {
          selectConversation(user.id, user.nombre, user.apellido, user.rol_nombre)
          searchUsers.value = ""
          userSearchResults.classList.add("hidden")
        }

        const initials = `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase()

        div.innerHTML = `
          <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
            ${initials}
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium">${user.nombre} ${user.apellido}</p>
            <p class="text-xs text-gray-500">${user.correo}</p>
          </div>
        `

        userSearchResults.appendChild(div)
      })
    } catch (error) {
      console.error("Error al buscar usuarios:", error)
    }
  }, 300)
}

function formatTimeAgo(date) {
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Ahora"
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`

  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" })
}

function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}


window.addEventListener("beforeunload", () => {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval)
  }
})
