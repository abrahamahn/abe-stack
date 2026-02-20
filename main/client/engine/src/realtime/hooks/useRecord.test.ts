// main/client/engine/src/realtime/hooks/useRecord.test.ts
/**
 * Tests for useRecord hook.
 *
 * Since @testing-library/react is not available in the engine package,
 * these tests validate the hook's contract by testing the types,
 * dependency injection interface, and integration with RecordCache
 * and SubscriptionCache.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { RecordCache, type TableMap } from '../../cache';
import { SubscriptionCache } from '../SubscriptionCache';

import type { UseRecordDeps, UseRecordOptions, UseRecordResult } from './useRecord';

// ============================================================================
// Test Types
// ============================================================================

interface User {
  id: string;
  version: number;
  name: string;
  email: string;
}

interface TestTables extends TableMap {
  user: User;
}

// ============================================================================
// Tests
// ============================================================================

describe('useRecord types and deps', () => {
  let cache: RecordCache<TestTables>;
  let subscriptionCache: SubscriptionCache;

  beforeEach(() => {
    cache = new RecordCache<TestTables>();
    subscriptionCache = new SubscriptionCache({
      onSubscribe: vi.fn(),
      onUnsubscribe: vi.fn(),
    });
  });

  describe('UseRecordDeps interface', () => {
    it('should accept valid deps', () => {
      const deps: UseRecordDeps<TestTables> = {
        recordCache: cache,
        subscriptionCache,
      };

      expect(deps.recordCache).toBe(cache);
      expect(deps.subscriptionCache).toBe(subscriptionCache);
      expect(deps.recordStorage).toBeUndefined();
    });

    it('should accept deps with recordStorage', () => {
      const mockStorage = {
        getRecord: vi.fn(),
        getRecords: vi.fn(),
        setRecord: vi.fn(),
      };

      const deps: UseRecordDeps<TestTables> = {
        recordCache: cache,
        subscriptionCache,
        recordStorage: mockStorage as never,
      };

      expect(deps.recordStorage).toBeDefined();
    });
  });

  describe('UseRecordOptions interface', () => {
    it('should have optional fields', () => {
      const options: UseRecordOptions = {};
      expect(options.skipSubscription).toBeUndefined();
      expect(options.fallbackToStorage).toBeUndefined();
    });

    it('should accept skipSubscription', () => {
      const options: UseRecordOptions = { skipSubscription: true };
      expect(options.skipSubscription).toBe(true);
    });

    it('should accept fallbackToStorage', () => {
      const options: UseRecordOptions = { fallbackToStorage: false };
      expect(options.fallbackToStorage).toBe(false);
    });
  });

  describe('UseRecordResult interface', () => {
    it('should represent loading state', () => {
      const result: UseRecordResult<User> = {
        data: undefined,
        isLoading: true,
        error: undefined,
      };

      expect(result.data).toBeUndefined();
      expect(result.isLoading).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should represent loaded state', () => {
      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' };
      const result: UseRecordResult<User> = {
        data: user,
        isLoading: false,
        error: undefined,
      };

      expect(result.data).toBe(user);
      expect(result.isLoading).toBe(false);
    });

    it('should represent error state', () => {
      const result: UseRecordResult<User> = {
        data: undefined,
        isLoading: false,
        error: new Error('Network failed'),
      };

      expect(result.data).toBeUndefined();
      expect(result.error?.message).toBe('Network failed');
    });
  });

  describe('RecordCache integration', () => {
    it('should read records from cache', () => {
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' });

      const record = cache.get('user', 'u1');
      expect(record).toEqual({ id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' });
    });

    it('should support subscriptions for changes', () => {
      const listener = vi.fn();
      cache.subscribe('user', 'u1', listener);

      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should return undefined for missing records', () => {
      const record = cache.get('user', 'missing');
      expect(record).toBeUndefined();
    });
  });

  describe('SubscriptionCache integration', () => {
    it('should call onSubscribe for first subscriber', () => {
      const onSubscribe = vi.fn();
      const sc = new SubscriptionCache({
        onSubscribe,
        onUnsubscribe: vi.fn(),
      });

      sc.subscribe('user:u1');
      expect(onSubscribe).toHaveBeenCalledWith('user:u1');
    });

    it('should call onUnsubscribe when last subscriber leaves', () => {
      vi.useFakeTimers();
      const onUnsubscribe = vi.fn();
      const sc = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe,
      });

      const unsub = sc.subscribe('user:u1');
      unsub();

      // SubscriptionCache uses a 10s cleanup delay by default
      vi.advanceTimersByTime(11_000);

      expect(onUnsubscribe).toHaveBeenCalledWith('user:u1');
      vi.useRealTimers();
    });
  });
});
