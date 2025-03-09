import winston from 'winston';

// Environment variables with defaults
const {
  LOG_LEVEL = 'info',
  NODE_ENV = 'development'
} = process.env;

/**
 * Logger service for consistent logging across the application
 */
export class Logger {
  private logger: winston.Logger;
  private service: string;

  constructor(service: string) {
    this.service = service;
    
    // Create Winston logger
    this.logger = winston.createLogger({
      level: LOG_LEVEL,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service },
      transports: [
        // Write logs to console
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
              const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} ${level} [${service}]: ${message} ${metaString}`;
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