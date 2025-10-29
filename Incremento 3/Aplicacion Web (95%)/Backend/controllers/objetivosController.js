const pool = require("../db")

const crearObjetivo = async (req, res) => {
  const { mes, anio, tipo_objetivo, tipo_cilindro, meta_cantidad, id_usuario } = req.body

  try {
    if (!mes || !anio || !tipo_objetivo || !meta_cantidad) {
      return res.status(400).json({
        error: "Mes, año, tipo de objetivo y meta son obligatorios",
      })
    }

    if (tipo_objetivo === "chofer" && !id_usuario) {
      return res.status(400).json({ error: "Se requiere id_usuario para objetivos de chofer" })
    }

    const query = `
      SELECT id_objetivo FROM objetivos 
      WHERE mes = $1 AND anio = $2 AND tipo_objetivo = $3 
        AND tipo_cilindro = $4 
        ${tipo_objetivo === "chofer" ? "AND id_usuario = $5" : ""}
    `

    const values = tipo_objetivo === "chofer"
      ? [mes, anio, tipo_objetivo, tipo_cilindro, id_usuario]
      : [mes, anio, tipo_objetivo, tipo_cilindro]

    const result = await pool.query(query, values)

    if (result.rows.length > 0) {
      const updateQuery = `
        UPDATE objetivos 
        SET meta_cantidad = $1 
        WHERE id_objetivo = $2
        RETURNING *
      `
      const updateValues = [meta_cantidad, result.rows[0].id_objetivo]
      const updated = await pool.query(updateQuery, updateValues)
      return res.json({ mensaje: "Objetivo actualizado", objetivo: updated.rows[0] })
    } else {
      const insertQuery = `
        INSERT INTO objetivos (mes, anio, tipo_objetivo, tipo_cilindro, meta_cantidad, id_usuario) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
      `
      const insertValues = [mes, anio, tipo_objetivo, tipo_cilindro, meta_cantidad, id_usuario || null]
      const inserted = await pool.query(insertQuery, insertValues)
      return res.json({ mensaje: "Objetivo creado", objetivo: inserted.rows[0] })
    }
  } catch (err) {
    console.error("Error al crear/actualizar objetivo:", err)
    res.status(500).json({ error: "Error al crear/actualizar objetivo" })
  }
}

const obtenerObjetivos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, u.nombre || ' ' || u.apellido AS nombre_usuario
      FROM objetivos o
      LEFT JOIN usuario u ON u.id = o.id_usuario
      ORDER BY anio DESC, mes DESC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error("Error al obtener objetivos:", err)
    res.status(500).json({ error: "Error al obtener objetivos" })
  }
}
const obtenerCumplimiento = async (req, res) => {
  try {
    const { mes, anio, id_usuario } = req.query

    if (!mes || !anio) {
      return res.status(400).json({ error: "Se requiere mes y año" })
    }

    const query = `
      SELECT 
          o.id_objetivo,
          u.nombre || ' ' || u.apellido AS nombre_chofer,
          o.tipo_objetivo,
          o.tipo_cilindro,
          o.meta_cantidad,
          COUNT(dp.id_detalle) AS realizado
      FROM objetivos o
      LEFT JOIN usuario u ON u.id = o.id_usuario
      LEFT JOIN pedido p 
            ON p.chofer_id = o.id_usuario
            AND EXTRACT(MONTH FROM p.fecha) = $1
            AND EXTRACT(YEAR FROM p.fecha) = $2
      LEFT JOIN despacho d 
            ON d.pedido_id = p.id_pedido 
            AND d.estado = 'entregado'
      LEFT JOIN detallepedido dp 
            ON dp.id_pedido = p.id_pedido
      LEFT JOIN cilindro c 
            ON c.id = dp.id_cilindro
            AND (o.tipo_cilindro = 'general' OR c.tipo = o.tipo_cilindro)
      WHERE o.mes = $1 
        AND o.anio = $2
        ${id_usuario ? `AND o.id_usuario = $3` : ""}
      GROUP BY o.id_objetivo, u.nombre, u.apellido, o.tipo_objetivo, o.tipo_cilindro, o.meta_cantidad
      ORDER BY nombre_chofer;

    `

    const params = id_usuario ? [mes, anio, id_usuario] : [mes, anio]
    const result = await pool.query(query, params)
    console.log("Query:", query);
    console.log("Params:", params);

    console.log("Resultado de la query:", result.rows);

    const cumplimiento = result.rows.map(obj => {
      const porcentaje = obj.meta_cantidad > 0 ? (obj.realizado / obj.meta_cantidad) * 100 : 0
      return {
        ...obj,
        porcentaje_cumplimiento: Math.round(porcentaje * 100) / 100,
        estado: porcentaje >= 100 ? "cumplido" : porcentaje >= 80 ? "en_progreso" : "bajo",
      }
    })

    res.json({ cumplimiento })
  } catch (err) {
    console.error("Error al obtener cumplimiento:", err)
    res.status(500).json({ error: "Error al obtener cumplimiento" })
  }
}

const eliminarObjetivo = async (req, res) => {
  try {
    const { id } = req.params
    await pool.query("DELETE FROM objetivos WHERE id_objetivo = $1", [id])
    res.json({ mensaje: "Objetivo eliminado" })
  } catch (err) {
    console.error("Error al eliminar objetivo:", err)
    res.status(500).json({ error: "Error al eliminar objetivo" })
  }
}

const obtenerChoferes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, apellido 
      FROM usuario 
      WHERE rol_id = 3
      ORDER BY nombre, apellido
    `)
    res.json(result.rows)
  } catch (err) {
    console.error("Error al obtener choferes:", err)
    res.status(500).json({ error: "Error al obtener choferes" })
  }
}

module.exports = {
  crearObjetivo,
  obtenerObjetivos,
  obtenerCumplimiento,
  eliminarObjetivo,
  obtenerChoferes,
}
