// apps/server/src/infrastructure/monitor/logger/logger.ts
/**
 * Logger Service
 *
 * Wraps Fastify's pino logger with correlation ID support
 * and consistent structured logging. Only the Fastify-specific
 * functions live here; pure utilities are in @abe-stack/core.
 */

import type { FastifyBaseLogger } from 'fastify';

import type { LogData, Logger, RequestContext } from './types';

// Re-export pure functions from core (preserved for backward compat)
export {
  createRequestContext,
  generateCorrelationId,
  getOrCreateCorrelationId,
  LOG_LEVELS,
  shouldLog,
} from '@abe-stack/core/infrastructure/logger';

/**
 * Create a logger that wraps Fastify's pino logger.
 * Merges optional context data into every log call for structured logging.
 *
 * @param baseLogger - The Fastify/pino base logger instance
 * @param context - Optional static context to include in all log entries
 * @returns A Logger interface wrapping the base logger
 * @complexity O(1) per log call
 */
export function createLogger(baseLogger: FastifyBaseLogger, context?: LogData): Logger {
  const withContext = (data?: LogData): LogData => ({
    ...context,
    ...data,
  });

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
 * Create a request-scoped logger with correlation ID context.
 * Attaches the correlation and request IDs to every log entry
 * for distributed tracing.
 *
 * @param baseLogger - The Fastify/pino base logger instance
 * @param requestContext - Request context with correlation/request IDs
 * @returns A Logger with request-scoped context bindings
 * @complexity O(1)
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
