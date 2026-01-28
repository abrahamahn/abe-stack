// apps/server/src/infrastructure/http/plugins.ts

import path from 'node:path';

import { isAppError, type ApiErrorResponse } from '@abe-stack/core/infrastructure/errors';
import { RateLimiter } from '@security/rate-limit';

import {
    applyCors,
    applySecurityHeaders,
    getProductionSecurityDefaults,
    handlePreflight,
    registerCookies,
    registerCorrelationIdHook,
    registerCsrf,
    registerPrototypePollutionProtection,
    registerRequestInfoHook,
    registerStaticServe,
} from './middleware';

import type { AppConfig } from '@/config/index';
import type { FastifyInstance } from 'fastify';



/**
 * Register all application plugins and middleware
 */
export function registerPlugins(server: FastifyInstance, config: AppConfig): void {
  const isProd = config.env === 'production';

  // Prototype pollution protection - must be registered first to sanitize all JSON input
  // This replaces the default JSON parser with one that strips dangerous keys
  // (__proto__, constructor, prototype) to prevent prototype pollution attacks
  registerPrototypePollutionProtection(server);

  // Correlation ID - adds unique request identifiers for distributed tracing
  // Extracts from x-correlation-id header or generates a new UUID
  // Makes debugging and log correlation easier across services
  registerCorrelationIdHook(server);

  // Request info extraction - decorates all requests with ipAddress and userAgent
  // This centralizes client info extraction that was previously done in individual handlers
  registerRequestInfoHook(server);

  if (!isProd) {
    server.addHook('onRequest', (request, _reply, done) => {
      (request as { _startAt?: bigint })._startAt = process.hrtime.bigint();
      done();
    });

    server.addHook('onResponse', (request, reply, done) => {
      const start = (request as { _startAt?: bigint })._startAt;
      const durationMs = start != null
        ? Number(process.hrtime.bigint() - start) / 1_000_000
        : reply.elapsedTime;
      server.log.info(
        {
          method: request.method,
          path: request.url,
          statusCode: reply.statusCode,
          durationMs: Math.round(durationMs),
          ip: request.ip,
          correlationId: request.correlationId,
        },
        'request',
      );
      done();
    });
  }

  // Rate limiter instance (Token Bucket algorithm)
  const limiter = new RateLimiter({ windowMs: 60_000, max: 100 });

  // Security headers, CORS, and rate limiting
  server.addHook('onRequest', async (req, res) => {
    // Security headers (replaces @fastify/helmet)
    // Use stricter defaults (including CSP) in production
    applySecurityHeaders(res, isProd ? getProductionSecurityDefaults() : {});

    // CORS (replaces @fastify/cors)
    applyCors(req, res, {
      origin: config.server.cors.origin.join(','),
      credentials: config.server.cors.credentials,
      allowedMethods: config.server.cors.methods,
    });

    // Handle CORS preflight requests (skip rate limiting for OPTIONS)
    if (handlePreflight(req, res)) {
      return;
    }

    // Rate limiting (replaces @fastify/rate-limit)
    const rateLimitInfo = await limiter.check(req.ip);

    // Set rate limit headers
    res.header('X-RateLimit-Limit', String(rateLimitInfo.limit));
    res.header('X-RateLimit-Remaining', String(rateLimitInfo.remaining));
    res.header('X-RateLimit-Reset', String(Math.ceil(rateLimitInfo.resetMs / 1000)));

    if (!rateLimitInfo.allowed) {
      res.status(429).send({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(rateLimitInfo.resetMs / 1000),
      });
      return;
    }
  });

  // Cookies (manual implementation)
  registerCookies(server, {
    secret: config.auth.cookie.secret,
  });

  // Enhanced CSRF protection with encrypted tokens in production
  registerCsrf(server, {
    secret: config.auth.cookie.secret,
    encrypted: isProd, // Use AES-256-GCM encryption in production
    cookieOpts: {
      signed: true,
      sameSite: isProd ? 'strict' : 'lax',
      httpOnly: true,
      secure: isProd,
    },
  });

  // Global error handler
  server.setErrorHandler((error, request, reply) => {
    // Get correlation ID for error tracking (set by registerCorrelationIdHook)
    const correlationId = request.correlationId;

    // Always log the full error server-side for debugging with correlation ID
    server.log.error({ err: error, correlationId }, 'Request error');

    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: Record<string, unknown> | undefined;

    if (isAppError(error)) {
      statusCode = error.statusCode;
      code = error.code ?? 'INTERNAL_ERROR';
      message = error.message;
      details = error.details;
    } else if (error instanceof Error) {
      message = error.message;
      // Check for Fastify error properties
      const fastifyError = error as Error & { statusCode?: number; code?: string };
      if (typeof fastifyError.statusCode === 'number') {
        statusCode = fastifyError.statusCode;
      }
      if (typeof fastifyError.code === 'string') {
        code = fastifyError.code;
      }
    }

    // In production, sanitize error messages for 5xx errors to avoid leaking
    // sensitive information (stack traces, internal paths, database details, etc.)
    // 4xx errors are typically client errors and safe to return as-is.
    if (isProd && statusCode >= 500) {
      message = 'An internal error occurred. Please try again later.';
      details = undefined; // Never leak internal details in production
    }

    const errorPayload: { code: string; message: string; details?: Record<string, unknown>; correlationId: string } = {
      code,
      message,
      correlationId,
    };
    if (details !== undefined) {
      errorPayload.details = details;
    }
    const response: ApiErrorResponse = {
      ok: false,
      error: errorPayload,
    };

    void reply.status(statusCode).send(response);
  });

  // Static file serving (only if using local storage)
  if (config.storage.provider === 'local') {
    const rootPath = path.resolve(config.storage.rootPath);
    registerStaticServe(server, {
      root: rootPath,
      prefix: '/uploads/',
    });
  }
}
