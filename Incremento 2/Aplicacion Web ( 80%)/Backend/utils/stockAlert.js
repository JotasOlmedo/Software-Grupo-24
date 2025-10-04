const sendEmail = require('./sendemail');

async function enviarAlertaStock(cilindrosBajoStock, correosDestino) {
  if (!cilindrosBajoStock.length || !correosDestino.length) return;

  const alertaTexto = cilindrosBajoStock.map(row =>
    `• ${row.tipo}: ${row.cantidad} unidades`
  ).join("<br>");

  const mensajeHTML = `
    <h3>⚠️ Alerta de Stock Bajo</h3>
    <p>Estos cilindros tienen menos de 5 unidades:</p>
    <p>${alertaTexto}</p>
  `;

  try {
    await sendEmail(correosDestino, "🚨 Stock Bajo de Cilindros", mensajeHTML);
    console.log("📩 Correo de alerta enviado.");
  } catch (error) {
    console.error("❌ Error al enviar el correo:", error);
  }
}

module.exports = enviarAlertaStock;
