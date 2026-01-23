// packages/core/src/contracts/config/infra.ts
/**
 * Infrastructure Configuration Contracts
 *
 * These types define the shape of all infrastructure-level configurations.
 * They are consumed by the server's config loaders and validated at startup.
 */

import type { LogLevel as ConsoleLogLevel } from '../../infrastructure/logger/console';

// ============================================================================
// Primitive Types
// ============================================================================

export type DatabaseProvider = 'postgresql' | 'json';
export type StorageProviderName = 'local' | 's3';
export type QueueProvider = 'local' | 'redis';
export type LogLevel = ConsoleLogLevel;

// ============================================================================
// Database Configuration
// ============================================================================

/**
 * PostgreSQL database configuration.
 * Supports both connection string and individual credentials.
 */
export interface PostgresConfig {
  provider: 'postgresql';
  /** Database server hostname */
  host: string;
  /** Database server port (default: 5432) */
  port: number;
  /** Database name */
  database: string;
  /** Database user */
  user: string;
  /** Database password */
  password: string;
  /** Full connection string (takes precedence over individual fields) */
  connectionString?: string;
  /** Maximum number of connections in the pool */
  maxConnections: number;
  /** Alternative ports to try if primary is unavailable (dev convenience) */
  portFallbacks: number[];
  /** Enable SSL/TLS connection (required for most cloud providers) */
  ssl: boolean;
}

/**
 * JSON file-based database configuration.
 * Useful for development, prototyping, or simple deployments.
 */
export interface JsonDatabaseConfig {
  provider: 'json';
  /** Path to the JSON database file */
  filePath: string;
  /** Write changes to disk immediately (disable for better performance) */
  persistOnWrite: boolean;
}

export type DatabaseConfig = PostgresConfig | JsonDatabaseConfig;

// ============================================================================
// Cache Configuration
// ============================================================================

/**
 * Application cache configuration.
 * Supports in-memory caching with optional Redis backend for scaling.
 */
export interface CacheConfig {
  /** Time-to-live for cache entries in milliseconds */
  ttl: number;
  /** Maximum number of items to store in cache */
  maxSize: number;
  /** Use external provider (Redis) instead of in-memory cache */
  useExternalProvider: boolean;
  /** External provider connection settings */
  externalConfig?: {
    host: string;
    port: number;
  };
}

// ============================================================================
// Queue Configuration
// ============================================================================

/**
 * Background job queue configuration.
 * Supports local polling or Redis-backed distributed workers.
 */
export interface QueueConfig {
  /** Queue backend provider */
  provider: QueueProvider;
  /** How often to poll for new jobs (milliseconds) */
  pollIntervalMs: number;
  /** Number of jobs to process concurrently */
  concurrency: number;
  /** Maximum retry attempts for failed jobs */
  defaultMaxAttempts: number;
  /** Base delay for exponential backoff (milliseconds) */
  backoffBaseMs: number;
  /** Maximum backoff delay cap (milliseconds) */
  maxBackoffMs: number;
}

// ============================================================================
// Server Configuration
// ============================================================================

/**
 * HTTP server configuration.
 * Controls binding, CORS, rate limiting, and operational settings.
 */
export interface ServerConfig {
  /** Hostname to bind (use '0.0.0.0' for Docker/container environments) */
  host: string;
  /** Primary port to listen on */
  port: number;
  /** Fallback ports if primary is busy (development convenience) */
  portFallbacks: number[];
  /** CORS settings for cross-origin requests */
  cors: {
    /** Allowed origins (expand for multi-app setups: web, desktop, admin) */
    origin: string[];
    /** Allow credentials (cookies, authorization headers) */
    credentials: boolean;
    /** Allowed HTTP methods */
    methods: string[];
  };
  /** Trust X-Forwarded-* headers from reverse proxies */
  trustProxy: boolean;
  /** Logging verbosity level */
  logLevel: LogLevel;
  /** Enable maintenance mode (rejects all requests with 503) */
  maintenanceMode: boolean;
  /** Frontend application URL (used in email links, redirects) */
  appBaseUrl: string;
  /** API server URL (used for OAuth callbacks, webhooks) */
  apiBaseUrl: string;
  /** Global rate limiting settings */
  rateLimit: {
    /** Time window for rate limiting (milliseconds) */
    windowMs: number;
    /** Maximum requests per window */
    max: number;
  };
}

// ============================================================================
// Storage Configuration
// ============================================================================

/**
 * Base storage configuration shared by all providers.
 */
export interface StorageConfigBase {
  provider: StorageProviderName;
}

/**
 * Local filesystem storage configuration.
 * Best for development and single-server deployments.
 */
export interface LocalStorageConfig extends StorageConfigBase {
  provider: 'local';
  /** Absolute or relative path to the storage directory */
  rootPath: string;
  /** Public URL base for serving files (e.g., http://localhost:8080/uploads) */
  publicBaseUrl?: string;
}

/**
 * S3-compatible storage configuration.
 * Works with AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces.
 */
export interface S3StorageConfig extends StorageConfigBase {
  provider: 's3';
  /** AWS access key ID */
  accessKeyId: string;
  /** AWS secret access key */
  secretAccessKey: string;
  /** AWS region (e.g., 'us-east-1') */
  region: string;
  /** S3 bucket name */
  bucket: string;
  /** Custom endpoint for S3-compatible services (MinIO, R2, Spaces) */
  endpoint?: string;
  /** Use path-style URLs instead of virtual-hosted (required for MinIO) */
  forcePathStyle: boolean;
  /** Presigned URL expiration time in seconds */
  presignExpiresInSeconds: number;
}

export type StorageConfig = LocalStorageConfig | S3StorageConfig;
