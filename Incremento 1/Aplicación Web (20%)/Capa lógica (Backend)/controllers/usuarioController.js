const bcrypt = require('bcrypt');
const pool = require('../db');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const { registrarHistorial } = require('../utils/historial');

// Registro
exports.register = async (req, res) => {
  const { nombre, correo, contrasena } = req.body;
  try {
    const hashedPass = await bcrypt.hash(contrasena, 10);
    await pool.query(
      'INSERT INTO "Usuario" (nombre, correo, contrasena) VALUES ($1, $2, $3)',
      [nombre, correo, hashedPass]
    );
    res.json({ message: 'Usuario registrado correctamente' });
  } catch (err) {
    res.status(400).json({ message: 'Error al registrar: ' + err.detail });
  }
};

// Login
exports.login = async (req, res) => {
  const { correo, contrasena } = req.body;
  try {
    const result = await pool.query('SELECT * FROM "Usuario" WHERE correo = $1', [correo]);
    if (result.rows.length === 0) return res.json({ message: 'Usuario no encontrado' });

    const usuarioDB = result.rows[0];
    const isMatch = await bcrypt.compare(contrasena, usuarioDB.contrasena);
    if (isMatch) {
      res.json({ message: 'Login correcto', nombre: usuarioDB.nombre });
    } else {
      res.json({ message: 'Contraseña incorrecta' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Usuario"');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.recuperarContrasena = async (req, res) => {
  const { correo } = req.body;

  try {
    const result = await pool.query('SELECT * FROM "Usuario" WHERE correo = $1', [correo]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Correo no registrado' });

    const usuario = result.rows[0];

    // Generar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    const expiracion = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    await pool.query(`
      INSERT INTO "ResetToken" (token, usuario_id, expiracion)
      VALUES ($1, $2, $3)
    `, [token, usuario.id_usuario, expiracion]);

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
      SELECT * FROM "ResetToken"
      WHERE token = $1 AND expiracion > NOW() AND usado = false
    `, [token]);

    if (result.rows.length === 0)
      return res.status(400).json({ message: 'Token inválido o expirado' });

    const { usuario_id } = result.rows[0];
    const hash = await bcrypt.hash(nuevaContrasena, 10);

    await pool.query(`
      UPDATE "Usuario" SET contrasena = $1 WHERE id_usuario = $2
    `, [hash, usuario_id]);

    await pool.query(`
      UPDATE "ResetToken" SET usado = true WHERE token = $1
    `, [token]);

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar la contraseña' });
  }
};

exports.asignarRol = async (req, res) => {
  const { usuario_id, rol_id, usuarioAdmin } = req.body;
  const nombreUsuario = (await pool.query('SELECT nombre FROM "Usuario" WHERE id_usuario = $1', [usuario_id])).rows[0].nombre;
  const nombreRol = (await pool.query('SELECT nombre FROM "rol" WHERE id = $1', [rol_id])).rows[0].nombre;

  try {
    await pool.query(`
      UPDATE public."Usuario" SET rol_id = $1 WHERE id_usuario = $2
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
