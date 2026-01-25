// packages/core/src/config/index.ts
/**
 * Configuration Module
 *
 * Provides type-safe configuration loading and validation.
 * Separates configuration types from API contracts.
 */

// ============================================================================
// Type Definitions (from ./types/)
// ============================================================================
export type {
  // Main configuration
  AppConfig,
  // Auth configuration
  AuthConfig,
  AuthStrategy,
  // Service configuration
  BillingConfig,
  BillingPlansConfig,
  BillingProvider,
  BillingUrlsConfig,
  BrazeConfig,
  // Infrastructure configuration
  CacheConfig,
  CourierConfig,
  DatabaseConfig,
  DatabaseProvider,
  ElasticsearchProviderConfig,
  EmailConfig,
  FcmConfig,
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
  SqlColumnMapping,
  SqlSearchProviderConfig,
  SqlTableConfig,
  SqliteConfig,
  StorageConfig,
  StorageConfigBase,
  StorageProviderName,
  StripeProviderConfig,
  YarnConfig,
} from './types';

// ============================================================================
// Environment Loading (from ./env.loader.ts)
// ============================================================================
export { initEnv, loadServerEnv } from './env.loader';

// ============================================================================
// Environment Schema (from ./env.schema.ts)
// ============================================================================
export {
  AuthEnvSchema,
  BillingEnvSchema,
  CacheEnvSchema,
  DatabaseEnvSchema,
  EmailEnvSchema,
  EnvSchema,
  NotificationEnvSchema,
  PackageManagerEnvSchema,
  QueueEnvSchema,
  SearchEnvSchema,
  ServerEnvSchema,
  StorageEnvSchema,
} from './env.schema';

export type { FullEnv } from './env.schema';

// ============================================================================
// Parsers (from ./parsers.ts)
// ============================================================================
export { getBool, getInt, getList, getRequired } from './parsers';
