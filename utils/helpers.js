const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const generateSecureToken = (length = 64) => crypto.randomBytes(length).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const generateUUID = () => uuidv4();

const getDeviceFingerprint = (req) => {
  const data = `${req.headers['user-agent'] || ''}|${req.headers['accept-language'] || ''}|${req.headers['accept-encoding'] || ''}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

const getClientInfo = (req) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.connection.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  let device = 'Desktop', os = 'Unknown', browser = 'Unknown';
  if (/Mobile|Android|iPhone/i.test(ua)) device = 'Mobile';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  return { ip, userAgent: ua, device, os, browser, deviceInfo: `${device} - ${os} - ${browser}` };
};

module.exports = { generateSecureToken, hashToken, generateUUID, getDeviceFingerprint, getClientInfo };
