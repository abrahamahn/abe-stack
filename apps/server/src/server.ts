// apps/server/src/server.ts
/**
 * Fastify Server Setup
 *
 * Creates and configures the Fastify HTTP server with plugins and core routes.
 * This module handles all Fastify-specific concerns, keeping them separate
 * from the application's DI container and lifecycle management.
 */

import cookie from '@fastify/cookie';
import csrfProtection from '@fastify/csrf-protection';
import { sql } from 'drizzle-orm';
import Fastify from 'fastify';

import { applyCors, applySecurityHeaders, handlePreflight } from './infra/http';
import { RateLimiter } from './infra/rate-limit';

import type { AppConfig } from './config';
import type { DbClient } from './infra';
import type { FastifyInstance } from 'fastify';

// ============================================================================
// Types
// ============================================================================

export interface ServerDependencies {
  config: AppConfig;
  db: DbClient;
}

// ============================================================================
// Server Factory
// ============================================================================

/**
 * Create and configure a Fastify server instance
 */
export async function createServer(deps: ServerDependencies): Promise<FastifyInstance> {
  const { config, db } = deps;
  const isProd = config.env === 'production';

  // Logger configuration
  const loggerConfig = isProd
    ? { level: config.server.logLevel }
    : {
        level: config.server.logLevel,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            singleLine: true,
            ignore: 'pid,hostname',
          },
        },
      };

  const server = Fastify({ logger: loggerConfig });

  // Register plugins
  await registerPlugins(server, config);

  // Register core routes (health check needs db for connectivity test)
  registerCoreRoutes(server, db);

  return server;
}

// ============================================================================
// Plugins & Middleware
// ============================================================================

async function registerPlugins(server: FastifyInstance, config: AppConfig): Promise<void> {
  const isProd = config.env === 'production';

  // Rate limiter instance (Token Bucket algorithm)
  const limiter = new RateLimiter({ windowMs: 60_000, max: 100 });

  // Security headers, CORS, and rate limiting
  server.addHook('onRequest', async (req, res) => {
    // Security headers (replaces @fastify/helmet)
    applySecurityHeaders(res);

    // CORS (replaces @fastify/cors)
    applyCors(req, res, {
      origin: config.server.cors.origin,
      credentials: config.server.cors.credentials,
      allowedMethods: config.server.cors.methods,
    });

    // Handle CORS preflight requests (skip rate limiting for OPTIONS)
    if (handlePreflight(req, res)) {
      return;
    }

    // Rate limiting (replaces @fastify/rate-limit)
    const rateLimitInfo = limiter.check(req.ip);

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

  // Cookies
  await server.register(cookie, {
    secret: config.auth.cookie.secret,
    hook: 'onRequest',
    parseOptions: {},
  });

  // CSRF protection
  await server.register(csrfProtection, {
    cookieOpts: {
      signed: true,
      sameSite: isProd ? 'strict' : 'lax',
      httpOnly: true,
      secure: isProd,
    },
    sessionPlugin: '@fastify/cookie',
  });
}

// ============================================================================
// Core Routes
// ============================================================================

function registerCoreRoutes(server: FastifyInstance, db: DbClient): void {
  // Root route
  server.get('/', {}, () => ({
    message: 'ABE Stack API',
    timestamp: new Date().toISOString(),
  }));

  // API info route
  server.get('/api', {}, () => ({
    message: 'ABE Stack API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }));

  // Health check with database check
  server.get('/health', {}, async () => {
    let dbHealthy = true;

    try {
      await db.execute(sql`SELECT 1`);
    } catch (error) {
      dbHealthy = false;
      server.log.error({ err: error }, 'Database health check failed');
    }

    return {
      status: dbHealthy ? ('ok' as const) : ('degraded' as const),
      database: dbHealthy,
      timestamp: new Date().toISOString(),
    };
  });
}

// ============================================================================
// Port Binding
// ============================================================================

/**
 * Start listening on the configured port with fallback support
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

function isAddrInUse(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: string }).code === 'EADDRINUSE'
  );
}
