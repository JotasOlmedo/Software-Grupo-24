const pool = require('../db');
const { registrarHistorial } = require('../utils/historial');

exports.registrar = async (req, res) => {
  const { tipo, descripcion, fecha, tipo_cilindro, usuario } = req.body;

  if (!tipo || !descripcion || !fecha || !tipo_cilindro) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  try {
    // Buscar un cilindro del tipo solicitado
    const result = await pool.query(
      `SELECT id FROM "Cilindro" WHERE tipo = $1 LIMIT 1`,
      [tipo_cilindro]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No hay cilindros disponibles del tipo seleccionado' });
    }

    const cilindroId = result.rows[0].id;

    // Registrar pérdida
    await pool.query(
      `INSERT INTO "Perdida" (tipo, descripcion, fecha, tipo_cilindro)
       VALUES ($1, $2, $3, $4)`,
      [tipo, descripcion, fecha, tipo_cilindro]
    );

    // Eliminar el cilindro del inventario
    await pool.query(
      `DELETE FROM "Cilindro" WHERE id = $1`,
      [cilindroId]
    );

    await registrarHistorial(
        usuario,
        'Registro de pérdida',
        `Registró una pérdida de tipo "${tipo}" para cilindro ${tipo_cilindro}. Descripción: ${descripcion}`
    );

    res.json({ message: 'Pérdida registrada y cilindro eliminado correctamente' });
  } catch (err) {
    console.error('Error al registrar pérdida:', err);
    res.status(500).json({ message: 'Error al registrar pérdida' });
  }
};
