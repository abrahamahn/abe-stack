// apps/server/src/config/factory.ts
import type {
  AppConfig,
  ElasticsearchProviderConfig,
  SqlSearchProviderConfig,
} from '@abe-stack/core/contracts/config';
import { FullEnvSchema, type FullEnv } from '@abe-stack/core/contracts/config/environment';

import { loadAuth, validateAuth } from './auth/auth';
import { loadCacheConfig } from './infra/cache';
import { loadDatabase } from './infra/database';
import { loadPackageManagerConfig, validatePackageManagerConfig } from './infra/package';
import { loadQueueConfig } from './infra/queue';
import { loadServer } from './infra/server';
import { loadStorage } from './infra/storage';
import { loadBilling, validateBilling } from './services/billing';
import { loadEmail } from './services/email';
import { loadNotificationsConfig, validateNotificationsConfig } from './services/notifications';
import {
  loadElasticsearchConfig,
  loadSqlSearchConfig,
  validateElasticsearchConfig,
  validateSqlSearchConfig,
} from './services/search';

export function load(rawEnv: Record<string, string | undefined>): AppConfig {
  // 1. Validate raw strings against Zod Schema
  const envResult = FullEnvSchema.safeParse(rawEnv);

  if (!envResult.success) {
    console.error('\n❌ ABE-STACK: Environment Validation Failed');
    console.table(envResult.error.flatten().fieldErrors);
    process.exit(1);
  }

  // 2. Use the typed Zod output directly
  const env: FullEnv = envResult.data;

  const nodeEnv = (env.NODE_ENV || 'development') as AppConfig['env'];
  const server = loadServer(env);

  const searchProvider = (env.SEARCH_PROVIDER || 'sql') as 'sql' | 'elasticsearch';

  const config: AppConfig = {
    env: nodeEnv,
    server,
    database: loadDatabase(env),
    auth: loadAuth(env, server.apiBaseUrl),
    email: loadEmail(env),
    storage: loadStorage(env),
    billing: loadBilling(env, server.appBaseUrl),
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
    validateAuth(config.auth);
  } catch (e: any) {
    errors.push(e.message);
  }

  // Billing Domain
  if (config.billing?.enabled) {
    errors.push(...validateBilling(config.billing));
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

  // Package Manager Domain
  errors.push(...validatePackageManagerConfig(config.packageManager));

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

    throw new Error('Server failed to start: Invalid Configuration');
  }
}
