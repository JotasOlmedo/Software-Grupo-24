const pool = require('../db');
const { registrarHistorial } = require('../utils/historial'); // asegurarse de importarlo

// Registrar un nuevo pedido
exports.registrar = async (req, res) => {
  try {
    const { cliente_id, fecha, metodoPago, chofer_id, montototal, usuarioAdmin } = req.body;

    // Validar campos obligatorios
    if (!cliente_id || !fecha || !metodoPago) {
      return res.status(400).json({ message: 'Todos los campos obligatorios deben completarse' });
    }

    // Insertar el pedido con montototal
    const pedidoRes = await pool.query(
      `INSERT INTO pedido (cliente_id, fecha, estado, metodopago, chofer_id, montototal)
       VALUES ($1, $2, 'Pendiente', $3, $4, $5) RETURNING id_pedido`,
      [cliente_id, fecha, metodoPago, chofer_id || null, montototal]
    );

    const pedidoId = pedidoRes.rows[0].id_pedido;

    // Obtener nombre del cliente
    const clienteRes = await pool.query(
      `SELECT nombre FROM cliente WHERE id_cliente = $1`,
      [cliente_id]
    );
    const nombreCliente = clienteRes.rows[0].nombre;

    // Registrar en historial
    await registrarHistorial(
      usuarioAdmin,
      'Registro de pedido',
      `Se creó el pedido ID ${pedidoId} para el cliente ${nombreCliente} con monto total ${montototal}`
    );

    res.json({ message: 'Pedido registrado correctamente', pedidoId });
  } catch (err) {
    console.error('Error al registrar pedido:', err);
    res.status(500).json({ message: 'Error al registrar pedido', error: err.message });  }
};

// Listar todos los pedidos con información del cliente
exports.listar = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT 
        p.id_pedido,
        c.nombre,
        TO_CHAR(p.fecha, 'YYYY-MM-DD') AS fecha,
        p.estado,
        p.montototal,
        p.metodopago,
        p.chofer_id,
        u.nombre AS chofer_nombre,
        u.apellido AS chofer_apellido
      FROM pedido p
      JOIN cliente c ON p.cliente_id = c.id_cliente
      LEFT JOIN usuario u ON p.chofer_id = u.id
      ORDER BY p.fecha DESC, p.id_pedido DESC
    `);

    res.json(resultado.rows);
  } catch (err) {
    console.error("Error al consultar pedidos:", err);
    res.status(500).json({ message: "Error al consultar pedidos" });
  }
};

// Listar pedidos filtrando por cliente y rango de fechas
exports.listarFiltrado = async (req, res) => {
  try {
    const { cliente, fechaInicio, fechaFin } = req.query;

    let filtros = [];
    let valores = [];
    let idx = 1;

    if (cliente) {
      filtros.push(`LOWER(c.nombre) LIKE $${idx}`);
      valores.push(`%${cliente.toLowerCase()}%`);
      idx++;
    }
    if (fechaInicio) {
      filtros.push(`p.fecha >= $${idx}`);
      valores.push(fechaInicio);
      idx++;
    }
    if (fechaFin) {
      filtros.push(`p.fecha <= $${idx}`);
      valores.push(fechaFin);
      idx++;
    }

    const whereClause = filtros.length ? 'WHERE ' + filtros.join(' AND ') : '';

    const resultado = await pool.query(`
      SELECT 
        p.id_pedido,
        c.nombre,
        TO_CHAR(p.fecha, 'YYYY-MM-DD') AS fecha,
        p.estado,
        p.montototal,
        p.metodopago,
        p.chofer_id
      FROM pedido p
      JOIN cliente c ON p.cliente_id = c.id_cliente
      ${whereClause}
      ORDER BY p.fecha DESC, p.id_pedido DESC
    `, valores);

    res.json(resultado.rows);
  } catch (err) {
    console.error("Error al consultar pedidos filtrados:", err);
    res.status(500).json({ message: "Error al consultar pedidos" });
  }
};

// Registrar un nuevo detalle de pedido
exports.registrarDetalle = async (req, res) => {
  const { id_pedido, tipo, cantidad, preciounitario, usua } = req.body;

  if (!id_pedido || !tipo || !cantidad || !preciounitario) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  try {
    // Tomar cilindros disponibles de ese tipo, con IDs más bajos
    const cilindrosRes = await pool.query(
      `SELECT id 
       FROM cilindro 
       WHERE tipo = $1 AND (estado IS NULL OR estado != 'perdido') 
       ORDER BY id ASC
       LIMIT $2`,
      [tipo, cantidad]
    );

    const cilindros = cilindrosRes.rows;
    if (cilindros.length < cantidad) {
      return res.status(400).json({ message: `No hay suficiente stock para ${tipo}` });
    }

    // Insertar cada cilindro como detalle
    for (const c of cilindros) {
      await pool.query(
        `INSERT INTO detallepedido (id_pedido, id_cilindro, preciounitario)
         VALUES ($1, $2, $3)`,
        [id_pedido, c.id, preciounitario]
      );

      // Actualizar estado del cilindro a "vendido"
      await pool.query(`UPDATE cilindro SET estado='vendido' WHERE id=$1`, [c.id]);
    }

    res.json({ message: 'Detalle de pedido registrado correctamente' });
  } catch (err) {
    console.error('Error al registrar detalle de pedido:', err);
    res.status(500).json({ message: 'Error al registrar detalle de pedido' });
  }
};

// Listar detalles de un pedido
exports.listarDetallesPorPedido = async (req, res) => {
  const { id_pedido } = req.params;

  if (!id_pedido) {
    return res.status(400).json({ message: 'Se requiere el ID del pedido' });
  }

  try {
    const resultado = await pool.query(
      `SELECT dp.id_detalle, dp.id_pedido, dp.id_cilindro, dp.cantidad, dp.preciounitario, c.tipo AS tipo_cilindro
       FROM detallepedido dp
       JOIN cilindro c ON dp.id_cilindro = c.id_cilindro
       WHERE dp.id_pedido = $1
       ORDER BY dp.id_detalle ASC`,
      [id_pedido]
    );

    res.json(resultado.rows);
  } catch (err) {
    console.error('Error al consultar detalles de pedido:', err);
    res.status(500).json({ message: 'Error al consultar detalles de pedido' });
  }
};

// Actualizar un pedido
exports.actualizar = async (req, res) => {
  const { id_pedido } = req.params;
  const { estado, chofer_id, fecha, metodoPago, usuarioAdmin } = req.body;

  try {
    // Obtener pedido actual
    const pedidoRes = await pool.query(
      `SELECT * FROM pedido WHERE id_pedido = $1`,
      [id_pedido]
    );

    if (pedidoRes.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    const pedido = pedidoRes.rows[0];

    // Actualizar campos editables
    const updatedRes = await pool.query(
      `UPDATE pedido
       SET estado = $1,
           chofer_id = $2,
           fecha = $3,
           metodopago = $4
       WHERE id_pedido = $5
       RETURNING *`,
      [
        estado || pedido.estado,
        chofer_id || pedido.chofer_id,
        fecha || pedido.fecha,
        metodoPago || pedido.metodopago,
        id_pedido
      ]
    );

    let cambios = [];
    if (estado && estado !== pedido.estado) 
        cambios.push(`Estado: "${pedido.estado}" → "${estado}"`);

    if (chofer_id !== undefined && chofer_id !== pedido.chofer_id) {
      const choferRes = await pool.query(
        `SELECT nombre, apellido FROM usuario WHERE id = $1`,
        [chofer_id]
      );
      const chofer = choferRes.rows[0];
      const choferNombre = chofer ? `${chofer.nombre} ${chofer.apellido}` : `ID:${chofer_id}`;
      cambios.push(`Chofer asignado cambiado a ${choferNombre}`);
    }

    if (fecha && fecha !== pedido.fecha) 
        cambios.push(`Fecha: "${pedido.fecha}" → "${fecha}"`);

    if (metodoPago && metodoPago !== pedido.metodopago) 
        cambios.push(`Método de pago: "${pedido.metodopago}" → "${metodoPago}"`);

    if (cambios.length > 0) {
        await registrarHistorial(
            usuarioAdmin || 'Admin_desconocido',
            'Actualización de pedido',
            `Pedido ID ${id_pedido} modificado: ${cambios.join(', ')}`
        );
    }

    res.json({ message: 'Pedido actualizado correctamente', pedido: updatedRes.rows[0] });
  } catch (err) {
    console.error('Error al actualizar pedido:', err);
    res.status(500).json({ message: 'Error al actualizar pedido' });
  }
};

exports.reportePedidosPorChofer = async (req, res) => {
  try {
    const { chofer_id, fecha } = req.query;

    if (!chofer_id || !fecha) {
      return res.status(400).json({ message: "Debe proporcionar chofer_id y fecha" });
    }

    const resultado = await pool.query(
      `SELECT p.id_pedido, p.fecha, p.estado, p.montototal,
              c.nombre AS cliente_nombre, c.direccion
       FROM pedido p
       JOIN cliente c ON p.cliente_id = c.id_cliente
       WHERE p.chofer_id = $1
         AND DATE(p.fecha) = $2
       ORDER BY p.id_pedido`,
      [chofer_id, fecha]
    );

    res.json(resultado.rows);
  } catch (err) {
    console.error("Error al generar reporte:", err);
    res.status(500).json({ message: "Error al generar reporte" });
  }
};

exports.reportePedidosPorChofer = async (req, res) => {
  try {
    const { chofer_id, fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({ message: "Debe proporcionar la fecha" });
    }

    let query = `
      SELECT p.id_pedido, p.fecha, p.estado, p.montototal,
             c.nombre AS cliente_nombre, c.direccion
      FROM pedido p
      JOIN cliente c ON p.cliente_id = c.id_cliente
      WHERE DATE(p.fecha) = $1
    `;
    let params = [fecha];

    // Si viene chofer_id y no es "all", se filtra también por chofer
    if (chofer_id && chofer_id !== "all") {
      query += " AND p.chofer_id = $2";
      params.push(chofer_id);
    }

    query += " ORDER BY p.id_pedido";

    const resultado = await pool.query(query, params);
    res.json(resultado.rows);

  } catch (err) {
    console.error("Error al generar reporte:", err);
    res.status(500).json({ message: "Error al generar reporte" });
  }
};