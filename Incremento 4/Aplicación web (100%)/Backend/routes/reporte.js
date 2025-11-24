const express = require("express")
const router = express.Router()
const reporteController = require("../controllers/reporteController")

console.log(reporteController);

router.post("/proveedores/adjuntar", reporteController.adjuntarDocumento)
router.get("/proveedores/listar", reporteController.listarReportes);

module.exports = router