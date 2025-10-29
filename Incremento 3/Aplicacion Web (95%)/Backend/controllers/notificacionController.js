const pool = require("../db")
const { registrarHistorial } = require("../utils/historial")
const notificationService = require("../services/notificationService")

// Obtener todas las notificaciones
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id AS notificacion_id, tipo, mensaje, fecha, estado
      FROM notificacion
      ORDER BY fecha DESC NULLS LAST
    `)
    res.json(result.rows)
  } catch (err) {
    console.error("Error al obtener notificaciones:", err)
    res.status(500).json({ message: "Error al obtener notificaciones" })
  }
}

// Crear notificación
exports.crear = async (req, res) => {
  const { mensaje } = req.body

  if (!mensaje) {
    return res.status(400).json({ message: "El mensaje es obligatorio" })
  }

  try {
    const result = await pool.query(
      `INSERT INTO notificacion (tipo, mensaje, fecha, estado)
       VALUES ($1, $2, NOW(), 'activa') RETURNING *`,
      ["admin", mensaje],
    )

    await registrarHistorial(
      "Admin",
      "Creación de notificación",
      `Se creó la notificación ID ${result.rows[0].id} con mensaje: "${mensaje}"`,
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error al crear notificación:", err)
    res.status(500).json({ message: "Error al crear notificación" })
  }
}

// Eliminar notificación (solo admin)
exports.eliminar = async (req, res) => {
  const { id } = req.params

  try {
    const result = await pool.query(`DELETE FROM notificacion WHERE id = $1 RETURNING *`, [id])

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Notificación no encontrada" })
    }

    await registrarHistorial("Admin", "Eliminación de notificación", `Se eliminó la notificación ID ${id}`)

    res.json({ message: "Notificación eliminada correctamente" })
  } catch (err) {
    console.error("Error al eliminar notificación:", err)
    res.status(500).json({ message: "Error al eliminar notificación" })
  }
}

// Obtener alertas de stock activas
exports.getStockAlerts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id AS notificacion_id, tipo, mensaje, fecha, estado
      FROM notificacion
      WHERE tipo = 'stock' AND estado = 'activa'
      ORDER BY fecha DESC NULLS LAST
    `)
    res.json(result.rows)
  } catch (err) {
    console.error("Error al obtener alertas de stock:", err)
    res.status(500).json({ message: "Error al obtener alertas de stock" })
  }
}

// Marcar notificación como pendiente
exports.marcarPendiente = async (req, res) => {
  const { id } = req.params

  try {
    const result = await pool.query(`UPDATE notificacion SET estado = 'pendiente' WHERE id = $1 RETURNING *`, [id])

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Notificación no encontrada" })
    }

    await registrarHistorial(
      "Admin",
      "Actualización de notificación",
      `Se marcó como pendiente la notificación ID ${id}`,
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error("Error al actualizar notificación:", err)
    res.status(500).json({ message: "Error al actualizar notificación" })
  }
}

exports.manualStockCheck = async (req, res) => {
  try {
    const alerts = await notificationService.checkStockLevels()

    if (alerts.length > 0) {
      res.json({
        message: `Se enviaron ${alerts.length} alertas de stock bajo`,
        alerts,
      })
    } else {
      res.json({
        message: "Todos los niveles de stock están dentro del umbral",
        alerts: [],
      })
    }
  } catch (err) {
    console.error("Error al verificar stock:", err)
    res.status(500).json({ message: "Error al verificar stock" })
  }
}
