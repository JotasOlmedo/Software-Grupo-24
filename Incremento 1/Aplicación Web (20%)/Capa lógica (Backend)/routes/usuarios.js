const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

router.post('/login', usuarioController.login);
router.post('/register', usuarioController.register);
router.get('/', usuarioController.getAll);
router.post('/recuperar', usuarioController.recuperarContrasena);
router.post('/reset', usuarioController.restablecerContrasena);
router.post('/asignar-rol', usuarioController.asignarRol);

module.exports = router;