// src/shared/src/domain/audit-log/audit-log.schemas.test.ts

/**
 * @file Unit Tests for Audit Log Schemas
 * @description Tests for audit log validation schemas and constants.
 * @module Domain/AuditLog
 */

import { describe, expect, it } from 'vitest';

import {
  AUDIT_ACTION_REGEX,
  AUDIT_CATEGORIES,
  AUDIT_SEVERITIES,
  auditEventSchema,
  auditLogFilterSchema,
  auditLogListResponseSchema,
  createAuditEventSchema,
} from './audit-log.schemas';

// ============================================================================
// Constants
// ============================================================================

describe('AUDIT_CATEGORIES', () => {
  it('should contain expected categories', () => {
    expect(AUDIT_CATEGORIES).toEqual(['security', 'admin', 'system', 'billing']);
  });

  it('should be readonly', () => {
    expect(Object.isFrozen(AUDIT_CATEGORIES)).toBe(false);
    expect(Array.isArray(AUDIT_CATEGORIES)).toBe(true);
  });
});

describe('AUDIT_SEVERITIES', () => {
  it('should contain expected severities', () => {
    expect(AUDIT_SEVERITIES).toEqual(['info', 'warn', 'error', 'critical']);
  });

  it('should be readonly', () => {
    expect(Object.isFrozen(AUDIT_SEVERITIES)).toBe(false);
    expect(Array.isArray(AUDIT_SEVERITIES)).toBe(true);
  });
});

// ============================================================================
// AUDIT_ACTION_REGEX
// ============================================================================

describe('AUDIT_ACTION_REGEX', () => {
  describe('valid action formats', () => {
    it('should accept "noun.verb" format', () => {
      expect(AUDIT_ACTION_REGEX.test('user.created')).toBe(true);
    });

    it('should accept multiple segments', () => {
      expect(AUDIT_ACTION_REGEX.test('auth.login.failed')).toBe(true);
      expect(AUDIT_ACTION_REGEX.test('user.profile.updated')).toBe(true);
    });

    it('should accept lowercase letters and underscores', () => {
      expect(AUDIT_ACTION_REGEX.test('user_profile.updated')).toBe(true);
      expect(AUDIT_ACTION_REGEX.test('api_key.created')).toBe(true);
    });

    it('should accept numbers in action names', () => {
      expect(AUDIT_ACTION_REGEX.test('oauth2.token.refreshed')).toBe(true);
      expect(AUDIT_ACTION_REGEX.test('user123.created')).toBe(true);
    });
  });

  describe('invalid action formats', () => {
    it('should reject single word without dot', () => {
      expect(AUDIT_ACTION_REGEX.test('invalid')).toBe(false);
    });

    it('should reject uppercase letters', () => {
      expect(AUDIT_ACTION_REGEX.test('User.Created')).toBe(false);
      expect(AUDIT_ACTION_REGEX.test('USER.CREATED')).toBe(false);
    });

    it('should reject actions starting with number', () => {
      expect(AUDIT_ACTION_REGEX.test('123user.created')).toBe(false);
    });

    it('should reject actions starting with underscore', () => {
      expect(AUDIT_ACTION_REGEX.test('_user.created')).toBe(false);
    });

    it('should reject actions with spaces', () => {
      expect(AUDIT_ACTION_REGEX.test('user created')).toBe(false);
      expect(AUDIT_ACTION_REGEX.test('user. created')).toBe(false);
    });

    it('should reject actions with special characters', () => {
      expect(AUDIT_ACTION_REGEX.test('user@created')).toBe(false);
      expect(AUDIT_ACTION_REGEX.test('user.created!')).toBe(false);
      expect(AUDIT_ACTION_REGEX.test('user-profile.created')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(AUDIT_ACTION_REGEX.test('')).toBe(false);
    });

    it('should reject actions ending with dot', () => {
      expect(AUDIT_ACTION_REGEX.test('user.created.')).toBe(false);
    });

    it('should reject actions starting with dot', () => {
      expect(AUDIT_ACTION_REGEX.test('.user.created')).toBe(false);
    });
  });
});

// ============================================================================
// createAuditEventSchema
// ============================================================================

describe('createAuditEventSchema', () => {
  describe('valid inputs', () => {
    it('should parse valid audit event with all fields', () => {
      const input = {
        tenantId: '00000000-0000-0000-0000-000000000001',
        actorId: '00000000-0000-0000-0000-000000000002',
        action: 'user.created',
        category: 'admin',
        severity: 'info',
        resource: 'user',
        resourceId: '123',
        metadata: { key: 'value' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const result = createAuditEventSchema.parse(input);

      expect(result).toEqual(input);
    });

    it('should parse with minimal required fields', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: 'user',
      };

      const result = createAuditEventSchema.parse(input);

      expect(result.tenantId).toBe(null);
      expect(result.actorId).toBe(null);
      expect(result.action).toBe('user.created');
      expect(result.resource).toBe('user');
      expect(result.category).toBe('admin');
      expect(result.severity).toBe('info');
      expect(result.metadata).toEqual({});
    });

    it('should accept complex action formats', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'auth.login.failed',
        resource: 'session',
      };

      const result = createAuditEventSchema.parse(input);

      expect(result.action).toBe('auth.login.failed');
    });

    it('should accept actions with numbers and underscores', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'oauth2_token.refreshed',
        resource: 'token',
      };

      const result = createAuditEventSchema.parse(input);

      expect(result.action).toBe('oauth2_token.refreshed');
    });

    it('should accept valid IP addresses', () => {
      const ipAddresses = [
        '192.168.1.1',
        '10.0.0.1',
        '255.255.255.255',
        '::1',
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      ];

      for (const ipAddress of ipAddresses) {
        const input = {
          tenantId: null,
          actorId: null,
          action: 'user.login',
          resource: 'session',
          ipAddress,
        };

        const result = createAuditEventSchema.parse(input);
        expect(result.ipAddress).toBe(ipAddress);
      }
    });
  });

  describe('defaults', () => {
    it('should default category to "admin"', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: 'user',
      };

      const result = createAuditEventSchema.parse(input);

      expect(result.category).toBe('admin');
    });

    it('should default severity to "info"', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: 'user',
      };

      const result = createAuditEventSchema.parse(input);

      expect(result.severity).toBe('info');
    });

    it('should default metadata to empty object', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: 'user',
      };

      const result = createAuditEventSchema.parse(input);

      expect(result.metadata).toEqual({});
    });
  });

  describe('nullable fields', () => {
    it('should accept null tenantId', () => {
      const input = {
        tenantId: null,
        actorId: '00000000-0000-0000-0000-000000000001',
        action: 'user.created',
        resource: 'user',
      };

      const result = createAuditEventSchema.parse(input);

      expect(result.tenantId).toBe(null);
    });

    it('should accept null actorId', () => {
      const input = {
        tenantId: '00000000-0000-0000-0000-000000000001',
        actorId: null,
        action: 'system.startup',
        resource: 'system',
      };

      const result = createAuditEventSchema.parse(input);

      expect(result.actorId).toBe(null);
    });

    it('should accept both null tenantId and actorId', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'system.startup',
        resource: 'system',
      };

      const result = createAuditEventSchema.parse(input);

      expect(result.tenantId).toBe(null);
      expect(result.actorId).toBe(null);
    });
  });

  describe('action validation', () => {
    it('should reject invalid action format', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'invalid',
        resource: 'user',
      };

      expect(() => createAuditEventSchema.parse(input)).toThrow(
        'Action must follow "noun.verb" format (e.g., "user.created")',
      );
    });

    it('should reject action with uppercase', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'User.Created',
        resource: 'user',
      };

      expect(() => createAuditEventSchema.parse(input)).toThrow(
        'Action must follow "noun.verb" format (e.g., "user.created")',
      );
    });

    it('should reject action with special characters', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'user@created',
        resource: 'user',
      };

      expect(() => createAuditEventSchema.parse(input)).toThrow(
        'Action must follow "noun.verb" format (e.g., "user.created")',
      );
    });
  });

  describe('category validation', () => {
    it('should accept all valid categories', () => {
      for (const category of AUDIT_CATEGORIES) {
        const input = {
          tenantId: null,
          actorId: null,
          action: 'user.created',
          category,
          resource: 'user',
        };

        const result = createAuditEventSchema.parse(input);
        expect(result.category).toBe(category);
      }
    });

    it('should reject invalid category', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'user.created',
        category: 'invalid',
        resource: 'user',
      };

      expect(() => createAuditEventSchema.parse(input)).toThrow(/audit category/i);
    });
  });

  describe('severity validation', () => {
    it('should accept all valid severities', () => {
      for (const severity of AUDIT_SEVERITIES) {
        const input = {
          tenantId: null,
          actorId: null,
          action: 'user.created',
          severity,
          resource: 'user',
        };

        const result = createAuditEventSchema.parse(input);
        expect(result.severity).toBe(severity);
      }
    });

    it('should reject invalid severity', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'user.created',
        severity: 'invalid',
        resource: 'user',
      };

      expect(() => createAuditEventSchema.parse(input)).toThrow(/audit severity/i);
    });
  });

  describe('resource validation', () => {
    it('should accept valid resource string', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: 'user',
      };

      const result = createAuditEventSchema.parse(input);

      expect(result.resource).toBe('user');
    });

    it('should reject empty resource string', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: '',
      };

      expect(() => createAuditEventSchema.parse(input)).toThrow();
    });

    it('should reject missing resource', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'user.created',
      };

      expect(() => createAuditEventSchema.parse(input)).toThrow();
    });
  });

  describe('optional fields', () => {
    it('should accept resourceId when provided', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: 'user',
        resourceId: '123',
      };

      const result = createAuditEventSchema.parse(input);

      expect(result.resourceId).toBe('123');
    });

    it('should accept userAgent when provided', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: 'user',
        userAgent: 'Mozilla/5.0',
      };

      const result = createAuditEventSchema.parse(input);

      expect(result.userAgent).toBe('Mozilla/5.0');
    });

    it('should handle undefined optional fields', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: 'user',
      };

      const result = createAuditEventSchema.parse(input);

      expect(result.resourceId).toBeUndefined();
      expect(result.ipAddress).toBeUndefined();
      expect(result.userAgent).toBeUndefined();
    });
  });

  describe('metadata validation', () => {
    it('should accept valid metadata object', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: 'user',
        metadata: { key: 'value', nested: { data: 123 } },
      };

      const result = createAuditEventSchema.parse(input);

      expect(result.metadata).toEqual({ key: 'value', nested: { data: 123 } });
    });

    it('should accept empty metadata object', () => {
      const input = {
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: 'user',
        metadata: {},
      };

      const result = createAuditEventSchema.parse(input);

      expect(result.metadata).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('should handle non-object input', () => {
      expect(() => createAuditEventSchema.parse(null)).toThrow();
      expect(() => createAuditEventSchema.parse('string')).toThrow();
      expect(() => createAuditEventSchema.parse(123)).toThrow();
    });

    it('should reject invalid UUID format for tenantId', () => {
      const input = {
        tenantId: 'not-a-uuid',
        actorId: null,
        action: 'user.created',
        resource: 'user',
      };

      expect(() => createAuditEventSchema.parse(input)).toThrow();
    });

    it('should reject invalid UUID format for actorId', () => {
      const input = {
        tenantId: null,
        actorId: 'not-a-uuid',
        action: 'user.created',
        resource: 'user',
      };

      expect(() => createAuditEventSchema.parse(input)).toThrow();
    });
  });
});

// ============================================================================
// auditEventSchema
// ============================================================================

describe('auditEventSchema', () => {
  describe('valid inputs', () => {
    it('should parse complete audit event with all fields', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        createdAt: '2024-01-01T00:00:00.000Z',
        tenantId: '00000000-0000-0000-0000-000000000002',
        actorId: '00000000-0000-0000-0000-000000000003',
        action: 'user.created',
        category: 'admin',
        severity: 'info',
        resource: 'user',
        resourceId: '123',
        metadata: { key: 'value' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const result = auditEventSchema.parse(input);

      expect(result).toEqual(input);
    });

    it('should parse with minimal fields plus id and createdAt', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        createdAt: '2024-01-01T00:00:00.000Z',
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: 'user',
      };

      const result = auditEventSchema.parse(input);

      expect(result.id).toBe('00000000-0000-0000-0000-000000000001');
      expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result.category).toBe('admin');
      expect(result.severity).toBe('info');
    });
  });

  describe('required fields', () => {
    it('should require id field', () => {
      const input = {
        createdAt: '2024-01-01T00:00:00.000Z',
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: 'user',
      };

      expect(() => auditEventSchema.parse(input)).toThrow();
    });

    it('should require createdAt field', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: 'user',
      };

      expect(() => auditEventSchema.parse(input)).toThrow();
    });

    it('should validate id as UUID', () => {
      const input = {
        id: 'not-a-uuid',
        createdAt: '2024-01-01T00:00:00.000Z',
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: 'user',
      };

      expect(() => auditEventSchema.parse(input)).toThrow();
    });

    it('should validate createdAt as ISO datetime', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        createdAt: 'invalid-date',
        tenantId: null,
        actorId: null,
        action: 'user.created',
        resource: 'user',
      };

      expect(() => auditEventSchema.parse(input)).toThrow();
    });
  });

  describe('inherits base validation', () => {
    it('should validate action format', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        createdAt: '2024-01-01T00:00:00.000Z',
        tenantId: null,
        actorId: null,
        action: 'invalid',
        resource: 'user',
      };

      expect(() => auditEventSchema.parse(input)).toThrow('Action must follow "noun.verb" format');
    });

    it('should validate category', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        createdAt: '2024-01-01T00:00:00.000Z',
        tenantId: null,
        actorId: null,
        action: 'user.created',
        category: 'invalid',
        resource: 'user',
      };

      expect(() => auditEventSchema.parse(input)).toThrow(/audit category/i);
    });

    it('should validate severity', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        createdAt: '2024-01-01T00:00:00.000Z',
        tenantId: null,
        actorId: null,
        action: 'user.created',
        severity: 'invalid',
        resource: 'user',
      };

      expect(() => auditEventSchema.parse(input)).toThrow(/audit severity/i);
    });
  });
});

// ============================================================================
// auditLogFilterSchema
// ============================================================================

describe('auditLogFilterSchema', () => {
  describe('valid inputs', () => {
    it('should parse with default pagination options', () => {
      const result = auditLogFilterSchema.parse({});

      expect(result.limit).toBe(50);
      expect(result.sortOrder).toBe('desc');
      expect(result.cursor).toBeUndefined();
    });

    it('should parse with custom pagination options', () => {
      const input = {
        limit: 25,
        sortOrder: 'asc',
        cursor: 'abc123',
      };

      const result = auditLogFilterSchema.parse(input);

      expect(result.limit).toBe(25);
      expect(result.sortOrder).toBe('asc');
      expect(result.cursor).toBe('abc123');
    });

    it('should parse with all audit filters', () => {
      const input = {
        tenantId: '00000000-0000-0000-0000-000000000001',
        actorId: '00000000-0000-0000-0000-000000000002',
        action: 'user.created',
        resource: 'user',
        category: 'admin',
        severity: 'info',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z',
      };

      const result = auditLogFilterSchema.parse(input);

      expect(result.tenantId).toBe('00000000-0000-0000-0000-000000000001');
      expect(result.actorId).toBe('00000000-0000-0000-0000-000000000002');
      expect(result.action).toBe('user.created');
      expect(result.resource).toBe('user');
      expect(result.category).toBe('admin');
      expect(result.severity).toBe('info');
      expect(result.startDate).toBe('2024-01-01T00:00:00.000Z');
      expect(result.endDate).toBe('2024-12-31T23:59:59.999Z');
    });

    it('should parse with partial filters', () => {
      const input = {
        category: 'security',
        severity: 'critical',
      };

      const result = auditLogFilterSchema.parse(input);

      expect(result.category).toBe('security');
      expect(result.severity).toBe('critical');
      expect(result.tenantId).toBeUndefined();
      expect(result.actorId).toBeUndefined();
    });
  });

  describe('date range validation', () => {
    it('should accept valid date range', () => {
      const input = {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z',
      };

      const result = auditLogFilterSchema.parse(input);

      expect(result.startDate).toBe('2024-01-01T00:00:00.000Z');
      expect(result.endDate).toBe('2024-12-31T23:59:59.999Z');
    });

    it('should accept equal startDate and endDate', () => {
      const input = {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-01T00:00:00.000Z',
      };

      const result = auditLogFilterSchema.parse(input);

      expect(result.startDate).toBe('2024-01-01T00:00:00.000Z');
      expect(result.endDate).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should reject startDate after endDate', () => {
      const input = {
        startDate: '2024-12-31T23:59:59.999Z',
        endDate: '2024-01-01T00:00:00.000Z',
      };

      expect(() => auditLogFilterSchema.parse(input)).toThrow(
        'startDate must be before or equal to endDate',
      );
    });

    it('should accept startDate without endDate', () => {
      const input = {
        startDate: '2024-01-01T00:00:00.000Z',
      };

      const result = auditLogFilterSchema.parse(input);

      expect(result.startDate).toBe('2024-01-01T00:00:00.000Z');
      expect(result.endDate).toBeUndefined();
    });

    it('should accept endDate without startDate', () => {
      const input = {
        endDate: '2024-12-31T23:59:59.999Z',
      };

      const result = auditLogFilterSchema.parse(input);

      expect(result.startDate).toBeUndefined();
      expect(result.endDate).toBe('2024-12-31T23:59:59.999Z');
    });
  });

  describe('optional filter fields', () => {
    it('should accept undefined optional filters', () => {
      const result = auditLogFilterSchema.parse({});

      expect(result.tenantId).toBeUndefined();
      expect(result.actorId).toBeUndefined();
      expect(result.action).toBeUndefined();
      expect(result.resource).toBeUndefined();
      expect(result.category).toBeUndefined();
      expect(result.severity).toBeUndefined();
      expect(result.startDate).toBeUndefined();
      expect(result.endDate).toBeUndefined();
    });

    it('should validate tenantId as UUID', () => {
      const input = {
        tenantId: 'not-a-uuid',
      };

      expect(() => auditLogFilterSchema.parse(input)).toThrow();
    });

    it('should validate actorId as UUID', () => {
      const input = {
        actorId: 'not-a-uuid',
      };

      expect(() => auditLogFilterSchema.parse(input)).toThrow();
    });

    it('should validate category enum', () => {
      const input = {
        category: 'invalid',
      };

      expect(() => auditLogFilterSchema.parse(input)).toThrow(/audit category/i);
    });

    it('should validate severity enum', () => {
      const input = {
        severity: 'invalid',
      };

      expect(() => auditLogFilterSchema.parse(input)).toThrow(/audit severity/i);
    });
  });

  describe('pagination inheritance', () => {
    it('should enforce limit bounds', () => {
      const input = {
        limit: 2000,
      };

      expect(() => auditLogFilterSchema.parse(input)).toThrow('limit must be at most 1000');
    });

    it('should enforce minimum limit', () => {
      const input = {
        limit: 0,
      };

      expect(() => auditLogFilterSchema.parse(input)).toThrow('limit must be at least 1');
    });

    it('should validate sortOrder', () => {
      const input = {
        sortOrder: 'invalid',
      };

      expect(() => auditLogFilterSchema.parse(input)).toThrow(
        /Invalid sort order.*Expected one of/,
      );
    });

    it('should accept sortBy field', () => {
      const input = {
        sortBy: 'createdAt',
      };

      const result = auditLogFilterSchema.parse(input);

      expect(result.sortBy).toBe('createdAt');
    });
  });
});

// ============================================================================
// auditLogListResponseSchema
// ============================================================================

describe('auditLogListResponseSchema', () => {
  describe('valid inputs', () => {
    it('should parse valid paginated result', () => {
      const input = {
        data: [
          {
            id: '00000000-0000-0000-0000-000000000001',
            createdAt: '2024-01-01T00:00:00.000Z',
            tenantId: null,
            actorId: null,
            action: 'user.created',
            category: 'admin',
            severity: 'info',
            resource: 'user',
            metadata: {},
          },
        ],
        nextCursor: 'abc123',
        hasNext: true,
        limit: 50,
      };

      const result = auditLogListResponseSchema.parse(input);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe('00000000-0000-0000-0000-000000000001');
      expect(result.nextCursor).toBe('abc123');
      expect(result.hasNext).toBe(true);
      expect(result.limit).toBe(50);
    });

    it('should parse empty result', () => {
      const input = {
        data: [],
        nextCursor: null,
        hasNext: false,
        limit: 50,
      };

      const result = auditLogListResponseSchema.parse(input);

      expect(result.data).toEqual([]);
      expect(result.nextCursor).toBe(null);
      expect(result.hasNext).toBe(false);
    });

    it('should parse multiple audit events', () => {
      const input = {
        data: [
          {
            id: '00000000-0000-0000-0000-000000000001',
            createdAt: '2024-01-01T00:00:00.000Z',
            tenantId: null,
            actorId: null,
            action: 'user.created',
            category: 'admin',
            severity: 'info',
            resource: 'user',
            metadata: {},
          },
          {
            id: '00000000-0000-0000-0000-000000000002',
            createdAt: '2024-01-02T00:00:00.000Z',
            tenantId: '00000000-0000-0000-0000-000000000003',
            actorId: '00000000-0000-0000-0000-000000000004',
            action: 'auth.login',
            category: 'security',
            severity: 'info',
            resource: 'session',
            metadata: { ip: '192.168.1.1' },
          },
        ],
        nextCursor: 'xyz789',
        hasNext: true,
        limit: 50,
      };

      const result = auditLogListResponseSchema.parse(input);

      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.action).toBe('user.created');
      expect(result.data[1]?.action).toBe('auth.login');
    });
  });

  describe('required fields', () => {
    it('should require data array', () => {
      const input = {
        nextCursor: null,
        hasNext: false,
        limit: 50,
      };

      expect(() => auditLogListResponseSchema.parse(input)).toThrow('data must be an array');
    });

    it('should require hasNext boolean', () => {
      const input = {
        data: [],
        nextCursor: null,
        limit: 50,
      };

      expect(() => auditLogListResponseSchema.parse(input)).toThrow('hasNext must be a boolean');
    });

    it('should require limit number', () => {
      const input = {
        data: [],
        nextCursor: null,
        hasNext: false,
      };

      expect(() => auditLogListResponseSchema.parse(input)).toThrow();
    });
  });

  describe('data validation', () => {
    it('should validate each audit event in data array', () => {
      const input = {
        data: [
          {
            id: 'not-a-uuid',
            createdAt: '2024-01-01T00:00:00.000Z',
            tenantId: null,
            actorId: null,
            action: 'user.created',
            category: 'admin',
            severity: 'info',
            resource: 'user',
            metadata: {},
          },
        ],
        nextCursor: null,
        hasNext: false,
        limit: 50,
      };

      expect(() => auditLogListResponseSchema.parse(input)).toThrow();
    });

    it('should validate action format in nested events', () => {
      const input = {
        data: [
          {
            id: '00000000-0000-0000-0000-000000000001',
            createdAt: '2024-01-01T00:00:00.000Z',
            tenantId: null,
            actorId: null,
            action: 'invalid',
            category: 'admin',
            severity: 'info',
            resource: 'user',
            metadata: {},
          },
        ],
        nextCursor: null,
        hasNext: false,
        limit: 50,
      };

      expect(() => auditLogListResponseSchema.parse(input)).toThrow(
        'Action must follow "noun.verb" format',
      );
    });
  });

  describe('nextCursor handling', () => {
    it('should accept string nextCursor', () => {
      const input = {
        data: [],
        nextCursor: 'abc123',
        hasNext: true,
        limit: 50,
      };

      const result = auditLogListResponseSchema.parse(input);

      expect(result.nextCursor).toBe('abc123');
    });

    it('should accept null nextCursor', () => {
      const input = {
        data: [],
        nextCursor: null,
        hasNext: false,
        limit: 50,
      };

      const result = auditLogListResponseSchema.parse(input);

      expect(result.nextCursor).toBe(null);
    });

    it('should reject non-string non-null nextCursor', () => {
      const input = {
        data: [],
        nextCursor: 123,
        hasNext: false,
        limit: 50,
      };

      expect(() => auditLogListResponseSchema.parse(input)).toThrow(
        'nextCursor must be a string or null',
      );
    });
  });
});
