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

const otpResendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 3,
  message: { success: false, message: 'Too many OTP requests. Try again in 10 minutes.' },
  standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => req.body.email || req.ip
});

module.exports = { standardLimiter, authLimiter, apiLimiter, otpResendLimiter };
