/**
 * Application Config
 *
 * For raw environment variables: import from './env'
 * For app configuration: import from here
 */
import { clientEnv } from './env';

// ============================================
// API Config
// ============================================

export const apiConfig = {
  url: clientEnv.apiUrl,
  wsUrl: clientEnv.wsUrl,
  prefix: '/api',
} as const;

// ============================================
// Auth Config
// ============================================

export const authConfig = {
  sessionMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  cookieName: 'session',
  cookieOptions: {
    httpOnly: true,
    secure: !clientEnv.isDev,
    sameSite: 'lax' as const,
    path: '/',
  },
} as const;

// ============================================
// Server Config (backend only)
// ============================================

export const serverConfig = {
  port: Number(process.env.PORT || process.env.API_PORT || 8080),
  host: process.env.HOST || '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN || true,
  cookieSecret: process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'dev-secret',
} as const;

// ============================================
// Database Config (backend only)
// ============================================

export const dbConfig = {
  url: process.env.DATABASE_URL || '',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || 'abe_stack_dev',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '',
  maxConnections: Number(process.env.DB_MAX_CONNECTIONS || 10),
} as const;

// ============================================
// Storage Config (backend only)
// ============================================

export const storageConfig = {
  provider: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 's3',
  localPath: process.env.STORAGE_ROOT_PATH || './uploads',
  publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
  s3Bucket: process.env.S3_BUCKET,
  s3Region: process.env.S3_REGION,
} as const;

// ============================================
// Combined Config
// ============================================

export const config = {
  api: apiConfig,
  auth: authConfig,
  server: serverConfig,
  db: dbConfig,
  storage: storageConfig,
  app: {
    env: clientEnv.isDev ? ('development' as const) : ('production' as const),
    isDev: clientEnv.isDev,
    isServer: clientEnv.isServer,
    isClient: clientEnv.isClient,
  },
} as const;

export type Config = typeof config;
