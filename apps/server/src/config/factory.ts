// apps/server/src/config/factory.ts
import type {
  AppConfig,
  ElasticsearchProviderConfig,
  FullEnv,
  SqlSearchProviderConfig,
} from '@abe-stack/core/config';
import { EnvSchema, initEnv } from '@abe-stack/core/config';

import { loadAuthConfig, validateAuthConfig } from './auth/auth';
import { loadCacheConfig } from './infra/cache';
import { loadDatabaseConfig } from './infra/database';
import { loadPackageManagerConfig } from './infra/package';
import { loadQueueConfig } from './infra/queue';
import { loadServerConfig } from './infra/server';
import { loadStorageConfig } from './infra/storage';
import { loadBillingConfig, validateBillingConfig } from './services/billing';
import { loadEmailConfig } from './services/email';
import { loadNotificationsConfig, validateNotificationsConfig } from './services/notifications';
import {
  loadElasticsearchConfig,
  loadSqlSearchConfig,
  validateElasticsearchConfig,
  validateSqlSearchConfig,
} from './services/search';

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
    console.error('\n❌ ABE-STACK: Environment Validation Failed');
    console.table(envResult.error.flatten().fieldErrors);
    process.exit(1);
  }

  // 2. Use the typed Zod output directly
  const env: FullEnv = envResult.data;

  const nodeEnv = (env.NODE_ENV || 'development') as AppConfig['env'];
  const server = loadServerConfig(env);

  const searchProvider = (env.SEARCH_PROVIDER || 'sql') as 'sql' | 'elasticsearch';

  const config: AppConfig = {
    env: nodeEnv,
    server,
    database: loadDatabaseConfig(env),
    auth: loadAuthConfig(env, server.apiBaseUrl),
    email: loadEmailConfig(env),
    storage: loadStorageConfig(env),
    billing: loadBillingConfig(env, server.appBaseUrl),
    cache: loadCacheConfig(env),
    queue: loadQueueConfig(env),
    notifications: loadNotificationsConfig(env),
    search: {
      provider: searchProvider,
      config:
        searchProvider === 'elasticsearch'
          ? loadElasticsearchConfig(env)
          : loadSqlSearchConfig(env),
    },
    packageManager: loadPackageManagerConfig(env),
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
  } catch (e: any) {
    errors.push(e.message);
  }

  // Billing Domain
  if (config.billing?.enabled) {
    errors.push(...validateBillingConfig(config.billing));
  }

  // Search Domain - Using clean Type Predicates
  if (config.search.provider === 'elasticsearch') {
    errors.push(
      ...validateElasticsearchConfig(config.search.config as ElasticsearchProviderConfig),
    );
  } else {
    errors.push(...validateSqlSearchConfig(config.search.config as SqlSearchProviderConfig));
  }

  // Notifications Domain
  errors.push(...validateNotificationsConfig(config.notifications));

  // Global Production Hard-Guards
  if (isProd) {
    if (config.storage.provider === 's3' && !config.storage.accessKeyId) {
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
    console.error('\n' + '='.repeat(50));
    console.error('  ABE-STACK CONFIGURATION ERROR');
    console.error('='.repeat(50));
    console.error(report);
    console.error('='.repeat(50) + '\n');

    throw new Error(`Server failed to start: Invalid Configuration\n${errors.join('\n')}`);
  }
}
