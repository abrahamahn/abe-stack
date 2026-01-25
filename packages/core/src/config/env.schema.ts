// packages/core/src/config/env.schema.ts
import { z } from 'zod';

/**
 * Zod schema for basic environment variables
 */
export const BaseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8080),
});

export type BaseEnv = z.infer<typeof BaseEnvSchema>;

/**
 * Zod schema for JWT-related environment variables
 */
export const JwtEnvSchema = z.object({
  JWT_SECRET: z.string().min(32, 'Security Risk: JWT_SECRET must be at least 32 chars'),
  JWT_SECRET_PREVIOUS: z.string().optional(),
  JWT_ISSUER: z.string().default('abe-stack'),
  JWT_AUDIENCE: z.string().default('abe-stack-api'),
});

/**
 * Zod schema for database-related environment variables
 */
export const DatabaseEnvSchema = z.object({
  DATABASE_PROVIDER: z.enum(['postgresql', 'sqlite', 'mongodb', 'json']).optional(),

  // Postgres
  POSTGRES_HOST: z.string().optional(),
  POSTGRES_PORT: z.coerce.number().optional(),
  POSTGRES_DB: z.string().optional(),
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_CONNECTION_STRING: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  DB_MAX_CONNECTIONS: z.coerce.number().optional(),
  DB_SSL: z.enum(['true', 'false']).optional(),

  // SQLite
  SQLITE_FILE_PATH: z.string().optional(),
  SQLITE_WAL_MODE: z.enum(['true', 'false']).optional(),
  SQLITE_FOREIGN_KEYS: z.enum(['true', 'false']).optional(),
  SQLITE_TIMEOUT_MS: z.coerce.number().optional(),

  // MongoDB
  MONGODB_CONNECTION_STRING: z.string().optional(),
  MONGODB_DATABASE: z.string().optional(),
  MONGODB_DB: z.string().optional(),
  MONGODB_SSL: z.enum(['true', 'false']).optional(),
  MONGODB_CONNECT_TIMEOUT_MS: z.coerce.number().optional(),
  MONGODB_SOCKET_TIMEOUT_MS: z.coerce.number().optional(),
  MONGODB_USE_UNIFIED_TOPOLOGY: z.enum(['true', 'false']).optional(),

  // JSON
  JSON_DB_PATH: z.string().optional(),
  JSON_DB_PERSIST_ON_WRITE: z.enum(['true', 'false']).optional(),
});

/**
 * Zod schema for authentication-related environment variables
 */
export const AuthEnvSchema = z.object({
  // Strategies
  AUTH_STRATEGIES: z.string().optional(),

  // JWT settings
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  JWT_ISSUER: z.string().default('abe-stack'),
  JWT_AUDIENCE: z.string().default('abe-stack-api'),

  // Refresh token settings
  REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().default(7),
  REFRESH_TOKEN_GRACE_PERIOD: z.coerce.number().default(30),

  // Password policy
  PASSWORD_MIN_LENGTH: z.coerce.number().default(8),
  PASSWORD_MAX_LENGTH: z.coerce.number().default(64),
  PASSWORD_MIN_SCORE: z.coerce.number().default(3),

  // Lockout settings
  LOCKOUT_MAX_ATTEMPTS: z.coerce.number().default(10),
  LOCKOUT_DURATION_MS: z.coerce.number().default(1800000),

  // Rate limiting (in development vs production)
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().optional(),
  RATE_LIMIT_REGISTER_MAX: z.coerce.number().optional(),
  RATE_LIMIT_FORGOT_PASSWORD_MAX: z.coerce.number().optional(),
  RATE_LIMIT_VERIFY_EMAIL_MAX: z.coerce.number().optional(),

  // Cookie settings
  COOKIE_SECRET: z.string().optional(),

  // BFF mode
  AUTH_BFF_MODE: z.enum(['true', 'false']).optional(),

  // Proxy settings
  TRUST_PROXY: z.enum(['true', 'false']).optional(),
  TRUSTED_PROXIES: z.string().optional(),
  MAX_PROXY_DEPTH: z.coerce.number().optional(),

  // OAuth providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),

  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().optional(),

  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CALLBACK_URL: z.string().optional(),

  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CALLBACK_URL: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().optional(),

  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),
  APPLE_CALLBACK_URL: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),
  APPLE_PRIVATE_KEY_BASE64: z.string().optional(),

  // Magic link settings
  MAGIC_LINK_EXPIRY_MINUTES: z.coerce.number().default(15),
  MAGIC_LINK_MAX_ATTEMPTS: z.coerce.number().default(3),

  // TOTP settings
  TOTP_ISSUER: z.string().default('ABE Stack'),
  TOTP_WINDOW: z.coerce.number().default(1),
});

/**
 * Zod schema for email-related environment variables
 */
export const EmailEnvSchema = z.object({
  EMAIL_PROVIDER: z.enum(['console', 'smtp']).default('console'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.enum(['true', 'false']).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().optional(),
  EMAIL_REPLY_TO: z.string().optional(),
  SMTP_CONNECTION_TIMEOUT: z.coerce.number().optional(),
  SMTP_SOCKET_TIMEOUT: z.coerce.number().optional(),
});

/**
 * Zod schema for notification-related environment variables
 */
export const NotificationEnvSchema = z.object({
  NOTIFICATIONS_PROVIDER: z
    .enum(['onesignal', 'fcm', 'courier', 'knock', 'sns', 'braze', 'generic'])
    .optional(),

  // OneSignal
  ONESIGNAL_REST_API_KEY: z.string().optional(),
  ONESIGNAL_USER_AUTH_KEY: z.string().optional(),
  ONESIGNAL_APP_ID: z.string().optional(),
  ONESIGNAL_ENABLE_LOGGING: z.enum(['true', 'false']).optional(),

  // FCM
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CREDENTIALS: z.string().optional(),

  // Courier
  COURIER_API_KEY: z.string().optional(),
  COURIER_API_URL: z.string().optional(),
  COURIER_ENABLE_LOGGING: z.enum(['true', 'false']).optional(),
});

/**
 * Zod schema for storage-related environment variables
 */
export const StorageEnvSchema = z.object({
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_ROOT_PATH: z.string().optional(),
  STORAGE_PUBLIC_BASE_URL: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).optional(),
  S3_PRESIGN_EXPIRES_IN_SECONDS: z.coerce.number().optional(),
});

/**
 * Zod schema for billing-related environment variables
 */
export const BillingEnvSchema = z.object({
  BILLING_PROVIDER: z.enum(['stripe', 'paypal']).optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_MODE: z.enum(['sandbox', 'production']).optional(),
  BILLING_CURRENCY: z.string().default('usd'),
  PLAN_FREE_ID: z.string().optional(),
  PLAN_PRO_ID: z.string().optional(),
  PLAN_ENTERPRISE_ID: z.string().optional(),
  BILLING_PORTAL_RETURN_URL: z.string().url().optional(),
  BILLING_CHECKOUT_SUCCESS_URL: z.string().url().optional(),
  BILLING_CHECKOUT_CANCEL_URL: z.string().url().optional(),
});

/**
 * Zod schema for cache-related environment variables
 */
export const CacheEnvSchema = z.object({
  CACHE_PROVIDER: z.enum(['local', 'redis']).optional(),
  CACHE_TTL_MS: z.coerce.number().default(300000),
  CACHE_MAX_SIZE: z.coerce.number().default(1000),
  CACHE_USE_REDIS: z.enum(['true', 'false']).optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
});

/**
 * Zod schema for queue-related environment variables
 */
export const QueueEnvSchema = z.object({
  QUEUE_PROVIDER: z.enum(['local', 'redis']).default('local'),
  QUEUE_POLL_INTERVAL_MS: z.coerce.number().default(1000),
  QUEUE_CONCURRENCY: z.coerce.number().default(5),
  QUEUE_MAX_ATTEMPTS: z.coerce.number().default(3),
  QUEUE_BACKOFF_BASE_MS: z.coerce.number().default(1000),
  QUEUE_MAX_BACKOFF_MS: z.coerce.number().default(300000),
});

/**
 * Zod schema for server-related environment variables
 */
export const ServerEnvSchema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(8080),
  API_PORT: z.coerce.number().optional(),
  APP_PORT: z.coerce.number().optional(),
  HEALTH_PORT: z.coerce.number().default(8081),

  // Operational
  MAINTENANCE_MODE: z.enum(['true', 'false']).optional(),

  // Rate Limiting (Global)
  RATE_LIMIT_WINDOW_MS: z.coerce.number().optional(),
  RATE_LIMIT_MAX: z.coerce.number().optional(),

  // Public URLs (Preferred)
  PUBLIC_API_URL: z.string().url().optional(),
  PUBLIC_APP_URL: z.string().url().optional(),
  APP_URL: z.string().url().optional(),

  // Deprecated URLs (Backward compatibility)
  API_BASE_URL: z.string().url().optional(),
  APP_BASE_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

/**
 * Zod schema for search-related environment variables
 */
export const SearchEnvSchema = z.object({
  SEARCH_PROVIDER: z.enum(['sql', 'elasticsearch']).default('sql'),
  ELASTICSEARCH_NODE: z.string().optional(),
  ELASTICSEARCH_INDEX: z.string().optional(),
  ELASTICSEARCH_USERNAME: z.string().optional(),
  ELASTICSEARCH_PASSWORD: z.string().optional(),
  ELASTICSEARCH_API_KEY: z.string().optional(),
  ELASTICSEARCH_TLS: z.enum(['true', 'false']).optional(),
  ELASTICSEARCH_REQUEST_TIMEOUT_MS: z.coerce.number().optional(),
  SQL_SEARCH_DEFAULT_PAGE_SIZE: z.coerce.number().optional(),
  SQL_SEARCH_MAX_PAGE_SIZE: z.coerce.number().optional(),
  SQL_SEARCH_MAX_QUERY_DEPTH: z.coerce.number().optional(),
  SQL_SEARCH_MAX_CONDITIONS: z.coerce.number().optional(),
  SQL_SEARCH_LOGGING: z.enum(['true', 'false']).optional(),
  SQL_SEARCH_TIMEOUT_MS: z.coerce.number().optional(),
});

/**
 * Zod schema for package manager-related environment variables
 */
export const PackageManagerEnvSchema = z.object({
  PACKAGE_MANAGER_PROVIDER: z.enum(['npm', 'pnpm', 'yarn']).default('pnpm'),

  // NPM
  NPM_AUDIT: z.enum(['true', 'false']).default('true'),
  NPM_LEGACY_PEER_DEPS: z.enum(['true', 'false']).default('false'),
  NPM_REGISTRY: z.string().optional(),

  // PNPM
  PNPM_STRICT_PEER_DEPS: z.enum(['true', 'false']).default('true'),
  PNPM_FROZEN_LOCKFILE: z.enum(['true', 'false']).default('true'),
  PNPM_REGISTRY: z.string().optional(),

  // YARN
  YARN_AUDIT: z.enum(['true', 'false']).default('true'),
  YARN_FROZEN_LOCKFILE: z.enum(['true', 'false']).default('true'),
  YARN_REGISTRY: z.string().optional(),
});

/**
 * Zod schema for frontend-related environment variables
 */
export const FrontendEnvSchema = z.object({
  VITE_API_URL: z.string().url().optional(),
  VITE_APP_NAME: z.string().optional(),
});

/**
 * Combined environment schema for the entire application
 */
export const EnvSchema = BaseEnvSchema.extend({
  // Add all other schemas here
  ...JwtEnvSchema.shape,
  ...DatabaseEnvSchema.shape,
  ...AuthEnvSchema.shape,
  ...EmailEnvSchema.shape,
  ...StorageEnvSchema.shape,
  ...BillingEnvSchema.shape,
  ...CacheEnvSchema.shape,
  ...QueueEnvSchema.shape,
  ...ServerEnvSchema.shape,
  ...SearchEnvSchema.shape,
  ...PackageManagerEnvSchema.shape,
  ...NotificationEnvSchema.shape,
  ...FrontendEnvSchema.shape,
}).superRefine((data, ctx) => {
  const isProd = data.NODE_ENV === 'production';

  // 1. Production Database Enforcement
  if (isProd) {
    const hasPostgres =
      (data.DATABASE_URL !== undefined && data.DATABASE_URL !== '') || (data.POSTGRES_HOST !== undefined && data.POSTGRES_USER !== undefined && data.POSTGRES_PASSWORD !== undefined);

    const hasSqlite = data.SQLITE_FILE_PATH !== undefined && data.SQLITE_FILE_PATH !== '';
    const hasMongo = data.MONGODB_CONNECTION_STRING !== undefined && data.MONGODB_CONNECTION_STRING !== '';

    if (!hasPostgres && !hasSqlite && !hasMongo) {
      ctx.addIssue({
        code: "custom",
        message: 'Production requires a valid database configuration (URL or host/user/pass)',
        path: ['DATABASE_URL'],
      });
    }
  }

  // 2. Production Secret Strength (Basic check)
  if (isProd) {
    const weakSecrets = ['secret', 'password', 'changeme', 'jwt_secret', 'dev', 'prod', 'test'];
    if (weakSecrets.includes(data.JWT_SECRET.toLowerCase()) || data.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: "custom",
        message:
          'Security Risk: JWT_SECRET must be at least 32 characters and not a common word in production',
        path: ['JWT_SECRET'],
      });
    }
  }

  // 3. URL Cross-Validation (Consistency)
  if (data.PUBLIC_API_URL !== undefined && data.PUBLIC_API_URL !== '' && data.VITE_API_URL !== undefined && data.VITE_API_URL !== '' && data.PUBLIC_API_URL !== data.VITE_API_URL) {
    ctx.addIssue({
      code: "custom",
      message: 'Consistency Error: PUBLIC_API_URL and VITE_API_URL must match if both are provided',
      path: ['VITE_API_URL'],
    });
  }
});

export type FullEnv = z.infer<typeof EnvSchema>;
