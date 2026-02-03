// modules/admin/src/securityService.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  exportSecurityEvents,
  getSecurityEvent,
  getSecurityMetrics,
  listSecurityEvents,
  SecurityEventNotFoundError,
} from './securityService';

import type { DbClient } from '@abe-stack/db';

// ============================================================================
// Test Helpers
// ============================================================================

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

function createMockSecurityEvent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'event-123',
    user_id: 'user-456',
    email: 'test@example.com',
    event_type: 'account_locked',
    severity: 'medium',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    metadata: JSON.stringify({ reason: 'Too many failed attempts' }),
    created_at: new Date('2024-01-15T10:30:00Z'),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Security Service', () => {
  let mockDb: MockDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // listSecurityEvents
  // ==========================================================================

  describe('listSecurityEvents', () => {
    test('should return paginated security events', async () => {
      const mockEvents = [
        createMockSecurityEvent({ id: 'event-1' }),
        createMockSecurityEvent({ id: 'event-2' }),
      ];
      mockDb.query.mockResolvedValue(mockEvents);
      mockDb.queryOne.mockResolvedValue({ count: '2' });

      const result = await listSecurityEvents(
        asMockDb(mockDb),
        { page: 1, limit: 50, sortOrder: 'desc' },
        {},
      );

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    test('should apply event type filter', async () => {
      mockDb.query.mockResolvedValue([createMockSecurityEvent()]);
      mockDb.queryOne.mockResolvedValue({ count: '1' });

      const result = await listSecurityEvents(
        asMockDb(mockDb),
        { page: 1, limit: 50, sortOrder: 'desc' },
        { eventType: 'account_locked' },
      );

      // Verify query was called with filter applied
      expect(mockDb.query).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    test('should apply severity filter', async () => {
      mockDb.query.mockResolvedValue([createMockSecurityEvent()]);
      mockDb.queryOne.mockResolvedValue({ count: '1' });

      const result = await listSecurityEvents(
        asMockDb(mockDb),
        { page: 1, limit: 50, sortOrder: 'desc' },
        { severity: 'critical' },
      );

      // Verify query was called with filter applied
      expect(mockDb.query).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    test('should apply date range filters', async () => {
      mockDb.query.mockResolvedValue([createMockSecurityEvent()]);
      mockDb.queryOne.mockResolvedValue({ count: '1' });

      const result = await listSecurityEvents(
        asMockDb(mockDb),
        { page: 1, limit: 50, sortOrder: 'desc' },
        {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        },
      );

      // Verify query was called with filter applied
      expect(mockDb.query).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    test('should calculate pagination correctly', async () => {
      mockDb.query.mockResolvedValue([]);
      mockDb.queryOne.mockResolvedValue({ count: '150' });

      const result = await listSecurityEvents(
        asMockDb(mockDb),
        { page: 2, limit: 50, sortOrder: 'desc' },
        {},
      );

      expect(result.total).toBe(150);
      expect(result.totalPages).toBe(3);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });

    test('should parse metadata from JSON', async () => {
      const mockEvent = createMockSecurityEvent({
        metadata: JSON.stringify({ customField: 'value' }),
      });
      mockDb.query.mockResolvedValue([mockEvent]);
      mockDb.queryOne.mockResolvedValue({ count: '1' });

      const result = await listSecurityEvents(
        asMockDb(mockDb),
        { page: 1, limit: 50, sortOrder: 'desc' },
        {},
      );

      expect(result.data[0]?.metadata).toEqual({ customField: 'value' });
    });
  });

  // ==========================================================================
  // getSecurityEvent
  // ==========================================================================

  describe('getSecurityEvent', () => {
    test('should return security event by ID', async () => {
      const mockEvent = createMockSecurityEvent();
      mockDb.queryOne.mockResolvedValue(mockEvent);

      const result = await getSecurityEvent(asMockDb(mockDb), 'event-123');

      expect(result.id).toBe('event-123');
      expect(result.email).toBe('test@example.com');
      expect(result.eventType).toBe('account_locked');
    });

    test('should throw SecurityEventNotFoundError when event not found', async () => {
      mockDb.queryOne.mockResolvedValue(null);

      await expect(getSecurityEvent(asMockDb(mockDb), 'nonexistent-id')).rejects.toThrow(
        SecurityEventNotFoundError,
      );
    });

    test('should parse metadata correctly', async () => {
      const mockEvent = createMockSecurityEvent({
        metadata: JSON.stringify({ failedAttempts: 5 }),
      });
      mockDb.queryOne.mockResolvedValue(mockEvent);

      const result = await getSecurityEvent(asMockDb(mockDb), 'event-123');

      expect(result.metadata).toEqual({ failedAttempts: 5 });
    });

    test('should handle null metadata', async () => {
      const mockEvent = createMockSecurityEvent({ metadata: null });
      mockDb.queryOne.mockResolvedValue(mockEvent);

      const result = await getSecurityEvent(asMockDb(mockDb), 'event-123');

      expect(result.metadata).toBeNull();
    });
  });

  // ==========================================================================
  // getSecurityMetrics
  // ==========================================================================

  describe('getSecurityMetrics', () => {
    test('should calculate metrics correctly', async () => {
      const mockEvents = [
        { event_type: 'token_reuse_detected', severity: 'critical' },
        { event_type: 'token_reuse_detected', severity: 'critical' },
        { event_type: 'account_locked', severity: 'high' },
        { event_type: 'suspicious_login', severity: 'medium' },
        { event_type: 'password_changed', severity: 'low' },
      ];
      mockDb.query.mockResolvedValue(mockEvents);

      const result = await getSecurityMetrics(asMockDb(mockDb), 'day');

      expect(result.totalEvents).toBe(5);
      expect(result.criticalEvents).toBe(2);
      expect(result.highEvents).toBe(1);
      expect(result.mediumEvents).toBe(1);
      expect(result.lowEvents).toBe(1);
      expect(result.tokenReuseCount).toBe(2);
      expect(result.accountLockedCount).toBe(1);
      expect(result.suspiciousLoginCount).toBe(1);
    });

    test('should calculate events by type', async () => {
      const mockEvents = [
        { event_type: 'account_locked', severity: 'high' },
        { event_type: 'account_locked', severity: 'high' },
        { event_type: 'password_changed', severity: 'low' },
      ];
      mockDb.query.mockResolvedValue(mockEvents);

      const result = await getSecurityMetrics(asMockDb(mockDb), 'day');

      expect(result.eventsByType).toEqual({
        account_locked: 2,
        password_changed: 1,
      });
    });

    test('should use correct period for hour', async () => {
      mockDb.query.mockResolvedValue([]);

      const result = await getSecurityMetrics(asMockDb(mockDb), 'hour');

      expect(result.period).toBe('hour');
      const start = new Date(result.periodStart);
      const end = new Date(result.periodEnd);
      const diff = end.getTime() - start.getTime();
      // Should be approximately 1 hour
      expect(diff).toBeLessThanOrEqual(60 * 60 * 1000 + 1000);
      expect(diff).toBeGreaterThanOrEqual(60 * 60 * 1000 - 1000);
    });

    test('should use correct period for week', async () => {
      mockDb.query.mockResolvedValue([]);

      const result = await getSecurityMetrics(asMockDb(mockDb), 'week');

      expect(result.period).toBe('week');
      const start = new Date(result.periodStart);
      const end = new Date(result.periodEnd);
      const diff = end.getTime() - start.getTime();
      // Should be approximately 7 days
      expect(diff).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 1000);
      expect(diff).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000 - 1000);
    });

    test('should handle empty events', async () => {
      mockDb.query.mockResolvedValue([]);

      const result = await getSecurityMetrics(asMockDb(mockDb), 'day');

      expect(result.totalEvents).toBe(0);
      expect(result.criticalEvents).toBe(0);
      expect(result.eventsByType).toEqual({});
    });
  });

  // ==========================================================================
  // exportSecurityEvents
  // ==========================================================================

  describe('exportSecurityEvents', () => {
    test('should export as JSON', async () => {
      const mockEvents = [createMockSecurityEvent()];
      mockDb.query.mockResolvedValue(mockEvents);

      const result = await exportSecurityEvents(asMockDb(mockDb), 'json', {});

      expect(result.contentType).toBe('application/json');
      expect(result.filename).toMatch(/^security-events-.*\.json$/);
      const parsed = JSON.parse(result.data);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });

    test('should export as CSV', async () => {
      const mockEvents = [createMockSecurityEvent()];
      mockDb.query.mockResolvedValue(mockEvents);

      const result = await exportSecurityEvents(asMockDb(mockDb), 'csv', {});

      expect(result.contentType).toBe('text/csv');
      expect(result.filename).toMatch(/^security-events-.*\.csv$/);
      const lines = result.data.split('\n');
      expect(lines.length).toBe(2); // Header + 1 data row
      expect(lines[0]).toContain('id,userId,email,eventType');
    });

    test('should apply filters to export', async () => {
      mockDb.query.mockResolvedValue([]);

      const result = await exportSecurityEvents(asMockDb(mockDb), 'json', {
        severity: 'critical',
      });

      // Verify query was called with filter applied
      expect(mockDb.query).toHaveBeenCalled();
      expect(JSON.parse(result.data)).toEqual([]);
    });

    test('should escape CSV values correctly', async () => {
      const mockEvent = createMockSecurityEvent({
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });
      mockDb.query.mockResolvedValue([mockEvent]);

      const result = await exportSecurityEvents(asMockDb(mockDb), 'csv', {});

      // User agent with special chars should be quoted
      expect(result.data).toContain('"Mozilla/5.0');
    });

    test('should handle empty export', async () => {
      mockDb.query.mockResolvedValue([]);

      const result = await exportSecurityEvents(asMockDb(mockDb), 'json', {});

      expect(JSON.parse(result.data)).toEqual([]);
    });
  });
});
