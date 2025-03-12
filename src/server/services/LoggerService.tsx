// src/server/services/LoggerService.ts
import winston from 'winston';
import path from 'path';

export class Logger {
  private logger: winston.Logger;

  constructor(context?: string) {
    // Ensure logs directory exists
    const logsDir = path.resolve(process.cwd(), 'logs');
    
    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      defaultMeta: { service: context },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, service, stack }) => {
              const servicePart = service ? `[${service}]` : '';
              return `${timestamp} ${level}: ${servicePart} ${message}${stack ? `\n${stack}` : ''}`;
            })
          )
        }),
        // File transport for errors
        new winston.transports.File({ 
          filename: path.join(logsDir, 'error.log'), 
          level: 'error' 
        }),
        // File transport for combined logs
        new winston.transports.File({ 
          filename: path.join(logsDir, 'combined.log') 
        })
      ]
    });

    // If we're not in production, add some additional console logging
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.simple()
      }));
    }
  }

  // Log methods
  public info(message: string, ...meta: any[]) {
    this.logger.info(message, ...meta);
  }

  public error(message: string, ...meta: any[]) {
    this.logger.error(message, ...meta);
  }

  public warn(message: string, ...meta: any[]) {
    this.logger.warn(message, ...meta);
  }

  public debug(message: string, ...meta: any[]) {
    this.logger.debug(message, ...meta);
  }
}

// Export a default logger for general use
export const logger = new Logger('DefaultLogger');