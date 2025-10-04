const pool = require('../db');
const { registrarHistorial } = require('../utils/historial');

exports.registrar = async (req, res) => {
  const { tipo, descripcion, fecha, id_cilindro, id_usuario } = req.body;

  const usuarioResult = await pool.query('SELECT nombre FROM usuario WHERE id = $1', [id_usuario]);
  const usuarioNombre = usuarioResult.rows[0]?.nombre || 'Desconocido';

  console.log("Datos recibidos del frontend:", req.body);

  if (!tipo || !descripcion || !fecha || !id_cilindro || !id_usuario) {
    console.log("Error: faltan campos obligatorios");
    return res.status(400).json({ message: 'Todos los campossss son obligatorios' });
  }

  // Verificar que el cilindro exista y no esté perdido
  const cilindroResult = await pool.query(
    `SELECT id, estado FROM cilindro WHERE id = $1 AND (estado IS NULL OR estado != 'perdido')`,
    [id_cilindro]
  );

  if (cilindroResult.rows.length === 0) {
    console.log("No hay cilindros disponibles con el ID:", id_cilindro);
    return res.status(404).json({ message: 'No hay cilindros disponibles con el ID seleccionado' });
  }

  const cilindroId = cilindroResult.rows[0].id;
  console.log("Cilindro encontrado para pérdida:", cilindroId);

  try {
    // Registrar pérdida
    await pool.query(
      `INSERT INTO perdida (tipo, descripcion, fecha, fecha_registro, id_cilindro, id_usuario)
       VALUES ($1, $2, $3, NOW(), $4, $5)`,
      [tipo, descripcion, fecha, cilindroId, id_usuario]
    );

    // Cambiar estado a perdido
    await pool.query(`UPDATE cilindro SET estado = 'perdido' WHERE id = $1`, [cilindroId]);

    // Registrar historial con nombre del usuario
    await registrarHistorial(
      usuarioNombre,
      'Registro de pérdida',
      `Registró una pérdida de tipo "${tipo}" para cilindro ${id_cilindro}. Descripción: ${descripcion}`
    );

    res.json({ message: 'Pérdida registrada y cilindro actualizado correctamente' });
  } catch (err) {
    console.error('Error al registrar pérdida:', err);
    res.status(500).json({ message: 'Error al registrar pérdida' });
  }
};
