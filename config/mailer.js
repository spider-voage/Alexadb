const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USERNAME, pass: process.env.SMTP_PASSWORD }
});
const verifyConnection = async () => { try { await transporter.verify(); console.log('SMTP OK'); return true; } catch (e) { console.error('SMTP failed:', e.message); return false; } };
const sendEmail = async ({ to, subject, html, text }) => { try { const info = await transporter.sendMail({ from: `"${process.env.SMTP_FROM_NAME || 'AlexaDB'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME}>`, to, subject, html, text: text || html.replace(/<[^>]*>/g, '') }); return { success: true, messageId: info.messageId }; } catch (e) { return { success: false, error: e.message }; } };
module.exports = { transporter, verifyConnection, sendEmail };
