// apps/server/src/lib/__tests__/security.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { loginAttempts } from '@abe-stack/db';

import { authConfig } from '../../config/auth';
import {
  applyProgressiveDelay,
  getProgressiveDelay,
  isAccountLocked,
  logLoginAttempt,
} from '../security';

import type { DbClient } from '@abe-stack/db';

// Mock database
const createMockDb = () => {
  const attempts: Array<{
    email: string;
    success: boolean;
    createdAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    failureReason: string | null;
  }> = [];

  return {
    attempts,
    db: {
      insert: () => ({
        values: (data: any) => {
          attempts.push({
            ...data,
            createdAt: new Date(),
          });
          return Promise.resolve();
        },
      }),
      select: () => ({
        from: () => ({
          where: () =>
            Promise.resolve([
              {
                count: attempts.filter(
                  (a) =>
                    a.email === 'test@example.com' &&
                    !a.success &&
                    Date.now() - a.createdAt.getTime() < authConfig.lockout.lockoutDurationMs,
                ).length,
              },
            ]),
        }),
      }),
    } as unknown as DbClient,
  };
};

describe('Security Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logLoginAttempt', () => {
    test('should log a successful login attempt', async () => {
      const { db, attempts } = createMockDb();

      await logLoginAttempt(db, 'user@example.com', true, '127.0.0.1', 'Mozilla/5.0');

      expect(attempts).toHaveLength(1);
      expect(attempts[0]).toMatchObject({
        email: 'user@example.com',
        success: true,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        failureReason: null,
      });
    });

    test('should log a failed login attempt with reason', async () => {
      const { db, attempts } = createMockDb();

      await logLoginAttempt(
        db,
        'user@example.com',
        false,
        '127.0.0.1',
        'Mozilla/5.0',
        'Invalid password',
      );

      expect(attempts).toHaveLength(1);
      expect(attempts[0]).toMatchObject({
        email: 'user@example.com',
        success: false,
        failureReason: 'Invalid password',
      });
    });

    test('should handle missing IP and user agent', async () => {
      const { db, attempts } = createMockDb();

      await logLoginAttempt(db, 'user@example.com', false);

      expect(attempts).toHaveLength(1);
      expect(attempts[0]).toMatchObject({
        email: 'user@example.com',
        ipAddress: null,
        userAgent: null,
      });
    });
  });

  describe('isAccountLocked', () => {
    test('should return false when no failed attempts', async () => {
      const { db } = createMockDb();

      const locked = await isAccountLocked(db, 'newuser@example.com');

      expect(locked).toBe(false);
    });

    test('should return true when max failed attempts reached', async () => {
      const { db, attempts } = createMockDb();

      // Add max failed attempts
      for (let i = 0; i < authConfig.lockout.maxAttempts; i++) {
        attempts.push({
          email: 'test@example.com',
          success: false,
          createdAt: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          failureReason: 'Invalid password',
        });
      }

      const locked = await isAccountLocked(db, 'test@example.com');

      expect(locked).toBe(true);
    });
  });

  describe('getProgressiveDelay', () => {
    test('should return 0 delay when no failed attempts', async () => {
      const { db } = createMockDb();

      const delay = await getProgressiveDelay(db, 'newuser@example.com');

      expect(delay).toBe(0);
    });

    test('should calculate exponential backoff correctly', async () => {
      const { db, attempts } = createMockDb();

      // Add 3 failed attempts
      for (let i = 0; i < 3; i++) {
        attempts.push({
          email: 'test@example.com',
          success: false,
          createdAt: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          failureReason: 'Invalid password',
        });
      }

      const delay = await getProgressiveDelay(db, 'test@example.com');

      // For 3 attempts: baseDelay * 2^(3-1) = 1000 * 4 = 4000ms
      expect(delay).toBe(authConfig.lockout.baseDelayMs * Math.pow(2, 2));
    });

    test('should cap delay at 30 seconds', async () => {
      const { db, attempts } = createMockDb();

      // Add many failed attempts to exceed cap
      for (let i = 0; i < 10; i++) {
        attempts.push({
          email: 'test@example.com',
          success: false,
          createdAt: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          failureReason: 'Invalid password',
        });
      }

      const delay = await getProgressiveDelay(db, 'test@example.com');

      expect(delay).toBe(30000); // Capped at 30 seconds
    });
  });

  describe('applyProgressiveDelay', () => {
    test('should apply delay based on failed attempts', async () => {
      const { db, attempts } = createMockDb();

      // Add 2 failed attempts
      for (let i = 0; i < 2; i++) {
        attempts.push({
          email: 'test@example.com',
          success: false,
          createdAt: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          failureReason: 'Invalid password',
        });
      }

      const startTime = Date.now();
      await applyProgressiveDelay(db, 'test@example.com');
      const endTime = Date.now();

      // For 2 attempts: baseDelay * 2^(2-1) = 1000 * 2 = 2000ms
      const expectedDelay = authConfig.lockout.baseDelayMs * 2;
      const actualDelay = endTime - startTime;

      // Allow some margin for execution time (±200ms)
      expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay - 200);
      expect(actualDelay).toBeLessThanOrEqual(expectedDelay + 200);
    });

    test('should not delay when no failed attempts', async () => {
      const { db } = createMockDb();

      const startTime = Date.now();
      await applyProgressiveDelay(db, 'newuser@example.com');
      const endTime = Date.now();

      const actualDelay = endTime - startTime;

      // Should complete almost immediately (< 100ms)
      expect(actualDelay).toBeLessThan(100);
    });
  });
});
