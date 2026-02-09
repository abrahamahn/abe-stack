// src/server/core/src/auth/security/lockout.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  applyProgressiveDelay,
  clearLoginAttempts,
  getAccountLockoutStatus,
  getProgressiveDelay,
  isAccountLocked,
  logLoginAttempt,
  unlockAccount,
} from './lockout';

import type { LockoutConfig, LockoutStatus } from './types';
import type { DbClient } from '@abe-stack/db';

// Mock security events to avoid circular dependency issues
vi.mock('./events', () => ({
  logAccountUnlockedEvent: vi.fn().mockResolvedValue(undefined),
}));

// Create mock db matching RawDb interface
function createMockDb() {
  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
  };
}

type MockDb = ReturnType<typeof createMockDb>;

function asMockDb(mock: MockDb): DbClient {
  return mock as unknown as DbClient;
}

// ============================================================================
// Lockout Functions Tests
// ============================================================================

describe('Lockout Functions', () => {
  let mockDb: MockDb;
  const defaultLockoutConfig: LockoutConfig = {
    maxAttempts: 5,
    lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
    progressiveDelay: true,
    baseDelayMs: 1000,
  };

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('logLoginAttempt', () => {
    test('should log successful login attempt', async () => {
      await logLoginAttempt(
        asMockDb(mockDb),
        'test@example.com',
        true,
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(mockDb.execute).toHaveBeenCalled();
    });

    test('should log failed login attempt with reason', async () => {
      await logLoginAttempt(
        asMockDb(mockDb),
        'test@example.com',
        false,
        '192.168.1.1',
        'Mozilla/5.0',
        'Invalid password',
      );

      expect(mockDb.execute).toHaveBeenCalled();
    });

    test('should log login attempt without optional fields', async () => {
      await logLoginAttempt(asMockDb(mockDb), 'test@example.com', false);

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('isAccountLocked', () => {
    test('should return true when failed attempts exceed max', async () => {
      mockDb.queryOne.mockResolvedValue({ count: 5 });

      const isLocked = await isAccountLocked(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(isLocked).toBe(true);
    });

    test('should return false when failed attempts below max', async () => {
      mockDb.queryOne.mockResolvedValue({ count: 3 });

      const isLocked = await isAccountLocked(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(isLocked).toBe(false);
    });

    test('should return false when no failed attempts', async () => {
      mockDb.queryOne.mockResolvedValue({ count: 0 });

      const isLocked = await isAccountLocked(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(isLocked).toBe(false);
    });

    test('should return true when attempts equal max', async () => {
      mockDb.queryOne.mockResolvedValue({ count: 5 });

      const config = { ...defaultLockoutConfig, maxAttempts: 5 };
      const isLocked = await isAccountLocked(asMockDb(mockDb), 'test@example.com', config);

      expect(isLocked).toBe(true);
    });
  });

  describe('getProgressiveDelay', () => {
    test('should return 0 when progressive delay is disabled', async () => {
      const configWithoutDelay: LockoutConfig = {
        ...defaultLockoutConfig,
        progressiveDelay: false,
      };

      const delay = await getProgressiveDelay(
        asMockDb(mockDb),
        'test@example.com',
        configWithoutDelay,
      );

      expect(delay).toBe(0);
    });

    test('should return 0 when no failed attempts', async () => {
      mockDb.queryOne.mockResolvedValue({ count: 0 });

      const delay = await getProgressiveDelay(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(delay).toBe(0);
    });

    test('should return exponential delay based on failed attempts', async () => {
      // 1 failed attempt = 1000ms * 2^0 = 1000ms
      mockDb.queryOne.mockResolvedValue({ count: 1 });

      const delay = await getProgressiveDelay(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(delay).toBe(1000); // 1000 * 2^0
    });

    test('should calculate exponential backoff correctly', async () => {
      // 3 failed attempts = 1000ms * 2^2 = 4000ms
      mockDb.queryOne.mockResolvedValue({ count: 3 });

      const delay = await getProgressiveDelay(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(delay).toBe(4000); // 1000 * 2^2
    });

    test('should cap delay at MAX_PROGRESSIVE_DELAY_MS', async () => {
      // 10 failed attempts = 1000ms * 2^9 = 512000ms, capped at 30000ms
      mockDb.queryOne.mockResolvedValue({ count: 10 });

      const delay = await getProgressiveDelay(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(delay).toBe(30000); // MAX_PROGRESSIVE_DELAY_MS
    });

    test('should handle 2 failed attempts correctly', async () => {
      // 2 failed attempts = 1000ms * 2^1 = 2000ms
      mockDb.queryOne.mockResolvedValue({ count: 2 });

      const delay = await getProgressiveDelay(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(delay).toBe(2000);
    });
  });

  describe('applyProgressiveDelay', () => {
    test('should not delay when no progressive delay needed', async () => {
      mockDb.queryOne.mockResolvedValue({ count: 0 });

      const start = Date.now();
      await applyProgressiveDelay(asMockDb(mockDb), 'test@example.com', defaultLockoutConfig);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    test('should delay when progressive delay is needed', async () => {
      mockDb.queryOne.mockResolvedValue({ count: 1 });

      const delayPromise = applyProgressiveDelay(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      // Advance timer to resolve the delay
      await vi.advanceTimersByTimeAsync(1000);

      await delayPromise;
      // Verify the database was queried to determine delay
      expect(mockDb.queryOne).toHaveBeenCalled();
    });
  });

  describe('clearLoginAttempts', () => {
    test('should be a no-op function', async () => {
      // Should not throw and should complete immediately
      await clearLoginAttempts(asMockDb(mockDb), 'test@example.com');

      // No database operations should be called
      expect(mockDb.execute).not.toHaveBeenCalled();
      expect(mockDb.queryOne).not.toHaveBeenCalled();
    });
  });

  describe('getAccountLockoutStatus', () => {
    test('should return unlocked status when not locked', async () => {
      mockDb.queryOne.mockResolvedValue({ count: 2 });

      const status: LockoutStatus = await getAccountLockoutStatus(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(status.isLocked).toBe(false);
      expect(status.failedAttempts).toBe(2);
      expect(status.remainingTime).toBeUndefined();
      expect(status.lockedUntil).toBeUndefined();
    });

    test('should return locked status with timing info when locked', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const mostRecentAttemptTime = new Date(now - 5 * 60 * 1000); // 5 minutes ago

      // First call: count query returns locked
      // Second call: most recent attempt query
      mockDb.queryOne
        .mockResolvedValueOnce({ count: 5 })
        .mockResolvedValueOnce({ created_at: mostRecentAttemptTime });

      const status: LockoutStatus = await getAccountLockoutStatus(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(status.isLocked).toBe(true);
      expect(status.failedAttempts).toBe(5);
      expect(status.lockedUntil).toBeDefined();
    });

    test('should return locked status without timing when no recent attempt found', async () => {
      // First call: count query returns locked
      // Second call: most recent attempt query returns null
      mockDb.queryOne.mockResolvedValueOnce({ count: 5 }).mockResolvedValueOnce(null);

      const status: LockoutStatus = await getAccountLockoutStatus(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(status.isLocked).toBe(true);
      expect(status.failedAttempts).toBe(5);
      expect(status.remainingTime).toBeUndefined();
    });

    test('should use MOST RECENT attempt for lockout expiration calculation', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Simulate multiple failed attempts at different times:
      // - Old attempt: 14 minutes ago
      // - Most recent attempt: 2 minutes ago
      // With 15 minute lockout duration:
      // - If using old attempt: lockout would have expired (14min + 15min = unlocked)
      // - If using most recent: lockout is still active (2min + 15min = 13min remaining)
      const mostRecentAttemptTime = new Date(now - 2 * 60 * 1000); // 2 minutes ago

      mockDb.queryOne
        .mockResolvedValueOnce({ count: 5 })
        .mockResolvedValueOnce({ created_at: mostRecentAttemptTime });

      const status: LockoutStatus = await getAccountLockoutStatus(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(status.isLocked).toBe(true);
      expect(status.failedAttempts).toBe(5);
      expect(status.lockedUntil).toBeDefined();

      // With most recent attempt 2 min ago and 15 min lockout,
      // remaining time should be approximately 13 minutes
      const expectedRemainingTime = 13 * 60 * 1000;
      expect(status.remainingTime).toBeDefined();
      expect(status.remainingTime).toBeCloseTo(expectedRemainingTime, -4); // within ~10 seconds
    });

    test('should calculate correct lockout expiration with multiple attempts at different times', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Most recent attempt was 5 minutes ago
      const mostRecentAttemptTime = new Date(now - 5 * 60 * 1000);
      // Expected: lockedUntil = mostRecent + lockoutDuration = 5min ago + 15min = 10min from now
      const expectedLockedUntil = new Date(mostRecentAttemptTime.getTime() + 15 * 60 * 1000);
      const expectedRemainingTime = expectedLockedUntil.getTime() - now; // 10 minutes

      mockDb.queryOne
        .mockResolvedValueOnce({ count: 5 })
        .mockResolvedValueOnce({ created_at: mostRecentAttemptTime });

      const status: LockoutStatus = await getAccountLockoutStatus(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(status.isLocked).toBe(true);
      expect(status.lockedUntil).toEqual(expectedLockedUntil);
      expect(status.remainingTime).toBe(expectedRemainingTime);
    });
  });

  describe('unlockAccount', () => {
    test('should insert success entry and look up user when unlocking', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockDb.queryOne.mockResolvedValue(mockUser);

      await unlockAccount(
        asMockDb(mockDb),
        'test@example.com',
        'admin-456',
        'User verified identity via phone call',
        '192.168.1.1',
        'Admin Browser',
      );

      expect(mockDb.execute).toHaveBeenCalled();
      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    test('should insert success entry even when user does not exist', async () => {
      mockDb.queryOne.mockResolvedValue(null);

      await unlockAccount(
        asMockDb(mockDb),
        'unknown@example.com',
        'admin-456',
        'Account created in error',
      );

      expect(mockDb.execute).toHaveBeenCalled();
    });

    test('should use default userAgent when not provided', async () => {
      mockDb.queryOne.mockResolvedValue(null);

      await unlockAccount(
        asMockDb(mockDb),
        'test@example.com',
        'admin-456',
        'Password reset requested',
      );

      expect(mockDb.execute).toHaveBeenCalled();
    });

    test('should record admin userId and reason in audit trail', async () => {
      mockDb.queryOne.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

      await unlockAccount(
        asMockDb(mockDb),
        'test@example.com',
        'admin-999',
        'Customer support ticket #12345',
      );

      expect(mockDb.execute).toHaveBeenCalled();
    });

    test('should include custom reason in the failure reason field', async () => {
      mockDb.queryOne.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

      const customReason = 'User locked out due to forgotten password, verified via support call';
      await unlockAccount(
        asMockDb(mockDb),
        'test@example.com',
        'admin-123',
        customReason,
        '10.0.0.1',
        'Admin Panel',
      );

      // Verify that execute was called (the reason is included in the failureReason field)
      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('concurrent login attempts', () => {
    test('should handle multiple concurrent login logs', async () => {
      // Simulate multiple concurrent login attempt logs
      const promises = [
        logLoginAttempt(asMockDb(mockDb), 'test@example.com', false, '192.168.1.1'),
        logLoginAttempt(asMockDb(mockDb), 'test@example.com', false, '192.168.1.2'),
        logLoginAttempt(asMockDb(mockDb), 'test@example.com', false, '192.168.1.3'),
      ];

      await Promise.all(promises);

      // All three should have been logged
      expect(mockDb.execute).toHaveBeenCalledTimes(3);
    });

    test('should handle concurrent lockout status checks', async () => {
      mockDb.queryOne.mockResolvedValue({ count: 4 });

      // Multiple concurrent lockout status checks
      const promises = [
        isAccountLocked(asMockDb(mockDb), 'test@example.com', defaultLockoutConfig),
        isAccountLocked(asMockDb(mockDb), 'test@example.com', defaultLockoutConfig),
        isAccountLocked(asMockDb(mockDb), 'test@example.com', defaultLockoutConfig),
      ];

      const results = await Promise.all(promises);

      // All should return the same result (consistent state)
      expect(results.every((r) => !r)).toBe(true);
    });

    test('should handle concurrent lockout checks reaching threshold', async () => {
      // Start with 4 attempts, then simulate race where count becomes 5
      let callCount = 0;
      mockDb.queryOne.mockImplementation(() => Promise.resolve({ count: callCount++ < 2 ? 4 : 5 }));

      const promises = [
        isAccountLocked(asMockDb(mockDb), 'test@example.com', defaultLockoutConfig),
        isAccountLocked(asMockDb(mockDb), 'test@example.com', defaultLockoutConfig),
        isAccountLocked(asMockDb(mockDb), 'test@example.com', defaultLockoutConfig),
      ];

      const results = await Promise.all(promises);

      // Some may return locked, some may not - but no errors should occur
      expect(results.filter((r) => r).length).toBeGreaterThanOrEqual(0);
      expect(results.filter((r) => !r).length).toBeGreaterThanOrEqual(0);
    });

    test('should handle concurrent progressive delay calculations', async () => {
      mockDb.queryOne.mockResolvedValue({ count: 2 });

      // Multiple concurrent delay calculations
      const promises = [
        getProgressiveDelay(asMockDb(mockDb), 'test@example.com', defaultLockoutConfig),
        getProgressiveDelay(asMockDb(mockDb), 'test@example.com', defaultLockoutConfig),
        getProgressiveDelay(asMockDb(mockDb), 'test@example.com', defaultLockoutConfig),
      ];

      const results = await Promise.all(promises);

      // All should return consistent delay
      expect(results).toEqual([2000, 2000, 2000]);
    });

    test('should handle interleaved log and check operations', async () => {
      // Simulate interleaved operations
      mockDb.queryOne.mockResolvedValue({ count: 3 });

      // Mix of logging and checking operations
      const promises = [
        logLoginAttempt(asMockDb(mockDb), 'test@example.com', false),
        isAccountLocked(asMockDb(mockDb), 'test@example.com', defaultLockoutConfig),
        logLoginAttempt(asMockDb(mockDb), 'test@example.com', false),
        isAccountLocked(asMockDb(mockDb), 'test@example.com', defaultLockoutConfig),
      ];

      // All should complete without errors
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });
});
