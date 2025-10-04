const pool = require("../db")

// Obtener estadísticas semanales (cu28)
exports.obtenerEstadisticasSemanales = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query

    // Si no se proporcionan fechas, usar la última semana
    const fechaFin = fecha_fin || new Date().toISOString().split("T")[0]
    const fechaInicio = fecha_inicio || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    // Ventas por día de la semana
    const ventasPorDia = await pool.query(
      `
      SELECT 
        TO_CHAR(fecha, 'YYYY-MM-DD') as dia,
        TO_CHAR(fecha, 'Day') as nombre_dia,
        COUNT(*) as total_pedidos,
        SUM(montototal) as total_ventas
      FROM pedido
      WHERE fecha BETWEEN $1 AND $2
      GROUP BY dia, nombre_dia
      ORDER BY dia
    `,
      [fechaInicio, fechaFin],
    )

    // Clientes atendidos
    const clientesAtendidos = await pool.query(
      `
      SELECT COUNT(DISTINCT cliente_id) as total_clientes
      FROM pedido
      WHERE fecha BETWEEN $1 AND $2
    `,
      [fechaInicio, fechaFin],
    )

    // Entregas fallidas (pedidos cancelados)
    const entregasFallidas = await pool.query(
      `
      SELECT COUNT(*) as total_fallidas
      FROM pedido
      WHERE fecha BETWEEN $1 AND $2
        AND estado = 'Cancelado'
    `,
      [fechaInicio, fechaFin],
    )

    // Ventas por tipo de cilindro
    const ventasPorTipo = await pool.query(
      `
      SELECT 
        c.tipo,
        COUNT(*) as cantidad_vendida,
        SUM(dp.preciounitario) as total_ventas
      FROM detallepedido dp
      JOIN cilindro c ON dp.id_cilindro = c.id
      JOIN pedido p ON dp.id_pedido = p.id_pedido
      WHERE p.fecha BETWEEN $1 AND $2
      GROUP BY c.tipo
      ORDER BY cantidad_vendida DESC
    `,
      [fechaInicio, fechaFin],
    )

    res.json({
      periodo: { inicio: fechaInicio, fin: fechaFin },
      ventas_por_dia: ventasPorDia.rows,
      total_clientes: clientesAtendidos.rows[0].total_clientes,
      entregas_fallidas: entregasFallidas.rows[0].total_fallidas,
      ventas_por_tipo: ventasPorTipo.rows,
    })
  } catch (err) {
    console.error("Error al obtener estadísticas semanales:", err)
    res.status(500).json({ message: "Error al obtener estadísticas", error: err.message })
  }
}

// Evolución mensual de ventas por tipo de cilindro (cu49)
exports.evolucionMensualPorTipo = async (req, res) => {
  try {
    const { anio } = req.query
    const anioActual = anio || new Date().getFullYear()

    const resultado = await pool.query(
      `
      SELECT 
        EXTRACT(MONTH FROM p.fecha) as mes,
        TO_CHAR(p.fecha, 'Month') as nombre_mes,
        c.tipo,
        COUNT(*) as cantidad_vendida,
        SUM(dp.preciounitario) as total_ventas
      FROM detallepedido dp
      JOIN cilindro c ON dp.id_cilindro = c.id
      JOIN pedido p ON dp.id_pedido = p.id_pedido
      WHERE EXTRACT(YEAR FROM p.fecha) = $1
      GROUP BY mes, nombre_mes, c.tipo
      ORDER BY mes, c.tipo
    `,
      [anioActual],
    )

    // Organizar datos por mes y tipo
    const datosPorMes = {}
    resultado.rows.forEach((row) => {
      const mes = row.mes
      if (!datosPorMes[mes]) {
        datosPorMes[mes] = {
          mes: mes,
          nombre_mes: row.nombre_mes.trim(),
          tipos: {},
        }
      }
      datosPorMes[mes].tipos[row.tipo] = {
        cantidad: Number.parseInt(row.cantidad_vendida),
        total: Number.parseFloat(row.total_ventas),
      }
    })

    res.json({
      anio: anioActual,
      datos: Object.values(datosPorMes),
    })
  } catch (err) {
    console.error("Error al obtener evolución mensual:", err)
    res.status(500).json({ message: "Error al obtener evolución mensual", error: err.message })
  }
}
