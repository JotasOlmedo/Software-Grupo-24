const pool = require('../db');
const { registrarHistorial } = require('../utils/historial');

exports.listar = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT 
        usuario,
        TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
        hora,
        accion,
        detalles
      FROM historial
      WHERE accion NOT IN ('Inicio de sesión', 'Intento fallido de inicio de sesión')
      ORDER BY (fecha::timestamp + hora) DESC
    `);
    res.json(resultado.rows);
  } catch (err) {
    console.error("Error al consultar historial:", err);
    res.status(500).json({ message: "Error al consultar historial" });
  }
};

// Listar solo inicios de sesión
exports.listarLogins = async (req, res) => {
  try {
    const { usuario, fechaInicio, fechaFin } = req.query;

    let filtros = [];
    let valores = [];
    let idx = 1;

    filtros.push(`(accion = 'Inicio de sesión' OR accion = 'Intento fallido de inicio de sesión')`);

    if (usuario) {
      filtros.push(`usuario = $${idx}`);
      valores.push(usuario);
      idx++;
    }

    if (fechaInicio) {
      filtros.push(`fecha >= $${idx}`);
      valores.push(fechaInicio);
      idx++;
    }

    if (fechaFin) {
      filtros.push(`fecha <= $${idx}`);
      valores.push(fechaFin);
      idx++;
    }

    const whereClause = filtros.length ? 'WHERE ' + filtros.join(' AND ') : '';

    const resultado = await pool.query(`
      SELECT 
        usuario,
        TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
        hora,
        accion,
        detalles
      FROM historial
      ${whereClause}
      ORDER BY (fecha::timestamp + hora) DESC
    `, valores);

    res.json(resultado.rows);
  } catch (err) {
    console.error("Error al consultar logins:", err);
    res.status(500).json({ message: "Error al consultar logins" });
  }
};

exports.registrar = async (req, res) => {
  try {
    const { usuario, accion, detalles } = req.body;

    if (!usuario || !accion) {
      return res.status(400).json({ message: "Usuario y acción son obligatorios" });
    }

    await registrarHistorial(usuario, accion, detalles || null);

    res.json({ message: "Historial registrado correctamente" });
  } catch (err) {
    console.error("Error al registrar historial:", err);
    res.status(500).json({ message: "Error al registrar historial" });
  }
};