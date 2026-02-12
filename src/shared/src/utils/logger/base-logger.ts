// src/shared/src/utils/logger/base-logger.ts
/**
 * Base Logger Adapter
 *
 * Framework-agnostic logger wrapper that adapts any structured logging
 * backend (pino, winston, console, etc.) into the canonical Logger interface.
 * The BaseLogger interface matches pino's call signature (data first, message second)
 * so Fastify loggers can be passed directly.
 */

import type { LogData, Logger, RequestContext } from './types';

/**
 * Minimal interface for a structured logging backend.
 * Matches pino's API where the first argument is a data object
 * and the second is the message string. This allows Fastify's
 * built-in pino logger to be used directly without wrapping.
 *
 * @example
 * ```typescript
 * // Fastify's server.log satisfies this interface
 * const baseLogger: BaseLogger = server.log;
 *
 * // A simple console adapter also works
 * const consoleBase: BaseLogger = {
 *   trace: (data, msg) => console.trace(msg, data),
 *   debug: (data, msg) => console.debug(msg, data),
 *   info: (data, msg) => console.info(msg, data),
 *   warn: (data, msg) => console.warn(msg, data),
 *   error: (data, msg) => console.error(msg, data),
 *   fatal: (data, msg) => console.error('[FATAL]', msg, data),
 *   child: (bindings) => ({ ...consoleBase }),
 * };
 * ```
 */
export interface BaseLogger {
  /** Log at trace level (data-first, pino style) */
  trace(data: LogData, msg: string): void;
  /** Log at debug level (data-first, pino style) */
  debug(data: LogData, msg: string): void;
  /** Log at info level (data-first, pino style) */
  info(data: LogData, msg: string): void;
  /** Log at warn level (data-first, pino style) */
  warn(data: LogData, msg: string): void;
  /** Log at error level (data-first, pino style) */
  error(data: LogData, msg: string): void;
  /** Log at fatal level (data-first, pino style) */
  fatal(data: LogData, msg: string): void;
  /**
   * Create a child logger with additional bindings merged into every log entry.
   * @param bindings - Key-value pairs to attach to all child log entries
   * @returns A new BaseLogger with merged bindings
   */
  child(bindings: LogData): BaseLogger;
}

/**
 * Format an Error or string into structured log data.
 * Extracts message, name, and stack trace from Error objects
 * for consistent structured error logging.
 *
 * @param error - An Error object or plain string
 * @returns Structured log data with error details
 * @complexity O(1)
 */
function formatError(error: Error | string): LogData {
  if (typeof error === 'string') {
    return { error };
  }
  return {
    error: error.message,
    errorName: error.name,
    stack: error.stack,
  };
}

/**
 * Create a Logger that wraps a BaseLogger backend.
 * Merges optional static context data into every log call for structured logging.
 * The returned Logger uses the canonical interface (message-first)
 * while delegating to the data-first BaseLogger backend.
 *
 * @param baseLogger - The structured logging backend (pino, etc.)
 * @param context - Optional static context to include in all log entries
 * @returns A Logger interface wrapping the base logger
 * @complexity O(1) per log call
 *
 * @example
 * ```typescript
 * const logger = createLogger(server.log, { service: 'auth' });
 * logger.info('User logged in', { userId: '123' });
 * // Produces: { service: 'auth', userId: '123' } "User logged in"
 * ```
 */
export function createLogger(baseLogger: BaseLogger, context?: LogData): Logger {
  const withContext = (data?: LogData): LogData => ({
    ...context,
    ...data,
  });

  const logger: Logger = {
    trace(msgOrData: string | LogData, dataOrMsg?: LogData | string): void {
      if (typeof msgOrData === 'string') {
        baseLogger.trace(
          withContext(typeof dataOrMsg === 'string' ? undefined : (dataOrMsg as LogData)),
          msgOrData,
        );
        return;
      }
      baseLogger.trace(withContext(msgOrData), (dataOrMsg as string | undefined) ?? '');
    },

    debug(msgOrData: string | LogData, dataOrMsg?: LogData | string): void {
      if (typeof msgOrData === 'string') {
        baseLogger.debug(
          withContext(typeof dataOrMsg === 'string' ? undefined : (dataOrMsg as LogData)),
          msgOrData,
        );
        return;
      }
      baseLogger.debug(withContext(msgOrData), (dataOrMsg as string | undefined) ?? '');
    },

    info(msgOrData: string | LogData, dataOrMsg?: LogData | string): void {
      if (typeof msgOrData === 'string') {
        baseLogger.info(
          withContext(typeof dataOrMsg === 'string' ? undefined : (dataOrMsg as LogData)),
          msgOrData,
        );
        return;
      }
      baseLogger.info(withContext(msgOrData), (dataOrMsg as string | undefined) ?? '');
    },

    warn(msgOrData: string | LogData, dataOrMsg?: LogData | string): void {
      if (typeof msgOrData === 'string') {
        baseLogger.warn(
          withContext(typeof dataOrMsg === 'string' ? undefined : (dataOrMsg as LogData)),
          msgOrData,
        );
        return;
      }
      baseLogger.warn(withContext(msgOrData), (dataOrMsg as string | undefined) ?? '');
    },

    error(msgOrData: string | Error | LogData, dataOrMsg?: LogData | string): void {
      if (msgOrData instanceof Error) {
        baseLogger.error(
          withContext({
            ...formatError(msgOrData),
            ...(typeof dataOrMsg === 'string' ? undefined : dataOrMsg),
          }),
          msgOrData.message,
        );
        return;
      }
      if (typeof msgOrData === 'string') {
        baseLogger.error(
          withContext(typeof dataOrMsg === 'string' ? undefined : (dataOrMsg as LogData)),
          msgOrData,
        );
        return;
      }
      baseLogger.error(withContext(msgOrData), (dataOrMsg as string | undefined) ?? '');
    },

    fatal(msgOrData: string | Error | LogData, dataOrMsg?: LogData | string): void {
      if (msgOrData instanceof Error) {
        baseLogger.fatal(
          withContext({
            ...formatError(msgOrData),
            ...(typeof dataOrMsg === 'string' ? undefined : dataOrMsg),
          }),
          msgOrData.message,
        );
        return;
      }
      if (typeof msgOrData === 'string') {
        baseLogger.fatal(
          withContext(typeof dataOrMsg === 'string' ? undefined : (dataOrMsg as LogData)),
          msgOrData,
        );
        return;
      }
      baseLogger.fatal(withContext(msgOrData), (dataOrMsg as string | undefined) ?? '');
    },

    child(bindings: LogData): Logger {
      return createLogger(baseLogger.child(bindings), { ...context, ...bindings });
    },
  };

  return logger;
}

/**
 * Create a request-scoped logger with correlation ID context.
 * Attaches the correlation and request IDs to every log entry
 * for distributed tracing.
 *
 * @param baseLogger - The structured logging backend (pino, etc.)
 * @param requestContext - Request context with correlation/request IDs
 * @returns A Logger with request-scoped context bindings
 * @complexity O(1)
 *
 * @example
 * ```typescript
 * const logger = createRequestLogger(server.log, {
 *   correlationId: 'abc-123',
 *   requestId: 'req-456',
 *   method: 'GET',
 *   path: '/api/users',
 *   ip: '127.0.0.1',
 * });
 * logger.info('Processing request'); // includes correlationId, requestId
 * ```
 */
export function createRequestLogger(
  baseLogger: BaseLogger,
  requestContext: RequestContext,
): Logger {
  return createLogger(baseLogger, {
    correlationId: requestContext.correlationId,
    requestId: requestContext.requestId,
  });
}

/**
 * Generate a new correlation ID for background jobs or events.
 * Prefixes the UUID with the job name for easy identification in logs.
 *
 * @param jobName - The name of the background job
 * @returns A correlation ID in the format "job:{jobName}:{uuid}"
 * @complexity O(1)
 *
 * @example
 * ```typescript
 * const id = createJobCorrelationId('email-sender');
 * // Returns: "job:email-sender:550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function createJobCorrelationId(jobName: string): string {
  return `job:${jobName}:${crypto.randomUUID()}`;
}

/**
 * Create a logger for background jobs.
 * Uses a job-specific correlation ID and the "JOB" method marker
 * for distinguishing job logs from request logs.
 *
 * @param baseLogger - The structured logging backend (pino, etc.)
 * @param jobName - The name of the background job
 * @param jobId - Optional specific job ID (auto-generated if not provided)
 * @returns A Logger instance with job context bindings
 * @complexity O(1)
 *
 * @example
 * ```typescript
 * const logger = createJobLogger(server.log, 'email-sender');
 * logger.info('Sending email', { to: 'user@example.com' });
 * // Logs include: correlationId="job:email-sender:...", method="JOB", path="email-sender"
 * ```
 */
export function createJobLogger(baseLogger: BaseLogger, jobName: string, jobId?: string): Logger {
  const correlationId = jobId ?? createJobCorrelationId(jobName);
  return createRequestLogger(baseLogger, {
    correlationId,
    requestId: correlationId,
    method: 'JOB',
    path: jobName,
    ip: 'internal',
  });
}
