// apps/server/src/config/loader.ts
/**
 * Configuration Loader
 *
 * Loads and validates all configuration from environment variables.
 * Call once at startup.
 */

import { loadAuthConfig } from '@config/auth.config';
import { loadDatabaseConfig } from '@config/database.config';
import { loadEmailConfig } from '@config/email.config';
import { loadServerConfig } from '@config/server.config';
import { loadStorageConfig } from '@config/storage.config';

import type { AppConfig } from '@config/types';

/**
 * Load all configuration from environment variables.
 * Call this once at startup.
 *
 * @param env - Environment variables (typically process.env)
 * @returns Complete, validated configuration
 */
export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const nodeEnv = (env.NODE_ENV || 'development') as AppConfig['env'];

  const config: AppConfig = {
    env: nodeEnv,
    server: loadServerConfig(env),
    database: loadDatabaseConfig(env),
    auth: loadAuthConfig(env),
    email: loadEmailConfig(env),
    storage: loadStorageConfig(env),
  };

  // Validate critical settings
  validateConfig(config);

  return config;
}

/**
 * Validate configuration at startup
 * Throws if critical settings are missing or invalid
 */
function validateConfig(config: AppConfig): void {
  const errors: string[] = [];

  // JWT secret is required
  if (!config.auth.jwt.secret) {
    errors.push('JWT_SECRET is required');
  } else if (config.auth.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }

  // Production-specific validations
  if (config.env === 'production') {
    if (config.auth.jwt.secret.includes('dev_')) {
      errors.push('JWT_SECRET must not use development values in production');
    }
    if (!config.auth.cookie.secure) {
      errors.push('Cookies must be secure in production');
    }
  }

  // Database password required (except in test)
  if (config.env !== 'test' && config.database.provider === 'postgresql') {
    if (!config.database.password && !config.database.connectionString) {
      errors.push('Database password or connection string is required');
    }
  }

  if (errors.length > 0) {
    const message = `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`;
    throw new Error(message);
  }
}
