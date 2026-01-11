// backend/server/src/server.ts
/**
 * Fastify Server Factory
 *
 * Creates and configures the Fastify server instance.
 * Receives ServerEnvironment (DI container) from the caller.
 */

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import csrfProtection from '@fastify/csrf-protection';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { sql } from 'drizzle-orm';
import Fastify, { type FastifyInstance } from 'fastify';

import { registerRoutes } from './routes/routes';

import type { ServerEnvironment } from './env';

// ============================================================================
// Types
// ============================================================================

export interface CreateServerResult {
  app: FastifyInstance;
  env: ServerEnvironment;
}

// ============================================================================
// Server Factory
// ============================================================================

export async function createServer(env: ServerEnvironment): Promise<CreateServerResult> {
  const { isProduction } = env.config;

  // Logger configuration
  const loggerConfig = isProduction
    ? { level: process.env.LOG_LEVEL || 'info' }
    : {
        level: process.env.LOG_LEVEL || 'info',
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

  // Create Fastify instance
  const app = Fastify({ logger: loggerConfig });

  // ============================================================================
  // Register Plugins
  // ============================================================================

  // CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  // Security headers
  await app.register(helmet);

  // Rate limiting (global default)
  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
  });

  // Cookies for refresh tokens
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET,
    hook: 'onRequest',
    parseOptions: {},
  });

  // CSRF protection
  await app.register(csrfProtection, {
    cookieOpts: {
      signed: true,
      sameSite: isProduction ? 'strict' : 'lax',
      httpOnly: true,
      secure: isProduction,
    },
    sessionPlugin: '@fastify/cookie',
  });

  // ============================================================================
  // Decorate for Legacy Compatibility
  // ============================================================================

  app.decorate('db', env.db);
  app.decorate('storage', env.storage);

  // ============================================================================
  // Core Routes
  // ============================================================================

  app.get('/', {}, () => ({
    message: 'ABE Stack API',
    timestamp: new Date().toISOString(),
  }));

  app.get('/api', {}, () => ({
    message: 'ABE Stack API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }));

  app.get('/health', {}, async () => {
    let dbHealthy = true;
    try {
      await env.db.execute(sql`SELECT 1`);
    } catch (error) {
      dbHealthy = false;
      app.log.error({ err: error }, 'Database health check failed');
    }
    return {
      status: dbHealthy ? ('ok' as const) : ('degraded' as const),
      database: dbHealthy,
      timestamp: new Date().toISOString(),
    };
  });

  // ============================================================================
  // Application Routes
  // ============================================================================

  registerRoutes(app, env);

  return { app, env };
}
