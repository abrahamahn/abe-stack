// apps/server/src/config/index.ts

/**
 * 1. THE BRAIN
 * This is the only way the app should initialize the config.
 */
export { load, load as loadConfig } from './factory';

/**
 * 2. AUTHENTICATION & SECURITY
 * Only export the utilities and types the server-side logic needs.
 */
export {
  AuthValidationError,
  getRefreshCookieOptions,
  isStrategyEnabled,
  loadAuth,
  validateAuth,
} from './auth/auth';

export { loadJwtRotationConfig } from './auth/jwt';
export { loadRateLimitConfig } from './auth/rate-limit';

/**
 * 3. INFRASTRUCTURE
 * Selective helpers for DB connections and Storage handling.
 */
export { loadCacheConfig } from './infra/cache';
export { buildConnectionString, getSafeConnectionString, loadDatabase } from './infra/database';
export { loadServer } from './infra/server';
export { loadStorage } from './infra/storage';

/**
 * 4. SERVICES
 * Domain-specific loaders.
 */
export { loadBilling, validateBilling } from './services/billing';
export { loadEmail } from './services/email';
export { loadFcmConfig } from './services/notifications';
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
  FcmConfig,
  OAuthProviderConfig,
  QueueConfig,
  SearchConfig,
  ServerConfig,
  StorageConfig,
} from '@abe-stack/core/contracts/config';
