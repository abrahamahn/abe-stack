// main/shared/src/system/logger/types.ts
/**
 * Logger Types
 *
 * Framework-agnostic type definitions for structured logging.
 * The canonical Logger interface lives in engine/ports — re-exported here
 * alongside logger-specific types (LogData, LogLevel, LoggerConfig).
 */

import type { Logger } from '../ports';

export type { Logger };

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

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
 * Request context for structured logging of HTTP requests.
 * Provides all metadata needed for request-scoped logging
 * and distributed tracing.
 */
export interface LogRequestContext {
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
