const express = require('express');
const router = express.Router();
const { registrarCliente, listar } = require('../controllers/clienteController');

// Registrar un cliente
router.post('/registrar', registrarCliente);

// Listar clientes
router.get('/', listar);

module.exports = router;
