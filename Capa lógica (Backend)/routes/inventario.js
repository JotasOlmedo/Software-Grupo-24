const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');

router.get('/', inventarioController.getAll);
router.get('/reporte-diario', inventarioController.reporteDiario);

module.exports = router;