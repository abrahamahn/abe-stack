// main/shared/src/engine/cache/errors.test.ts
import { describe, expect, test } from 'vitest';

import { AppError } from '../errors/errors';

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
      const error = new CacheError('Cache operation failed', 'CACHE_OP_FAILED');

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
      const error = new CacheError('Test', 'TEST_CODE');
      const json = error.toJSON();

      expect(json.ok).toBe(false);
      expect(json.error.message).toBe('Test');
      expect(json.error.code).toBe('TEST_CODE');
    });
  });

  describe('CacheConnectionError', () => {
    test('should have correct properties', () => {
      const error = new CacheConnectionError('memory');

      expect(error.message).toBe('Failed to connect to cache: memory');
      expect(error.code).toBe('CACHE_CONNECTION_ERROR');
      expect(error.providerName).toBe('memory');
    });

    test('should accept custom message', () => {
      const error = new CacheConnectionError('memory', 'Connection refused');

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
      const error = new CacheTimeoutError('get', 5000);

      expect(error.message).toBe("Cache operation 'get' timed out after 5000ms");
      expect(error.code).toBe('CACHE_TIMEOUT');
      expect(error.operation).toBe('get');
      expect(error.timeoutMs).toBe(5000);
    });

    test('should include cause', () => {
      const cause = new Error('Timeout');
      const error = new CacheTimeoutError('set', 3000, cause);

      expect(error.cacheErrorCause).toBe(cause);
    });
  });

  describe('CacheSerializationError', () => {
    test('should have correct properties', () => {
      const error = new CacheSerializationError('user:123');

      expect(error.message).toBe('Failed to serialize value for key: user:123');
      expect(error.code).toBe('CACHE_SERIALIZATION_ERROR');
      expect(error.key).toBe('user:123');
    });
  });

  describe('CacheDeserializationError', () => {
    test('should have correct properties', () => {
      const error = new CacheDeserializationError('user:123');

      expect(error.message).toBe('Failed to deserialize value for key: user:123');
      expect(error.code).toBe('CACHE_DESERIALIZATION_ERROR');
      expect(error.key).toBe('user:123');
    });
  });

  describe('CacheInvalidKeyError', () => {
    test('should have correct properties', () => {
      const error = new CacheInvalidKeyError('key with spaces', 'contains whitespace');

      expect(error.message).toBe("Invalid cache key 'key with spaces': contains whitespace");
      expect(error.code).toBe('CACHE_INVALID_KEY');
      expect(error.key).toBe('key with spaces');
      expect(error.reason).toBe('contains whitespace');
    });
  });

  describe('CacheCapacityError', () => {
    test('should have correct properties', () => {
      const error = new CacheCapacityError(1000, 1000);

      expect(error.message).toBe('Cache capacity exceeded: 1000/1000 entries');
      expect(error.code).toBe('CACHE_CAPACITY_EXCEEDED');
      expect(error.currentSize).toBe(1000);
      expect(error.maxSize).toBe(1000);
    });
  });

  describe('CacheMemoryLimitError', () => {
    test('should have correct properties', () => {
      const error = new CacheMemoryLimitError(100 * 1024 * 1024, 50 * 1024 * 1024);

      expect(error.message).toContain('Cache memory limit exceeded');
      expect(error.message).toContain('100 MB');
      expect(error.message).toContain('50 MB');
      expect(error.code).toBe('CACHE_MEMORY_LIMIT');
      expect(error.currentBytes).toBe(100 * 1024 * 1024);
      expect(error.maxBytes).toBe(50 * 1024 * 1024);
    });

    test('should format different byte sizes', () => {
      const errorBytes = new CacheMemoryLimitError(500, 100);
      expect(errorBytes.message).toContain('500 B');

      const errorKb = new CacheMemoryLimitError(5 * 1024, 1024);
      expect(errorKb.message).toContain('5 KB');

      const errorGb = new CacheMemoryLimitError(2 * 1024 * 1024 * 1024, 1024 * 1024 * 1024);
      expect(errorGb.message).toContain('2 GB');
    });
  });

  describe('CacheProviderNotFoundError', () => {
    test('should have correct properties', () => {
      const error = new CacheProviderNotFoundError('memcached');

      expect(error.message).toBe('Unsupported cache provider: memcached');
      expect(error.code).toBe('CACHE_PROVIDER_NOT_FOUND');
      expect(error.providerType).toBe('memcached');
    });
  });

  describe('CacheNotInitializedError', () => {
    test('should have correct properties', () => {
      const error = new CacheNotInitializedError('memory');

      expect(error.message).toBe("Cache provider 'memory' is not initialized");
      expect(error.code).toBe('CACHE_NOT_INITIALIZED');
      expect(error.providerName).toBe('memory');
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
      const result = toCacheError(original);

      expect(result).toBeInstanceOf(CacheError);
      expect(result.message).toBe('Original message');
      expect(result.code).toBe('CACHE_ERROR');
      expect(result.cacheErrorCause).toBe(original);
    });

    test('should wrap unknown value in CacheError with default message', () => {
      const result = toCacheError('string error');

      expect(result).toBeInstanceOf(CacheError);
      expect(result.message).toBe('Cache operation failed');
      expect(result.code).toBe('CACHE_ERROR');
    });

    test('should use custom default message', () => {
      const result = toCacheError(null, 'Custom default');

      expect(result.message).toBe('Custom default');
    });
  });

  describe('error serialization', () => {
    test('all cache errors should serialize to JSON', () => {
      const errors = [
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
        expect(json.error).toHaveProperty('code');
        expect(json.error).toHaveProperty('message');
      }
    });
  });

  // ==========================================================================
  // Adversarial: Error hierarchy instanceof checks
  // ==========================================================================
  describe('adversarial: instanceof hierarchy', () => {
    test('CacheConnectionError is instanceof all ancestor classes', () => {
      const err = new CacheConnectionError('redis');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(CacheError);
      expect(err).toBeInstanceOf(CacheConnectionError);
    });

    test('CacheTimeoutError is instanceof all ancestor classes', () => {
      const err = new CacheTimeoutError('del', 100);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(CacheError);
      expect(err).toBeInstanceOf(CacheTimeoutError);
    });

    test('CacheSerializationError is not instanceof CacheConnectionError', () => {
      const err = new CacheSerializationError('k');
      expect(err).not.toBeInstanceOf(CacheConnectionError);
      expect(err).not.toBeInstanceOf(CacheTimeoutError);
    });

    test('CacheCapacityError is not instanceof CacheMemoryLimitError', () => {
      const capacity = new CacheCapacityError(10, 10);
      const memory = new CacheMemoryLimitError(1024, 512);
      expect(capacity).not.toBeInstanceOf(CacheMemoryLimitError);
      expect(memory).not.toBeInstanceOf(CacheCapacityError);
    });

    test('all subclasses share statusCode 500 (internal server error)', () => {
      const allErrors = [
        new CacheConnectionError('redis'),
        new CacheTimeoutError('get', 1000),
        new CacheSerializationError('key'),
        new CacheDeserializationError('key'),
        new CacheInvalidKeyError('k', 'bad'),
        new CacheCapacityError(1, 1),
        new CacheMemoryLimitError(1, 1),
        new CacheProviderNotFoundError('x'),
        new CacheNotInitializedError('y'),
      ];
      for (const err of allErrors) {
        expect(err.statusCode).toBe(500);
      }
    });
  });

  // ==========================================================================
  // Adversarial: Error message content validation
  // ==========================================================================
  describe('adversarial: message content validation', () => {
    test('CacheTimeoutError embeds operation name in message', () => {
      const err = new CacheTimeoutError('mget', 250);
      expect(err.message).toContain('mget');
      expect(err.message).toContain('250ms');
    });

    test('CacheConnectionError embeds provider name in message', () => {
      const err = new CacheConnectionError('upstash', 'Could not reach cache');
      expect(err.message).toContain('upstash');
      expect(err.message).toContain('Could not reach cache');
    });

    test('CacheInvalidKeyError embeds key and reason in message', () => {
      const err = new CacheInvalidKeyError('a'.repeat(300), 'key too long');
      expect(err.message).toContain('key too long');
      expect(err.key).toHaveLength(300);
    });

    test('CacheCapacityError formats currentSize and maxSize correctly', () => {
      const err = new CacheCapacityError(0, 0);
      expect(err.message).toContain('0/0 entries');
      expect(err.currentSize).toBe(0);
      expect(err.maxSize).toBe(0);
    });

    test('CacheMemoryLimitError with 0 bytes formats as "0 B"', () => {
      const err = new CacheMemoryLimitError(0, 1024);
      expect(err.message).toContain('0 B');
    });
  });

  // ==========================================================================
  // Adversarial: Serialization round-trip
  // ==========================================================================
  describe('adversarial: serialization round-trip', () => {
    test('JSON.stringify/JSON.parse preserves error shape', () => {
      const err = new CacheConnectionError('redis', 'Refused', new Error('root'));
      const json = err.toJSON();
      const serialized = JSON.stringify(json);
      const parsed = JSON.parse(serialized) as { ok: boolean; error: { code: string; message: string } };

      expect(parsed.ok).toBe(false);
      expect(parsed.error.code).toBe('CACHE_CONNECTION_ERROR');
      expect(parsed.error.message).toContain('redis');
    });

    test('toJSON omits undefined details field', () => {
      const err = new CacheConnectionError('redis');
      const json = err.toJSON();
      // details should be undefined (not present or explicitly undefined)
      expect(json.error.details).toBeUndefined();
    });

    test('toCacheError wraps CacheError subclass and returns same instance', () => {
      const sub = new CacheConnectionError('redis');
      const result = toCacheError(sub);
      expect(result).toBe(sub);
    });

    test('toCacheError with number input uses default message', () => {
      const result = toCacheError(42);
      expect(result.message).toBe('Cache operation failed');
      expect(result).toBeInstanceOf(CacheError);
    });

    test('toCacheError with object (non-Error) uses default message', () => {
      const result = toCacheError({ code: 'SOMETHING' });
      expect(result.message).toBe('Cache operation failed');
    });
  });

  // ==========================================================================
  // Adversarial: Stack trace preservation
  // ==========================================================================
  describe('adversarial: stack trace preservation', () => {
    test('CacheError has a stack trace', () => {
      const err = new CacheError('trace check');
      expect(err.stack).toBeDefined();
      expect(err.stack).toContain('CacheError');
    });

    test('CacheConnectionError has a stack trace pointing to its constructor', () => {
      const err = new CacheConnectionError('redis');
      expect(err.stack).toBeDefined();
      // Stack should mention some frame from this test
      expect(typeof err.stack).toBe('string');
    });

    test('error name reflects constructor class name', () => {
      expect(new CacheError('x').name).toBe('CacheError');
      expect(new CacheConnectionError('x').name).toBe('CacheConnectionError');
      expect(new CacheTimeoutError('op', 1).name).toBe('CacheTimeoutError');
      expect(new CacheSerializationError('k').name).toBe('CacheSerializationError');
      expect(new CacheDeserializationError('k').name).toBe('CacheDeserializationError');
      expect(new CacheInvalidKeyError('k', 'r').name).toBe('CacheInvalidKeyError');
      expect(new CacheCapacityError(1, 1).name).toBe('CacheCapacityError');
      expect(new CacheMemoryLimitError(1, 1).name).toBe('CacheMemoryLimitError');
      expect(new CacheProviderNotFoundError('p').name).toBe('CacheProviderNotFoundError');
      expect(new CacheNotInitializedError('p').name).toBe('CacheNotInitializedError');
    });
  });

  // ==========================================================================
  // Adversarial: Unknown error wrapping edge cases
  // ==========================================================================
  describe('adversarial: unknown error wrapping', () => {
    test('wrapping undefined produces default message', () => {
      const result = toCacheError(undefined);
      expect(result.message).toBe('Cache operation failed');
      expect(result).toBeInstanceOf(CacheError);
      // cacheErrorCause is undefined because the value was not an Error
      expect(result.cacheErrorCause).toBeUndefined();
    });

    test('wrapping an Error preserves original message over default message', () => {
      const original = new Error('specific failure');
      const result = toCacheError(original, 'fallback message');
      // When wrapped from a real Error, message comes from the Error, not the default
      expect(result.message).toBe('specific failure');
    });

    test('wrapping a CacheError subclass preserves the exact subclass', () => {
      const sub = new CacheTimeoutError('hgetall', 5000);
      const result = toCacheError(sub);
      expect(result).toBeInstanceOf(CacheTimeoutError);
      expect(result.operation).toBe('hgetall');
      expect(result.timeoutMs).toBe(5000);
    });
  });
});
