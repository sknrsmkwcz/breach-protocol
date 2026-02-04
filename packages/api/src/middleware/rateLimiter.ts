import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 auth attempts per window
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit for game actions (prevent spam)
export const gameLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // 10 actions per second
  message: { error: 'Slow down! Too many actions' },
  standardHeaders: true,
  legacyHeaders: false,
});
