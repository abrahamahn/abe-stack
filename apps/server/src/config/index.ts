// apps/server/src/config/index.ts
/**
 * Unified Application Configuration
 *
 * Single source of truth for all configuration.
 * Load once at startup, pass through App class.
 */

// Main config loader
export { loadConfig } from './loader';

// App config type
export type { AppConfig } from './types';

// Auth config
export type { AuthConfig, AuthStrategy, OAuthProviderConfig } from './auth.config';
export {
  isStrategyEnabled,
  getRefreshCookieOptions,
  validateAuthConfig,
  AuthConfigValidationError,
} from './auth.config';

// Database config
export type { DatabaseConfig } from './database.config';
export { buildConnectionString } from './database.config';

// Email config
export type { EmailConfig } from './email.config';

// Server config
export type { ServerConfig } from './server.config';

// Storage config
export type {
  StorageConfig,
  StorageProviderName,
  LocalStorageConfig,
  S3StorageConfig,
} from './storage.config';
export { loadStorageConfig } from './storage.config';

// Billing config
export type { BillingConfig } from './billing.config';
export { loadBillingConfig, validateBillingConfig } from './billing.config';
