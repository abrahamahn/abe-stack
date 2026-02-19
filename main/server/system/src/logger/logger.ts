// main/server/system/src/logger/logger.ts
/**
 * Logger Service
 *
 * Wraps Fastify's pino logger with correlation ID support
 * and consistent structured logging. Only the Fastify-specific
 * bridge lives here; pure utilities are in @bslt/shared.
 */

import {
  createLogger as createKernelLogger,
  createRequestLogger as createKernelRequestLogger,
} from '@bslt/shared/system';

import type { BaseLogger, Logger, LogRequestContext } from '@bslt/shared/system';
import type { FastifyBaseLogger } from 'fastify';

export type { Logger };

/**
 * Adapts a Fastify/pino logger to the shared BaseLogger contract.
 *
 * FastifyBaseLogger is structurally identical to BaseLogger (both follow
 * pino's data-first, message-second calling convention). This explicit
 * adapter documents the compatibility contract and replaces the
 * `as unknown as BaseLogger` double-cast anti-pattern.
 */
function adaptFastifyLogger(fl: FastifyBaseLogger): BaseLogger {
  return fl as BaseLogger;
}

/**
 * Create a logger that wraps Fastify's pino logger.
 * Merges optional context data into every log call for structured logging.
 *
 * @param baseLogger - Fastify's pino logger
 * @param context - Optional context to merge into all log calls
 * @returns Logger instance compatible with contracts Logger interface
 */
export function createLogger(
  baseLogger: FastifyBaseLogger,
  context?: Record<string, unknown>,
): Logger {
  return createKernelLogger(adaptFastifyLogger(baseLogger), context);
}

/**
 * Create a request-scoped logger with correlation ID context.
 *
 * @param baseLogger - Fastify's pino logger
 * @param requestContext - Request context with correlation ID
 * @returns Logger instance compatible with contracts Logger interface
 */
export function createRequestLogger(
  baseLogger: FastifyBaseLogger,
  requestContext: LogRequestContext,
): Logger {
  return createKernelRequestLogger(adaptFastifyLogger(baseLogger), requestContext);
}
