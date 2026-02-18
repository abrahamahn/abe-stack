// main/shared/src/core/activities/activities.schemas.test.ts

/**
 * @file Unit Tests for Activities Domain Schemas
 * @description Tests for activity feed validation schemas.
 * @module Domain/Activities
 */

import { describe, expect, it } from 'vitest';

import {
  activitiesListFiltersSchema,
  activitySchema,
  actorTypeSchema,
  createActivitySchema,
  type ActivitiesListFilters,
  type Activity,
  type CreateActivity,
} from './activities.schemas';

// ============================================================================
// Test Constants
// ============================================================================

const VALID_UUID = '00000000-0000-0000-0000-000000000001';
const VALID_UUID_2 = '00000000-0000-0000-0000-000000000002';
const VALID_DATE = new Date('2026-01-15T12:00:00.000Z');
const VALID_ISO = '2026-01-15T12:00:00.000Z';

const VALID_ACTIVITY = {
  id: VALID_UUID,
  tenantId: VALID_UUID_2,
  actorId: VALID_UUID,
  actorType: 'user' as const,
  action: 'created',
  resourceType: 'project',
  resourceId: 'proj-123',
  description: 'Created project "My Project"',
  metadata: { projectName: 'My Project' },
  ipAddress: '192.168.1.1',
  createdAt: VALID_ISO,
};

// ============================================================================
// actorTypeSchema
// ============================================================================

describe('actorTypeSchema', () => {
  describe('valid inputs', () => {
    it('should accept "user"', () => {
      expect(actorTypeSchema.parse('user')).toBe('user');
    });

    it('should accept "system"', () => {
      expect(actorTypeSchema.parse('system')).toBe('system');
    });

    it('should accept "api_key"', () => {
      expect(actorTypeSchema.parse('api_key')).toBe('api_key');
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid actor type', () => {
      expect(() => actorTypeSchema.parse('admin')).toThrow();
    });

    it('should reject non-string', () => {
      expect(() => actorTypeSchema.parse(123)).toThrow();
    });
  });
});

// ============================================================================
// activitySchema
// ============================================================================

describe('activitySchema', () => {
  describe('valid inputs', () => {
    it('should parse a valid full activity', () => {
      const result: Activity = activitySchema.parse(VALID_ACTIVITY);

      expect(result.id).toBe(VALID_UUID);
      expect(result.tenantId).toBe(VALID_UUID_2);
      expect(result.actorId).toBe(VALID_UUID);
      expect(result.actorType).toBe('user');
      expect(result.action).toBe('created');
      expect(result.resourceType).toBe('project');
      expect(result.resourceId).toBe('proj-123');
      expect(result.description).toBe('Created project "My Project"');
      expect(result.metadata).toEqual({ projectName: 'My Project' });
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should accept null for nullable fields', () => {
      const result: Activity = activitySchema.parse({
        ...VALID_ACTIVITY,
        tenantId: null,
        actorId: null,
        description: null,
        ipAddress: null,
      });

      expect(result.tenantId).toBeNull();
      expect(result.actorId).toBeNull();
      expect(result.description).toBeNull();
      expect(result.ipAddress).toBeNull();
    });

    it('should coerce ISO string dates to Date objects', () => {
      const result: Activity = activitySchema.parse(VALID_ACTIVITY);

      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should accept Date objects for date fields', () => {
      const result: Activity = activitySchema.parse({
        ...VALID_ACTIVITY,
        createdAt: VALID_DATE,
      });

      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should accept all valid actor types', () => {
      const actorTypes = ['user', 'system', 'api_key'] as const;
      actorTypes.forEach((actorType) => {
        const result: Activity = activitySchema.parse({
          ...VALID_ACTIVITY,
          actorType,
        });
        expect(result.actorType).toBe(actorType);
      });
    });

    it('should accept system actor with null actorId', () => {
      const result: Activity = activitySchema.parse({
        ...VALID_ACTIVITY,
        actorId: null,
        actorType: 'system',
      });

      expect(result.actorId).toBeNull();
      expect(result.actorType).toBe('system');
    });

    it('should accept non-UUID resourceId', () => {
      const result: Activity = activitySchema.parse({
        ...VALID_ACTIVITY,
        resourceId: 'custom-id-123',
      });

      expect(result.resourceId).toBe('custom-id-123');
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid UUID for id', () => {
      expect(() => activitySchema.parse({ ...VALID_ACTIVITY, id: 'bad' })).toThrow();
    });

    it('should reject invalid UUID for tenantId', () => {
      expect(() => activitySchema.parse({ ...VALID_ACTIVITY, tenantId: 'bad' })).toThrow();
    });

    it('should reject invalid UUID for actorId', () => {
      expect(() => activitySchema.parse({ ...VALID_ACTIVITY, actorId: 'bad' })).toThrow();
    });

    it('should reject invalid actor type', () => {
      expect(() => activitySchema.parse({ ...VALID_ACTIVITY, actorType: 'invalid' })).toThrow();
    });

    it('should reject missing action', () => {
      expect(() => activitySchema.parse({ ...VALID_ACTIVITY, action: undefined })).toThrow();
    });

    it('should reject missing resourceType', () => {
      expect(() => activitySchema.parse({ ...VALID_ACTIVITY, resourceType: undefined })).toThrow();
    });

    it('should reject missing resourceId', () => {
      expect(() => activitySchema.parse({ ...VALID_ACTIVITY, resourceId: undefined })).toThrow();
    });

    it('should reject invalid date for createdAt', () => {
      expect(() => activitySchema.parse({ ...VALID_ACTIVITY, createdAt: 'not-a-date' })).toThrow();
    });

    it('should reject non-object input', () => {
      expect(() => activitySchema.parse(null)).toThrow();
      expect(() => activitySchema.parse('string')).toThrow();
      expect(() => activitySchema.parse(42)).toThrow();
    });

    it('should reject missing required fields', () => {
      expect(() => activitySchema.parse({})).toThrow();
      expect(() => activitySchema.parse({ id: VALID_UUID })).toThrow();
    });
  });
});

// ============================================================================
// createActivitySchema
// ============================================================================

describe('createActivitySchema', () => {
  describe('valid inputs', () => {
    it('should parse with required fields only', () => {
      const result: CreateActivity = createActivitySchema.parse({
        actorType: 'user',
        action: 'updated',
        resourceType: 'task',
        resourceId: 'task-456',
      });

      expect(result.actorType).toBe('user');
      expect(result.action).toBe('updated');
      expect(result.resourceType).toBe('task');
      expect(result.resourceId).toBe('task-456');
      expect(result.tenantId).toBeUndefined();
      expect(result.actorId).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.metadata).toBeUndefined();
      expect(result.ipAddress).toBeUndefined();
    });

    it('should parse with all fields', () => {
      const result: CreateActivity = createActivitySchema.parse({
        tenantId: VALID_UUID_2,
        actorId: VALID_UUID,
        actorType: 'user',
        action: 'deleted',
        resourceType: 'document',
        resourceId: 'doc-789',
        description: 'Deleted document',
        metadata: { fileName: 'report.pdf' },
        ipAddress: '10.0.0.1',
      });

      expect(result.tenantId).toBe(VALID_UUID_2);
      expect(result.actorId).toBe(VALID_UUID);
      expect(result.actorType).toBe('user');
      expect(result.action).toBe('deleted');
      expect(result.resourceType).toBe('document');
      expect(result.resourceId).toBe('doc-789');
      expect(result.description).toBe('Deleted document');
      expect(result.metadata).toEqual({ fileName: 'report.pdf' });
      expect(result.ipAddress).toBe('10.0.0.1');
    });

    it('should accept null for optional nullable fields', () => {
      const result: CreateActivity = createActivitySchema.parse({
        tenantId: null,
        actorId: null,
        actorType: 'system',
        action: 'cleanup',
        resourceType: 'cache',
        resourceId: 'cache-all',
        description: null,
        ipAddress: null,
      });

      expect(result.tenantId).toBeNull();
      expect(result.actorId).toBeNull();
      expect(result.actorType).toBe('system');
      expect(result.description).toBeNull();
      expect(result.ipAddress).toBeNull();
    });

    it('should accept all valid actor types', () => {
      const actorTypes = ['user', 'system', 'api_key'] as const;
      actorTypes.forEach((actorType) => {
        const result: CreateActivity = createActivitySchema.parse({
          actorType,
          action: 'test',
          resourceType: 'test',
          resourceId: 'test-1',
        });
        expect(result.actorType).toBe(actorType);
      });
    });

    it('should accept system actor without actorId', () => {
      const result: CreateActivity = createActivitySchema.parse({
        actorType: 'system',
        action: 'auto-backup',
        resourceType: 'database',
        resourceId: 'db-main',
      });

      expect(result.actorType).toBe('system');
      expect(result.actorId).toBeUndefined();
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing actorType', () => {
      expect(() =>
        createActivitySchema.parse({
          action: 'test',
          resourceType: 'test',
          resourceId: 'test-1',
        }),
      ).toThrow();
    });

    it('should reject missing action', () => {
      expect(() =>
        createActivitySchema.parse({
          actorType: 'user',
          resourceType: 'test',
          resourceId: 'test-1',
        }),
      ).toThrow();
    });

    it('should reject missing resourceType', () => {
      expect(() =>
        createActivitySchema.parse({
          actorType: 'user',
          action: 'test',
          resourceId: 'test-1',
        }),
      ).toThrow();
    });

    it('should reject missing resourceId', () => {
      expect(() =>
        createActivitySchema.parse({
          actorType: 'user',
          action: 'test',
          resourceType: 'test',
        }),
      ).toThrow();
    });

    it('should reject invalid UUID for tenantId', () => {
      expect(() =>
        createActivitySchema.parse({
          tenantId: 'bad-uuid',
          actorType: 'user',
          action: 'test',
          resourceType: 'test',
          resourceId: 'test-1',
        }),
      ).toThrow();
    });

    it('should reject invalid UUID for actorId', () => {
      expect(() =>
        createActivitySchema.parse({
          actorId: 'bad-uuid',
          actorType: 'user',
          action: 'test',
          resourceType: 'test',
          resourceId: 'test-1',
        }),
      ).toThrow();
    });

    it('should reject invalid actor type', () => {
      expect(() =>
        createActivitySchema.parse({
          actorType: 'invalid',
          action: 'test',
          resourceType: 'test',
          resourceId: 'test-1',
        }),
      ).toThrow();
    });
  });
});

// ============================================================================
// activitiesListFiltersSchema Tests
// ============================================================================

describe('activitiesListFiltersSchema', () => {
  describe('valid inputs', () => {
    it('should parse empty filters (all optional)', () => {
      const result: ActivitiesListFilters = activitiesListFiltersSchema.parse({});

      expect(result.resourceType).toBeUndefined();
      expect(result.actorId).toBeUndefined();
      expect(result.action).toBeUndefined();
      expect(result.cursor).toBeUndefined();
      expect(result.limit).toBeUndefined();
    });

    it('should parse filters with resourceType only', () => {
      const result: ActivitiesListFilters = activitiesListFiltersSchema.parse({
        resourceType: 'project',
      });

      expect(result.resourceType).toBe('project');
      expect(result.actorId).toBeUndefined();
    });

    it('should parse filters with actorId only', () => {
      const result: ActivitiesListFilters = activitiesListFiltersSchema.parse({
        actorId: VALID_UUID,
      });

      expect(result.actorId).toBe(VALID_UUID);
    });

    it('should parse filters with action only', () => {
      const result: ActivitiesListFilters = activitiesListFiltersSchema.parse({
        action: 'created',
      });

      expect(result.action).toBe('created');
    });

    it('should parse filters with cursor only', () => {
      const result: ActivitiesListFilters = activitiesListFiltersSchema.parse({
        cursor: 'cursor_abc123',
      });

      expect(result.cursor).toBe('cursor_abc123');
    });

    it('should parse filters with limit only', () => {
      const result: ActivitiesListFilters = activitiesListFiltersSchema.parse({ limit: 50 });

      expect(result.limit).toBe(50);
    });

    it('should parse filters with all fields', () => {
      const result: ActivitiesListFilters = activitiesListFiltersSchema.parse({
        resourceType: 'task',
        actorId: VALID_UUID,
        action: 'updated',
        cursor: 'cursor_xyz',
        limit: 25,
      });

      expect(result.resourceType).toBe('task');
      expect(result.actorId).toBe(VALID_UUID);
      expect(result.action).toBe('updated');
      expect(result.cursor).toBe('cursor_xyz');
      expect(result.limit).toBe(25);
    });

    it('should parse limit at minimum boundary (1)', () => {
      const result: ActivitiesListFilters = activitiesListFiltersSchema.parse({ limit: 1 });

      expect(result.limit).toBe(1);
    });

    it('should parse limit at maximum boundary (100)', () => {
      const result: ActivitiesListFilters = activitiesListFiltersSchema.parse({ limit: 100 });

      expect(result.limit).toBe(100);
    });
  });

  describe('invalid inputs', () => {
    it('should throw when resourceType is empty string', () => {
      expect(() => activitiesListFiltersSchema.parse({ resourceType: '' })).toThrow(
        'resourceType must be at least 1 character',
      );
    });

    it('should throw when actorId is empty string', () => {
      expect(() => activitiesListFiltersSchema.parse({ actorId: '' })).toThrow(
        'actorId must be at least 1 character',
      );
    });

    it('should throw when action is empty string', () => {
      expect(() => activitiesListFiltersSchema.parse({ action: '' })).toThrow(
        'action must be at least 1 character',
      );
    });

    it('should throw when cursor is empty string', () => {
      expect(() => activitiesListFiltersSchema.parse({ cursor: '' })).toThrow(
        'cursor must be at least 1 character',
      );
    });

    it('should throw when limit is zero', () => {
      expect(() => activitiesListFiltersSchema.parse({ limit: 0 })).toThrow();
    });

    it('should throw when limit exceeds 100', () => {
      expect(() => activitiesListFiltersSchema.parse({ limit: 101 })).toThrow();
    });

    it('should throw when limit is not an integer', () => {
      expect(() => activitiesListFiltersSchema.parse({ limit: 10.5 })).toThrow();
    });

    it('should throw when limit is a string', () => {
      expect(() => activitiesListFiltersSchema.parse({ limit: 'ten' })).toThrow(
        'limit must be a number',
      );
    });

    it('should throw when resourceType is a number', () => {
      expect(() => activitiesListFiltersSchema.parse({ resourceType: 123 })).toThrow(
        'resourceType must be a string',
      );
    });
  });

  describe('edge cases', () => {
    it('should parse null input as empty filters (all optional)', () => {
      const result: ActivitiesListFilters = activitiesListFiltersSchema.parse(null);

      expect(result.resourceType).toBeUndefined();
      expect(result.limit).toBeUndefined();
    });

    it('should parse undefined input as empty filters', () => {
      const result: ActivitiesListFilters = activitiesListFiltersSchema.parse(undefined);

      expect(result.resourceType).toBeUndefined();
    });

    it('should parse non-object input as empty filters', () => {
      const result: ActivitiesListFilters = activitiesListFiltersSchema.parse('filters');

      expect(result.resourceType).toBeUndefined();
      expect(result.limit).toBeUndefined();
    });
  });
});
