// backend/engine/src/cache/errors.test.ts
import { AppError } from '@abe-stack/shared';
import { describe, expect, test } from 'vitest';

import {
  CacheCapacityError,
  CacheConnectionError,
  CacheDeserializationError,
  CacheError,
  CacheInvalidKeyError,
  CacheMemoryLimitError,
  CacheNotInitializedError,
  CacheProviderNotFoundError,
  CacheSerializationError,
  CacheTimeoutError,
  isCacheConnectionError,
  isCacheError,
  isCacheTimeoutError,
  toCacheError,
} from './errors';

// ============================================================================
// Cache Errors Tests
// ============================================================================

describe('cache errors', () => {
  describe('CacheError', () => {
    test('should have correct properties', () => {
      const error: AppError = new CacheError('Cache operation failed', 'CACHE_OP_FAILED');

      expect(error.message).toBe('Cache operation failed');
      expect(error.code).toBe('CACHE_OP_FAILED');
      expect(error.statusCode).toBe(500);
    });

    test('should extend AppError', () => {
      const error = new CacheError('Test error');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(CacheError);
    });

    test('should include cause', () => {
      const cause = new Error('Original error');
      const error = new CacheError('Wrapped error', 'WRAPPED', cause);

      expect(error.cacheErrorCause).toBe(cause);
    });

    test('should serialize to JSON', () => {
      const error: AppError = new CacheError('Test', 'TEST_CODE');
      const json = error.toJSON();

      expect(json.ok).toBe(false);
      expect(json.error.message).toBe('Test');
      expect(json.error.code).toBe('TEST_CODE');
    });
  });

  describe('CacheConnectionError', () => {
    test('should have correct properties', () => {
      const error: AppError = new CacheConnectionError('memory');

      expect(error.message).toBe('Failed to connect to cache: memory');
      expect(error.code).toBe('CACHE_CONNECTION_ERROR');
      expect((error as CacheConnectionError).providerName).toBe('memory');
    });

    test('should accept custom message', () => {
      const error: AppError = new CacheConnectionError('memory', 'Connection refused');

      expect(error.message).toBe('Connection refused: memory');
    });

    test('should include cause', () => {
      const cause = new Error('ECONNREFUSED');
      const error = new CacheConnectionError('memory', 'Connection failed', cause);

      expect(error.cacheErrorCause).toBe(cause);
    });

    test('should extend CacheError', () => {
      const error = new CacheConnectionError('memory');

      expect(error).toBeInstanceOf(CacheError);
    });
  });

  describe('CacheTimeoutError', () => {
    test('should have correct properties', () => {
      const error: AppError = new CacheTimeoutError('get', 5000);

      expect(error.message).toBe("Cache operation 'get' timed out after 5000ms");
      expect(error.code).toBe('CACHE_TIMEOUT');
      expect((error as CacheTimeoutError).operation).toBe('get');
      expect((error as CacheTimeoutError).timeoutMs).toBe(5000);
    });

    test('should include cause', () => {
      const cause = new Error('Timeout');
      const error = new CacheTimeoutError('set', 3000, cause);

      expect(error.cacheErrorCause).toBe(cause);
    });
  });

  describe('CacheSerializationError', () => {
    test('should have correct properties', () => {
      const error: AppError = new CacheSerializationError('user:123');

      expect(error.message).toBe('Failed to serialize value for key: user:123');
      expect(error.code).toBe('CACHE_SERIALIZATION_ERROR');
      expect((error as CacheSerializationError).key).toBe('user:123');
    });
  });

  describe('CacheDeserializationError', () => {
    test('should have correct properties', () => {
      const error: AppError = new CacheDeserializationError('user:123');

      expect(error.message).toBe('Failed to deserialize value for key: user:123');
      expect(error.code).toBe('CACHE_DESERIALIZATION_ERROR');
      expect((error as CacheDeserializationError).key).toBe('user:123');
    });
  });

  describe('CacheInvalidKeyError', () => {
    test('should have correct properties', () => {
      const error: AppError = new CacheInvalidKeyError('key with spaces', 'contains whitespace');

      expect(error.message).toBe("Invalid cache key 'key with spaces': contains whitespace");
      expect(error.code).toBe('CACHE_INVALID_KEY');
      expect((error as CacheInvalidKeyError).key).toBe('key with spaces');
      expect((error as CacheInvalidKeyError).reason).toBe('contains whitespace');
    });
  });

  describe('CacheCapacityError', () => {
    test('should have correct properties', () => {
      const error: AppError = new CacheCapacityError(1000, 1000);

      expect(error.message).toBe('Cache capacity exceeded: 1000/1000 entries');
      expect(error.code).toBe('CACHE_CAPACITY_EXCEEDED');
      expect((error as CacheCapacityError).currentSize).toBe(1000);
      expect((error as CacheCapacityError).maxSize).toBe(1000);
    });
  });

  describe('CacheMemoryLimitError', () => {
    test('should have correct properties', () => {
      const error: AppError = new CacheMemoryLimitError(100 * 1024 * 1024, 50 * 1024 * 1024);

      expect(error.message).toContain('Cache memory limit exceeded');
      expect(error.message).toContain('100 MB');
      expect(error.message).toContain('50 MB');
      expect(error.code).toBe('CACHE_MEMORY_LIMIT');
      expect((error as CacheMemoryLimitError).currentBytes).toBe(100 * 1024 * 1024);
      expect((error as CacheMemoryLimitError).maxBytes).toBe(50 * 1024 * 1024);
    });

    test('should format different byte sizes', () => {
      const errorBytes: AppError = new CacheMemoryLimitError(500, 100);
      expect(errorBytes.message).toContain('500 B');

      const errorKb: AppError = new CacheMemoryLimitError(5 * 1024, 1024);
      expect(errorKb.message).toContain('5 KB');

      const errorGb: AppError = new CacheMemoryLimitError(
        2 * 1024 * 1024 * 1024,
        1024 * 1024 * 1024,
      );
      expect(errorGb.message).toContain('2 GB');
    });
  });

  describe('CacheProviderNotFoundError', () => {
    test('should have correct properties', () => {
      const error: AppError = new CacheProviderNotFoundError('memcached');

      expect(error.message).toBe('Unsupported cache provider: memcached');
      expect(error.code).toBe('CACHE_PROVIDER_NOT_FOUND');
      expect((error as CacheProviderNotFoundError).providerType).toBe('memcached');
    });
  });

  describe('CacheNotInitializedError', () => {
    test('should have correct properties', () => {
      const error: AppError = new CacheNotInitializedError('memory');

      expect(error.message).toBe("Cache provider 'memory' is not initialized");
      expect(error.code).toBe('CACHE_NOT_INITIALIZED');
      expect((error as CacheNotInitializedError).providerName).toBe('memory');
    });
  });

  describe('type guards', () => {
    describe('isCacheError', () => {
      test('should return true for CacheError', () => {
        expect(isCacheError(new CacheError('test'))).toBe(true);
      });

      test('should return true for CacheError subclasses', () => {
        expect(isCacheError(new CacheConnectionError('memory'))).toBe(true);
        expect(isCacheError(new CacheTimeoutError('get', 5000))).toBe(true);
        expect(isCacheError(new CacheSerializationError('key'))).toBe(true);
      });

      test('should return false for other errors', () => {
        expect(isCacheError(new Error('test'))).toBe(false);
        expect(isCacheError(new AppError('test', 500))).toBe(false);
      });

      test('should return false for non-errors', () => {
        expect(isCacheError('not an error')).toBe(false);
        expect(isCacheError(null)).toBe(false);
        expect(isCacheError(undefined)).toBe(false);
      });
    });

    describe('isCacheConnectionError', () => {
      test('should return true for CacheConnectionError', () => {
        expect(isCacheConnectionError(new CacheConnectionError('memory'))).toBe(true);
      });

      test('should return false for other cache errors', () => {
        expect(isCacheConnectionError(new CacheError('test'))).toBe(false);
        expect(isCacheConnectionError(new CacheTimeoutError('get', 5000))).toBe(false);
      });
    });

    describe('isCacheTimeoutError', () => {
      test('should return true for CacheTimeoutError', () => {
        expect(isCacheTimeoutError(new CacheTimeoutError('get', 5000))).toBe(true);
      });

      test('should return false for other cache errors', () => {
        expect(isCacheTimeoutError(new CacheError('test'))).toBe(false);
        expect(isCacheTimeoutError(new CacheConnectionError('memory'))).toBe(false);
      });
    });
  });

  describe('toCacheError', () => {
    test('should return CacheError as-is', () => {
      const original = new CacheError('test', 'CODE');
      const result = toCacheError(original);

      expect(result).toBe(original);
    });

    test('should wrap Error in CacheError', () => {
      const original = new Error('Original message');
      const result: AppError = toCacheError(original);

      expect(result).toBeInstanceOf(CacheError);
      expect(result.message).toBe('Original message');
      expect(result.code).toBe('CACHE_ERROR');
      expect((result as CacheError).cacheErrorCause).toBe(original);
    });

    test('should wrap unknown value in CacheError with default message', () => {
      const result: AppError = toCacheError('string error');

      expect(result).toBeInstanceOf(CacheError);
      expect(result.message).toBe('Cache operation failed');
      expect(result.code).toBe('CACHE_ERROR');
    });

    test('should use custom default message', () => {
      const result: AppError = toCacheError(null, 'Custom default');

      expect(result.message).toBe('Custom default');
    });
  });

  describe('error serialization', () => {
    test('all cache errors should serialize to JSON', () => {
      const errors: AppError[] = [
        new CacheError('test'),
        new CacheConnectionError('memory'),
        new CacheTimeoutError('get', 5000),
        new CacheSerializationError('key'),
        new CacheDeserializationError('key'),
        new CacheInvalidKeyError('key', 'reason'),
        new CacheCapacityError(100, 100),
        new CacheMemoryLimitError(1024, 512),
        new CacheProviderNotFoundError('unknown'),
        new CacheNotInitializedError('memory'),
      ];

      for (const error of errors) {
        const json = error.toJSON();
        expect(json.ok).toBe(false);
        expect(json.error).toHaveProperty('message');
        expect(json.error).toHaveProperty('code');
      }
    });
  });
});
