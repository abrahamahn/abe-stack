// apps/server/src/logger/logger.ts
/**
 * Logger Service
 *
 * Wraps Fastify's pino logger with correlation ID support
 * and consistent structured logging. Only the Fastify-specific
 * bridge lives here; pure utilities are in @abe-stack/shared.
 */

import {
    createLogger as createKernelLogger,
    createRequestLogger as createKernelRequestLogger,
} from '@abe-stack/shared';

import type { Logger, RequestContext } from '@abe-stack/shared';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Create a logger that wraps Fastify's pino logger.
 * Merges optional context data into every log call for structured logging.
 */
export function createLogger(baseLogger: FastifyBaseLogger, context?: Record<string, unknown>): Logger {
  return createKernelLogger(baseLogger as any, context);
}

/**
 * Create a request-scoped logger with correlation ID context.
 */
export function createRequestLogger(
  baseLogger: FastifyBaseLogger,
  requestContext: RequestContext,
): Logger {
  return createKernelRequestLogger(baseLogger as any, requestContext);
}
