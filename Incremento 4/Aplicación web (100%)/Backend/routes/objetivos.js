const express = require("express")
const router = express.Router()
const objetivosController = require("../controllers/objetivosController")


router.post("/", objetivosController.crearObjetivo)
router.get("/", objetivosController.obtenerObjetivos)
router.get("/cumplimiento", objetivosController.obtenerCumplimiento)
router.delete("/:id", objetivosController.eliminarObjetivo)
router.get("/choferes", objetivosController.obtenerChoferes)

module.exports = router
