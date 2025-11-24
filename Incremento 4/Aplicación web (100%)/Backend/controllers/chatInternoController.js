const pool = require("../db")
const { registrarHistorial } = require("../utils/historial")

// Enviar mensaje entre usuarios
exports.enviarMensaje = async (req, res) => {
  try {
    const { id_emisor, id_receptor, contenido } = req.body

    if (!id_emisor || !id_receptor || !contenido) {
      return res.status(400).json({
        message: "Emisor, receptor y contenido son obligatorios",
      })
    }

    // Verificar que ambos usuarios existen
    const emisorExiste = await pool.query("SELECT id, nombre FROM usuario WHERE id = $1", [id_emisor])
    const receptorExiste = await pool.query("SELECT id, nombre FROM usuario WHERE id = $1", [id_receptor])

    if (emisorExiste.rows.length === 0) {
      return res.status(404).json({ message: "Usuario emisor no encontrado" })
    }

    if (receptorExiste.rows.length === 0) {
      return res.status(404).json({ message: "Usuario receptor no encontrado" })
    }

    // Insertar mensaje
    const resultado = await pool.query(
      `INSERT INTO mensajes (id_emisor, id_receptor, contenido, timestamp)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [id_emisor, id_receptor, contenido],
    )

    // Registrar en historial
    await registrarHistorial(
      emisorExiste.rows[0].nombre,
      "Mensaje enviado",
      `Envió mensaje a ${receptorExiste.rows[0].nombre}`,
    )

    res.json({
      message: "Mensaje enviado correctamente",
      mensaje: resultado.rows[0],
    })
  } catch (err) {
    console.error("Error al enviar mensaje:", err.stack)
    console.error("Error al enviar mensaje:", err)
    res.status(500).json({
      message: "Error al enviar mensaje",
      error: err.message,
    })
  }
}

// Obtener conversación entre dos usuarios
exports.obtenerConversacion = async (req, res) => {
  try {
    const { id_usuario1, id_usuario2 } = req.params

    if (!id_usuario1 || !id_usuario2) {
      return res.status(400).json({
        message: "Se requieren ambos IDs de usuario",
      })
    }

    const resultado = await pool.query(
      `SELECT 
        m.*,
        u1.nombre as emisor_nombre,
        u1.apellido as emisor_apellido,
        u2.nombre as receptor_nombre,
        u2.apellido as receptor_apellido
       FROM mensajes m
       INNER JOIN usuario u1 ON m.id_emisor = u1.id
       INNER JOIN usuario u2 ON m.id_receptor = u2.id
       WHERE (m.id_emisor = $1 AND m.id_receptor = $2)
          OR (m.id_emisor = $2 AND m.id_receptor = $1)
       ORDER BY m.timestamp ASC`,
      [id_usuario1, id_usuario2],
    )

    res.json({
      conversacion: resultado.rows,
      total: resultado.rows.length,
    })
  } catch (err) {
    console.error("Error al obtener conversación:", err)
    res.status(500).json({
      message: "Error al obtener conversación",
      error: err.message,
    })
  }
}

// Obtener todas las conversaciones de un usuario
exports.obtenerConversaciones = async (req, res) => {
  try {
    const { id_usuario } = req.params

    if (!id_usuario) {
      return res.status(400).json({
        message: "ID de usuario es obligatorio",
      })
    }

    const resultado = await pool.query(
      `WITH conversaciones AS (
        SELECT 
          CASE 
            WHEN id_emisor = $1 THEN id_receptor
            ELSE id_emisor
          END as otro_usuario_id,
          MAX(timestamp) as ultimo_mensaje_fecha
        FROM mensajes
        WHERE id_emisor = $1 OR id_receptor = $1
        GROUP BY otro_usuario_id
      ),
      ultimos_mensajes AS (
        SELECT DISTINCT ON (
          CASE 
            WHEN m.id_emisor = $1 THEN m.id_receptor
            ELSE m.id_emisor
          END
        )
          m.*,
          CASE 
            WHEN m.id_emisor = $1 THEN m.id_receptor
            ELSE m.id_emisor
          END as otro_usuario_id
        FROM mensajes m
        WHERE m.id_emisor = $1 OR m.id_receptor = $1
        ORDER BY 
          CASE 
            WHEN m.id_emisor = $1 THEN m.id_receptor
            ELSE m.id_emisor
          END,
          m.timestamp DESC
      )
      SELECT 
        c.otro_usuario_id,
        u.nombre,
        u.apellido,
        u.correo,
        um.contenido as ultimo_mensaje,
        um.timestamp as ultimo_mensaje_fecha,
        um.id_emisor as ultimo_mensaje_emisor
      FROM conversaciones c
      INNER JOIN usuario u ON c.otro_usuario_id = u.id
      INNER JOIN ultimos_mensajes um ON c.otro_usuario_id = um.otro_usuario_id
      ORDER BY c.ultimo_mensaje_fecha DESC`,
      [id_usuario],
    )

    res.json({
      conversaciones: resultado.rows,
      total: resultado.rows.length,
    })
  } catch (err) {
    console.error("Error al obtener conversaciones:", err)
    res.status(500).json({
      message: "Error al obtener conversaciones",
      error: err.message,
    })
  }
}

// Obtener mensajes recientes
exports.obtenerMensajesRecientes = async (req, res) => {
  try {
    const { id_usuario } = req.params
    const limite = req.query.limite || 50

    if (!id_usuario) {
      return res.status(400).json({
        message: "ID de usuario es obligatorio",
      })
    }

    const resultado = await pool.query(
      `SELECT 
        m.*,
        u1.nombre as emisor_nombre,
        u1.apellido as emisor_apellido,
        u2.nombre as receptor_nombre,
        u2.apellido as receptor_apellido
       FROM mensajes m
       INNER JOIN usuario u1 ON m.id_emisor = u1.id
       INNER JOIN usuario u2 ON m.id_receptor = u2.id
       WHERE m.id_emisor = $1 OR m.id_receptor = $1
       ORDER BY m.timestamp DESC
       LIMIT $2`,
      [id_usuario, limite],
    )

    res.json({
      mensajes: resultado.rows,
      total: resultado.rows.length,
    })
  } catch (err) {
    console.error("Error al obtener mensajes recientes:", err)
    res.status(500).json({
      message: "Error al obtener mensajes recientes",
      error: err.message,
    })
  }
}

// Eliminar mensaje
exports.eliminarMensaje = async (req, res) => {
  try {
    const { id_msg } = req.params
    const { id_usuario } = req.body

    if (!id_msg || !id_usuario) {
      return res.status(400).json({
        message: "ID de mensaje y usuario son obligatorios",
      })
    }

    const mensaje = await pool.query("SELECT * FROM mensajes WHERE id_msg = $1", [id_msg])

    if (mensaje.rows.length === 0) {
      return res.status(404).json({ message: "Mensaje no encontrado" })
    }

    if (mensaje.rows[0].id_emisor !== Number.parseInt(id_usuario)) {
      return res.status(403).json({
        message: "No tienes permiso para eliminar este mensaje",
      })
    }

    await pool.query("DELETE FROM mensajes WHERE id_msg = $1", [id_msg])

    const usuario = await pool.query("SELECT nombre FROM usuario WHERE id = $1", [id_usuario])
    await registrarHistorial(usuario.rows[0].nombre, "Mensaje eliminado", `Eliminó mensaje ID ${id_msg}`)

    res.json({ message: "Mensaje eliminado correctamente" })
  } catch (err) {
    console.error("Error al eliminar mensaje:", err)
    res.status(500).json({
      message: "Error al eliminar mensaje",
      error: err.message,
    })
  }
}
