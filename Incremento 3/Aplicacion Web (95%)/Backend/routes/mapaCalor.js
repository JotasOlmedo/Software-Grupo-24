const express = require('express');
const router = express.Router();
const mapaCalorController = require('../controllers/mapaCalorController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Obtener datos del mapa de calor
router.get('/', authenticateToken, mapaCalorController.obtenerMapa);

// Generar mapa de calor manualmente (para testing o regeneración)
router.post('/generar', authenticateToken, mapaCalorController.generarMapa);

// Generar mapa de calor con período personalizado
router.post('/periodo', authenticateToken, mapaCalorController.generarMapaPorPeriodo);

module.exports = router;
