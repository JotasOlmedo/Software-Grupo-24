const pool = require('../db');
const enviarAlertaStock = require('../utils/stockAlert');

exports.getAll = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Inventario"');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.reporteDiario = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT tipo, estado, COUNT(*) as cantidad
      FROM "Cilindro"
      GROUP BY tipo, estado
      ORDER BY tipo, estado
    `);

    res.json(resultado.rows);
  } catch (err) {
    console.error('Error al generar reporte:', err);
    res.status(500).json({ message: 'Error al generar el reporte diario' });
  }
};

async function verificarYEnviarAlertas() {
  const result = await pool.query(`
    SELECT tipo, COUNT(*) as cantidad
    FROM "Cilindro"
    WHERE estado = 'Lleno'
    GROUP BY tipo
    HAVING COUNT(*) < 5
  `);

  const stockBajo = result.rows;

  if (stockBajo.length > 0) {
    const destinatarios = await pool.query(`
      SELECT correo FROM "Usuario"
      WHERE rol_id IN (
        SELECT id FROM "rol" WHERE nombre IN ('Administrador', 'Supervisor')
      )
    `);

    const correos = destinatarios.rows.map(r => r.correo);
    await enviarAlertaStock(stockBajo, correos);
  }
}

module.exports.verificarYEnviarAlertas = verificarYEnviarAlertas;