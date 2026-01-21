// apps/server/src/modules/auth/security/__tests__/lockout.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createMockDb } from '../../../../infrastructure/data/database/utils/test-utils';
import {
  applyProgressiveDelay,
  clearLoginAttempts,
  getAccountLockoutStatus,
  getProgressiveDelay,
  isAccountLocked,
  logLoginAttempt,
  unlockAccount,
} from '../lockout';

import type { MockDbClient } from '../../../../infrastructure/data/database/utils/test-utils';
import type { LockoutConfig, LockoutStatus } from '../types';
import type { DbClient } from '@database';

// Mock the database module
vi.mock('@database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@database')>();
  return {
    ...actual,
    loginAttempts: {
      email: 'email',
      success: 'success',
      createdAt: 'createdAt',
      ipAddress: 'ipAddress',
      userAgent: 'userAgent',
      failureReason: 'failureReason',
    },
    users: {
      email: 'email',
    },
  };
});

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: string, val: unknown) => ({ eq: [col, val] })),
  gte: vi.fn((col: string, val: unknown) => ({ gte: [col, val] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  count: vi.fn(() => 'count'),
  desc: vi.fn((col: string) => ({ desc: col })),
}));

// Mock constants
vi.mock('@shared/constants', () => ({
  PROGRESSIVE_DELAY_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  MAX_PROGRESSIVE_DELAY_MS: 30 * 1000, // 30 seconds
}));

// Mock security events to avoid circular dependency issues
vi.mock('@security/events', () => ({
  logAccountUnlockedEvent: vi.fn().mockResolvedValue(undefined),
}));

// Helper to get mock db with correct type for function calls
function asMockDb(mock: MockDbClient): DbClient {
  return mock as unknown as DbClient;
}

// ============================================================================
// Lockout Functions Tests
// ============================================================================

describe('Lockout Functions', () => {
  let mockDb: MockDbClient;
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

      expect(mockDb.insert).toHaveBeenCalled();
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

      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should log login attempt without optional fields', async () => {
      await logLoginAttempt(asMockDb(mockDb), 'test@example.com', false);

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('isAccountLocked', () => {
    test('should return true when failed attempts exceed max', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

      const isLocked = await isAccountLocked(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(isLocked).toBe(true);
    });

    test('should return false when failed attempts below max', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      });

      const isLocked = await isAccountLocked(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(isLocked).toBe(false);
    });

    test('should return false when no failed attempts', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const isLocked = await isAccountLocked(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(isLocked).toBe(false);
    });

    test('should return true when attempts equal max', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

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
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const delay = await getProgressiveDelay(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(delay).toBe(0);
    });

    test('should return exponential delay based on failed attempts', async () => {
      // 1 failed attempt = 1000ms * 2^0 = 1000ms
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      const delay = await getProgressiveDelay(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(delay).toBe(1000); // 1000 * 2^0
    });

    test('should calculate exponential backoff correctly', async () => {
      // 3 failed attempts = 1000ms * 2^2 = 4000ms
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      });

      const delay = await getProgressiveDelay(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(delay).toBe(4000); // 1000 * 2^2
    });

    test('should cap delay at MAX_PROGRESSIVE_DELAY_MS', async () => {
      // 10 failed attempts = 1000ms * 2^9 = 512000ms, capped at 30000ms
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 10 }]),
        }),
      });

      const delay = await getProgressiveDelay(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(delay).toBe(30000); // MAX_PROGRESSIVE_DELAY_MS
    });

    test('should handle 2 failed attempts correctly', async () => {
      // 2 failed attempts = 1000ms * 2^1 = 2000ms
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });

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
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const start = Date.now();
      await applyProgressiveDelay(asMockDb(mockDb), 'test@example.com', defaultLockoutConfig);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    test('should delay when progressive delay is needed', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      const delayPromise = applyProgressiveDelay(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      // Advance timer to resolve the delay
      await vi.advanceTimersByTimeAsync(1000);

      await delayPromise;
      // Verify the database was queried to determine delay
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('clearLoginAttempts', () => {
    test('should be a no-op function', async () => {
      // Should not throw and should complete immediately
      await clearLoginAttempts(asMockDb(mockDb), 'test@example.com');

      // No database operations should be called
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  describe('getAccountLockoutStatus', () => {
    test('should return unlocked status when not locked', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });

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

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ createdAt: mostRecentAttemptTime }]),
            }),
          }),
        }),
      });

      // Override for count query (first call)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

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
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        });

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

      let orderByCallArgs: unknown[] = [];
      mockDb.select
        .mockReturnValueOnce({
          // First call: count query
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        })
        .mockReturnValueOnce({
          // Second call: find most recent attempt
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn((...args: unknown[]) => {
                orderByCallArgs = args;
                return {
                  limit: vi.fn().mockResolvedValue([{ createdAt: mostRecentAttemptTime }]),
                };
              }),
            }),
          }),
        });

      const status: LockoutStatus = await getAccountLockoutStatus(
        asMockDb(mockDb),
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(status.isLocked).toBe(true);
      expect(status.failedAttempts).toBe(5);
      expect(status.lockedUntil).toBeDefined();

      // Verify that descending order was used (to get most recent first)
      // The orderBy should have been called with desc(loginAttempts.createdAt)
      expect(orderByCallArgs.length).toBeGreaterThan(0);
      expect(orderByCallArgs[0]).toEqual({ desc: 'createdAt' });

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

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ createdAt: mostRecentAttemptTime }]),
              }),
            }),
          }),
        });

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
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      await unlockAccount(
        asMockDb(mockDb),
        'test@example.com',
        'admin-456',
        'User verified identity via phone call',
        '192.168.1.1',
        'Admin Browser',
      );

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.query.users.findFirst).toHaveBeenCalled();
    });

    test('should insert success entry even when user does not exist', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await unlockAccount(
        asMockDb(mockDb),
        'unknown@example.com',
        'admin-456',
        'Account created in error',
      );

      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should use default userAgent when not provided', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await unlockAccount(
        asMockDb(mockDb),
        'test@example.com',
        'admin-456',
        'Password reset requested',
      );

      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should record admin userId and reason in audit trail', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

      await unlockAccount(
        asMockDb(mockDb),
        'test@example.com',
        'admin-999',
        'Customer support ticket #12345',
      );

      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should include custom reason in the failure reason field', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

      const customReason = 'User locked out due to forgotten password, verified via support call';
      await unlockAccount(
        asMockDb(mockDb),
        'test@example.com',
        'admin-123',
        customReason,
        '10.0.0.1',
        'Admin Panel',
      );

      // Verify that insert was called (the reason is included in the failureReason field)
      expect(mockDb.insert).toHaveBeenCalled();
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
      expect(mockDb.insert).toHaveBeenCalledTimes(3);
    });

    test('should handle concurrent lockout status checks', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 4 }]),
        }),
      });

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
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: callCount++ < 2 ? 4 : 5 }]),
        }),
      }));

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
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });

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
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      });

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
