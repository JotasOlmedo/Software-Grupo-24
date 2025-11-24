const API_URL = 'http://localhost:3000/api';

let map = null;
let heatLayer = null;

// Inicializar la página
document.addEventListener('DOMContentLoaded', async () => {
  // Verificar sesión
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) {
    window.location.href = 'index.html';
    return;
  }

  // Configurar fechas por defecto (última semana)
  configurarFechasPorDefecto();

  // Cargar el mapa de calor
  await cargarMapaCalor();

  // Configurar botones
  document.getElementById('btnRegenerar').addEventListener('click', regenerarMapa);
  document.getElementById('btnConsultarPeriodo').addEventListener('click', consultarPorPeriodo);
  document.getElementById('btnLimpiarFechas').addEventListener('click', limpiarFechas);
});

/**
 * Inicializa el mapa de Leaflet
 */
function inicializarMapa() {
  if (map) {
    map.remove();
  }

  // Crear mapa centrado en Melipilla, Chile
  map = L.map('map').setView([-33.6867, -71.2153], 12);

  // Agregar capa de tiles de OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(map);

  // Ocultar mensaje de carga
  document.getElementById('mensajeCarga').style.display = 'none';
  document.getElementById('map').style.display = 'block';
}

/**
 * Carga los datos del mapa de calor desde la API
 */
async function cargarMapaCalor() {
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const token = currentUser?.token;
    
    if (!token) {
      console.error('No se encontró token de autenticación');
      mostrarMensajeError();
      return;
    }
    
    const response = await fetch(`${API_URL}/mapa-calor`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('No se pudieron obtener los datos del mapa');
    }

    const datos = await response.json();

    if (!datos || !datos.data || datos.data.length === 0) {
      mostrarMensajeError();
      return;
    }

    // Actualizar información del mapa
    actualizarInfoMapa(datos.metadata);

    // Inicializar el mapa
    inicializarMapa();

    // Agregar capa de calor con puntos más notorios y colores vivos
    if (heatLayer) {
      map.removeLayer(heatLayer);
    }
    heatLayer = L.heatLayer(datos.data, {
      radius: 15, // más grande
      blur: 25,
      maxZoom: 17,
      minOpacity: 0.9,
      gradient: {
        0.1: 'blue',
        0.3: 'lime',
        0.5: 'yellow',
        0.7: 'orange',
        1.0: 'red'
      }
    }).addTo(map);

    // Ajustar vista del mapa para mostrar todos los puntos
    if (datos.data.length > 0) {
      const bounds = L.latLngBounds(datos.data.map(point => [point[0], point[1]]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Mostrar info de direcciones encontradas/no encontradas
    mostrarInfoDirecciones(datos);

    console.log('Mapa de calor cargado exitosamente');
    console.log('Usuario:', currentUser.name);  
/**
 * Muestra el listado de direcciones encontradas y no encontradas
 */
function mostrarInfoDirecciones(datos) {
  const encontradas = datos.direccionesEncontradas || [];
  const noEncontradas = datos.direccionesNoEncontradas || [];
  const listaEncontradas = document.getElementById('listaDireccionesEncontradas');
  const listaNoEncontradas = document.getElementById('listaDireccionesNoEncontradas');
  const seccionEncontradas = document.getElementById('seccionEncontradas');
  const seccionNoEncontradas = document.getElementById('seccionNoEncontradas');
  const btnToggleEncontradas = document.getElementById('btnToggleEncontradas');
  const btnToggleNoEncontradas = document.getElementById('btnToggleNoEncontradas');

  listaEncontradas.innerHTML = encontradas.length > 0
    ? encontradas.map(d => `<li>${d.direccion} <span class='text-xs text-gray-500'>(x${d.frecuencia})</span></li>`).join('')
    : '<li class="text-gray-400">Ninguna dirección geocodificada</li>';

  listaNoEncontradas.innerHTML = noEncontradas.length > 0
    ? noEncontradas.map(d => `<li>${d.direccion} <span class='text-xs text-gray-500'>(x${d.frecuencia})</span></li>`).join('')
    : '<li class="text-gray-400">Todas las direcciones fueron geocodificadas</li>';

  // Inicialmente oculto
  seccionEncontradas.classList.add('hidden');
  seccionNoEncontradas.classList.add('hidden');
  btnToggleEncontradas.textContent = 'Ver detalles';
  btnToggleNoEncontradas.textContent = 'Ver detalles';

  btnToggleEncontradas.onclick = () => {
    seccionEncontradas.classList.toggle('hidden');
    btnToggleEncontradas.textContent = seccionEncontradas.classList.contains('hidden') ? 'Ver detalles' : 'Ocultar';
  };
  btnToggleNoEncontradas.onclick = () => {
    seccionNoEncontradas.classList.toggle('hidden');
    btnToggleNoEncontradas.textContent = seccionNoEncontradas.classList.contains('hidden') ? 'Ver detalles' : 'Ocultar';
  };
}
  } catch (err) {
    console.error('Error al cargar mapa de calor:', err);
    mostrarMensajeError();
  }
}

/**
 * Configura las fechas por defecto (última semana)
 */
function configurarFechasPorDefecto() {
  const hoy = new Date();
  const hace7dias = new Date();
  hace7dias.setDate(hoy.getDate() - 7);
  
  document.getElementById('fechaFin').value = hoy.toISOString().split('T')[0];
  document.getElementById('fechaInicio').value = hace7dias.toISOString().split('T')[0];
}

/**
 * Actualiza la información del mapa (metadata)
 */
function actualizarInfoMapa(metadata) {
  if (!metadata) return;

  document.getElementById('totalPuntos').textContent = metadata.totalPuntos || '-';
  document.getElementById('direccionesUnicas').textContent = metadata.direccionesUnicas || '-';
  
  if (metadata.generado) {
    const fecha = new Date(metadata.generado);
    document.getElementById('fechaGeneracion').textContent = fecha.toLocaleDateString('es-CL');
  }
  
  // Usar metadata.periodo si existe, sino usar metadata.semana
  if (metadata.periodo) {
    const [inicio, fin] = metadata.periodo.split(' - ');
    const inicioFecha = new Date(inicio).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
    const finFecha = new Date(fin).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
    document.getElementById('periodoSemana').textContent = `${inicioFecha} - ${finFecha}`;
  } else if (metadata.semana) {
    const [inicio, fin] = metadata.semana.split(' - ');
    const inicioFecha = new Date(inicio).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
    const finFecha = new Date(fin).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
    document.getElementById('periodoSemana').textContent = `${inicioFecha} - ${finFecha}`;
  }
}

/**
 * Muestra mensaje de error cuando no hay datos
 */
function mostrarMensajeError() {
  document.getElementById('mensajeCarga').style.display = 'none';
  document.getElementById('map').style.display = 'none';
  document.getElementById('mensajeError').classList.remove('hidden');
}

/**
 * Valida las fechas seleccionadas
 */
function validarFechas(fechaInicio, fechaFin) {
  const mensajeValidacion = document.getElementById('mensajeValidacion');
  const textoValidacion = document.getElementById('textoValidacion');
  
  // Limpiar mensaje previo
  mensajeValidacion.classList.add('hidden');
  
  if (!fechaInicio || !fechaFin) {
    textoValidacion.textContent = 'Debe seleccionar ambas fechas';
    mensajeValidacion.classList.remove('hidden');
    lucide.createIcons();
    return false;
  }
  
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  
  if (inicio > fin) {
    textoValidacion.textContent = 'La fecha de inicio debe ser anterior o igual a la fecha de fin';
    mensajeValidacion.classList.remove('hidden');
    lucide.createIcons();
    return false;
  }
  
  return true;
}

/**
 * Consulta el mapa de calor por período personalizado
 */
async function consultarPorPeriodo() {
  const fechaInicio = document.getElementById('fechaInicio').value;
  const fechaFin = document.getElementById('fechaFin').value;
  
  // Validar fechas
  if (!validarFechas(fechaInicio, fechaFin)) {
    return;
  }
  
  const btnConsultar = document.getElementById('btnConsultarPeriodo');
  const originalHTML = btnConsultar.innerHTML;
  
  try {
    // Mostrar estado de carga
    btnConsultar.disabled = true;
    btnConsultar.innerHTML = `
      <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      <span>Consultando...</span>
    `;
    
    // Mostrar mensaje de carga en el mapa
    document.getElementById('map').style.display = 'none';
    document.getElementById('mensajeError').classList.add('hidden');
    document.getElementById('mensajeCarga').style.display = 'block';

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const token = currentUser?.token;
    
    if (!token) {
      console.error('No se encontró token de autenticación');
      alert('❌ Sesión inválida. Por favor, inicie sesión nuevamente.');
      window.location.href = 'index.html';
      return;
    }

    const response = await fetch(`${API_URL}/mapa-calor/periodo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fechaInicio,
        fechaFin,
        usuarioAdmin: currentUser.name
      })
    });

    if (!response.ok) {
      throw new Error('Error al consultar el período');
    }

    const resultado = await response.json();
    console.log('Mapa por período generado:', resultado);

    // Cargar los datos en el mapa
    await cargarMapaConDatos(resultado.datos);

  } catch (err) {
    console.error('Error al consultar período:', err);
    alert('❌ Error al consultar el mapa de calor. Intente nuevamente.');
    mostrarMensajeError();
  } finally {
    // Restaurar botón
    btnConsultar.disabled = false;
    btnConsultar.innerHTML = originalHTML;
    lucide.createIcons();
  }
}

/**
 * Carga el mapa con datos específicos
 */
async function cargarMapaConDatos(datos) {
  if (!datos || !datos.data || datos.data.length === 0) {
    mostrarMensajeError();
    return;
  }

  // Actualizar información del mapa
  actualizarInfoMapa(datos.metadata);

  // Inicializar el mapa si no existe
  if (!map) {
    inicializarMapa();
  }

  // Mostrar el mapa
  document.getElementById('mensajeCarga').style.display = 'none';
  document.getElementById('mensajeError').classList.add('hidden');
  document.getElementById('map').style.display = 'block';

  // Agregar capa de calor
  if (heatLayer) {
    map.removeLayer(heatLayer);
  }

  heatLayer = L.heatLayer(datos.data, {
    radius: 25,
    blur: 15,
    maxZoom: 17,
    max: 1.0,
    gradient: {
      0.0: 'blue',
      0.2: 'cyan',
      0.4: 'lime',
      0.6: 'yellow',
      0.8: 'orange',
      1.0: 'red'
    }
  }).addTo(map);

  // Ajustar vista del mapa para mostrar todos los puntos
  if (datos.data.length > 0) {
    const bounds = L.latLngBounds(datos.data.map(point => [point[0], point[1]]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }

  console.log('Mapa de calor actualizado exitosamente');
}

/**
 * Limpia las fechas y vuelve a cargar el mapa semanal por defecto
 */
async function limpiarFechas() {
  configurarFechasPorDefecto();
  await cargarMapaCalor();
}

/**
 * Regenera el mapa de calor manualmente
 */
async function regenerarMapa() {
  const btnRegenerar = document.getElementById('btnRegenerar');
  const originalHTML = btnRegenerar.innerHTML;
  
  try {
    // Mostrar estado de carga
    btnRegenerar.disabled = true;
    btnRegenerar.innerHTML = `
      <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      <span>Generando...</span>
    `;

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const token = currentUser?.token;
    
    if (!token) {
      console.error('No se encontró token de autenticación');
      alert('❌ Sesión inválida. Por favor, inicie sesión nuevamente.');
      window.location.href = 'index.html';
      return;
    }

    const response = await fetch(`${API_URL}/mapa-calor/generar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        usuarioAdmin: currentUser.name
      })
    });

    if (!response.ok) {
      throw new Error('Error al regenerar el mapa');
    }

    const resultado = await response.json();
    console.log('Mapa regenerado:', resultado);

    // Mostrar mensaje de éxito
    alert('✅ Mapa de calor regenerado exitosamente');

    // Recargar el mapa
    await cargarMapaCalor();

  } catch (err) {
    console.error('Error al regenerar mapa:', err);
    alert('❌ Error al regenerar el mapa de calor. Intente nuevamente.');
  } finally {
    // Restaurar botón
    btnRegenerar.disabled = false;
    btnRegenerar.innerHTML = originalHTML;
    lucide.createIcons();
  }
}
