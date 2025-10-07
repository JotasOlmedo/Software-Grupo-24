const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialController');

router.get('/', historialController.listar);
router.get('/logins', historialController.listarLogins);
router.post('/', historialController.registrar);

module.exports = router;
