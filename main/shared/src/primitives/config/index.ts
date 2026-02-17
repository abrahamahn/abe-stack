// main/shared/src/primitives/config/index.ts
/**
 * Configuration Module
 *
 * Provides type-safe configuration types, env schemas, and parsing utilities.
 * Portable (no Node.js fs/path deps). Server-side env loading stays in engine.
 */

// ============================================================================
// Type Definitions (from ./types/)
// ============================================================================
export type {
  // Main configuration
  AppConfig,
  // Auth configuration
  Argon2Config,
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
  ElasticsearchSearchConfig,
  EmailConfig,
  FcmConfig,
  GenericNotificationConfig,
  JsonDatabaseConfig,
  JwtRotationConfig,
  KnockConfig,
  LocalStorageConfig,
  LoggingConfig,
  LogLevel,
  MongoConfig,
  MySqlConfig,
  NotificationConfig,
  NotificationProvider,
  NotificationProviderConfig,
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
  SqliteConfig,
  SqlSearchConfig,
  SqlSearchProviderConfig,
  SqlTableConfig,
  StorageConfig,
  StorageConfigBase,
  StorageProviderName,
  StripeProviderConfig,
  YarnConfig,
} from './types/index';

// ============================================================================
// Environment Schema (from ./env.ts)
// ============================================================================
export {
  AuthEnvSchema,
  BaseEnvSchema,
  BillingEnvSchema,
  CacheEnvSchema,
  DatabaseEnvSchema,
  EmailEnvSchema,
  EnvSchema,
  FrontendEnvSchema,
  getRawEnv,
  NODE_ENV_VALUES,
  NotificationEnvSchema,
  PackageManagerEnvSchema,
  QueueEnvSchema,
  SearchEnvSchema,
  ServerEnvSchema,
  StorageEnvSchema,
  validateEnv,
} from './env';

export type { FullEnv, NodeEnv } from './env';

// ============================================================================
// Parsers (from primitives/helpers/parse.ts)
// ============================================================================
export { getBool, getInt, getList, getRequired } from '../helpers/parse';

