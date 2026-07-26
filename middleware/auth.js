const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { dbGet } = require('../config/database');

let JWT_SECRET = process.env.JWT_SECRET;
let JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.warn('WARNING: JWT_SECRET not set or too short. Using auto-generated fallback. Set JWT_SECRET in production!');
  JWT_SECRET = crypto.randomBytes(64).toString('hex');
}
if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) {
  console.warn('WARNING: JWT_REFRESH_SECRET not set or too short. Using auto-generated fallback. Set JWT_REFRESH_SECRET in production!');
  JWT_REFRESH_SECRET = crypto.randomBytes(64).toString('hex');
}

const generateTokens = (userId, sessionId) => {
  const accessToken = jwt.sign({ userId, sessionId, type: 'access' }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
  const refreshToken = jwt.sign({ userId, sessionId, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
  return { accessToken, refreshToken };
};

const verifyAccessToken = (token) => jwt.verify(token, JWT_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, JWT_REFRESH_SECRET);

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Access token required.' });
    const decoded = verifyAccessToken(token);
    const session = await dbGet('SELECT * FROM sessions WHERE id = ? AND user_id = ? AND is_active = 1 AND expires_at > datetime("now")', [decoded.sessionId, decoded.userId]);
    if (!session) return res.status(401).json({ success: false, message: 'Session expired.' });
    const user = await dbGet('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [decoded.userId]);
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });
    if (user.status === 'banned') return res.status(403).json({ success: false, message: 'Account banned.' });
    if (user.status === 'suspended') return res.status(403).json({ success: false, message: 'Account suspended.' });
    req.user = user; req.session = session; req.token = token; next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Invalid token.' });
    return res.status(500).json({ success: false, message: 'Auth error.' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
    if (token) { const decoded = verifyAccessToken(token); const user = await dbGet('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [decoded.userId]); if (user && user.status === 'active') req.user = user; }
  } catch {} next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Auth required.' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
  next();
};

const requireAdmin = requireRole('super_admin', 'admin', 'moderator');
const requireSuperAdmin = requireRole('super_admin');

module.exports = { generateTokens, verifyAccessToken, verifyRefreshToken, authenticate, optionalAuth, requireRole, requireAdmin, requireSuperAdmin };
