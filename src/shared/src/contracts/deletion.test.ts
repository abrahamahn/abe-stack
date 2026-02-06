// shared/src/contracts/deletion.test.ts
import { describe, expect, it } from 'vitest';

import {
  calculateHardDeleteDate,
  DEFAULT_DELETION_CONFIG,
  DELETION_STATES,
  deletionRequestSchema,
  isSoftDeleted,
  isWithinGracePeriod,
} from './deletion';

import type { SoftDeletable } from './deletion';

describe('DELETION_STATES', () => {
  it('should contain all expected deletion states', () => {
    expect(DELETION_STATES).toEqual(['active', 'soft_deleted', 'pending_hard_delete', 'hard_deleted']);
  });

  it('should be a readonly array', () => {
    expect(Array.isArray(DELETION_STATES)).toBe(true);
    expect(DELETION_STATES.length).toBe(4);
  });
});

describe('DEFAULT_DELETION_CONFIG', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_DELETION_CONFIG).toEqual({
      gracePeriodDays: 30,
      maxRetries: 3,
      batchSize: 100,
    });
  });

  it('should have gracePeriodDays of 30', () => {
    expect(DEFAULT_DELETION_CONFIG.gracePeriodDays).toBe(30);
  });

  it('should have maxRetries of 3', () => {
    expect(DEFAULT_DELETION_CONFIG.maxRetries).toBe(3);
  });

  it('should have batchSize of 100', () => {
    expect(DEFAULT_DELETION_CONFIG.batchSize).toBe(100);
  });
});

describe('deletionRequestSchema', () => {
  describe('when given valid input with all fields', () => {
    it('should parse correctly', () => {
      const validRequest = {
        resourceType: 'user',
        resourceId: 'user-123',
        requestedBy: 'admin-456',
        reason: 'Account closure requested',
        immediate: true,
      };

      const result = deletionRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          resourceType: 'user',
          resourceId: 'user-123',
          requestedBy: 'admin-456',
          reason: 'Account closure requested',
          immediate: true,
        });
      }
    });
  });

  describe('when given valid input with only required fields', () => {
    it('should parse correctly without optional reason and immediate', () => {
      const validRequest = {
        resourceType: 'project',
        resourceId: 'proj-789',
        requestedBy: 'user-123',
      };

      const result = deletionRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          resourceType: 'project',
          resourceId: 'proj-789',
          requestedBy: 'user-123',
        });
        expect(result.data.reason).toBeUndefined();
        expect(result.data.immediate).toBeUndefined();
      }
    });

    it('should parse correctly with reason but without immediate', () => {
      const validRequest = {
        resourceType: 'workspace',
        resourceId: 'ws-001',
        requestedBy: 'admin-001',
        reason: 'Duplicate workspace',
      };

      const result = deletionRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBe('Duplicate workspace');
        expect(result.data.immediate).toBeUndefined();
      }
    });

    it('should parse correctly with immediate but without reason', () => {
      const validRequest = {
        resourceType: 'document',
        resourceId: 'doc-999',
        requestedBy: 'user-999',
        immediate: false,
      };

      const result = deletionRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.immediate).toBe(false);
        expect(result.data.reason).toBeUndefined();
      }
    });
  });

  describe('when given invalid input', () => {
    it('should throw for null data', () => {
      const result = deletionRequestSchema.safeParse(null);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Invalid deletion request');
      }
    });

    it('should throw for non-object data', () => {
      const invalidInputs = ['string', 123, true, undefined];

      for (const input of invalidInputs) {
        const result = deletionRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toBe('Invalid deletion request');
        }
      }
    });

    it('should throw for array input', () => {
      const result = deletionRequestSchema.safeParse([]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('resourceType required');
      }
    });

    it('should throw for missing resourceType', () => {
      const invalidRequest = {
        resourceId: 'res-123',
        requestedBy: 'user-123',
      };

      const result = deletionRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('resourceType required');
      }
    });

    it('should throw for missing resourceId', () => {
      const invalidRequest = {
        resourceType: 'user',
        requestedBy: 'user-123',
      };

      const result = deletionRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('resourceId required');
      }
    });

    it('should throw for missing requestedBy', () => {
      const invalidRequest = {
        resourceType: 'user',
        resourceId: 'user-123',
      };

      const result = deletionRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('requestedBy required');
      }
    });

    it('should throw for non-string resourceType', () => {
      const invalidRequest = {
        resourceType: 123,
        resourceId: 'res-123',
        requestedBy: 'user-123',
      };

      const result = deletionRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('resourceType required');
      }
    });

    it('should throw for non-string resourceId', () => {
      const invalidRequest = {
        resourceType: 'user',
        resourceId: null,
        requestedBy: 'user-123',
      };

      const result = deletionRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('resourceId required');
      }
    });

    it('should throw for non-string requestedBy', () => {
      const invalidRequest = {
        resourceType: 'user',
        resourceId: 'user-123',
        requestedBy: {},
      };

      const result = deletionRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('requestedBy required');
      }
    });
  });

  describe('when optional fields have wrong types', () => {
    it('should ignore non-string reason', () => {
      const request = {
        resourceType: 'user',
        resourceId: 'user-123',
        requestedBy: 'admin-456',
        reason: 123,
      };

      const result = deletionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBeUndefined();
      }
    });

    it('should ignore non-boolean immediate', () => {
      const request = {
        resourceType: 'user',
        resourceId: 'user-123',
        requestedBy: 'admin-456',
        immediate: 'yes',
      };

      const result = deletionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.immediate).toBeUndefined();
      }
    });
  });
});

describe('calculateHardDeleteDate', () => {
  describe('when using default grace period', () => {
    it('should add 30 days to soft delete date', () => {
      const softDeleteDate = new Date('2026-01-01T00:00:00Z');
      const hardDeleteDate = calculateHardDeleteDate(softDeleteDate);

      const expected = new Date('2026-01-31T00:00:00Z');
      expect(hardDeleteDate.toISOString()).toBe(expected.toISOString());
    });

    it('should handle month transitions correctly', () => {
      const softDeleteDate = new Date('2026-01-15T12:30:00Z');
      const hardDeleteDate = calculateHardDeleteDate(softDeleteDate);

      const expected = new Date('2026-02-14T12:30:00Z');
      expect(hardDeleteDate.toISOString()).toBe(expected.toISOString());
    });

    it('should preserve time of day', () => {
      const softDeleteDate = new Date('2026-06-01T15:45:30.123Z');
      const hardDeleteDate = calculateHardDeleteDate(softDeleteDate);

      expect(hardDeleteDate.getHours()).toBe(softDeleteDate.getHours());
      expect(hardDeleteDate.getMinutes()).toBe(softDeleteDate.getMinutes());
      expect(hardDeleteDate.getSeconds()).toBe(softDeleteDate.getSeconds());
    });
  });

  describe('when using custom grace period', () => {
    it('should add specified number of days', () => {
      const softDeleteDate = new Date('2026-01-01T00:00:00Z');
      const hardDeleteDate = calculateHardDeleteDate(softDeleteDate, 7);

      const expected = new Date('2026-01-08T00:00:00Z');
      expect(hardDeleteDate.toISOString()).toBe(expected.toISOString());
    });

    it('should handle 0 day grace period', () => {
      const softDeleteDate = new Date('2026-03-15T10:00:00Z');
      const hardDeleteDate = calculateHardDeleteDate(softDeleteDate, 0);

      expect(hardDeleteDate.toISOString()).toBe(softDeleteDate.toISOString());
    });

    it('should handle 90 day grace period', () => {
      const softDeleteDate = new Date('2026-01-01T00:00:00Z');
      const hardDeleteDate = calculateHardDeleteDate(softDeleteDate, 90);

      const expected = new Date('2026-04-01T00:00:00Z');
      expect(hardDeleteDate.toISOString()).toBe(expected.toISOString());
    });

    it('should handle leap year correctly', () => {
      const softDeleteDate = new Date('2024-02-15T00:00:00Z');
      const hardDeleteDate = calculateHardDeleteDate(softDeleteDate, 15);

      const expected = new Date('2024-03-01T00:00:00Z');
      expect(hardDeleteDate.toISOString()).toBe(expected.toISOString());
    });
  });

  describe('when ensuring immutability', () => {
    it('should return a new Date instance', () => {
      const softDeleteDate = new Date('2026-01-01T00:00:00Z');
      const hardDeleteDate = calculateHardDeleteDate(softDeleteDate);

      expect(hardDeleteDate).not.toBe(softDeleteDate);
    });

    it('should not mutate the input date', () => {
      const softDeleteDate = new Date('2026-01-01T00:00:00Z');
      const originalTime = softDeleteDate.getTime();

      calculateHardDeleteDate(softDeleteDate);

      expect(softDeleteDate.getTime()).toBe(originalTime);
    });
  });
});

describe('isWithinGracePeriod', () => {
  describe('when scheduledHardDeleteAt is null', () => {
    it('should return false', () => {
      expect(isWithinGracePeriod(null)).toBe(false);
    });
  });

  describe('when scheduledHardDeleteAt is in the future', () => {
    it('should return true', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      expect(isWithinGracePeriod(futureDate)).toBe(true);
    });

    it('should return true for date one day in future', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(isWithinGracePeriod(tomorrow)).toBe(true);
    });

    it('should return true for date far in future', () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 1);

      expect(isWithinGracePeriod(farFuture)).toBe(true);
    });
  });

  describe('when scheduledHardDeleteAt is in the past', () => {
    it('should return false', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      expect(isWithinGracePeriod(pastDate)).toBe(false);
    });

    it('should return false for date one day ago', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      expect(isWithinGracePeriod(yesterday)).toBe(false);
    });

    it('should return false for date far in past', () => {
      const farPast = new Date();
      farPast.setFullYear(farPast.getFullYear() - 1);

      expect(isWithinGracePeriod(farPast)).toBe(false);
    });
  });
});

describe('isSoftDeleted', () => {
  describe('when deletionState is soft_deleted', () => {
    it('should return true', () => {
      const resource: Partial<SoftDeletable> = {
        deletionState: 'soft_deleted',
        deletedAt: new Date(),
        deletedBy: 'user-123',
        scheduledHardDeleteAt: new Date(),
      };

      expect(isSoftDeleted(resource)).toBe(true);
    });
  });

  describe('when deletionState is pending_hard_delete', () => {
    it('should return true', () => {
      const resource: Partial<SoftDeletable> = {
        deletionState: 'pending_hard_delete',
        deletedAt: new Date(),
        deletedBy: 'user-123',
        scheduledHardDeleteAt: new Date(),
      };

      expect(isSoftDeleted(resource)).toBe(true);
    });
  });

  describe('when deletionState is active', () => {
    it('should return false', () => {
      const resource: Partial<SoftDeletable> = {
        deletionState: 'active',
        deletedAt: null,
        deletedBy: null,
        scheduledHardDeleteAt: null,
      };

      expect(isSoftDeleted(resource)).toBe(false);
    });
  });

  describe('when deletionState is hard_deleted', () => {
    it('should return false', () => {
      const resource: Partial<SoftDeletable> = {
        deletionState: 'hard_deleted',
        deletedAt: new Date(),
        deletedBy: 'user-123',
        scheduledHardDeleteAt: null,
      };

      expect(isSoftDeleted(resource)).toBe(false);
    });
  });

  describe('when deletionState is undefined', () => {
    it('should return false', () => {
      const resource: Partial<SoftDeletable> = {
        deletedAt: null,
        deletedBy: null,
        scheduledHardDeleteAt: null,
      };

      expect(isSoftDeleted(resource)).toBe(false);
    });
  });

  describe('when resource is empty object', () => {
    it('should return false', () => {
      const resource: Partial<SoftDeletable> = {};

      expect(isSoftDeleted(resource)).toBe(false);
    });
  });

  describe('edge cases with minimal resource data', () => {
    it('should return true with only deletionState set to soft_deleted', () => {
      const resource: Partial<SoftDeletable> = {
        deletionState: 'soft_deleted',
      };

      expect(isSoftDeleted(resource)).toBe(true);
    });

    it('should return true with only deletionState set to pending_hard_delete', () => {
      const resource: Partial<SoftDeletable> = {
        deletionState: 'pending_hard_delete',
      };

      expect(isSoftDeleted(resource)).toBe(true);
    });

    it('should return false with only deletionState set to active', () => {
      const resource: Partial<SoftDeletable> = {
        deletionState: 'active',
      };

      expect(isSoftDeleted(resource)).toBe(false);
    });
  });
});
