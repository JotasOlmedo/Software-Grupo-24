const express = require("express")
const router = express.Router()
const estadisticasController = require("../controllers/estadisticasController")

// UC 28: Estadísticas semanales
router.get("/semanales", estadisticasController.obtenerEstadisticasSemanales)

// UC 49: Evolución mensual por tipo de cilindro
router.get("/evolucion-mensual", estadisticasController.evolucionMensualPorTipo)

router.get("/tiempo-promedio-entrega", estadisticasController.tiempoPromedioEntrega)

module.exports = router
