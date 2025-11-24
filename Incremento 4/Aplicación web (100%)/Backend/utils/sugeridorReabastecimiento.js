const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { getSeasonalityFactor } = require('./seasonalityConfig');

// Configuración por defecto
const DEFAULT_HORIZON_DAYS = 14;
const DEFAULT_SAFETY_PCT = 0.2; // 20% stock de seguridad

async function obtenerVentasPorTipo(fechaInicio, fechaFin) {
  const query = `
    SELECT c.tipo, COUNT(*) AS vendidos
    FROM detallepedido dp
    JOIN cilindro c ON dp.id_cilindro = c.id
    JOIN pedido p ON dp.id_pedido = p.id_pedido
    WHERE p.fecha >= $1::date AND p.fecha <= $2::date
      AND p.estado IN ('Entregado','Completado')
    GROUP BY c.tipo
  `;
  const { rows } = await pool.query(query, [fechaInicio, fechaFin]);
  return rows; // [{tipo, vendidos}]
}

async function obtenerStockActualPorTipo() {
  // Usa la misma lógica que cilindroController.listarDisponiblesStock
  const query = `
    SELECT tipo, COUNT(*) AS cantidad
    FROM cilindro
    WHERE estado IS NULL OR estado != 'perdido' AND estado != 'vendido' AND estado != 'en_transito' AND estado != 'mantenimiento' AND estado != 'Vacío'
    GROUP BY tipo
  `;
  const { rows } = await pool.query(query);
  return rows; // [{tipo, cantidad}]
}

function calcularSugerencias(ventas, stockActual, options) {
  const { fechaInicio, fechaFin, horizonteDias, safetyPct } = options;
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diasPeriodo = Math.max(1, Math.round((fin - inicio) / (1000*60*60*24)) + 1);

  const stockMap = new Map(stockActual.map(r => [r.tipo, Number(r.cantidad)]));

  const sugerencias = ventas.map(v => {
    const tipo = v.tipo;
    const vendidos = Number(v.vendidos);
    const promedioDiario = vendidos / diasPeriodo;
    const factor = getSeasonalityFactor(tipo, new Date());
    const demandaProyectada = promedioDiario * horizonteDias * factor;
    const seguridad = demandaProyectada * safetyPct;
    const actual = stockMap.get(tipo) || 0;
    const sugerido = Math.max(0, Math.ceil(demandaProyectada + seguridad - actual));

    let riesgo = 'Bajo';
    const coberturaDias = actual / Math.max(0.01, promedioDiario * factor);
    if (coberturaDias < 3) riesgo = 'Alto';
    else if (coberturaDias < 7) riesgo = 'Medio';

    return {
      tipo,
      vendidos_periodo: vendidos,
      promedio_diario: Number(promedioDiario.toFixed(2)),
      factor_estacional: Number(factor.toFixed(2)),
      stock_actual: actual,
      horizonte_dias: horizonteDias,
      demanda_proyectada: Math.ceil(demandaProyectada),
      stock_seguridad: Math.ceil(seguridad),
      sugerido_reabastecer: sugerido,
      riesgo,
    };
  });

  // También incluir tipos que no vendieron pero con poco stock
  stockActual.forEach(s => {
    if (!sugerencias.find(x => x.tipo === s.tipo)) {
      const tipo = s.tipo;
      const factor = getSeasonalityFactor(tipo, new Date());
      const promedioDiario = 0.1; // mínimo implícito para no ignorar totalmente
      const demandaProyectada = promedioDiario * horizonteDias * factor;
      const seguridad = demandaProyectada * safetyPct;
      const actual = Number(s.cantidad);
      const sugerido = Math.max(0, Math.ceil(demandaProyectada + seguridad - actual));
      let riesgo = actual < 5 ? 'Medio' : 'Bajo';
      sugerencias.push({
        tipo,
        vendidos_periodo: 0,
        promedio_diario: Number(promedioDiario.toFixed(2)),
        factor_estacional: Number(factor.toFixed(2)),
        stock_actual: actual,
        horizonte_dias: horizonteDias,
        demanda_proyectada: Math.ceil(demandaProyectada),
        stock_seguridad: Math.ceil(seguridad),
        sugerido_reabastecer: sugerido,
        riesgo,
      });
    }
  });

  // Ordenar por riesgo y sugerido desc
  sugerencias.sort((a,b) => {
    const rank = { 'Alto':3, 'Medio':2, 'Bajo':1 };
    return (rank[b.riesgo]-rank[a.riesgo]) || (b.sugerido_reabastecer - a.sugerido_reabastecer);
  });

  return sugerencias;
}

async function generarSugerencias(fechaInicio, fechaFin, opts = {}) {
  const options = {
    horizonteDias: opts.horizonteDias || DEFAULT_HORIZON_DAYS,
    safetyPct: opts.safetyPct ?? DEFAULT_SAFETY_PCT,
    fechaInicio,
    fechaFin,
  };

  const ventas = await obtenerVentasPorTipo(fechaInicio, fechaFin);
  const stock = await obtenerStockActualPorTipo();
  const sugerencias = calcularSugerencias(ventas, stock, options);

  const metadata = {
    generado: new Date().toISOString(),
    periodo: { inicio: fechaInicio, fin: fechaFin },
    horizonte_dias: options.horizonteDias,
    safety_pct: options.safetyPct,
    total_tipos: sugerencias.length,
    total_sugerido: sugerencias.reduce((acc, s) => acc + s.sugerido_reabastecer, 0)
  };

  const output = { metadata, sugerencias };

  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'replenishmentSuggestions.json'), JSON.stringify(output, null, 2));
  return output;
}

async function obtenerSugerenciasActuales() {
  const filePath = path.join(__dirname, '../public/replenishmentSuggestions.json');
  if (!fs.existsSync(filePath)) {
    const hoy = new Date();
    const fin = hoy.toISOString().split('T')[0];
    const inicio = new Date(hoy.getTime() - 30*24*60*60*1000).toISOString().split('T')[0];
    return await generarSugerencias(inicio, fin);
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return data;
}

module.exports = { generarSugerencias, obtenerSugerenciasActuales };
