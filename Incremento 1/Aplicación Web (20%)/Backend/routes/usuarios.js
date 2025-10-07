const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { getCurrentUser } = require('../controllers/usuarioController');

router.post('/login', usuarioController.login);
router.post('/register', usuarioController.register);
router.post('/recuperar', usuarioController.recuperarContrasena);
router.post('/reset', usuarioController.restablecerContrasena);
router.post('/asignar-rol', usuarioController.asignarRol);
router.post('/crear-usuario',usuarioController.crearUsuario);
router.get('/me', authenticateToken, getCurrentUser);
router.get('/', usuarioController.getAll);
router.get('/choferes', usuarioController.listarChoferes);
router.put("/:id", usuarioController.modificarUsuario);

router.post('/:id/confirmar-password', usuarioController.confirmarPassword);
router.put('/:id/password', usuarioController.cambiarContrasena);

module.exports = router;