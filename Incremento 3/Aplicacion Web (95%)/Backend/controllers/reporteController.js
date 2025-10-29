const pool = require('../db');
const { registrarHistorial } = require('../utils/historial');

// Adjuntar documento
exports.adjuntarDocumento = async (req, res) => {
  try {
    const { version, fecha_venc, usuario_id, usuarioName, link, tipo } = req.body;

    if (!fecha_venc || !link) {
      return res.status(400).json({ message: "Faltan datos: fecha de vencimiento o link" });
    }

    // Insertar en la tabla 'reporte'
    const resultado = await pool.query(
      `INSERT INTO reporte (fecha_pub, fecha_venc, version, tipo, direccion)
       VALUES (NOW(), $1, $2, $3, $4)
       RETURNING *`,
      [fecha_venc, version || "1.0", tipo || 'Documento Proveedores', link]
    );

    const nuevoReporte = resultado.rows[0];

    // Registrar en historial
    await registrarHistorial(
      usuarioName || usuario_id || "Desconocido",
      "Adjuntar documento",
      `El usuario ${usuarioName || usuario_id} adjuntó el documento ${tipo} (ID: ${nuevoReporte.id_reporte})`
    );

    // --- Programar mensaje ---
    const ahora = new Date();
    const fechaVenc = new Date(fecha_venc);

    if (!isNaN(fechaVenc.getTime()) && fechaVenc > ahora) {
      // Fecha inicio del mensaje = 5 días antes
      const fechaInicioMensaje = new Date(fechaVenc);
      fechaInicioMensaje.setDate(fechaInicioMensaje.getDate() - 5);

      const titulo = `Documento por vencer: ${tipo || 'Documento'}`;
      const contenido = `El documento ID ${nuevoReporte.id_reporte} vencerá el ${fechaVenc.toLocaleDateString('es-CL')}`;

      // Insertar mensaje fijado
      await pool.query(
        `INSERT INTO mensaje_fijado (titulo, contenido, fecha_creacion, fecha_expiracion, activo, usuario_creador)
         VALUES ($1, $2, $3, $4, true, $5)`,
        [
          titulo,
          contenido,
          fechaInicioMensaje.toISOString(),
          fechaVenc.toISOString(),
          usuario_id || null
        ]
      );
    }

    res.json({
      message: "Documento de proveedor registrado correctamente",
      reporte: nuevoReporte,
    });
  } catch (err) {
    console.error("Error al adjuntar documento proveedor:", err);
    res.status(500).json({ message: "Error al adjuntar documento proveedor", error: err.message });
  }
};

exports.listarReportes = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT * FROM reporte
       ORDER BY fecha_pub DESC`
    );

    res.json(resultado.rows);
  } catch (err) {
    console.error("Error al listar reportes:", err);
    res.status(500).json({ message: "Error al listar reportes", error: err.message });
  }
};