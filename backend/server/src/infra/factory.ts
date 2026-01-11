// backend/server/src/infra/factory.ts
/**
 * ServerEnvironment Factory
 * Creates the complete infrastructure context at startup
 *
 * This is the single point where all infrastructure is initialized.
 * The rest of the application receives the environment via function arguments,
 * making testing trivial (inject MockEnvironment).
 */

import { createDbClient } from '@db';
import { createStorage, toStorageConfig } from '@storage';

import { createAuthConfig } from './config/auth';
import { createEmailService } from './email';
import { createSecurityService } from './security';

import type { ServerEnv } from '@abe-stack/shared';
import type { ServerEnvironment } from './ctx';
import type { DbClient } from '@db';

/**
 * Options for creating the server environment
 */
export interface CreateEnvironmentOptions {
  /** Application environment configuration */
  env: ServerEnv;
  /** Optional pre-existing database connection string */
  connectionString?: string;
  /** Optional pre-existing database client (for testing) */
  db?: DbClient;
}

/**
 * Create the complete server environment
 *
 * @example
 * ```typescript
 * const env = await createEnvironment({
 *   env: loadServerEnv(process.env),
 *   connectionString: dbUrl,
 * });
 *
 * // Pass to routes
 * authRoutes(app, env);
 * ```
 */
export async function createEnvironment(
  options: CreateEnvironmentOptions,
): Promise<ServerEnvironment> {
  const { env, connectionString } = options;
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Create auth config
  const authConfig = createAuthConfig(isProduction);

  // 2. Create or use provided database client
  const db = options.db ?? createDbClient(connectionString ?? '');

  // 3. Create storage provider
  const storage = createStorage(toStorageConfig(env));

  // 4. Create email service
  const mailer = createEmailService(isProduction);

  // 5. Create security service
  const security = createSecurityService(authConfig);

  return {
    config: env,
    authConfig,
    db,
    storage,
    mailer,
    security,
    isProduction,
  };
}

/**
 * Create a mock environment for testing
 * Allows overriding specific dependencies
 *
 * @example
 * ```typescript
 * const mockEnv = createMockEnvironment({
 *   db: mockDb,
 *   mailer: mockMailer,
 * });
 * ```
 */
export function createMockEnvironment(overrides: Partial<ServerEnvironment>): ServerEnvironment {
  const isProduction = false;
  const authConfig = createAuthConfig(isProduction);

  // Create minimal defaults that can be overridden
  const defaults: ServerEnvironment = {
    config: {} as ServerEnv,
    authConfig,
    db: {} as DbClient,
    storage: {} as ReturnType<typeof createStorage>,
    mailer: createEmailService(false),
    security: createSecurityService(authConfig),
    isProduction: false,
  };

  return {
    ...defaults,
    ...overrides,
  };
}
