// main/apps/server/src/http/plugins.ts
/**
 * HTTP Plugin Registration
 *
 * Registers all HTTP middleware and plugins on a Fastify instance.
 * Dependencies (rate limiter, config, error handling) are injected as parameters
 * to keep this package decoupled from server-specific implementations.
 *
 * @example
 * ```typescript
 * registerPlugins(server, {
 *   env: 'production',
 *   corsOrigin: 'https://example.com',
 *   corsCredentials: true,
 *   corsMethods: ['GET', 'POST'],
 *   cookieSecret: config.auth.cookie.secret,
 *   rateLimiter: new RateLimiter({ windowMs: 60_000, max: 100 }),
 *   isAppError: (err) => err instanceof AppError,
 *   getErrorInfo: (err) => ({ statusCode: err.statusCode, code: err.code, message: err.message }),
 *   staticServe: { root: '/uploads', prefix: '/uploads/' },
 * });
 * ```
 */

import { ERROR_CODES, HTTP_STATUS } from '@abe-stack/shared';
import compress from '@fastify/compress';

import {
  applyApiCacheHeaders,
  applyCors,
  applySecurityHeaders,
  getProductionSecurityDefaults,
  handlePreflight,
  registerCookies,
  registerCorrelationIdHook,
  registerCsrf,
  registerMultipartFormParser,
  registerPrototypePollutionProtection,
  registerRequestInfoHook,
  registerStaticServe,
} from './middleware';

import type { AppErrorInfo, ApiErrorResponse, RateLimitInfo } from '@abe-stack/shared';
export type { AppErrorInfo, ApiErrorResponse, RateLimitInfo };
import type { FastifyInstance } from 'fastify';

// ============================================================================
// Types
// ============================================================================

/**
 * Rate limiter interface for dependency injection.
 * Compatible with @abe-stack/db RateLimiter or any implementation
 * that provides a `check` method returning rate limit info.
 */
export interface RateLimiterLike {
  /** Check if a request from the given IP is allowed */
  check(ip: string): Promise<RateLimitInfo>;
}

/**
 * Static file serving configuration (optional)
 */
export interface StaticServeConfig {
  /** Root directory path for static files */
  root: string;
  /** URL prefix for static file routes */
  prefix: string;
}

/**
 * Plugin registration options.
 * All server-specific dependencies are injected through this options object
 * to keep the HTTP package decoupled from the server implementation.
 */
export interface PluginOptions {
  /** Environment mode ('development' | 'production' | 'test') */
  env: string;

  /** CORS allowed origin(s), comma-separated or '*' */
  corsOrigin: string;
  /** Whether to allow credentials in CORS */
  corsCredentials: boolean;
  /** Allowed HTTP methods for CORS */
  corsMethods: string[];

  /** Secret for cookie signing */
  cookieSecret: string;

  /** Rate limiter instance (injected to avoid coupling to specific implementation) */
  rateLimiter: RateLimiterLike;

  /**
   * Type guard to check if an error is an application error.
   * Returns true if the error has structured status/code/message.
   *
   * @param error - The error to check
   * @returns True if the error is a structured application error
   */
  isAppError: (error: unknown) => boolean;

  /**
   * Extract structured error info from an application error.
   * Only called when `isAppError` returns true.
   *
   * @param error - The application error
   * @returns Structured error information
   */
  getErrorInfo: (error: unknown) => AppErrorInfo;

  /** Severity level for 4xx client errors in global error handler */
  clientErrorLevel?: 'debug' | 'info' | 'warn' | 'error';

  /** Static file serving configuration (omit to disable) */
  staticServe?: StaticServeConfig;
}

// ============================================================================
// Plugin Registration
// ============================================================================

/**
 * Register all HTTP plugins and middleware on a Fastify instance.
 *
 * Middleware registration order (security-critical):
 * 1. Prototype pollution protection (sanitizes all JSON input)
 * 2. Correlation ID (adds unique request identifiers)
 * 3. Request info extraction (IP address, user agent)
 * 4. Security headers, CORS, and rate limiting
 * 5. Cookie support
 * 6. CSRF protection
 * 7. Global error handler
 * 8. Static file serving (optional)
 *
 * @param server - The Fastify instance to register plugins on
 * @param options - Plugin configuration with injected dependencies
 */
export function registerPlugins(server: FastifyInstance, options: PluginOptions): void {
  const {
    env,
    corsOrigin,
    corsCredentials,
    corsMethods,
    cookieSecret,
    rateLimiter,
    isAppError,
    getErrorInfo,
    clientErrorLevel,
    staticServe,
  } = options;

  const isProd = env === 'production';

  // 0. HTTP response compression (gzip/brotli/deflate)
  // Registered early so all responses are compressed
  void server.register(compress, { global: true });

  // 1. Prototype pollution protection - must be registered first to sanitize all JSON input
  // This replaces the default JSON parser with one that strips dangerous keys
  // (__proto__, constructor, prototype) to prevent prototype pollution attacks
  registerPrototypePollutionProtection(server);

  // 1.5 Multipart form-data parsing for upload endpoints.
  // Normalizes uploaded file payloads to { buffer, mimetype, filename, size }.
  registerMultipartFormParser(server);

  // 2. Correlation ID - adds unique request identifiers for distributed tracing
  // Extracts from x-correlation-id header or generates a new UUID
  registerCorrelationIdHook(server);

  // 3. Request info extraction - decorates all requests with ipAddress and userAgent
  registerRequestInfoHook(server);

  // 4. Security headers, CORS, and rate limiting
  server.addHook('onRequest', async (req, res) => {
    // Security headers (replaces @fastify/helmet)
    // Use stricter defaults (including CSP) in production
    applySecurityHeaders(res, isProd ? getProductionSecurityDefaults() : {});

    // Prevent caching of API responses (back-button data leak protection)
    if (typeof req.url === 'string' && req.url.startsWith('/api/')) {
      applyApiCacheHeaders(res);
    }

    // CORS (replaces @fastify/cors)
    applyCors(req, res, {
      origin: corsOrigin,
      credentials: corsCredentials,
      allowedMethods: corsMethods,
    });

    // Handle CORS preflight requests (skip rate limiting for OPTIONS)
    if (handlePreflight(req, res)) {
      return;
    }

    // Rate limiting (replaces @fastify/rate-limit)
    const rateLimitInfo = await rateLimiter.check(req.ip);

    // Set rate limit headers
    res.header('X-RateLimit-Limit', String(rateLimitInfo.limit));
    res.header('X-RateLimit-Remaining', String(rateLimitInfo.remaining));
    res.header('X-RateLimit-Reset', String(Math.ceil(rateLimitInfo.resetMs / 1000)));

    if (!rateLimitInfo.allowed) {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).send({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(rateLimitInfo.resetMs / 1000),
      });
      return;
    }
  });

  // 5. Cookies (manual implementation)
  registerCookies(server, {
    secret: cookieSecret,
  });

  // 6. Enhanced CSRF protection with encrypted tokens in production
  registerCsrf(server, {
    secret: cookieSecret,
    encrypted: isProd, // Use AES-256-GCM encryption in production
    cookieOpts: {
      signed: true,
      sameSite: isProd ? 'strict' : 'lax',
      httpOnly: true,
      secure: isProd,
    },
  });

  // CSRF token bootstrap endpoint for browser clients.
  // Returns the request token and sets the signed/encrypted CSRF cookie.
  server.get('/api/csrf-token', async (_req, reply) => {
    const token = reply.generateCsrf();
    return { token };
  });

  // 7. Global error handler
  server.setErrorHandler((error, request, reply) => {
    // Get correlation ID for error tracking (set by registerCorrelationIdHook)
    const correlationId = request.correlationId;

    // Severity-based server-side logging
    // Determine status early for logging (before full error classification below)
    const errStatusCode =
      (error as { statusCode?: number }).statusCode ??
      (isAppError(error) ? getErrorInfo(error).statusCode : 500);
    if (errStatusCode >= 500) {
      server.log.error({ err: error, correlationId }, 'Request error');
    } else {
      const logLevel = clientErrorLevel ?? 'warn';
      server.log[logLevel](
        {
          code: (error as { code?: string }).code,
          message: (error as Error).message,
          statusCode: errStatusCode,
          correlationId,
        },
        'Client error',
      );
    }

    let statusCode = 500;
    let code: string = ERROR_CODES.INTERNAL_ERROR;
    let message = 'Internal server error';
    let details: Record<string, unknown> | undefined;

    if (isAppError(error)) {
      const info = getErrorInfo(error);
      statusCode = info.statusCode;
      code = info.code;
      message = info.message;
      details = info.details;
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

    const errorPayload: {
      code: string;
      message: string;
      details?: Record<string, unknown>;
      correlationId: string | undefined;
    } = {
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

  // 8. Static file serving (only if configured)
  if (staticServe !== undefined) {
    registerStaticServe(server, {
      root: staticServe.root,
      prefix: staticServe.prefix,
    });
  }
}
