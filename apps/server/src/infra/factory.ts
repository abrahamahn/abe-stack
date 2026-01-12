// apps/server/src/infra/factory.ts
/**
 * ServerEnvironment Factory
 *
 * Single place where all infrastructure is initialized.
 * This is the only file that reads process.env directly for service configuration.
 *
 * Benefits:
 * - Single point of initialization
 * - Easy to mock for testing (pass mock implementations)
 * - Clear dependency graph
 */

import { createDbClient } from '@abe-stack/db';
import { createStorage, toStorageConfig } from '@abe-stack/storage';

import { ConsoleEmailService, SmtpEmailService } from './email';

import type { ServerEnvironment } from './ctx';
import type { ServerEnv } from '@abe-stack/shared';
import type { FastifyBaseLogger } from 'fastify';

export interface CreateEnvironmentOptions {
  /** Server configuration (validated env vars) */
  config: ServerEnv;
  /** Database connection string (if not provided, built from config) */
  connectionString?: string;
  /** Logger instance (typically from Fastify) */
  log: FastifyBaseLogger;
  /** Override email service (useful for testing) */
  email?: ServerEnvironment['email'];
  /** Override storage provider (useful for testing) */
  storage?: ServerEnvironment['storage'];
  /** Override database client (useful for testing) */
  db?: ServerEnvironment['db'];
}

/**
 * Create a ServerEnvironment with all infrastructure initialized.
 *
 * For production, this initializes real services.
 * For testing, pass mock implementations via options.
 *
 * @example Production usage:
 * ```ts
 * const env = createEnvironment({
 *   config: serverEnv,
 *   connectionString: buildConnectionString(serverEnv),
 *   log: app.log,
 * });
 * ```
 *
 * @example Test usage:
 * ```ts
 * const env = createEnvironment({
 *   config: mockConfig,
 *   log: mockLogger,
 *   db: mockDb,
 *   email: new ConsoleEmailService(),
 *   storage: mockStorage,
 * });
 * ```
 */
export function createEnvironment(options: CreateEnvironmentOptions): ServerEnvironment {
  const { config, connectionString, log, email, storage, db } = options;
  const isProd = process.env.NODE_ENV === 'production';

  return {
    config,
    db: db ?? createDbClient(connectionString ?? ''),
    storage: storage ?? createStorage(toStorageConfig(config)),
    email: email ?? (isProd ? new SmtpEmailService() : new ConsoleEmailService()),
    log,
  };
}

/**
 * Create a mock ServerEnvironment for testing.
 * All services are stubbed with no-op implementations.
 */
export function createMockEnvironment(
  overrides: Partial<ServerEnvironment> = {},
): ServerEnvironment {
  const mockLog: FastifyBaseLogger = {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    trace: () => {},
    fatal: () => {},
    child: () => mockLog,
    level: 'silent',
    silent: () => {},
  } as unknown as FastifyBaseLogger;

  return {
    config: {} as ServerEnv,
    db: {} as ServerEnvironment['db'],
    storage: {} as ServerEnvironment['storage'],
    email: new ConsoleEmailService(),
    log: mockLog,
    ...overrides,
  };
}
