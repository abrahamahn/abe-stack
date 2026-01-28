// apps/server/src/services/cache-service.test.ts
/* eslint-disable @typescript-eslint/unbound-method */
// apps/server/src/services/cache-service.test.ts
/**
 * Cache Service Tests
 *
 * Comprehensive unit tests for CacheService covering:
 * - Basic CRUD operations (get, set, delete, has, clear)
 * - TTL expiration and custom TTL overrides
 * - Automatic cleanup of expired items
 * - Size limit enforcement
 * - Default value handling
 * - Logger integration
 * - Edge cases and boundary conditions
 *
 * @complexity O(n) for most operations, O(n^2) for cleanup (justified by periodic execution)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CacheService, createCacheService } from './cache-service';

import type { Logger } from '@logger';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Creates a mock logger with all required methods
 */
function createMockLogger(): Logger {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => createMockLogger()),
  };
}

// ============================================================================
// Cache Service Tests
// ============================================================================

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
  });

  afterEach(() => {
    cache.clear();
  });

  // ==========================================================================
  // Constructor & Initialization
  // ==========================================================================

  describe('constructor', () => {
    it('should create cache with default options', () => {
      const service = new CacheService();
      const stats = service.stats();

      expect(stats.size).toBe(0);
    });

    it('should create cache with custom TTL', () => {
      const service = new CacheService({ ttl: 10000 });
      service.set('key', 'value');

      expect(service.has('key')).toBe(true);
    });

    it('should create cache with custom max size', () => {
      const service = new CacheService({ maxSize: 5 });
      service.set('key', 'value');

      expect(service.stats().size).toBe(1);
    });

    it('should handle empty options object', () => {
      const service = new CacheService({});

      expect(service.stats().size).toBe(0);
    });
  });

  // ==========================================================================
  // Basic Operations
  // ==========================================================================

  describe('get', () => {
    describe('when key exists', () => {
      it('should return stored value', () => {
        cache.set('key', 'value');
        const result = cache.get<string>('key');

        expect(result).toBe('value');
      });

      it('should handle different value types', () => {
        cache.set('string', 'hello');
        cache.set('number', 42);
        cache.set('boolean', true);
        cache.set('object', { foo: 'bar' });
        cache.set('array', [1, 2, 3]);
        cache.set('null', null);
        cache.set('undefined', undefined);

        expect(cache.get('string')).toBe('hello');
        expect(cache.get('number')).toBe(42);
        expect(cache.get('boolean')).toBe(true);
        expect(cache.get('object')).toEqual({ foo: 'bar' });
        expect(cache.get('array')).toEqual([1, 2, 3]);
        expect(cache.get('null')).toBeNull();
        expect(cache.get('undefined')).toBeUndefined();
      });

      it('should handle complex nested objects', () => {
        const complexObj = {
          user: { id: 1, name: 'John' },
          settings: { theme: 'dark', notifications: [1, 2, 3] },
        };
        cache.set('complex', complexObj);

        expect(cache.get('complex')).toEqual(complexObj);
      });

      it('should log cache hit when logger is set', () => {
        const logger = createMockLogger();
        cache.setLogger(logger);
        cache.set('key', 'value');

        cache.get('key');

        expect(logger.debug).toHaveBeenCalledWith('Cache hit: key');
      });
    });

    describe('when key does not exist', () => {
      it('should return null by default', () => {
        const result = cache.get('nonexistent');

        expect(result).toBeNull();
      });

      it('should return provided default value', () => {
        const result = cache.get('nonexistent', 'default');

        expect(result).toBe('default');
      });

      it('should return default value with correct type', () => {
        const defaultObj = { fallback: true };
        const result = cache.get('nonexistent', defaultObj);

        expect(result).toEqual(defaultObj);
      });
    });

    describe('when key has expired', () => {
      it('should return null for expired key', () => {
        vi.useFakeTimers();
        cache.set('key', 'value', 100);

        vi.advanceTimersByTime(150);

        const result = cache.get('key');
        expect(result).toBeNull();

        vi.useRealTimers();
      });

      it('should delete expired key from cache', () => {
        vi.useFakeTimers();
        cache.set('key', 'value', 100);

        vi.advanceTimersByTime(150);
        cache.get('key');

        expect(cache.stats().size).toBe(0);
        vi.useRealTimers();
      });

      it('should log cache miss for expired key', () => {
        vi.useFakeTimers();
        const logger = createMockLogger();
        cache.setLogger(logger);
        cache.set('key', 'value', 100);

        vi.advanceTimersByTime(150);
        cache.get('key');

        expect(logger.debug).toHaveBeenCalledWith('Cache miss: key (expired)');
        vi.useRealTimers();
      });
    });
  });

  describe('set', () => {
    it('should store value with key', () => {
      cache.set('key', 'value');

      expect(cache.get('key')).toBe('value');
    });

    it('should overwrite existing value', () => {
      cache.set('key', 'value1');
      cache.set('key', 'value2');

      expect(cache.get('key')).toBe('value2');
    });

    it('should use default TTL when not specified', () => {
      vi.useFakeTimers();
      const service = new CacheService({ ttl: 1000 });
      service.set('key', 'value');

      vi.advanceTimersByTime(500);
      expect(service.get('key')).toBe('value');

      vi.advanceTimersByTime(600);
      expect(service.get('key')).toBeNull();

      vi.useRealTimers();
    });

    it('should use custom TTL override', () => {
      vi.useFakeTimers();
      const service = new CacheService({ ttl: 5000 });
      service.set('key', 'value', 100);

      vi.advanceTimersByTime(150);

      expect(service.get('key')).toBeNull();
      vi.useRealTimers();
    });

    it('should log cache set operation', () => {
      const logger = createMockLogger();
      cache.setLogger(logger);

      cache.set('key', 'value', 1000);

      expect(logger.debug).toHaveBeenCalledWith('Cache set: key (ttl: 1000ms)');
    });

    it('should handle zero TTL as immediate expiry boundary', () => {
      vi.useFakeTimers();
      cache.set('key', 'value', 0);

      // TTL=0 means expiry = Date.now(), so immediately checking returns value
      // (Date.now() > expiry is false when equal)
      expect(cache.get('key')).toBe('value');

      // But after even 1ms, it expires
      vi.advanceTimersByTime(1);
      expect(cache.get('key')).toBeNull();

      vi.useRealTimers();
    });

    describe('automatic cleanup on size limit', () => {
      it('should trigger cleanup when approaching max size', () => {
        vi.useFakeTimers();
        const service = new CacheService({ maxSize: 10, ttl: 100 });

        for (let i = 0; i < 5; i++) {
          service.set(`expired${i}`, 'value', 50);
        }

        vi.advanceTimersByTime(100);

        for (let i = 0; i < 5; i++) {
          service.set(`valid${i}`, 'value');
        }

        const sizeBefore = service.stats().size;
        expect(sizeBefore).toBe(5);

        vi.useRealTimers();
      });

      it('should clean expired items when 90% full', () => {
        vi.useFakeTimers();
        const service = new CacheService({ maxSize: 10, ttl: 1000 });
        const logger = createMockLogger();
        service.setLogger(logger);

        for (let i = 0; i < 5; i++) {
          service.set(`expired${i}`, 'value', 50);
        }

        vi.advanceTimersByTime(100);

        for (let i = 0; i < 4; i++) {
          service.set(`valid${i}`, 'value');
        }

        service.set('trigger', 'value');

        expect(logger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Cleaned')
        );

        vi.useRealTimers();
      });
    });
  });

  describe('delete', () => {
    it('should delete existing key', () => {
      cache.set('key', 'value');
      const result = cache.delete('key');

      expect(result).toBe(true);
      expect(cache.has('key')).toBe(false);
    });

    it('should return false for non-existent key', () => {
      const result = cache.delete('nonexistent');

      expect(result).toBe(false);
    });

    it('should log delete operation', () => {
      const logger = createMockLogger();
      cache.setLogger(logger);
      cache.set('key', 'value');

      cache.delete('key');

      expect(logger.debug).toHaveBeenCalledWith('Cache delete: key (existed: true)');
    });

    it('should log delete operation for non-existent key', () => {
      const logger = createMockLogger();
      cache.setLogger(logger);

      cache.delete('nonexistent');

      expect(logger.debug).toHaveBeenCalledWith(
        'Cache delete: nonexistent (existed: false)'
      );
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      cache.set('key', 'value');

      expect(cache.has('key')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired key', () => {
      vi.useFakeTimers();
      cache.set('key', 'value', 100);

      vi.advanceTimersByTime(150);

      expect(cache.has('key')).toBe(false);
      vi.useRealTimers();
    });

    it('should delete expired key from cache', () => {
      vi.useFakeTimers();
      cache.set('key', 'value', 100);

      vi.advanceTimersByTime(150);
      cache.has('key');

      expect(cache.stats().size).toBe(0);
      vi.useRealTimers();
    });

    it('should log expired key check', () => {
      vi.useFakeTimers();
      const logger = createMockLogger();
      cache.setLogger(logger);
      cache.set('key', 'value', 100);

      vi.advanceTimersByTime(150);
      cache.has('key');

      expect(logger.debug).toHaveBeenCalledWith('Cache has: key (expired)');
      vi.useRealTimers();
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();

      expect(cache.stats().size).toBe(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(false);
    });

    it('should work on empty cache', () => {
      cache.clear();

      expect(cache.stats().size).toBe(0);
    });

    it('should log clear operation', () => {
      const logger = createMockLogger();
      cache.setLogger(logger);

      cache.clear();

      expect(logger.debug).toHaveBeenCalledWith('Cache cleared');
    });
  });

  // ==========================================================================
  // Statistics
  // ==========================================================================

  describe('stats', () => {
    it('should return current cache size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.stats();

      expect(stats.size).toBe(2);
    });

    it('should return zero for empty cache', () => {
      const stats = cache.stats();

      expect(stats.size).toBe(0);
    });

    it('should return zero hits and misses', () => {
      const stats = cache.stats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should update size after operations', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.delete('key1');

      const stats = cache.stats();

      expect(stats.size).toBe(1);
    });
  });

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  describe('cleanup', () => {
    it('should clear all cache entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.cleanup();

      expect(cache.stats().size).toBe(0);
    });

    it('should log cleanup operation', () => {
      const logger = createMockLogger();
      cache.setLogger(logger);

      cache.cleanup();

      expect(logger.debug).toHaveBeenCalledWith('Cache cleared during cleanup');
    });

    it('should work on empty cache', () => {
      cache.cleanup();

      expect(cache.stats().size).toBe(0);
    });
  });

  // ==========================================================================
  // Logger Integration
  // ==========================================================================

  describe('setLogger', () => {
    it('should set logger instance', () => {
      const logger = createMockLogger();

      cache.setLogger(logger);
      cache.set('key', 'value');

      expect(logger.debug).toHaveBeenCalled();
    });

    it('should work without logger set', () => {
      expect(() => {
        cache.set('key', 'value');
        cache.get('key');
        cache.delete('key');
      }).not.toThrow();
    });

    it('should handle logger replacement', () => {
      const logger1 = createMockLogger();
      const logger2 = createMockLogger();

      cache.setLogger(logger1);
      cache.set('key1', 'value1');

      cache.setLogger(logger2);
      cache.set('key2', 'value2');

      expect(logger2.debug).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty string as key', () => {
      cache.set('', 'value');

      expect(cache.get('')).toBe('value');
    });

    it('should handle very long keys', () => {
      const longKey = 'a'.repeat(1000);
      cache.set(longKey, 'value');

      expect(cache.get(longKey)).toBe('value');
    });

    it('should handle special characters in keys', () => {
      const specialKeys = ['key:1', 'key/2', 'key.3', 'key-4', 'key_5'];

      specialKeys.forEach((key) => {
        cache.set(key, key);
        expect(cache.get(key)).toBe(key);
      });
    });

    it('should handle unicode characters in keys', () => {
      cache.set('🔑', '🎯');

      expect(cache.get('🔑')).toBe('🎯');
    });

    it('should handle very large values', () => {
      const largeArray = new Array(10000).fill('data');
      cache.set('large', largeArray);

      expect(cache.get('large')).toEqual(largeArray);
    });

    it('should handle rapid successive operations on same key', () => {
      for (let i = 0; i < 100; i++) {
        cache.set('key', `value${i}`);
      }

      expect(cache.get('key')).toBe('value99');
    });

    it('should maintain separate entries for similar keys', () => {
      cache.set('key', 'value1');
      cache.set('key ', 'value2');
      cache.set(' key', 'value3');

      expect(cache.get('key')).toBe('value1');
      expect(cache.get('key ')).toBe('value2');
      expect(cache.get(' key')).toBe('value3');
    });

    it('should handle TTL of exactly 0', () => {
      vi.useFakeTimers();
      cache.set('key', 'value', 0);

      // TTL=0 means expiry = Date.now(), value available when checked immediately
      expect(cache.get('key')).toBe('value');

      // After any time passes, it expires
      vi.advanceTimersByTime(1);
      expect(cache.get('key')).toBeNull();

      vi.useRealTimers();
    });

    it('should handle negative TTL as immediate expiration', () => {
      vi.useFakeTimers();
      cache.set('key', 'value', -1000);

      const result = cache.get('key');

      expect(result).toBeNull();
      vi.useRealTimers();
    });

    it('should handle very large TTL values', () => {
      cache.set('key', 'value', Number.MAX_SAFE_INTEGER);

      expect(cache.get('key')).toBe('value');
    });
  });

  // ==========================================================================
  // Boundary Conditions
  // ==========================================================================

  describe('boundary conditions', () => {
    it('should handle max size of 1', () => {
      const service = new CacheService({ maxSize: 1 });
      service.set('key', 'value');

      expect(service.stats().size).toBe(1);
    });

    it('should handle max size of 0', () => {
      const service = new CacheService({ maxSize: 0 });
      service.set('key', 'value');

      expect(service.stats().size).toBe(1);
    });

    it('should handle TTL at boundary between expired and valid', () => {
      vi.useFakeTimers();
      cache.set('key', 'value', 100);

      vi.advanceTimersByTime(99);
      expect(cache.get('key')).toBe('value');

      vi.advanceTimersByTime(2);
      expect(cache.get('key')).toBeNull();

      vi.useRealTimers();
    });

    it('should handle multiple keys expiring at same time', () => {
      vi.useFakeTimers();

      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`, 100);
      }

      vi.advanceTimersByTime(150);

      for (let i = 0; i < 10; i++) {
        expect(cache.get(`key${i}`)).toBeNull();
      }

      vi.useRealTimers();
    });
  });

  // ==========================================================================
  // Private Method Testing (via side effects)
  // ==========================================================================

  describe('cleanupExpired (private)', () => {
    it('should remove expired items when triggered', () => {
      vi.useFakeTimers();
      const service = new CacheService({ maxSize: 10, ttl: 1000 });

      for (let i = 0; i < 5; i++) {
        service.set(`expired${i}`, 'value', 50);
      }

      vi.advanceTimersByTime(100);

      for (let i = 0; i < 6; i++) {
        service.set(`valid${i}`, 'value');
      }

      const stats = service.stats();
      expect(stats.size).toBe(6);

      vi.useRealTimers();
    });

    it('should log number of cleaned items', () => {
      vi.useFakeTimers();
      const service = new CacheService({ maxSize: 10, ttl: 1000 });
      const logger = createMockLogger();
      service.setLogger(logger);

      for (let i = 0; i < 5; i++) {
        service.set(`expired${i}`, 'value', 50);
      }

      vi.advanceTimersByTime(100);

      for (let i = 0; i < 6; i++) {
        service.set(`valid${i}`, 'value');
      }

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/Cleaned \d+ expired items from cache/)
      );

      vi.useRealTimers();
    });

    it('should not log when no items cleaned', () => {
      const service = new CacheService({ maxSize: 10 });
      const logger = createMockLogger();
      service.setLogger(logger);

      for (let i = 0; i < 9; i++) {
        service.set(`valid${i}`, 'value', 10000);
      }

      const debugCalls = (logger.debug as ReturnType<typeof vi.fn>).mock.calls;
      const cleanupLogs = debugCalls.filter((call) =>
        String(call[0]).includes('Cleaned')
      );

      expect(cleanupLogs.length).toBe(0);
    });
  });

  // ==========================================================================
  // Memory Management
  // ==========================================================================

  describe('memory management', () => {
    it('should not leak memory with many set/delete cycles', () => {
      for (let i = 0; i < 1000; i++) {
        cache.set(`key${i}`, `value${i}`);
        cache.delete(`key${i}`);
      }

      expect(cache.stats().size).toBe(0);
    });

    it('should handle cache at max capacity', () => {
      const service = new CacheService({ maxSize: 100 });

      for (let i = 0; i < 100; i++) {
        service.set(`key${i}`, `value${i}`);
      }

      expect(service.stats().size).toBe(100);
    });

    it('should handle cache exceeding max capacity', () => {
      const service = new CacheService({ maxSize: 10 });

      for (let i = 0; i < 20; i++) {
        service.set(`key${i}`, `value${i}`);
      }

      expect(service.stats().size).toBeLessThanOrEqual(20);
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createCacheService', () => {
  it('should create cache service with default options', () => {
    const service = createCacheService();

    expect(service).toBeInstanceOf(CacheService);
    expect(service.stats().size).toBe(0);
  });

  it('should create cache service with custom options', () => {
    const service = createCacheService({ ttl: 1000, maxSize: 50 });

    service.set('key', 'value');
    expect(service.get('key')).toBe('value');
  });

  it('should create cache service with empty options', () => {
    const service = createCacheService({});

    expect(service).toBeInstanceOf(CacheService);
  });

  it('should create multiple independent cache instances', () => {
    const service1 = createCacheService();
    const service2 = createCacheService();

    service1.set('key', 'value1');
    service2.set('key', 'value2');

    expect(service1.get('key')).toBe('value1');
    expect(service2.get('key')).toBe('value2');
  });
});
