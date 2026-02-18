// main/shared/src/config/constants.ts
/**
 * Universal configuration constants.
 *
 * All config-level defaults and security constants that are platform-agnostic
 * (no Node.js dependencies). Server config loaders import from here instead
 * of hardcoding magic numbers.
 */

// ============================================================================
// Auth Strategies
// ============================================================================

/** All supported authentication strategies. */
export const AUTH_STRATEGIES = [
  'local', 'magic', 'webauthn', 'google', 'github',
  'facebook', 'microsoft', 'apple',
] as const;

// ============================================================================
// Secret Validation
// ============================================================================

/** Secrets that must never be used as JWT/cookie secrets. */
export const WEAK_SECRETS: ReadonlySet<string> = new Set([
  'secret', 'password', 'jwt_secret', 'changeme', 'test', 'dev', 'prod',
]);

/** Detects repeating-character patterns (e.g. "aaaa..." 32+ times). */
export const REPEATING_SECRET_PATTERN = /^(.)\1{31,}$/;

// ============================================================================
// Argon2 (OWASP defaults)
// ============================================================================

/** Argon2id OWASP-recommended parameters for password hashing. */
export const ARGON2_DEFAULTS = {
  TYPE: 2,           // argon2id
  MEMORY_COST: 19456,
  TIME_COST: 2,
  PARALLELISM: 1,
} as const;

// ============================================================================
// Provider Enums
// ============================================================================

export const BILLING_PROVIDERS = ['stripe', 'paypal'] as const;
export const DATABASE_PROVIDERS = ['postgresql', 'sqlite', 'mongodb', 'json'] as const;
export const STORAGE_PROVIDERS = ['local', 's3'] as const;
export const SEARCH_PROVIDERS = ['sql', 'elasticsearch'] as const;
export const QUEUE_PROVIDERS = ['local', 'redis'] as const;
export const CACHE_PROVIDERS = ['local', 'redis'] as const;
export const NOTIFICATION_PROVIDERS = [
  'onesignal', 'courier', 'knock', 'fcm', 'sns', 'braze', 'generic',
] as const;
export const PACKAGE_MANAGER_PROVIDERS = ['npm', 'pnpm', 'yarn'] as const;

// ============================================================================
// Infrastructure Defaults
// ============================================================================

/** Default database name for development environments. */
export const DEFAULT_DATABASE_NAME = 'bslt_dev';

/** PostgreSQL, MongoDB, SQLite default connection parameters. */
export const DB_DEFAULTS = {
  DEFAULT_DATABASE_NAME,
  POSTGRES_PORT: 5432,
  POSTGRES_PORT_FALLBACKS: [5432, 5433, 5434] as readonly number[],
  POSTGRES_MAX_CONNECTIONS_DEV: 10,
  POSTGRES_MAX_CONNECTIONS_PROD: 20,
  MONGODB_DEFAULT_URL: `mongodb://localhost:27017/${DEFAULT_DATABASE_NAME}`,
  MONGODB_CONNECT_TIMEOUT_MS: 30_000,
  MONGODB_SOCKET_TIMEOUT_MS: 30_000,
  SQLITE_TIMEOUT_MS: 5000,
} as const;

/** Default SMTP transport parameters. */
export const SMTP_DEFAULTS = {
  PORT: 587,
  CONNECTION_TIMEOUT_MS: 5000,
  SOCKET_TIMEOUT_MS: 30_000,
} as const;

/** Default cache parameters. */
export const CACHE_DEFAULTS = {
  TTL_MS: 300_000,   // 5 minutes
  MAX_SIZE: 1000,
} as const;

/** Default S3-compatible storage parameters. */
export const S3_DEFAULTS = {
  PRESIGN_EXPIRES_SECONDS: 3600,
} as const;

/** Default background queue parameters. */
export const QUEUE_DEFAULTS = {
  POLL_INTERVAL_MS: 1000,
  CONCURRENCY: 5,
  MAX_ATTEMPTS: 3,
  BACKOFF_BASE_MS: 1000,
  MAX_BACKOFF_MS: 300_000, // 5 minutes
} as const;

/** Global and endpoint-level rate limiting defaults. */
export const RATE_LIMIT_DEFAULTS = {
  GLOBAL_WINDOW_MS: 60_000,
  GLOBAL_MAX_PROD: 100,
  GLOBAL_MAX_DEV: 1000,
  LOGIN_MAX_PROD: 5,
  LOGIN_MAX_DEV: 100,
  REGISTER_MAX_PROD: 3,
  REGISTER_MAX_DEV: 100,
  FORGOT_PASSWORD_MAX_PROD: 3,
  FORGOT_PASSWORD_MAX_DEV: 100,
  VERIFY_EMAIL_MAX_PROD: 10,
  VERIFY_EMAIL_MAX_DEV: 100,
  PROGRESSIVE_BASE_DELAY_MS: 1000,
  PROGRESSIVE_MAX_DELAY_MS: 10_000,
  PROGRESSIVE_BACKOFF_FACTOR: 2,
} as const;

/** Default SQL search pagination parameters. */
export const SEARCH_DEFAULTS = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 1000,
} as const;

/** Default Elasticsearch connection parameters. */
export const ELASTICSEARCH_DEFAULTS = {
  NODE: 'http://localhost:9200',
  INDEX: 'default',
} as const;

/** Ports the server tries when the primary port is taken. */
export const SERVER_PORT_FALLBACKS = [8080, 3000, 5000, 8000] as const;

/** Default Courier notification API base URL. */
export const COURIER_DEFAULT_API_URL = 'https://api.courier.com';

// ============================================================================
// Auth Validation Thresholds
// ============================================================================

/** Security thresholds for auth config validation. */
export const AUTH_VALIDATION = {
  MIN_SECRET_LENGTH: 32,
  LOCKOUT_MIN_ATTEMPTS: 3,
  LOCKOUT_MAX_ATTEMPTS: 20,
  LOCKOUT_MIN_DURATION_MS: 60_000,
  REFRESH_TOKEN_MIN_DAYS: 1,
  REFRESH_TOKEN_MAX_DAYS: 30,
  PASSWORD_MIN_LENGTH: 8,
} as const;
