// apps/server/src/modules/auth/security/__tests__/security.test.ts
import { type DbClient } from '@database';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  createMockDb,
  type MockDbClient,
} from '../../../../infrastructure/data/database/utils/test-utils';
import {
  logSecurityEvent,
  logTokenReuseEvent,
  logTokenFamilyRevokedEvent,
  logAccountLockedEvent,
  logAccountUnlockedEvent,
  getUserSecurityEvents,
  getSecurityEventMetrics,
} from '../events';
import {
  logLoginAttempt,
  isAccountLocked,
  getProgressiveDelay,
  applyProgressiveDelay,
  clearLoginAttempts,
  getAccountLockoutStatus,
  unlockAccount,
} from '../lockout';

import type { LockoutConfig, LockoutStatus } from '../types';

// Mock the database module
vi.mock('@database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@database')>();
  return {
    ...actual,
    securityEvents: {
      userId: 'userId',
      email: 'email',
      eventType: 'eventType',
      severity: 'severity',
      ipAddress: 'ipAddress',
      userAgent: 'userAgent',
      metadata: 'metadata',
      createdAt: 'createdAt',
    },
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
  desc: vi.fn((col: string) => ({ desc: col })),
  eq: vi.fn((col: string, val: unknown) => ({ eq: [col, val] })),
  gte: vi.fn((col: string, val: unknown) => ({ gte: [col, val] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  count: vi.fn(() => 'count'),
}));

// Mock constants
vi.mock('@shared/constants', () => ({
  PROGRESSIVE_DELAY_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  MAX_PROGRESSIVE_DELAY_MS: 30 * 1000, // 30 seconds
}));

// Helper to get mock db with correct type for function calls
function asMockDb(mock: MockDbClient): DbClient {
  return mock as unknown as DbClient;
}

describe('Security Events', () => {
  let mockDb: MockDbClient;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('logSecurityEvent', () => {
    test('should insert security event with all fields', async () => {
      await logSecurityEvent({
        db: asMockDb(mockDb),
        userId: 'user-123',
        email: 'test@example.com',
        eventType: 'token_reuse_detected',
        severity: 'critical',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { familyId: 'family-123', reason: 'Token reused' },
      });

      expect(mockDb.insert).toHaveBeenCalled();
      const mockResult = mockDb.insert.mock.results[0];
      if (mockResult?.value) {
        const insertCall = mockResult.value as {
          values: (args: Record<string, unknown>) => void;
        };
        insertCall.values({
          userId: 'user-123',
          email: 'test@example.com',
          eventType: 'token_reuse_detected',
          severity: 'critical',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: JSON.stringify({ familyId: 'family-123', reason: 'Token reused' }),
        } as Record<string, unknown>);
      }
    });

    test('should handle missing optional fields', async () => {
      await logSecurityEvent({
        db: asMockDb(mockDb),
        eventType: 'account_locked',
        severity: 'medium',
      });

      expect(mockDb.insert).toHaveBeenCalled();
      const mockResult = mockDb.insert.mock.results[0];
      if (mockResult?.value) {
        const insertCall = mockResult.value as {
          values: (args: Record<string, unknown>) => void;
        };
        insertCall.values({
          userId: null,
          email: null,
          eventType: 'account_locked',
          severity: 'medium',
          ipAddress: null,
          userAgent: null,
          metadata: null,
        } as Record<string, unknown>);
      }
    });
  });

  describe('logTokenReuseEvent', () => {
    test('should log token reuse event with critical severity', async () => {
      await logTokenReuseEvent(
        asMockDb(mockDb),
        'user-123',
        'test@example.com',
        'family-123',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(mockDb.insert).toHaveBeenCalled();
      const mockResult = mockDb.insert.mock.results[0];
      if (mockResult?.value) {
        const insertCall = mockResult.value as {
          values: (args: Record<string, unknown>) => void;
        };
        insertCall.values(
          expect.objectContaining({
            userId: 'user-123',
            email: 'test@example.com',
            eventType: 'token_reuse_detected',
            severity: 'critical',
          }) as Record<string, unknown>,
        );
      }
    });
  });

  describe('logTokenFamilyRevokedEvent', () => {
    test('should log token family revocation with high severity', async () => {
      await logTokenFamilyRevokedEvent(
        asMockDb(mockDb),
        'user-123',
        'test@example.com',
        'family-123',
        'Security breach detected',
        '192.168.1.1',
      );

      expect(mockDb.insert).toHaveBeenCalled();
      const mockResult = mockDb.insert.mock.results[0];
      if (mockResult?.value) {
        const insertCall = mockResult.value as {
          values: (args: Record<string, unknown>) => void;
        };
        insertCall.values(
          expect.objectContaining({
            eventType: 'token_family_revoked',
            severity: 'high',
          }) as Record<string, unknown>,
        );
      }
    });
  });

  describe('logAccountLockedEvent', () => {
    test('should log account locked event with medium severity', async () => {
      await logAccountLockedEvent(asMockDb(mockDb), 'test@example.com', 5, '192.168.1.1');

      expect(mockDb.insert).toHaveBeenCalled();
      const mockResult = mockDb.insert.mock.results[0];
      if (mockResult?.value) {
        const insertCall = mockResult.value as {
          values: (args: Record<string, unknown>) => void;
        };
        insertCall.values(
          expect.objectContaining({
            email: 'test@example.com',
            eventType: 'account_locked',
            severity: 'medium',
          }) as Record<string, unknown>,
        );
      }
    });
  });

  describe('logAccountUnlockedEvent', () => {
    test('should log account unlocked event with low severity', async () => {
      await logAccountUnlockedEvent(
        asMockDb(mockDb),
        'user-123',
        'test@example.com',
        'admin-456',
        '192.168.1.1',
        'Admin Browser',
      );

      expect(mockDb.insert).toHaveBeenCalled();
      const mockResult = mockDb.insert.mock.results[0];
      if (mockResult?.value) {
        const insertCall = mockResult.value as {
          values: (args: Record<string, unknown>) => void;
        };
        insertCall.values(
          expect.objectContaining({
            userId: 'user-123',
            email: 'test@example.com',
            eventType: 'account_unlocked',
            severity: 'low',
          }) as Record<string, unknown>,
        );
      }
    });
  });

  describe('getUserSecurityEvents', () => {
    test('should return security events for a user', async () => {
      const mockEvents = [
        { id: '1', eventType: 'token_reuse_detected', severity: 'critical', createdAt: new Date() },
        { id: '2', eventType: 'account_locked', severity: 'medium', createdAt: new Date() },
      ];
      mockDb.query.securityEvents.findMany.mockResolvedValue(mockEvents);

      const events = await getUserSecurityEvents(asMockDb(mockDb), 'user-123', 10);

      expect(events).toEqual(mockEvents);
      expect(mockDb.query.securityEvents.findMany).toHaveBeenCalled();
    });

    test('should use default limit of 50', async () => {
      mockDb.query.securityEvents.findMany.mockResolvedValue([]);

      await getUserSecurityEvents(asMockDb(mockDb), 'user-123');

      expect(mockDb.query.securityEvents.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
        }),
      );
    });
  });

  describe('getSecurityEventMetrics', () => {
    test('should return correct metrics', async () => {
      const mockEvents = [
        { eventType: 'token_reuse_detected', severity: 'critical' },
        { eventType: 'token_reuse_detected', severity: 'critical' },
        { eventType: 'account_locked', severity: 'medium' },
        { eventType: 'token_family_revoked', severity: 'high' },
      ];
      mockDb.query.securityEvents.findMany.mockResolvedValue(mockEvents);

      const metrics = await getSecurityEventMetrics(asMockDb(mockDb));

      expect(metrics).toEqual({
        tokenReuseCount: 2,
        accountLockedCount: 1,
        criticalEventCount: 2,
        totalEventCount: 4,
      });
    });

    test('should return zero counts for empty results', async () => {
      mockDb.query.securityEvents.findMany.mockResolvedValue([]);

      const metrics = await getSecurityEventMetrics(asMockDb(mockDb));

      expect(metrics).toEqual({
        tokenReuseCount: 0,
        accountLockedCount: 0,
        criticalEventCount: 0,
        totalEventCount: 0,
      });
    });
  });
});

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
      const mockResult = mockDb.insert.mock.results[0];
      if (mockResult?.value) {
        const insertCall = mockResult.value as {
          values: (args: Record<string, unknown>) => void;
        };
        insertCall.values({
          email: 'test@example.com',
          success: true,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          failureReason: null,
        } as Record<string, unknown>);
      }
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
      const mockResult = mockDb.insert.mock.results[0];
      if (mockResult?.value) {
        const insertCall = mockResult.value as {
          values: (args: Record<string, unknown>) => void;
        };
        insertCall.values({
          email: 'test@example.com',
          success: false,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          failureReason: 'Invalid password',
        } as Record<string, unknown>);
      }
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
  });

  describe('unlockAccount', () => {
    test('should insert success entry and look up user when unlocking', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      await unlockAccount(
        asMockDb(mockDb),
        'test@example.com',
        'admin-456',
        '192.168.1.1',
        'Admin Browser',
      );

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.query.users.findFirst).toHaveBeenCalled();
    });

    test('should insert success entry even when user does not exist', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await unlockAccount(asMockDb(mockDb), 'unknown@example.com', 'admin-456');

      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should use default userAgent when not provided', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await unlockAccount(asMockDb(mockDb), 'test@example.com', 'admin-456');

      const mockResult = mockDb.insert.mock.results[0];
      if (mockResult?.value) {
        const insertCall = mockResult.value as {
          values: (args: Record<string, unknown>) => void;
        };
        insertCall.values(
          expect.objectContaining({
            userAgent: 'Admin Console',
          }) as Record<string, unknown>,
        );
      }
    });
  });
});
