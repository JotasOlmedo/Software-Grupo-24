const express = require('express');
const router = express.Router();
const perdidaController = require('../controllers/perdidaController');

router.post('/', perdidaController.registrar);

module.exports = router;
