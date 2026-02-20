// main/client/engine/src/realtime/hooks/useRecords.test.ts
/**
 * Tests for useRecords hook.
 *
 * Validates the hook's contract, types, dependency injection, and
 * integration with RecordCache and SubscriptionCache.
 *
 * Includes tests for permission-aware error handling (403 and permission_revoked).
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { RecordCache, type TableMap } from '../../cache';
import { SubscriptionCache } from '../SubscriptionCache';

import type { UseRecordsDeps, UseRecordsOptions, UseRecordsResult } from './useRecords';
import type { PermissionEventListener, PermissionRevokedEventPayload } from './usePermissionError';
import { isPermissionError, createPermissionError } from './usePermissionError';

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
      const deps: UseRecordsDeps = {
        recordCache: cache,
        subscriptionCache,
      };

      expect(deps.recordCache).toBe(cache);
      expect(deps.subscriptionCache).toBe(subscriptionCache);
      expect(deps.recordStorage).toBeUndefined();
    });

    it('should accept deps with permissionEvents', () => {
      const mockPermissionEvents: PermissionEventListener = {
        onPermissionRevoked: vi.fn().mockReturnValue(() => {}),
      };

      const deps: UseRecordsDeps = {
        recordCache: cache,
        subscriptionCache,
        permissionEvents: mockPermissionEvents,
      };

      expect(deps.permissionEvents).toBeDefined();
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
        permissionDenied: false,
      };

      expect(result.records).toHaveLength(0);
      expect(result.permissionDenied).toBe(false);
    });

    it('should represent partial results', () => {
      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' };
      const result: UseRecordsResult<User> = {
        records: [user, undefined],
        isLoading: false,
        error: undefined,
        permissionDenied: false,
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
        permissionDenied: false,
      };

      expect(result.isLoading).toBe(true);
    });

    it('should represent permission denied state', () => {
      const result: UseRecordsResult<User> = {
        records: [],
        isLoading: false,
        error: createPermissionError('tenant-1', 'Access revoked'),
        permissionDenied: true,
      };

      expect(result.permissionDenied).toBe(true);
      expect(result.records).toHaveLength(0);
      expect(result.error?.message).toBe('Access revoked');
      expect(isPermissionError(result.error)).toBe(true);
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

    it('should delete multiple records from cache', () => {
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' });
      cache.set('user', 'u2', { id: 'u2', version: 1, name: 'Bob', email: 'b@test.com' });

      cache.delete('user', 'u1');
      cache.delete('user', 'u2');

      expect(cache.get('user', 'u1')).toBeUndefined();
      expect(cache.get('user', 'u2')).toBeUndefined();
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

// ============================================================================
// Tests: Permission Error Handling for useRecords
// ============================================================================

describe('useRecords permission handling', () => {
  describe('PermissionEventListener integration for multiple records', () => {
    it('should support subscribing to permission revoked events', () => {
      const callbacks: Array<(event: PermissionRevokedEventPayload) => void> = [];
      const mockPermissionEvents: PermissionEventListener = {
        onPermissionRevoked: (callback) => {
          callbacks.push(callback);
          return () => {
            const index = callbacks.indexOf(callback);
            if (index >= 0) callbacks.splice(index, 1);
          };
        },
      };

      const handler = vi.fn();
      const unsubscribe = mockPermissionEvents.onPermissionRevoked(handler);

      expect(callbacks).toHaveLength(1);

      // Simulate a permission revocation
      callbacks[0]!({
        type: 'permission_revoked',
        tenantId: 'tenant-1',
        reason: 'Membership revoked',
      });

      expect(handler).toHaveBeenCalledTimes(1);

      // Cleanup
      unsubscribe();
      expect(callbacks).toHaveLength(0);
    });

    it('should handle multiple concurrent listeners', () => {
      const callbacks: Array<(event: PermissionRevokedEventPayload) => void> = [];
      const mockPermissionEvents: PermissionEventListener = {
        onPermissionRevoked: (callback) => {
          callbacks.push(callback);
          return () => {
            const index = callbacks.indexOf(callback);
            if (index >= 0) callbacks.splice(index, 1);
          };
        },
      };

      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const unsub1 = mockPermissionEvents.onPermissionRevoked(handler1);
      const unsub2 = mockPermissionEvents.onPermissionRevoked(handler2);

      expect(callbacks).toHaveLength(2);

      // Simulate event
      for (const cb of callbacks) {
        cb({
          type: 'permission_revoked',
          tenantId: 'tenant-1',
          reason: 'Revoked',
        });
      }

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      unsub1();
      unsub2();
    });
  });

  describe('UseRecordsResult with permissionDenied', () => {
    it('should have permissionDenied false by default', () => {
      const result: UseRecordsResult<{ id: string; version: number }> = {
        records: [{ id: 'u1', version: 1 }],
        isLoading: false,
        error: undefined,
        permissionDenied: false,
      };

      expect(result.permissionDenied).toBe(false);
      expect(result.records).toHaveLength(1);
    });

    it('should have permissionDenied true with empty records when revoked', () => {
      const result: UseRecordsResult<{ id: string; version: number }> = {
        records: [],
        isLoading: false,
        error: createPermissionError('tenant-1', 'Access revoked'),
        permissionDenied: true,
      };

      expect(result.permissionDenied).toBe(true);
      expect(result.records).toHaveLength(0);
    });

    it('should support consumer pattern for checking access', () => {
      const result: UseRecordsResult<{ id: string; version: number }> = {
        records: [],
        isLoading: false,
        error: createPermissionError('tenant-1'),
        permissionDenied: true,
      };

      // Consumer pattern:
      if (result.permissionDenied) {
        expect(result.error).toBeDefined();
        expect(isPermissionError(result.error)).toBe(true);
      }
    });
  });

  describe('RecordCache deletion on permission revocation', () => {
    it('should clear affected records from cache when permission is revoked', () => {
      const cache = new RecordCache<TableMap>();

      // Simulate records with tenantId
      cache.set('user', 'u1', { id: 'u1', version: 1, tenantId: 'tenant-1' } as never);
      cache.set('user', 'u2', { id: 'u2', version: 1, tenantId: 'tenant-1' } as never);
      cache.set('user', 'u3', { id: 'u3', version: 1, tenantId: 'tenant-2' } as never);

      // Simulate what the hook would do on permission_revoked for tenant-1
      const ids = ['u1', 'u2', 'u3'];
      for (const id of ids) {
        const record = cache.get('user', id);
        if (record !== undefined && 'tenantId' in record && record['tenantId'] === 'tenant-1') {
          cache.delete('user', id);
        }
      }

      // Only tenant-1 records should be removed
      expect(cache.get('user', 'u1')).toBeUndefined();
      expect(cache.get('user', 'u2')).toBeUndefined();
      expect(cache.get('user', 'u3')).toBeDefined();
    });

    it('should not clear records belonging to other tenants', () => {
      const cache = new RecordCache<TableMap>();

      cache.set('post', 'p1', { id: 'p1', version: 1, tenantId: 'tenant-2' } as never);

      // Simulate permission revocation for tenant-1 (not tenant-2)
      const record = cache.get('post', 'p1');
      if (record !== undefined && 'tenantId' in record && record['tenantId'] === 'tenant-1') {
        cache.delete('post', 'p1');
      }

      // Record from tenant-2 should remain
      expect(cache.get('post', 'p1')).toBeDefined();
    });
  });
});
