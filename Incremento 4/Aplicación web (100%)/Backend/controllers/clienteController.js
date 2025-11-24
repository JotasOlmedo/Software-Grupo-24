const pool = require('../db');
const { registrarHistorial } = require('../utils/historial');

exports.registrarCliente = async (req, res) => {
  const { nombre, direccion, telefono, usuarioAdmin } = req.body;

  if (!nombre || !direccion || !telefono) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  try {
    // Insertar cliente
    const nuevoCliente = await pool.query(
      `INSERT INTO cliente (nombre, direccion, telefono)
       VALUES ($1, $2, $3) RETURNING id_cliente`,
      [nombre, direccion, telefono]
    );

    const id_cliente = nuevoCliente.rows[0].id_cliente;


    // Registrar en historial
    if (usuarioAdmin) {
      await registrarHistorial(
        usuarioAdmin,
        'Registro de cliente',
        `Se creó el cliente "${nombre}" con ID ${id_cliente}`
      );
    }

    res.json({ message: 'Cliente registrado correctamente', id_cliente });
  } catch (err) {
    console.error('Error al registrar cliente:', err);
    res.status(500).json({ message: 'Error al registrar cliente: ' + err.detail });
  }
};


// Listar todos los clientes
exports.listar = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id_cliente, nombre, direccion, telefono FROM cliente ORDER BY nombre ASC`
    );
    res.json(resultado.rows);
  } catch (err) {
    console.error('Error al listar clientes:', err);
    res.status(500).json({ message: 'Error al listar clientes' });
  }
};
