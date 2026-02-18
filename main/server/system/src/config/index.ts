// main/server/system/src/config/index.ts
/**
 * Configuration Module
 *
 * Server-side configuration loading (Node.js fs/path).
 * All portable types, schemas, and parsers are re-exported from @bslt/shared/config.
 */

// ============================================================================
// Environment Loading (Node.js-only, stays here)
// ============================================================================
export { initEnv, loadServerEnv, validateEnvironment } from './env.loader';

// ============================================================================
// Re-exports from @bslt/shared/config (backward compatibility)
// ============================================================================
export type {
  AppConfig,
  Argon2Config,
  AuthConfig,
  AuthStrategy,
  BillingConfig,
  BillingPlansConfig,
  BillingProvider,
  BillingUrlsConfig,
  BrazeConfig,
  CacheConfig,
  CourierConfig,
  DatabaseConfig,
  DatabaseProvider,
  ElasticsearchProviderConfig,
  ElasticsearchSearchConfig,
  EmailConfig,
  FcmConfig,
  FullEnv,
  GenericNotificationConfig,
  JsonDatabaseConfig,
  JwtRotationConfig,
  KnockConfig,
  LocalStorageConfig,
  LogLevel,
  MongoConfig,
  MySqlConfig,
  NotificationConfig,
  NotificationProvider,
  NpmConfig,
  OAuthProviderConfig,
  OneSignalConfig,
  PackageManagerConfig,
  PackageManagerProvider,
  PayPalProviderConfig,
  PnpmConfig,
  PostgresConfig,
  QueueConfig,
  QueueProvider,
  RateLimitConfig,
  S3StorageConfig,
  SearchConfig,
  ServerConfig,
  SmtpConfig,
  SnsConfig,
  SqlColumnMapping, SqliteConfig, SqlSearchConfig,
  SqlSearchProviderConfig,
  SqlTableConfig, StorageConfig,
  StorageConfigBase,
  StorageProviderName,
  StripeProviderConfig,
  YarnConfig
} from '@bslt/shared/config';

export {
  AuthEnvSchema,
  BaseEnvSchema,
  BillingEnvSchema,
  CacheEnvSchema,
  DatabaseEnvSchema,
  EmailEnvSchema,
  EnvSchema,
  FrontendEnvSchema,
  getBool,
  getInt,
  getList,
  getRequired,
  NotificationEnvSchema,
  PackageManagerEnvSchema,
  QueueEnvSchema,
  SearchEnvSchema,
  ServerEnvSchema,
  StorageEnvSchema,
} from '@bslt/shared/config';

export { getRefreshCookieOptions, isStrategyEnabled } from '@bslt/shared/core';

