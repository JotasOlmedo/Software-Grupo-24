const pool = require("../db")
const { registrarHistorial } = require("../utils/historial")

// cu39: Crear mensaje fijado (solo admin)
exports.crear = async (req, res) => {
  try {
    const { titulo, contenido, fecha_expiracion, usuario_admin, usuario_name} = req.body

    if (!titulo || !contenido) {
      return res.status(400).json({ message: "Título y contenido son obligatorios" })
    }

    // Crear tabla si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mensaje_fijado (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(200) NOT NULL,
        contenido TEXT NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT NOW(),
        fecha_expiracion TIMESTAMP,
        activo BOOLEAN DEFAULT true,
        usuario_creador INTEGER REFERENCES usuario(id)
      )
    `)

    const resultado = await pool.query(
      `INSERT INTO mensaje_fijado (titulo, contenido, fecha_expiracion, usuario_creador)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [titulo, contenido, fecha_expiracion || null, usuario_admin || null],
    )

    await registrarHistorial(usuario_name || "Admin", "Mensaje fijado creado", `Se creó el mensaje "${titulo}"`)

    res.json({
      message: "Mensaje fijado creado correctamente",
      mensaje: resultado.rows[0],
    })
  } catch (err) {
    console.error("Error al crear mensaje fijado:", err)
    res.status(500).json({ message: "Error al crear mensaje fijado", error: err.message })
  }
}

// Listar mensajes activos
exports.listarActivos = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT m.*, u.nombre as creador_nombre, u.apellido as creador_apellido
      FROM mensaje_fijado m
      LEFT JOIN usuario u ON m.usuario_creador = u.id
      WHERE m.activo = true
        AND (m.fecha_creacion IS NULL OR m.fecha_creacion <= NOW())  -- 👈 agregado
        AND (m.fecha_expiracion IS NULL OR m.fecha_expiracion > NOW())
      ORDER BY m.fecha_creacion DESC
    `);

    res.json(resultado.rows);
  } catch (err) {
    console.error("Error al listar mensajes:", err);
    res.status(500).json({ message: "Error al listar mensajes", error: err.message });
  }
};

// Desactivar mensaje
exports.desactivar = async (req, res) => {
  try {
    const { id } = req.params
    const { usuario_admin, usuario_Name} = req.body

    const resultado = await pool.query(
      `UPDATE mensaje_fijado 
       SET activo = false
       WHERE id = $1
       RETURNING *`,
      [id],
    )

    if (resultado.rows.length === 0) {
      return res.status(404).json({ message: "Mensaje no encontrado" })
    }

    await registrarHistorial(usuario_Name || "Admin", "Mensaje fijado desactivado", `Se desactivó el mensaje ID ${id}`)

    res.json({ message: "Mensaje desactivado correctamente" })
  } catch (err) {
    console.error("Error al desactivar mensaje:", err)
    res.status(500).json({ message: "Error al desactivar mensaje", error: err.message })
  }
}