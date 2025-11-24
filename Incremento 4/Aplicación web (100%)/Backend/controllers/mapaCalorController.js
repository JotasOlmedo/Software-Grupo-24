const { obtenerDatosMapaCalor, generarMapaCalorSemanal } = require('../utils/heatmapGenerator');
const { registrarHistorial } = require('../utils/historial');

/**
 * Obtiene los datos del mapa de calor para visualización
 */
exports.obtenerMapa = async (req, res) => {
  try {
    const datos = await obtenerDatosMapaCalor();
    
    if (!datos) {
      return res.status(404).json({ 
        message: 'No hay datos de mapa de calor disponibles' 
      });
    }
    
    res.json(datos);
  } catch (err) {
    console.error('Error al obtener mapa de calor:', err);
    res.status(500).json({ 
      message: 'Error al obtener datos del mapa de calor',
      error: err.message 
    });
  }
};

/**
 * Fuerza la generación manual del mapa de calor
 * (útil para testing o regeneración bajo demanda)
 */
exports.generarMapa = async (req, res) => {
  try {
    const { usuarioAdmin } = req.body;
    
    console.log('Generación manual del mapa de calor iniciada...');
    const datos = await generarMapaCalorSemanal();
    
    // Registrar en historial
    if (usuarioAdmin) {
      await registrarHistorial(
        usuarioAdmin,
        'Generación de mapa de calor',
        'Generó manualmente el mapa de calor de zonas de entrega'
      );
    }
    
    res.json({ 
      message: 'Mapa de calor generado exitosamente',
      datos 
    });
  } catch (err) {
    console.error('Error al generar mapa de calor:', err);
    res.status(500).json({ 
      message: 'Error al generar el mapa de calor',
      error: err.message 
    });
  }
};

/**
 * Genera mapa de calor con período personalizado
 * Permite al usuario seleccionar fechas de inicio y fin
 */
exports.generarMapaPorPeriodo = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, usuarioAdmin } = req.body;
    
    // Validar que ambas fechas estén presentes
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ 
        message: 'Se requieren ambas fechas: fechaInicio y fechaFin' 
      });
    }
    
    // Validar formato de fecha (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fechaInicio) || !dateRegex.test(fechaFin)) {
      return res.status(400).json({ 
        message: 'Formato de fecha inválido. Use YYYY-MM-DD' 
      });
    }
    
    // Validar que fechaInicio sea menor o igual a fechaFin
    if (new Date(fechaInicio) > new Date(fechaFin)) {
      return res.status(400).json({ 
        message: 'La fecha de inicio debe ser anterior o igual a la fecha de fin' 
      });
    }
    
    console.log(`Generación de mapa de calor para período: ${fechaInicio} - ${fechaFin}`);
    const datos = await generarMapaCalorSemanal(fechaInicio, fechaFin);
    
    // Registrar en historial
    if (usuarioAdmin) {
      await registrarHistorial(
        usuarioAdmin,
        'Consulta de mapa de calor',
        `Consultó el mapa de calor del período ${fechaInicio} al ${fechaFin}`
      );
    }
    
    res.json({ 
      message: 'Mapa de calor generado exitosamente',
      datos 
    });
  } catch (err) {
    console.error('Error al generar mapa de calor por período:', err);
    res.status(500).json({ 
      message: 'Error al generar el mapa de calor',
      error: err.message 
    });
  }
};
