// main/apps/server/src/server.ts
/**
 * Fastify Server Factory
 *
 * Responsible for the "HTTP Layer" configuration:
 * - Instantiating Fastify
 * - Registering global plugins (Cors, Helmet, Rate Limit)
 * - Registering the Hybrid Context Hook
 *
 * This module remains agnostic of domain logic, delegating actual route handling
 * to the modules registered in the App lifecycle.
 */

import path from 'node:path';

import { RateLimiter } from '@bslt/server-system';
import { createConsoleLogger } from '@bslt/server-system/logger';
import { ERROR_CODES, isAppError, LIMITS } from '@bslt/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import fastify from 'fastify';

import { registerPlugins, type AppErrorInfo } from './http/plugins';
import { swaggerThemeCss } from './http/swagger-theme';
import { contextualizeRequest } from './middleware/context';
import { registerLoggingMiddleware } from './middleware/logging';

import type { HasContext, IServiceContainer, RequestWithCookies } from './types/context';
import type { DbClient } from '@bslt/db';
import type { AppConfig } from '@bslt/shared/config';
import type { FastifyInstance } from 'fastify';

// ============================================================================
// Types
// ============================================================================

export interface ServerDependencies {
  config: AppConfig;
  db: DbClient;
  app?: IServiceContainer & HasContext;
}

// ============================================================================
// Server Factory
// ============================================================================

/**
 * Create and configure a Fastify server instance.
 *
 * @param deps - Dependencies required for server configuration.
 * @param deps.app - The `App` instance. If provided, the "Hybrid Context" hook is installed,
 *                   attaching `app.context` to every `req`.
 * @returns Configured Fastify instance (ready for `listen`).
 */
export async function createServer(deps: ServerDependencies): Promise<FastifyInstance> {
  const { config, app } = deps;
  const isProd = config.env === 'production';
  const usePrettyJsonLogs = config.server.logging.prettyJson ?? !isProd;

  // Logger configuration
  const loggerConfig = !usePrettyJsonLogs
    ? { level: config.server.logLevel }
    : createConsoleLogger(config.server.logLevel);

  const server = fastify({
    logger: loggerConfig,
    disableRequestLogging: true,
    trustProxy: config.server.trustProxy,
    // Default body size limit for JSON requests (1MB)
    // This helps prevent denial-of-service attacks via large payloads.
    // Note: File upload routes should configure their own higher limits
    // (e.g., 50MB for multipart uploads) on a per-route basis.
    bodyLimit: LIMITS.HTTP_BODY_LIMIT_BYTES,
  });

  // Hybrid Context Hook (2026 Pattern)
  // If app instance is provided, attach context to request
  if (app !== undefined) {
    server.addHook('onRequest', (req, _reply, done) => {
      // In a real async-safe implementation, we might use AsyncLocalStorage here
      // But for Fastify's request scope, direct assignment is safe and explicit.
      (req as unknown as RequestWithCookies).context = app.context;
      done();
    });

    // RLS Contextualization (sets PG session variables for the scoped DB client)
    server.addHook('preHandler', contextualizeRequest);
  }

  // Register plugins (dependency-injected — server owns the config mapping)
  registerPlugins(server, {
    env: config.env,
    clientErrorLevel: config.server.logging.clientErrorLevel as 'debug' | 'info' | 'warn' | 'error',
    corsOrigin: config.server.cors.origin.join(','),
    corsCredentials: config.server.cors.credentials,
    corsMethods: config.server.cors.methods,
    cookieSecret: config.auth.cookie.secret,
    rateLimiter: new RateLimiter(config.server.rateLimit),
    isAppError: (err: unknown) => isAppError(err),
    getErrorInfo: (err: unknown): AppErrorInfo => {
      const e = err as {
        statusCode: number;
        code?: string;
        message: string;
        details?: Record<string, unknown>;
      };
      const info: AppErrorInfo = {
        statusCode: e.statusCode,
        code: e.code ?? ERROR_CODES.INTERNAL_ERROR,
        message: e.message,
      };
      if (e.details !== undefined) {
        info.details = e.details;
      }
      return info;
    },
    ...(config.storage.provider === 'local'
      ? { staticServe: { root: path.resolve(config.storage.rootPath), prefix: '/uploads/' } }
      : {}),
  });

  // Register request logging policy after core hooks are in place.
  // This ensures we reuse correlation IDs from HTTP middleware.
  registerLoggingMiddleware(server, config.server.logging);

  // Register OpenAPI/Swagger documentation
  await server.register(swagger, {
    openapi: {
      info: {
        title: 'BSLT API',
        description: [
          'API documentation for the BSLT application.',
          '',
          '## Authentication',
          'Most endpoints require a Bearer JWT token in the `Authorization` header.',
          'Obtain a token via `POST /api/auth/login` or `POST /api/auth/register`.',
          '',
          '## Rate Limiting',
          'All endpoints enforce rate limits. Response headers:',
          '- `X-RateLimit-Limit` — max requests per window',
          '- `X-RateLimit-Remaining` — requests remaining',
          '- `X-RateLimit-Reset` — window reset time (Unix epoch seconds)',
          '',
          '## Error Format',
          'All errors return a JSON body: `{ "code": "ERROR_CODE", "message": "Human-readable message" }`.',
        ].join('\n'),
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          ApiError: {
            type: 'object',
            properties: {
              code: { type: 'string', description: 'Machine-readable error code' },
              message: { type: 'string', description: 'Human-readable error message' },
              details: {
                type: 'object',
                description: 'Optional field-level validation errors',
                additionalProperties: true,
              },
            },
            required: ['code', 'message'],
          },
        },
      },
    },
  });

  // Swagger UI is available in all environments but auth-protected in non-development
  // environments to reduce attack surface while still allowing authorized users to
  // view the documentation.
  await server.register(swaggerUI, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    theme: {
      title: 'BSLT API',
      css: [{ filename: 'theme.css', content: swaggerThemeCss }],
    },
  });

  // Add auth protection for documentation in non-dev environments
  if (config.env !== 'development') {
    server.addHook('preHandler', async (request, reply) => {
      if (request.url.startsWith('/api/docs')) {
        // Simple check for now: require user to be authenticated
        // In a real production app, you might want to require an 'admin' role
        if (
          (request as unknown as RequestWithCookies).user === undefined &&
          !request.url.includes('/api/docs/static/') &&
          !request.url.endsWith('json') &&
          !request.url.endsWith('yaml')
        ) {
          // Attempt to authenticate via token in cookie if header is missing
          // But for Swagger UI, it's easier to just return 401 if not logged in
          void reply.status(401).send({
            ok: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required to view documentation',
            },
          });
        }
      }
    });
  }

  return server;
}

// ============================================================================
// Port Binding
// ============================================================================

/**
 * Start listening on the configured port.
 *
 * Includes "Port Fallback" logic: if the preferred port is in use,
 * it attempts to bind to the fallback ports defined in config.
 *
 * @param server - Fastify instance
 * @param config - App configuration containing host/port settings
 */
export async function listen(server: FastifyInstance, config: AppConfig): Promise<void> {
  const { host, port, portFallbacks } = config.server;

  // Build unique port list
  const ports = [...new Set([port, ...portFallbacks])];

  for (const p of ports) {
    try {
      await server.listen({ port: p, host });

      if (p !== port) {
        server.log.warn(`Default port ${String(port)} in use. Using fallback port ${String(p)}.`);
      }

      server.log.info(`Server listening on http://${host}:${String(p)}`);
      return;
    } catch (error: unknown) {
      if (isAddrInUse(error)) {
        server.log.warn(`Port ${String(p)} is in use, trying next...`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`No available ports found from: ${ports.join(', ')}`);
}

/**
 * Check if an error indicates address is already in use
 */
export function isAddrInUse(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: string }).code === 'EADDRINUSE'
  );
}
