/**
 * ServerEnvironment - Single source of all server-side dependencies
 *
 * This pattern is inspired by chet-stack. Instead of decorating Fastify
 * with multiple individual services (db, storage, etc.), we create a single
 * environment object that contains everything and pass it explicitly.
 *
 * Benefits:
 * - Explicit dependencies (no magic)
 * - Easy to test (just mock the environment)
 * - Single place to understand all server dependencies
 * - Prepared for WebSocket PubSub and Job Queue (Phase 4 & 6)
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// Import schema type - will be available after package merge
import type * as schema from '../db/schema';

/**
 * Server configuration - validated at startup
 */
export type ServerConfig = {
  /** Server port */
  port: number;
  /** Server host */
  host: string;
  /** Cookie secret for session signing */
  cookieSecret: string;
  /** Session max age in milliseconds (default: 7 days) */
  sessionMaxAge: number;
  /** Environment mode */
  env: 'development' | 'production' | 'test';
  /** CORS origin configuration */
  corsOrigin: string | boolean;
  /** Database connection string */
  databaseUrl: string;
};

/**
 * Storage provider interface (matches existing storage package)
 */
export interface StorageProvider {
  upload(params: {
    key: string;
    contentType: string;
    body: Buffer | Uint8Array | string;
  }): Promise<{ key: string }>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

/**
 * PubSub server interface (Phase 4)
 * Placeholder for WebSocket-based publish/subscribe
 */
export interface PubsubServer {
  publish(channel: string, message: unknown): void;
  // Additional methods will be added in Phase 4
}

/**
 * Queue server interface (Phase 6)
 * Placeholder for background job processing
 */
export interface QueueServer {
  enqueue(jobName: string, data: unknown): Promise<string>;
  // Additional methods will be added in Phase 6
}

/**
 * The main ServerEnvironment type
 * This single object contains all server dependencies
 */
export type ServerEnvironment = {
  /** Server configuration */
  config: ServerConfig;
  /** Database client (Drizzle ORM) */
  db: PostgresJsDatabase<typeof schema>;
  /** Storage provider (local or S3) */
  storage: StorageProvider;
  /** PubSub server for real-time updates (Phase 4, null until implemented) */
  pubsub: PubsubServer | null;
  /** Queue server for background jobs (Phase 6, null until implemented) */
  queue: QueueServer | null;
};

/**
 * Create a ServerEnvironment instance
 *
 * @example
 * ```typescript
 * const env = createServerEnvironment(config, db, storage)
 * app.decorate('env', env)
 *
 * // In route handlers:
 * const user = await env.db.query.users.findFirst(...)
 * await env.storage.upload({ key, contentType, body })
 * ```
 */
export function createServerEnvironment(
  config: ServerConfig,
  db: PostgresJsDatabase<typeof schema>,
  storage: StorageProvider,
): ServerEnvironment {
  return {
    config,
    db,
    storage,
    pubsub: null, // Will be set in Phase 4
    queue: null, // Will be set in Phase 6
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_SERVER_CONFIG: Partial<ServerConfig> = {
  port: 8080,
  host: '0.0.0.0',
  sessionMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  env: 'development',
  corsOrigin: true,
};

/**
 * Create ServerConfig from environment variables
 */
export function createServerConfigFromEnv(
  env: Record<string, string | undefined>,
): ServerConfig {
  return {
    port: Number(env.API_PORT || env.PORT || DEFAULT_SERVER_CONFIG.port),
    host: env.HOST || (DEFAULT_SERVER_CONFIG.host as string),
    cookieSecret: env.COOKIE_SECRET || env.JWT_SECRET || 'default-dev-secret',
    sessionMaxAge:
      Number(env.SESSION_MAX_AGE) || (DEFAULT_SERVER_CONFIG.sessionMaxAge as number),
    env: (env.NODE_ENV as ServerConfig['env']) || 'development',
    corsOrigin: env.CORS_ORIGIN || (DEFAULT_SERVER_CONFIG.corsOrigin as boolean),
    databaseUrl: env.DATABASE_URL || '',
  };
}
