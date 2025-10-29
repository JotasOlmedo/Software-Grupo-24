const pool = require('../db');
const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Geocodifica una dirección usando Nominatim (OpenStreetMap)
 * @param {string} direccion - Dirección completa del cliente
 * @returns {Promise<{lat: number, lon: number} | null>}
 */
async function geocodificarDireccion(direccion) {
  // Intentar con múltiples estrategias de búsqueda
  const estrategias = [
    `${direccion}, Rancagua, Chile`,
    `${direccion}, Región de O'Higgins, Chile`,
    `${direccion}, Chile`,
    // Extraer solo el nombre de la calle sin números
    `${direccion.replace(/\d+/g, '').trim()}, Rancagua, Chile`
  ];

  for (let i = 0; i < estrategias.length; i++) {
    const query = encodeURIComponent(estrategias[i]);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=cl`;

    console.log(`[Geocodificación] Intento ${i + 1}/${estrategias.length}: "${estrategias[i]}"`);

    const resultado = await new Promise((resolve) => {
      https.get(url, {
        headers: {
          'User-Agent': 'ValgasHeatmapSystem/1.0'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed && parsed.length > 0) {
              console.log(`[Geocodificación] ✓ Encontrado: ${parsed[0].display_name}`);
              resolve({ lat: parseFloat(parsed[0].lat), lon: parseFloat(parsed[0].lon) });
            } else {
              resolve(null);
            }
          } catch (err) {
            console.error('[Geocodificación] Error al parsear:', err);
            resolve(null);
          }
        });
      }).on('error', (err) => {
        console.error('[Geocodificación] Error de red:', err);
        resolve(null);
      });
    });

    if (resultado) {
      return resultado;
    }

    // Esperar 1.5 segundos entre intentos para respetar límite de Nominatim
    if (i < estrategias.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log(`[Geocodificación] ✗ No se pudo encontrar: "${direccion}"`);
  return null;
}

/**
 * Obtiene las direcciones de entregas de la última semana
 * @param {string} fechaInicio - Fecha de inicio (opcional)
 * @param {string} fechaFin - Fecha de fin (opcional)
 * @returns {Promise<Array>}
 */
async function obtenerDireccionesEntregas(fechaInicio = null, fechaFin = null) {
  try {
    let query;
    let params = [];
    
    if (fechaInicio && fechaFin) {
      // Consulta con rango de fechas personalizado
      query = `
        SELECT DISTINCT c.direccion, COUNT(p.id_pedido) as frecuencia
        FROM pedido p
        INNER JOIN cliente c ON p.cliente_id = c.id_cliente
        WHERE p.fecha >= $1::date AND p.fecha <= $2::date
          AND p.estado IN ('Entregado', 'Completado')
          AND c.direccion IS NOT NULL
        GROUP BY c.direccion
        ORDER BY frecuencia DESC
      `;
      params = [fechaInicio, fechaFin];
    } else {
      // Consulta por defecto (última semana)
      query = `
        SELECT DISTINCT c.direccion, COUNT(p.id_pedido) as frecuencia
        FROM pedido p
        INNER JOIN cliente c ON p.cliente_id = c.id_cliente
        WHERE p.fecha >= NOW() - INTERVAL '7 days'
          AND p.estado IN ('Entregado', 'Completado')
          AND c.direccion IS NOT NULL
        GROUP BY c.direccion
        ORDER BY frecuencia DESC
      `;
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    console.error('Error al obtener direcciones de entregas:', err);
    return [];
  }
}

/**
 * Genera el mapa de calor semanal
 * Función principal que se ejecuta automáticamente los lunes a las 00:01
 * @param {string} fechaInicio - Fecha de inicio (opcional)
 * @param {string} fechaFin - Fecha de fin (opcional)
 */
async function generarMapaCalorSemanal(fechaInicio = null, fechaFin = null) {
  const periodo = fechaInicio && fechaFin 
    ? `del ${fechaInicio} al ${fechaFin}` 
    : 'semanal';
  console.log(`[Mapa de Calor] Iniciando generación del mapa de calor ${periodo}...`);
  
  try {
    // 1. Obtener direcciones de entregas
    const direcciones = await obtenerDireccionesEntregas(fechaInicio, fechaFin);
    
    console.log(`[Mapa de Calor] Direcciones obtenidas de la BD:`, direcciones);
    
    if (direcciones.length === 0) {
      console.log('[Mapa de Calor] No hay entregas en el período seleccionado');
      
      // Retornar objeto vacío pero válido
      const metadata = {
        generado: new Date().toISOString(),
        totalPuntos: 0,
        direccionesUnicas: 0,
        periodo: fechaInicio && fechaFin ? `${fechaInicio} - ${fechaFin}` : 'última semana',
        fechaInicio: fechaInicio || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        fechaFin: fechaFin || new Date().toISOString().split('T')[0]
      };
      
      return {
        metadata,
        data: []
      };
    }

    console.log(`[Mapa de Calor] Procesando ${direcciones.length} direcciones únicas...`);

    // 2. Geocodificar cada dirección (con delay para no saturar el servicio)
    const heatmapData = [];
    const direccionesEncontradas = [];
    const direccionesNoEncontradas = [];

    for (let i = 0; i < direcciones.length; i++) {
      const { direccion, frecuencia } = direcciones[i];
      const coords = await geocodificarDireccion(direccion);
      if (coords) {
        for (let j = 0; j < parseInt(frecuencia); j++) {
          heatmapData.push([coords.lat, coords.lon, 1]);
        }
        direccionesEncontradas.push({ direccion, frecuencia });
        console.log(`[Mapa de Calor] ✓ ${direccion} - ${frecuencia} entregas`);
      } else {
        direccionesNoEncontradas.push({ direccion, frecuencia });
        console.log(`[Mapa de Calor] ✗ No se pudo geocodificar: ${direccion}`);
      }
      if (i < direcciones.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 3. Guardar los datos en un archivo JSON
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const dataPath = path.join(publicDir, 'heatmapData.json');

    let periodo;
    if (fechaInicio && fechaFin) {
      periodo = `${fechaInicio} - ${fechaFin}`;
    } else {
      periodo = `${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} - ${new Date().toISOString().split('T')[0]}`;
    }

    const metadata = {
      generado: new Date().toISOString(),
      totalPuntos: heatmapData.length,
      direccionesUnicas: direcciones.length,
      periodo: periodo,
      fechaInicio: fechaInicio || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      fechaFin: fechaFin || new Date().toISOString().split('T')[0],
      encontradas: direccionesEncontradas.length,
      no_encontradas: direccionesNoEncontradas.length,
      porcentaje_exito: direcciones.length > 0 ? Math.round((direccionesEncontradas.length / direcciones.length) * 100) : 0
    };

    const output = {
      metadata,
      data: heatmapData,
      direccionesEncontradas,
      direccionesNoEncontradas
    };

    fs.writeFileSync(dataPath, JSON.stringify(output, null, 2));

    console.log(`[Mapa de Calor] ✓ Mapa de calor generado exitosamente`);
    console.log(`[Mapa de Calor] Total de puntos: ${heatmapData.length}`);
    console.log(`[Mapa de Calor] Archivo guardado en: ${dataPath}`);
    console.log(`[Mapa de Calor] Direcciones encontradas: ${direccionesEncontradas.length} / ${direcciones.length}`);
    console.log(`[Mapa de Calor] Direcciones no encontradas: ${direccionesNoEncontradas.length}`);

    return output;
  } catch (err) {
    console.error('[Mapa de Calor] Error al generar mapa de calor:', err);
    throw err;
  }
}

/**
 * Obtiene los datos del mapa de calor actual
 * @returns {Promise<Object>}
 */
async function obtenerDatosMapaCalor() {
  const dataPath = path.join(__dirname, '../public/heatmapData.json');
  
  if (!fs.existsSync(dataPath)) {
    // Si no existe, generar uno nuevo
    return await generarMapaCalorSemanal();
  }
  
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error al leer datos del mapa de calor:', err);
    return null;
  }
}

module.exports = {
  generarMapaCalorSemanal,
  obtenerDatosMapaCalor
};
