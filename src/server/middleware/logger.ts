// src/server/middleware/logger.ts
import { Request, Response as ExpressResponse, NextFunction } from 'express';
import winston from 'winston';
import { env } from '../config/environment';

// Configure winston logger
const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Sanitize sensitive data from objects
const sanitizeData = (data: any): any => {
  if (!data) return data;
  const sanitized = { ...data };
  
  // Remove sensitive fields
  if (sanitized.password) sanitized.password = '***';
  if (sanitized.passwordConfirmation) sanitized.passwordConfirmation = '***';
  if (sanitized.token) sanitized.token = '***';
  
  return sanitized;
};

// Request logger middleware
export const requestLogger = (req: Request, res: ExpressResponse, next: NextFunction) => {
  const start = Date.now();
  
  // Log request
  const logData = {
    method: req.method,
    url: req.url,
    body: sanitizeData(req.body),
    query: sanitizeData(req.query),
    ip: req.ip,
    userAgent: req.get('user-agent')
  };

  // Only log request body in development
  if (env.NODE_ENV === 'development') {
    logger.debug('Incoming request', logData);
  }

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const responseData = {
      ...logData,
      status: res.statusCode,
      duration: `${duration}ms`
    };

    // In production, only log errors (status >= 400)
    if (env.NODE_ENV === 'production' && res.statusCode >= 400) {
      logger.error('Request error', responseData);
    } else if (env.NODE_ENV === 'development') {
      logger.info('Request completed', responseData);
    }
  });

  next();
};

// Detailed logger middleware for development
export const detailedLogger = (req: Request, res: ExpressResponse & { send: any, json: any }, next: NextFunction) => {
  // Only log in development
  if (env.NODE_ENV !== 'development') {
    return next();
  }
  
  // Log request headers
  logger.debug('Request Headers:', { headers: req.headers });
  
  // Capture original methods
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Override send method to log response
  res.send = function(body?: any) {
    logger.debug('Response Body:', { body: sanitizeData(body) });
    return originalSend.call(this, body);
  };
  
  // Override json method to log response
  res.json = function(body?: any) {
    logger.debug('Response JSON:', { body: sanitizeData(body) });
    return originalJson.call(this, body);
  };
  
  next();
};