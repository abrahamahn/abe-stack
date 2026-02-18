// main/shared/src/config/env.validation.ts
/**
 * Environment Validation & Combined Schema
 *
 * FullEnv type, EnvSchema, validateEnv, getRawEnv, validateProductionGuards,
 * and AppConfig interface.
 *
 * @module config/env.validation
 */

import {
  createSchema,
  parseObject,
  parseOptional,
  parseString,
  withDefault,
} from '../primitives/schema';
import { getRawEnv } from '../system/env';

export { getRawEnv };

import { AuthEnvSchema } from './env.auth';
import { BaseEnvSchema } from './env.base';
import { BillingEnvSchema } from './env.billing';
import { CacheEnvSchema } from './env.cache';
import { DatabaseEnvSchema } from './env.database';
import { EmailEnvSchema } from './env.email';
import { FrontendEnvSchema } from './env.frontend';
import { NotificationEnvSchema } from './env.notification';
import { PackageManagerEnvSchema } from './env.package.manager';
import { QueueEnvSchema } from './env.queue';
import { SearchEnvSchema } from './env.search';
import { ServerEnvSchema } from './env.server';
import { StorageEnvSchema } from './env.storage';

import type { AuthConfig, AuthEnv } from './env.auth';
import type { BaseEnv, JwtEnv } from './env.base';
import type { BillingConfig, BillingEnv } from './env.billing';
import type { CacheConfig, CacheEnv } from './env.cache';
import type { DatabaseConfig, DatabaseEnv } from './env.database';
import type { EmailConfig, EmailEnv } from './env.email';
import type { FrontendEnv } from './env.frontend';
import type { NotificationConfig, NotificationEnv } from './env.notification';
import type { PackageManagerConfig, PackageManagerEnv } from './env.package.manager';
import type { QueueConfig, QueueEnv } from './env.queue';
import type { SearchConfig, SearchEnv } from './env.search';
import type { ServerConfig, ServerEnv } from './env.server';
import type { StorageConfig, StorageEnv } from './env.storage';
import type { Schema } from '../primitives/schema';

// ============================================================================
// Combined Environment
// ============================================================================

/** Combined environment type containing all validated environment variables. */
export type FullEnv = BaseEnv &
  JwtEnv &
  DatabaseEnv &
  AuthEnv &
  EmailEnv &
  StorageEnv &
  BillingEnv &
  CacheEnv &
  QueueEnv &
  ServerEnv &
  SearchEnv &
  PackageManagerEnv &
  FrontendEnv &
  NotificationEnv;

function validateProductionGuards(env: FullEnv): void {
  const isProd = env.NODE_ENV === 'production';

  if (isProd) {
    const hasPostgres =
      (env.DATABASE_URL !== undefined && env.DATABASE_URL !== '') ||
      (env.POSTGRES_HOST !== undefined &&
        env.POSTGRES_USER !== undefined &&
        env.POSTGRES_PASSWORD !== undefined);

    const hasSqlite = env.SQLITE_FILE_PATH !== undefined && env.SQLITE_FILE_PATH !== '';
    const hasMongo =
      env.MONGODB_CONNECTION_STRING !== undefined && env.MONGODB_CONNECTION_STRING !== '';
    const hasJson = env.JSON_DB_PATH !== undefined && env.JSON_DB_PATH !== '';

    if (!hasPostgres && !hasSqlite && !hasMongo && !hasJson) {
      throw new Error('Production requires a valid database configuration (URL or host/user/pass)');
    }
  }

  if (isProd) {
    const weakSecrets = ['secret', 'password', 'changeme', 'jwt_secret', 'dev', 'prod', 'test'];
    if (weakSecrets.includes(env.JWT_SECRET.toLowerCase()) || env.JWT_SECRET.length < 32) {
      throw new Error(
        'Security Risk: JWT_SECRET must be at least 32 characters and not a common word in production',
      );
    }
  }

  if (
    env.PUBLIC_API_URL !== undefined &&
    env.PUBLIC_API_URL !== '' &&
    env.VITE_API_URL !== undefined &&
    env.VITE_API_URL !== '' &&
    env.PUBLIC_API_URL !== env.VITE_API_URL
  ) {
    throw new Error(
      'Consistency Error: PUBLIC_API_URL and VITE_API_URL must match if both are provided',
    );
  }
}

function parseAllEnvFields(obj: Record<string, unknown>): FullEnv {
  const base = BaseEnvSchema.parse(obj);
  const jwt: JwtEnv = {
    JWT_SECRET: parseString(obj['JWT_SECRET'], 'JWT_SECRET'),
    JWT_SECRET_PREVIOUS: parseOptional(obj['JWT_SECRET_PREVIOUS'], (v: unknown) =>
      parseString(v, 'JWT_SECRET_PREVIOUS'),
    ),
    JWT_ISSUER: parseString(withDefault(obj['JWT_ISSUER'], 'bslt'), 'JWT_ISSUER'),
    JWT_AUDIENCE: parseString(withDefault(obj['JWT_AUDIENCE'], 'bslt-api'), 'JWT_AUDIENCE'),
  };
  const database = DatabaseEnvSchema.parse(obj);
  const auth = AuthEnvSchema.parse(obj);
  const email = EmailEnvSchema.parse(obj);
  const storage = StorageEnvSchema.parse(obj);
  const billing = BillingEnvSchema.parse(obj);
  const cache = CacheEnvSchema.parse(obj);
  const queue = QueueEnvSchema.parse(obj);
  const server = ServerEnvSchema.parse(obj);
  const search = SearchEnvSchema.parse(obj);
  const packageManager = PackageManagerEnvSchema.parse(obj);
  const notifications = NotificationEnvSchema.parse(obj);
  const frontend = FrontendEnvSchema.parse(obj);

  return {
    ...base,
    ...jwt,
    ...database,
    ...auth,
    ...email,
    ...storage,
    ...billing,
    ...cache,
    ...queue,
    ...server,
    ...search,
    ...packageManager,
    ...notifications,
    ...frontend,
  };
}

export const EnvSchema: Schema<FullEnv> = createSchema<FullEnv>((data: unknown) => {
  const obj = parseObject(data, 'Environment');
  const env = parseAllEnvFields(obj);
  validateProductionGuards(env);
  return env;
});

// ============================================================================
// Utilities (getRawEnv is canonical in system/env — re-imported above)
// ============================================================================

/**
 * Validates environment variables against a schema. Throws on failure.
 *
 * @param schema - The schema to validate against
 * @param rawEnv - Optional env source override (e.g., import.meta.env for Vite clients)
 */
export function validateEnv<T>(
  schema: Schema<T>,
  rawEnv?: Record<string, string | undefined>,
): T {
  const result = schema.safeParse(getRawEnv(rawEnv));

  if (!result.success) {
    const message = `Environment validation failed: ${result.error.message}`;
    throw new Error(message);
  }

  return result.data;
}

// ============================================================================
// App Config
// ============================================================================

/**
 * Complete application configuration.
 *
 * This is the single source of truth for all server settings.
 * Created by the config factory at startup and passed throughout the app.
 */
export interface AppConfig {
  env: 'development' | 'production' | 'test';
  server: ServerConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
  email: EmailConfig;
  storage: StorageConfig;
  billing: BillingConfig;
  cache: CacheConfig;
  queue: QueueConfig;
  notifications: NotificationConfig;
  search: SearchConfig;
  packageManager: PackageManagerConfig;
}
