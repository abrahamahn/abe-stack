// main/apps/server/src/config/index.ts

/**
 * 1. THE BRAIN
 * This is the only way the app should initialize the config.
 */
export { load, load as loadConfig } from './factory';

/**
 * 2. AUTHENTICATION & SECURITY
 * Only export the utilities and types the server-side logic needs.
 */
export { AuthValidationError, loadAuthConfig, validateAuthConfig } from './auth/auth';

export { getRefreshCookieOptions, isStrategyEnabled } from '@bslt/shared/config';

export { loadJwtRotationConfig } from './auth/jwt';
export { loadRateLimitConfig } from './auth/rate-limit';

/**
 * 3. INFRASTRUCTURE
 * Selective helpers for DB connections and Storage handling.
 */
export { loadCacheConfig } from './infra/cache';
export {
  buildConnectionString,
  getSafeConnectionString,
  loadDatabaseConfig
} from './infra/database';
export { loadServerConfig } from './infra/server';
export { loadStorageConfig } from './infra/storage';

/**
 * 4. SERVICES
 * Domain-specific loaders.
 */
export { loadPackageManagerConfig } from './infra/package';
export { loadBillingConfig, validateBillingConfig } from './services/billing';
export { loadEmailConfig } from './services/email';
export { loadNotificationsConfig, validateNotificationsConfig } from './services/notifications';
export { loadElasticsearchConfig, loadSqlSearchConfig } from './services/search';

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
  StorageConfig
} from '@bslt/shared/config';

