// main/apps/server/src/config/index.ts

/**
 * 1. THE BRAIN
 * This is the only way the app should initialize the config.
 */
export { load, loadConfig } from './factory';

/**
 * 2. AUTHENTICATION & SECURITY
 */
export {
  AuthValidationError,
  DEFAULT_JWT_ROTATION_CONFIG,
  DEFAULT_RATE_LIMIT_CONFIG,
  loadAuthConfig,
  loadJwtRotationConfig,
  loadRateLimitConfig,
  validateAuthConfig,
} from './auth';

export { getRefreshCookieOptions, isStrategyEnabled } from '@bslt/shared/core';

/**
 * 3. INFRASTRUCTURE
 */
export {
  buildConnectionString,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_PACKAGE_MANAGER_CONFIG,
  DEFAULT_QUEUE_CONFIG,
  getSafeConnectionString,
  isJsonDatabase,
  isPostgres,
  loadCacheConfig,
  loadDatabaseConfig,
  loadPackageManagerConfig,
  loadQueueConfig,
  loadServerConfig,
  loadStorageConfig,
  validateStorage,
} from './infra';

/**
 * 4. SERVICES
 */
export {
  DEFAULT_ELASTICSEARCH_CONFIG,
  DEFAULT_NOTIFICATION_CONFIG,
  DEFAULT_SMTP_CONFIG,
  DEFAULT_SQL_SEARCH_CONFIG,
  loadBillingConfig,
  loadEmailConfig,
  loadElasticsearchConfig,
  loadNotificationsConfig,
  loadSmtpConfig,
  loadSqlSearchConfig,
  validateBillingConfig,
  validateElasticsearchConfig,
  validateNotificationsConfig,
  validateSqlSearchConfig,
} from './services';

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
} from '@bslt/shared/config';
