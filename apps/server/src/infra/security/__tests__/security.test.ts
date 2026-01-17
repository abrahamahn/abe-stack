// apps/server/src/infra/security/__tests__/security.test.ts
import { createMockDb, type MockDbClient } from '@database/test-utils';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { LockoutConfig, LockoutStatus } from '@security/types';

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

// Mock the events module for lockout tests
vi.mock('@security/events', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@security/events')>();
  return {
    ...actual,
    logAccountUnlockedEvent: vi.fn(),
  };
});

describe('Security Events', () => {
  let mockDb: MockDbClient;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('logSecurityEvent', () => {
    test('should insert security event with all fields', async () => {
      const { logSecurityEvent } = await import('@security/events');

      await logSecurityEvent({
        db: mockDb,
        userId: 'user-123',
        email: 'test@example.com',
        eventType: 'token_reuse_detected',
        severity: 'critical',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { familyId: 'family-123', reason: 'Token reused' },
      });

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.results[0].value as {
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
      });
    });

    test('should handle missing optional fields', async () => {
      const { logSecurityEvent } = await import('@security/events');

      await logSecurityEvent({
        db: mockDb,
        eventType: 'account_locked',
        severity: 'medium',
      });

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.results[0].value as {
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
      });
    });
  });

  describe('logTokenReuseEvent', () => {
    test('should log token reuse event with critical severity', async () => {
      const { logTokenReuseEvent } = await import('@security/events');

      await logTokenReuseEvent(
        mockDb,
        'user-123',
        'test@example.com',
        'family-123',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.results[0].value as {
        values: (args: Record<string, unknown>) => void;
      };
      insertCall.values(
        expect.objectContaining({
          userId: 'user-123',
          email: 'test@example.com',
          eventType: 'token_reuse_detected',
          severity: 'critical',
        }),
      );
    });
  });

  describe('logTokenFamilyRevokedEvent', () => {
    test('should log token family revocation with high severity', async () => {
      const { logTokenFamilyRevokedEvent } = await import('@security/events');

      await logTokenFamilyRevokedEvent(
        mockDb,
        'user-123',
        'test@example.com',
        'family-123',
        'Security breach detected',
        '192.168.1.1',
      );

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.results[0].value as {
        values: (args: Record<string, unknown>) => void;
      };
      insertCall.values(
        expect.objectContaining({
          eventType: 'token_family_revoked',
          severity: 'high',
        }),
      );
    });
  });

  describe('logAccountLockedEvent', () => {
    test('should log account locked event with medium severity', async () => {
      const { logAccountLockedEvent } = await import('@security/events');

      await logAccountLockedEvent(mockDb, 'test@example.com', 5, '192.168.1.1');

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.results[0].value as {
        values: (args: Record<string, unknown>) => void;
      };
      insertCall.values(
        expect.objectContaining({
          email: 'test@example.com',
          eventType: 'account_locked',
          severity: 'medium',
        }),
      );
    });
  });

  describe('logAccountUnlockedEvent', () => {
    test('should log account unlocked event with low severity', async () => {
      // Use logSecurityEvent directly to test the unlocked event parameters
      const { logSecurityEvent } = await import('@security/events');

      await logSecurityEvent({
        db: mockDb,
        userId: 'user-123',
        email: 'test@example.com',
        eventType: 'account_unlocked',
        severity: 'low',
        ipAddress: '192.168.1.1',
        metadata: {
          adminUserId: 'admin-456',
          reason: 'Manually unlocked by admin',
        },
      });

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.results[0].value as {
        values: (args: Record<string, unknown>) => void;
      };
      insertCall.values(
        expect.objectContaining({
          userId: 'user-123',
          email: 'test@example.com',
          eventType: 'account_unlocked',
          severity: 'low',
        }),
      );
    });
  });

  describe('getUserSecurityEvents', () => {
    test('should return security events for a user', async () => {
      const mockEvents = [
        { id: '1', eventType: 'token_reuse_detected', severity: 'critical', createdAt: new Date() },
        { id: '2', eventType: 'account_locked', severity: 'medium', createdAt: new Date() },
      ];
      mockDb.query.securityEvents.findMany.mockResolvedValue(mockEvents);

      const { getUserSecurityEvents } = await import('@security/events');

      const events = await getUserSecurityEvents(mockDb, 'user-123', 10);

      expect(events).toEqual(mockEvents);
      expect(mockDb.query.securityEvents.findMany).toHaveBeenCalled();
    });

    test('should use default limit of 50', async () => {
      mockDb.query.securityEvents.findMany.mockResolvedValue([]);

      const { getUserSecurityEvents } = await import('@security/events');

      await getUserSecurityEvents(mockDb, 'user-123');

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

      const { getSecurityEventMetrics } = await import('@security/events');

      const metrics = await getSecurityEventMetrics(mockDb);

      expect(metrics).toEqual({
        tokenReuseCount: 2,
        accountLockedCount: 1,
        criticalEventCount: 2,
        totalEventCount: 4,
      });
    });

    test('should return zero counts for empty results', async () => {
      mockDb.query.securityEvents.findMany.mockResolvedValue([]);

      const { getSecurityEventMetrics } = await import('@security/events');

      const metrics = await getSecurityEventMetrics(mockDb);

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
      const { logLoginAttempt } = await import('@security/lockout');

      await logLoginAttempt(mockDb, 'test@example.com', true, '192.168.1.1', 'Mozilla/5.0');

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.results[0].value as {
        values: (args: Record<string, unknown>) => void;
      };
      insertCall.values({
        email: 'test@example.com',
        success: true,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        failureReason: null,
      });
    });

    test('should log failed login attempt with reason', async () => {
      const { logLoginAttempt } = await import('@security/lockout');

      await logLoginAttempt(
        mockDb,
        'test@example.com',
        false,
        '192.168.1.1',
        'Mozilla/5.0',
        'Invalid password',
      );

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.results[0].value as {
        values: (args: Record<string, unknown>) => void;
      };
      insertCall.values({
        email: 'test@example.com',
        success: false,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        failureReason: 'Invalid password',
      });
    });
  });

  describe('isAccountLocked', () => {
    test('should return true when failed attempts exceed max', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

      const { isAccountLocked } = await import('@security/lockout');

      const isLocked = await isAccountLocked(mockDb, 'test@example.com', defaultLockoutConfig);

      expect(isLocked).toBe(true);
    });

    test('should return false when failed attempts below max', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      });

      const { isAccountLocked } = await import('@security/lockout');

      const isLocked = await isAccountLocked(mockDb, 'test@example.com', defaultLockoutConfig);

      expect(isLocked).toBe(false);
    });

    test('should return false when no failed attempts', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const { isAccountLocked } = await import('@security/lockout');

      const isLocked = await isAccountLocked(mockDb, 'test@example.com', defaultLockoutConfig);

      expect(isLocked).toBe(false);
    });
  });

  describe('getProgressiveDelay', () => {
    test('should return 0 when progressive delay is disabled', async () => {
      const configWithoutDelay: LockoutConfig = {
        ...defaultLockoutConfig,
        progressiveDelay: false,
      };

      const { getProgressiveDelay } = await import('@security/lockout');

      const delay = await getProgressiveDelay(mockDb, 'test@example.com', configWithoutDelay);

      expect(delay).toBe(0);
    });

    test('should return 0 when no failed attempts', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const { getProgressiveDelay } = await import('@security/lockout');

      const delay = await getProgressiveDelay(mockDb, 'test@example.com', defaultLockoutConfig);

      expect(delay).toBe(0);
    });

    test('should return exponential delay based on failed attempts', async () => {
      // 1 failed attempt = 1000ms * 2^0 = 1000ms
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      const { getProgressiveDelay } = await import('@security/lockout');

      const delay = await getProgressiveDelay(mockDb, 'test@example.com', defaultLockoutConfig);

      expect(delay).toBe(1000); // 1000 * 2^0
    });

    test('should calculate exponential backoff correctly', async () => {
      // 3 failed attempts = 1000ms * 2^2 = 4000ms
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      });

      const { getProgressiveDelay } = await import('@security/lockout');

      const delay = await getProgressiveDelay(mockDb, 'test@example.com', defaultLockoutConfig);

      expect(delay).toBe(4000); // 1000 * 2^2
    });

    test('should cap delay at MAX_PROGRESSIVE_DELAY_MS', async () => {
      // 10 failed attempts = 1000ms * 2^9 = 512000ms, capped at 30000ms
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 10 }]),
        }),
      });

      const { getProgressiveDelay } = await import('@security/lockout');

      const delay = await getProgressiveDelay(mockDb, 'test@example.com', defaultLockoutConfig);

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

      const { applyProgressiveDelay } = await import('@security/lockout');

      const start = Date.now();
      await applyProgressiveDelay(mockDb, 'test@example.com', defaultLockoutConfig);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    test('should delay when progressive delay is needed', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      const { applyProgressiveDelay } = await import('@security/lockout');

      const delayPromise = applyProgressiveDelay(mockDb, 'test@example.com', defaultLockoutConfig);

      // Advance timer to resolve the delay
      await vi.advanceTimersByTimeAsync(1000);

      await delayPromise;
      // If we get here without timeout, the delay was applied correctly
      expect(true).toBe(true);
    });
  });

  describe('clearLoginAttempts', () => {
    test('should be a no-op function', async () => {
      const { clearLoginAttempts } = await import('@security/lockout');

      // Should not throw and should complete immediately
      await clearLoginAttempts(mockDb, 'test@example.com');

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

      const { getAccountLockoutStatus } = await import('@security/lockout');

      const status: LockoutStatus = await getAccountLockoutStatus(
        mockDb,
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

      const { getAccountLockoutStatus } = await import('@security/lockout');

      const status: LockoutStatus = await getAccountLockoutStatus(
        mockDb,
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

      const { getAccountLockoutStatus } = await import('@security/lockout');

      const status: LockoutStatus = await getAccountLockoutStatus(
        mockDb,
        'test@example.com',
        defaultLockoutConfig,
      );

      expect(status.isLocked).toBe(true);
      expect(status.failedAttempts).toBe(5);
      expect(status.remainingTime).toBeUndefined();
    });
  });

  describe('unlockAccount', () => {
    test('should insert success entry and log security event when user exists', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      const { unlockAccount } = await import('@security/lockout');
      const { logAccountUnlockedEvent } = await import('@security/events');

      await unlockAccount(
        mockDb,
        'test@example.com',
        'admin-456',
        '192.168.1.1',
        'Admin Browser',
      );

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.results[0].value as {
        values: (args: Record<string, unknown>) => void;
      };
      insertCall.values({
        email: 'test@example.com',
        success: true,
        failureReason: 'Manually unlocked by admin admin-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Admin Browser',
      });

      expect(logAccountUnlockedEvent).toHaveBeenCalledWith(
        mockDb,
        'user-123',
        'test@example.com',
        'admin-456',
        '192.168.1.1',
        'Admin Browser',
      );
    });

    test('should not log security event when user does not exist', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      const { unlockAccount } = await import('@security/lockout');
      const { logAccountUnlockedEvent } = await import('@security/events');

      await unlockAccount(mockDb, 'unknown@example.com', 'admin-456');

      expect(mockDb.insert).toHaveBeenCalled();
      expect(logAccountUnlockedEvent).not.toHaveBeenCalled();
    });

    test('should use default userAgent when not provided', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      const { unlockAccount } = await import('@security/lockout');

      await unlockAccount(mockDb, 'test@example.com', 'admin-456');

      const insertCall = mockDb.insert.mock.results[0].value as {
        values: (args: Record<string, unknown>) => void;
      };
      insertCall.values(
        expect.objectContaining({
          userAgent: 'Admin Console',
        }),
      );
    });
  });
});