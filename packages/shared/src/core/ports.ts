// shared/src/infra/ports.ts
/**
 * Infrastructure Ports (Contracts)
 *
 * Core infrastructure contracts that define the "ports" for external services.
 * These interfaces represent the abstraction layer between the application
 * and external infrastructure concerns like storage, email, etc.
 */

// ============================================================================
// Storage Port
// ============================================================================

/**
 * Storage Provider Types
 */
export type StorageProvider =
  | 'local' // Local filesystem storage
  | 's3' // AWS S3 compatible (includes MinIO, R2, Spaces)
  | 'gcs' // Google Cloud Storage
  | 'azure' // Azure Blob Storage
  | 'database' // Store files in database (for small files)
  | 'memory'; // In-memory storage (for testing)

/**
 * Minimal interface for readable streams.
 * Avoids leaking DOM-only types into consumers without lib: ["DOM"].
 */
export interface ReadableStreamLike<R = unknown> {
  getReader(): ReadableStreamDefaultReaderLike<R>;
}

interface ReadableStreamDefaultReaderLike<R> {
  read(): Promise<{ done: boolean; value?: R }>;
  releaseLock(): void;
}

/**
 * Storage client contract used by modules.
 */
export interface StorageClient {
  /**
   * Upload binary or text data to storage.
   * Supports streams for memory-efficient handling of large files (audio/models).
   */
  upload(
    key: string,
    data: Uint8Array | string | ReadableStreamLike<Uint8Array>,
    contentType: string,
  ): Promise<string>;

  /**
   * Retrieves a file as a raw Uint8Array.
   * Best for small files (metadata, avatars).
   */
  download(key: string): Promise<Uint8Array>;

  /**
   * Provides a memory-efficient download stream.
   * Critical for processing large audio files or AI model checkpoints.
   */
  downloadStream(key: string): Promise<ReadableStreamLike<Uint8Array>>;

  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

/**
 * Base storage configuration shared by all providers.
 */
export interface BaseStorageConfig {
  /** Storage provider type */
  provider: StorageProvider;
  /** Base URL for public access */
  baseUrl?: string;
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Allowed file types (MIME types or extensions) */
  allowedTypes: string[];
  /** Default ACL for uploaded files */
  defaultAcl?: 'private' | 'public-read';
  /** Cache control settings */
  cacheControl?: string;
  /** Whether to generate unique filenames */
  uniqueFilenames?: boolean;
  /** Path prefix for all files */
  pathPrefix?: string;
}

/**
 * Local filesystem storage configuration.
 */
export interface LocalStorageConfig extends BaseStorageConfig {
  provider: 'local';
  /** Absolute or relative path to storage directory */
  rootPath: string;
  /** Public URL base for serving files (e.g., http://localhost:8080/uploads) */
  publicBaseUrl?: string;
}

/**
 * S3-compatible storage configuration (works with AWS S3, MinIO, Cloudflare R2, etc.).
 */
export interface S3StorageConfig extends BaseStorageConfig {
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

/**
 * Storage configuration union type
 */
export type StorageConfig = LocalStorageConfig | S3StorageConfig;

// ============================================================================
// Email Port
// ============================================================================

/**
 * Email service contract
 */
export interface EmailService {
  /**
   * Send an email
   */
  send(options: EmailOptions): Promise<SendResult>;

  /**
   * Check if the email service is healthy
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Email options
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Attachment[];
}

/**
 * Email attachment
 */
export interface Attachment {
  filename: string;
  content: Uint8Array | string;
  contentType?: string;
}

/**
 * Send result
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// Job Queue Port
// ============================================================================

/**
 * Job queue service contract
 */
export interface JobQueueService {
  /**
   * Add a job to the queue
   */
  add<T = unknown>(name: string, data: T, options?: JobOptions): Promise<Job<T>>;

  /**
   * Process jobs of a specific type
   */
  process<T = unknown>(name: string, handler: JobHandler<T>): void;

  /**
   * Check queue health
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Job handler function
 */
export type JobHandler<T = unknown> = (job: Job<T>) => Promise<void>;

/**
 * Job options
 */
export interface JobOptions {
  delay?: number; // Delay in milliseconds
  attempts?: number; // Number of retry attempts
  priority?: 'low' | 'normal' | 'high'; // Priority level
}

/**
 * Job interface
 */
export interface Job<T = unknown> {
  id: string;
  name: string;
  data: T;
  attempts: number;
  timestamp: Date;
  process(): Promise<void>;
}

// ============================================================================
// Cache Port
// ============================================================================

/**
 * Cache service contract
 */
export interface CacheService {
  /**
   * Get a value from cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache
   */
  set(key: string, value: unknown, ttl?: number): Promise<void>;

  /**
   * Delete a value from cache
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if a key exists in cache
   */
  has(key: string): Promise<boolean>;

  /**
   * Clear all cache
   */
  clear(): Promise<void>;
}

// ============================================================================
// Monitoring Port
// ============================================================================

/**
 * Metrics service contract
 */
export interface MetricsService {
  /**
   * Increment a counter
   */
  increment(name: string, value?: number, labels?: Record<string, string>): void;

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Start a timer
   */
  startTimer(name: string, labels?: Record<string, string>): () => number;
}

// ============================================================================
// Configuration Port
// ============================================================================

/**
 * Configuration service contract
 */
export interface ConfigService {
  /**
   * Get a configuration value
   */
  get<T>(key: string, defaultValue?: T): T | undefined;

  /**
   * Check if a configuration key exists
   */
  has(key: string): boolean;

  /**
   * Get all configuration values
   */
  getAll(): Record<string, unknown>;
}

// ============================================================================
// Common Infrastructure Types
// ============================================================================

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  details?: Record<string, unknown>;
  error?: string;
}

/**
 * Infrastructure service interface
 */
export interface InfrastructureService {
  /**
   * Initialize the service
   */
  initialize(): Promise<void>;

  /**
   * Check service health
   */
  healthCheck(): Promise<HealthCheckResult>;

  /**
   * Shutdown the service gracefully
   */
  shutdown(): Promise<void>;
}
