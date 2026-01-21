// apps/server/src/infrastructure/monitor/logger/types.ts
/**
 * Logger Types
 *
 * Type definitions for the logging service.
 */

/**
 * Log levels supported by the logger
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Structured log data
 */
export interface LogData {
  [key: string]: unknown;
  correlationId?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  error?: Error | string;
}

/**
 * Logger interface - abstracts away the actual logger implementation
 * This is the public interface that services should use.
 */
export interface Logger {
  trace(msg: string, data?: LogData): void;
  debug(msg: string, data?: LogData): void;
  info(msg: string, data?: LogData): void;
  warn(msg: string, data?: LogData): void;
  error(msg: string | Error, data?: LogData): void;
  fatal(msg: string | Error, data?: LogData): void;

  /**
   * Create a child logger with additional context
   */
  child(bindings: LogData): Logger;
}

/**
 * Request context for logging
 */
export interface RequestContext {
  correlationId: string;
  requestId: string;
  method: string;
  path: string;
  ip: string;
  userAgent?: string;
  userId?: string;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  prettyPrint?: boolean;
  redactPaths?: string[];
}
