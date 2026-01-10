import { buildConnectionString, createDbClient } from '@db/client';
import { createStorage } from '@storage/storageFactory';
import { toStorageConfig } from '@storage/configFromEnv';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { sql } from 'drizzle-orm';
import Fastify, { type FastifyInstance } from 'fastify';

import { registerRoutes } from './routes';

import type { ServerEnv } from '@contracts/env';

/**
 * Create and configure Fastify server
 * This function is pure - it only creates the server without starting it
 * Perfect for testing and dependency injection
 */
type AppInstance = FastifyInstance;

export async function createServer(
  env: ServerEnv,
  connectionString?: string,
): Promise<{
  app: AppInstance;
  db: ReturnType<typeof createDbClient>;
}> {
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
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  });

  await app.register(helmet);

  // Cookie plugin for refresh tokens
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET,
    hook: 'onRequest',
    parseOptions: {},
  });

  // Initialize database connection
  const dbConnectionString = connectionString ?? buildConnectionString(env);
  const db = createDbClient(dbConnectionString);

  // Decorate Fastify instance with db
  app.decorate('db', db);
  app.decorate('storage', createStorage(toStorageConfig(env)));

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
      await app.db.execute(sql`SELECT 1`);
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

  // Register application routes
  registerRoutes(app);

  return { app, db };
}
