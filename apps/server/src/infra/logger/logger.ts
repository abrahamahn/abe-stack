// apps/server/src/infra/logger/logger.ts
/**
 * Logger Service
 *
 * Wraps Fastify's pino logger with correlation ID support
 * and consistent structured logging.
 */

import type { FastifyBaseLogger } from 'fastify';

import type { LogData, Logger, LogLevel, RequestContext } from './types';

/**
 * Create a logger that wraps Fastify's pino logger
 */
export function createLogger(baseLogger: FastifyBaseLogger, context?: LogData): Logger {
  // Merge context into all log calls
  const withContext = (data?: LogData): LogData => ({
    ...context,
    ...data,
  });

  // Format error for logging
  const formatError = (error: Error | string): LogData => {
    if (typeof error === 'string') {
      return { error };
    }
    return {
      error: error.message,
      errorName: error.name,
      stack: error.stack,
    };
  };

  const logger: Logger = {
    trace(msg: string, data?: LogData): void {
      baseLogger.trace(withContext(data), msg);
    },

    debug(msg: string, data?: LogData): void {
      baseLogger.debug(withContext(data), msg);
    },

    info(msg: string, data?: LogData): void {
      baseLogger.info(withContext(data), msg);
    },

    warn(msg: string, data?: LogData): void {
      baseLogger.warn(withContext(data), msg);
    },

    error(msg: string | Error, data?: LogData): void {
      if (msg instanceof Error) {
        baseLogger.error(withContext({ ...formatError(msg), ...data }), msg.message);
      } else {
        baseLogger.error(withContext(data), msg);
      }
    },

    fatal(msg: string | Error, data?: LogData): void {
      if (msg instanceof Error) {
        baseLogger.fatal(withContext({ ...formatError(msg), ...data }), msg.message);
      } else {
        baseLogger.fatal(withContext(data), msg);
      }
    },

    child(bindings: LogData): Logger {
      return createLogger(baseLogger.child(bindings), { ...context, ...bindings });
    },
  };

  return logger;
}

/**
 * Create a request-scoped logger with correlation ID
 */
export function createRequestLogger(
  baseLogger: FastifyBaseLogger,
  requestContext: RequestContext,
): Logger {
  return createLogger(baseLogger, {
    correlationId: requestContext.correlationId,
    requestId: requestContext.requestId,
  });
}

/**
 * Generate a unique correlation ID
 * Uses crypto.randomUUID() for uniqueness
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Extract correlation ID from headers or generate a new one
 */
export function getOrCreateCorrelationId(headers: Record<string, string | undefined>): string {
  const existingId =
    headers['x-correlation-id'] || headers['x-request-id'] || headers['traceparent'];

  if (existingId && typeof existingId === 'string') {
    // If traceparent, extract the trace-id portion
    if (existingId.includes('-')) {
      const parts = existingId.split('-');
      if (parts.length >= 2) {
        return parts[1]; // trace-id is second part of traceparent
      }
    }
    return existingId;
  }

  return generateCorrelationId();
}

/**
 * Create request context from Fastify request
 */
export function createRequestContext(
  correlationId: string,
  request: {
    id: string;
    method: string;
    url: string;
    ip: string;
    headers: Record<string, string | undefined>;
  },
  userId?: string,
): RequestContext {
  return {
    correlationId,
    requestId: request.id,
    method: request.method,
    path: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    userId,
  };
}

/**
 * Log levels in order of severity
 */
export const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

/**
 * Check if a log level should be logged
 */
export function shouldLog(messageLevel: LogLevel, configuredLevel: LogLevel): boolean {
  return LOG_LEVELS[messageLevel] >= LOG_LEVELS[configuredLevel];
}
