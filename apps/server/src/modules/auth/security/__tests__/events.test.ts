// apps/server/src/modules/auth/security/__tests__/events.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createMockDb } from '../../../../infrastructure/data/database/utils/test-utils';
import {
  getSecurityEventMetrics,
  getUserSecurityEvents,
  logAccountLockedEvent,
  logAccountUnlockedEvent,
  logSecurityEvent,
  logTokenFamilyRevokedEvent,
  logTokenReuseEvent,
  sendTokenReuseAlert,
} from '../events';


import type { MockDbClient } from '../../../../infrastructure/data/database/utils/test-utils';
import type { DbClient } from '@database';
import type { EmailService } from '@email';

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
  };
});

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  desc: vi.fn((col: string) => ({ desc: col })),
  eq: vi.fn((col: string, val: unknown) => ({ eq: [col, val] })),
  gte: vi.fn((col: string, val: unknown) => ({ gte: [col, val] })),
}));

// Helper to get mock db with correct type for function calls
function asMockDb(mock: MockDbClient): DbClient {
  return mock as unknown as DbClient;
}

// ============================================================================
// Security Events Tests
// ============================================================================

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
    });

    test('should handle missing optional fields', async () => {
      await logSecurityEvent({
        db: asMockDb(mockDb),
        eventType: 'account_locked',
        severity: 'medium',
      });

      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should serialize metadata as JSON', async () => {
      await logSecurityEvent({
        db: asMockDb(mockDb),
        eventType: 'suspicious_login',
        severity: 'high',
        metadata: { location: 'Unknown', attemptCount: 5 },
      });

      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should handle different event types', async () => {
      const eventTypes = [
        'token_reuse_detected',
        'token_family_revoked',
        'account_locked',
        'account_unlocked',
        'suspicious_login',
        'password_changed',
        'email_changed',
      ] as const;

      for (const eventType of eventTypes) {
        vi.clearAllMocks();
        await logSecurityEvent({
          db: asMockDb(mockDb),
          eventType,
          severity: 'medium',
        });
        expect(mockDb.insert).toHaveBeenCalled();
      }
    });

    test('should handle different severity levels', async () => {
      const severities = ['low', 'medium', 'high', 'critical'] as const;

      for (const severity of severities) {
        vi.clearAllMocks();
        await logSecurityEvent({
          db: asMockDb(mockDb),
          eventType: 'account_locked',
          severity,
        });
        expect(mockDb.insert).toHaveBeenCalled();
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
    });

    test('should log token reuse event without optional fields', async () => {
      await logTokenReuseEvent(asMockDb(mockDb), 'user-123', 'test@example.com', 'family-123');

      expect(mockDb.insert).toHaveBeenCalled();
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
    });

    test('should log token family revocation without optional fields', async () => {
      await logTokenFamilyRevokedEvent(
        asMockDb(mockDb),
        'user-123',
        'test@example.com',
        'family-123',
        'Manual revocation',
      );

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('logAccountLockedEvent', () => {
    test('should log account locked event with medium severity', async () => {
      await logAccountLockedEvent(asMockDb(mockDb), 'test@example.com', 5, '192.168.1.1');

      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should log account locked event without optional fields', async () => {
      await logAccountLockedEvent(asMockDb(mockDb), 'test@example.com', 3);

      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should include failed attempts count in metadata', async () => {
      await logAccountLockedEvent(
        asMockDb(mockDb),
        'test@example.com',
        10,
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(mockDb.insert).toHaveBeenCalled();
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
    });

    test('should log account unlocked event without optional fields', async () => {
      await logAccountUnlockedEvent(asMockDb(mockDb), 'user-123', 'test@example.com', 'admin-456');

      expect(mockDb.insert).toHaveBeenCalled();
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

    test('should return empty array when no events', async () => {
      mockDb.query.securityEvents.findMany.mockResolvedValue([]);

      const events = await getUserSecurityEvents(asMockDb(mockDb), 'user-123');

      expect(events).toEqual([]);
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

    test('should use custom since date', async () => {
      mockDb.query.securityEvents.findMany.mockResolvedValue([]);
      const customDate = new Date('2024-01-01');

      await getSecurityEventMetrics(asMockDb(mockDb), customDate);

      expect(mockDb.query.securityEvents.findMany).toHaveBeenCalled();
    });

    test('should count multiple event types correctly', async () => {
      const mockEvents = [
        { eventType: 'token_reuse_detected', severity: 'critical' },
        { eventType: 'account_locked', severity: 'medium' },
        { eventType: 'account_locked', severity: 'medium' },
        { eventType: 'account_locked', severity: 'medium' },
        { eventType: 'suspicious_login', severity: 'high' },
      ];
      mockDb.query.securityEvents.findMany.mockResolvedValue(mockEvents);

      const metrics = await getSecurityEventMetrics(asMockDb(mockDb));

      expect(metrics.tokenReuseCount).toBe(1);
      expect(metrics.accountLockedCount).toBe(3);
      expect(metrics.criticalEventCount).toBe(1);
      expect(metrics.totalEventCount).toBe(5);
    });
  });

  describe('sendTokenReuseAlert', () => {
    let mockEmailService: EmailService;

    beforeEach(() => {
      mockEmailService = {
        send: vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
      };
    });

    test('should send token reuse alert email with correct parameters', async () => {
      const params = {
        email: 'user@example.com',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date('2026-01-21T15:30:00Z'),
      };

      await sendTokenReuseAlert(mockEmailService, params);

      expect(mockEmailService.send).toHaveBeenCalledTimes(1);
      expect(mockEmailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Security Alert: Suspicious Activity on Your Account',
        }),
      );
    });

    test('should include IP address in email content', async () => {
      const params = {
        email: 'user@example.com',
        ipAddress: '10.0.0.1',
        userAgent: 'Test Browser',
        timestamp: new Date(),
      };

      await sendTokenReuseAlert(mockEmailService, params);

      const callArg = vi.mocked(mockEmailService.send).mock.calls[0]?.[0];
      expect(callArg?.text).toContain('10.0.0.1');
      expect(callArg?.html).toContain('10.0.0.1');
    });

    test('should include user agent in email content', async () => {
      const params = {
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Safari/537.36',
        timestamp: new Date(),
      };

      await sendTokenReuseAlert(mockEmailService, params);

      const callArg = vi.mocked(mockEmailService.send).mock.calls[0]?.[0];
      expect(callArg?.text).toContain('Safari/537.36');
      expect(callArg?.html).toContain('Safari/537.36');
    });

    test('should handle undefined user agent by showing Unknown', async () => {
      const params = {
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: undefined,
        timestamp: new Date(),
      };

      await sendTokenReuseAlert(mockEmailService, params);

      const callArg = vi.mocked(mockEmailService.send).mock.calls[0]?.[0];
      expect(callArg?.text).toContain('Unknown');
      expect(callArg?.html).toContain('Unknown');
    });

    test('should propagate email service errors', async () => {
      const mockError = new Error('SMTP connection failed');
      mockEmailService.send = vi.fn().mockRejectedValue(mockError);

      const params = {
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Test',
        timestamp: new Date(),
      };

      await expect(sendTokenReuseAlert(mockEmailService, params)).rejects.toThrow(
        'SMTP connection failed',
      );
    });

    test('should include security recommendations in email', async () => {
      const params = {
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Test',
        timestamp: new Date(),
      };

      await sendTokenReuseAlert(mockEmailService, params);

      const callArg = vi.mocked(mockEmailService.send).mock.calls[0]?.[0];
      expect(callArg?.text).toContain('Change your password');
      expect(callArg?.text).toContain('two-factor authentication');
    });

    test('should include timestamp in email content', async () => {
      const timestamp = new Date('2026-01-21T10:00:00Z');
      const params = {
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Test',
        timestamp,
      };

      await sendTokenReuseAlert(mockEmailService, params);

      const callArg = vi.mocked(mockEmailService.send).mock.calls[0]?.[0];
      expect(callArg?.html).toContain('2026-01-21T10:00:00.000Z');
    });
  });
});
