/**
 * ServerEnvironment - Single Entry Point for Server Dependencies
 *
 * This is the server's "composition root". It creates a single object
 * containing all dependencies (db, storage, config) that gets passed
 * explicitly to all route handlers.
 *
 * Benefits:
 * - No magic (explicit dependency passing)
 * - Easy to test (mock the environment)
 * - Single place to understand all server dependencies
 */

import { config, serverConfig, dbConfig, storageConfig } from '../../shared/config';
import { createDbClient, buildConnectionString } from '@db/client';
import { createStorage } from '@storage/storageFactory';

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '@db/schema';
import type { StorageProvider } from '@storage/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Server configuration (derived from global config)
 */
export type ServerConfig = {
  port: number;
  host: string;
  cookieSecret: string;
  corsOrigin: string | boolean;
  env: 'development' | 'production' | 'test';
};

/**
 * The main ServerEnvironment type
 */
export type ServerEnvironment = {
  /** Server configuration */
  config: ServerConfig;
  /** Database client (Drizzle ORM) */
  db: PostgresJsDatabase<typeof schema>;
  /** Storage provider (local or S3) */
  storage: StorageProvider;
  // Future phases:
  // pubsub: PubsubServer | null;  // Phase: Real-time
  // queue: QueueServer | null;    // Phase: Background jobs
};

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create the ServerEnvironment
 *
 * @example
 * ```typescript
 * const env = await createServerEnvironment();
 *
 * // Pass to route handlers
 * app.get('/users', (req, reply) => handleGetUsers(env, req, reply));
 *
 * // In handler
 * function handleGetUsers(env: ServerEnvironment, req, reply) {
 *   const users = await env.db.query.users.findMany();
 *   return users;
 * }
 * ```
 */
export async function createServerEnvironment(): Promise<ServerEnvironment> {
  // Build config from global config
  const serverCfg: ServerConfig = {
    port: serverConfig.port,
    host: serverConfig.host,
    cookieSecret: serverConfig.cookieSecret,
    corsOrigin: serverConfig.corsOrigin,
    env: config.app.env,
  };

  // Build database connection string
  const dbUrl = dbConfig.url || buildConnectionString({
    POSTGRES_HOST: dbConfig.host,
    POSTGRES_PORT: dbConfig.port,
    POSTGRES_DB: dbConfig.database,
    POSTGRES_USER: dbConfig.user,
    POSTGRES_PASSWORD: dbConfig.password,
  });

  // Create database client
  const db = createDbClient(dbUrl);

  // Create storage provider
  const storage = createStorage(
    storageConfig.provider === 's3'
      ? {
          provider: 's3',
          bucket: storageConfig.s3Bucket || '',
          region: storageConfig.s3Region || '',
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
          endpoint: process.env.S3_ENDPOINT,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
        }
      : {
          provider: 'local',
          rootPath: storageConfig.localPath,
          publicBaseUrl: storageConfig.publicBaseUrl,
        }
  );

  return {
    config: serverCfg,
    db,
    storage,
  };
}

/**
 * Create ServerEnvironment for testing
 */
export function createTestServerEnvironment(
  overrides: Partial<ServerEnvironment> = {}
): ServerEnvironment {
  return {
    config: {
      port: 8080,
      host: 'localhost',
      cookieSecret: 'test-secret',
      corsOrigin: true,
      env: 'test',
    },
    db: overrides.db as PostgresJsDatabase<typeof schema>,
    storage: overrides.storage as StorageProvider,
    ...overrides,
  };
}
