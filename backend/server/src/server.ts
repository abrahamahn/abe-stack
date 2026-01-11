// backend/server/src/server.ts
/**
 * Fastify server creation and configuration
 *
 * This function is pure - it only creates the server without starting it.
 * Perfect for testing and dependency injection.
 */

import { buildConnectionString, createDbClient } from '@db';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import csrfProtection from '@fastify/csrf-protection';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { createStorage, toStorageConfig } from '@storage';
import { sql } from 'drizzle-orm';
import Fastify, { type FastifyInstance } from 'fastify';

import { createEnvironment } from './infra/factory';
import { registerRoutes } from './routes/routes';

import type { ServerEnv } from '@abe-stack/shared';
import type { ServerEnvironment } from './infra/ctx';

type AppInstance = FastifyInstance;

export interface CreateServerResult {
  app: AppInstance;
  env: ServerEnvironment;
  /** @deprecated Use env.db instead */
  db: ReturnType<typeof createDbClient>;
}

/**
 * Create and configure Fastify server with ServerEnvironment
 *
 * The ServerEnvironment is the central dependency container that provides:
 * - Database client
 * - Storage provider
 * - Email service
 * - Security utilities
 * - Auth configuration
 */
export async function createServer(
  serverEnv: ServerEnv,
  connectionString?: string,
): Promise<CreateServerResult> {
  const isProd = process.env.NODE_ENV === 'production';

  const loggerConfig = isProd
    ? {
        level: process.env.LOG_LEVEL || 'info',
      }
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

  const app: AppInstance = Fastify({
    logger: loggerConfig,
  });

  // Register plugins
  // CORS configuration - strict by default, allowing only specified origins
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  await app.register(helmet);

  // Rate limiting - global default, can be overridden per route
  await app.register(rateLimit, {
    global: false, // We'll apply rate limiting selectively
    max: 100,
    timeWindow: '1 minute',
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
  });

  // Cookie plugin for refresh tokens
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET,
    hook: 'onRequest',
    parseOptions: {},
  });

  // CSRF protection - uses double-submit cookie pattern
  // Note: For API-first architecture, this provides defense-in-depth
  // Works with SameSite cookies for additional protection
  await app.register(csrfProtection, {
    cookieOpts: {
      signed: true,
      sameSite: isProd ? 'strict' : 'lax',
      httpOnly: true,
      secure: isProd,
    },
    sessionPlugin: '@fastify/cookie',
  });

  // Initialize database connection
  const dbConnectionString = connectionString ?? buildConnectionString(serverEnv);
  const db = createDbClient(dbConnectionString);

  // Create ServerEnvironment - the central dependency container
  // This replaces direct imports of singletons
  const env = await createEnvironment({
    env: serverEnv,
    connectionString: dbConnectionString,
    db,
  });

  // Decorate Fastify instance for legacy compatibility
  // New code should use env.db and env.storage instead
  app.decorate('db', db);
  app.decorate('storage', createStorage(toStorageConfig(serverEnv)));

  // Root route
  app.get('/', {}, () => ({
    message: 'ABE Stack API',
    timestamp: new Date().toISOString(),
  }));

  // API route
  app.get('/api', {}, () => ({
    message: 'ABE Stack API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }));

  // Health check route with database check
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

  // Register application routes with ServerEnvironment
  // All handlers receive the environment via closure
  registerRoutes(app, env);

  // NOTE: Rate limiting is implemented through login attempt tracking and account lockout
  // in the security module (infra/security). This provides fine-grained control per email/IP
  // and includes progressive delays and lockout mechanisms.
  // The @fastify/rate-limit plugin is registered for future use if needed for global limits.

  return { app, env, db };
}
