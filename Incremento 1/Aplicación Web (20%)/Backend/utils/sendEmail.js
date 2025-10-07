// utils/SendEmail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Gmail
    pass: process.env.EMAIL_PASS  // App Password (no la clave normal)
  }
});

/**
 * Puede usarse de 2 formas:
 *  1) sendEmail({ to, subject, html, attachments, cc, bcc })
 *  2) sendEmail(to, subject, html)   // compat con código antiguo
 */
async function sendEmail(arg1, subject, html) {
  let to, cc, bcc, attachments, bodyHtml, subj;

  if (typeof arg1 === 'string') {
    // Firma antigua
    to = arg1; subj = subject; bodyHtml = html;
  } else if (arg1 && typeof arg1 === 'object') {
    // Firma nueva
    ({ to, subject: subj, html: bodyHtml, attachments, cc, bcc } = arg1);
  } else {
    throw new Error('Parámetros inválidos en sendEmail');
  }

  const mailOptions = {
    from: `Sistema Valgas <${process.env.EMAIL_USER}>`,
    to, cc, bcc,
    subject: subj,
    html: bodyHtml,
    attachments
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado:', info.messageId || info.response);
    return true;
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return false;
  }
}

// Exports compatibles (default + named)
module.exports = sendEmail;               // require('../utils/SendEmail')
module.exports.sendEmail = sendEmail;     // const { sendEmail } = require('../utils/SendEmail')
module.exports.transporter = transporter; // opcional
