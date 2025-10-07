const pool = require('../db');

exports.listar = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT * FROM "Historial"
      ORDER BY fecha DESC, hora DESC
    `);
    res.json(resultado.rows);
  } catch (err) {
    console.error("Error al consultar historial:", err);
    res.status(500).json({ message: "Error al consultar historial" });
  }
};
