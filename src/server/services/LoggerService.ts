import winston from 'winston';

// Environment variables with defaults
const {
  LOG_LEVEL = 'info',
  NODE_ENV = 'development'
} = process.env;

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
    return `[Unformattable object: ${error}]`;
  }
};

/**
 * Logger service for consistent logging across the application
 */
export class Logger {
  private logger: winston.Logger;

  constructor(serviceName: string) {
    // Create Winston logger
    this.logger = winston.createLogger({
      level: LOG_LEVEL,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: serviceName },
      transports: [
        // Write logs to console
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
              // Format metadata for better readability
              let metaOutput = '';
              
              if (Object.keys(meta).length) {
                // Handle body property specially for HTTP requests
                if (meta.body) {
                  // For sensitive fields like passwords, replace with asterisks
                  if (typeof meta.body === 'object' && meta.body.password) {
                    meta.body = { ...meta.body, password: '***' };
                  }
                  
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
              
              return `${timestamp} ${level} [${service}]: ${message}${metaOutput}${separator}`;
            })
          )
        })
      ]
    });
    
    // Add file transports in production
    if (NODE_ENV === 'production') {
      this.logger.add(
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error' 
        })
      );
      this.logger.add(
        new winston.transports.File({ 
          filename: 'logs/combined.log' 
        })
      );
    }
  }

  /**
   * Log an info message
   */
  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log an error message
   */
  public error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  /**
   * Log a debug message
   */
  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }
} 