// main/shared/src/config/env.schema.ts
/**
 * Environment Variable Validation Schemas
 *
 * Defines the shape and validation for all environment variables.
 * Migrated from Zod to createSchema for zero-dependency validation.
 *
 * @module config/env.schema
 */

import {
  coerceNumber,
  createEnumSchema,
  createSchema,
  parseObject,
  parseOptional,
  parseString,
  withDefault,
} from '../types/schema';

import type { Schema } from '../types/schema';

// ============================================================================
// Sub-Schema Interfaces
// ============================================================================

/** Base environment variables */
export interface BaseEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
}

/** JWT environment variables */
export interface JwtEnv {
  JWT_SECRET: string;
  JWT_SECRET_PREVIOUS?: string | undefined;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
}

/** Database environment variables */
export interface DatabaseEnv {
  DATABASE_PROVIDER?: 'postgresql' | 'sqlite' | 'mongodb' | 'json' | undefined;
  POSTGRES_HOST?: string | undefined;
  POSTGRES_PORT?: number | undefined;
  POSTGRES_DB?: string | undefined;
  POSTGRES_USER?: string | undefined;
  POSTGRES_PASSWORD?: string | undefined;
  POSTGRES_CONNECTION_STRING?: string | undefined;
  DATABASE_URL?: string | undefined;
  DB_MAX_CONNECTIONS?: number | undefined;
  DB_SSL?: 'true' | 'false' | undefined;
  SQLITE_FILE_PATH?: string | undefined;
  SQLITE_WAL_MODE?: 'true' | 'false' | undefined;
  SQLITE_FOREIGN_KEYS?: 'true' | 'false' | undefined;
  SQLITE_TIMEOUT_MS?: number | undefined;
  MONGODB_CONNECTION_STRING?: string | undefined;
  MONGODB_DATABASE?: string | undefined;
  MONGODB_DB?: string | undefined;
  MONGODB_SSL?: 'true' | 'false' | undefined;
  MONGODB_CONNECT_TIMEOUT_MS?: number | undefined;
  MONGODB_SOCKET_TIMEOUT_MS?: number | undefined;
  MONGODB_USE_UNIFIED_TOPOLOGY?: 'true' | 'false' | undefined;
  JSON_DB_PATH?: string | undefined;
  JSON_DB_PERSIST_ON_WRITE?: 'true' | 'false' | undefined;
  DATABASE_READ_REPLICA_URL?: string | undefined;
}

/** Authentication environment variables */
export interface AuthEnv {
  AUTH_STRATEGIES?: string | undefined;
  ACCESS_TOKEN_EXPIRY: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  REFRESH_TOKEN_EXPIRY_DAYS: number;
  REFRESH_TOKEN_GRACE_PERIOD: number;
  PASSWORD_MIN_LENGTH: number;
  PASSWORD_MAX_LENGTH: number;
  PASSWORD_MIN_SCORE: number;
  LOCKOUT_MAX_ATTEMPTS: number;
  LOCKOUT_DURATION_MS: number;
  RATE_LIMIT_LOGIN_MAX?: number | undefined;
  RATE_LIMIT_REGISTER_MAX?: number | undefined;
  RATE_LIMIT_FORGOT_PASSWORD_MAX?: number | undefined;
  RATE_LIMIT_VERIFY_EMAIL_MAX?: number | undefined;
  COOKIE_SECRET?: string | undefined;
  TRUST_PROXY?: 'true' | 'false' | undefined;
  TRUSTED_PROXIES?: string | undefined;
  MAX_PROXY_DEPTH?: number | undefined;
  GOOGLE_CLIENT_ID?: string | undefined;
  GOOGLE_CLIENT_SECRET?: string | undefined;
  GOOGLE_CALLBACK_URL?: string | undefined;
  GITHUB_CLIENT_ID?: string | undefined;
  GITHUB_CLIENT_SECRET?: string | undefined;
  GITHUB_CALLBACK_URL?: string | undefined;
  FACEBOOK_CLIENT_ID?: string | undefined;
  FACEBOOK_CLIENT_SECRET?: string | undefined;
  FACEBOOK_CALLBACK_URL?: string | undefined;
  MICROSOFT_CLIENT_ID?: string | undefined;
  MICROSOFT_CLIENT_SECRET?: string | undefined;
  MICROSOFT_CALLBACK_URL?: string | undefined;
  MICROSOFT_TENANT_ID?: string | undefined;
  APPLE_CLIENT_ID?: string | undefined;
  APPLE_CLIENT_SECRET?: string | undefined;
  APPLE_CALLBACK_URL?: string | undefined;
  APPLE_TEAM_ID?: string | undefined;
  APPLE_KEY_ID?: string | undefined;
  APPLE_PRIVATE_KEY?: string | undefined;
  APPLE_PRIVATE_KEY_BASE64?: string | undefined;
  MAGIC_LINK_EXPIRY_MINUTES: number;
  MAGIC_LINK_MAX_ATTEMPTS: number;
  TOTP_ISSUER: string;
  TOTP_WINDOW: number;
  CAPTCHA_ENABLED?: 'true' | 'false' | undefined;
  CAPTCHA_PROVIDER?: 'turnstile' | undefined;
  CAPTCHA_SITE_KEY?: string | undefined;
  CAPTCHA_SECRET_KEY?: string | undefined;
}

/** Email environment variables */
export interface EmailEnv {
  EMAIL_PROVIDER: 'console' | 'smtp';
  SMTP_HOST?: string | undefined;
  SMTP_PORT?: number | undefined;
  SMTP_SECURE?: 'true' | 'false' | undefined;
  SMTP_USER?: string | undefined;
  SMTP_PASS?: string | undefined;
  EMAIL_API_KEY?: string | undefined;
  EMAIL_FROM_NAME?: string | undefined;
  EMAIL_FROM_ADDRESS?: string | undefined;
  EMAIL_REPLY_TO?: string | undefined;
  SMTP_CONNECTION_TIMEOUT?: number | undefined;
  SMTP_SOCKET_TIMEOUT?: number | undefined;
}

/** Storage environment variables */
export interface StorageEnv {
  STORAGE_PROVIDER: 'local' | 's3';
  STORAGE_ROOT_PATH?: string | undefined;
  STORAGE_PUBLIC_BASE_URL?: string | undefined;
  S3_ACCESS_KEY_ID?: string | undefined;
  S3_SECRET_ACCESS_KEY?: string | undefined;
  S3_BUCKET?: string | undefined;
  S3_REGION?: string | undefined;
  S3_ENDPOINT?: string | undefined;
  S3_FORCE_PATH_STYLE?: 'true' | 'false' | undefined;
  S3_PRESIGN_EXPIRES_IN_SECONDS?: number | undefined;
}

/** Billing environment variables */
export interface BillingEnv {
  BILLING_PROVIDER?: 'stripe' | 'paypal' | undefined;
  STRIPE_SECRET_KEY?: string | undefined;
  STRIPE_PUBLISHABLE_KEY?: string | undefined;
  STRIPE_WEBHOOK_SECRET?: string | undefined;
  PAYPAL_CLIENT_ID?: string | undefined;
  PAYPAL_CLIENT_SECRET?: string | undefined;
  PAYPAL_WEBHOOK_ID?: string | undefined;
  PAYPAL_MODE?: 'sandbox' | 'production' | undefined;
  BILLING_CURRENCY: string;
  PLAN_FREE_ID?: string | undefined;
  PLAN_PRO_ID?: string | undefined;
  PLAN_ENTERPRISE_ID?: string | undefined;
  BILLING_PORTAL_RETURN_URL?: string | undefined;
  BILLING_CHECKOUT_SUCCESS_URL?: string | undefined;
  BILLING_CHECKOUT_CANCEL_URL?: string | undefined;
}

/** Cache environment variables */
export interface CacheEnv {
  CACHE_PROVIDER?: 'local' | 'redis' | undefined;
  CACHE_TTL_MS: number;
  CACHE_MAX_SIZE: number;
  CACHE_USE_REDIS?: 'true' | 'false' | undefined;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string | undefined;
  REDIS_DB?: number | undefined;
}

/** Queue environment variables */
export interface QueueEnv {
  QUEUE_PROVIDER: 'local' | 'redis';
  QUEUE_POLL_INTERVAL_MS: number;
  QUEUE_CONCURRENCY: number;
  QUEUE_MAX_ATTEMPTS: number;
  QUEUE_BACKOFF_BASE_MS: number;
  QUEUE_MAX_BACKOFF_MS: number;
}

/** Server environment variables */
export interface ServerEnv {
  HOST: string;
  PORT: number;
  API_PORT?: number | undefined;
  APP_PORT?: number | undefined;
  HEALTH_PORT: number;
  MAINTENANCE_MODE?: 'true' | 'false' | undefined;
  RATE_LIMIT_WINDOW_MS?: number | undefined;
  RATE_LIMIT_MAX?: number | undefined;
  PUBLIC_API_URL?: string | undefined;
  PUBLIC_APP_URL?: string | undefined;
  APP_URL?: string | undefined;
  API_BASE_URL?: string | undefined;
  APP_BASE_URL?: string | undefined;
  CORS_ORIGIN?: string | undefined;
  CORS_ORIGINS?: string | undefined;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  AUDIT_RETENTION_DAYS?: number | undefined;
  LOG_CLIENT_ERROR_LEVEL?: 'debug' | 'info' | 'warn' | 'error' | undefined;
  LOG_REQUEST_CONTEXT?: 'true' | 'false' | undefined;
  LOG_PRETTY_JSON?: 'true' | 'false' | undefined;
}

/** Search environment variables */
export interface SearchEnv {
  SEARCH_PROVIDER: 'sql' | 'elasticsearch';
  ELASTICSEARCH_NODE?: string | undefined;
  ELASTICSEARCH_INDEX?: string | undefined;
  ELASTICSEARCH_USERNAME?: string | undefined;
  ELASTICSEARCH_PASSWORD?: string | undefined;
  ELASTICSEARCH_API_KEY?: string | undefined;
  ELASTICSEARCH_TLS?: 'true' | 'false' | undefined;
  ELASTICSEARCH_REQUEST_TIMEOUT_MS?: number | undefined;
  SQL_SEARCH_DEFAULT_PAGE_SIZE?: number | undefined;
  SQL_SEARCH_MAX_PAGE_SIZE?: number | undefined;
  SQL_SEARCH_MAX_QUERY_DEPTH?: number | undefined;
  SQL_SEARCH_MAX_CONDITIONS?: number | undefined;
  SQL_SEARCH_LOGGING?: 'true' | 'false' | undefined;
  SQL_SEARCH_TIMEOUT_MS?: number | undefined;
}

/** Package manager environment variables */
export interface PackageManagerEnv {
  PACKAGE_MANAGER_PROVIDER: 'npm' | 'pnpm' | 'yarn';
  NPM_AUDIT: 'true' | 'false';
  NPM_LEGACY_PEER_DEPS: 'true' | 'false';
  NPM_REGISTRY?: string | undefined;
  PNPM_STRICT_PEER_DEPS: 'true' | 'false';
  PNPM_FROZEN_LOCKFILE: 'true' | 'false';
  PNPM_REGISTRY?: string | undefined;
  YARN_AUDIT: 'true' | 'false';
  YARN_FROZEN_LOCKFILE: 'true' | 'false';
  YARN_REGISTRY?: string | undefined;
}

/** Frontend environment variables */
export interface FrontendEnv {
  VITE_API_URL?: string | undefined;
  VITE_APP_NAME?: string | undefined;
}

/** Notification environment variables (from notification.ts) */
export interface NotificationSchemaEnv {
  NOTIFICATIONS_PROVIDER?:
    | 'onesignal'
    | 'fcm'
    | 'courier'
    | 'knock'
    | 'sns'
    | 'braze'
    | 'generic'
    | undefined;
  ONESIGNAL_REST_API_KEY?: string | undefined;
  ONESIGNAL_USER_AUTH_KEY?: string | undefined;
  ONESIGNAL_APP_ID?: string | undefined;
  ONESIGNAL_ENABLE_LOGGING?: 'true' | 'false' | undefined;
  FCM_PROJECT_ID?: string | undefined;
  FCM_CREDENTIALS?: string | undefined;
  COURIER_API_KEY?: string | undefined;
  COURIER_API_URL?: string | undefined;
  COURIER_ENABLE_LOGGING?: 'true' | 'false' | undefined;
}

// ============================================================================
// Combined FullEnv Type
// ============================================================================

/**
 * Combined environment type containing all validated environment variables.
 */
export type FullEnv = BaseEnv &
  JwtEnv &
  DatabaseEnv &
  AuthEnv &
  EmailEnv &
  StorageEnv &
  BillingEnv &
  CacheEnv &
  QueueEnv &
  ServerEnv &
  SearchEnv &
  PackageManagerEnv &
  FrontendEnv &
  NotificationSchemaEnv;

// ============================================================================
// Helper Enums
// ============================================================================

const nodeEnvSchema = createEnumSchema(['development', 'production', 'test'] as const, 'NODE_ENV');
const trueFalseSchema = createEnumSchema(['true', 'false'] as const, 'boolean flag');

// ============================================================================
// Individual Sub-Schemas
// ============================================================================

/**
 * Base environment schema.
 *
 * @complexity O(1)
 */
export const BaseEnvSchema: Schema<BaseEnv> = createSchema<BaseEnv>((data: unknown) => {
  const obj = parseObject(data, 'BaseEnv');
  return {
    NODE_ENV: nodeEnvSchema.parse(withDefault(obj['NODE_ENV'], 'development')),
    PORT: coerceNumber(withDefault(obj['PORT'], 8080), 'PORT'),
  };
});

/**
 * Database environment schema.
 *
 * @complexity O(1)
 */
export const DatabaseEnvSchema: Schema<DatabaseEnv> = createSchema<DatabaseEnv>((data: unknown) => {
  const obj = parseObject(data, 'DatabaseEnv');
  return {
    DATABASE_PROVIDER: parseOptional(obj['DATABASE_PROVIDER'], (v) =>
      createEnumSchema(
        ['postgresql', 'sqlite', 'mongodb', 'json'] as const,
        'DATABASE_PROVIDER',
      ).parse(v),
    ),
    POSTGRES_HOST: parseOptional(obj['POSTGRES_HOST'], (v) => parseString(v, 'POSTGRES_HOST')),
    POSTGRES_PORT: parseOptional(obj['POSTGRES_PORT'], (v) => coerceNumber(v, 'POSTGRES_PORT')),
    POSTGRES_DB: parseOptional(obj['POSTGRES_DB'], (v) => parseString(v, 'POSTGRES_DB')),
    POSTGRES_USER: parseOptional(obj['POSTGRES_USER'], (v) => parseString(v, 'POSTGRES_USER')),
    POSTGRES_PASSWORD: parseOptional(obj['POSTGRES_PASSWORD'], (v) =>
      parseString(v, 'POSTGRES_PASSWORD'),
    ),
    POSTGRES_CONNECTION_STRING: parseOptional(obj['POSTGRES_CONNECTION_STRING'], (v) =>
      parseString(v, 'POSTGRES_CONNECTION_STRING'),
    ),
    DATABASE_URL: parseOptional(obj['DATABASE_URL'], (v) => parseString(v, 'DATABASE_URL')),
    DB_MAX_CONNECTIONS: parseOptional(obj['DB_MAX_CONNECTIONS'], (v) =>
      coerceNumber(v, 'DB_MAX_CONNECTIONS'),
    ),
    DB_SSL: parseOptional(obj['DB_SSL'], (v) => trueFalseSchema.parse(v)),
    SQLITE_FILE_PATH: parseOptional(obj['SQLITE_FILE_PATH'], (v) =>
      parseString(v, 'SQLITE_FILE_PATH'),
    ),
    SQLITE_WAL_MODE: parseOptional(obj['SQLITE_WAL_MODE'], (v) => trueFalseSchema.parse(v)),
    SQLITE_FOREIGN_KEYS: parseOptional(obj['SQLITE_FOREIGN_KEYS'], (v) => trueFalseSchema.parse(v)),
    SQLITE_TIMEOUT_MS: parseOptional(obj['SQLITE_TIMEOUT_MS'], (v) =>
      coerceNumber(v, 'SQLITE_TIMEOUT_MS'),
    ),
    MONGODB_CONNECTION_STRING: parseOptional(obj['MONGODB_CONNECTION_STRING'], (v) =>
      parseString(v, 'MONGODB_CONNECTION_STRING'),
    ),
    MONGODB_DATABASE: parseOptional(obj['MONGODB_DATABASE'], (v) =>
      parseString(v, 'MONGODB_DATABASE'),
    ),
    MONGODB_DB: parseOptional(obj['MONGODB_DB'], (v) => parseString(v, 'MONGODB_DB')),
    MONGODB_SSL: parseOptional(obj['MONGODB_SSL'], (v) => trueFalseSchema.parse(v)),
    MONGODB_CONNECT_TIMEOUT_MS: parseOptional(obj['MONGODB_CONNECT_TIMEOUT_MS'], (v) =>
      coerceNumber(v, 'MONGODB_CONNECT_TIMEOUT_MS'),
    ),
    MONGODB_SOCKET_TIMEOUT_MS: parseOptional(obj['MONGODB_SOCKET_TIMEOUT_MS'], (v) =>
      coerceNumber(v, 'MONGODB_SOCKET_TIMEOUT_MS'),
    ),
    MONGODB_USE_UNIFIED_TOPOLOGY: parseOptional(obj['MONGODB_USE_UNIFIED_TOPOLOGY'], (v) =>
      trueFalseSchema.parse(v),
    ),
    JSON_DB_PATH: parseOptional(obj['JSON_DB_PATH'], (v) => parseString(v, 'JSON_DB_PATH')),
    JSON_DB_PERSIST_ON_WRITE: parseOptional(obj['JSON_DB_PERSIST_ON_WRITE'], (v) =>
      trueFalseSchema.parse(v),
    ),
    DATABASE_READ_REPLICA_URL: parseOptional(obj['DATABASE_READ_REPLICA_URL'], (v) =>
      parseString(v, 'DATABASE_READ_REPLICA_URL'),
    ),
  };
});

/**
 * Auth environment schema.
 *
 * @complexity O(1)
 */
export const AuthEnvSchema: Schema<AuthEnv> = createSchema<AuthEnv>((data: unknown) => {
  const obj = parseObject(data, 'AuthEnv');
  return {
    AUTH_STRATEGIES: parseOptional(obj['AUTH_STRATEGIES'], (v) =>
      parseString(v, 'AUTH_STRATEGIES'),
    ),
    ACCESS_TOKEN_EXPIRY: parseString(
      withDefault(obj['ACCESS_TOKEN_EXPIRY'], '15m'),
      'ACCESS_TOKEN_EXPIRY',
    ),
    JWT_ISSUER: parseString(withDefault(obj['JWT_ISSUER'], 'abe-stack'), 'JWT_ISSUER'),
    JWT_AUDIENCE: parseString(withDefault(obj['JWT_AUDIENCE'], 'abe-stack-api'), 'JWT_AUDIENCE'),
    REFRESH_TOKEN_EXPIRY_DAYS: coerceNumber(
      withDefault(obj['REFRESH_TOKEN_EXPIRY_DAYS'], 7),
      'REFRESH_TOKEN_EXPIRY_DAYS',
    ),
    REFRESH_TOKEN_GRACE_PERIOD: coerceNumber(
      withDefault(obj['REFRESH_TOKEN_GRACE_PERIOD'], 30),
      'REFRESH_TOKEN_GRACE_PERIOD',
    ),
    PASSWORD_MIN_LENGTH: coerceNumber(
      withDefault(obj['PASSWORD_MIN_LENGTH'], 8),
      'PASSWORD_MIN_LENGTH',
    ),
    PASSWORD_MAX_LENGTH: coerceNumber(
      withDefault(obj['PASSWORD_MAX_LENGTH'], 64),
      'PASSWORD_MAX_LENGTH',
    ),
    PASSWORD_MIN_SCORE: coerceNumber(
      withDefault(obj['PASSWORD_MIN_SCORE'], 3),
      'PASSWORD_MIN_SCORE',
    ),
    LOCKOUT_MAX_ATTEMPTS: coerceNumber(
      withDefault(obj['LOCKOUT_MAX_ATTEMPTS'], 10),
      'LOCKOUT_MAX_ATTEMPTS',
    ),
    LOCKOUT_DURATION_MS: coerceNumber(
      withDefault(obj['LOCKOUT_DURATION_MS'], 1800000),
      'LOCKOUT_DURATION_MS',
    ),
    RATE_LIMIT_LOGIN_MAX: parseOptional(obj['RATE_LIMIT_LOGIN_MAX'], (v) =>
      coerceNumber(v, 'RATE_LIMIT_LOGIN_MAX'),
    ),
    RATE_LIMIT_REGISTER_MAX: parseOptional(obj['RATE_LIMIT_REGISTER_MAX'], (v) =>
      coerceNumber(v, 'RATE_LIMIT_REGISTER_MAX'),
    ),
    RATE_LIMIT_FORGOT_PASSWORD_MAX: parseOptional(obj['RATE_LIMIT_FORGOT_PASSWORD_MAX'], (v) =>
      coerceNumber(v, 'RATE_LIMIT_FORGOT_PASSWORD_MAX'),
    ),
    RATE_LIMIT_VERIFY_EMAIL_MAX: parseOptional(obj['RATE_LIMIT_VERIFY_EMAIL_MAX'], (v) =>
      coerceNumber(v, 'RATE_LIMIT_VERIFY_EMAIL_MAX'),
    ),
    COOKIE_SECRET: parseOptional(obj['COOKIE_SECRET'], (v) => parseString(v, 'COOKIE_SECRET')),
    TRUST_PROXY: parseOptional(obj['TRUST_PROXY'], (v) => trueFalseSchema.parse(v)),
    TRUSTED_PROXIES: parseOptional(obj['TRUSTED_PROXIES'], (v) =>
      parseString(v, 'TRUSTED_PROXIES'),
    ),
    MAX_PROXY_DEPTH: parseOptional(obj['MAX_PROXY_DEPTH'], (v) =>
      coerceNumber(v, 'MAX_PROXY_DEPTH'),
    ),
    GOOGLE_CLIENT_ID: parseOptional(obj['GOOGLE_CLIENT_ID'], (v) =>
      parseString(v, 'GOOGLE_CLIENT_ID'),
    ),
    GOOGLE_CLIENT_SECRET: parseOptional(obj['GOOGLE_CLIENT_SECRET'], (v) =>
      parseString(v, 'GOOGLE_CLIENT_SECRET'),
    ),
    GOOGLE_CALLBACK_URL: parseOptional(obj['GOOGLE_CALLBACK_URL'], (v) =>
      parseString(v, 'GOOGLE_CALLBACK_URL'),
    ),
    GITHUB_CLIENT_ID: parseOptional(obj['GITHUB_CLIENT_ID'], (v) =>
      parseString(v, 'GITHUB_CLIENT_ID'),
    ),
    GITHUB_CLIENT_SECRET: parseOptional(obj['GITHUB_CLIENT_SECRET'], (v) =>
      parseString(v, 'GITHUB_CLIENT_SECRET'),
    ),
    GITHUB_CALLBACK_URL: parseOptional(obj['GITHUB_CALLBACK_URL'], (v) =>
      parseString(v, 'GITHUB_CALLBACK_URL'),
    ),
    FACEBOOK_CLIENT_ID: parseOptional(obj['FACEBOOK_CLIENT_ID'], (v) =>
      parseString(v, 'FACEBOOK_CLIENT_ID'),
    ),
    FACEBOOK_CLIENT_SECRET: parseOptional(obj['FACEBOOK_CLIENT_SECRET'], (v) =>
      parseString(v, 'FACEBOOK_CLIENT_SECRET'),
    ),
    FACEBOOK_CALLBACK_URL: parseOptional(obj['FACEBOOK_CALLBACK_URL'], (v) =>
      parseString(v, 'FACEBOOK_CALLBACK_URL'),
    ),
    MICROSOFT_CLIENT_ID: parseOptional(obj['MICROSOFT_CLIENT_ID'], (v) =>
      parseString(v, 'MICROSOFT_CLIENT_ID'),
    ),
    MICROSOFT_CLIENT_SECRET: parseOptional(obj['MICROSOFT_CLIENT_SECRET'], (v) =>
      parseString(v, 'MICROSOFT_CLIENT_SECRET'),
    ),
    MICROSOFT_CALLBACK_URL: parseOptional(obj['MICROSOFT_CALLBACK_URL'], (v) =>
      parseString(v, 'MICROSOFT_CALLBACK_URL'),
    ),
    MICROSOFT_TENANT_ID: parseOptional(obj['MICROSOFT_TENANT_ID'], (v) =>
      parseString(v, 'MICROSOFT_TENANT_ID'),
    ),
    APPLE_CLIENT_ID: parseOptional(obj['APPLE_CLIENT_ID'], (v) =>
      parseString(v, 'APPLE_CLIENT_ID'),
    ),
    APPLE_CLIENT_SECRET: parseOptional(obj['APPLE_CLIENT_SECRET'], (v) =>
      parseString(v, 'APPLE_CLIENT_SECRET'),
    ),
    APPLE_CALLBACK_URL: parseOptional(obj['APPLE_CALLBACK_URL'], (v) =>
      parseString(v, 'APPLE_CALLBACK_URL'),
    ),
    APPLE_TEAM_ID: parseOptional(obj['APPLE_TEAM_ID'], (v) => parseString(v, 'APPLE_TEAM_ID')),
    APPLE_KEY_ID: parseOptional(obj['APPLE_KEY_ID'], (v) => parseString(v, 'APPLE_KEY_ID')),
    APPLE_PRIVATE_KEY: parseOptional(obj['APPLE_PRIVATE_KEY'], (v) =>
      parseString(v, 'APPLE_PRIVATE_KEY'),
    ),
    APPLE_PRIVATE_KEY_BASE64: parseOptional(obj['APPLE_PRIVATE_KEY_BASE64'], (v) =>
      parseString(v, 'APPLE_PRIVATE_KEY_BASE64'),
    ),
    MAGIC_LINK_EXPIRY_MINUTES: coerceNumber(
      withDefault(obj['MAGIC_LINK_EXPIRY_MINUTES'], 15),
      'MAGIC_LINK_EXPIRY_MINUTES',
    ),
    MAGIC_LINK_MAX_ATTEMPTS: coerceNumber(
      withDefault(obj['MAGIC_LINK_MAX_ATTEMPTS'], 3),
      'MAGIC_LINK_MAX_ATTEMPTS',
    ),
    TOTP_ISSUER: parseString(withDefault(obj['TOTP_ISSUER'], 'ABE Stack'), 'TOTP_ISSUER'),
    TOTP_WINDOW: coerceNumber(withDefault(obj['TOTP_WINDOW'], 1), 'TOTP_WINDOW'),
    CAPTCHA_ENABLED: parseOptional(obj['CAPTCHA_ENABLED'], (v) => trueFalseSchema.parse(v)),
    CAPTCHA_PROVIDER: parseOptional(obj['CAPTCHA_PROVIDER'], (v) =>
      createEnumSchema(['turnstile'] as const, 'CAPTCHA_PROVIDER').parse(v),
    ),
    CAPTCHA_SITE_KEY: parseOptional(obj['CAPTCHA_SITE_KEY'], (v) =>
      parseString(v, 'CAPTCHA_SITE_KEY'),
    ),
    CAPTCHA_SECRET_KEY: parseOptional(obj['CAPTCHA_SECRET_KEY'], (v) =>
      parseString(v, 'CAPTCHA_SECRET_KEY'),
    ),
  };
});

/**
 * Email environment schema.
 *
 * @complexity O(1)
 */
export const EmailEnvSchema: Schema<EmailEnv> = createSchema<EmailEnv>((data: unknown) => {
  const obj = parseObject(data, 'EmailEnv');
  return {
    EMAIL_PROVIDER: createEnumSchema(['console', 'smtp'] as const, 'EMAIL_PROVIDER').parse(
      withDefault(obj['EMAIL_PROVIDER'], 'console'),
    ),
    SMTP_HOST: parseOptional(obj['SMTP_HOST'], (v) => parseString(v, 'SMTP_HOST')),
    SMTP_PORT: parseOptional(obj['SMTP_PORT'], (v) => coerceNumber(v, 'SMTP_PORT')),
    SMTP_SECURE: parseOptional(obj['SMTP_SECURE'], (v) => trueFalseSchema.parse(v)),
    SMTP_USER: parseOptional(obj['SMTP_USER'], (v) => parseString(v, 'SMTP_USER')),
    SMTP_PASS: parseOptional(obj['SMTP_PASS'], (v) => parseString(v, 'SMTP_PASS')),
    EMAIL_API_KEY: parseOptional(obj['EMAIL_API_KEY'], (v) => parseString(v, 'EMAIL_API_KEY')),
    EMAIL_FROM_NAME: parseOptional(obj['EMAIL_FROM_NAME'], (v) =>
      parseString(v, 'EMAIL_FROM_NAME'),
    ),
    EMAIL_FROM_ADDRESS: parseOptional(obj['EMAIL_FROM_ADDRESS'], (v) =>
      parseString(v, 'EMAIL_FROM_ADDRESS'),
    ),
    EMAIL_REPLY_TO: parseOptional(obj['EMAIL_REPLY_TO'], (v) => parseString(v, 'EMAIL_REPLY_TO')),
    SMTP_CONNECTION_TIMEOUT: parseOptional(obj['SMTP_CONNECTION_TIMEOUT'], (v) =>
      coerceNumber(v, 'SMTP_CONNECTION_TIMEOUT'),
    ),
    SMTP_SOCKET_TIMEOUT: parseOptional(obj['SMTP_SOCKET_TIMEOUT'], (v) =>
      coerceNumber(v, 'SMTP_SOCKET_TIMEOUT'),
    ),
  };
});

/**
 * Notification environment schema (in env.schema to match original).
 *
 * @complexity O(1)
 */
export const NotificationEnvSchema: Schema<NotificationSchemaEnv> =
  createSchema<NotificationSchemaEnv>((data: unknown) => {
    const obj = parseObject(data, 'NotificationEnv');
    return {
      NOTIFICATIONS_PROVIDER: parseOptional(obj['NOTIFICATIONS_PROVIDER'], (v) =>
        createEnumSchema(
          ['onesignal', 'fcm', 'courier', 'knock', 'sns', 'braze', 'generic'] as const,
          'NOTIFICATIONS_PROVIDER',
        ).parse(v),
      ),
      ONESIGNAL_REST_API_KEY: parseOptional(obj['ONESIGNAL_REST_API_KEY'], (v) =>
        parseString(v, 'ONESIGNAL_REST_API_KEY'),
      ),
      ONESIGNAL_USER_AUTH_KEY: parseOptional(obj['ONESIGNAL_USER_AUTH_KEY'], (v) =>
        parseString(v, 'ONESIGNAL_USER_AUTH_KEY'),
      ),
      ONESIGNAL_APP_ID: parseOptional(obj['ONESIGNAL_APP_ID'], (v) =>
        parseString(v, 'ONESIGNAL_APP_ID'),
      ),
      ONESIGNAL_ENABLE_LOGGING: parseOptional(obj['ONESIGNAL_ENABLE_LOGGING'], (v) =>
        trueFalseSchema.parse(v),
      ),
      FCM_PROJECT_ID: parseOptional(obj['FCM_PROJECT_ID'], (v) => parseString(v, 'FCM_PROJECT_ID')),
      FCM_CREDENTIALS: parseOptional(obj['FCM_CREDENTIALS'], (v) =>
        parseString(v, 'FCM_CREDENTIALS'),
      ),
      COURIER_API_KEY: parseOptional(obj['COURIER_API_KEY'], (v) =>
        parseString(v, 'COURIER_API_KEY'),
      ),
      COURIER_API_URL: parseOptional(obj['COURIER_API_URL'], (v) =>
        parseString(v, 'COURIER_API_URL'),
      ),
      COURIER_ENABLE_LOGGING: parseOptional(obj['COURIER_ENABLE_LOGGING'], (v) =>
        trueFalseSchema.parse(v),
      ),
    };
  });

/**
 * Storage environment schema.
 *
 * @complexity O(1)
 */
export const StorageEnvSchema: Schema<StorageEnv> = createSchema<StorageEnv>((data: unknown) => {
  const obj = parseObject(data, 'StorageEnv');
  return {
    STORAGE_PROVIDER: createEnumSchema(['local', 's3'] as const, 'STORAGE_PROVIDER').parse(
      withDefault(obj['STORAGE_PROVIDER'], 'local'),
    ),
    STORAGE_ROOT_PATH: parseOptional(obj['STORAGE_ROOT_PATH'], (v) =>
      parseString(v, 'STORAGE_ROOT_PATH'),
    ),
    STORAGE_PUBLIC_BASE_URL: parseOptional(obj['STORAGE_PUBLIC_BASE_URL'], (v) =>
      parseString(v, 'STORAGE_PUBLIC_BASE_URL', { url: true }),
    ),
    S3_ACCESS_KEY_ID: parseOptional(obj['S3_ACCESS_KEY_ID'], (v) =>
      parseString(v, 'S3_ACCESS_KEY_ID'),
    ),
    S3_SECRET_ACCESS_KEY: parseOptional(obj['S3_SECRET_ACCESS_KEY'], (v) =>
      parseString(v, 'S3_SECRET_ACCESS_KEY'),
    ),
    S3_BUCKET: parseOptional(obj['S3_BUCKET'], (v) => parseString(v, 'S3_BUCKET')),
    S3_REGION: parseOptional(obj['S3_REGION'], (v) => parseString(v, 'S3_REGION')),
    S3_ENDPOINT: parseOptional(obj['S3_ENDPOINT'], (v) =>
      parseString(v, 'S3_ENDPOINT', { url: true }),
    ),
    S3_FORCE_PATH_STYLE: parseOptional(obj['S3_FORCE_PATH_STYLE'], (v) => trueFalseSchema.parse(v)),
    S3_PRESIGN_EXPIRES_IN_SECONDS: parseOptional(obj['S3_PRESIGN_EXPIRES_IN_SECONDS'], (v) =>
      coerceNumber(v, 'S3_PRESIGN_EXPIRES_IN_SECONDS'),
    ),
  };
});

/**
 * Billing environment schema.
 *
 * @complexity O(1)
 */
export const BillingEnvSchema: Schema<BillingEnv> = createSchema<BillingEnv>((data: unknown) => {
  const obj = parseObject(data, 'BillingEnv');
  return {
    BILLING_PROVIDER: parseOptional(obj['BILLING_PROVIDER'], (v) =>
      createEnumSchema(['stripe', 'paypal'] as const, 'BILLING_PROVIDER').parse(v),
    ),
    STRIPE_SECRET_KEY: parseOptional(obj['STRIPE_SECRET_KEY'], (v) =>
      parseString(v, 'STRIPE_SECRET_KEY'),
    ),
    STRIPE_PUBLISHABLE_KEY: parseOptional(obj['STRIPE_PUBLISHABLE_KEY'], (v) =>
      parseString(v, 'STRIPE_PUBLISHABLE_KEY'),
    ),
    STRIPE_WEBHOOK_SECRET: parseOptional(obj['STRIPE_WEBHOOK_SECRET'], (v) =>
      parseString(v, 'STRIPE_WEBHOOK_SECRET'),
    ),
    PAYPAL_CLIENT_ID: parseOptional(obj['PAYPAL_CLIENT_ID'], (v) =>
      parseString(v, 'PAYPAL_CLIENT_ID'),
    ),
    PAYPAL_CLIENT_SECRET: parseOptional(obj['PAYPAL_CLIENT_SECRET'], (v) =>
      parseString(v, 'PAYPAL_CLIENT_SECRET'),
    ),
    PAYPAL_WEBHOOK_ID: parseOptional(obj['PAYPAL_WEBHOOK_ID'], (v) =>
      parseString(v, 'PAYPAL_WEBHOOK_ID'),
    ),
    PAYPAL_MODE: parseOptional(obj['PAYPAL_MODE'], (v) =>
      createEnumSchema(['sandbox', 'production'] as const, 'PAYPAL_MODE').parse(v),
    ),
    BILLING_CURRENCY: parseString(withDefault(obj['BILLING_CURRENCY'], 'usd'), 'BILLING_CURRENCY'),
    PLAN_FREE_ID: parseOptional(obj['PLAN_FREE_ID'], (v) => parseString(v, 'PLAN_FREE_ID')),
    PLAN_PRO_ID: parseOptional(obj['PLAN_PRO_ID'], (v) => parseString(v, 'PLAN_PRO_ID')),
    PLAN_ENTERPRISE_ID: parseOptional(obj['PLAN_ENTERPRISE_ID'], (v) =>
      parseString(v, 'PLAN_ENTERPRISE_ID'),
    ),
    BILLING_PORTAL_RETURN_URL: parseOptional(obj['BILLING_PORTAL_RETURN_URL'], (v) =>
      parseString(v, 'BILLING_PORTAL_RETURN_URL', { url: true }),
    ),
    BILLING_CHECKOUT_SUCCESS_URL: parseOptional(obj['BILLING_CHECKOUT_SUCCESS_URL'], (v) =>
      parseString(v, 'BILLING_CHECKOUT_SUCCESS_URL', { url: true }),
    ),
    BILLING_CHECKOUT_CANCEL_URL: parseOptional(obj['BILLING_CHECKOUT_CANCEL_URL'], (v) =>
      parseString(v, 'BILLING_CHECKOUT_CANCEL_URL', { url: true }),
    ),
  };
});

/**
 * Cache environment schema.
 *
 * @complexity O(1)
 */
export const CacheEnvSchema: Schema<CacheEnv> = createSchema<CacheEnv>((data: unknown) => {
  const obj = parseObject(data, 'CacheEnv');
  return {
    CACHE_PROVIDER: parseOptional(obj['CACHE_PROVIDER'], (v) =>
      createEnumSchema(['local', 'redis'] as const, 'CACHE_PROVIDER').parse(v),
    ),
    CACHE_TTL_MS: coerceNumber(withDefault(obj['CACHE_TTL_MS'], 300000), 'CACHE_TTL_MS'),
    CACHE_MAX_SIZE: coerceNumber(withDefault(obj['CACHE_MAX_SIZE'], 1000), 'CACHE_MAX_SIZE'),
    CACHE_USE_REDIS: parseOptional(obj['CACHE_USE_REDIS'], (v) => trueFalseSchema.parse(v)),
    REDIS_HOST: parseString(withDefault(obj['REDIS_HOST'], 'localhost'), 'REDIS_HOST'),
    REDIS_PORT: coerceNumber(withDefault(obj['REDIS_PORT'], 6379), 'REDIS_PORT'),
    REDIS_PASSWORD: parseOptional(obj['REDIS_PASSWORD'], (v) => parseString(v, 'REDIS_PASSWORD')),
    REDIS_DB: parseOptional(obj['REDIS_DB'], (v) => coerceNumber(v, 'REDIS_DB')),
  };
});

/**
 * Queue environment schema.
 *
 * @complexity O(1)
 */
export const QueueEnvSchema: Schema<QueueEnv> = createSchema<QueueEnv>((data: unknown) => {
  const obj = parseObject(data, 'QueueEnv');
  return {
    QUEUE_PROVIDER: createEnumSchema(['local', 'redis'] as const, 'QUEUE_PROVIDER').parse(
      withDefault(obj['QUEUE_PROVIDER'], 'local'),
    ),
    QUEUE_POLL_INTERVAL_MS: coerceNumber(
      withDefault(obj['QUEUE_POLL_INTERVAL_MS'], 1000),
      'QUEUE_POLL_INTERVAL_MS',
    ),
    QUEUE_CONCURRENCY: coerceNumber(withDefault(obj['QUEUE_CONCURRENCY'], 5), 'QUEUE_CONCURRENCY'),
    QUEUE_MAX_ATTEMPTS: coerceNumber(
      withDefault(obj['QUEUE_MAX_ATTEMPTS'], 3),
      'QUEUE_MAX_ATTEMPTS',
    ),
    QUEUE_BACKOFF_BASE_MS: coerceNumber(
      withDefault(obj['QUEUE_BACKOFF_BASE_MS'], 1000),
      'QUEUE_BACKOFF_BASE_MS',
    ),
    QUEUE_MAX_BACKOFF_MS: coerceNumber(
      withDefault(obj['QUEUE_MAX_BACKOFF_MS'], 300000),
      'QUEUE_MAX_BACKOFF_MS',
    ),
  };
});

/**
 * Server environment schema.
 *
 * @complexity O(1)
 */
export const ServerEnvSchema: Schema<ServerEnv> = createSchema<ServerEnv>((data: unknown) => {
  const obj = parseObject(data, 'ServerEnv');
  return {
    HOST: parseString(withDefault(obj['HOST'], '0.0.0.0'), 'HOST'),
    PORT: coerceNumber(withDefault(obj['PORT'], 8080), 'PORT'),
    API_PORT: parseOptional(obj['API_PORT'], (v) => coerceNumber(v, 'API_PORT')),
    APP_PORT: parseOptional(obj['APP_PORT'], (v) => coerceNumber(v, 'APP_PORT')),
    HEALTH_PORT: coerceNumber(withDefault(obj['HEALTH_PORT'], 8081), 'HEALTH_PORT'),
    MAINTENANCE_MODE: parseOptional(obj['MAINTENANCE_MODE'], (v) => trueFalseSchema.parse(v)),
    RATE_LIMIT_WINDOW_MS: parseOptional(obj['RATE_LIMIT_WINDOW_MS'], (v) =>
      coerceNumber(v, 'RATE_LIMIT_WINDOW_MS'),
    ),
    RATE_LIMIT_MAX: parseOptional(obj['RATE_LIMIT_MAX'], (v) => coerceNumber(v, 'RATE_LIMIT_MAX')),
    PUBLIC_API_URL: parseOptional(obj['PUBLIC_API_URL'], (v) =>
      parseString(v, 'PUBLIC_API_URL', { url: true }),
    ),
    PUBLIC_APP_URL: parseOptional(obj['PUBLIC_APP_URL'], (v) =>
      parseString(v, 'PUBLIC_APP_URL', { url: true }),
    ),
    APP_URL: parseOptional(obj['APP_URL'], (v) => parseString(v, 'APP_URL', { url: true })),
    API_BASE_URL: parseOptional(obj['API_BASE_URL'], (v) =>
      parseString(v, 'API_BASE_URL', { url: true }),
    ),
    APP_BASE_URL: parseOptional(obj['APP_BASE_URL'], (v) =>
      parseString(v, 'APP_BASE_URL', { url: true }),
    ),
    CORS_ORIGIN: parseOptional(obj['CORS_ORIGIN'], (v) => parseString(v, 'CORS_ORIGIN')),
    CORS_ORIGINS: parseOptional(obj['CORS_ORIGINS'], (v) => parseString(v, 'CORS_ORIGINS')),
    LOG_LEVEL: createEnumSchema(['debug', 'info', 'warn', 'error'] as const, 'LOG_LEVEL').parse(
      withDefault(obj['LOG_LEVEL'], 'info'),
    ),
    AUDIT_RETENTION_DAYS: parseOptional(obj['AUDIT_RETENTION_DAYS'], (v) =>
      coerceNumber(v, 'AUDIT_RETENTION_DAYS'),
    ),
    LOG_CLIENT_ERROR_LEVEL: parseOptional(obj['LOG_CLIENT_ERROR_LEVEL'], (v) =>
      createEnumSchema(['debug', 'info', 'warn', 'error'] as const, 'LOG_CLIENT_ERROR_LEVEL').parse(
        v,
      ),
    ),
    LOG_REQUEST_CONTEXT: parseOptional(obj['LOG_REQUEST_CONTEXT'], (v) => trueFalseSchema.parse(v)),
    LOG_PRETTY_JSON: parseOptional(obj['LOG_PRETTY_JSON'], (v) => trueFalseSchema.parse(v)),
  };
});

/**
 * Search environment schema.
 *
 * @complexity O(1)
 */
export const SearchEnvSchema: Schema<SearchEnv> = createSchema<SearchEnv>((data: unknown) => {
  const obj = parseObject(data, 'SearchEnv');
  return {
    SEARCH_PROVIDER: createEnumSchema(['sql', 'elasticsearch'] as const, 'SEARCH_PROVIDER').parse(
      withDefault(obj['SEARCH_PROVIDER'], 'sql'),
    ),
    ELASTICSEARCH_NODE: parseOptional(obj['ELASTICSEARCH_NODE'], (v) =>
      parseString(v, 'ELASTICSEARCH_NODE'),
    ),
    ELASTICSEARCH_INDEX: parseOptional(obj['ELASTICSEARCH_INDEX'], (v) =>
      parseString(v, 'ELASTICSEARCH_INDEX'),
    ),
    ELASTICSEARCH_USERNAME: parseOptional(obj['ELASTICSEARCH_USERNAME'], (v) =>
      parseString(v, 'ELASTICSEARCH_USERNAME'),
    ),
    ELASTICSEARCH_PASSWORD: parseOptional(obj['ELASTICSEARCH_PASSWORD'], (v) =>
      parseString(v, 'ELASTICSEARCH_PASSWORD'),
    ),
    ELASTICSEARCH_API_KEY: parseOptional(obj['ELASTICSEARCH_API_KEY'], (v) =>
      parseString(v, 'ELASTICSEARCH_API_KEY'),
    ),
    ELASTICSEARCH_TLS: parseOptional(obj['ELASTICSEARCH_TLS'], (v) => trueFalseSchema.parse(v)),
    ELASTICSEARCH_REQUEST_TIMEOUT_MS: parseOptional(obj['ELASTICSEARCH_REQUEST_TIMEOUT_MS'], (v) =>
      coerceNumber(v, 'ELASTICSEARCH_REQUEST_TIMEOUT_MS'),
    ),
    SQL_SEARCH_DEFAULT_PAGE_SIZE: parseOptional(obj['SQL_SEARCH_DEFAULT_PAGE_SIZE'], (v) =>
      coerceNumber(v, 'SQL_SEARCH_DEFAULT_PAGE_SIZE'),
    ),
    SQL_SEARCH_MAX_PAGE_SIZE: parseOptional(obj['SQL_SEARCH_MAX_PAGE_SIZE'], (v) =>
      coerceNumber(v, 'SQL_SEARCH_MAX_PAGE_SIZE'),
    ),
    SQL_SEARCH_MAX_QUERY_DEPTH: parseOptional(obj['SQL_SEARCH_MAX_QUERY_DEPTH'], (v) =>
      coerceNumber(v, 'SQL_SEARCH_MAX_QUERY_DEPTH'),
    ),
    SQL_SEARCH_MAX_CONDITIONS: parseOptional(obj['SQL_SEARCH_MAX_CONDITIONS'], (v) =>
      coerceNumber(v, 'SQL_SEARCH_MAX_CONDITIONS'),
    ),
    SQL_SEARCH_LOGGING: parseOptional(obj['SQL_SEARCH_LOGGING'], (v) => trueFalseSchema.parse(v)),
    SQL_SEARCH_TIMEOUT_MS: parseOptional(obj['SQL_SEARCH_TIMEOUT_MS'], (v) =>
      coerceNumber(v, 'SQL_SEARCH_TIMEOUT_MS'),
    ),
  };
});

/**
 * Package manager environment schema.
 *
 * @complexity O(1)
 */
export const PackageManagerEnvSchema: Schema<PackageManagerEnv> = createSchema<PackageManagerEnv>(
  (data: unknown) => {
    const obj = parseObject(data, 'PackageManagerEnv');
    return {
      PACKAGE_MANAGER_PROVIDER: createEnumSchema(
        ['npm', 'pnpm', 'yarn'] as const,
        'PACKAGE_MANAGER_PROVIDER',
      ).parse(withDefault(obj['PACKAGE_MANAGER_PROVIDER'], 'pnpm')),
      NPM_AUDIT: trueFalseSchema.parse(withDefault(obj['NPM_AUDIT'], 'true')),
      NPM_LEGACY_PEER_DEPS: trueFalseSchema.parse(
        withDefault(obj['NPM_LEGACY_PEER_DEPS'], 'false'),
      ),
      NPM_REGISTRY: parseOptional(obj['NPM_REGISTRY'], (v) => parseString(v, 'NPM_REGISTRY')),
      PNPM_STRICT_PEER_DEPS: trueFalseSchema.parse(
        withDefault(obj['PNPM_STRICT_PEER_DEPS'], 'true'),
      ),
      PNPM_FROZEN_LOCKFILE: trueFalseSchema.parse(withDefault(obj['PNPM_FROZEN_LOCKFILE'], 'true')),
      PNPM_REGISTRY: parseOptional(obj['PNPM_REGISTRY'], (v) => parseString(v, 'PNPM_REGISTRY')),
      YARN_AUDIT: trueFalseSchema.parse(withDefault(obj['YARN_AUDIT'], 'true')),
      YARN_FROZEN_LOCKFILE: trueFalseSchema.parse(withDefault(obj['YARN_FROZEN_LOCKFILE'], 'true')),
      YARN_REGISTRY: parseOptional(obj['YARN_REGISTRY'], (v) => parseString(v, 'YARN_REGISTRY')),
    };
  },
);

/**
 * Frontend environment schema.
 *
 * @complexity O(1)
 */
export const FrontendEnvSchema: Schema<FrontendEnv> = createSchema<FrontendEnv>((data: unknown) => {
  const obj = parseObject(data, 'FrontendEnv');
  return {
    VITE_API_URL: parseOptional(obj['VITE_API_URL'], (v) =>
      parseString(v, 'VITE_API_URL', { url: true }),
    ),
    VITE_APP_NAME: parseOptional(obj['VITE_APP_NAME'], (v) => parseString(v, 'VITE_APP_NAME')),
  };
});

// ============================================================================
// Production Validation Guards
// ============================================================================

/**
 * Cross-field validation for production environments.
 * Throws descriptive errors for missing/weak configuration.
 *
 * @param env - The parsed environment object
 * @throws Error if production guards fail
 * @complexity O(1)
 */
function validateProductionGuards(env: FullEnv): void {
  const isProd = env.NODE_ENV === 'production';

  // 1. Production Database Enforcement
  if (isProd) {
    const hasPostgres =
      (env.DATABASE_URL !== undefined && env.DATABASE_URL !== '') ||
      (env.POSTGRES_HOST !== undefined &&
        env.POSTGRES_USER !== undefined &&
        env.POSTGRES_PASSWORD !== undefined);

    const hasSqlite = env.SQLITE_FILE_PATH !== undefined && env.SQLITE_FILE_PATH !== '';
    const hasMongo =
      env.MONGODB_CONNECTION_STRING !== undefined && env.MONGODB_CONNECTION_STRING !== '';

    if (!hasPostgres && !hasSqlite && !hasMongo) {
      throw new Error('Production requires a valid database configuration (URL or host/user/pass)');
    }
  }

  // 2. Production Secret Strength (Basic check)
  if (isProd) {
    const weakSecrets = ['secret', 'password', 'changeme', 'jwt_secret', 'dev', 'prod', 'test'];
    if (weakSecrets.includes(env.JWT_SECRET.toLowerCase()) || env.JWT_SECRET.length < 32) {
      throw new Error(
        'Security Risk: JWT_SECRET must be at least 32 characters and not a common word in production',
      );
    }
  }

  // 3. URL Cross-Validation (Consistency)
  if (
    env.PUBLIC_API_URL !== undefined &&
    env.PUBLIC_API_URL !== '' &&
    env.VITE_API_URL !== undefined &&
    env.VITE_API_URL !== '' &&
    env.PUBLIC_API_URL !== env.VITE_API_URL
  ) {
    throw new Error(
      'Consistency Error: PUBLIC_API_URL and VITE_API_URL must match if both are provided',
    );
  }
}

// ============================================================================
// Combined Environment Schema
// ============================================================================

/**
 * Parse all fields from the combined environment object.
 *
 * @param obj - Record from parseObject
 * @returns Parsed FullEnv with all sub-schemas merged
 * @complexity O(n) where n = total number of env vars
 */
function parseAllEnvFields(obj: Record<string, unknown>): FullEnv {
  const base = BaseEnvSchema.parse(obj);
  const jwt: JwtEnv = {
    JWT_SECRET: parseString(obj['JWT_SECRET'], 'JWT_SECRET', { min: 32 }),
    JWT_SECRET_PREVIOUS: parseOptional(obj['JWT_SECRET_PREVIOUS'], (v) =>
      parseString(v, 'JWT_SECRET_PREVIOUS'),
    ),
    JWT_ISSUER: parseString(withDefault(obj['JWT_ISSUER'], 'abe-stack'), 'JWT_ISSUER'),
    JWT_AUDIENCE: parseString(withDefault(obj['JWT_AUDIENCE'], 'abe-stack-api'), 'JWT_AUDIENCE'),
  };
  const database = DatabaseEnvSchema.parse(obj);
  const auth = AuthEnvSchema.parse(obj);
  const email = EmailEnvSchema.parse(obj);
  const storage = StorageEnvSchema.parse(obj);
  const billing = BillingEnvSchema.parse(obj);
  const cache = CacheEnvSchema.parse(obj);
  const queue = QueueEnvSchema.parse(obj);
  const server = ServerEnvSchema.parse(obj);
  const search = SearchEnvSchema.parse(obj);
  const packageManager = PackageManagerEnvSchema.parse(obj);
  const notifications = NotificationEnvSchema.parse(obj);
  const frontend = FrontendEnvSchema.parse(obj);

  return {
    ...base,
    ...jwt,
    ...database,
    ...auth,
    ...email,
    ...storage,
    ...billing,
    ...cache,
    ...queue,
    ...server,
    ...search,
    ...packageManager,
    ...notifications,
    ...frontend,
  };
}

/**
 * Combined environment schema for the entire application.
 * Validates all sub-schemas and runs cross-field production guards.
 *
 * @complexity O(n) where n = total number of env vars
 */
export const EnvSchema: Schema<FullEnv> = createSchema<FullEnv>((data: unknown) => {
  const obj = parseObject(data, 'Environment');
  const env = parseAllEnvFields(obj);
  validateProductionGuards(env);
  return env;
});
