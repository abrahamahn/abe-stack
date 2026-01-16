// apps/server/src/config/index.ts
/**
 * Unified Application Configuration
 *
 * Single source of truth for all configuration.
 * Load once at startup, pass through App class.
 */

// Main config loader
export { loadConfig } from '@config/loader';

// App config type
export type { AppConfig } from '@config/types';

// Auth config
export type { AuthConfig, AuthStrategy, OAuthProviderConfig } from '@config/auth.config';
export { isStrategyEnabled, getRefreshCookieOptions } from '@config/auth.config';

// Database config
export type { DatabaseConfig } from '@config/database.config';
export { buildConnectionString } from '@config/database.config';

// Email config
export type { EmailConfig } from '@config/email.config';

// Server config
export type { ServerConfig } from '@config/server.config';

// Storage config
export type {
  StorageConfig,
  StorageProviderName,
  LocalStorageConfig,
  S3StorageConfig,
} from '@config/storage.config';
export { loadStorageConfig } from '@config/storage.config';
