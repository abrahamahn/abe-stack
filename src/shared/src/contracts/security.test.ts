// packages/shared/src/contracts/security.test.ts
/**
 * Security Contract Schema Tests
 *
 * Comprehensive validation tests for security audit schemas including event tracking,
 * filtering, metrics, and export functionality.
 */

import { describe, expect, it } from 'vitest';

import {
  SECURITY_EVENT_TYPES,
  SECURITY_SEVERITIES,
  securityEventDetailRequestSchema,
  securityEventSchema,
  securityEventsExportRequestSchema,
  securityEventsExportResponseSchema,
  securityEventsFilterSchema,
  securityEventsListRequestSchema,
  securityEventsListResponseSchema,
  securityMetricsRequestSchema,
  securityMetricsSchema,
} from './security';

describe('SECURITY_EVENT_TYPES constant', () => {
  it('should contain expected event types', () => {
    expect(SECURITY_EVENT_TYPES).toContain('token_reuse_detected');
    expect(SECURITY_EVENT_TYPES).toContain('account_locked');
    expect(SECURITY_EVENT_TYPES).toContain('password_changed');
    expect(SECURITY_EVENT_TYPES).toContain('oauth_login_success');
    expect(SECURITY_EVENT_TYPES.length).toBeGreaterThan(10);
  });
});

describe('SECURITY_SEVERITIES constant', () => {
  it('should contain all severity levels', () => {
    expect(SECURITY_SEVERITIES).toEqual(['low', 'medium', 'high', 'critical']);
  });
});

describe('securityEventSchema', () => {
  const validEvent = {
    id: 'event_123',
    userId: 'user_123',
    email: 'user@example.com',
    eventType: 'password_changed',
    severity: 'medium',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    metadata: { reason: 'user_initiated' },
    createdAt: '2024-01-01T00:00:00Z',
  };

  it('should validate complete security event', () => {
    const result = securityEventSchema.parse(validEvent);
    expect(result.eventType).toBe('password_changed');
    expect(result.severity).toBe('medium');
    expect(result.metadata?.['reason']).toBe('user_initiated');
  });

  it('should accept null userId', () => {
    const event = { ...validEvent, userId: null };
    const result = securityEventSchema.parse(event);
    expect(result.userId).toBeNull();
  });

  it('should accept null email', () => {
    const event = { ...validEvent, email: null };
    const result = securityEventSchema.parse(event);
    expect(result.email).toBeNull();
  });

  it('should accept null ipAddress', () => {
    const event = { ...validEvent, ipAddress: null };
    const result = securityEventSchema.parse(event);
    expect(result.ipAddress).toBeNull();
  });

  it('should accept null userAgent', () => {
    const event = { ...validEvent, userAgent: null };
    const result = securityEventSchema.parse(event);
    expect(result.userAgent).toBeNull();
  });

  it('should accept null metadata', () => {
    const event = { ...validEvent, metadata: null };
    const result = securityEventSchema.parse(event);
    expect(result.metadata).toBeNull();
  });

  it('should validate event with all null optional fields', () => {
    const event = {
      id: 'event_123',
      userId: null,
      email: null,
      eventType: 'suspicious_login',
      severity: 'high',
      ipAddress: null,
      userAgent: null,
      metadata: null,
      createdAt: '2024-01-01T00:00:00Z',
    };
    const result = securityEventSchema.parse(event);
    expect(result.userId).toBeNull();
    expect(result.metadata).toBeNull();
  });

  it('should validate complex metadata', () => {
    const event = {
      ...validEvent,
      metadata: {
        attemptCount: 3,
        lockoutDuration: 300,
        nested: { key: 'value' },
        flags: [true, false],
      },
    };
    const result = securityEventSchema.parse(event);
    expect(result.metadata).toBeDefined();
  });

  it('should reject non-string id', () => {
    const event = { ...validEvent, id: 123 };
    expect(() => securityEventSchema.parse(event)).toThrow('id must be a string');
  });

  it('should reject non-string eventType', () => {
    const event = { ...validEvent, eventType: 123 };
    expect(() => securityEventSchema.parse(event)).toThrow('eventType must be a string');
  });

  it('should reject non-string severity', () => {
    const event = { ...validEvent, severity: 1 };
    expect(() => securityEventSchema.parse(event)).toThrow('severity must be a string');
  });

  it('should reject non-string/null userId', () => {
    const event = { ...validEvent, userId: 123 };
    expect(() => securityEventSchema.parse(event)).toThrow('userId must be a string or null');
  });

  it('should reject non-object/null metadata', () => {
    const event = { ...validEvent, metadata: 'not-object' };
    expect(() => securityEventSchema.parse(event)).toThrow('metadata must be an object or null');
  });

  it('should reject missing required fields', () => {
    expect(() => securityEventSchema.parse({})).toThrow();
  });
});

describe('securityEventsFilterSchema', () => {
  it('should validate empty filter', () => {
    const result = securityEventsFilterSchema.parse({});
    expect(result).toEqual({});
  });

  it('should validate undefined', () => {
    const result = securityEventsFilterSchema.parse(undefined);
    expect(result).toEqual({});
  });

  it('should validate null', () => {
    const result = securityEventsFilterSchema.parse(null);
    expect(result).toEqual({});
  });

  it('should validate eventType filter', () => {
    const filter = { eventType: 'account_locked' };
    const result = securityEventsFilterSchema.parse(filter);
    expect(result.eventType).toBe('account_locked');
  });

  it('should validate severity filter', () => {
    const filter = { severity: 'high' };
    const result = securityEventsFilterSchema.parse(filter);
    expect(result.severity).toBe('high');
  });

  it('should validate all severity levels', () => {
    for (const severity of SECURITY_SEVERITIES) {
      const filter = { severity };
      const result = securityEventsFilterSchema.parse(filter);
      expect(result.severity).toBe(severity);
    }
  });

  it('should reject invalid severity', () => {
    const filter = { severity: 'extreme' };
    expect(() => securityEventsFilterSchema.parse(filter)).toThrow('Invalid severity level');
  });

  it('should validate userId filter', () => {
    const filter = { userId: 'user_123' };
    const result = securityEventsFilterSchema.parse(filter);
    expect(result.userId).toBe('user_123');
  });

  it('should validate email filter', () => {
    const filter = { email: 'user@example.com' };
    const result = securityEventsFilterSchema.parse(filter);
    expect(result.email).toBe('user@example.com');
  });

  it('should validate ipAddress filter', () => {
    const filter = { ipAddress: '192.168.1.100' };
    const result = securityEventsFilterSchema.parse(filter);
    expect(result.ipAddress).toBe('192.168.1.100');
  });

  it('should validate date range filters', () => {
    const filter = {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-31T23:59:59Z',
    };
    const result = securityEventsFilterSchema.parse(filter);
    expect(result.startDate).toBe('2024-01-01T00:00:00Z');
    expect(result.endDate).toBe('2024-01-31T23:59:59Z');
  });

  it('should validate complete filter', () => {
    const filter = {
      eventType: 'account_locked',
      severity: 'high',
      userId: 'user_123',
      email: 'user@example.com',
      ipAddress: '192.168.1.100',
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-31T23:59:59Z',
    };
    const result = securityEventsFilterSchema.parse(filter);
    expect(Object.keys(result)).toHaveLength(7);
  });

  it('should reject non-string eventType', () => {
    const filter = { eventType: 123 };
    expect(() => securityEventsFilterSchema.parse(filter)).toThrow('eventType must be a string');
  });

  it('should reject non-string userId', () => {
    const filter = { userId: 123 };
    expect(() => securityEventsFilterSchema.parse(filter)).toThrow('userId must be a string');
  });
});

describe('securityEventsListRequestSchema', () => {
  it('should validate with default pagination', () => {
    const result = securityEventsListRequestSchema.parse({});
    expect(result.page).toBeDefined();
    expect(result.limit).toBeDefined();
    expect(result.filter).toEqual({});
  });

  it('should validate with pagination and filter', () => {
    const request = {
      page: 2,
      limit: 25,
      filter: { severity: 'critical' },
    };
    const result = securityEventsListRequestSchema.parse(request);
    expect(result.page).toBe(2);
    expect(result.filter?.['severity']).toBe('critical');
  });

  it('should validate without filter field', () => {
    const request = { page: 1, limit: 50 };
    const result = securityEventsListRequestSchema.parse(request);
    expect(result.filter).toEqual({});
  });

  it('should validate with complex filter', () => {
    const request = {
      filter: {
        eventType: 'token_reuse_detected',
        severity: 'critical',
        startDate: '2024-01-01T00:00:00Z',
      },
    };
    const result = securityEventsListRequestSchema.parse(request);
    expect(result.filter?.['eventType']).toBe('token_reuse_detected');
    expect(result.filter?.['severity']).toBe('critical');
  });
});

describe('securityEventsListResponseSchema', () => {
  const validEvent = {
    id: 'event_1',
    userId: 'user_1',
    email: 'user@example.com',
    eventType: 'account_locked',
    severity: 'high',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    metadata: null,
    createdAt: '2024-01-01T00:00:00Z',
  };

  it('should validate empty list', () => {
    const response = {
      data: [],
      total: 0,
      page: 1,
      limit: 50,
      hasNext: false,
      hasPrev: false,
      totalPages: 0,
    };
    const result = securityEventsListResponseSchema.parse(response);
    expect(result.data).toEqual([]);
  });

  it('should validate list with events', () => {
    const response = {
      data: [validEvent],
      total: 1,
      page: 1,
      limit: 50,
      hasNext: false,
      hasPrev: false,
      totalPages: 1,
    };
    const result = securityEventsListResponseSchema.parse(response);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.eventType).toBe('account_locked');
  });

  it('should validate pagination', () => {
    const response = {
      data: [validEvent],
      total: 100,
      page: 2,
      limit: 50,
      hasNext: true,
      hasPrev: true,
      totalPages: 2,
    };
    const result = securityEventsListResponseSchema.parse(response);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(true);
  });
});

describe('securityEventDetailRequestSchema', () => {
  it('should validate UUID', () => {
    const request = { id: '123e4567-e89b-12d3-a456-426614174000' };
    const result = securityEventDetailRequestSchema.parse(request);
    expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('should reject invalid UUID', () => {
    const request = { id: 'not-a-uuid' };
    expect(() => securityEventDetailRequestSchema.parse(request)).toThrow();
  });

  it('should reject missing id', () => {
    expect(() => securityEventDetailRequestSchema.parse({})).toThrow();
  });

  it('should reject null', () => {
    expect(() => securityEventDetailRequestSchema.parse(null)).toThrow('Invalid request');
  });
});

describe('securityMetricsRequestSchema', () => {
  it('should default to day period', () => {
    const result = securityMetricsRequestSchema.parse({});
    expect(result.period).toBe('day');
  });

  it('should validate hour period', () => {
    const request = { period: 'hour' };
    const result = securityMetricsRequestSchema.parse(request);
    expect(result.period).toBe('hour');
  });

  it('should validate all valid periods', () => {
    const periods = ['hour', 'day', 'week', 'month'] as const;
    for (const period of periods) {
      const result = securityMetricsRequestSchema.parse({ period });
      expect(result.period).toBe(period);
    }
  });

  it('should reject invalid period', () => {
    const request = { period: 'year' };
    expect(() => securityMetricsRequestSchema.parse(request)).toThrow(
      'period must be one of: hour, day, week, month',
    );
  });

  it('should handle null input', () => {
    const result = securityMetricsRequestSchema.parse(null);
    expect(result.period).toBe('day');
  });

  it('should handle undefined input', () => {
    const result = securityMetricsRequestSchema.parse(undefined);
    expect(result.period).toBe('day');
  });
});

describe('securityMetricsSchema', () => {
  const validMetrics = {
    totalEvents: 1000,
    criticalEvents: 10,
    highEvents: 50,
    mediumEvents: 200,
    lowEvents: 740,
    tokenReuseCount: 5,
    accountLockedCount: 15,
    suspiciousLoginCount: 25,
    eventsByType: {
      password_changed: 100,
      account_locked: 15,
      token_reuse_detected: 5,
    },
    period: 'day',
    periodStart: '2024-01-01T00:00:00Z',
    periodEnd: '2024-01-01T23:59:59Z',
  };

  it('should validate complete metrics', () => {
    const result = securityMetricsSchema.parse(validMetrics);
    expect(result.totalEvents).toBe(1000);
    expect(result.criticalEvents).toBe(10);
    expect(result.eventsByType['password_changed']).toBe(100);
  });

  it('should validate zero metrics', () => {
    const metrics = {
      ...validMetrics,
      totalEvents: 0,
      criticalEvents: 0,
      highEvents: 0,
      mediumEvents: 0,
      lowEvents: 0,
      tokenReuseCount: 0,
      accountLockedCount: 0,
      suspiciousLoginCount: 0,
      eventsByType: {},
    };
    const result = securityMetricsSchema.parse(metrics);
    expect(result.totalEvents).toBe(0);
  });

  it('should validate empty eventsByType', () => {
    const metrics = { ...validMetrics, eventsByType: {} };
    const result = securityMetricsSchema.parse(metrics);
    expect(result.eventsByType).toEqual({});
  });

  it('should reject negative totalEvents', () => {
    const metrics = { ...validMetrics, totalEvents: -1 };
    expect(() => securityMetricsSchema.parse(metrics)).toThrow(
      'totalEvents must be a non-negative integer',
    );
  });

  it('should reject non-integer criticalEvents', () => {
    const metrics = { ...validMetrics, criticalEvents: 10.5 };
    expect(() => securityMetricsSchema.parse(metrics)).toThrow(
      'criticalEvents must be a non-negative integer',
    );
  });

  it('should reject non-string period', () => {
    const metrics = { ...validMetrics, period: 123 };
    expect(() => securityMetricsSchema.parse(metrics)).toThrow('period must be a string');
  });

  it('should reject non-string periodStart', () => {
    const metrics = { ...validMetrics, periodStart: 123 };
    expect(() => securityMetricsSchema.parse(metrics)).toThrow('periodStart must be a string');
  });

  it('should reject missing required fields', () => {
    expect(() => securityMetricsSchema.parse({})).toThrow();
  });

  it('should validate all count fields as non-negative integers', () => {
    const countFields = [
      'totalEvents',
      'criticalEvents',
      'highEvents',
      'mediumEvents',
      'lowEvents',
      'tokenReuseCount',
      'accountLockedCount',
      'suspiciousLoginCount',
    ];

    for (const field of countFields) {
      const metrics = { ...validMetrics, [field]: -1 };
      expect(() => securityMetricsSchema.parse(metrics)).toThrow(
        `${field} must be a non-negative integer`,
      );
    }
  });
});

describe('securityEventsExportRequestSchema', () => {
  it('should validate CSV export', () => {
    const request = { format: 'csv' };
    const result = securityEventsExportRequestSchema.parse(request);
    expect(result.format).toBe('csv');
    expect(result.filter).toEqual({});
  });

  it('should validate JSON export', () => {
    const request = { format: 'json' };
    const result = securityEventsExportRequestSchema.parse(request);
    expect(result.format).toBe('json');
  });

  it('should validate export with filter', () => {
    const request = {
      format: 'csv',
      filter: {
        severity: 'high',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      },
    };
    const result = securityEventsExportRequestSchema.parse(request);
    expect(result.filter?.['severity']).toBe('high');
  });

  it('should validate export without filter', () => {
    const request = { format: 'json' };
    const result = securityEventsExportRequestSchema.parse(request);
    expect(result.filter).toEqual({});
  });

  it('should reject invalid format', () => {
    const request = { format: 'xml' };
    expect(() => securityEventsExportRequestSchema.parse(request)).toThrow(
      'format must be either "csv" or "json"',
    );
  });

  it('should reject missing format', () => {
    expect(() => securityEventsExportRequestSchema.parse({})).toThrow(
      'format must be either "csv" or "json"',
    );
  });

  it('should reject null', () => {
    expect(() => securityEventsExportRequestSchema.parse(null)).toThrow('Invalid export request');
  });
});

describe('securityEventsExportResponseSchema', () => {
  it('should validate CSV export response', () => {
    const response = {
      data: 'id,eventType,severity\nevent1,account_locked,high',
      filename: 'security-events-2024-01-01.csv',
      contentType: 'text/csv',
    };
    const result = securityEventsExportResponseSchema.parse(response);
    expect(result.filename).toBe('security-events-2024-01-01.csv');
    expect(result.contentType).toBe('text/csv');
  });

  it('should validate JSON export response', () => {
    const response = {
      data: '[{"id":"event1","eventType":"account_locked"}]',
      filename: 'security-events-2024-01-01.json',
      contentType: 'application/json',
    };
    const result = securityEventsExportResponseSchema.parse(response);
    expect(result.contentType).toBe('application/json');
  });

  it('should validate empty data', () => {
    const response = {
      data: '',
      filename: 'empty.csv',
      contentType: 'text/csv',
    };
    const result = securityEventsExportResponseSchema.parse(response);
    expect(result.data).toBe('');
  });

  it('should reject non-string data', () => {
    const response = {
      data: 123,
      filename: 'file.csv',
      contentType: 'text/csv',
    };
    expect(() => securityEventsExportResponseSchema.parse(response)).toThrow(
      'data must be a string',
    );
  });

  it('should reject non-string filename', () => {
    const response = {
      data: 'csv-data',
      filename: 123,
      contentType: 'text/csv',
    };
    expect(() => securityEventsExportResponseSchema.parse(response)).toThrow(
      'filename must be a string',
    );
  });

  it('should reject non-string contentType', () => {
    const response = {
      data: 'csv-data',
      filename: 'file.csv',
      contentType: 123,
    };
    expect(() => securityEventsExportResponseSchema.parse(response)).toThrow(
      'contentType must be a string',
    );
  });

  it('should reject missing fields', () => {
    expect(() => securityEventsExportResponseSchema.parse({})).toThrow();
  });

  it('should reject null', () => {
    expect(() => securityEventsExportResponseSchema.parse(null)).toThrow('Invalid export response');
  });
});
