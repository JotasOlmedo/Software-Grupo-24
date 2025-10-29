const pool = require("../db")

exports.obtenerPedidosPendientes = async (req, res) => {
  try {
    let { chofer_id } = req.params

    // Convertir a número
    chofer_id = Number.parseInt(chofer_id, 10)

    if (isNaN(chofer_id)) {
      return res.status(400).json({ message: "ID del chofer inválido" })
    }

    const resultado = await pool.query(
      `
      SELECT 
        p.id_pedido,
        p.fecha,
        p.montototal,
        c.id_cliente,
        c.nombre AS cliente_nombre,
        c.direccion,
        c.telefono
      FROM pedido p
      JOIN cliente c ON p.cliente_id = c.id_cliente
      WHERE p.chofer_id = $1 
        AND p.estado IN ('Pendiente', 'En proceso')
      ORDER BY p.fecha ASC, p.id_pedido ASC
      `,
      [chofer_id],
    )

    res.json(resultado.rows)
  } catch (err) {
    console.error("Error al obtener pedidos pendientes:", err)
    res.status(500).json({ message: "Error al obtener pedidos pendientes" })
  }
}

// controllers/rutaController.js (fragmento)
exports.guardarRuta = async (req, res) => {
  const client = await pool.connect()

  try {
    const {
      origen,
      destino,
      distancia,        // debe ser en KM (ver nota abajo)
      pedido_id,
      chofer_id,
      tiempo_estimado   // en minutos (opcional)
    } = req.body

    // Validación básica
    if (!origen || !destino || typeof distancia === 'undefined' || !pedido_id || !chofer_id) {
      return res.status(400).json({ message: "Faltan datos requeridos", data: req.body })
    }

    // LOG para depuración: ver exactamente qué llega
    console.log('[guardarRuta] params:', { origen, destino, distancia, pedido_id, chofer_id, tiempo_estimado })

    await client.query('BEGIN')

    // Tolerancia para comparar distancias (ej: 0.1 km => 100 m)
    const DIST_TOLERANCE = 0.1

    // BUSCAR ruta similar: normalizamos texto y comparamos distancia con tolerancia
    const existingRoute = await client.query(
      `
      SELECT id_ruta, origen, destino, distancia
      FROM ruta r
      WHERE lower(trim(r.origen)) = lower(trim($1))
        AND lower(trim(r.destino)) = lower(trim($2))
        AND ABS(r.distancia - $3) <= $4
      LIMIT 1
      `,
      [origen, destino, distancia, DIST_TOLERANCE]
    )

    let rutaId
    if (existingRoute.rows.length > 0) {
      rutaId = existingRoute.rows[0].id_ruta
      console.log(`[guardarRuta] usando ruta existente id=${rutaId}`, existingRoute.rows[0])
    } else {
      const rutaResult = await client.query(
        `INSERT INTO ruta (origen, destino, distancia)
         VALUES ($1, $2, $3)
         RETURNING id_ruta`,
        [origen, destino, distancia]
      )
      rutaId = rutaResult.rows[0].id_ruta
      console.log(`[guardarRuta] ruta nueva id=${rutaId}`)
    }

    // Obtener vehiculo
    const vehiculoResult = await client.query(
      `SELECT v.id_transporte
       FROM vehiculo v
       JOIN usuario u ON CONCAT(u.nombre, ' ', u.apellido) = v.conductor
       WHERE u.id = $1
       LIMIT 1`,
      [chofer_id]
    )
    const vehiculoId = vehiculoResult.rows[0]?.id_transporte || null

    // Calcular fechas
    const fechaSalida = new Date()
    const fechaEntrega = new Date(fechaSalida.getTime() + (tiempo_estimado || 0) * 60000)

    // Insertar o actualizar despacho
    await client.query(
      `
      INSERT INTO despacho (fechasalida, fechaentrega, estado, pedido_id, vehiculo_id, ruta_id)
      VALUES ($1, $2, 'Pendiente', $3, $4, $5)
      ON CONFLICT (pedido_id)
      DO UPDATE SET
        ruta_id = EXCLUDED.ruta_id,
        vehiculo_id = EXCLUDED.vehiculo_id,
        estado = 'Pendiente',
        fechasalida = EXCLUDED.fechasalida,
        fechaentrega = EXCLUDED.fechaentrega
      `,
      [fechaSalida, fechaEntrega, pedido_id, vehiculoId, rutaId]
    )

    await client.query('COMMIT')

    res.json({ message: 'Ruta guardada correctamente', id_ruta: rutaId })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error al guardar ruta:', err)
    res.status(500).json({ message: 'Error al guardar ruta' })
  } finally {
    client.release()
  }
}


exports.obtenerRuta = async (req, res) => {
  try {
    const { id_ruta } = req.params

    const resultado = await pool.query(`SELECT * FROM ruta WHERE id_ruta = $1`, [id_ruta])

    if (resultado.rows.length === 0) {
      return res.status(404).json({ message: "Ruta no encontrada" })
    }

    res.json(resultado.rows[0])
  } catch (err) {
    console.error("Error al obtener ruta:", err)
    res.status(500).json({ message: "Error al obtener ruta" })
  }
}

exports.iniciarRuta = async (req, res) => {
  const client = await pool.connect()

  try {
    const { pedido_ids, ruta_id } = req.body

    if (!pedido_ids || !Array.isArray(pedido_ids) || pedido_ids.length === 0) {
      return res.status(400).json({ message: "Se requiere al menos un ID de pedido" })
    }

    await client.query("BEGIN")

    // Actualizar pedidos a "En proceso"
    await client.query(
      `UPDATE pedido
       SET estado = 'En proceso'
       WHERE id_pedido = ANY($1::int[])`,
      [pedido_ids]
    )

    // Actualizar despacho: poner fecha de salida con hora y zona horaria
    await client.query(
      `UPDATE despacho
       SET fechasalida = CURRENT_TIMESTAMP,
           estado = 'En Proceso'
       WHERE pedido_id = ANY($1::int[])
         AND ruta_id = $2`,
      [pedido_ids, ruta_id]
    )

    await client.query("COMMIT")

    res.json({ message: "Ruta iniciada correctamente" })
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Error al iniciar ruta:", err)
    res.status(500).json({ message: "Error al iniciar ruta" })
  } finally {
    client.release()
  }
}

exports.completarEntrega = async (req, res) => {
  try {
    const { pedido_id } = req.body

    if (!pedido_id) {
      return res.status(400).json({ message: "Se requiere el ID del pedido" })
    }

    await pool.query(
      `UPDATE pedido 
       SET estado = 'Entregado'
       WHERE id_pedido = $1`,
      [pedido_id],
    )

    await pool.query(
      `UPDATE despacho
       SET fechasalida = CURRENT_TIMESTAMP,
           estado = 'Entregado'
       WHERE pedido_id = $1`,
      [pedido_id],
    )

    res.json({ message: "Entrega completada correctamente" })
  } catch (err) {
    console.error("Error al completar entrega:", err)
    res.status(500).json({ message: "Error al completar entrega" })
  }
}
