// apps/server/src/config/factory.ts
import { loadAuthConfig, validateAuthConfig } from '@abe-stack/auth';
import { loadBillingConfig, validateBillingConfig } from '@abe-stack/billing';
import { loadCacheConfig } from '@abe-stack/cache';
import { EnvSchema, initEnv } from '@abe-stack/core/config';
import {
  loadDatabaseConfig,
  loadElasticsearchConfig,
  loadSqlSearchConfig,
  validateElasticsearchConfig,
  validateSqlSearchConfig,
} from '@abe-stack/db';
import { loadEmailConfig } from '@abe-stack/email';
import { loadServerConfig } from '@abe-stack/http';
import { loadQueueConfig } from '@abe-stack/jobs';
import { loadNotificationsConfig, validateNotificationsConfig } from '@abe-stack/notifications';
import { loadStorageConfig } from '@abe-stack/storage';

import type { AppConfig, FullEnv } from '@abe-stack/core/config';

/**
 * Config Factory
 *
 * The single source of truth for loading and validating the application configuration.
 *
 * **Responsibility**:
 * 1. Read raw environment variables (Record<string, string>).
 * 2. Validate them against the Zod schema (`EnvSchema`).
 * 3. Transform them into the structured `AppConfig` domain object.
 * 4. Apply domain-specific business rules (e.g., "SSL required in production").
 *
 * @param rawEnv - Raw environment variables (usually `process.env`).
 * @returns Validated `AppConfig` or exits process on error.
 */
export function load(rawEnv: Record<string, string | undefined> = process.env): AppConfig {
  // 1. Initialize environment from files if we are loading from process.env
  if (rawEnv === process.env) {
    initEnv();
  }

  // 2. Validate raw strings against Zod Schema
  const envResult = EnvSchema.safeParse(rawEnv);

  if (!envResult.success) {
    /* eslint-disable no-console */
    console.error('\n❌ ABE-STACK: Environment Validation Failed');
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    console.table(envResult.error.flatten().fieldErrors);
    /* eslint-enable no-console */
    process.exit(1);
  }

  // 2. Use the typed Zod output directly
  const env: FullEnv = envResult.data;

  const nodeEnv = env.NODE_ENV;
  const server = loadServerConfig(env);

  const searchProvider = env.SEARCH_PROVIDER;

  const billingConfig = loadBillingConfig(env, server.appBaseUrl);

  const config: AppConfig = {
    env: nodeEnv,
    server,
    database: loadDatabaseConfig(env),
    auth: loadAuthConfig(env, server.apiBaseUrl),
    email: loadEmailConfig(env),
    storage: loadStorageConfig(env),
    billing: billingConfig,
    cache: loadCacheConfig(env),
    queue: loadQueueConfig(env),
    notifications: loadNotificationsConfig(env),
    search:
      searchProvider === 'elasticsearch'
        ? {
            provider: 'elasticsearch' as const,
            config: loadElasticsearchConfig(env),
          }
        : {
            provider: 'sql' as const,
            config: loadSqlSearchConfig(env),
          },
    features: {
      admin: env.ENABLE_ADMIN !== 'false',
      realtime: env.ENABLE_REALTIME !== 'false',
    },
  };

  validate(config);
  return config;
}

function validate(config: AppConfig): void {
  const errors: string[] = [];
  const isProd = config.env === 'production';

  // Auth Domain
  try {
    validateAuthConfig(config.auth);
  } catch (e) {
    if (e instanceof Error) {
      errors.push(e.message);
    } else {
      errors.push(String(e));
    }
  }

  // Billing Domain
  if (config.billing.enabled) {
    errors.push(...validateBillingConfig(config.billing));
  }

  // Search Domain - Using clean Type Predicates
  if (config.search.provider === 'elasticsearch') {
    errors.push(...validateElasticsearchConfig(config.search.config));
  } else {
    errors.push(...validateSqlSearchConfig(config.search.config));
  }

  // Notifications Domain
  errors.push(...validateNotificationsConfig(config.notifications));

  // Global Production Hard-Guards
  if (isProd) {
    if (config.storage.provider === 's3' && config.storage.accessKeyId === '') {
      errors.push('Storage: S3_ACCESS_KEY_ID is required in production');
    }
    if (config.email.provider === 'console') {
      errors.push('Email: Provider cannot be "console" in production.');
    }
    if (config.database.provider === 'postgresql' && !config.database.ssl) {
      errors.push('Database: SSL must be enabled in production.');
    }
  }

  if (errors.length > 0) {
    const report = errors.map((e) => `  ↳ ❌ ${e}`).join('\n');
    /* eslint-disable no-console */
    console.error('\n' + '='.repeat(50));
    console.error('  ABE-STACK CONFIGURATION ERROR');
    console.error('='.repeat(50));
    console.error(report);
    console.error('='.repeat(50) + '\n');
    /* eslint-enable no-console */

    throw new Error(`Server failed to start: Invalid Configuration\n${errors.join('\n')}`);
  }
}
