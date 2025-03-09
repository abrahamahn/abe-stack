// src/server/middleware/mediaRateLimiter.ts
import rateLimit from 'express-rate-limit';
import { TooManyRequestsError } from '../../shared/errors/ApiError';

export const mediaLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Allow 10 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new TooManyRequestsError('Too many media requests, please try again later.'));
  },
});
