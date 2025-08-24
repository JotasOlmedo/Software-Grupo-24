const pool = require('../db');
const { registrarHistorial } = require('../utils/historial');
const { verificarYEnviarAlertas } = require('./inventarioController');

exports.registrar = async (req, res) => {
  const { tipo, cantidad, estado, usuario } = req.body;
  const ubicacion = "Bodega Central";
  const inspeccionado = false;
  const inventario_id = 1;

  if (!tipo || !estado || !cantidad || isNaN(cantidad) || cantidad <= 0) {
    return res.status(400).json({ message: 'Tipo, estado y cantidad válida son obligatorios' });
  }

  try {
    for (let i = 0; i < Number(cantidad); i++) {
      await pool.query(
        `INSERT INTO "Cilindro" (tipo, estado, ubicacion, inspeccionado, inventario_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [tipo, estado, ubicacion, inspeccionado, inventario_id]
      );
    }

    await registrarHistorial(
      usuario,
      'Registro de cilindros',
      `Registró ${cantidad} cilindros de tipo ${tipo} con estado ${estado}`
    );
    await verificarYEnviarAlertas();
    res.json({ message: 'Cilindros registrados correctamente' });
  } catch (err) {
    console.error('Error al registrar cilindros:', err);
    res.status(500).json({ message: 'Error al registrar cilindros' });
  }
};

exports.listar = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Cilindro"');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar cilindros:', err);
    res.status(500).json({ message: 'Error al listar cilindros' });
  }
};

exports.actualizarEstado = async (req, res) => {
  const { ids, nuevo_estado, usuario } = req.body;

  if (!Array.isArray(ids) || !nuevo_estado) {
    return res.status(400).json({ message: 'Datos inválidos' });
  }

  try {
    const query = `UPDATE "Cilindro" SET estado = $1 WHERE id = ANY($2::int[])`;
    await pool.query(query, [nuevo_estado, ids]);  
    
    await registrarHistorial(
      usuario,
      'Cambio de estado de cilindros',
      `Cambió el estado de los cilindros con ID ${ids.join(', ')} a "${nuevo_estado}"`
    );
    await verificarYEnviarAlertas();

    res.json({ message: 'Estado actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar estado:', err);
    res.status(500).json({ message: 'Error al actualizar estado' });
  }
};