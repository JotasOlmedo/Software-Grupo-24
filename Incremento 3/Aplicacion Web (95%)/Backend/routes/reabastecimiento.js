const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/reabastecimientoController');

// Todas protegidas con JWT
router.get('/', authenticateToken, ctrl.obtener);
router.post('/generar', authenticateToken, ctrl.generar);
router.get('/exportar', authenticateToken, ctrl.exportarCSV);

module.exports = router;
