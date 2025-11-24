const express = require("express")
const router = express.Router()
const rutaController = require("../controllers/rutaController")

router.get("/pedidos-pendientes/:chofer_id", rutaController.obtenerPedidosPendientes)
router.post("/guardar", rutaController.guardarRuta)
router.post("/iniciar", rutaController.iniciarRuta)
router.post("/completar-entrega", rutaController.completarEntrega)

router.get("/:id_ruta", rutaController.obtenerRuta)

module.exports = router
