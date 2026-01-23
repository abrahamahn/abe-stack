// apps/server/src/modules/auth/security/__tests__/events.test.ts
import {
  getSecurityEventMetrics,
  getUserSecurityEvents,
  logAccountLockedEvent,
  logAccountUnlockedEvent,
  logSecurityEvent,
  logTokenFamilyRevokedEvent,
  logTokenReuseEvent,
} from '@auth/security/events';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { DbClient } from '@database';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockDb(): DbClient {
  return {
    execute: vi.fn().mockResolvedValue({ rows: [] }),
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    raw: vi.fn().mockResolvedValue([]),
  } as unknown as DbClient;
}

// ============================================================================
// Tests: logSecurityEvent
// ============================================================================

describe('Security Events', () => {
  let mockDb: DbClient;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('logSecurityEvent', () => {
    test('should log a security event to the database', async () => {
      const eventType = 'suspicious_login';
      const userId = 'user-123';
      const metadata = { ipAddress: '192.168.1.1', userAgent: 'test-agent' };
      const severity = 'low';

      await logSecurityEvent({
        db: mockDb,
        eventType,
        userId,
        metadata,
        severity,
      });

      expect(mockDb.execute).toHaveBeenCalled();
    });

    test('should handle missing optional parameters', async () => {
      const eventType = 'password_changed';
      const userId = 'user-123';

      await logSecurityEvent({
        db: mockDb,
        eventType,
        userId,
        severity: 'low',
      });

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('logAccountLockedEvent', () => {
    test('should log account locked event', async () => {
      const email = 'user@example.com';
      const attempts = 5;
      const ipAddress = '192.168.1.1';
      const userAgent = 'test-agent';

      await logAccountLockedEvent(mockDb, email, attempts, ipAddress, userAgent);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('security_events'),
        }),
        expect.arrayContaining([email, 'account_locked', 'medium', expect.any(Object)]),
      );
    });
  });

  describe('logAccountUnlockedEvent', () => {
    test('should log account unlocked event', async () => {
      const userId = 'user-123';
      const unlockedBy = 'admin-456';
      const ipAddress = '192.168.1.1';
      const userAgent = 'test-agent';

      await logAccountUnlockedEvent(mockDb, userId, 'user@example.com', unlockedBy, ipAddress, userAgent);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('security_events'),
        }),
        expect.arrayContaining([userId, 'account_unlocked', 'low', expect.any(Object)]),
      );
    });
  });

  describe('logTokenReuseEvent', () => {
    test('should log token reuse event', async () => {
      const userId = 'user-123';
      const tokenHash = 'hashed-token';
      const ipAddress = '192.168.1.1';
      const userAgent = 'test-agent';

      await logTokenReuseEvent(mockDb, userId, 'user@example.com', tokenHash, ipAddress, userAgent);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('security_events'),
        }),
        expect.arrayContaining([userId, 'token_reuse_detected', 'critical', expect.any(Object)]),
      );
    });
  });

  describe('logTokenFamilyRevokedEvent', () => {
    test('should log token family revoked event', async () => {
      const userId = 'user-123';
      const revokedBy = 'admin-456';
      const reason = 'compromised';
      const ipAddress = '192.168.1.1';
      const userAgent = 'test-agent';

      await logTokenFamilyRevokedEvent(mockDb, userId, revokedBy, reason, ipAddress, userAgent);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('security_events'),
        }),
        expect.arrayContaining([userId, 'token_family.revoked', 'medium', expect.any(Object)]),
      );
    });
  });

  describe('getUserSecurityEvents', () => {
    test('should retrieve user security events', async () => {
      const userId = 'user-123';
      const limit = 10;

      // Mock the query to return sample events
      vi.mocked(mockDb.query).mockResolvedValue([
        {
          id: 'event-1',
          event_type: 'login_success',
          severity: 'info',
          created_at: new Date(),
        },
      ]);

      const result = await getUserSecurityEvents(mockDb, userId, limit);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'event-1',
        eventType: 'login_success',
        severity: 'info',
        createdAt: expect.any(Date),
      });
      expect(mockDb.query).toHaveBeenCalled();
    });
  });

  describe('getSecurityEventMetrics', () => {
    test('should retrieve security event metrics', async () => {
      // Mock the query to return sample metrics
      vi.mocked(mockDb.query).mockResolvedValue([
        { event_type: 'token_reuse_detected', severity: 'critical' },
        { event_type: 'account_locked', severity: 'medium' },
        { event_type: 'other_event', severity: 'critical' },
      ]);

      const result = await getSecurityEventMetrics(mockDb);

      expect(result).toEqual({
        tokenReuseCount: 1,
        accountLockedCount: 1,
        criticalEventCount: 2,
        totalEventCount: 3,
      });
    });
  });
});
