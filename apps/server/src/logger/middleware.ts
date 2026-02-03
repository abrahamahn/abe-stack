// apps/server/src/logger/middleware.ts
/**
 * Logging Middleware
 *
 * Fastify hooks for request logging with correlation IDs.
 * Pure correlation utilities imported from @abe-stack/shared.
 */

import {
    createRequestContext,
    generateCorrelationId,
    getOrCreateCorrelationId,
} from '../../../../shared/src/infrastructure/http/logger';

import { createRequestLogger } from './logger';

import type { FastifyInstance } from 'fastify';
import type { Logger, RequestContext } from '../../../../shared/src/infrastructure/http/logger';

// Extend Fastify request with our custom properties
declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
    requestContext: RequestContext;
    logger: Logger; // Our wrapped logger with correct signature
  }
}

/**
 * Register correlation ID and request logging middleware.
 * Adds onRequest, onResponse, and onError hooks to the Fastify server
 * for automatic request tracing and structured logging.
 *
 * @param server - The Fastify server instance to add hooks to
 */
export function registerLoggingMiddleware(server: FastifyInstance): void {
  // Add correlation ID and request logger to each request
  server.addHook('onRequest', async (request, reply) => {
    // Get or create correlation ID
    const correlationId = getOrCreateCorrelationId(
      request.headers as Record<string, string | undefined>,
    );

    // Store on request for access in handlers
    request.correlationId = correlationId;

    // Add correlation ID to response headers
    reply.header('x-correlation-id', correlationId);

    // Create request context
    const requestContext = createRequestContext(
      correlationId,
      {
        id: request.id,
        method: request.method,
        url: request.url,
        ip: request.ip,
        headers: request.headers as Record<string, string | undefined>,
      },
      request.user?.userId,
    );

    request.requestContext = requestContext;

    // Create request-scoped logger
    request.logger = createRequestLogger(server.log, requestContext);
  });

  // Log request completion
  server.addHook('onResponse', async (request, reply) => {
    const duration = reply.elapsedTime;

    request.logger.info('Request completed', {
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      duration: Math.round(duration),
    });
  });

  // Log errors
  server.addHook('onError', async (request, reply, error) => {
    request.logger.error(error, {
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
    });
  });
}

/**
 * Generate a new correlation ID for background jobs or events.
 * Prefixes the UUID with the job name for easy identification in logs.
 *
 * @param jobName - The name of the background job
 * @returns A correlation ID in the format "job:{jobName}:{uuid}"
 * @complexity O(1)
 */
export function createJobCorrelationId(jobName: string): string {
  return `job:${jobName}:${generateCorrelationId()}`;
}

/**
 * Create a logger for background jobs.
 * Uses a job-specific correlation ID and the "JOB" method marker
 * for distinguishing job logs from request logs.
 *
 * @param baseLogger - The Fastify server's base logger
 * @param jobName - The name of the background job
 * @param jobId - Optional specific job ID (auto-generated if not provided)
 * @returns A Logger instance with job context bindings
 * @complexity O(1)
 */
export function createJobLogger(
  baseLogger: FastifyInstance['log'],
  jobName: string,
  jobId?: string,
): Logger {
  const correlationId = jobId ?? createJobCorrelationId(jobName);
  return createRequestLogger(baseLogger, {
    correlationId,
    requestId: correlationId,
    method: 'JOB',
    path: jobName,
    ip: 'internal',
  });
}
