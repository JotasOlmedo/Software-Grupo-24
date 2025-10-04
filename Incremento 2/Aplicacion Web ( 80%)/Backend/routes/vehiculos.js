const express = require("express")
const router = express.Router()
const vehiculoController = require("../controllers/vehiculoController")

// UC 46: Gestión de vehículos
router.post("/", vehiculoController.registrar)
router.get("/", vehiculoController.listar)
router.get("/choferes", vehiculoController.listarChoferes)
router.put("/:id", vehiculoController.actualizar)
router.delete("/:id", vehiculoController.eliminar)

module.exports = router
