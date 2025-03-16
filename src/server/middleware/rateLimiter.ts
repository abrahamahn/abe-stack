// src/server/middleware/rateLimiter.ts
import type { Request, Response, NextFunction } from 'express';

import { TooManyRequestsError } from '../../shared/errors/ApiError';
import { env } from '../config/environment';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

const stores: { [key: string]: RateLimitStore } = {};

const createLimiter = (config: RateLimitConfig, storeKey: string) => {
  if (!stores[storeKey]) {
    stores[storeKey] = {};
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.ip || (req.socket as { remoteAddress?: string }).remoteAddress || 'unknown') as string;
    const now = Date.now();
    
    if (stores[storeKey][ip] && now > stores[storeKey][ip].resetTime) {
      delete stores[storeKey][ip];
    }
    
    if (!stores[storeKey][ip]) {
      stores[storeKey][ip] = {
        count: 1,
        resetTime: now + config.windowMs
      };
    } else {
      stores[storeKey][ip].count++;
    }
    
    if (stores[storeKey][ip].count > config.maxRequests) {
      return next(new TooManyRequestsError(config.message));
    }
    
    (res as { setHeader: (name: string, value: number) => void }).setHeader('X-RateLimit-Limit', config.maxRequests);
    (res as { setHeader: (name: string, value: number) => void }).setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - stores[storeKey][ip].count));
    (res as { setHeader: (name: string, value: number) => void }).setHeader('X-RateLimit-Reset', Math.ceil(stores[storeKey][ip].resetTime / 1000));
    
    next();
  };
};

// General API rate limiter
export const apiLimiter = createLimiter(
  {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: env.NODE_ENV === 'production' ? 100 : 1000,
    message: 'Too many requests, please try again later.'
  },
  'api'
);

// More restrictive limiter for auth endpoints
export const authLimiter = createLimiter(
  {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: env.NODE_ENV === 'production' ? 10 : 100,
    message: 'Too many authentication attempts, please try again later.'
  },
  'auth'
);

// Media rate limiter
export const mediaLimiter = createLimiter(
  {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many media requests, please try again later.'
  },
  'media'
);