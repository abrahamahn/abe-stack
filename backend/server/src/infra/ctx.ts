// backend/server/src/infra/ctx.ts
/**
 * ServerEnvironment - The central dependency container for the server
 *
 * This pattern (Registry/Context) provides dependency injection without
 * a heavy DI framework. It makes testing trivial because you can inject
 * a "MockEnvironment" with test doubles.
 *
 * Usage:
 * - Initialize once in factory.ts at startup
 * - Pass to route handlers and services via function arguments
 * - Never import singletons directly - use env.* instead
 */

import type { DbClient } from '@db';
import type { StorageProvider } from '@storage';
import type { ServerEnv } from '@abe-stack/shared';

import type { EmailService } from './email';
import type { AuthConfig } from './config/auth';
import type { SecurityService } from './security';

/**
 * The dependency container passed to every service/route
 * All infrastructure dependencies are accessed through this object
 */
export interface ServerEnvironment {
  /** Application configuration from environment variables */
  config: ServerEnv;

  /** Authentication configuration */
  authConfig: AuthConfig;

  /** Database client for data access */
  db: DbClient;

  /** Storage provider for file operations (S3/Local) */
  storage: StorageProvider;

  /** Email service for sending notifications */
  mailer: EmailService;

  /** Security utilities (password hashing, JWT, account lockout) */
  security: SecurityService;

  /** Whether running in production mode */
  isProduction: boolean;
}

/**
 * Partial environment for testing - allows mocking specific dependencies
 */
export type PartialServerEnvironment = Partial<ServerEnvironment>;

/**
 * Type helper for extracting environment from context
 */
export type EnvFromContext<T extends { env: ServerEnvironment }> = T['env'];
