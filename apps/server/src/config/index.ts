// apps/server/src/config/index.ts
/**
 * Unified Application Configuration
 *
 * Single source of truth for all configuration.
 * Load once at startup, pass through App class.
 */

import { loadAuthConfig } from './auth.config';
import { loadDatabaseConfig } from './database.config';
import { loadEmailConfig } from './email.config';
import { loadServerConfig } from './server.config';

import type { AuthConfig } from './auth.config';
import type { DatabaseConfig } from './database.config';
import type { EmailConfig } from './email.config';
import type { ServerConfig } from './server.config';

// Re-export individual configs for type access
export type { AuthConfig, AuthStrategy, OAuthProviderConfig } from './auth.config';
export type { DatabaseConfig } from './database.config';
export type { EmailConfig } from './email.config';
export type { ServerConfig } from './server.config';

// Re-export helpers
export { isStrategyEnabled, getRefreshCookieOptions } from './auth.config';
export { buildConnectionString } from './database.config';

/**
 * Complete application configuration
 * This is the single object that contains ALL settings
 */
export interface AppConfig {
  env: 'development' | 'production' | 'test';
  server: ServerConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
  email: EmailConfig;
}

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
  if (config.env !== 'test' && !config.database.password && !config.database.connectionString) {
    errors.push('Database password or connection string is required');
  }

  if (errors.length > 0) {
    const message = `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`;
    throw new Error(message);
  }
}
