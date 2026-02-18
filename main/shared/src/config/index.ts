// main/shared/src/config/index.ts
/**
 * Configuration Module
 *
 * Provides type-safe configuration types, env schemas, and parsing utilities.
 */

// ============================================================================
// Auth Types & Schema
// ============================================================================
export type {
  Argon2Config,
  AuthConfig,
  AuthEnv,
  AuthStrategy,
  JwtRotationConfig,
  OAuthProviderConfig,
  RateLimitConfig,
} from './env.auth';

export { AuthEnvSchema } from './env.auth';

// ============================================================================
// Base Types & Schema
// ============================================================================
export type { BaseEnv, JwtEnv, NodeEnv } from './env.base';

export { BaseEnvSchema, NODE_ENV_VALUES, trueFalseSchema } from './env.base';

// ============================================================================
// Billing Types & Schema
// ============================================================================
export type {
  BillingConfig,
  BillingPlansConfig,
  BillingProvider,
  BillingUrlsConfig,
  PayPalProviderConfig,
  StripeProviderConfig,
} from './env.billing';

export { BillingEnvSchema } from './env.billing';

// ============================================================================
// Cache Types & Schema
// ============================================================================
export type { CacheConfig } from './env.cache';

export { CacheEnvSchema } from './env.cache';

// ============================================================================
// Database Types & Schema
// ============================================================================
export type {
  DatabaseConfig,
  DatabaseProvider,
  JsonDatabaseConfig,
  MongoConfig,
  MySqlConfig,
  PostgresConfig,
  SqliteConfig,
} from './env.database';

export { DatabaseEnvSchema } from './env.database';

// ============================================================================
// Email Types & Schema
// ============================================================================
export type { EmailConfig, SmtpConfig } from './env.email';

export { EmailEnvSchema } from './env.email';

// ============================================================================
// Frontend Schema
// ============================================================================
export { FrontendEnvSchema } from './env.frontend';

// ============================================================================
// Notification Types & Schema
// ============================================================================
export type {
  BrazeConfig,
  CourierConfig,
  FcmConfig,
  GenericNotificationConfig,
  KnockConfig,
  NotificationConfig,
  NotificationConfigValidated,
  NotificationEnv,
  NotificationProvider,
  NotificationProviderConfig,
  NotificationSchemaProvider,
  OneSignalConfig,
  SnsConfig,
} from './env.notification';

export {
  BrazeSchema,
  CourierSchema,
  FcmSchema,
  KnockSchema,
  NotificationConfigSchema,
  NotificationEnvSchema,
  NotificationProviderSchema,
  OneSignalSchema,
  SnsSchema,
} from './env.notification';

// ============================================================================
// Package Manager Types & Schema
// ============================================================================
export type {
  NpmConfig,
  PackageManagerConfig,
  PackageManagerProvider,
  PnpmConfig,
  YarnConfig,
} from './env.package.manager';

export { PackageManagerEnvSchema } from './env.package.manager';

// ============================================================================
// Queue Types & Schema
// ============================================================================
export type { QueueConfig, QueueProvider } from './env.queue';

export { QueueEnvSchema } from './env.queue';

// ============================================================================
// Search Types & Schema
// ============================================================================
export type {
  ElasticsearchProviderConfig,
  ElasticsearchSearchConfig,
  SearchConfig,
  SqlColumnMapping,
  SqlSearchConfig,
  SqlSearchProviderConfig,
  SqlTableConfig,
} from './env.search';

export { SearchEnvSchema } from './env.search';

// ============================================================================
// Server Types & Schema
// ============================================================================
export type { LoggingConfig, LogLevel, ServerConfig } from './env.server';

export { ServerEnvSchema } from './env.server';

// ============================================================================
// Storage Types & Schema
// ============================================================================
export type {
  LocalStorageConfig,
  S3StorageConfig,
  StorageConfig,
  StorageConfigBase,
  StorageProviderName,
} from './env.storage';

export { StorageEnvSchema } from './env.storage';

// ============================================================================
// Validation & Combined
// ============================================================================
export type { AppConfig, FullEnv } from './env.validation';

export { EnvSchema, getRawEnv, validateEnv } from './env.validation';

// ============================================================================
// Parsers (canonical source: primitives/helpers/parse.ts)
// ============================================================================
import { getBool, getInt, getList, getRequired } from '../primitives/helpers';

export { getBool, getInt, getList, getRequired };
