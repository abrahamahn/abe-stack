// packages/core/src/domains/cache/errors.ts
/**
 * Cache-Specific Errors
 *
 * Error types for cache operations including connection failures,
 * serialization errors, and capacity limits.
 */

import { HTTP_STATUS } from '../../infrastructure/constants';
import { AppError } from '../../infrastructure/errors';

// ============================================================================
// Base Cache Error
// ============================================================================

/**
 * Base error for all cache-related errors.
 */
export class CacheError extends AppError {
  public readonly cacheErrorCause?: Error;

  constructor(message: string, code?: string, cause?: Error) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, code);
    this.cacheErrorCause = cause;
  }
}

// ============================================================================
// Connection Errors
// ============================================================================

/**
 * Cache connection failed or was lost.
 */
export class CacheConnectionError extends CacheError {
  constructor(
    public readonly providerName: string,
    message = 'Failed to connect to cache',
    cause?: Error,
  ) {
    super(`${message}: ${providerName}`, 'CACHE_CONNECTION_ERROR', cause);
  }
}

/**
 * Cache operation timed out.
 */
export class CacheTimeoutError extends CacheError {
  constructor(
    public readonly operation: string,
    public readonly timeoutMs: number,
    cause?: Error,
  ) {
    super(
      `Cache operation '${operation}' timed out after ${String(timeoutMs)}ms`,
      'CACHE_TIMEOUT',
      cause,
    );
  }
}

// ============================================================================
// Operation Errors
// ============================================================================

/**
 * Failed to serialize value for caching.
 */
export class CacheSerializationError extends CacheError {
  constructor(
    public readonly key: string,
    cause?: Error,
  ) {
    super(`Failed to serialize value for key: ${key}`, 'CACHE_SERIALIZATION_ERROR', cause);
  }
}

/**
 * Failed to deserialize cached value.
 */
export class CacheDeserializationError extends CacheError {
  constructor(
    public readonly key: string,
    cause?: Error,
  ) {
    super(`Failed to deserialize value for key: ${key}`, 'CACHE_DESERIALIZATION_ERROR', cause);
  }
}

/**
 * Cache key is invalid (too long, contains invalid characters, etc.).
 */
export class CacheInvalidKeyError extends CacheError {
  constructor(
    public readonly key: string,
    public readonly reason: string,
  ) {
    super(`Invalid cache key '${key}': ${reason}`, 'CACHE_INVALID_KEY');
  }
}

// ============================================================================
// Capacity Errors
// ============================================================================

/**
 * Cache has reached its maximum capacity.
 */
export class CacheCapacityError extends CacheError {
  constructor(
    public readonly currentSize: number,
    public readonly maxSize: number,
  ) {
    super(
      `Cache capacity exceeded: ${String(currentSize)}/${String(maxSize)} entries`,
      'CACHE_CAPACITY_EXCEEDED',
    );
  }
}

/**
 * Cache memory limit exceeded.
 */
export class CacheMemoryLimitError extends CacheError {
  constructor(
    public readonly currentBytes: number,
    public readonly maxBytes: number,
  ) {
    super(
      `Cache memory limit exceeded: ${formatBytes(currentBytes)}/${formatBytes(maxBytes)}`,
      'CACHE_MEMORY_LIMIT',
    );
  }
}

// ============================================================================
// Provider Errors
// ============================================================================

/**
 * Unsupported cache provider type.
 */
export class CacheProviderNotFoundError extends CacheError {
  constructor(public readonly providerType: string) {
    super(`Unsupported cache provider: ${providerType}`, 'CACHE_PROVIDER_NOT_FOUND');
  }
}

/**
 * Cache provider is not initialized or has been closed.
 */
export class CacheNotInitializedError extends CacheError {
  constructor(public readonly providerName: string) {
    super(`Cache provider '${providerName}' is not initialized`, 'CACHE_NOT_INITIALIZED');
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an error is a CacheError.
 */
export function isCacheError(error: unknown): error is CacheError {
  return error instanceof CacheError;
}

/**
 * Check if an error is a connection-related cache error.
 */
export function isCacheConnectionError(error: unknown): error is CacheConnectionError {
  return error instanceof CacheConnectionError;
}

/**
 * Check if an error is a timeout-related cache error.
 */
export function isCacheTimeoutError(error: unknown): error is CacheTimeoutError {
  return error instanceof CacheTimeoutError;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert any error to a CacheError.
 */
export function toCacheError(error: unknown, defaultMessage = 'Cache operation failed'): CacheError {
  if (isCacheError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new CacheError(error.message, 'CACHE_ERROR', error);
  }

  return new CacheError(defaultMessage, 'CACHE_ERROR');
}

/**
 * Format bytes to human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${String(parseFloat((bytes / Math.pow(k, i)).toFixed(2)))} ${sizes[i] ?? 'B'}`;
}
