// main/shared/src/core/activities/activities.types.test.ts

/**
 * @file Unit Tests for Activity Event Types
 * @description Tests for ActivityType constants, ActivityEvent schema,
 * and ActivityFeedRequest/Response schemas.
 * @module Domain/Activities
 */

import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_VALUES,
  activityEventSchema,
  activityFeedRequestSchema,
  activityFeedResponseSchema,
} from './activities.types';

import type { ActivityEvent, ActivityFeedRequest, ActivityFeedResponse } from './activities.types';

// ============================================================================
// Test Constants
// ============================================================================

const VALID_UUID = '12345678-1234-4abc-8abc-123456789001';
const VALID_UUID_2 = '12345678-1234-4abc-8abc-123456789002';

const VALID_EVENT: Record<string, unknown> = {
  id: VALID_UUID,
  tenantId: VALID_UUID_2,
  actorId: VALID_UUID,
  actorType: 'user',
  action: 'user.login',
  resourceType: 'session',
  resourceId: 'session-123',
  description: 'User logged in',
  metadata: { browser: 'Chrome' },
  ipAddress: '192.168.1.1',
  createdAt: '2026-01-15T12:00:00.000Z',
};

// ============================================================================
// ACTIVITY_TYPES
// ============================================================================

describe('ACTIVITY_TYPES', () => {
  it('should contain user lifecycle types', () => {
    expect(ACTIVITY_TYPES.USER_LOGIN).toBe('user.login');
    expect(ACTIVITY_TYPES.USER_LOGOUT).toBe('user.logout');
    expect(ACTIVITY_TYPES.USER_REGISTER).toBe('user.register');
    expect(ACTIVITY_TYPES.USER_PASSWORD_CHANGE).toBe('user.password_change');
    expect(ACTIVITY_TYPES.USER_PROFILE_UPDATE).toBe('user.profile_update');
    expect(ACTIVITY_TYPES.USER_DEACTIVATE).toBe('user.deactivate');
    expect(ACTIVITY_TYPES.USER_REACTIVATE).toBe('user.reactivate');
    expect(ACTIVITY_TYPES.USER_DELETE).toBe('user.delete');
  });

  it('should contain workspace management types', () => {
    expect(ACTIVITY_TYPES.WORKSPACE_CREATE).toBe('workspace.create');
    expect(ACTIVITY_TYPES.WORKSPACE_UPDATE).toBe('workspace.update');
    expect(ACTIVITY_TYPES.WORKSPACE_DELETE).toBe('workspace.delete');
    expect(ACTIVITY_TYPES.WORKSPACE_MEMBER_ADD).toBe('workspace.member_add');
    expect(ACTIVITY_TYPES.WORKSPACE_MEMBER_REMOVE).toBe('workspace.member_remove');
    expect(ACTIVITY_TYPES.WORKSPACE_MEMBER_ROLE_CHANGE).toBe('workspace.member_role_change');
    expect(ACTIVITY_TYPES.WORKSPACE_INVITATION_SEND).toBe('workspace.invitation_send');
    expect(ACTIVITY_TYPES.WORKSPACE_INVITATION_ACCEPT).toBe('workspace.invitation_accept');
    expect(ACTIVITY_TYPES.WORKSPACE_INVITATION_REVOKE).toBe('workspace.invitation_revoke');
    expect(ACTIVITY_TYPES.WORKSPACE_OWNERSHIP_TRANSFER).toBe('workspace.ownership_transfer');
  });

  it('should contain project CRUD types', () => {
    expect(ACTIVITY_TYPES.PROJECT_CREATE).toBe('project.create');
    expect(ACTIVITY_TYPES.PROJECT_UPDATE).toBe('project.update');
    expect(ACTIVITY_TYPES.PROJECT_DELETE).toBe('project.delete');
    expect(ACTIVITY_TYPES.PROJECT_ARCHIVE).toBe('project.archive');
    expect(ACTIVITY_TYPES.PROJECT_RESTORE).toBe('project.restore');
  });

  it('should contain billing event types', () => {
    expect(ACTIVITY_TYPES.BILLING_SUBSCRIPTION_CREATE).toBe('billing.subscription_create');
    expect(ACTIVITY_TYPES.BILLING_SUBSCRIPTION_CANCEL).toBe('billing.subscription_cancel');
    expect(ACTIVITY_TYPES.BILLING_PLAN_CHANGE).toBe('billing.plan_change');
    expect(ACTIVITY_TYPES.BILLING_PAYMENT_SUCCESS).toBe('billing.payment_success');
    expect(ACTIVITY_TYPES.BILLING_PAYMENT_FAILED).toBe('billing.payment_failed');
  });

  it('should contain security types', () => {
    expect(ACTIVITY_TYPES.SECURITY_API_KEY_CREATE).toBe('security.api_key_create');
    expect(ACTIVITY_TYPES.SECURITY_API_KEY_REVOKE).toBe('security.api_key_revoke');
    expect(ACTIVITY_TYPES.SECURITY_MFA_ENABLE).toBe('security.mfa_enable');
    expect(ACTIVITY_TYPES.SECURITY_MFA_DISABLE).toBe('security.mfa_disable');
  });

  it('should contain feature flag types', () => {
    expect(ACTIVITY_TYPES.FEATURE_FLAG_CREATE).toBe('feature_flag.create');
    expect(ACTIVITY_TYPES.FEATURE_FLAG_UPDATE).toBe('feature_flag.update');
    expect(ACTIVITY_TYPES.FEATURE_FLAG_DELETE).toBe('feature_flag.delete');
  });

  it('should contain system types', () => {
    expect(ACTIVITY_TYPES.SYSTEM_MAINTENANCE).toBe('system.maintenance');
    expect(ACTIVITY_TYPES.SYSTEM_DATA_EXPORT).toBe('system.data_export');
  });
});

describe('ACTIVITY_TYPE_VALUES', () => {
  it('should be an array of all activity type values', () => {
    expect(Array.isArray(ACTIVITY_TYPE_VALUES)).toBe(true);
    expect(ACTIVITY_TYPE_VALUES.length).toBeGreaterThan(0);
  });

  it('should include all known types', () => {
    expect(ACTIVITY_TYPE_VALUES).toContain('user.login');
    expect(ACTIVITY_TYPE_VALUES).toContain('workspace.create');
    expect(ACTIVITY_TYPE_VALUES).toContain('project.create');
    expect(ACTIVITY_TYPE_VALUES).toContain('billing.subscription_create');
    expect(ACTIVITY_TYPE_VALUES).toContain('security.api_key_create');
    expect(ACTIVITY_TYPE_VALUES).toContain('system.maintenance');
  });

  it('should match the count of ACTIVITY_TYPES keys', () => {
    const keyCount = Object.keys(ACTIVITY_TYPES).length;
    expect(ACTIVITY_TYPE_VALUES.length).toBe(keyCount);
  });
});

// ============================================================================
// activityEventSchema
// ============================================================================

describe('activityEventSchema', () => {
  describe('valid inputs', () => {
    it('should parse a valid activity event', () => {
      const result: ActivityEvent = activityEventSchema.parse(VALID_EVENT);

      expect(result.id).toBe(VALID_UUID);
      expect(result.tenantId).toBe(VALID_UUID_2);
      expect(result.actorId).toBe(VALID_UUID);
      expect(result.actorType).toBe('user');
      expect(result.action).toBe('user.login');
      expect(result.resourceType).toBe('session');
      expect(result.resourceId).toBe('session-123');
      expect(result.description).toBe('User logged in');
      expect(result.metadata).toEqual({ browser: 'Chrome' });
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should accept null for nullable fields', () => {
      const result: ActivityEvent = activityEventSchema.parse({
        ...VALID_EVENT,
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

    it('should accept all valid actor types', () => {
      for (const actorType of ['user', 'system', 'api_key']) {
        const result = activityEventSchema.parse({
          ...VALID_EVENT,
          actorType,
        });
        expect(result.actorType).toBe(actorType);
      }
    });

    it('should coerce ISO string dates to Date objects', () => {
      const result = activityEventSchema.parse(VALID_EVENT);
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid UUID for id', () => {
      expect(() => activityEventSchema.parse({ ...VALID_EVENT, id: 'bad' })).toThrow();
    });

    it('should reject invalid actor type', () => {
      expect(() => activityEventSchema.parse({ ...VALID_EVENT, actorType: 'invalid' })).toThrow();
    });

    it('should reject missing action', () => {
      expect(() => activityEventSchema.parse({ ...VALID_EVENT, action: undefined })).toThrow();
    });

    it('should reject missing resourceType', () => {
      expect(() =>
        activityEventSchema.parse({ ...VALID_EVENT, resourceType: undefined }),
      ).toThrow();
    });

    it('should reject missing resourceId', () => {
      expect(() => activityEventSchema.parse({ ...VALID_EVENT, resourceId: undefined })).toThrow();
    });
  });
});

// ============================================================================
// activityFeedRequestSchema
// ============================================================================

describe('activityFeedRequestSchema', () => {
  describe('valid inputs', () => {
    it('should parse empty request (all optional)', () => {
      const result: ActivityFeedRequest = activityFeedRequestSchema.parse({});

      expect(result.resourceType).toBeUndefined();
      expect(result.actorId).toBeUndefined();
      expect(result.action).toBeUndefined();
      expect(result.cursor).toBeUndefined();
      expect(result.limit).toBeUndefined();
    });

    it('should parse with all fields', () => {
      const result: ActivityFeedRequest = activityFeedRequestSchema.parse({
        resourceType: 'project',
        actorId: VALID_UUID,
        action: 'created',
        cursor: 'cursor_abc',
        limit: 25,
      });

      expect(result.resourceType).toBe('project');
      expect(result.actorId).toBe(VALID_UUID);
      expect(result.action).toBe('created');
      expect(result.cursor).toBe('cursor_abc');
      expect(result.limit).toBe(25);
    });

    it('should parse limit at boundary 1', () => {
      const result = activityFeedRequestSchema.parse({ limit: 1 });
      expect(result.limit).toBe(1);
    });

    it('should parse limit at boundary 100', () => {
      const result = activityFeedRequestSchema.parse({ limit: 100 });
      expect(result.limit).toBe(100);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty string resourceType', () => {
      expect(() => activityFeedRequestSchema.parse({ resourceType: '' })).toThrow();
    });

    it('should reject limit of 0', () => {
      expect(() => activityFeedRequestSchema.parse({ limit: 0 })).toThrow();
    });

    it('should reject limit over 100', () => {
      expect(() => activityFeedRequestSchema.parse({ limit: 101 })).toThrow();
    });
  });
});

// ============================================================================
// activityFeedResponseSchema
// ============================================================================

describe('activityFeedResponseSchema', () => {
  it('should parse a valid response with activities', () => {
    const result: ActivityFeedResponse = activityFeedResponseSchema.parse({
      activities: [VALID_EVENT],
      nextCursor: 'cursor_next',
      hasMore: true,
    });

    expect(result.activities).toHaveLength(1);
    expect(result.activities[0]?.action).toBe('user.login');
    expect(result.nextCursor).toBe('cursor_next');
    expect(result.hasMore).toBe(true);
  });

  it('should parse a response with empty activities', () => {
    const result: ActivityFeedResponse = activityFeedResponseSchema.parse({
      activities: [],
      nextCursor: null,
      hasMore: false,
    });

    expect(result.activities).toEqual([]);
    expect(result.nextCursor).toBeNull();
    expect(result.hasMore).toBe(false);
  });

  it('should reject non-array activities', () => {
    expect(() =>
      activityFeedResponseSchema.parse({
        activities: 'not-array',
        nextCursor: null,
        hasMore: false,
      }),
    ).toThrow('activities must be an array');
  });
});
