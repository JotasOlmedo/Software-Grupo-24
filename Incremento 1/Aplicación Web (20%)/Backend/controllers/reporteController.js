const pool = require('../db');
const { registrarHistorial } = require('../utils/historial');

exports.adjuntarDocumento = async (req, res) => {
  try {
    const { version, fecha_venc, usuario_id, usuarioName ,link, tipo } = req.body;

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
      usuarioName,
      "Adjuntar documento",
      `El usuario ${usuarioName} adjuntó el documento ${tipo} (ID: ${nuevoReporte.id_reporte})`
    );

    const ahora = new Date();

    // Fecha de vencimiento del documento
    const fechaVenc = new Date(fecha_venc);

    // Fecha de activación del mensaje (5 días antes)
    const fechaInicioMensaje = new Date(fechaVenc);
    fechaInicioMensaje.setDate(fechaInicioMensaje.getDate() - 5);

    // Crear mensaje solo si faltan al menos 5 días
    if (fechaVenc > ahora) {
    const titulo = `Documento por vencer: ${tipo}`;
    const contenido = `El documento ID ${nuevoReporte.id_reporte} vencerá el ${fechaVenc.toLocaleDateString('es-CL')}`;

    await pool.query(
        `INSERT INTO mensaje_fijado (titulo, contenido, fecha_creacion, fecha_expiracion, usuario_creador)
        VALUES ($1, $2, NOW(), $3, $4)`,
        [titulo, contenido, fecha_venc, usuario_id]
    );

    await registrarHistorial(
        usuario_id,
        "Mensaje fijado automático",
        `Mensaje fijado creado para documento ID ${nuevoReporte.id_reporte} desde 5 días antes hasta el vencimiento`
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