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

import type { RequestContext } from '@abe-stack/shared';
import type { Logger } from '@abe-stack/shared/contracts';
import type { FastifyBaseLogger } from 'fastify';

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
  // FastifyBaseLogger structurally satisfies BaseLogger interface
  // The kernel logger returns utils/Logger which satisfies contracts/Logger
  return createKernelLogger(
    baseLogger as unknown as import('@abe-stack/shared').BaseLogger,
    context,
  ) as Logger;
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
  requestContext: RequestContext,
): Logger {
  // FastifyBaseLogger structurally satisfies BaseLogger interface
  // The kernel logger returns utils/Logger which satisfies contracts/Logger
  return createKernelRequestLogger(
    baseLogger as unknown as import('@abe-stack/shared').BaseLogger,
    requestContext,
  ) as Logger;
}
