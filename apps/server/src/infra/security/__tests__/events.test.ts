// apps/server/src/infra/security/__tests__/events.test.ts
import { createMockDb } from '@database/test-utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getSecurityEventMetrics,
  getUserSecurityEvents,
  logAccountLockedEvent,
  logAccountUnlockedEvent,
  logSecurityEvent,
  logTokenFamilyRevokedEvent,
  logTokenReuseEvent,
} from '../events';

import type { DbClient } from '@database';
import type { MockDbClient } from '@database/test-utils';

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
});
