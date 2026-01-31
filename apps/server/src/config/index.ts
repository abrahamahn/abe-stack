// apps/server/src/config/index.ts

/**
 * 1. THE BRAIN
 * This is the only way the app should initialize the config.
 */
export { load, load as loadConfig } from './factory';

/**
 * 2. AUTHENTICATION & SECURITY
 * Re-exported from @abe-stack/auth for convenience.
 */
export {
  AuthValidationError,
  getRefreshCookieOptions,
  isStrategyEnabled,
  loadAuthConfig,
  loadJwtRotationConfig,
  loadRateLimitConfig,
  validateAuthConfig,
} from '@abe-stack/auth';

/**
 * 3. INFRASTRUCTURE
 * Re-exported from external packages for convenience.
 */
export { loadCacheConfig } from '@abe-stack/cache';
export {
  buildConfigConnectionString as buildConnectionString,
  DEFAULT_SEARCH_SCHEMAS,
  getSafeConnectionString,
  loadDatabaseConfig,
  loadElasticsearchConfig,
  loadSqlSearchConfig,
} from '@abe-stack/db';
export { loadServerConfig } from '@abe-stack/http';
export { loadStorageConfig } from '@abe-stack/storage';

/**
 * 4. SERVICES
 * Domain-specific loaders.
 */
export { loadBillingConfig, validateBillingConfig } from '@abe-stack/billing';
export { loadEmailConfig } from '@abe-stack/email';
export { loadNotificationsConfig, validateNotificationsConfig } from '@abe-stack/notifications';

/**
 * 5. THE CONTRACTS (Type Aliases)
 * We alias these from Core so the Server doesn't have to import from
 * two different places for config-related tasks.
 */
export type {
  AppConfig,
  AuthConfig,
  BillingConfig,
  CacheConfig,
  DatabaseConfig,
  EmailConfig,
  NotificationConfig,
  NotificationProvider,
  OAuthProviderConfig,
  OneSignalConfig,
  QueueConfig,
  SearchConfig,
  ServerConfig,
  StorageConfig,
} from '@abe-stack/core/config';
