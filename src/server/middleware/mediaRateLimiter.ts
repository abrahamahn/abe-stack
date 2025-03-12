// src/server/middleware/mediaRateLimiter.ts
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express-serve-static-core';
import { NextFunction } from 'express';
import { TooManyRequestsError } from '../../shared/errors/ApiError';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;

export const mediaLimiter = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Clean up expired entries
  if (store[ip] && now > store[ip].resetTime) {
    delete store[ip];
  }
  
  // Initialize or increment counter
  if (!store[ip]) {
    store[ip] = {
      count: 1,
      resetTime: now + WINDOW_MS
    };
  } else {
    store[ip].count++;
  }
  
  // Check limit
  if (store[ip].count > MAX_REQUESTS) {
    return next(new TooManyRequestsError('Too many media requests, please try again later.'));
  }
  
  // Add headers
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - store[ip].count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(store[ip].resetTime / 1000));
  
  next();
};
