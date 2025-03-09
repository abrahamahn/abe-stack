// src/server/middleware/logger.ts
import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { env } from '../config/environment';

// Custom token for request body (sanitized)
morgan.token('body', (req: Request) => {
  const body = { ...req.body };
  
  // Remove sensitive fields
  if (body.password) body.password = '***';
  if (body.passwordConfirmation) body.passwordConfirmation = '***';
  if (body.token) body.token = '***';
  
  return JSON.stringify(body);
});

// Development logger with colors and request body
const developmentFormat = ':method :url :status :response-time ms - :body';

// Production logger focused on performance metrics
const productionFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';

export const requestLogger = morgan(
  env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  {
    skip: (req, res) => env.NODE_ENV === 'production' && res.statusCode < 400
  }
);

// Additional logging middleware for request/response
export const detailedLogger = (req: Request, res: Response, next: NextFunction) => {
  // Only log in development
  if (env.NODE_ENV !== 'development') {
    return next();
  }
  
  // Log request headers
  console.log('\nRequest Headers:', req.headers);
  
  // Capture original methods
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Override send method to log response
  res.send = function(body?: any): Response {
    console.log('\nResponse Body:', body);
    return originalSend.call(this, body);
  };
  
  // Override json method to log response
  res.json = function(body?: any): Response {
    console.log('\nResponse JSON:', body);
    return originalJson.call(this, body);
  };
  
  next();
};