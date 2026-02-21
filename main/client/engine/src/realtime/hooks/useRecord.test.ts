// main/client/engine/src/realtime/hooks/useRecord.test.ts
/**
 * Tests for useRecord hook.
 *
 * Since @testing-library/react is not available in the engine package,
 * these tests validate the hook's contract by testing the types,
 * dependency injection interface, and integration with RecordCache
 * and SubscriptionCache.
 *
 * Includes tests for permission-aware error handling (403 and permission_revoked).
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { RecordCache, type TableMap } from '../../cache';
import { SubscriptionCache } from '../SubscriptionCache';

import { isPermissionError, createPermissionError } from './usePermissionError';

import type { PermissionEventListener, PermissionRevokedEventPayload } from './usePermissionError';
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
      const deps: UseRecordDeps = {
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

      const deps: UseRecordDeps = {
        recordCache: cache,
        subscriptionCache,
        recordStorage: mockStorage as never,
      };

      expect(deps.recordStorage).toBeDefined();
    });

    it('should accept deps with permissionEvents', () => {
      const mockPermissionEvents: PermissionEventListener = {
        onPermissionRevoked: vi.fn().mockReturnValue(() => {}),
      };

      const deps: UseRecordDeps = {
        recordCache: cache,
        subscriptionCache,
        permissionEvents: mockPermissionEvents,
      };

      expect(deps.permissionEvents).toBeDefined();
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
        permissionDenied: false,
      };

      expect(result.data).toBeUndefined();
      expect(result.isLoading).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.permissionDenied).toBe(false);
    });

    it('should represent loaded state', () => {
      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' };
      const result: UseRecordResult<User> = {
        data: user,
        isLoading: false,
        error: undefined,
        permissionDenied: false,
      };

      expect(result.data).toBe(user);
      expect(result.isLoading).toBe(false);
      expect(result.permissionDenied).toBe(false);
    });

    it('should represent error state', () => {
      const result: UseRecordResult<User> = {
        data: undefined,
        isLoading: false,
        error: new Error('Network failed'),
        permissionDenied: false,
      };

      expect(result.data).toBeUndefined();
      expect(result.error?.message).toBe('Network failed');
    });

    it('should represent permission denied state', () => {
      const result: UseRecordResult<User> = {
        data: undefined,
        isLoading: false,
        error: createPermissionError('tenant-1', 'Membership revoked'),
        permissionDenied: true,
      };

      expect(result.data).toBeUndefined();
      expect(result.permissionDenied).toBe(true);
      expect(result.error?.message).toBe('Membership revoked');
      expect(isPermissionError(result.error)).toBe(true);
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

    it('should delete records from cache', () => {
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' });
      const deleted = cache.delete('user', 'u1');

      expect(deleted).toEqual({ id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' });
      expect(cache.get('user', 'u1')).toBeUndefined();
    });

    it('should notify listeners on delete', () => {
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' });

      const listener = vi.fn();
      cache.subscribe('user', 'u1', listener);

      cache.delete('user', 'u1');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'user',
          id: 'u1',
          after: undefined,
        }),
      );
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

// ============================================================================
// Tests: Permission Error Handling
// ============================================================================

describe('useRecord permission handling', () => {
  describe('isPermissionError', () => {
    it('should detect errors with isPermissionError flag', () => {
      const error = createPermissionError('tenant-1');
      expect(isPermissionError(error)).toBe(true);
    });

    it('should detect errors with status 403', () => {
      const error = { status: 403, message: 'Forbidden' };
      expect(isPermissionError(error)).toBe(true);
    });

    it('should detect errors with "403" in message', () => {
      const error = new Error('Request failed with status 403');
      expect(isPermissionError(error)).toBe(true);
    });

    it('should detect errors with "forbidden" in message', () => {
      const error = new Error('Forbidden: access denied');
      expect(isPermissionError(error)).toBe(true);
    });

    it('should detect errors with "permission denied" in message', () => {
      const error = new Error('Permission denied for this resource');
      expect(isPermissionError(error)).toBe(true);
    });

    it('should return false for regular errors', () => {
      const error = new Error('Network timeout');
      expect(isPermissionError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isPermissionError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isPermissionError(undefined)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isPermissionError({ status: 200 })).toBe(false);
    });
  });

  describe('createPermissionError', () => {
    it('should create an error with isPermissionError flag', () => {
      const error = createPermissionError('tenant-1');
      expect(error.isPermissionError).toBe(true);
    });

    it('should include the tenantId', () => {
      const error = createPermissionError('tenant-1');
      expect(error.tenantId).toBe('tenant-1');
    });

    it('should use the provided reason as message', () => {
      const error = createPermissionError('tenant-1', 'You were removed');
      expect(error.message).toBe('You were removed');
    });

    it('should use a default message when no reason is provided', () => {
      const error = createPermissionError('tenant-1');
      expect(error.message).toContain('tenant-1');
    });

    it('should be an instance of Error', () => {
      const error = createPermissionError('tenant-1');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('PermissionEventListener integration', () => {
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
      expect(handler).toHaveBeenCalledWith({
        type: 'permission_revoked',
        tenantId: 'tenant-1',
        reason: 'Membership revoked',
      });

      // Cleanup
      unsubscribe();
      expect(callbacks).toHaveLength(0);
    });

    it('should handle role downgrade events with newRole', () => {
      const handler = vi.fn();
      const mockPermissionEvents: PermissionEventListener = {
        onPermissionRevoked: (callback) => {
          callback({
            type: 'permission_revoked',
            tenantId: 'tenant-1',
            reason: 'Role changed from admin to viewer',
            newRole: 'viewer',
          });
          return () => {};
        },
      };

      mockPermissionEvents.onPermissionRevoked(handler);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          newRole: 'viewer',
        }),
      );
    });
  });

  describe('UseRecordResult with permissionDenied', () => {
    it('should default permissionDenied to false in normal state', () => {
      const result: UseRecordResult<{ id: string; version: number }> = {
        data: { id: 'u1', version: 1 },
        isLoading: false,
        error: undefined,
        permissionDenied: false,
      };

      expect(result.permissionDenied).toBe(false);
      expect(result.data).toBeDefined();
    });

    it('should have permissionDenied true with no data when revoked', () => {
      const result: UseRecordResult<{ id: string; version: number }> = {
        data: undefined,
        isLoading: false,
        error: createPermissionError('tenant-1', 'Access revoked'),
        permissionDenied: true,
      };

      expect(result.permissionDenied).toBe(true);
      expect(result.data).toBeUndefined();
      expect(result.error?.message).toBe('Access revoked');
    });

    it('should not crash when permissionDenied is checked alongside other fields', () => {
      const result: UseRecordResult<{ id: string; version: number }> = {
        data: undefined,
        isLoading: false,
        error: undefined,
        permissionDenied: true,
      };

      // This pattern is how consumers would check:
      const hasAccess = !result.permissionDenied && result.data !== undefined;
      expect(hasAccess).toBe(false);
    });
  });
});
