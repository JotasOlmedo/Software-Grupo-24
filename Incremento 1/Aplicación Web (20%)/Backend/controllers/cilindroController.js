const pool = require('../db');
const { registrarHistorial } = require('../utils/historial');
const { verificarYEnviarAlertas } = require('./inventarioController');

exports.registrar = async (req, res) => {
  const { tipo, cantidad, estado, usuarioAdmin } = req.body;
  const ubicacion = "Bodega Central";
  const inspeccionado = false;
  const imagen = 1;

  try {
    for (let i = 0; i < Number(cantidad); i++) {
      await pool.query(
        `INSERT INTO cilindro (tipo, estado, ubicacion, inspeccionado, imagen)
         VALUES ($1, $2, $3, $4, $5)`,
        [tipo, estado, ubicacion, inspeccionado, imagen]
      );
    }

    await registrarHistorial(
      usuarioAdmin,
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
    const result = await pool.query('SELECT * FROM cilindro');
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
    const query = `UPDATE cilindro SET estado = $1 WHERE id = ANY($2::int[])`;
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

exports.listarDisponibles = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, tipo, estado 
       FROM cilindro 
       WHERE estado IS NULL OR estado != 'perdido' AND estado != 'vendido'`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar cilindros disponibles:', err);
    res.status(500).json({ message: 'Error al listar cilindros disponibles' });
  }
};

exports.listarDisponiblesStock = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tipo, COUNT(*) AS stock
      FROM cilindro
      WHERE estado IS NULL OR estado != 'perdido AND estado != 'vendido'
      GROUP BY tipo
    `);
    res.json(result.rows); // devuelve [{tipo: '15kg', stock: 10}, ...]
  } catch (err) {
    console.error('Error al listar cilindros con stock:', err);
    res.status(500).json({ message: 'Error al listar cilindros con stock' });
  }
};