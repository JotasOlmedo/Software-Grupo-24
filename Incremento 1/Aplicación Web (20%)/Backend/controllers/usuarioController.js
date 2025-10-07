const bcrypt = require('bcrypt');
const pool = require('../db');
const sendEmail = require('../utils/sendemail');
const crypto = require('crypto');
const { registrarHistorial } = require('../utils/historial');

// Registro
exports.register = async (req, res) => {
  const { nombre, correo, contrasena } = req.body;
  try {
    const hashedPass = await bcrypt.hash(contrasena, 10);
    await pool.query(
      'INSERT INTO usuario (nombre, correo, contrasena) VALUES ($1, $2, $3)',
      [nombre, correo, hashedPass]
    );
    res.json({ message: 'Usuario registrado correctamente' });
  } catch (err) {
    res.status(400).json({ message: 'Error al registrar: ' + err.detail });
  }
};

// Login con bloqueo por intentos fallidos (CU51)
exports.login = async (req, res) => {
  const { correo, contrasena,  } = req.body;
  const MAX_INTENTOS = 5;        // Número máximo de intentos fallidos
  const BLOQUEO_MINUTOS = 15;    // Bloqueo temporal en minutos

  try {
    const result = await pool.query('SELECT * FROM usuario WHERE correo = $1', [correo]);

    const user = result.rows[0];

    if (result.rows.length === 0) return res.json({ message: 'Usuario no encontrado' });

    const usuarioDB = result.rows[0];

    // Contar intentos fallidos recientes
    const ahora = new Date();
    const limiteIntentos = new Date(Date.now() - BLOQUEO_MINUTOS * 60000);
    const tiempoLiberacion = new Date(Date.now() + BLOQUEO_MINUTOS * 60000);

    const intentos = await pool.query(`
      SELECT COUNT(*) 
      FROM historial
      WHERE usuario = $1
        AND accion = 'Intento fallido de inicio de sesión'
        AND (
              (fecha = $2 AND hora >= $3)
              OR (fecha > $2)
            )`
    , [usuarioDB.nombre, limiteIntentos.toISOString().split('T')[0], limiteIntentos.toTimeString().split(' ')[0]]);

    if (parseInt(intentos.rows[0].count) >= MAX_INTENTOS) {
      return res.json({ message: `Cuenta bloqueada temporalmente hasta ${tiempoLiberacion.toTimeString().split(' ')[0]}.`});
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(contrasena, usuarioDB.contrasena);
    if (isMatch) {
          console.log("Login correcto - Usuario encontrado:", user);

      await registrarHistorial(
        usuarioDB.nombre,
        'Inicio de sesión',
        `El usuario "${usuarioDB.nombre}" (ID ${usuarioDB.id}) inició sesión correctamente`
      );
      return res.json({ message: 'Login correcto', nombre: usuarioDB.nombre, rol_id: usuarioDB.rol_id, id: usuarioDB.id, correo: usuarioDB.correo });
    } else {
      await registrarHistorial(
        usuarioDB.nombre,
        'Intento fallido de inicio de sesión',
        `El usuario "${usuarioDB.nombre}" (ID ${usuarioDB.id}) intentó iniciar sesión con contraseña incorrecta`
      );
      return res.json({ message: 'Contraseña incorrecta' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuario');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.recuperarContrasena = async (req, res) => {
  const { correo } = req.body;

  try {
    const result = await pool.query('SELECT * FROM usuario WHERE correo = $1', [correo]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Correo no registrado' });

    const usuario = result.rows[0];

    // Generar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    const expiracion = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    await pool.query(`
      INSERT INTO "resettoken" (token, usuario_id, expiracion)
      VALUES ($1, $2, $3)
    `, [token, usuario.id, expiracion]);

    const link = `http://127.0.0.1:5500/Frontend/NuevaContrasena.html?token=${token}`;
    const html = `<p>Haz clic aquí para restablecer tu contraseña:</p><a href="${link}">${link}</a>`;

    const enviado = await sendEmail(correo, 'Restablecer contraseña', html);
    if (enviado) res.json({ message: 'Enlace enviado al correo' });
    else res.status(500).json({ message: 'Error al enviar el correo' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.restablecerContrasena = async (req, res) => {
  const { token, nuevaContrasena } = req.body;

  try {
    const result = await pool.query(`
      SELECT * FROM resettoken
      WHERE token = $1 AND expiracion > NOW() AND usado = false
    `, [token]);

    if (result.rows.length === 0)
      return res.status(400).json({ message: 'Token inválido o expirado' });

    const { usuario_id } = result.rows[0];
    const hash = await bcrypt.hash(nuevaContrasena, 10);

    await pool.query(`
      UPDATE usuario SET contrasena = $1 WHERE id = $2
    `, [hash, usuario_id]);

    await pool.query(`
      UPDATE resettoken SET usado = true WHERE token = $1
    `, [token]);

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar la contraseña' });
  }
};

exports.asignarRol = async (req, res) => {
  const { usuario_id, rol_id, usuarioAdmin } = req.body;
  const nombreUsuario = (await pool.query('SELECT nombre FROM usuario WHERE id = $1', [usuario_id])).rows[0].nombre;
  const nombreRol = (await pool.query('SELECT nombre FROM rol WHERE id = $1', [rol_id])).rows[0].nombre;

  try {
    await pool.query(`
      UPDATE public.usuario SET rol_id = $1 WHERE id = $2
    `, [rol_id, usuario_id]);

    await registrarHistorial(
      usuarioAdmin,
      'Asignación de rol',
      `Asignó el rol "${nombreRol}" al usuario "${nombreUsuario}" (ID ${usuario_id})`
    );



    res.json({ message: "Rol asignado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al asignar rol" });
  }
};

// Crear usuario y reflejar en historial
exports.crearUsuario = async (req, res) => {
  const { nombre, apellido, correo, rut, contrasena, rol_id, usuarioAdmin } = req.body;

  if (!nombre || !apellido || !correo || !rut || !contrasena || !rol_id) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }
  
  try {
    const hashedPass = await bcrypt.hash(contrasena, 10);
    const nuevoUsuario = await pool.query(
      `INSERT INTO usuario (nombre, apellido, correo, rut, contrasena, rol_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [nombre, apellido, correo, rut, hashedPass, rol_id]
    );

    await registrarHistorial(
      usuarioAdmin,
      'Creación de usuario',
      `Se creó el usuario "${nombre}" con correo "${correo}" (ID ${nuevoUsuario.rows[0].id})`
    );

    res.json({ message: 'Usuario creado y registrado en historial' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error al crear usuario: ' + err.detail });
  }
};

// Devuelve los datos del usuario autenticado
exports.getCurrentUser = async (req, res) => {
  try {
    // Suponiendo que tu autenticación guarda el id en req.userId
    const userId = req.userId; 
    if (!userId) return res.status(401).json({ message: "No autenticado" });

    const result = await pool.query(
      'SELECT id, nombre, apellido, correo, rut, rol_id FROM usuario WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener usuario" });
  }
};

exports.cambiarContrasena = async (req, res) => {
  const { id } = req.params
  const { actualPassword, nuevaPassword } = req.body

  if (!actualPassword || !nuevaPassword) {
    return res.status(400).json({ error: "Faltan datos" })
  }

  try {
    // 1. Traer usuario
    const result = await pool.query("SELECT contrasena FROM usuario WHERE id = $1", [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" })
    }

    const usuario = result.rows[0]

    // 2. Validar contraseña actual
    const match = await bcrypt.compare(actualPassword, usuario.contrasena)
    if (!match) {
      return res.status(401).json({ error: "La contraseña actual es incorrecta" })
    }

    // 3. Hashear nueva contraseña
    const hashed = await bcrypt.hash(nuevaPassword, 10)

    // 4. Guardar en BD
    await pool.query("UPDATE usuario SET contrasena = $1 WHERE id = $2", [hashed, id])

    res.json({ message: "Contraseña actualizada correctamente" })
  } catch (err) {
    console.error("Error cambiando contraseña:", err)
    res.status(500).json({ error: "Error interno del servidor" })
  }
}

// Listar choferes
exports.listarChoferes = async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, nombre, apellido FROM usuario WHERE rol_id = 3 ORDER BY nombre'
    );
    res.json(resultado.rows);
  } catch (err) {
    console.error("Error al listar choferes:", err);
    res.status(500).json({ message: "Error al listar choferes" });
  }
};

// Modificar datos de un usuario (incluye contraseña)
exports.modificarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, correo, rut, rol_id, contrasena, usuarioAdmin } = req.body;

  try {
    const usuarioRes = await pool.query(`SELECT * FROM usuario WHERE id = $1`, [id]);
    if (usuarioRes.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const usuarioActual = usuarioRes.rows[0];

    let hashedPassword = usuarioActual.contrasena;
    if (contrasena) {
      // Encriptar nueva contraseña
      hashedPassword = await bcrypt.hash(contrasena, 10);
    }

    const actualizado = await pool.query(
      `UPDATE usuario
       SET nombre = $1,
           apellido = $2,
           correo = $3,
           rut = $4,
           rol_id = $5,
           contrasena = $6
       WHERE id = $7
       RETURNING *`,
      [
        nombre || usuarioActual.nombre,
        apellido || usuarioActual.apellido,
        correo || usuarioActual.correo,
        rut || usuarioActual.rut,
        rol_id || usuarioActual.rol_id,
        hashedPassword,
        id
      ]
    );

    // Registrar cambios en historial
    let cambios = [];
    if (nombre && nombre !== usuarioActual.nombre) cambios.push(`Nombre: "${usuarioActual.nombre}" → "${nombre}"`);
    if (apellido && apellido !== usuarioActual.apellido) cambios.push(`Apellido: "${usuarioActual.apellido}" → "${apellido}"`);
    if (correo && correo !== usuarioActual.correo) cambios.push(`Correo: "${usuarioActual.correo}" → "${correo}"`);
    if (rut && rut !== usuarioActual.rut) cambios.push(`RUT: "${usuarioActual.rut}" → "${rut}"`);
    if (rol_id && rol_id !== usuarioActual.rol_id) {
      const rolNuevo = (await pool.query(`SELECT nombre FROM rol WHERE id = $1`, [rol_id])).rows[0]?.nombre || rol_id;
      cambios.push(`Rol cambiado a "${rolNuevo}"`);
    }
    if (contrasena) {
      cambios.push(`Contraseña actualizada`);
    }

    if (cambios.length > 0) {
      await registrarHistorial(
        usuarioAdmin || "Admin_desconocido",
        "Asignación de rol",
        `Usuario ${nombre} ${apellido} modificado: ${cambios.join(", ")}`
      );
    }

    res.json({ message: "Usuario modificado correctamente", usuario: actualizado.rows[0] });
  } catch (err) {
    console.error("Error al modificar usuario:", err);
    res.status(500).json({ message: "Error al modificar usuario" });
  }
};

exports.confirmarPassword = async (req, res) => {
  const idParam = req.params?.id;
  const { actualPassword = "", correo } = req.body || {};

  if ((!idParam && !correo) || typeof actualPassword !== "string" || !actualPassword.trim()) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    let row;
    if (idParam) {
      const id = Number(idParam);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "ID inválido" });
      }
      const r = await pool.query("SELECT id, contrasena FROM usuario WHERE id = $1", [id]);
      row = r.rows[0];
    } else if (correo) {
      const r = await pool.query("SELECT id, contrasena FROM usuario WHERE correo = $1", [correo]);
      row = r.rows[0];
    }

    // Usuario no encontrado
    if (!row) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const ok = await bcrypt.compare(actualPassword.trim(), row.contrasena);
    if (!ok) {
      // Puedes usar un mensaje genérico si no quieres revelar si el usuario existe
      return res.status(401).json({ error: "La contraseña es incorrecta" });
    }

    return res.json({ ok: true, message: "Contraseña válida" });
  } catch (err) {
    console.error("Error validando contraseña:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};
