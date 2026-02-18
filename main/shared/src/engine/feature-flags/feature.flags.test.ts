// main/shared/src/engine/feature-flags/feature.flags.test.ts

import { describe, expect, it } from 'vitest';

import {
  evaluateFlag,
  featureFlagActionResponseSchema,
  featureFlagSchema,
  featureFlagsListResponseSchema,
  tenantFeatureOverrideSchema,
} from './feature.flags';

import type {
  FeatureFlag,
  FeatureFlagActionResponse,
  FeatureFlagsListResponse,
  TenantFeatureOverride,
} from './feature.flags';

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
  const validTenantId = '12345678-1234-4abc-8abc-123456789001';

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
      const upperCaseUuid = '12345678-1234-4abc-8abc-123456789001'.toUpperCase();
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
      const mixedCaseUuid = '12345678-1234-4ABC-8ABC-123456789001';
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
      tenantId: '12345678-1234-4abc-8abc-123456789001' as TenantFeatureOverride['tenantId'],
      key: 'test-override',
      value: 'test-value',
      isEnabled: true,
    };

    expect(flag.key).toBe('test-flag');
    expect(override.tenantId).toBe('12345678-1234-4abc-8abc-123456789001');
  });
});

// ============================================================================
// evaluateFlag Tests
// ============================================================================

describe('evaluateFlag', () => {
  // ==========================================================================
  // Global Enable/Disable
  // ==========================================================================
  describe('global toggle', () => {
    it('returns false when flag is globally disabled', () => {
      const flag: FeatureFlag = {
        key: 'new-ui',
        isEnabled: false,
      };
      expect(evaluateFlag(flag)).toBe(false);
    });

    it('returns true when flag is globally enabled with no metadata', () => {
      const flag: FeatureFlag = {
        key: 'new-ui',
        isEnabled: true,
      };
      expect(evaluateFlag(flag)).toBe(true);
    });

    it('returns true when flag is enabled and metadata is undefined', () => {
      const flag: FeatureFlag = {
        key: 'feature',
        isEnabled: true,
        metadata: undefined,
      };
      expect(evaluateFlag(flag)).toBe(true);
    });
  });

  // ==========================================================================
  // Targeted Users/Tenants
  // ==========================================================================
  describe('targeted lists', () => {
    it('returns true when userId is in allowedUserIds', () => {
      const flag: FeatureFlag = {
        key: 'beta',
        isEnabled: true,
        metadata: {
          allowedUserIds: ['user-1', 'user-2'],
        },
      };
      expect(evaluateFlag(flag, { userId: 'user-1' })).toBe(true);
    });

    it('returns true when tenantId is in allowedTenantIds', () => {
      const flag: FeatureFlag = {
        key: 'beta',
        isEnabled: true,
        metadata: {
          allowedTenantIds: ['tenant-1'],
        },
      };
      expect(evaluateFlag(flag, { tenantId: 'tenant-1' })).toBe(true);
    });

    it('does not match when userId is not in allowedUserIds', () => {
      const flag: FeatureFlag = {
        key: 'beta',
        isEnabled: true,
        metadata: {
          allowedUserIds: ['user-1'],
        },
      };
      // Falls through to default (isEnabled = true)
      expect(evaluateFlag(flag, { userId: 'user-99' })).toBe(true);
    });
  });

  // ==========================================================================
  // Percentage Rollouts
  // ==========================================================================
  describe('percentage rollouts', () => {
    it('enables for users within rollout percentage', () => {
      const flag: FeatureFlag = {
        key: 'experiment',
        isEnabled: true,
        metadata: {
          rolloutPercentage: 100, // 100% rollout
        },
      };
      expect(evaluateFlag(flag, { userId: 'any-user' })).toBe(true);
    });

    it('disables for users outside rollout percentage', () => {
      const flag: FeatureFlag = {
        key: 'experiment',
        isEnabled: true,
        metadata: {
          rolloutPercentage: 0, // 0% rollout
        },
      };
      expect(evaluateFlag(flag, { userId: 'any-user' })).toBe(false);
    });

    it('uses tenantId as fallback when userId is not provided', () => {
      const flag: FeatureFlag = {
        key: 'experiment',
        isEnabled: true,
        metadata: {
          rolloutPercentage: 100,
        },
      };
      expect(evaluateFlag(flag, { tenantId: 'tenant-1' })).toBe(true);
    });

    it('uses anonymous as fallback when neither userId nor tenantId provided', () => {
      const flag: FeatureFlag = {
        key: 'experiment',
        isEnabled: true,
        metadata: {
          rolloutPercentage: 100,
        },
      };
      expect(evaluateFlag(flag, {})).toBe(true);
    });

    it('is deterministic for the same user', () => {
      const flag: FeatureFlag = {
        key: 'experiment',
        isEnabled: true,
        metadata: {
          rolloutPercentage: 50,
        },
      };

      const result1 = evaluateFlag(flag, { userId: 'consistent-user' });
      const result2 = evaluateFlag(flag, { userId: 'consistent-user' });
      expect(result1).toBe(result2);
    });
  });

  // ==========================================================================
  // Disabled Flag Overrides Everything
  // ==========================================================================
  describe('disabled flag overrides', () => {
    it('returns false even if userId is in allowedUserIds when flag is disabled', () => {
      const flag: FeatureFlag = {
        key: 'beta',
        isEnabled: false,
        metadata: {
          allowedUserIds: ['user-1'],
        },
      };
      expect(evaluateFlag(flag, { userId: 'user-1' })).toBe(false);
    });

    it('returns false even with 100% rollout when flag is disabled', () => {
      const flag: FeatureFlag = {
        key: 'experiment',
        isEnabled: false,
        metadata: {
          rolloutPercentage: 100,
        },
      };
      expect(evaluateFlag(flag, { userId: 'user-1' })).toBe(false);
    });
  });
});

// ============================================================================
// featureFlagsListResponseSchema Tests
// ============================================================================

describe('featureFlagsListResponseSchema', () => {
  const validFlag = { key: 'feature-x', isEnabled: true };

  describe('valid inputs', () => {
    it('should parse response with one feature flag', () => {
      const result: FeatureFlagsListResponse = featureFlagsListResponseSchema.parse({
        data: [validFlag],
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.key).toBe('feature-x');
      expect(result.data[0]?.isEnabled).toBe(true);
    });

    it('should parse response with empty data array', () => {
      const result: FeatureFlagsListResponse = featureFlagsListResponseSchema.parse({ data: [] });

      expect(result.data).toHaveLength(0);
    });

    it('should parse response with multiple feature flags', () => {
      const secondFlag = { key: 'feature-y', isEnabled: false, description: 'Feature Y' };
      const result: FeatureFlagsListResponse = featureFlagsListResponseSchema.parse({
        data: [validFlag, secondFlag],
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[1]?.key).toBe('feature-y');
      expect(result.data[1]?.isEnabled).toBe(false);
    });

    it('should parse response where flags have metadata', () => {
      const flagWithMeta = {
        key: 'rollout-flag',
        isEnabled: true,
        metadata: { rolloutPercentage: 50 },
      };
      const result: FeatureFlagsListResponse = featureFlagsListResponseSchema.parse({
        data: [flagWithMeta],
      });

      expect(result.data[0]?.metadata?.rolloutPercentage).toBe(50);
    });
  });

  describe('invalid inputs', () => {
    it('should throw when data is not an array', () => {
      expect(() => featureFlagsListResponseSchema.parse({ data: 'not-array' })).toThrow(
        'data must be an array',
      );
    });

    it('should throw when data is missing', () => {
      expect(() => featureFlagsListResponseSchema.parse({})).toThrow('data must be an array');
    });

    it('should throw when a flag in data has missing key', () => {
      expect(() => featureFlagsListResponseSchema.parse({ data: [{ isEnabled: true }] })).toThrow(
        'key must be a string',
      );
    });

    it('should throw when a flag has invalid isEnabled type', () => {
      expect(() =>
        featureFlagsListResponseSchema.parse({ data: [{ key: 'test', isEnabled: 'yes' }] }),
      ).toThrow('isEnabled must be a boolean');
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => featureFlagsListResponseSchema.parse(null)).toThrow('data must be an array');
    });

    it('should throw for non-object input', () => {
      expect(() => featureFlagsListResponseSchema.parse('flags')).toThrow('data must be an array');
    });
  });
});

// ============================================================================
// featureFlagActionResponseSchema Tests
// ============================================================================

describe('featureFlagActionResponseSchema', () => {
  const validFlag = { key: 'feature-x', isEnabled: true };

  describe('valid inputs', () => {
    it('should parse valid action response with flag', () => {
      const result: FeatureFlagActionResponse = featureFlagActionResponseSchema.parse({
        message: 'Feature flag updated',
        flag: validFlag,
      });

      expect(result.message).toBe('Feature flag updated');
      expect(result.flag.key).toBe('feature-x');
      expect(result.flag.isEnabled).toBe(true);
    });

    it('should parse action response with flag that has description', () => {
      const flagWithDesc = { key: 'new-ui', isEnabled: false, description: 'New UI feature' };
      const result: FeatureFlagActionResponse = featureFlagActionResponseSchema.parse({
        message: 'Created',
        flag: flagWithDesc,
      });

      expect(result.flag.description).toBe('New UI feature');
      expect(result.flag.isEnabled).toBe(false);
    });

    it('should parse action response with flag that has metadata', () => {
      const flagWithMeta = {
        key: 'beta-feature',
        isEnabled: true,
        metadata: { allowedUserIds: ['user-1'] },
      };
      const result: FeatureFlagActionResponse = featureFlagActionResponseSchema.parse({
        message: 'Flag enabled for beta users',
        flag: flagWithMeta,
      });

      expect(result.flag.metadata?.allowedUserIds).toEqual(['user-1']);
    });
  });

  describe('invalid inputs', () => {
    it('should throw when message is missing', () => {
      expect(() => featureFlagActionResponseSchema.parse({ flag: validFlag })).toThrow(
        'message must be a string',
      );
    });

    it('should throw when flag is missing', () => {
      expect(() => featureFlagActionResponseSchema.parse({ message: 'OK' })).toThrow(
        'key must be a string',
      );
    });

    it('should throw when flag has no key', () => {
      expect(() =>
        featureFlagActionResponseSchema.parse({ message: 'OK', flag: { isEnabled: true } }),
      ).toThrow('key must be a string');
    });

    it('should throw when message is null', () => {
      expect(() =>
        featureFlagActionResponseSchema.parse({ message: null, flag: validFlag }),
      ).toThrow('message must be a string');
    });

    it('should throw when flag is null', () => {
      expect(() => featureFlagActionResponseSchema.parse({ message: 'OK', flag: null })).toThrow(
        'key must be a string',
      );
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => featureFlagActionResponseSchema.parse(null)).toThrow();
    });

    it('should throw for empty object', () => {
      expect(() => featureFlagActionResponseSchema.parse({})).toThrow('message must be a string');
    });
  });
});
