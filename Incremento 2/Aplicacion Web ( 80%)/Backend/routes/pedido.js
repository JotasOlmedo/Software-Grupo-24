const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');

// Ruta para obtener todos los pedidos
router.post('/registrar', pedidoController.registrar);
router.get('/', pedidoController.listar);
router.get('/filtrados', pedidoController.listarFiltrado);
router.put('/:id_pedido', pedidoController.actualizar);



// Rutas para detalle de pedidos
router.post('/detalle/registrar', pedidoController.registrarDetalle);
router.get('/detalle/listar/:id_pedido', pedidoController.listarDetallesPorPedido);
router.get("/reporte-chofer", pedidoController.reportePedidosPorChofer);

module.exports = router;
