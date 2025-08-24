const pool = require('../db');

async function registrarHistorial(usuario, accion, detalles) {
  const now = new Date();
  const fecha = now.toISOString().split("T")[0];
  const hora = now.toTimeString().split(" ")[0].slice(0, 5);

  await pool.query(`
    INSERT INTO "Historial" (usuario, fecha, hora, accion, detalles)
    VALUES ($1, $2, $3, $4, $5)
  `, [usuario, fecha, hora, accion, detalles]);
}

module.exports = { registrarHistorial };
