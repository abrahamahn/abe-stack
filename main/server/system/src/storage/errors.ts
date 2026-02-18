// main/server/system/src/storage/errors.ts
/**
 * Storage-Specific Errors
 *
 * Error types for storage operations including upload failures,
 * missing objects, and provider-level faults.
 * Follows the same pattern as cache/errors.ts.
 */

import { AppError, HTTP_STATUS } from '@bslt/shared';

// ============================================================================
// Base Storage Error
// ============================================================================

/**
 * Base error for all storage-related errors.
 */
export class StorageError extends AppError {
  public readonly storageErrorCause?: Error | undefined;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code = 'STORAGE_ERROR',
    cause?: Error,
  ) {
    super(message, statusCode, code);
    this.storageErrorCause = cause;
  }
}

// ============================================================================
// Specific Storage Errors
// ============================================================================

/**
 * Requested storage object does not exist.
 */
export class StorageNotFoundError extends StorageError {
  constructor(
    public readonly key: string,
    cause?: Error,
  ) {
    super(`Storage object not found: ${key}`, HTTP_STATUS.NOT_FOUND, 'STORAGE_NOT_FOUND', cause);
  }
}

/**
 * Failed to upload an object to storage.
 */
export class StorageUploadError extends StorageError {
  constructor(
    public readonly key: string,
    cause?: Error,
  ) {
    super(`Failed to upload object: ${key}`, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'STORAGE_UPLOAD_ERROR', cause);
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an error is a StorageError.
 */
export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError;
}

/**
 * Check if an error is a StorageNotFoundError.
 */
export function isStorageNotFoundError(error: unknown): error is StorageNotFoundError {
  return error instanceof StorageNotFoundError;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert any error to a StorageError.
 *
 * @param error - The error to convert
 * @param defaultMessage - Default message if the error is not an Error instance
 * @returns A StorageError instance
 */
export function toStorageError(
  error: unknown,
  defaultMessage = 'Storage operation failed',
): StorageError {
  if (isStorageError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new StorageError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'STORAGE_ERROR', error);
  }

  return new StorageError(defaultMessage, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'STORAGE_ERROR');
}
