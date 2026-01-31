// shared/core/src/config/index.ts
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
    OAuthProviderConfig,
    OneSignalConfig,
    PayPalProviderConfig,
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
    StripeProviderConfig
} from './types/index';

// ============================================================================
// Environment Loading (from ./env.loader.ts)
// ============================================================================
export { initEnv, loadServerEnv, validateEnvironment } from './env.loader';

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
    QueueEnvSchema,
    SearchEnvSchema,
    ServerEnvSchema,
    StorageEnvSchema
} from './env.schema';

export type { FullEnv } from './env.schema';

// ============================================================================
// Parsers (from ./env.parsers.ts)
// ============================================================================
export { getBool, getInt, getList, getRequired } from './env.parsers';
