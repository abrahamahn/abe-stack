// main/server/system/src/storage/errors.test.ts
/**
 * Storage Errors — Adversarial Unit Tests
 *
 * Risk assessment:
 *  1. StorageNotFoundError must map to 404 (not 500) so callers can distinguish
 *     "missing object" from "infrastructure fault" without inspecting messages.
 *  2. toStorageError must never lose the original cause — callers need the chain
 *     for observability.
 *  3. An already-typed StorageError passed to toStorageError must not be re-wrapped
 *     (idempotency), preserving the original status code.
 */

import { describe, expect, test } from 'vitest';

import { AppError } from '@bslt/shared';

import {
  isStorageError,
  isStorageNotFoundError,
  StorageError,
  StorageNotFoundError,
  StorageUploadError,
  toStorageError,
} from './errors';

// ============================================================================
// StorageError (base)
// ============================================================================

describe('StorageError', () => {
  test('extends AppError', () => {
    expect(new StorageError('fail')).toBeInstanceOf(AppError);
  });

  test('defaults to statusCode 500', () => {
    const err = new StorageError('fail');
    expect(err.statusCode).toBe(500);
    expect(err.expose).toBe(false); // 5xx → not exposed
  });

  test('stores cause on storageErrorCause', () => {
    const cause = new Error('underlying');
    const err = new StorageError('fail', 500, 'STORAGE_ERROR', cause);
    expect(err.storageErrorCause).toBe(cause);
  });

  test('stores code from constructor', () => {
    const err = new StorageError('fail', 500, 'CUSTOM_CODE');
    expect(err.code).toBe('CUSTOM_CODE');
  });

  test('name is StorageError', () => {
    expect(new StorageError('fail').name).toBe('StorageError');
  });
});

// ============================================================================
// StorageNotFoundError
// ============================================================================

describe('StorageNotFoundError', () => {
  test('extends StorageError and AppError', () => {
    const err = new StorageNotFoundError('uploads/photo.jpg');
    expect(err).toBeInstanceOf(StorageError);
    expect(err).toBeInstanceOf(AppError);
  });

  test('has statusCode 404', () => {
    const err = new StorageNotFoundError('key');
    expect(err.statusCode).toBe(404);
    expect(err.expose).toBe(true); // 4xx → exposed
  });

  test('has code STORAGE_NOT_FOUND', () => {
    expect(new StorageNotFoundError('key').code).toBe('STORAGE_NOT_FOUND');
  });

  test('message includes the key', () => {
    const err = new StorageNotFoundError('uploads/missing.png');
    expect(err.message).toContain('uploads/missing.png');
  });

  test('stores cause', () => {
    const cause = new Error('ENOENT');
    const err = new StorageNotFoundError('key', cause);
    expect(err.storageErrorCause).toBe(cause);
  });
});

// ============================================================================
// StorageUploadError
// ============================================================================

describe('StorageUploadError', () => {
  test('has statusCode 500', () => {
    expect(new StorageUploadError('key').statusCode).toBe(500);
  });

  test('has code STORAGE_UPLOAD_ERROR', () => {
    expect(new StorageUploadError('key').code).toBe('STORAGE_UPLOAD_ERROR');
  });

  test('message includes the key', () => {
    const err = new StorageUploadError('uploads/photo.jpg');
    expect(err.message).toContain('uploads/photo.jpg');
  });
});

// ============================================================================
// Type Guards
// ============================================================================

describe('isStorageError', () => {
  test('true for StorageError', () => {
    expect(isStorageError(new StorageError('fail'))).toBe(true);
  });

  test('true for StorageNotFoundError (subclass)', () => {
    expect(isStorageError(new StorageNotFoundError('key'))).toBe(true);
  });

  test('false for plain Error', () => {
    expect(isStorageError(new Error('fail'))).toBe(false);
  });

  test('false for null / undefined / string', () => {
    expect(isStorageError(null)).toBe(false);
    expect(isStorageError(undefined)).toBe(false);
    expect(isStorageError('STORAGE_ERROR')).toBe(false);
  });
});

describe('isStorageNotFoundError', () => {
  test('true for StorageNotFoundError', () => {
    expect(isStorageNotFoundError(new StorageNotFoundError('key'))).toBe(true);
  });

  test('false for base StorageError', () => {
    expect(isStorageNotFoundError(new StorageError('fail'))).toBe(false);
  });
});

// ============================================================================
// toStorageError — idempotency and cause preservation
// ============================================================================

describe('toStorageError', () => {
  test('returns same instance when already a StorageError (idempotent)', () => {
    const err = new StorageError('already typed');
    expect(toStorageError(err)).toBe(err);
  });

  test('preserves StorageNotFoundError — does not re-wrap to base class', () => {
    const notFound = new StorageNotFoundError('key');
    const result = toStorageError(notFound);
    expect(result).toBeInstanceOf(StorageNotFoundError);
    expect(result.statusCode).toBe(404);
  });

  test('wraps plain Error, preserving message and cause chain', () => {
    const raw = new Error('S3 connection refused');
    const result = toStorageError(raw);
    expect(result).toBeInstanceOf(StorageError);
    expect(result.message).toBe('S3 connection refused');
    expect(result.storageErrorCause).toBe(raw);
  });

  test('uses defaultMessage when input is not an Error', () => {
    const result = toStorageError('string error', 'fallback message');
    expect(result.message).toBe('fallback message');
    expect(result.storageErrorCause).toBeUndefined();
  });

  test('uses built-in default message when no defaultMessage provided', () => {
    const result = toStorageError(42);
    expect(result.message).toBe('Storage operation failed');
  });

  // Killer test: null input + cause chain preservation
  test('null input produces StorageError with default message', () => {
    const result = toStorageError(null);
    expect(result).toBeInstanceOf(StorageError);
    expect(result.message).toBe('Storage operation failed');
    expect(result.storageErrorCause).toBeUndefined();
  });
});
