const pool = require("../db")
const { registrarHistorial } = require("../utils/historial")

// Get Bot user ID
async function getBotUserId() {
  const result = await pool.query("SELECT id FROM usuario WHERE correo = 'bot@valgas.system' LIMIT 1")
  if (result.rows.length === 0) {
    throw new Error("Bot user not found. Please run the bot user creation script.")
  }
  return result.rows[0].id
}

// Create notification in database
async function createNotification(tipo, mensaje, estado = "activa") {
  const result = await pool.query(
    `INSERT INTO notificacion (tipo, mensaje, fecha, estado)
     VALUES ($1, $2, NOW(), $3) RETURNING *`,
    [tipo, mensaje, estado],
  )
  return result.rows[0]
}

// Send chat message from Bot to user
async function sendBotMessage(receptorId, contenido) {
  try {
    const botId = await getBotUserId()

    const result = await pool.query(
      `INSERT INTO mensajes (id_emisor, id_receptor, contenido, timestamp)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [botId, receptorId, contenido],
    )

    return result.rows[0]
  } catch (error) {
    console.error("Error sending bot message:", error)
    throw error
  }
}

// Send notification to multiple users
async function sendBotMessageToMultiple(receptorIds, contenido) {
  const messages = []
  for (const receptorId of receptorIds) {
    try {
      const message = await sendBotMessage(receptorId, contenido)
      messages.push(message)
    } catch (error) {
      console.error(`Error sending message to user ${receptorId}:`, error)
    }
  }
  return messages
}

async function getAdminUsers() {
  const result = await pool.query(
    `SELECT u.id, u.nombre, u.apellido, u.correo
     FROM usuario u
     JOIN rol r ON u.rol_id = r.id
     WHERE r.nombre = 'Administrador'`,
  )
  return result.rows
}

async function getChoferUsers() {
  const result = await pool.query(
    `SELECT u.id, u.nombre, u.apellido, u.correo
     FROM usuario u
     JOIN rol r ON u.rol_id = r.id
     WHERE r.nombre = 'Chofer'`,
  )
  return result.rows
}

async function getJefeBodegaUsers() {
  const result = await pool.query(
    `SELECT u.id, u.nombre, u.apellido, u.correo
     FROM usuario u
     JOIN rol r ON u.rol_id = r.id
     WHERE r.nombre = 'Jefe de Bodega'`,
  )
  return result.rows
}


async function notifyLowStock(tipoCilindro, cantidadActual, umbral) {
  const mensaje = `⚠️ ALERTA DE STOCK BAJO\n\nTipo de cilindro: ${tipoCilindro}\nCantidad actual: ${cantidadActual}\nUmbral mínimo: ${umbral}\n\nSe requiere reabastecimiento urgente.`

  await createNotification("stock", mensaje, "activa")

  const admins = await getAdminUsers()
  const jefes = await getJefeBodegaUsers()


  const adminIds = admins.map((admin) => admin.id)
  const jefeIds = jefes.map((jefe) => jefe.id)

  await sendBotMessageToMultiple(adminIds, mensaje)
    await sendBotMessageToMultiple(jefeIds, mensaje)


  // Register in history
  await registrarHistorial(
    "Bot Sistema",
    "Notificación de stock bajo",
    `Alerta enviada para ${tipoCilindro}: ${cantidadActual} unidades (umbral: ${umbral})`,
  )

  return {
    tipo: "stock_bajo",
    mensaje,
    notificados: admins.length,
  }
}

async function notifyDeliveryCompleted(pedidoId, clienteNombre, choferNombre, choferId) {
  const mensaje = `✅ ENTREGA COMPLETADA\n\nPedido #${pedidoId}\nCliente: ${clienteNombre}\nChofer: ${choferNombre}\n\nLa entrega ha sido completada exitosamente.`

  await createNotification("entrega", mensaje, "activa")

  const admins = await getAdminUsers()
  const adminIds = admins.map((admin) => admin.id)

  await sendBotMessageToMultiple(adminIds, mensaje)

  if (choferId) {
    const mensajeChofer = `✅ ENTREGA CONFIRMADA\n\nPedido #${pedidoId}\nCliente: ${clienteNombre}\n\nTu entrega ha sido registrada exitosamente. ¡Buen trabajo!`
    await sendBotMessage(choferId, mensajeChofer)
  }

  // Register in history
  await registrarHistorial(
    "Bot Sistema",
    "Notificación de entrega completada",
    `Pedido #${pedidoId} entregado a ${clienteNombre} por ${choferNombre}`,
  )

  return {
    tipo: "entrega_completada",
    mensaje,
    notificados: admins.length + (choferId ? 1 : 0),
  }
}

async function checkStockLevels() {
  try {
    const thresholds = {
      "5kg": 10,
      "11kg": 15,
      "15kg": 20,
      "45kg": 10,
    }

    const alerts = []

    for (const [tipo, umbral] of Object.entries(thresholds)) {
      const result = await pool.query(
        `SELECT COUNT(*) as cantidad
         FROM cilindro
         WHERE tipo = $1
           AND (estado IS NULL OR estado = 'lleno')
           AND estado NOT IN ('vacio, en_transito, vendido, mantenimiento')`,
        [tipo],
      )

      const cantidadActual = Number.parseInt(result.rows[0].cantidad)

      if (cantidadActual < umbral) {
        const alert = await notifyLowStock(tipo, cantidadActual, umbral)
        alerts.push(alert)
      }
    }

    return alerts
  } catch (error) {
    console.error("Error checking stock levels:", error)
    throw error
  }
}

async function sendPushNotification(userId, title, body, data = {}) {
  console.log(`[PUSH NOTIFICATION] User ${userId}: ${title} - ${body}`)

  await pool.query(
    `INSERT INTO notificacion (tipo, mensaje, fecha, estado)
     VALUES ($1, $2, NOW(), 'enviada')`,
    ["push", JSON.stringify({ userId, title, body, data })],
  )

  return {
    success: true,
    message: "Push notification queued (integration pending)",
  }
}

module.exports = {
  getBotUserId,
  createNotification,
  sendBotMessage,
  sendBotMessageToMultiple,
  getAdminUsers,
  getChoferUsers,
  notifyLowStock,
  notifyDeliveryCompleted,
  checkStockLevels,
  sendPushNotification,
}
