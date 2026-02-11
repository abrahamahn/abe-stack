// src/apps/server/src/logger/middleware.ts
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
} from '@abe-stack/shared';

import { createRequestLogger } from './logger';

import type { RequestContext } from '@abe-stack/shared';
import type { LoggingConfig } from '@abe-stack/shared/config';
import type { Logger } from '@abe-stack/shared/core';
import type { FastifyInstance } from 'fastify';

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
export function registerLoggingMiddleware(
  server: FastifyInstance,
  loggingConfig?: LoggingConfig,
): void {
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

  // Log request completion with optional request context
  server.addHook('onResponse', async (request, reply) => {
    const duration = reply.elapsedTime;
    const includeContext = loggingConfig?.requestContext !== false;

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

  // Log errors with severity-based routing
  server.addHook('onError', async (request, reply, error) => {
    const statusCode = reply.statusCode;
    const method = request.method;
    const path = request.url;

    if (statusCode >= 500) {
      // 5xx: error level with full error object + request context
      request.logger.error(error, {
        method,
        path,
        statusCode,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } else {
      // 4xx: configurable level with summary only (no stack trace)
      const level = loggingConfig?.clientErrorLevel ?? 'warn';
      const clientErrorLevel: 'info' | 'warn' | 'error' | 'debug' =
        level === 'info' || level === 'warn' || level === 'error' || level === 'debug' ? level : 'warn';
      const code = (error as { code?: string }).code;
      request.logger[clientErrorLevel]('Client error', {
        method,
        path,
        statusCode,
        code,
        message: error.message,
        correlationId: request.correlationId,
      });
    }
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
