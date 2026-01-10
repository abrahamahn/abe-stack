/**
 * Global Configuration - Single Source of Truth
 *
 * All apps (server, web, desktop, mobile) import from here.
 * Environment-specific values come from process.env or import.meta.env
 */

// Detect environment
const isDev = process.env.NODE_ENV !== 'production';
// Use globalThis for isomorphic window check (works in Node.js and browser)
const isServer = typeof (globalThis as { window?: unknown }).window === 'undefined';

/**
 * API Configuration
 */
export const apiConfig = {
  /** Base URL for API calls */
  url: process.env.API_URL || 'http://localhost:8080',
  /** WebSocket URL for real-time updates */
  wsUrl: process.env.WS_URL || 'ws://localhost:8080',
  /** API prefix */
  prefix: '/api',
} as const;

/**
 * Auth Configuration
 */
export const authConfig = {
  /** Session max age in milliseconds (7 days) */
  sessionMaxAge: 7 * 24 * 60 * 60 * 1000,
  /** Cookie name for session */
  cookieName: 'session',
  /** Cookie options */
  cookieOptions: {
    httpOnly: true,
    secure: !isDev,
    sameSite: 'lax' as const,
    path: '/',
  },
} as const;

/**
 * Server Configuration (only used by backend)
 */
export const serverConfig = {
  /** Server port */
  port: Number(process.env.PORT || process.env.API_PORT || 8080),
  /** Server host */
  host: process.env.HOST || '0.0.0.0',
  /** CORS origin */
  corsOrigin: process.env.CORS_ORIGIN || true,
  /** Cookie secret */
  cookieSecret:
    process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production',
} as const;

/**
 * Database Configuration (only used by backend)
 */
export const dbConfig = {
  /** Database URL */
  url: process.env.DATABASE_URL || '',
  /** Postgres host */
  host: process.env.POSTGRES_HOST || 'localhost',
  /** Postgres port */
  port: Number(process.env.POSTGRES_PORT || 5432),
  /** Postgres database */
  database: process.env.POSTGRES_DB || 'abe_stack_dev',
  /** Postgres user */
  user: process.env.POSTGRES_USER || 'postgres',
  /** Postgres password */
  password: process.env.POSTGRES_PASSWORD || '',
  /** Max connections */
  maxConnections: Number(process.env.DB_MAX_CONNECTIONS || 10),
} as const;

/**
 * Storage Configuration (only used by backend)
 */
export const storageConfig = {
  /** Storage provider: 'local' or 's3' */
  provider: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 's3',
  /** Local storage root path */
  localPath: process.env.STORAGE_ROOT_PATH || './uploads',
  /** Public base URL for files */
  publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
  /** S3 bucket */
  s3Bucket: process.env.S3_BUCKET,
  /** S3 region */
  s3Region: process.env.S3_REGION,
} as const;

/**
 * App Configuration
 */
export const appConfig = {
  /** Environment mode */
  env: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  /** Is development mode */
  isDev,
  /** Is server-side */
  isServer,
  /** Is client-side */
  isClient: !isServer,
} as const;

/**
 * Combined config object for convenience
 */
export const config = {
  api: apiConfig,
  auth: authConfig,
  server: serverConfig,
  db: dbConfig,
  storage: storageConfig,
  app: appConfig,
} as const;

export type Config = typeof config;
