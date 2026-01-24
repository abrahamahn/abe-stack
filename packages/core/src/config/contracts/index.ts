// packages/core/src/contracts/config/index.ts
/**
 * Configuration Contracts - Public API
 *
 * This module exports all configuration types used throughout the application.
 * Import from '@abe-stack/core/contracts/config' or '@abe-stack/core'.
 */

// ============================================================================
// Auth Exports
// ============================================================================

export type {
  AuthConfig,
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
 * Unified search configuration.
 * Supports SQL-based search (simple) or Elasticsearch (scalable).
 */
export interface SearchConfig {
  /** Active search provider */
  provider: 'sql' | 'elasticsearch';
  /** Provider-specific configuration */
  config: ElasticsearchProviderConfig | SqlSearchProviderConfig;
}

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
  /** Runtime environment */
  env: 'development' | 'production' | 'test';
  /** HTTP server settings */
  server: ServerConfig;
  /** Database connection settings */
  database: DatabaseConfig;
  /** Authentication and security settings */
  auth: AuthConfig;
  /** Email service settings */
  email: EmailConfig;
  /** File storage settings */
  storage: StorageConfig;
  /** Payment/subscription settings */
  billing: BillingConfig;
  /** Cache layer settings */
  cache: CacheConfig;
  /** Background job queue settings */
  queue: QueueConfig;
  /** Push notification settings */
  notifications: NotificationConfig;
  /** Search service settings */
  search: SearchConfig;
  /** Package manager settings */
  packageManager: PackageManagerConfig;
}
