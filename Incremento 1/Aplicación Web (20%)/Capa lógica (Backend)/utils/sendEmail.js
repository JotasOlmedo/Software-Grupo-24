const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Envía un correo al destinatario indicado
 * @param {string} to - Correo destino
 * @param {string} subject - Asunto del correo
 * @param {string} html - Contenido HTML del mensaje
 */
async function sendEmail(to, subject, html) {
  const mailOptions = {
    from: `Sistema Valgas <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado: ' + info.response);
    return true;
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return false;
  }
}

module.exports = sendEmail;