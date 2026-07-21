import rateLimit from 'express-rate-limit';
import { redis } from '../config/redis';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  store: {
    // Custom Redis store would go here
    incr: async (key: string) => {
      const multi = redis.multi();
      multi.incr(key);
      multi.pexpire(key, 15 * 60 * 1000);
      const results = await multi.exec();
      return {
        totalHits: results?.[0]?.[1] as number || 0,
        resetTime: new Date(Date.now() + 15 * 60 * 1000)
      };
    },
    decrement: (key: string) => redis.decr(key),
    resetKey: (key: string) => redis.del(key),
  } as any,
});

// Stricter limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

// Deployment limiter
export const deployLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many deployment requests.' },
});
