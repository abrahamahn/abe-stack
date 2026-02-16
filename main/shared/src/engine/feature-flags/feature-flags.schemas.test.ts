// main/shared/src/domain/feature-flags/feature-flags.schemas.test.ts

/**
 * @file Feature Flags Schemas Test Suite
 * @description Comprehensive unit tests for feature flag and tenant override schemas.
 * @module Domain/FeatureFlags
 */

import { describe, expect, it } from 'vitest';

import { featureFlagSchema, tenantFeatureOverrideSchema } from './feature-flags.schemas';

import type { FeatureFlag, TenantFeatureOverride } from './feature-flags.schemas';

// ============================================================================
// featureFlagSchema Tests
// ============================================================================

describe('featureFlagSchema', () => {
  describe('valid inputs', () => {
    it('should parse minimal valid input with key only', () => {
      const input = { key: 'feature-x' };
      const result = featureFlagSchema.parse(input);

      expect(result).toEqual({
        key: 'feature-x',
        description: undefined,
        isEnabled: false,
        defaultValue: undefined,
        metadata: undefined,
      });
    });

    it('should default isEnabled to false when undefined', () => {
      const input = { key: 'feature-y' };
      const result = featureFlagSchema.parse(input);

      expect(result.isEnabled).toBe(false);
    });

    it('should parse all fields including description', () => {
      const input = {
        key: 'feature-z',
        description: 'Feature Z description',
        isEnabled: true,
        defaultValue: 'some-value',
      };
      const result = featureFlagSchema.parse(input);

      expect(result).toEqual({
        key: 'feature-z',
        description: 'Feature Z description',
        isEnabled: true,
        defaultValue: 'some-value',
        metadata: undefined,
      });
    });

    it('should accept defaultValue of any type', () => {
      const inputs = [
        { key: 'f1', defaultValue: 'string' },
        { key: 'f2', defaultValue: 123 },
        { key: 'f3', defaultValue: true },
        { key: 'f4', defaultValue: { nested: 'object' } },
        { key: 'f5', defaultValue: ['array', 'values'] },
        { key: 'f6', defaultValue: null },
      ];

      for (const input of inputs) {
        const result = featureFlagSchema.parse(input);
        expect(result.defaultValue).toEqual(input.defaultValue);
      }
    });

    it('should parse valid metadata with all fields', () => {
      const input = {
        key: 'feature-with-metadata',
        isEnabled: true,
        metadata: {
          allowedUserIds: ['user-1', 'user-2'],
          allowedTenantIds: ['tenant-1'],
          rolloutPercentage: 50,
        },
      };
      const result = featureFlagSchema.parse(input);

      expect(result.metadata).toEqual({
        allowedUserIds: ['user-1', 'user-2'],
        allowedTenantIds: ['tenant-1'],
        rolloutPercentage: 50,
      });
    });

    it('should accept metadata with only rolloutPercentage', () => {
      const input = {
        key: 'partial-metadata',
        metadata: {
          rolloutPercentage: 75,
        },
      };
      const result = featureFlagSchema.parse(input);

      expect(result.metadata).toEqual({
        allowedUserIds: undefined,
        allowedTenantIds: undefined,
        rolloutPercentage: 75,
      });
    });

    it('should accept empty arrays for allowedUserIds and allowedTenantIds', () => {
      const input = {
        key: 'empty-arrays',
        metadata: {
          allowedUserIds: [],
          allowedTenantIds: [],
        },
      };
      const result = featureFlagSchema.parse(input);

      expect(result.metadata).toEqual({
        allowedUserIds: [],
        allowedTenantIds: [],
        rolloutPercentage: undefined,
      });
    });

    it('should accept rolloutPercentage at boundaries (0 and 100)', () => {
      const input1 = { key: 'rollout-0', metadata: { rolloutPercentage: 0 } };
      const input2 = { key: 'rollout-100', metadata: { rolloutPercentage: 100 } };

      const result1 = featureFlagSchema.parse(input1);
      const result2 = featureFlagSchema.parse(input2);

      expect(result1.metadata?.rolloutPercentage).toBe(0);
      expect(result2.metadata?.rolloutPercentage).toBe(100);
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing key', () => {
      const input = { isEnabled: true };
      expect(() => featureFlagSchema.parse(input)).toThrow('key must be a string');
    });

    it('should reject non-string key', () => {
      const input = { key: 123 };
      expect(() => featureFlagSchema.parse(input)).toThrow('key must be a string');
    });

    it('should reject non-boolean isEnabled', () => {
      const input = { key: 'test', isEnabled: 'true' };
      expect(() => featureFlagSchema.parse(input)).toThrow('isEnabled must be a boolean');
    });

    it('should reject non-string description', () => {
      const input = { key: 'test', description: 123 };
      expect(() => featureFlagSchema.parse(input)).toThrow('description must be a string');
    });

    it('should reject null metadata', () => {
      const input = { key: 'test', metadata: null };
      expect(() => featureFlagSchema.parse(input)).toThrow('metadata must be an object');
    });

    it('should reject array metadata', () => {
      const input = { key: 'test', metadata: ['array'] };
      expect(() => featureFlagSchema.parse(input)).toThrow('metadata must be an object');
    });

    it('should reject string metadata', () => {
      const input = { key: 'test', metadata: 'string' };
      expect(() => featureFlagSchema.parse(input)).toThrow('metadata must be an object');
    });

    it('should reject rolloutPercentage greater than 100', () => {
      const input = { key: 'test', metadata: { rolloutPercentage: 101 } };
      expect(() => featureFlagSchema.parse(input)).toThrow(
        'metadata.rolloutPercentage must be at most 100',
      );
    });

    it('should reject rolloutPercentage less than 0', () => {
      const input = { key: 'test', metadata: { rolloutPercentage: -1 } };
      expect(() => featureFlagSchema.parse(input)).toThrow(
        'metadata.rolloutPercentage must be at least 0',
      );
    });

    it('should reject non-number rolloutPercentage', () => {
      const input = { key: 'test', metadata: { rolloutPercentage: '50' } };
      expect(() => featureFlagSchema.parse(input)).toThrow(
        'metadata.rolloutPercentage must be a number',
      );
    });

    it('should reject non-array allowedUserIds', () => {
      const input = { key: 'test', metadata: { allowedUserIds: 'not-array' } };
      expect(() => featureFlagSchema.parse(input)).toThrow(
        'metadata.allowedUserIds must be an array',
      );
    });

    it('should reject non-array allowedTenantIds', () => {
      const input = { key: 'test', metadata: { allowedTenantIds: { obj: 'value' } } };
      expect(() => featureFlagSchema.parse(input)).toThrow(
        'metadata.allowedTenantIds must be an array',
      );
    });

    it('should reject non-string items in allowedUserIds', () => {
      const input = { key: 'test', metadata: { allowedUserIds: ['valid', 123, 'valid2'] } };
      expect(() => featureFlagSchema.parse(input)).toThrow(
        'metadata.allowedUserIds[1] must be a string',
      );
    });

    it('should reject non-string items in allowedTenantIds', () => {
      const input = { key: 'test', metadata: { allowedTenantIds: [null] } };
      expect(() => featureFlagSchema.parse(input)).toThrow(
        'metadata.allowedTenantIds[0] must be a string',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty object metadata', () => {
      const input = { key: 'test', metadata: {} };
      const result = featureFlagSchema.parse(input);

      expect(result.metadata).toEqual({
        allowedUserIds: undefined,
        allowedTenantIds: undefined,
        rolloutPercentage: undefined,
      });
    });

    it('should handle explicit isEnabled: false', () => {
      const input = { key: 'test', isEnabled: false };
      const result = featureFlagSchema.parse(input);

      expect(result.isEnabled).toBe(false);
    });

    it('should handle explicit isEnabled: true', () => {
      const input = { key: 'test', isEnabled: true };
      const result = featureFlagSchema.parse(input);

      expect(result.isEnabled).toBe(true);
    });

    it('should handle long string arrays in metadata', () => {
      const userIds = Array.from({ length: 100 }, (_, i) => `user-${String(i)}`);
      const input = { key: 'test', metadata: { allowedUserIds: userIds } };
      const result = featureFlagSchema.parse(input);

      expect(result.metadata?.allowedUserIds).toEqual(userIds);
    });

    it('should handle non-object input (converts to empty object)', () => {
      expect(() => featureFlagSchema.parse(null)).toThrow('key must be a string');
      expect(() => featureFlagSchema.parse(undefined)).toThrow('key must be a string');
      expect(() => featureFlagSchema.parse('string')).toThrow('key must be a string');
    });
  });

  describe('safeParse', () => {
    it('should return success for valid input', () => {
      const input = { key: 'valid-key', isEnabled: true };
      const result = featureFlagSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.key).toBe('valid-key');
      }
    });

    it('should return error for invalid input', () => {
      const input = { key: 123 };
      const result = featureFlagSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('key must be a string');
      }
    });
  });
});

// ============================================================================
// tenantFeatureOverrideSchema Tests
// ============================================================================

describe('tenantFeatureOverrideSchema', () => {
  const validTenantId = '00000000-0000-0000-0000-000000000001';

  describe('valid inputs', () => {
    it('should parse valid input with all fields', () => {
      const input = {
        tenantId: validTenantId,
        key: 'feature-override',
        value: 'custom-value',
        isEnabled: true,
      };
      const result = tenantFeatureOverrideSchema.parse(input);

      expect(result).toEqual({
        tenantId: validTenantId,
        key: 'feature-override',
        value: 'custom-value',
        isEnabled: true,
      });
    });

    it('should accept value of any type', () => {
      const inputs = [
        { tenantId: validTenantId, key: 'f1', value: 'string', isEnabled: false },
        { tenantId: validTenantId, key: 'f2', value: 123, isEnabled: true },
        { tenantId: validTenantId, key: 'f3', value: true, isEnabled: false },
        { tenantId: validTenantId, key: 'f4', value: { obj: 'val' }, isEnabled: true },
        { tenantId: validTenantId, key: 'f5', value: ['arr'], isEnabled: false },
        { tenantId: validTenantId, key: 'f6', value: null, isEnabled: true },
        { tenantId: validTenantId, key: 'f7', value: undefined, isEnabled: false },
      ];

      for (const input of inputs) {
        const result = tenantFeatureOverrideSchema.parse(input);
        expect(result.value).toEqual(input.value);
      }
    });

    it('should accept isEnabled: false', () => {
      const input = {
        tenantId: validTenantId,
        key: 'test',
        value: 'val',
        isEnabled: false,
      };
      const result = tenantFeatureOverrideSchema.parse(input);

      expect(result.isEnabled).toBe(false);
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing tenantId', () => {
      const input = { key: 'test', value: 'val', isEnabled: true };
      expect(() => tenantFeatureOverrideSchema.parse(input)).toThrow('TenantId must be a string');
    });

    it('should reject invalid UUID for tenantId', () => {
      const input = {
        tenantId: 'not-a-uuid',
        key: 'test',
        value: 'val',
        isEnabled: true,
      };
      expect(() => tenantFeatureOverrideSchema.parse(input)).toThrow(
        'TenantId must be a valid UUID',
      );
    });

    it('should reject non-string tenantId', () => {
      const input = {
        tenantId: 123,
        key: 'test',
        value: 'val',
        isEnabled: true,
      };
      expect(() => tenantFeatureOverrideSchema.parse(input)).toThrow('TenantId must be a string');
    });

    it('should reject missing key', () => {
      const input = { tenantId: validTenantId, value: 'val', isEnabled: true };
      expect(() => tenantFeatureOverrideSchema.parse(input)).toThrow('key must be a string');
    });

    it('should reject non-string key', () => {
      const input = { tenantId: validTenantId, key: 456, value: 'val', isEnabled: true };
      expect(() => tenantFeatureOverrideSchema.parse(input)).toThrow('key must be a string');
    });

    it('should reject missing isEnabled', () => {
      const input = { tenantId: validTenantId, key: 'test', value: 'val' };
      expect(() => tenantFeatureOverrideSchema.parse(input)).toThrow('isEnabled must be a boolean');
    });

    it('should reject non-boolean isEnabled', () => {
      const input = {
        tenantId: validTenantId,
        key: 'test',
        value: 'val',
        isEnabled: 1,
      };
      expect(() => tenantFeatureOverrideSchema.parse(input)).toThrow('isEnabled must be a boolean');
    });

    it('should reject string "true" for isEnabled', () => {
      const input = {
        tenantId: validTenantId,
        key: 'test',
        value: 'val',
        isEnabled: 'true',
      };
      expect(() => tenantFeatureOverrideSchema.parse(input)).toThrow('isEnabled must be a boolean');
    });
  });

  describe('edge cases', () => {
    it('should handle uppercase UUID for tenantId', () => {
      const upperCaseUuid = '00000000-0000-0000-0000-000000000001'.toUpperCase();
      const input = {
        tenantId: upperCaseUuid,
        key: 'test',
        value: 'val',
        isEnabled: true,
      };
      const result = tenantFeatureOverrideSchema.parse(input);

      expect(result.tenantId).toBe(upperCaseUuid);
    });

    it('should handle mixed case UUID for tenantId', () => {
      const mixedCaseUuid = '00000000-0000-0000-0000-00000000000A';
      const input = {
        tenantId: mixedCaseUuid,
        key: 'test',
        value: 'val',
        isEnabled: false,
      };
      const result = tenantFeatureOverrideSchema.parse(input);

      expect(result.tenantId).toBe(mixedCaseUuid);
    });

    it('should preserve value: undefined', () => {
      const input = {
        tenantId: validTenantId,
        key: 'test',
        value: undefined,
        isEnabled: true,
      };
      const result = tenantFeatureOverrideSchema.parse(input);

      expect(result.value).toBeUndefined();
    });

    it('should handle non-object input (converts to empty object)', () => {
      expect(() => tenantFeatureOverrideSchema.parse(null)).toThrow('TenantId must be a string');
      expect(() => tenantFeatureOverrideSchema.parse(undefined)).toThrow(
        'TenantId must be a string',
      );
      expect(() => tenantFeatureOverrideSchema.parse('string')).toThrow(
        'TenantId must be a string',
      );
    });
  });

  describe('safeParse', () => {
    it('should return success for valid input', () => {
      const input = {
        tenantId: validTenantId,
        key: 'valid-key',
        value: 'val',
        isEnabled: true,
      };
      const result = tenantFeatureOverrideSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.key).toBe('valid-key');
      }
    });

    it('should return error for invalid input', () => {
      const input = {
        tenantId: 'invalid-uuid',
        key: 'test',
        value: 'val',
        isEnabled: true,
      };
      const result = tenantFeatureOverrideSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('TenantId must be a valid UUID');
      }
    });
  });
});

// ============================================================================
// Type Tests (Compile-time validation)
// ============================================================================

describe('type validation', () => {
  it('should export correct TypeScript types', () => {
    const flag: FeatureFlag = {
      key: 'test-flag',
      isEnabled: false,
    };

    const override: TenantFeatureOverride = {
      tenantId: '00000000-0000-0000-0000-000000000001' as TenantFeatureOverride['tenantId'],
      key: 'test-override',
      value: 'test-value',
      isEnabled: true,
    };

    expect(flag.key).toBe('test-flag');
    expect(override.tenantId).toBe('00000000-0000-0000-0000-000000000001');
  });
});
