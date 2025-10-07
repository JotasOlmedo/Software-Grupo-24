const express = require("express")
const router = express.Router()
const mensajeController = require("../controllers/mensajeController")

// Mensajes fijados en dashboard (cu39)
router.post("/", mensajeController.crear)
router.get("/activos", mensajeController.listarActivos)
router.put("/:id/desactivar", mensajeController.desactivar)

module.exports = router
