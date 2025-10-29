const express = require("express")
const cors = require("cors")
const cron = require("node-cron")
require("dotenv").config()

const app = express()
const port = process.env.PORT || 3000

// Middlewares
app.use(cors())
app.use(express.json())

// Servir archivos estáticos (para el mapa de calor)
app.use("/public", express.static("public"))

// Rutas importadas
const usuariosRoutes = require("./routes/usuarios")
const cilindrosRoutes = require("./routes/cilindros")
const inventarioRoutes = require("./routes/inventario")
const rolRoutes = require("./routes/roles")
const perdidasRoutes = require("./routes/perdidas")
const historialRoutes = require("./routes/historial")
const pedidoRoutes = require("./routes/pedido")
const clienteRoutes = require("./routes/cliente")
const estadisticasRoutes = require("./routes/estadisticas")
const vehiculosRoutes = require("./routes/vehiculos")
const mensajesRoutes = require("./routes/mensajes")
const notificacionesRoutes = require("./routes/notificaciones")
const chatInternoRoutes = require("./routes/chatInterno")
const reporteRoutes = require("./routes/reporte")
const objetivosRoutes = require("./routes/objetivos")
const mapaCalorRoutes = require("./routes/mapaCalor")
const reabastecimientoRoutes = require('./routes/reabastecimiento')
const rutaRoutes = require("./routes/ruta")

// Usar rutas con prefijos
app.use("/api/usuarios", usuariosRoutes)
app.use("/api/cilindros", cilindrosRoutes)
app.use("/api/inventario", inventarioRoutes)
app.use("/api/roles", rolRoutes)
app.use("/api/perdidas", perdidasRoutes)
app.use("/api/historial", historialRoutes)
app.use("/api/pedidos", pedidoRoutes)
app.use("/api/clientes", clienteRoutes)
app.use("/api/estadisticas", estadisticasRoutes)
app.use("/api/vehiculos", vehiculosRoutes)
app.use("/api/mensajes", mensajesRoutes)
app.use("/api/notificaciones", notificacionesRoutes)
app.use("/api/chatInterno", chatInternoRoutes)
app.use("/api/reporte", reporteRoutes)
app.use("/api/objetivos", objetivosRoutes)
app.use("/api/mapa-calor", mapaCalorRoutes)
app.use('/api/reabastecimiento', reabastecimientoRoutes);

app.use("/api/rutas", rutaRoutes)

// Ruta base
app.get("/", (req, res) => {
  res.send("Servidor API Valgas corriendo 🚀")
})

// ========== TAREA AUTOMÁTICA: GENERAR MAPA DE CALOR ==========
// Se ejecuta todos los lunes a las 00:01 hrs
const { generarMapaCalorSemanal } = require("./utils/heatmapGenerator")

cron.schedule("1 0 * * 1", async () => {
  console.log("🗓️  [CRON] Ejecutando tarea programada: Generación de mapa de calor semanal")
  try {
    await generarMapaCalorSemanal()
    console.log("✅ [CRON] Mapa de calor generado exitosamente")
  } catch (err) {
    console.error("❌ [CRON] Error al generar mapa de calor:", err)
  }
})

console.log("📅 Tarea programada configurada: Mapa de calor se generará todos los lunes a las 00:01")

const { startStockMonitoring } = require("./utils/stockMonitor")
startStockMonitoring()
console.log("📊 Servicio de monitoreo de stock iniciado: Verificación cada 6 horas")

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor backend activo en http://localhost:${port}`)
})
