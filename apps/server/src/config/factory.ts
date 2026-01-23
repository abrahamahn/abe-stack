// apps/server/src/config/factory.ts
import type { AppConfig } from '@abe-stack/core/';

// 1. Infrastructure Imports
import { loadCacheConfig } from './infra/cache';
import { loadDatabase } from './infra/database';
import { loadQueueConfig } from './infra/queue';
import { loadServer } from './infra/server';
import { loadStorage } from './infra/storage';

// 2. Auth Domain Imports
import { loadAuth, validateAuth } from './auth/auth';

// 3. Services Domain Imports
import { loadBilling, validateBilling } from './services/billing';
import { loadEmail } from './services/email';
import { loadFcmConfig, validateFcmConfig } from './services/notifications';
import {
  loadElasticsearchConfig,
  loadSqlSearchConfig,
  validateElasticsearchConfig,
  validateSqlSearchConfig,
} from './services/search';

/**
 * The Master Factory: Transforms raw environment variables into a
 * validated, type-safe AppConfig object.
 */
export function load(env: Record<string, string | undefined>): AppConfig {
  const nodeEnv = (env.NODE_ENV || 'development') as AppConfig['env'];
  const server = loadServer(env);

  // Resolve search provider (defaulting to sql for ease of use)
  const searchProvider = (env.SEARCH_PROVIDER || 'sql') as 'sql' | 'elasticsearch';
  const searchConfig =
    searchProvider === 'elasticsearch' ? loadElasticsearchConfig(env) : loadSqlSearchConfig(env);

  const config: AppConfig = {
    env: nodeEnv,
    server,
    database: loadDatabase(env),
    auth: loadAuth(env, server.apiBaseUrl),
    email: loadEmail(env),
    storage: loadStorage(env),
    billing: loadBilling(env, server.appBaseUrl),
    cache: loadCacheConfig(env),
    // New Additions
    queue: loadQueueConfig(env),
    notifications: loadFcmConfig(env),
    search: {
      provider: searchProvider,
      config: searchConfig,
    },
  };

  validate(config);

  return config;
}

/**
 * Centralized Validation Runner
 */
function validate(config: AppConfig): void {
  const errors: string[] = [];
  const isProd = config.env === 'production';

  // --- Domain Delegated Validations ---

  // Auth
  try {
    validateAuth(config.auth);
  } catch (e: any) {
    errors.push(e.message);
  }

  // Billing
  if (config.billing?.enabled) {
    errors.push(...validateBilling(config.billing));
  }

  // Search - type narrowing based on provider
  if (config.search.provider === 'elasticsearch') {
    errors.push(
      ...validateElasticsearchConfig(
        config.search.config as import('@abe-stack/core/contracts/config').ElasticsearchProviderConfig
      )
    );
  } else {
    errors.push(
      ...validateSqlSearchConfig(
        config.search.config as import('@abe-stack/core/contracts/config').SqlSearchProviderConfig
      )
    );
  }

  // Notifications
  errors.push(...validateFcmConfig(config.notifications));

  // --- Global Infrastructure Guards ---

  if (isProd) {
    // 1. Storage Security
    if (config.storage.provider === 's3' && !config.storage.accessKeyId) {
      errors.push('Storage: S3_ACCESS_KEY_ID is required in production');
    }

    // 2. Email Integrity
    if (config.email.provider === 'console') {
      errors.push('Email: Provider cannot be "console" in production. Use "smtp" or an API.');
    }

    // 3. Database Security
    if (config.database.provider === 'postgresql' && !config.database.ssl) {
      // Note: This is a warning in some stacks, but a hard error in Abe-Stack
      errors.push('Database: SSL must be enabled in production environments.');
    }
  }

  // --- Final Execution ---
  if (errors.length > 0) {
    const report = errors.map((e) => `  ↳ ❌ ${e}`).join('\n');
    console.error('\n' + '='.repeat(50));
    console.error('  ABE-STACK CONFIGURATION ERROR');
    console.error('='.repeat(50));
    console.error(report);
    console.error('='.repeat(50) + '\n');

    throw new Error('Server failed to start due to invalid configuration.');
  }
}
