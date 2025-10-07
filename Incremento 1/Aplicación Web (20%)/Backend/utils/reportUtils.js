const nodemailer = require("nodemailer");
const XLSX = require("xlsx");
const pool = require("../db"); 

// --- FECHA LOCAL YYYY-MM-DD (Chile) ---
function hoyYYYYMMDD() {
  const ahora = new Date();
  const offMs = ahora.getTimezoneOffset() * 60000;
  const local = new Date(ahora - offMs);
  return local.toISOString().split("T")[0];
}

// --- PEDIDOS POR FECHA ---
async function obtenerPedidosPorFecha(fecha) {
  const sql = `
    SELECT p.id_pedido, p.fecha, p.estado, p.montototal,
           c.nombre AS cliente_nombre, c.direccion, p.chofer_id
    FROM pedido p
    JOIN cliente c ON p.cliente_id = c.id_cliente
    WHERE DATE(p.fecha) = $1
    ORDER BY p.id_pedido;
  `;
  const { rows } = await pool.query(sql, [fecha]);
  return rows;
}

// --- ADMIN EMAILS DESDE BD ---
// Usa la consulta que calce con tu esquema (dejo 2 variantes; descomenta una).
async function obtenerCorreosAdministradores() {
  // VARIANTE A: tabla usuarios con FK a tabla roles
  const sql = `
    SELECT correo FROM Usuario WHERE rol_id = 1;
  `;

  const { rows } = await pool.query(sql);
  // normalizamos y filtramos vacíos/duplicados
  const emails = [...new Set(rows.map(r => String(r.correo || "").trim()).filter(Boolean))];
  return emails;
}

// --- EXCEL DESDE ROWS ---
function prepararExcel(rows, fecha) {
  const headers = ["id_pedido","fecha","estado","montototal","cliente_nombre","direccion","chofer_id"];
  const data = rows.map(r => [
    r.id_pedido, r.fecha, r.estado, r.montototal, r.cliente_nombre, r.direccion, r.chofer_id
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Pedidos");

  return {
    buffer: XLSX.write(wb, { type: "buffer", bookType: "xlsx" }),
    filename: `reporte_pedidos_${fecha}.xlsx`,
  };
}

// --- ENVÍO MAIL (usa destinatarios de la BD) ---
async function enviarCorreoConAdjunto({ buffer, filename, fecha, total, destinatarios }) {
  if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
    console.warn("[CRON] No hay administradores con email para enviar.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: +process.env.SMTP_PORT || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const html = `
    <p>Hola,</p>
    <p>Adjuntamos el reporte diario de pedidos para la fecha <b>${fecha}</b>.</p>
    <p>Total de pedidos: <b>${total}</b></p>
    <p>Saludos,<br/>Sistema de Reportes</p>
  `;

  await transporter.sendMail({
    from: `"Reportes" <${process.env.SMTP_USER}>`,
    to: destinatarios, // ← correos desde la BD
    subject: `Reporte diario de pedidos - ${fecha}`,
    html,
    attachments: [{
      filename,
      content: buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }],
  });
}

module.exports = {
  hoyYYYYMMDD,
  obtenerPedidosPorFecha,
  obtenerCorreosAdministradores,
  prepararExcel,
  enviarCorreoConAdjunto,
};
