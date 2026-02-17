// main/shared/src/engine/logger/types.ts
/**
 * Logger Types
 *
 * Framework-agnostic type definitions for structured logging.
 * Extracted from the server's monitor/logger infrastructure to enable
 * reuse across packages without coupling to Fastify or pino.
 */

export type { LogLevel } from '../../primitives/config/types/infra';

/**
 * Structured log data attached to log entries.
 * Supports arbitrary key-value pairs plus well-known fields
 * for distributed tracing and error context.
 */
export interface LogData {
  [key: string]: unknown;
  /** Correlation ID for distributed request tracing */
  correlationId?: string;
  /** Authenticated user identifier */
  userId?: string;
  /** Unique request identifier */
  requestId?: string;
  /** Operation duration in milliseconds */
  duration?: number;
  /** Error context - either an Error object or error message string */
  error?: Error | string;
}

/**
 * Logger interface - abstracts away the actual logger implementation.
 * This is the canonical interface that services should use.
 * All methods are required (unlike the contracts Logger which has optional trace/fatal/child).
 *
 * @example
 * ```typescript
 * function processOrder(logger: Logger, orderId: string): void {
 *   logger.info('Processing order', { orderId });
 *   // ...
 *   logger.debug('Order processed successfully', { orderId, duration: 42 });
 * }
 * ```
 */
export interface Logger {
  /**
   * Log a trace-level message (most verbose).
   * @param msg - The log message
   * @param data - Optional structured data to attach
   */
  trace?(msg: string, data?: LogData): void;
  trace?(data: LogData, msg: string): void;

  /**
   * Log a debug-level message.
   * @param msg - The log message
   * @param data - Optional structured data to attach
   */
  debug(msg: string, data?: LogData): void;
  debug(data: LogData, msg: string): void;

  /**
   * Log an info-level message.
   * @param msg - The log message
   * @param data - Optional structured data to attach
   */
  info(msg: string, data?: LogData): void;
  info(data: LogData, msg: string): void;

  /**
   * Log a warn-level message.
   * @param msg - The log message
   * @param data - Optional structured data to attach
   */
  warn(msg: string, data?: LogData): void;
  warn(data: LogData, msg: string): void;

  /**
   * Log an error-level message.
   * @param msg - The log message or Error object
   * @param data - Optional structured data to attach
   */
  error(msg: string | Error, data?: LogData): void;
  error(data: LogData, msg?: string): void;

  /**
   * Log a fatal-level message (most severe).
   * @param msg - The log message or Error object
   * @param data - Optional structured data to attach
   */
  fatal?(msg: string | Error, data?: LogData): void;
  fatal?(data: LogData, msg: string): void;

  /**
   * Create a child logger with additional context bindings.
   * Child loggers automatically include the parent's bindings in every log entry.
   *
   * @param bindings - Key-value pairs to attach to all child log entries
   * @returns A new Logger instance with merged context
   */
  child?(bindings: LogData): Logger;
}

/**
 * Request context for structured logging of HTTP requests.
 * Provides all metadata needed for request-scoped logging
 * and distributed tracing.
 */
export interface RequestContext {
  /** Correlation ID for distributed tracing across services */
  correlationId: string;
  /** Unique identifier for this specific request */
  requestId: string;
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method: string;
  /** Request path (URL pathname) */
  path: string;
  /** Client IP address */
  ip: string;
  /** User-Agent header value, if present */
  userAgent?: string;
  /** Authenticated user ID, if available */
  userId?: string;
}

/**
 * Logger configuration for controlling log output behavior.
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Whether to format output for human readability (development mode) */
  prettyPrint?: boolean;
  /** JSON paths to redact from log output (e.g., passwords, tokens) */
  redactPaths?: string[];
}
