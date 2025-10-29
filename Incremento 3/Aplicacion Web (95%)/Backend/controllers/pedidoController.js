const pool = require("../db")
const { registrarHistorial } = require("../utils/historial") // asegurarse de importarlo
const notificationService = require("../services/notificationService") // Import notification service for delivery completed events

// Registrar un nuevo pedido
exports.registrar = async (req, res) => {
  try {
    const { cliente_id, fecha, metodoPago, chofer_id, montototal, usuarioAdmin } = req.body

    // Validar campos obligatorios
    if (!cliente_id || !fecha || !metodoPago) {
      return res.status(400).json({ message: "Todos los campos obligatorios deben completarse" })
    }

    // Insertar el pedido con montototal
    const pedidoRes = await pool.query(
      `INSERT INTO pedido (cliente_id, fecha, estado, metodopago, chofer_id, montototal)
       VALUES ($1, $2, 'Pendiente', $3, $4, $5) RETURNING id_pedido`,
      [cliente_id, fecha, metodoPago, chofer_id || null, montototal],
    )

    const pedidoId = pedidoRes.rows[0].id_pedido

    // Obtener nombre del cliente
    const clienteRes = await pool.query(`SELECT nombre FROM cliente WHERE id_cliente = $1`, [cliente_id])
    const nombreCliente = clienteRes.rows[0].nombre

    // Registrar en historial
    await registrarHistorial(
      usuarioAdmin,
      "Registro de pedido",
      `Se creó el pedido ID ${pedidoId} para el cliente ${nombreCliente} con monto total ${montototal}`,
    )

    res.json({ message: "Pedido registrado correctamente", pedidoId })
  } catch (err) {
    console.error("Error al registrar pedido:", err)
    res.status(500).json({ message: "Error al registrar pedido", error: err.message })
  }
}

// Listar todos los pedidos con información del cliente
exports.listar = async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT 
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
      ORDER BY p.fecha DESC, p.id_pedido DESC`)

    // Para cada pedido, obtener resumen de cilindros
    const pedidosConDetalle = await Promise.all(
      resultado.rows.map(async (pedido) => {
        const detalleRes = await pool.query(
          `SELECT 
            cil.tipo,
            COUNT(*) as cantidad
          FROM detallepedido dp
          JOIN cilindro cil ON dp.id_cilindro = cil.id
          WHERE dp.id_pedido = $1
          GROUP BY cil.tipo
          ORDER BY cil.tipo`,
          [pedido.id_pedido],
        )

        // Formatear como "3x15kg, 2x45kg"
        const resumenCilindros = detalleRes.rows.map((d) => `${d.cantidad}x${d.tipo}`).join(", ") || "Sin cilindros"

        return {
          ...pedido,
          cilindros_resumen: resumenCilindros,
        }
      }),
    )

    res.json(pedidosConDetalle)
  } catch (err) {
    console.error("Error al consultar pedidos:", err)
    res.status(500).json({ message: "Error al consultar pedidos" })
  }
}

// Listar pedidos filtrando por cliente y rango de fechas
exports.listarFiltrado = async (req, res) => {
  try {
    const { cliente, fechaInicio, fechaFin } = req.query

    const filtros = []
    const valores = []
    let idx = 1

    if (cliente) {
      filtros.push(`LOWER(c.nombre) LIKE $${idx}`)
      valores.push(`%${cliente.toLowerCase()}%`)
      idx++
    }
    if (fechaInicio) {
      filtros.push(`p.fecha >= $${idx}`)
      valores.push(fechaInicio)
      idx++
    }
    if (fechaFin) {
      filtros.push(`p.fecha <= $${idx}`)
      valores.push(fechaFin)
      idx++
    }

    const whereClause = filtros.length ? "WHERE " + filtros.join(" AND ") : ""

    const resultado = await pool.query(
      `SELECT 
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
      ORDER BY p.fecha DESC, p.id_pedido DESC`,
      valores,
    )

    res.json(resultado.rows)
  } catch (err) {
    console.error("Error al consultar pedidos filtrados:", err)
    res.status(500).json({ message: "Error al consultar pedidos" })
  }
}

// Registrar un nuevo detalle de pedido
exports.registrarDetalle = async (req, res) => {
  const { id_pedido, tipo, cantidad, preciounitario, usua } = req.body

  if (!id_pedido || !tipo || !cantidad || !preciounitario) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" })
  }

  try {
    // Tomar cilindros disponibles de ese tipo, con IDs más bajos
    const cilindrosRes = await pool.query(
      `SELECT id 
       FROM cilindro 
       WHERE tipo = $1 
         AND (estado IS NULL OR estado = 'Lleno')
         AND estado NOT IN ('perdido', 'vendido', 'en_transito', 'mantenimiento', 'Vacío')
       ORDER BY id ASC
       LIMIT $2`,
      [tipo, cantidad],
    )

    const cilindros = cilindrosRes.rows
    if (cilindros.length < cantidad) {
      return res.status(400).json({ message: `No hay suficiente stock para ${tipo}` })
    }

    // Insertar cada cilindro como detalle
    for (const c of cilindros) {
      await pool.query(
        `INSERT INTO detallepedido (id_pedido, id_cilindro, cantidad, preciounitario)
         VALUES ($1, $2, $3, $4)`,
        [id_pedido, c.id, 1, preciounitario],
      )

      // Actualizar estado del cilindro a "vendido"
      await pool.query(`UPDATE cilindro SET estado='vendido' WHERE id=$1`, [c.id])
    }

    res.json({ message: "Detalle de pedido registrado correctamente" })
  } catch (err) {
    console.error("Error al registrar detalle de pedido:", err)
    res.status(500).json({ message: "Error al registrar detalle de pedido" })
  }
}

// Listar detalles de un pedido
exports.listarDetallesPorPedido = async (req, res) => {
  const { id_pedido } = req.params

  if (!id_pedido) {
    return res.status(400).json({ message: "Se requiere el ID del pedido" })
  }

  try {
    const resultado = await pool.query(
      `SELECT 
         dp.id_detalle, 
         dp.id_pedido, 
         dp.id_cilindro, 
         dp.cantidad, 
         dp.preciounitario, 
         c.tipo AS tipo_cilindro
       FROM detallepedido dp
       JOIN cilindro c ON dp.id_cilindro = c.id
       WHERE dp.id_pedido = $1
       ORDER BY dp.id_detalle ASC`,
      [id_pedido],
    )

    res.json(resultado.rows)
  } catch (err) {
    console.error("Error al consultar detalles de pedido:", err)
    res.status(500).json({ message: "Error al consultar detalles de pedido" })
  }
}

// Actualizar un pedido
exports.actualizar = async (req, res) => {
  const { id_pedido } = req.params
  const { estado, chofer_id, fecha, metodoPago, usuarioAdmin, vehiculo_id, ruta_id, inspeccion } = req.body

  const client = await pool.connect()
  try {
    // Obtener pedido actual
    const pedidoRes = await client.query(`SELECT * FROM pedido WHERE id_pedido = $1`, [id_pedido])

    if (pedidoRes.rows.length === 0) {
      client.release()
      return res.status(404).json({ message: "Pedido no encontrado" })
    }

    const pedido = pedidoRes.rows[0]

    // Si se solicita mover a En Proceso, exigir inspección y vehículo
    if (estado === "En Proceso") {
      if (!vehiculo_id) {
        client.release()
        return res.status(400).json({ message: 'vehiculo_id es obligatorio para pasar a "En Proceso"' })
      }
      if (!chofer_id) {
        client.release()
        return res.status(400).json({ message: 'chofer_id es obligatorio para pasar a "En Proceso"' })
      }

      // Obtener cilindros del pedido
      const detallesRes = await client.query(
        `SELECT dp.id_cilindro, c.tipo
         FROM detallepedido dp
         JOIN cilindro c ON c.id = dp.id_cilindro
         WHERE dp.id_pedido = $1`,
        [id_pedido],
      )
      const cilindrosPedido = detallesRes.rows // [{id_cilindro, tipo}]

      if (!Array.isArray(inspeccion?.cilindros) || inspeccion.cilindros.length !== cilindrosPedido.length) {
        client.release()
        return res.status(400).json({ message: "Debe inspeccionar todos los cilindros del pedido antes del despacho" })
      }

      // Mapear inspección por cilindro_id
      const inspeccionMap = new Map()
      for (const it of inspeccion.cilindros) {
        if (!it.cilindro_id || typeof it.en_condiciones !== "boolean") {
          client.release()
          return res
            .status(400)
            .json({ message: "Formato de inspección inválido: cada cilindro requiere cilindro_id y en_condiciones" })
        }
        inspeccionMap.set(Number(it.cilindro_id), it)
      }

      await client.query("BEGIN")

      const reemplazos = []
      const aprobados = []
      const observaciones = []

      // Validar y aplicar inspección
      for (const { id_cilindro, tipo } of cilindrosPedido) {
        const reg = inspeccionMap.get(Number(id_cilindro))
        if (!reg) {
          await client.query("ROLLBACK")
          client.release()
          return res.status(400).json({ message: `Falta la inspección del cilindro ${id_cilindro}` })
        }

        const comentarios = reg.comentarios?.trim()
        if (reg.en_condiciones) {
          // Marcar como inspeccionado OK
          await client.query(`UPDATE cilindro SET inspeccionado = true WHERE id = $1`, [id_cilindro])
          aprobados.push(id_cilindro)
          if (comentarios) observaciones.push(`Cil ${id_cilindro}: ${comentarios}`)
        } else {
          // Requiere reemplazo manual del mismo tipo y disponible
          const reemplazoId = Number(reg.cilindro_reemplazo_id)
          if (!reemplazoId) {
            await client.query("ROLLBACK")
            client.release()
            return res
              .status(400)
              .json({ message: `Debe seleccionar cilindro de reemplazo para el cilindro ${id_cilindro}` })
          }

          // Validar que el reemplazo sea del mismo tipo y esté disponible
          const repRes = await client.query(
            `SELECT id, tipo FROM cilindro 
             WHERE id = $1 
               AND tipo = $2
               AND (estado IS NULL OR estado = 'Lleno')
               AND estado NOT IN ('perdido','vendido','en_transito','mantenimiento','Vacío')
             FOR UPDATE`,
            [reemplazoId, tipo],
          )
          if (repRes.rows.length === 0) {
            await client.query("ROLLBACK")
            client.release()
            return res.status(400).json({
              message: `El cilindro de reemplazo ${reemplazoId} no está disponible o no coincide el tipo (${tipo})`,
            })
          }

          // Actualizar detalle: reemplazar cilindro
          await client.query(
            `UPDATE detallepedido 
             SET id_cilindro = $1 
             WHERE id_pedido = $2 AND id_cilindro = $3`,
            [reemplazoId, id_pedido, id_cilindro],
          )

          // Marcar reemplazo como vendido e inspeccionado OK
          await client.query(`UPDATE cilindro SET estado = 'vendido', inspeccionado = true WHERE id = $1`, [
            reemplazoId,
          ])

          // Marcar el antiguo como mantenimiento e inspeccionado = false
          await client.query(`UPDATE cilindro SET estado = 'mantenimiento', inspeccionado = false WHERE id = $1`, [
            id_cilindro,
          ])

          reemplazos.push(`${id_cilindro}→${reemplazoId}`)
          if (comentarios) observaciones.push(`Cil ${id_cilindro}: ${comentarios}`)
        }
      }

      const fechaActual = new Date()
      const upRes = await client.query(
        `UPDATE despacho 
           SET fechasalida = $4, estado = 'En Proceso', vehiculo_id = $1, ruta_id = COALESCE($2, ruta_id)
         WHERE pedido_id = $3`,
        [vehiculo_id, ruta_id || null, id_pedido, fechaActual],
      )
      if (upRes.rowCount === 0) {
        const fechaActual = new Date()
        await client.query(
          `INSERT INTO despacho (pedido_id, fechasalida, estado, vehiculo_id, ruta_id)
           VALUES ($1, $4, 'En Proceso', $2, $3)`,
          [id_pedido, vehiculo_id, ruta_id || null, fechaActual],
        )
      }

      const updatedRes = await client.query(
        `UPDATE pedido
           SET estado = 'En Proceso',
               chofer_id = COALESCE($1, chofer_id),
               fecha = COALESCE($2, fecha)
         WHERE id_pedido = $3
         RETURNING *`,
        [chofer_id || null, fecha || null, id_pedido],
      )

      const partes = []
      if (aprobados.length) partes.push(`Aprobados: ${aprobados.join(", ")}`)
      if (reemplazos.length) partes.push(`Reemplazos: ${reemplazos.join(", ")}`)
      if (observaciones.length) partes.push(`Obs: ${observaciones.join(" | ")}`)
      if (inspeccion?.observaciones && inspeccion.observaciones.trim()) {
        partes.push(`Obs grales: ${inspeccion.observaciones.trim()}`)
      }
      const detalleHist = `Inspección antes de despacho. ${partes.join(" | ")}. Vehículo ID ${vehiculo_id}${ruta_id ? `, Ruta ID ${ruta_id}` : ""}.`
      await registrarHistorial(
        usuarioAdmin || "Sistema",
        "Inspección de cilindros",
        `Pedido ID ${id_pedido}. ${detalleHist}`,
      )

      await client.query("COMMIT")

      return res.json({ message: "Pedido movido a En Proceso con inspección registrada", pedido: updatedRes.rows[0] })
    }

    if (estado === "Entregado") {
      if (!metodoPago && !pedido.metodopago) {
        client.release()
        return res.status(400).json({ message: "Debe proporcionar metodoPago para marcar como Entregado" })
      }

      await client.query("BEGIN")

      const fechaActual = new Date()
      const upRes = await client.query(
        `UPDATE despacho SET fechaentrega = $2, estado = 'Entregado' WHERE pedido_id = $1`,
        [id_pedido, fechaActual],
      )
      if (upRes.rowCount === 0) {
        await client.query(
          `INSERT INTO despacho (pedido_id, fechasalida, fechaentrega, estado)
           VALUES ($1, CURRENT_DATE, $2, 'Entregado')`,
          [id_pedido, fechaActual],
        )
      }

      const updatedRes = await client.query(
        `UPDATE pedido
           SET estado = 'Entregado', metodopago = COALESCE($1, metodopago), chofer_id = COALESCE($2, chofer_id)
         WHERE id_pedido = $3
         RETURNING *`,
        [metodoPago || pedido.metodopago, chofer_id || null, id_pedido],
      )

      await registrarHistorial(
        usuarioAdmin || "Sistema",
        "Entrega de pedido",
        `Pedido ID ${id_pedido} marcado como Entregado. Método de pago: ${metodoPago || pedido.metodopago}`,
      )

      const clienteRes = await client.query(`SELECT nombre FROM cliente WHERE id_cliente = $1`, [pedido.cliente_id])
      const clienteNombre = clienteRes.rows[0]?.nombre || "Cliente desconocido"

      const choferRes = await client.query(`SELECT nombre, apellido FROM usuario WHERE id = $1`, [
        updatedRes.rows[0].chofer_id,
      ])
      const chofer = choferRes.rows[0]
      const choferNombre = chofer ? `${chofer.nombre} ${chofer.apellido}` : "Chofer desconocido"

      await client.query("COMMIT")
      client.release()

      notificationService
        .notifyDeliveryCompleted(id_pedido, clienteNombre, choferNombre, updatedRes.rows[0].chofer_id)
        .catch((err) => {
          console.error("Error sending delivery notification:", err)
        })

      return res.json({ message: "Pedido marcado como Entregado", pedido: updatedRes.rows[0] })
    }

    const updatedRes = await client.query(
      `UPDATE pedido
       SET estado = COALESCE($1, estado),
           chofer_id = COALESCE($2, chofer_id),
           fecha = COALESCE($3, fecha),
           metodopago = COALESCE($4, metodopago)
       WHERE id_pedido = $5
       RETURNING *`,
      [estado || null, chofer_id || null, fecha || null, metodoPago || null, id_pedido],
    )

    const cambios = []
    if (estado && estado !== pedido.estado) cambios.push(`Estado: "${pedido.estado}" → "${estado}"`)

    if (chofer_id !== undefined && chofer_id !== pedido.chofer_id) {
      const choferRes = await client.query(`SELECT nombre, apellido FROM usuario WHERE id = $1`, [chofer_id])
      const chofer = choferRes.rows[0]
      const choferNombre = chofer ? `${chofer.nombre} ${chofer.apellido}` : `ID:${chofer_id}`
      cambios.push(`Chofer asignado cambiado a ${choferNombre}`)
    }

    if (fecha && fecha !== pedido.fecha) cambios.push(`Fecha: "${pedido.fecha}" → "${fecha}"`)
    if (metodoPago && metodoPago !== pedido.metodopago)
      cambios.push(`Método de pago: "${pedido.metodopago}" → "${metodoPago}"`)

    if (cambios.length > 0) {
      await registrarHistorial(
        usuarioAdmin || "Admin_desconocido",
        "Actualización de pedido",
        `Pedido ID ${id_pedido} modificado: ${cambios.join(", ")}`,
      )
    }

    client.release()
    res.json({ message: "Pedido actualizado correctamente", pedido: updatedRes.rows[0] })
  } catch (err) {
    try {
      await client.query("ROLLBACK")
    } catch {}
    client.release()
    console.error("Error al actualizar pedido:", err)
    res.status(500).json({ message: "Error al actualizar pedido" })
  }
}

exports.reportePedidosPorChofer = async (req, res) => {
  try {
    const { chofer_id, fecha } = req.query

    if (!fecha) {
      return res.status(400).json({ message: "Debe proporcionar la fecha" })
    }

    let query = `SELECT p.id_pedido, p.fecha, p.estado, p.montototal,
             c.nombre AS cliente_nombre, c.direccion
      FROM pedido p
      JOIN cliente c ON p.cliente_id = c.id_cliente
      WHERE DATE(p.fecha) = $1`
    const params = [fecha]

    // Si viene chofer_id y no es "all", se filtra también por chofer
    if (chofer_id && chofer_id !== "all") {
      query += " AND p.chofer_id = $2"
      params.push(chofer_id)
    }

    query += " ORDER BY p.id_pedido"

    const resultado = await pool.query(query, params)
    res.json(resultado.rows)
  } catch (err) {
    console.error("Error al generar reporte:", err)
    res.status(500).json({ message: "Error al generar reporte" })
  }
}
