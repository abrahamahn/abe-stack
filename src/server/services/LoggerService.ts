import path from 'path';

import { Request, Response } from 'express';
import winston from 'winston';
// Environment variables with defaults
const {
  LOG_LEVEL = 'info',
  NODE_ENV = 'development'
} = process.env;

/**
 * Helper function to format objects for better readability
 */
const formatObject = (obj: unknown): string => {
  if (!obj) return '';
  
  try {
    // For strings that look like JSON, parse and then stringify with indentation
    if (typeof obj === 'string' && (obj.startsWith('{') || obj.startsWith('['))) {
      try {
        const parsed = JSON.parse(obj) as Record<string, unknown>;
        return '\n' + JSON.stringify(parsed, null, 2);
      } catch {
        // If parsing fails, treat as regular string
        return obj;
      }
    }
    
    // For objects, stringify with indentation
    if (typeof obj === 'object') {
      return '\n' + JSON.stringify(obj, null, 2);
    }
    
    // For other types, convert to string
    return String(obj);
  } catch (error) {
    return `[Unformattable object: ${String(error)}]`;
  }
};

/**
 * Sanitize sensitive data from objects
 */
const sanitizeData = (data: Record<string, unknown>): Record<string, unknown> => {
  if (!data) return data;
  const sanitized = { ...data };
  
  // Remove sensitive fields
  if (sanitized.password) sanitized.password = '***';
  if (sanitized.passwordConfirmation) sanitized.passwordConfirmation = '***';
  if (sanitized.token) sanitized.token = '***';
  if (sanitized.refreshToken) sanitized.refreshToken = '***';
  
  return sanitized;
};

/**
 * Unified Logger service for consistent logging across the application
 */
export class Logger {
  private logger: winston.Logger;

  constructor(serviceName?: string) {
    // Ensure logs directory exists
    const logsDir = path.resolve(process.cwd(), 'logs');
    
    // Create Winston logger
    this.logger = winston.createLogger({
      level: LOG_LEVEL,
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      defaultMeta: { service: serviceName },
      transports: [
        // Write logs to console with colorization
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf((info) => {
              const { timestamp, level, message, service, ...meta } = info;
              const messageStr = String(message);
              // Format metadata for better readability
              let metaOutput = '';
              
              if (Object.keys(meta).length) {
                // Handle body property specially for HTTP requests
                if (meta.body) {
                  meta.body = sanitizeData(meta.body as Record<string, unknown>);
                  metaOutput += `\nBody: ${formatObject(meta.body)}`;
                  delete meta.body;
                }
                
                // Format remaining metadata
                if (Object.keys(meta).length) {
                  metaOutput += `\nMeta: ${formatObject(meta)}`;
                }
              }
              
              // Add visual separator for debug level
              const separator = level.includes('debug') ? 
                '\n----------------------------------------' : '';
              
              const servicePart = service ? `[${String(service)}]` : '';
              return `${String(timestamp)} ${String(level)} ${servicePart}: ${messageStr}${metaOutput}${String(separator)}`;
            })
          )
        })
      ]
    });
    
    // Add file transports in production
    if (NODE_ENV === 'production') {
      this.logger.add(
        new winston.transports.File({ 
          filename: path.join(logsDir, 'error.log'), 
          level: 'error' 
        })
      );
      this.logger.add(
        new winston.transports.File({ 
          filename: path.join(logsDir, 'combined.log') 
        })
      );
    }
  }

  /**
   * Log an info message
   */
  public info(message: string, ...meta: unknown[]): void {
    this.logger.info(message, ...meta);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, ...meta: unknown[]): void {
    this.logger.warn(message, ...meta);
  }

  /**
   * Log an error message
   */
  public error(message: string, ...meta: unknown[]): void {
    this.logger.error(message, ...meta);
  }

  /**
   * Log a debug message
   */
  public debug(message: string, ...meta: unknown[]): void {
    this.logger.debug(message, ...meta);
  }

  /**
   * Log HTTP request details
   */
  public logRequest(req: Request): void {
    const logData = {
      method: String(req.method),
      url: String(req.url),
      body: sanitizeData(req.body as Record<string, unknown>),
      query: sanitizeData(req.query as Record<string, unknown>),
      ip: String(req.ip ?? ''),
      userAgent: String((req.get as (name: string) => string | null)('user-agent') ?? '')
    };

    if (NODE_ENV === 'development') {
      this.debug('Incoming request', logData);
    }
  }

  /**
   * Log HTTP response details
   */
  public logResponse(req: Request, res: Response, duration: number): void {
    const responseData = {
      method: String(req.method),
      url: String(req.url),
      status: Number(res.statusCode),
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };

    if (NODE_ENV === 'production' && res.statusCode >= 400) {
      this.error('Request error', responseData);
    } else if (NODE_ENV === 'development') {
      this.info('Request completed', responseData);
    }
  }
}

// Export a default logger instance
export const logger = new Logger('DefaultLogger'); 