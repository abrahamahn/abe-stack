// main/apps/server/src/middleware/logging.ts
/**
 * Logging Middleware
 *
 * Fastify hooks for request logging with correlation IDs.
 * Pure correlation utilities imported from @bslt/shared.
 *
 * Moved from @bslt/server-system to keep Fastify coupling in the app layer.
 */

import {
  createJobLogger as createSharedJobLogger,
  createLogRequestContext,
  getOrCreateCorrelationId,
} from '@bslt/shared/system';

import { createRequestLogger } from '@bslt/server-system/logger';
import { getMetricsCollector } from '@bslt/server-system';

import type { LoggingConfig } from '@bslt/shared/config';
import type { UserRole } from '@bslt/shared/core';
import type { BaseLogger, ErrorTracker, Logger, LogRequestContext } from '@bslt/shared/system';
import type { FastifyInstance, FastifyRequest } from 'fastify';

// Extend Fastify request with our custom properties
declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
    requestContext: LogRequestContext;
    logger: Logger; // Our wrapped logger with correct signature
    user?: {
      userId: string;
      role: UserRole;
      [key: string]: unknown;
    };
  }
}

/**
 * Extends FastifyRequest with an optional DI context holding an error tracker.
 */
type RequestWithContext = FastifyRequest & {
  context?: {
    errorTracker?: ErrorTracker;
  };
};

/**
 * Register correlation ID and request logging middleware.
 * Adds onRequest, onResponse, and onError hooks to the Fastify server
 * for automatic request tracing and structured logging.
 *
 * @param server - The Fastify server instance to add hooks to
 */
export function registerLoggingMiddleware(
  server: FastifyInstance,
  loggingConfig?: LoggingConfig,
): void {
  const metrics = getMetricsCollector();

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
    const requestContext = createLogRequestContext(
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

    // Add breadcrumb for request start
    const req = request as RequestWithContext;
    req.context?.errorTracker?.addBreadcrumb(`Request started: ${request.method} ${request.url}`, {
      category: 'http',
      level: 'info',
      data: {
        id: request.id,
        ip: request.ip,
      },
    });
  });

  // Log request completion with optional request context
  server.addHook('onResponse', async (request, reply) => {
    const duration = reply.elapsedTime;
    const includeContext = loggingConfig?.requestContext !== false;

    // Record metrics
    const routeUrl = request.routeOptions.url ?? request.url;
    metrics.incrementRequestCount(routeUrl, reply.statusCode);
    metrics.recordRequestLatency(routeUrl, duration);

    // Add breadcrumb for request completion
    const req = request as RequestWithContext;
    req.context?.errorTracker?.addBreadcrumb(
      `Request completed: ${request.method} ${request.url}`,
      {
        category: 'http',
        level: reply.statusCode >= 400 ? 'warn' : 'info',
        data: {
          statusCode: reply.statusCode,
          duration,
        },
      },
    );

    const logData: Record<string, unknown> = {
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      duration: Math.round(duration),
    };

    if (includeContext) {
      logData['ip'] = request.ip;
      logData['userAgent'] = request.headers['user-agent'];
    }

    request.logger.info('Request completed', logData);
  });

  // Forward errors to the error tracker.
  // Logging is handled exclusively by setErrorHandler to avoid double-logging.
  server.addHook('onError', async (request, reply, error) => {
    const req = request as RequestWithContext;

    req.context?.errorTracker?.addBreadcrumb(`Request error: ${request.method} ${request.url}`, {
      category: 'http',
      level: 'error',
      data: { statusCode: reply.statusCode, error: error.message },
    });

    if (reply.statusCode >= 500) {
      req.context?.errorTracker?.captureError(error, {
        tags: { method: request.method, path: request.url, statusCode: String(reply.statusCode) },
        extra: { ip: request.ip },
      });
    }
  });
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
  // FastifyBaseLogger is structurally identical to BaseLogger (both pino-style).
  return createSharedJobLogger(baseLogger as BaseLogger, jobName, jobId);
}
