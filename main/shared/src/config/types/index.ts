// main/shared/src/config/types/index.ts
/**
 * Configuration Contracts - Public API
 *
 * This module exports all configuration types used throughout the application.
 * Import from '@abe-stack/shared/config'.
 */

// ============================================================================
// Auth Exports
// ============================================================================

export type {
  Argon2Config,
  AuthConfig,
  AuthEnv,
  AuthStrategy,
  JwtRotationConfig,
  OAuthProviderConfig,
  RateLimitConfig,
} from './auth';

// ============================================================================
// Infrastructure Exports
// ============================================================================

export type {
  // Cache
  CacheConfig,
  // Database
  DatabaseConfig,
  DatabaseProvider,
  JsonDatabaseConfig,
  // Storage
  LocalStorageConfig,
  // Logging
  LoggingConfig,
  // Server
  LogLevel,
  MongoConfig,
  MySqlConfig,
  NpmConfig,
  // Package Manager
  PackageManagerConfig,
  PackageManagerProvider,
  PnpmConfig,
  PostgresConfig,
  // Queue
  QueueConfig,
  QueueProvider,
  S3StorageConfig,
  ServerConfig,
  SqliteConfig,
  StorageConfig,
  StorageConfigBase,
  StorageProviderName,
  YarnConfig,
} from './infra';

// ============================================================================
// Services Exports
// ============================================================================

export type {
  // Billing
  BillingConfig,
  BillingPlansConfig,
  BillingProvider,
  BillingUrlsConfig,
  // Notifications
  BrazeConfig,
  CourierConfig,
  // Search
  ElasticsearchProviderConfig,
  // Email
  EmailConfig,
  FcmConfig,
  GenericNotificationConfig,
  KnockConfig,
  NotificationConfig,
  NotificationProvider,
  NotificationProviderConfig,
  OneSignalConfig,
  PayPalProviderConfig,
  SmtpConfig,
  SnsConfig,
  SqlColumnMapping,
  SqlSearchProviderConfig,
  SqlTableConfig,
  StripeProviderConfig,
} from './services';

// ============================================================================
// Composite Types
// ============================================================================

import type { AuthConfig } from './auth';
import type {
  CacheConfig,
  DatabaseConfig,
  PackageManagerConfig,
  QueueConfig,
  ServerConfig,
  StorageConfig,
} from './infra';
import type {
  BillingConfig,
  ElasticsearchProviderConfig,
  EmailConfig,
  NotificationConfig,
  SqlSearchProviderConfig,
} from './services';

/**
 * Unified search configuration for SQL provider.
 */
export interface SqlSearchConfig {
  provider: 'sql';
  config: SqlSearchProviderConfig;
}

/**
 * Unified search configuration for Elasticsearch provider.
 */
export interface ElasticsearchSearchConfig {
  provider: 'elasticsearch';
  config: ElasticsearchProviderConfig;
}

/**
 * Unified search configuration.
 * Supports SQL-based search (simple) or Elasticsearch (scalable).
 */
export type SearchConfig = SqlSearchConfig | ElasticsearchSearchConfig;

/**
 * Complete application configuration.
 *
 * This is the single source of truth for all server settings.
 * Created by the config factory at startup and passed throughout the app.
 *
 * @example
 * ```typescript
 * import { load } from '@/config';
 * const config: AppConfig = load(process.env);
 * ```
 */
export interface AppConfig {
  env: 'development' | 'production' | 'test';
  server: ServerConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
  email: EmailConfig;
  storage: StorageConfig;
  billing: BillingConfig;
  cache: CacheConfig;
  queue: QueueConfig;
  notifications: NotificationConfig;
  search: SearchConfig;
  packageManager: PackageManagerConfig;
}
