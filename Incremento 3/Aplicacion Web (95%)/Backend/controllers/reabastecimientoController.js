const { generarSugerencias, obtenerSugerenciasActuales } = require('../utils/sugeridorReabastecimiento');

// GET /api/reabastecimiento
exports.obtener = async (req, res) => {
  try {
    const data = await obtenerSugerenciasActuales();
    res.json(data);
  } catch (err) {
    console.error('Error al obtener sugerencias:', err);
    res.status(500).json({ message: 'Error al obtener sugerencias', error: err.message });
  }
};

// POST /api/reabastecimiento/generar
exports.generar = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, horizonte_dias, safety_pct } = req.body || {};
    const fin = fecha_fin || new Date().toISOString().split('T')[0];
    const inicio = fecha_inicio || new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
    const data = await generarSugerencias(inicio, fin, {
      horizonteDias: Number(horizonte_dias) || undefined,
      safetyPct: (safety_pct !== undefined ? Number(safety_pct) : undefined),
    });
    res.json(data);
  } catch (err) {
    console.error('Error al generar sugerencias:', err);
    res.status(500).json({ message: 'Error al generar sugerencias', error: err.message });
  }
};

// GET /api/reabastecimiento/exportar (CSV)
exports.exportarCSV = async (req, res) => {
  try {
    const data = await obtenerSugerenciasActuales();
    // Para compatibilidad con Excel (ES), usar separador ';' y encabezado sep=;
    const sep = ';';
    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replaceAll('"', '""');
      return `"${str}"`;
    };
    const encabezado = ['tipo','vendidos_periodo','promedio_diario','factor_estacional','stock_actual','horizonte_dias','demanda_proyectada','stock_seguridad','sugerido_reabastecer','riesgo'];
    const filas = [ 'sep=;', encabezado.join(sep) ];
    data.sugerencias.forEach(s => {
      const row = [
        escape(s.tipo),
        s.vendidos_periodo,
        s.promedio_diario,
        s.factor_estacional,
        s.stock_actual,
        s.horizonte_dias,
        s.demanda_proyectada,
        s.stock_seguridad,
        s.sugerido_reabastecer,
        escape(s.riesgo)
      ].join(sep);
      filas.push(row);
    });
    const bom = Buffer.from([0xEF,0xBB,0xBF]); // UTF-8 BOM para Excel
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sugerencias-reabastecimiento.csv"');
    res.send(Buffer.concat([bom, Buffer.from(filas.join('\n'), 'utf8')]));
  } catch (err) {
    console.error('Error al exportar CSV:', err);
    res.status(500).json({ message: 'Error al exportar CSV', error: err.message });
  }
};
