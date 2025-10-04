const express = require('express');
const router = express.Router();
const cilindroController = require('../controllers/cilindroController');

router.post('/', cilindroController.registrar);
router.get('/', cilindroController.listar);
router.put('/estado', cilindroController.actualizarEstado);
router.get('/disponibles', cilindroController.listarDisponibles);
router.get('/disponibles-stock', cilindroController.listarDisponiblesStock);

module.exports = router;