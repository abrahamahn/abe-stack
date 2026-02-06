// shared/src/domain/notifications/notifications.schemas.test.ts

/**
 * @file Unit Tests for Notification Schemas
 * @description Tests for notification validation schemas including notification entity,
 * preferences, list requests, and mark-as-read operations.
 * @module Domain/Notifications
 */

import { describe, expect, it } from 'vitest';

import {
  NOTIFICATION_TYPES,
  baseMarkAsReadRequestSchema,
  notificationPreferencesSchema,
  notificationSchema,
  notificationsListRequestSchema,
} from './notifications.schemas';

// ============================================================================
// Constants
// ============================================================================

describe('NOTIFICATION_TYPES', () => {
  it('should contain expected notification types', () => {
    expect(NOTIFICATION_TYPES).toEqual({
      INFO: 'info',
      SUCCESS: 'success',
      WARNING: 'warning',
      ERROR: 'error',
    });
  });

  it('should be a const object', () => {
    expect(typeof NOTIFICATION_TYPES).toBe('object');
    expect(NOTIFICATION_TYPES).not.toBeNull();
  });
});

// ============================================================================
// notificationSchema
// ============================================================================

describe('notificationSchema', () => {
  describe('valid inputs', () => {
    it('should parse complete notification with all fields', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test message',
        data: { key: 'value', nested: { foo: 'bar' } },
        isRead: true,
        readAt: '2024-01-01T12:00:00.000Z',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      const result = notificationSchema.parse(input);

      expect(result).toEqual(input);
    });

    it('should parse notification with minimal required fields', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'success',
        title: 'Success',
        message: 'Operation completed',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      const result = notificationSchema.parse(input);

      expect(result.id).toBe('00000000-0000-0000-0000-000000000001');
      expect(result.userId).toBe('00000000-0000-0000-0000-000000000002');
      expect(result.type).toBe('success');
      expect(result.title).toBe('Success');
      expect(result.message).toBe('Operation completed');
      expect(result.isRead).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.readAt).toBeUndefined();
      expect(result.createdAt).toBe('2024-01-01T10:00:00.000Z');
    });

    it('should accept all valid notification types', () => {
      const types: Array<'info' | 'success' | 'warning' | 'error'> = [
        'info',
        'success',
        'warning',
        'error',
      ];

      for (const type of types) {
        const input = {
          id: '00000000-0000-0000-0000-000000000001',
          userId: '00000000-0000-0000-0000-000000000002',
          type,
          title: 'Test',
          message: 'Test message',
          createdAt: '2024-01-01T10:00:00.000Z',
        };

        const result = notificationSchema.parse(input);
        expect(result.type).toBe(type);
      }
    });
  });

  describe('defaults', () => {
    it('should default isRead to false when not provided', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        message: 'Message',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      const result = notificationSchema.parse(input);

      expect(result.isRead).toBe(false);
    });

    it('should preserve isRead when explicitly set to true', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        message: 'Message',
        isRead: true,
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      const result = notificationSchema.parse(input);

      expect(result.isRead).toBe(true);
    });

    it('should preserve isRead when explicitly set to false', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        message: 'Message',
        isRead: false,
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      const result = notificationSchema.parse(input);

      expect(result.isRead).toBe(false);
    });
  });

  describe('optional fields', () => {
    it('should accept optional data field', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        message: 'Message',
        data: { customField: 'value', count: 42 },
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      const result = notificationSchema.parse(input);

      expect(result.data).toEqual({ customField: 'value', count: 42 });
    });

    it('should handle undefined data field', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        message: 'Message',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      const result = notificationSchema.parse(input);

      expect(result.data).toBeUndefined();
    });

    it('should accept empty data object', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        message: 'Message',
        data: {},
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      const result = notificationSchema.parse(input);

      expect(result.data).toEqual({});
    });
  });

  describe('nullable-optional readAt field', () => {
    it('should accept valid ISO datetime for readAt', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        message: 'Message',
        readAt: '2024-01-01T12:00:00.000Z',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      const result = notificationSchema.parse(input);

      expect(result.readAt).toBe('2024-01-01T12:00:00.000Z');
    });

    it('should accept null for readAt', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        message: 'Message',
        readAt: null,
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      const result = notificationSchema.parse(input);

      expect(result.readAt).toBe(null);
    });

    it('should handle undefined readAt', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        message: 'Message',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      const result = notificationSchema.parse(input);

      expect(result.readAt).toBeUndefined();
    });

    it('should reject invalid ISO datetime for readAt', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        message: 'Message',
        readAt: 'not-a-date',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      expect(() => notificationSchema.parse(input)).toThrow();
    });
  });

  describe('required fields validation', () => {
    it('should require id field', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        message: 'Message',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      expect(() => notificationSchema.parse(input)).toThrow();
    });

    it('should require userId field', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        type: 'info',
        title: 'Test',
        message: 'Message',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      expect(() => notificationSchema.parse(input)).toThrow();
    });

    it('should require type field', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        title: 'Test',
        message: 'Message',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      expect(() => notificationSchema.parse(input)).toThrow();
    });

    it('should require title field', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        message: 'Message',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      expect(() => notificationSchema.parse(input)).toThrow();
    });

    it('should require message field', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      expect(() => notificationSchema.parse(input)).toThrow();
    });

    it('should require createdAt field', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        message: 'Message',
      };

      expect(() => notificationSchema.parse(input)).toThrow();
    });
  });

  describe('type validation', () => {
    it('should reject invalid notification type', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'invalid',
        title: 'Test',
        message: 'Message',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      expect(() => notificationSchema.parse(input)).toThrow(/notification type/i);
    });

    it('should reject type as number', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 123,
        title: 'Test',
        message: 'Message',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      expect(() => notificationSchema.parse(input)).toThrow();
    });
  });

  describe('UUID validation', () => {
    it('should reject invalid UUID format for id', () => {
      const input = {
        id: 'not-a-uuid',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        message: 'Message',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      expect(() => notificationSchema.parse(input)).toThrow();
    });

    it('should reject invalid UUID format for userId', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: 'not-a-uuid',
        type: 'info',
        title: 'Test',
        message: 'Message',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      expect(() => notificationSchema.parse(input)).toThrow();
    });
  });

  describe('ISO datetime validation', () => {
    it('should reject invalid ISO datetime for createdAt', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        message: 'Message',
        createdAt: 'invalid-date',
      };

      expect(() => notificationSchema.parse(input)).toThrow();
    });

    it('should accept various valid ISO datetime formats', () => {
      const dates = [
        '2024-01-01T10:00:00.000Z',
        '2024-12-31T23:59:59.999Z',
        '2024-06-15T12:30:45.123Z',
      ];

      for (const date of dates) {
        const input = {
          id: '00000000-0000-0000-0000-000000000001',
          userId: '00000000-0000-0000-0000-000000000002',
          type: 'info',
          title: 'Test',
          message: 'Message',
          createdAt: date,
        };

        const result = notificationSchema.parse(input);
        expect(result.createdAt).toBe(date);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle non-object input', () => {
      expect(() => notificationSchema.parse(null)).toThrow();
      expect(() => notificationSchema.parse('string')).toThrow();
      expect(() => notificationSchema.parse(123)).toThrow();
      expect(() => notificationSchema.parse([])).toThrow();
    });

    it('should accept empty strings for title', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: '',
        message: 'Message',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      const result = notificationSchema.parse(input);
      expect(result.title).toBe('');
    });

    it('should accept empty strings for message', () => {
      const input = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
        type: 'info',
        title: 'Test',
        message: '',
        createdAt: '2024-01-01T10:00:00.000Z',
      };

      const result = notificationSchema.parse(input);
      expect(result.message).toBe('');
    });
  });
});

// ============================================================================
// notificationPreferencesSchema
// ============================================================================

describe('notificationPreferencesSchema', () => {
  describe('valid inputs', () => {
    it('should parse complete preferences with all fields', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
        emailEnabled: false,
        pushEnabled: true,
        categories: {
          alerts: true,
          updates: false,
          marketing: true,
        },
      };

      const result = notificationPreferencesSchema.parse(input);

      expect(result.userId).toBe('00000000-0000-0000-0000-000000000001');
      expect(result.emailEnabled).toBe(false);
      expect(result.pushEnabled).toBe(true);
      expect(result.categories).toEqual({
        alerts: true,
        updates: false,
        marketing: true,
      });
    });

    it('should parse preferences with minimal required fields', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
      };

      const result = notificationPreferencesSchema.parse(input);

      expect(result.userId).toBe('00000000-0000-0000-0000-000000000001');
      expect(result.emailEnabled).toBe(true);
      expect(result.pushEnabled).toBe(false);
      expect(result.categories).toEqual({});
    });
  });

  describe('defaults', () => {
    it('should default emailEnabled to true when not provided', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
      };

      const result = notificationPreferencesSchema.parse(input);

      expect(result.emailEnabled).toBe(true);
    });

    it('should default pushEnabled to false when not provided', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
      };

      const result = notificationPreferencesSchema.parse(input);

      expect(result.pushEnabled).toBe(false);
    });

    it('should default categories to empty object when not provided', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
      };

      const result = notificationPreferencesSchema.parse(input);

      expect(result.categories).toEqual({});
    });

    it('should preserve explicitly set emailEnabled false', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
        emailEnabled: false,
      };

      const result = notificationPreferencesSchema.parse(input);

      expect(result.emailEnabled).toBe(false);
    });

    it('should preserve explicitly set pushEnabled true', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
        pushEnabled: true,
      };

      const result = notificationPreferencesSchema.parse(input);

      expect(result.pushEnabled).toBe(true);
    });
  });

  describe('categories field', () => {
    it('should parse categories with boolean values', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
        categories: {
          cat1: true,
          cat2: false,
          cat3: true,
        },
      };

      const result = notificationPreferencesSchema.parse(input);

      expect(result.categories).toEqual({
        cat1: true,
        cat2: false,
        cat3: true,
      });
    });

    it('should handle empty categories object', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
        categories: {},
      };

      const result = notificationPreferencesSchema.parse(input);

      expect(result.categories).toEqual({});
    });

    it('should require strict boolean values for categories', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
        categories: {
          cat1: true,
          cat2: false,
        },
      };

      const result = notificationPreferencesSchema.parse(input);

      expect(result.categories).toEqual({
        cat1: true,
        cat2: false,
      });
    });

    it('should reject string boolean values for categories', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
        categories: {
          invalid: 'true',
        },
      };

      expect(() => notificationPreferencesSchema.parse(input)).toThrow(/categories\.invalid/);
    });

    it('should reject numeric values for categories', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
        categories: {
          invalid: 1,
        },
      };

      expect(() => notificationPreferencesSchema.parse(input)).toThrow(/categories\.invalid/);
    });

    it('should reject category values that cannot be parsed as boolean', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
        categories: {
          invalid: { nested: 'object' },
        },
      };

      expect(() => notificationPreferencesSchema.parse(input)).toThrow(/categories\.invalid/);
    });

    it('should handle null categories by defaulting to empty object', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
        categories: null,
      };

      const result = notificationPreferencesSchema.parse(input);

      expect(result.categories).toEqual({});
    });

    it('should handle array categories by defaulting to empty object', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
        categories: ['not', 'an', 'object'],
      };

      const result = notificationPreferencesSchema.parse(input);

      expect(result.categories).toEqual({});
    });
  });

  describe('required fields validation', () => {
    it('should require userId field', () => {
      const input = {
        emailEnabled: true,
        pushEnabled: false,
        categories: {},
      };

      expect(() => notificationPreferencesSchema.parse(input)).toThrow();
    });

    it('should reject invalid UUID for userId', () => {
      const input = {
        userId: 'not-a-uuid',
        emailEnabled: true,
        pushEnabled: false,
        categories: {},
      };

      expect(() => notificationPreferencesSchema.parse(input)).toThrow();
    });
  });

  describe('boolean fields validation', () => {
    it('should accept boolean values for emailEnabled', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
        emailEnabled: true,
      };

      const result = notificationPreferencesSchema.parse(input);

      expect(result.emailEnabled).toBe(true);
    });

    it('should accept boolean values for pushEnabled', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
        pushEnabled: true,
      };

      const result = notificationPreferencesSchema.parse(input);

      expect(result.pushEnabled).toBe(true);
    });

    it('should reject string boolean values', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
        emailEnabled: 'true',
      };

      expect(() => notificationPreferencesSchema.parse(input)).toThrow(/emailEnabled/);
    });

    it('should reject numeric boolean values', () => {
      const input = {
        userId: '00000000-0000-0000-0000-000000000001',
        pushEnabled: 1,
      };

      expect(() => notificationPreferencesSchema.parse(input)).toThrow(/pushEnabled/);
    });
  });

  describe('edge cases', () => {
    it('should handle non-object input', () => {
      expect(() => notificationPreferencesSchema.parse(null)).toThrow();
      expect(() => notificationPreferencesSchema.parse('string')).toThrow();
      expect(() => notificationPreferencesSchema.parse(123)).toThrow();
      expect(() => notificationPreferencesSchema.parse([])).toThrow();
    });

    it('should handle empty input object', () => {
      const input = {};

      expect(() => notificationPreferencesSchema.parse(input)).toThrow();
    });
  });
});

// ============================================================================
// notificationsListRequestSchema
// ============================================================================

describe('notificationsListRequestSchema', () => {
  describe('valid inputs', () => {
    it('should parse with default values only (empty object)', () => {
      const input = {};

      const result = notificationsListRequestSchema.parse(input);

      expect(result.limit).toBe(50);
      expect(result.sortOrder).toBe('desc');
      expect(result.cursor).toBeUndefined();
      expect(result.isRead).toBeUndefined();
      expect(result.type).toBeUndefined();
    });

    it('should parse with custom pagination options', () => {
      const input = {
        limit: 25,
        sortOrder: 'asc' as const,
        cursor: 'abc123',
      };

      const result = notificationsListRequestSchema.parse(input);

      expect(result.limit).toBe(25);
      expect(result.sortOrder).toBe('asc');
      expect(result.cursor).toBe('abc123');
    });

    it('should parse with all optional filters', () => {
      const input = {
        isRead: true,
        type: 'info' as const,
      };

      const result = notificationsListRequestSchema.parse(input);

      expect(result.isRead).toBe(true);
      expect(result.type).toBe('info');
    });

    it('should parse with complete input including pagination and filters', () => {
      const input = {
        limit: 100,
        sortOrder: 'asc' as const,
        cursor: 'xyz789',
        sortBy: 'createdAt',
        isRead: false,
        type: 'warning' as const,
      };

      const result = notificationsListRequestSchema.parse(input);

      expect(result.limit).toBe(100);
      expect(result.sortOrder).toBe('asc');
      expect(result.cursor).toBe('xyz789');
      expect(result.sortBy).toBe('createdAt');
      expect(result.isRead).toBe(false);
      expect(result.type).toBe('warning');
    });
  });

  describe('optional filter fields', () => {
    it('should accept isRead filter as true', () => {
      const input = {
        isRead: true,
      };

      const result = notificationsListRequestSchema.parse(input);

      expect(result.isRead).toBe(true);
    });

    it('should accept isRead filter as false', () => {
      const input = {
        isRead: false,
      };

      const result = notificationsListRequestSchema.parse(input);

      expect(result.isRead).toBe(false);
    });

    it('should accept all valid notification types as filter', () => {
      const types: Array<'info' | 'success' | 'warning' | 'error'> = [
        'info',
        'success',
        'warning',
        'error',
      ];

      for (const type of types) {
        const input = {
          type,
        };

        const result = notificationsListRequestSchema.parse(input);
        expect(result.type).toBe(type);
      }
    });

    it('should handle undefined optional filters', () => {
      const input = {};

      const result = notificationsListRequestSchema.parse(input);

      expect(result.isRead).toBeUndefined();
      expect(result.type).toBeUndefined();
    });
  });

  describe('type enum validation', () => {
    it('should reject invalid notification type', () => {
      const input = {
        type: 'invalid',
      };

      expect(() => notificationsListRequestSchema.parse(input)).toThrow(/notification type/i);
    });

    it('should reject type as number', () => {
      const input = {
        type: 123,
      };

      expect(() => notificationsListRequestSchema.parse(input)).toThrow();
    });

    it('should reject type as boolean', () => {
      const input = {
        type: true,
      };

      expect(() => notificationsListRequestSchema.parse(input)).toThrow();
    });
  });

  describe('pagination validation', () => {
    it('should enforce default limit of 50', () => {
      const input = {};

      const result = notificationsListRequestSchema.parse(input);

      expect(result.limit).toBe(50);
    });

    it('should enforce default sortOrder of desc', () => {
      const input = {};

      const result = notificationsListRequestSchema.parse(input);

      expect(result.sortOrder).toBe('desc');
    });

    it('should accept valid limit values', () => {
      const input = {
        limit: 10,
      };

      const result = notificationsListRequestSchema.parse(input);

      expect(result.limit).toBe(10);
    });

    it('should accept sortOrder asc', () => {
      const input = {
        sortOrder: 'asc' as const,
      };

      const result = notificationsListRequestSchema.parse(input);

      expect(result.sortOrder).toBe('asc');
    });

    it('should accept sortOrder desc', () => {
      const input = {
        sortOrder: 'desc' as const,
      };

      const result = notificationsListRequestSchema.parse(input);

      expect(result.sortOrder).toBe('desc');
    });

    it('should reject invalid sortOrder', () => {
      const input = {
        sortOrder: 'invalid',
      };

      expect(() => notificationsListRequestSchema.parse(input)).toThrow(/sort order/i);
    });

    it('should enforce maximum limit', () => {
      const input = {
        limit: 2000,
      };

      expect(() => notificationsListRequestSchema.parse(input)).toThrow(
        'limit must be at most 1000',
      );
    });

    it('should enforce minimum limit', () => {
      const input = {
        limit: 0,
      };

      expect(() => notificationsListRequestSchema.parse(input)).toThrow(
        'limit must be at least 1',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle null input', () => {
      const result = notificationsListRequestSchema.parse(null);

      expect(result.limit).toBe(50);
      expect(result.sortOrder).toBe('desc');
    });

    it('should handle non-object primitives', () => {
      const result = notificationsListRequestSchema.parse('string');

      expect(result.limit).toBe(50);
      expect(result.sortOrder).toBe('desc');
    });
  });
});

// ============================================================================
// baseMarkAsReadRequestSchema
// ============================================================================

describe('baseMarkAsReadRequestSchema', () => {
  describe('valid inputs', () => {
    it('should parse with one valid UUID', () => {
      const input = {
        ids: ['00000000-0000-0000-0000-000000000001'],
      };

      const result = baseMarkAsReadRequestSchema.parse(input);

      expect(result.ids).toEqual(['00000000-0000-0000-0000-000000000001']);
      expect(result.ids).toHaveLength(1);
    });

    it('should parse with multiple valid UUIDs', () => {
      const input = {
        ids: [
          '00000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000002',
          '00000000-0000-0000-0000-000000000003',
        ],
      };

      const result = baseMarkAsReadRequestSchema.parse(input);

      expect(result.ids).toEqual([
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
      ]);
      expect(result.ids).toHaveLength(3);
    });

    it('should parse with many valid UUIDs', () => {
      const ids = Array.from(
        { length: 10 },
        (_, i) => `00000000-0000-0000-0000-00000000000${i.toString().padStart(1, '0')}`,
      );
      const input = { ids };

      const result = baseMarkAsReadRequestSchema.parse(input);

      expect(result.ids).toEqual(ids);
      expect(result.ids).toHaveLength(10);
    });
  });

  describe('array validation', () => {
    it('should reject empty array', () => {
      const input = {
        ids: [],
      };

      expect(() => baseMarkAsReadRequestSchema.parse(input)).toThrow(
        'ids must have at least 1 item',
      );
    });

    it('should reject non-array input', () => {
      const input = {
        ids: '00000000-0000-0000-0000-000000000001',
      };

      expect(() => baseMarkAsReadRequestSchema.parse(input)).toThrow('ids must be an array');
    });

    it('should reject null instead of array', () => {
      const input = {
        ids: null,
      };

      expect(() => baseMarkAsReadRequestSchema.parse(input)).toThrow('ids must be an array');
    });

    it('should reject undefined ids field', () => {
      const input = {};

      expect(() => baseMarkAsReadRequestSchema.parse(input)).toThrow('ids must be an array');
    });

    it('should reject object instead of array', () => {
      const input = {
        ids: { id: '00000000-0000-0000-0000-000000000001' },
      };

      expect(() => baseMarkAsReadRequestSchema.parse(input)).toThrow('ids must be an array');
    });
  });

  describe('UUID validation', () => {
    it('should reject invalid UUID in array', () => {
      const input = {
        ids: ['not-a-uuid'],
      };

      expect(() => baseMarkAsReadRequestSchema.parse(input)).toThrow();
    });

    it('should reject when some UUIDs are invalid', () => {
      const input = {
        ids: ['00000000-0000-0000-0000-000000000001', 'not-a-uuid', '00000000-0000-0000-0000-000000000003'],
      };

      expect(() => baseMarkAsReadRequestSchema.parse(input)).toThrow();
    });

    it('should reject empty string in array', () => {
      const input = {
        ids: [''],
      };

      expect(() => baseMarkAsReadRequestSchema.parse(input)).toThrow();
    });

    it('should reject non-string values in array', () => {
      const input = {
        ids: [123, 456],
      };

      expect(() => baseMarkAsReadRequestSchema.parse(input)).toThrow();
    });

    it('should reject null values in array', () => {
      const input = {
        ids: [null],
      };

      expect(() => baseMarkAsReadRequestSchema.parse(input)).toThrow();
    });

    it('should reject undefined values in array', () => {
      const input = {
        ids: [undefined],
      };

      expect(() => baseMarkAsReadRequestSchema.parse(input)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle non-object input', () => {
      expect(() => baseMarkAsReadRequestSchema.parse(null)).toThrow('ids must be an array');
      expect(() => baseMarkAsReadRequestSchema.parse('string')).toThrow('ids must be an array');
      expect(() => baseMarkAsReadRequestSchema.parse(123)).toThrow('ids must be an array');
    });

    it('should validate all UUIDs in large array', () => {
      const validIds = Array.from(
        { length: 50 },
        (_, i) => `00000000-0000-0000-0000-${i.toString().padStart(12, '0')}`,
      );
      const input = { ids: validIds };

      const result = baseMarkAsReadRequestSchema.parse(input);

      expect(result.ids).toEqual(validIds);
      expect(result.ids).toHaveLength(50);
    });

    it('should preserve UUID order in array', () => {
      const input = {
        ids: [
          '00000000-0000-0000-0000-000000000003',
          '00000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000002',
        ],
      };

      const result = baseMarkAsReadRequestSchema.parse(input);

      expect(result.ids[0]).toBe('00000000-0000-0000-0000-000000000003');
      expect(result.ids[1]).toBe('00000000-0000-0000-0000-000000000001');
      expect(result.ids[2]).toBe('00000000-0000-0000-0000-000000000002');
    });
  });
});
