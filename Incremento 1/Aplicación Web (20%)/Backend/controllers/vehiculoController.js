const pool = require("../db")
const { registrarHistorial } = require("../utils/historial")

// Registrar vehículo con conductor asignado (CU46)
exports.registrar = async (req, res) => {
  try {
    const { patente, conductor_id, capacidad, usuario_admin } = req.body

    if (!patente || !conductor_id) {
      return res.status(400).json({ message: "Patente y conductor son obligatorios" })
    }

    // Verificar que el conductor existe y tiene rol_id = 3 (chofer)
    const conductorRes = await pool.query(`SELECT id, nombre, apellido, rol_id FROM usuario WHERE id = $1`, [
      conductor_id,
    ])

    if (conductorRes.rows.length === 0) {
      return res.status(404).json({ message: "Conductor no encontrado" })
    }

    const conductor = conductorRes.rows[0]
    if (conductor.rol_id !== 3) {
      return res.status(400).json({ message: "El usuario seleccionado no es un chofer (rol_id debe ser 3)" })
    }

    // Verificar que la patente no esté duplicada
    const patenteExiste = await pool.query(`SELECT id_transporte FROM vehiculo WHERE patente = $1`, [patente])

    if (patenteExiste.rows.length > 0) {
      return res.status(400).json({ message: "Ya existe un vehículo con esa patente" })
    }

    // Insertar vehículo
    const resultado = await pool.query(
      `INSERT INTO vehiculo (patente, conductor, capacidad)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [patente, `${conductor.nombre} ${conductor.apellido}`, capacidad || null],
    )

    await registrarHistorial(
      usuario_admin || "Admin",
      "Registro de vehículo",
      `Se registró el vehículo con patente ${patente} asignado al chofer ${conductor.nombre} ${conductor.apellido}`,
    )

    res.json({
      message: "Vehículo registrado correctamente",
      vehiculo: resultado.rows[0],
    })
  } catch (err) {
    console.error("Error al registrar vehículo:", err)
    res.status(500).json({ message: "Error al registrar vehículo", error: err.message })
  }
}

// Listar todos los vehículos
exports.listar = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT * FROM vehiculo
      ORDER BY id_transporte DESC
    `)

    res.json(resultado.rows)
  } catch (err) {
    console.error("Error al listar vehículos:", err)
    res.status(500).json({ message: "Error al listar vehículos", error: err.message })
  }
}

// Actualizar vehículo
exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params
    const { patente, conductor_id, capacidad, usuario_admin } = req.body

    // Verificar que el vehículo existe
    const vehiculoRes = await pool.query(`SELECT * FROM vehiculo WHERE id_transporte = $1`, [id])

    if (vehiculoRes.rows.length === 0) {
      return res.status(404).json({ message: "Vehículo no encontrado" })
    }

    let conductorNombre = vehiculoRes.rows[0].conductor

    // Si se proporciona nuevo conductor, verificar que sea chofer
    if (conductor_id) {
      const conductorRes = await pool.query(`SELECT id, nombre, apellido, rol_id FROM usuario WHERE id = $1`, [
        conductor_id,
      ])

      if (conductorRes.rows.length === 0) {
        return res.status(404).json({ message: "Conductor no encontrado" })
      }

      const conductor = conductorRes.rows[0]
      if (conductor.rol_id !== 3) {
        return res.status(400).json({ message: "El usuario seleccionado no es un chofer" })
      }

      conductorNombre = `${conductor.nombre} ${conductor.apellido}`
    }

    // Actualizar vehículo
    const resultado = await pool.query(
      `UPDATE vehiculo 
       SET patente = COALESCE($1, patente),
           conductor = COALESCE($2, conductor),
           capacidad = COALESCE($3, capacidad)
       WHERE id_transporte = $4
       RETURNING *`,
      [patente, conductorNombre, capacidad, id],
    )

    await registrarHistorial(usuario_admin || "Admin", "Actualización de vehículo", `Se actualizó el vehículo ID ${id}`)

    res.json({
      message: "Vehículo actualizado correctamente",
      vehiculo: resultado.rows[0],
    })
  } catch (err) {
    console.error("Error al actualizar vehículo:", err)
    res.status(500).json({ message: "Error al actualizar vehículo", error: err.message })
  }
}

// Eliminar vehículo
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params
    const { usuario_admin } = req.body

    const resultado = await pool.query(`DELETE FROM vehiculo WHERE id_transporte = $1 RETURNING *`, [id])

    if (resultado.rows.length === 0) {
      return res.status(404).json({ message: "Vehículo no encontrado" })
    }

    await registrarHistorial(
      usuario_admin || "Admin",
      "Eliminación de vehículo",
      `Se eliminó el vehículo con patente ${resultado.rows[0].patente}`,
    )

    res.json({ message: "Vehículo eliminado correctamente" })
  } catch (err) {
    console.error("Error al eliminar vehículo:", err)
    res.status(500).json({ message: "Error al eliminar vehículo", error: err.message })
  }
}

// Listar choferes disponibles (usuarios con rol_id = 3)
exports.listarChoferes = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT id, nombre, apellido, correo
      FROM usuario
      WHERE rol_id = 3
      ORDER BY nombre, apellido
    `)

    res.json(resultado.rows)
  } catch (err) {
    console.error("Error al listar choferes:", err)
    res.status(500).json({ message: "Error al listar choferes", error: err.message })
  }
}
