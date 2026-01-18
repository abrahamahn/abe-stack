// apps/server/src/infra/logger/middleware.ts
/**
 * Logging Middleware
 *
 * Fastify hooks for request logging with correlation IDs.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  createRequestContext,
  createRequestLogger,
  generateCorrelationId,
  getOrCreateCorrelationId,
} from './logger';

import type { Logger, RequestContext } from './types';

// Extend Fastify request with our custom properties
declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
    requestContext: RequestContext;
    log: Logger;
  }
}

/**
 * Register correlation ID and request logging middleware
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
    request.log = createRequestLogger(server.log, requestContext);
  });

  // Log request completion
  server.addHook('onResponse', async (request, reply) => {
    const duration = reply.elapsedTime;

    request.log.info('Request completed', {
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      duration: Math.round(duration),
    });
  });

  // Log errors
  server.addHook('onError', async (request, reply, error) => {
    request.log.error(error, {
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
    });
  });
}

/**
 * Generate a new correlation ID for background jobs or events
 */
export function createJobCorrelationId(jobName: string): string {
  return `job:${jobName}:${generateCorrelationId()}`;
}

/**
 * Create a logger for background jobs
 */
export function createJobLogger(
  baseLogger: FastifyInstance['log'],
  jobName: string,
  jobId?: string,
): Logger {
  const correlationId = jobId || createJobCorrelationId(jobName);
  return createRequestLogger(baseLogger, {
    correlationId,
    requestId: correlationId,
    method: 'JOB',
    path: jobName,
    ip: 'internal',
  });
}
