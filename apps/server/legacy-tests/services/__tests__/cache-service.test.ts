// apps/server/src/services/__tests__/cache-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@logger';

import { CacheService } from '../cache-service';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService({ ttl: 1000, maxSize: 100 }); // 1 second TTL, 100 max items
  });

  describe('get/set operations', () => {
    it('should store and retrieve a value', async () => {
      cache.set('test-key', 'test-value');
      const result = cache.get('test-key');
      
      expect(result).toBe('test-value');
    });

    it('should return null for non-existent keys', async () => {
      const result = cache.get('non-existent-key');
      
      expect(result).toBeNull();
    });

    it('should return null for expired keys', async () => {
      vi.useFakeTimers();
      
      cache.set('expiring-key', 'expiring-value', 100); // 100ms TTL
      
      // Advance time past expiration
      vi.advanceTimersByTime(150);
      
      const result = cache.get('expiring-key');
      
      expect(result).toBeNull();
      
      vi.useRealTimers();
    });

    it('should allow custom TTL override', async () => {
      vi.useFakeTimers();
      
      cache.set('custom-ttl-key', 'value', 200); // 200ms TTL
      cache.set('default-ttl-key', 'value'); // Uses default TTL
      
      // Advance time past default but not custom TTL
      vi.advanceTimersByTime(1500);
      
      const customResult = cache.get('custom-ttl-key');
      const defaultResult = cache.get('default-ttl-key');
      
      expect(customResult).toBe('value');
      expect(defaultResult).toBeNull();
      
      vi.useRealTimers();
    });
  });

  describe('delete operations', () => {
    it('should delete existing keys', async () => {
      cache.set('delete-test', 'to-be-deleted');
      const deleted = cache.delete('delete-test');
      const result = cache.get('delete-test');
      
      expect(deleted).toBe(true);
      expect(result).toBeNull();
    });

    it('should return false when deleting non-existent keys', async () => {
      const deleted = cache.delete('non-existent');
      
      expect(deleted).toBe(false);
    });
  });

  describe('clear operations', () => {
    it('should clear all cached items', async () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.clear();
      
      const result1 = cache.get('key1');
      const result2 = cache.get('key2');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('has operations', () => {
    it('should return true for existing non-expired keys', async () => {
      cache.set('existing-key', 'value');
      const exists = cache.has('existing-key');
      
      expect(exists).toBe(true);
    });

    it('should return false for non-existent keys', async () => {
      const exists = cache.has('non-existent-key');
      
      expect(exists).toBe(false);
    });

    it('should return false for expired keys', async () => {
      vi.useFakeTimers();
      
      cache.set('expiring-key', 'value', 100); // 100ms TTL
      
      // Advance time past expiration
      vi.advanceTimersByTime(150);
      
      const exists = cache.has('expiring-key');
      
      expect(exists).toBe(false);
      
      vi.useRealTimers();
    });
  });

  describe('cleanup', () => {
    it('should clean up expired items when cache reaches 90% capacity', async () => {
      // Fill cache to 90% of max size (90 items out of 100)
      for (let i = 0; i < 90; i++) {
        cache.set(`key-${i}`, `value-${i}`, 10); // Very short TTL
      }

      // Add one more item to trigger cleanup
      cache.set('trigger-key', 'trigger-value', 1000);

      // All short-lived items should be cleaned up
      for (let i = 0; i < 90; i++) {
        const result = cache.get(`key-${i}`);
        expect(result).toBeNull();
      }

      // The trigger key should still exist
      const triggerResult = cache.get('trigger-key');
      expect(triggerResult).toBe('trigger-value');
    });
  });

  describe('stats', () => {
    it('should return cache statistics', async () => {
      cache.set('stat-test', 'value');
      
      const stats = cache.stats();
      
      expect(stats).toHaveProperty('size');
      expect(typeof stats.size).toBe('number');
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('logger integration', () => {
    it('should accept and use a logger', async () => {
      const mockLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn().mockImplementation(() => mockLogger),
      };

      cache.setLogger(mockLogger);
      
      cache.set('logged-key', 'logged-value');
      cache.get('logged-key');
      cache.delete('logged-key');
      
      expect(mockLogger.debug).toHaveBeenCalledTimes(3); // set, get, delete
    });
  });
});
