const express = require("express")
const router = express.Router()
const chatInternoController = require("../controllers/chatInternoController")

router.post("/enviar", chatInternoController.enviarMensaje)
router.get("/conversacion/:id_usuario1/:id_usuario2", chatInternoController.obtenerConversacion)
router.get("/conversaciones/:id_usuario", chatInternoController.obtenerConversaciones)
router.get("/recientes/:id_usuario", chatInternoController.obtenerMensajesRecientes)
router.delete("/:id_msg", chatInternoController.eliminarMensaje)

module.exports = router
