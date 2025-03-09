// src/server/middleware/rateLimiter.ts
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express-serve-static-core';
import { NextFunction } from 'express';
import { env } from '../config/environment';
import { TooManyRequestsError } from '../../shared/errors/ApiError';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const apiStore: RateLimitStore = {};
const authStore: RateLimitStore = {};

const createLimiter = (store: RateLimitStore, windowMs: number, maxRequests: number, message: string) => {
  return (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (store[ip] && now > store[ip].resetTime) {
      delete store[ip];
    }
    
    if (!store[ip]) {
      store[ip] = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      store[ip].count++;
    }
    
    if (store[ip].count > maxRequests) {
      return next(new TooManyRequestsError(message));
    }
    
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - store[ip].count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(store[ip].resetTime / 1000));
    
    next();
  };
};

// General API rate limiter
export const apiLimiter = createLimiter(
  apiStore,
  15 * 60 * 1000, // 15 minutes
  env.NODE_ENV === 'production' ? 100 : 1000,
  'Too many requests, please try again later.'
);

// More restrictive limiter for auth endpoints
export const authLimiter = createLimiter(
  authStore,
  60 * 60 * 1000, // 1 hour
  env.NODE_ENV === 'production' ? 10 : 100,
  'Too many authentication attempts, please try again later.'
);