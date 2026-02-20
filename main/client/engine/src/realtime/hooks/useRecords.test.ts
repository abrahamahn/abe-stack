// main/client/engine/src/realtime/hooks/useRecords.test.ts
/**
 * Tests for useRecords hook.
 *
 * Validates the hook's contract, types, dependency injection, and
 * integration with RecordCache and SubscriptionCache.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { RecordCache, type TableMap } from '../../cache';
import { SubscriptionCache } from '../SubscriptionCache';

import type { UseRecordsDeps, UseRecordsOptions, UseRecordsResult } from './useRecords';

// ============================================================================
// Test Types
// ============================================================================

interface User {
  id: string;
  version: number;
  name: string;
  email: string;
}

interface Post {
  id: string;
  version: number;
  title: string;
  authorId: string;
}

interface TestTables extends TableMap {
  user: User;
  post: Post;
}

// ============================================================================
// Tests
// ============================================================================

describe('useRecords types and deps', () => {
  let cache: RecordCache<TestTables>;
  let subscriptionCache: SubscriptionCache;

  beforeEach(() => {
    cache = new RecordCache<TestTables>();
    subscriptionCache = new SubscriptionCache({
      onSubscribe: vi.fn(),
      onUnsubscribe: vi.fn(),
    });
  });

  describe('UseRecordsDeps interface', () => {
    it('should accept valid deps', () => {
      const deps: UseRecordsDeps<TestTables> = {
        recordCache: cache,
        subscriptionCache,
      };

      expect(deps.recordCache).toBe(cache);
      expect(deps.subscriptionCache).toBe(subscriptionCache);
      expect(deps.recordStorage).toBeUndefined();
    });
  });

  describe('UseRecordsOptions interface', () => {
    it('should have optional fields', () => {
      const options: UseRecordsOptions = {};
      expect(options.skipSubscription).toBeUndefined();
      expect(options.fallbackToStorage).toBeUndefined();
    });
  });

  describe('UseRecordsResult interface', () => {
    it('should represent empty result', () => {
      const result: UseRecordsResult<User> = {
        records: [],
        isLoading: false,
        error: undefined,
      };

      expect(result.records).toHaveLength(0);
    });

    it('should represent partial results', () => {
      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' };
      const result: UseRecordsResult<User> = {
        records: [user, undefined],
        isLoading: false,
        error: undefined,
      };

      expect(result.records).toHaveLength(2);
      expect(result.records[0]).toBe(user);
      expect(result.records[1]).toBeUndefined();
    });

    it('should represent loading state', () => {
      const result: UseRecordsResult<User> = {
        records: [],
        isLoading: true,
        error: undefined,
      };

      expect(result.isLoading).toBe(true);
    });
  });

  describe('RecordCache batch operations', () => {
    it('should return records for multiple IDs', () => {
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' });
      cache.set('user', 'u2', { id: 'u2', version: 1, name: 'Bob', email: 'b@test.com' });

      const ids = ['u1', 'u2', 'u3'];
      const records = ids.map((id) => cache.get('user', id));

      expect(records[0]).toEqual({ id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' });
      expect(records[1]).toEqual({ id: 'u2', version: 1, name: 'Bob', email: 'b@test.com' });
      expect(records[2]).toBeUndefined();
    });

    it('should detect missing records with has()', () => {
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' });

      expect(cache.has('user', 'u1')).toBe(true);
      expect(cache.has('user', 'u2')).toBe(false);
    });
  });

  describe('SubscriptionCache batch subscriptions', () => {
    it('should subscribe to multiple keys', () => {
      const onSubscribe = vi.fn();
      const sc = new SubscriptionCache({
        onSubscribe,
        onUnsubscribe: vi.fn(),
      });

      sc.subscribe('user:u1');
      sc.subscribe('user:u2');
      sc.subscribe('user:u3');

      expect(onSubscribe).toHaveBeenCalledTimes(3);
      expect(onSubscribe).toHaveBeenCalledWith('user:u1');
      expect(onSubscribe).toHaveBeenCalledWith('user:u2');
      expect(onSubscribe).toHaveBeenCalledWith('user:u3');
    });

    it('should unsubscribe from all on cleanup', () => {
      vi.useFakeTimers();
      const onUnsubscribe = vi.fn();
      const sc = new SubscriptionCache({
        onSubscribe: vi.fn(),
        onUnsubscribe,
      });

      const unsubs = ['user:u1', 'user:u2'].map((key) => sc.subscribe(key));

      for (const unsub of unsubs) {
        unsub();
      }

      // SubscriptionCache uses a 10s cleanup delay by default
      vi.advanceTimersByTime(11_000);

      expect(onUnsubscribe).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });
});
