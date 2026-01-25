// packages/core/src/infrastructure/cache/types.test.ts
import { describe, expect, test } from 'vitest';

import type {
  BaseCacheConfig,
  CacheConfig,
  CacheDeleteOptions,
  CacheEntry,
  CacheEntryMetadata,
  CacheGetOptions,
  CacheProvider,
  CacheSetOptions,
  CacheStats,
  MemoryCacheConfig,
} from './types';

// ============================================================================
// Type Tests - These tests verify type definitions compile correctly
// ============================================================================

describe('cache types', () => {
  describe('CacheEntryMetadata', () => {
    test('should have required properties', () => {
      const metadata: CacheEntryMetadata = {
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 0,
      };

      expect(metadata.createdAt).toBeTypeOf('number');
      expect(metadata.lastAccessedAt).toBeTypeOf('number');
      expect(metadata.accessCount).toBeTypeOf('number');
    });

    test('should support optional properties', () => {
      const metadata: CacheEntryMetadata = {
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 5,
        expiresAt: Date.now() + 60000,
        size: 1024,
        tags: ['user', 'session'],
      };

      expect(metadata.expiresAt).toBeTypeOf('number');
      expect(metadata.size).toBe(1024);
      expect(metadata.tags).toEqual(['user', 'session']);
    });
  });

  describe('CacheEntry', () => {
    test('should be generic over value type', () => {
      const stringEntry: CacheEntry<string> = {
        value: 'test',
        metadata: {
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 1,
        },
      };

      const objectEntry: CacheEntry<{ id: number; name: string }> = {
        value: { id: 1, name: 'test' },
        metadata: {
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 0,
        },
      };

      expect(stringEntry.value).toBe('test');
      expect(objectEntry.value.id).toBe(1);
    });
  });

  describe('CacheGetOptions', () => {
    test('should support updateAccessTime option', () => {
      const options: CacheGetOptions = {
        updateAccessTime: false,
      };

      expect(options.updateAccessTime).toBe(false);
    });

    test('should allow empty options', () => {
      const options: CacheGetOptions = {};

      expect(options.updateAccessTime).toBeUndefined();
    });
  });

  describe('CacheSetOptions', () => {
    test('should support all options', () => {
      const options: CacheSetOptions = {
        ttl: 60000,
        tags: ['user', 'data'],
        updateTtlOnExisting: true,
      };

      expect(options.ttl).toBe(60000);
      expect(options.tags).toEqual(['user', 'data']);
      expect(options.updateTtlOnExisting).toBe(true);
    });
  });

  describe('CacheDeleteOptions', () => {
    test('should support byTag option', () => {
      const options: CacheDeleteOptions = {
        byTag: true,
      };

      expect(options.byTag).toBe(true);
    });
  });

  describe('CacheStats', () => {
    test('should have all required fields', () => {
      const stats: CacheStats = {
        hits: 100,
        misses: 20,
        hitRate: 83.33,
        size: 50,
        sets: 120,
        deletes: 10,
        evictions: 5,
      };

      expect(stats.hits).toBe(100);
      expect(stats.misses).toBe(20);
      expect(stats.hitRate).toBeCloseTo(83.33);
      expect(stats.size).toBe(50);
      expect(stats.sets).toBe(120);
      expect(stats.deletes).toBe(10);
      expect(stats.evictions).toBe(5);
    });

    test('should support optional fields', () => {
      const stats: CacheStats = {
        hits: 100,
        misses: 20,
        hitRate: 83.33,
        size: 50,
        sets: 120,
        deletes: 10,
        evictions: 5,
        memoryUsage: 1024 * 1024,
        maxSize: 1000,
      };

      expect(stats.memoryUsage).toBe(1024 * 1024);
      expect(stats.maxSize).toBe(1000);
    });
  });

  describe('CacheProvider interface', () => {
    test('should define all required methods', () => {
      // Mock implementation to verify interface
      const mockProvider: CacheProvider = {
        name: 'mock',
        get: async (_key: string) => undefined,
        set: async (_key: string, _value: unknown) => {},
        has: async (_key: string) => false,
        delete: async (_key: string) => false,
        getMultiple: async <T>(_keys: string[]) => new Map<string, T>(),
        setMultiple: async <T>(_entries: Map<string, T>) => {},
        deleteMultiple: async (_keys: string[]) => 0,
        clear: async () => {},
        getStats: () => ({
          hits: 0,
          misses: 0,
          hitRate: 0,
          size: 0,
          sets: 0,
          deletes: 0,
          evictions: 0,
        }),
        resetStats: () => {},
        healthCheck: async () => true,
        close: async () => {},
      };

      expect(mockProvider.name).toBe('mock');
      expect(typeof mockProvider.get).toBe('function');
      expect(typeof mockProvider.set).toBe('function');
      expect(typeof mockProvider.has).toBe('function');
      expect(typeof mockProvider.delete).toBe('function');
      expect(typeof mockProvider.getMultiple).toBe('function');
      expect(typeof mockProvider.setMultiple).toBe('function');
      expect(typeof mockProvider.deleteMultiple).toBe('function');
      expect(typeof mockProvider.clear).toBe('function');
      expect(typeof mockProvider.getStats).toBe('function');
      expect(typeof mockProvider.resetStats).toBe('function');
      expect(typeof mockProvider.healthCheck).toBe('function');
      expect(typeof mockProvider.close).toBe('function');
    });
  });

  describe('BaseCacheConfig', () => {
    test('should support all optional fields', () => {
      const config: BaseCacheConfig = {
        defaultTtl: 60000,
        maxSize: 1000,
        trackMemoryUsage: true,
        keyPrefix: 'app:cache',
      };

      expect(config.defaultTtl).toBe(60000);
      expect(config.maxSize).toBe(1000);
      expect(config.trackMemoryUsage).toBe(true);
      expect(config.keyPrefix).toBe('app:cache');
    });
  });

  describe('MemoryCacheConfig', () => {
    test('should have memory provider type', () => {
      const config: MemoryCacheConfig = {
        provider: 'memory',
        maxSize: 500,
        cleanupInterval: 30000,
        maxMemoryBytes: 50 * 1024 * 1024,
      };

      expect(config.provider).toBe('memory');
      expect(config.maxSize).toBe(500);
      expect(config.cleanupInterval).toBe(30000);
      expect(config.maxMemoryBytes).toBe(50 * 1024 * 1024);
    });
  });

  describe('CacheConfig type', () => {
    test('should accept memory config', () => {
      const config: CacheConfig = {
        provider: 'memory',
        maxSize: 1000,
      };

      expect(config.provider).toBe('memory');
    });

    test('should support memory-specific options', () => {
      const config: CacheConfig = {
        provider: 'memory',
        maxSize: 1000,
        cleanupInterval: 60000,
        maxMemoryBytes: 100 * 1024 * 1024,
      };

      expect(config.provider).toBe('memory');
      expect(config.cleanupInterval).toBe(60000);
      expect(config.maxMemoryBytes).toBe(100 * 1024 * 1024);
    });
  });
});
