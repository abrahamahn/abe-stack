// main/server/system/src/logger/logger.ts
/**
 * Logger Service
 *
 * Wraps a pino-compatible BaseLogger with correlation ID support
 * and consistent structured logging.
 */

import {
  createLogger as createKernelLogger,
  createRequestLogger as createKernelRequestLogger,
} from '@bslt/shared/system';

import type { BaseLogger, Logger, LogRequestContext } from '@bslt/shared/system';

export type { Logger };

/**
 * Create a logger that wraps a pino-compatible BaseLogger.
 * Merges optional context data into every log call for structured logging.
 *
 * @param baseLogger - A pino-compatible logger (Fastify's log, pino instance, etc.)
 * @param context - Optional context to merge into all log calls
 * @returns Logger instance compatible with contracts Logger interface
 */
export function createLogger(baseLogger: BaseLogger, context?: Record<string, unknown>): Logger {
  return createKernelLogger(baseLogger, context);
}

/**
 * Create a request-scoped logger with correlation ID context.
 *
 * @param baseLogger - A pino-compatible logger
 * @param requestContext - Request context with correlation ID
 * @returns Logger instance compatible with contracts Logger interface
 */
export function createRequestLogger(
  baseLogger: BaseLogger,
  requestContext: LogRequestContext,
): Logger {
  return createKernelRequestLogger(baseLogger, requestContext);
}
