const rateLimit = require('express-rate-limit');

const standardLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests.' },
  standardHeaders: true, legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  message: { success: false, message: 'Too many auth attempts. Try again in 15 min.' },
  standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, max: 60,
  message: { success: false, message: 'API rate limit exceeded.' },
  standardHeaders: true, legacyHeaders: false
});

module.exports = { standardLimiter, authLimiter, apiLimiter };
