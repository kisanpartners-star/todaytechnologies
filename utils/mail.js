const nodemailer = require("nodemailer");

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    const error = new Error("Email delivery is unavailable. Configure SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS on the server.");
    error.status = 503;
    throw error;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendMail({ to, subject, html, attachments = [] }) {
  const transporter = getTransporter();
  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'Today Technologies Pvt Ltd <info@todaytechnologies.co.in>',
    to,
    subject,
    html,
    attachments,
  });
}

module.exports = { sendMail };