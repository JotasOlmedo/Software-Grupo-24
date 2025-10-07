const pool = require('../db');
const { registrarHistorial } = require('../utils/historial');

exports.getAll = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "rol"');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPermisos = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT permisos FROM "rol" WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }
    res.json({ permisos: result.rows[0].permisos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePermisos = async (req, res) => {
  const { id } = req.params;
  const { permisos, usuarioAdmin  } = req.body;
  

  if (!Array.isArray(permisos)) {
    return res.status(400).json({ message: 'Permisos debe ser un arreglo' });
  }

  try {
    await pool.query('UPDATE "rol" SET permisos = $1 WHERE id = $2', [permisos, id]);
    const nombreRol = (await pool.query('SELECT nombre FROM "rol" WHERE id = $1', [id])).rows[0]?.nombre || `ID ${id}`;
    await registrarHistorial(
      usuarioAdmin,
      'Asignación de permisos',
      `Actualizó los permisos del rol "${nombreRol}" (${id}): [${permisos.join(', ')}]`
    );
    res.json({ message: 'Permisos actualizados correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};