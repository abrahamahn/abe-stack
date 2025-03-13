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
        winston.format.printf(({ level, message, timestamp, ...rest }) => {
          // Format the metadata with proper indentation
          let meta = '';
          if (Object.keys(rest).length > 0) {
            try {
              meta = '\n' + JSON.stringify(rest, null, 2);
            } catch (e) {
              meta = ' ' + JSON.stringify(rest);
            }
          }
          
          // Add visual separator for debug level
          const separator = level.includes('debug') ? 
            '\n----------------------------------------' : '';
            
          return `${timestamp} ${level}: ${message}${meta}${separator}`;
        })
      )
    })
  ]
});

/**
 * Helper function to format objects for better readability
 */
const formatObject = (obj: any): string => {
  if (!obj) return '';
  
  try {
    // For strings that look like JSON, parse and then stringify with indentation
    if (typeof obj === 'string' && (obj.startsWith('{') || obj.startsWith('['))) {
      try {
        const parsed = JSON.parse(obj);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // If parsing fails, treat as regular string
        return obj;
      }
    }
    
    // For objects, stringify with indentation
    if (typeof obj === 'object') {
      return JSON.stringify(obj, null, 2);
    }
    
    // For other types, convert to string
    return String(obj);
  } catch (error) {
    return `[Unformattable object: ${error}]`;
  }
};

// Sanitize sensitive data from objects
const sanitizeData = (data: any): any => {
  if (!data) return data;
  const sanitized = { ...data };
  
  // Remove sensitive fields
  if (sanitized.password) sanitized.password = '***';
  if (sanitized.passwordConfirmation) sanitized.passwordConfirmation = '***';
  if (sanitized.token) sanitized.token = '***';
  if (sanitized.refreshToken) sanitized.refreshToken = '***';
  
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
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
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
    const sanitizedBody = sanitizeData(body);
    logger.debug('Response Body:', { 
      body: typeof sanitizedBody === 'string' ? sanitizedBody : formatObject(sanitizedBody) 
    });
    return originalSend.call(this, body);
  };
  
  // Override json method to log response
  res.json = function(body?: any) {
    const sanitizedBody = sanitizeData(body);
    logger.debug('Response JSON:', { 
      body: formatObject(sanitizedBody)
    });
    return originalJson.call(this, body);
  };
  
  next();
};