const express = require("express")
const router = express.Router()
const notificacionController = require("../controllers/notificacionController")

router.get("/", notificacionController.getAll)
router.post("/", notificacionController.crear)
router.delete("/:id", notificacionController.eliminar)
router.get("/stock/activas", notificacionController.getStockAlerts)
router.put("/:id/pendiente", notificacionController.marcarPendiente)
router.post("/check-stock", notificacionController.manualStockCheck)


module.exports = router
