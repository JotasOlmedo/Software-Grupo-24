const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas importadas
const usuariosRoutes = require('./routes/usuarios');
const cilindrosRoutes = require('./routes/cilindros');
const inventarioRoutes = require('./routes/inventario');
const rolRoutes = require('./routes/roles');
const perdidasRoutes = require('./routes/perdidas');
const historialRoutes = require('./routes/historial');
const pedidoRoutes = require('./routes/pedido');
const clienteRoutes = require('./routes/cliente');
const estadisticasRoutes = require("./routes/estadisticas");
const vehiculosRoutes = require("./routes/vehiculos");
const mensajesRoutes = require("./routes/mensajes");
const notificacionesRoutes = require("./routes/notificaciones");
const chatInternoRoutes = require("./routes/chatInterno");
const reporteRoutes = require("./routes/reporte")
const objetivosRoutes = require("./routes/objetivos");

// Usar rutas con prefijos
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/cilindros', cilindrosRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/roles', rolRoutes);
app.use('/api/perdidas', perdidasRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/clientes', clienteRoutes);
app.use("/api/estadisticas", estadisticasRoutes);
app.use("/api/vehiculos", vehiculosRoutes);
app.use("/api/mensajes", mensajesRoutes);
app.use("/api/notificaciones", notificacionesRoutes);
app.use("/api/chatInterno", chatInternoRoutes);
app.use("/api/reporte", reporteRoutes);
app.use("/api/objetivos", objetivosRoutes);

// Ruta base
app.get('/', (req, res) => {
  res.send('Servidor API Valgas corriendo 🚀');
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor backend activo en http://localhost:${port}`);
});