// Factores estacionales por mes (1-12). Ajusta libremente si tienes una configuración propia.
// Idea general: mayor demanda en meses fríos.
const FACTOR_GLOBAL_POR_MES = {
  1: 0.95,  // Ene
  2: 0.95,  // Feb
  3: 1.00,  // Mar
  4: 1.05,  // Abr
  5: 1.10,  // May
  6: 1.20,  // Jun
  7: 1.25,  // Jul
  8: 1.20,  // Ago
  9: 1.10,  // Sep
 10: 1.00,  // Oct
 11: 0.95,  // Nov
 12: 1.05   // Dic
};

// Si en el futuro quieres factores por tipo, puedes definirlos aquí.
// E.g. { "5kg": {...}, "11kg": {...} }
const FACTOR_POR_TIPO = {};

function getSeasonalityFactor(tipo, fecha = new Date()) {
  const mes = (fecha.getMonth() + 1);
  const porTipo = FACTOR_POR_TIPO[tipo]?.[mes];
  if (porTipo) return porTipo;
  return FACTOR_GLOBAL_POR_MES[mes] || 1.0;
}

module.exports = { getSeasonalityFactor };
