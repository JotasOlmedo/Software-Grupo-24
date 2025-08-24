const express = require('express');
const router = express.Router();
const cilindroController = require('../controllers/cilindroController');

router.post('/', cilindroController.registrar);
router.get('/', cilindroController.listar);
router.put('/estado', cilindroController.actualizarEstado);

module.exports = router;