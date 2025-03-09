// src/server/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import { env } from '../config/environment';
import { TooManyRequestsError } from '../../shared/errors/ApiError';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many requests, please try again later.'));
  }
});

// More restrictive limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: env.NODE_ENV === 'production' ? 10 : 100, // Limit each IP to 10 auth attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many authentication attempts, please try again later.'));
  }
});