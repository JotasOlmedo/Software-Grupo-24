const API_URL = 'http://localhost:3000/api';
let lastData = null;

function format(n) { return new Intl.NumberFormat('es-CL').format(n); }

async function cargar() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) { window.location.href = 'index.html'; return; }
  const token = currentUser.token;

  const res = await fetch(`${API_URL}/reabastecimiento`, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!res.ok) { alert('No se pudieron cargar las sugerencias'); return; }
  const data = await res.json();
  render(data);
}

function render(data) {
  lastData = data;
  const r = data.metadata;
  document.getElementById('resumen').textContent = `Periodo ${r.periodo.inicio} a ${r.periodo.fin} • Tipos: ${r.total_tipos} • Total sugerido: ${format(r.total_sugerido)} • Horizonte: ${r.horizonte_dias}d • Seguridad: ${(r.safety_pct*100).toFixed(0)}%`;
  const tbody = document.getElementById('tbody');
  
  // Ordenar por peso numérico (5kg, 11.5kg, 15kg, 45kg, etc.)
  const sugerenciasOrdenadas = [...data.sugerencias].sort((a, b) => {
    const pesoA = parseFloat(a.tipo);
    const pesoB = parseFloat(b.tipo);
    return pesoA - pesoB;
  });
  
  tbody.innerHTML = sugerenciasOrdenadas.map(s => `
    <tr class="border-b">
      <td class="p-2 text-center">${s.tipo}</td>
      <td class="p-2 text-center">${format(s.vendidos_periodo)}</td>
      <td class="p-2 text-center">${s.promedio_diario}</td>
      <td class="p-2 text-center">${s.factor_estacional}</td>
      <td class="p-2 text-center">${format(s.stock_actual)}</td>
      <td class="p-2 text-center">${s.horizonte_dias}</td>
      <td class="p-2 text-center">${format(s.demanda_proyectada)}</td>
      <td class="p-2 text-center">${format(s.stock_seguridad)}</td>
      <td class="p-2 text-center font-semibold">${format(s.sugerido_reabastecer)}</td>
      <td class="p-2 text-center"><span class="px-2 py-1 rounded text-xs ${badgeClass(s.riesgo)}">${s.riesgo}</span></td>
    </tr>`).join('');
}

function badgeClass(r) {
  if (r === 'Alto') return 'bg-red-100 text-red-700';
  if (r === 'Medio') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

async function exportar() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const token = currentUser?.token;
  const url = `${API_URL}/reabastecimiento/exportar`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'sugerencias-reabastecimiento.csv';
  a.click();
}

async function exportarPDF() {
  if (!lastData) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });
  const meta = lastData.metadata;
  doc.setFontSize(12);
  doc.text(`Sugerencias de Reabastecimiento (${meta.periodo.inicio} a ${meta.periodo.fin})`, 14, 14);
  const head = [[
    'Tipo','Vendidos','Prom. diario','Factor','Stock','Horizonte','Demanda','Seguridad','Sugerido','Riesgo'
  ]];
  const body = lastData.sugerencias.map(s => [
    s.tipo,
    s.vendidos_periodo,
    s.promedio_diario,
    s.factor_estacional,
    s.stock_actual,
    s.horizonte_dias,
    s.demanda_proyectada,
    s.stock_seguridad,
    s.sugerido_reabastecer,
    s.riesgo
  ]);
  doc.autoTable({ head, body, startY: 20 });
  doc.save('sugerencias-reabastecimiento.pdf');
}

async function generar() {
  const fi = document.getElementById('fi').value;
  const ff = document.getElementById('ff').value;
  const horizonte = document.getElementById('horizonte').value;
  const safety = document.getElementById('safety').value;
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const token = currentUser?.token;

  const res = await fetch(`${API_URL}/reabastecimiento/generar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ fecha_inicio: fi || undefined, fecha_fin: ff || undefined, horizonte_dias: Number(horizonte), safety_pct: Number(safety) })
  });
  const data = await res.json();
  render(data);
}

// Eventos
document.addEventListener('DOMContentLoaded', () => {
  // Fechas por defecto (últimos 30 días)
  const hoy = new Date();
  document.getElementById('ff').value = hoy.toISOString().split('T')[0];
  const inicio = new Date(hoy.getTime() - 30*24*60*60*1000);
  document.getElementById('fi').value = inicio.toISOString().split('T')[0];

  document.getElementById('btnExportar').addEventListener('click', exportar);
  document.getElementById('btnExportarPDF').addEventListener('click', exportarPDF);
  document.getElementById('btnGenerar').addEventListener('click', generar);
  cargar();
});
