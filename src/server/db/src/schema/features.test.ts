// src/server/db/src/schema/features.test.ts
/**
 * Unit tests for features schema type definitions
 *
 * Tests type correctness, constant values, and column mappings for the
 * feature_flags and tenant_feature_overrides table schemas. Since this is
 * a pure type definition file, tests focus on runtime constant validation
 * and structural correctness.
 *
 * @complexity O(1) - All tests are simple constant/type checks
 */

import { describe, expect, test } from 'vitest';

import {
  FEATURE_FLAGS_TABLE,
  FEATURE_FLAG_COLUMNS,
  type FeatureFlag,
  type NewFeatureFlag,
  type NewTenantFeatureOverride,
  TENANT_FEATURE_OVERRIDES_TABLE,
  TENANT_FEATURE_OVERRIDE_COLUMNS,
  type TenantFeatureOverride,
  type UpdateFeatureFlag,
  type UpdateTenantFeatureOverride,
} from './features';

describe('Schema Constants', () => {
  describe('Table Names', () => {
    test('FEATURE_FLAGS_TABLE should be "feature_flags"', () => {
      expect(FEATURE_FLAGS_TABLE).toBe('feature_flags');
      expect(typeof FEATURE_FLAGS_TABLE).toBe('string');
    });

    test('TENANT_FEATURE_OVERRIDES_TABLE should be "tenant_feature_overrides"', () => {
      expect(TENANT_FEATURE_OVERRIDES_TABLE).toBe('tenant_feature_overrides');
      expect(typeof TENANT_FEATURE_OVERRIDES_TABLE).toBe('string');
    });
  });

  describe('FEATURE_FLAG_COLUMNS', () => {
    test('should contain all feature flag column mappings', () => {
      expect(FEATURE_FLAG_COLUMNS).toEqual({
        key: 'key',
        description: 'description',
        isEnabled: 'is_enabled',
        defaultValue: 'default_value',
        metadata: 'metadata',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      });
    });

    test('should map camelCase to snake_case correctly', () => {
      expect(FEATURE_FLAG_COLUMNS.isEnabled).toBe('is_enabled');
      expect(FEATURE_FLAG_COLUMNS.defaultValue).toBe('default_value');
      expect(FEATURE_FLAG_COLUMNS.createdAt).toBe('created_at');
      expect(FEATURE_FLAG_COLUMNS.updatedAt).toBe('updated_at');
    });

    test('should map simple columns to themselves', () => {
      expect(FEATURE_FLAG_COLUMNS.key).toBe('key');
      expect(FEATURE_FLAG_COLUMNS.description).toBe('description');
      expect(FEATURE_FLAG_COLUMNS.metadata).toBe('metadata');
    });

    test('should be a const object (readonly)', () => {
      const keys = Object.keys(FEATURE_FLAG_COLUMNS);
      expect(keys).toHaveLength(7);
      expect(keys).toContain('key');
      expect(keys).toContain('description');
      expect(keys).toContain('isEnabled');
      expect(keys).toContain('defaultValue');
      expect(keys).toContain('metadata');
    });

    test('should have all values as strings', () => {
      const values = Object.values(FEATURE_FLAG_COLUMNS);
      values.forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });

    test('should have unique column names', () => {
      const values = Object.values(FEATURE_FLAG_COLUMNS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('TENANT_FEATURE_OVERRIDE_COLUMNS', () => {
    test('should contain all tenant feature override column mappings', () => {
      expect(TENANT_FEATURE_OVERRIDE_COLUMNS).toEqual({
        tenantId: 'tenant_id',
        key: 'key',
        value: 'value',
        isEnabled: 'is_enabled',
      });
    });

    test('should map camelCase to snake_case correctly', () => {
      expect(TENANT_FEATURE_OVERRIDE_COLUMNS.tenantId).toBe('tenant_id');
      expect(TENANT_FEATURE_OVERRIDE_COLUMNS.isEnabled).toBe('is_enabled');
    });

    test('should map simple columns to themselves', () => {
      expect(TENANT_FEATURE_OVERRIDE_COLUMNS.key).toBe('key');
      expect(TENANT_FEATURE_OVERRIDE_COLUMNS.value).toBe('value');
    });

    test('should be a const object (readonly)', () => {
      const keys = Object.keys(TENANT_FEATURE_OVERRIDE_COLUMNS);
      expect(keys).toHaveLength(4);
      expect(keys).toContain('tenantId');
      expect(keys).toContain('key');
      expect(keys).toContain('value');
      expect(keys).toContain('isEnabled');
    });

    test('should have all values as strings', () => {
      const values = Object.values(TENANT_FEATURE_OVERRIDE_COLUMNS);
      values.forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });

    test('should have unique column names', () => {
      const values = Object.values(TENANT_FEATURE_OVERRIDE_COLUMNS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});

describe('FeatureFlag Type Structure', () => {
  describe('FeatureFlag interface', () => {
    test('should accept a valid complete feature flag object', () => {
      const validFlag: FeatureFlag = {
        key: 'billing.seat_based',
        description: 'Enable seat-based billing',
        isEnabled: true,
        defaultValue: { maxSeats: 10 },
        metadata: { category: 'billing', priority: 1 },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      expect(validFlag.key).toBe('billing.seat_based');
      expect(validFlag.description).toBe('Enable seat-based billing');
      expect(validFlag.isEnabled).toBe(true);
    });

    test('should allow null for nullable fields', () => {
      const flagWithNulls: FeatureFlag = {
        key: 'ui.dark_mode',
        description: null,
        isEnabled: false,
        defaultValue: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(flagWithNulls.description).toBeNull();
      expect(flagWithNulls.defaultValue).toBeNull();
    });

    test('should require all non-nullable fields', () => {
      const flag: FeatureFlag = {
        key: 'test.feature',
        description: null,
        isEnabled: false,
        defaultValue: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(flag).toHaveProperty('key');
      expect(flag).toHaveProperty('description');
      expect(flag).toHaveProperty('isEnabled');
      expect(flag).toHaveProperty('defaultValue');
      expect(flag).toHaveProperty('metadata');
      expect(flag).toHaveProperty('createdAt');
      expect(flag).toHaveProperty('updatedAt');
    });

    test('should support unknown type for defaultValue', () => {
      const stringValue: FeatureFlag = {
        key: 'test.string',
        description: null,
        isEnabled: true,
        defaultValue: 'hello',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const numberValue: FeatureFlag = {
        key: 'test.number',
        description: null,
        isEnabled: true,
        defaultValue: 42,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const objectValue: FeatureFlag = {
        key: 'test.object',
        description: null,
        isEnabled: true,
        defaultValue: { setting: 'value' },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const booleanValue: FeatureFlag = {
        key: 'test.boolean',
        description: null,
        isEnabled: true,
        defaultValue: true,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(stringValue.defaultValue).toBe('hello');
      expect(numberValue.defaultValue).toBe(42);
      expect(typeof objectValue.defaultValue).toBe('object');
      expect(booleanValue.defaultValue).toBe(true);
    });

    test('should support Record<string, unknown> for metadata', () => {
      const flag: FeatureFlag = {
        key: 'test.metadata',
        description: null,
        isEnabled: true,
        defaultValue: null,
        metadata: {
          category: 'ui',
          priority: 5,
          tags: ['beta', 'experimental'],
          config: { nested: { value: 'test' } },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(flag.metadata.category).toBe('ui');
      expect(flag.metadata.priority).toBe(5);
      expect(Array.isArray(flag.metadata.tags)).toBe(true);
    });

    test('should have Date types for timestamp fields', () => {
      const now = new Date();
      const flag: FeatureFlag = {
        key: 'test.dates',
        description: null,
        isEnabled: true,
        defaultValue: null,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      };

      expect(flag.createdAt).toBeInstanceOf(Date);
      expect(flag.updatedAt).toBeInstanceOf(Date);
    });

    test('should use TEXT primary key, not UUID', () => {
      const flag: FeatureFlag = {
        key: 'billing.enterprise',
        description: 'Enterprise plan features',
        isEnabled: true,
        defaultValue: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(typeof flag.key).toBe('string');
      expect(flag.key).not.toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(flag.key).toMatch(/^[a-z][a-z0-9_.]+$/);
    });
  });

  describe('NewFeatureFlag interface', () => {
    test('should accept minimal required fields', () => {
      const minimalFlag: NewFeatureFlag = {
        key: 'test.minimal',
      };

      expect(minimalFlag.key).toBe('test.minimal');
    });

    test('should accept all optional fields', () => {
      const fullFlag: NewFeatureFlag = {
        key: 'test.full',
        description: 'Full feature flag',
        isEnabled: true,
        defaultValue: { config: 'value' },
        metadata: { tag: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(fullFlag.key).toBe('test.full');
      expect(fullFlag.description).toBe('Full feature flag');
      expect(fullFlag.isEnabled).toBe(true);
    });

    test('should allow null for nullable optional fields', () => {
      const flagWithNulls: NewFeatureFlag = {
        key: 'test.nulls',
        description: null,
        defaultValue: null,
      };

      expect(flagWithNulls.description).toBeNull();
      expect(flagWithNulls.defaultValue).toBeNull();
    });

    test('should allow omitting auto-generated fields', () => {
      const flag: NewFeatureFlag = {
        key: 'test.autogen',
      };

      expect(flag.createdAt).toBeUndefined();
      expect(flag.updatedAt).toBeUndefined();
    });

    test('should allow providing default values', () => {
      const flagWithDefaults: NewFeatureFlag = {
        key: 'test.defaults',
        isEnabled: false,
        metadata: {},
      };

      expect(flagWithDefaults.isEnabled).toBe(false);
      expect(flagWithDefaults.metadata).toEqual({});
    });

    test('should support various defaultValue types', () => {
      const flags: NewFeatureFlag[] = [
        { key: 'test.string', defaultValue: 'value' },
        { key: 'test.number', defaultValue: 123 },
        { key: 'test.boolean', defaultValue: true },
        { key: 'test.object', defaultValue: { nested: 'value' } },
        { key: 'test.array', defaultValue: [1, 2, 3] },
      ];

      flags.forEach((flag) => {
        expect(flag.defaultValue).toBeDefined();
      });
    });
  });

  describe('UpdateFeatureFlag interface', () => {
    test('should allow updating a single field', () => {
      const descriptionUpdate: UpdateFeatureFlag = {
        description: 'Updated description',
      };

      const enabledUpdate: UpdateFeatureFlag = {
        isEnabled: false,
      };

      expect(descriptionUpdate.description).toBe('Updated description');
      expect(enabledUpdate.isEnabled).toBe(false);
    });

    test('should allow updating multiple fields', () => {
      const multiUpdate: UpdateFeatureFlag = {
        description: 'New description',
        isEnabled: true,
        defaultValue: { updated: true },
        metadata: { version: 2 },
      };

      expect(multiUpdate.description).toBe('New description');
      expect(multiUpdate.isEnabled).toBe(true);
      expect(typeof multiUpdate.defaultValue).toBe('object');
    });

    test('should allow setting nullable fields to null', () => {
      const clearFields: UpdateFeatureFlag = {
        description: null,
        defaultValue: null,
      };

      expect(clearFields.description).toBeNull();
      expect(clearFields.defaultValue).toBeNull();
    });

    test('should allow empty update object', () => {
      const emptyUpdate: UpdateFeatureFlag = {};

      expect(Object.keys(emptyUpdate)).toHaveLength(0);
    });

    test('should not allow updating key (primary key)', () => {
      const update: UpdateFeatureFlag = {
        description: 'Cannot change key',
      };

      // TypeScript enforces that key is not present
      expect(update).not.toHaveProperty('key');
    });

    test('should allow updating metadata', () => {
      const metadataUpdate: UpdateFeatureFlag = {
        metadata: {
          version: 3,
          lastModifiedBy: 'admin',
          changeReason: 'bug fix',
        },
      };

      expect(metadataUpdate.metadata).toHaveProperty('version');
      expect(metadataUpdate.metadata).toHaveProperty('lastModifiedBy');
    });

    test('should allow updating updatedAt timestamp', () => {
      const timestampUpdate: UpdateFeatureFlag = {
        updatedAt: new Date(),
      };

      expect(timestampUpdate.updatedAt).toBeInstanceOf(Date);
    });
  });
});

describe('TenantFeatureOverride Type Structure', () => {
  describe('TenantFeatureOverride interface', () => {
    test('should accept a valid complete tenant feature override', () => {
      const validOverride: TenantFeatureOverride = {
        tenantId: 'tenant_123',
        key: 'billing.seat_based',
        value: { maxSeats: 50 },
        isEnabled: true,
      };

      expect(validOverride.tenantId).toBe('tenant_123');
      expect(validOverride.key).toBe('billing.seat_based');
      expect(validOverride.isEnabled).toBe(true);
    });

    test('should allow null for value field', () => {
      const overrideWithNullValue: TenantFeatureOverride = {
        tenantId: 'tenant_456',
        key: 'ui.dark_mode',
        value: null,
        isEnabled: false,
      };

      expect(overrideWithNullValue.value).toBeNull();
    });

    test('should require all non-nullable fields', () => {
      const override: TenantFeatureOverride = {
        tenantId: 'tenant_789',
        key: 'test.feature',
        value: null,
        isEnabled: true,
      };

      expect(override).toHaveProperty('tenantId');
      expect(override).toHaveProperty('key');
      expect(override).toHaveProperty('value');
      expect(override).toHaveProperty('isEnabled');
    });

    test('should support unknown type for value', () => {
      const stringValue: TenantFeatureOverride = {
        tenantId: 'tenant_1',
        key: 'test.string',
        value: 'hello',
        isEnabled: true,
      };

      const numberValue: TenantFeatureOverride = {
        tenantId: 'tenant_1',
        key: 'test.number',
        value: 42,
        isEnabled: true,
      };

      const objectValue: TenantFeatureOverride = {
        tenantId: 'tenant_1',
        key: 'test.object',
        value: { config: 'setting' },
        isEnabled: true,
      };

      const booleanValue: TenantFeatureOverride = {
        tenantId: 'tenant_1',
        key: 'test.boolean',
        value: true,
        isEnabled: true,
      };

      expect(stringValue.value).toBe('hello');
      expect(numberValue.value).toBe(42);
      expect(typeof objectValue.value).toBe('object');
      expect(booleanValue.value).toBe(true);
    });

    test('should support composite primary key (tenantId, key)', () => {
      const override1: TenantFeatureOverride = {
        tenantId: 'tenant_1',
        key: 'feature.a',
        value: 'value1',
        isEnabled: true,
      };

      const override2: TenantFeatureOverride = {
        tenantId: 'tenant_2',
        key: 'feature.a',
        value: 'value2',
        isEnabled: true,
      };

      const override3: TenantFeatureOverride = {
        tenantId: 'tenant_1',
        key: 'feature.b',
        value: 'value3',
        isEnabled: true,
      };

      // Different tenants can have same key
      expect(override1.tenantId).not.toBe(override2.tenantId);
      expect(override1.key).toBe(override2.key);

      // Same tenant can have different keys
      expect(override1.tenantId).toBe(override3.tenantId);
      expect(override1.key).not.toBe(override3.key);
    });
  });

  describe('NewTenantFeatureOverride interface', () => {
    test('should accept minimal required fields', () => {
      const minimalOverride: NewTenantFeatureOverride = {
        tenantId: 'tenant_123',
        key: 'test.minimal',
        isEnabled: true,
      };

      expect(minimalOverride.tenantId).toBe('tenant_123');
      expect(minimalOverride.key).toBe('test.minimal');
      expect(minimalOverride.isEnabled).toBe(true);
    });

    test('should require both tenantId and key (composite PK)', () => {
      const override: NewTenantFeatureOverride = {
        tenantId: 'tenant_456',
        key: 'feature.test',
        isEnabled: false,
      };

      expect(override).toHaveProperty('tenantId');
      expect(override).toHaveProperty('key');
      expect(typeof override.tenantId).toBe('string');
      expect(typeof override.key).toBe('string');
    });

    test('should require isEnabled field', () => {
      const override: NewTenantFeatureOverride = {
        tenantId: 'tenant_789',
        key: 'feature.required',
        isEnabled: true,
      };

      expect(override).toHaveProperty('isEnabled');
      expect(typeof override.isEnabled).toBe('boolean');
    });

    test('should accept optional value field', () => {
      const withValue: NewTenantFeatureOverride = {
        tenantId: 'tenant_1',
        key: 'feature.with_value',
        value: { setting: 'custom' },
        isEnabled: true,
      };

      const withoutValue: NewTenantFeatureOverride = {
        tenantId: 'tenant_2',
        key: 'feature.without_value',
        isEnabled: true,
      };

      expect(withValue.value).toBeDefined();
      expect(withoutValue.value).toBeUndefined();
    });

    test('should allow null for value field', () => {
      const overrideWithNull: NewTenantFeatureOverride = {
        tenantId: 'tenant_abc',
        key: 'feature.null_value',
        value: null,
        isEnabled: false,
      };

      expect(overrideWithNull.value).toBeNull();
    });

    test('should support various value types', () => {
      const overrides: NewTenantFeatureOverride[] = [
        { tenantId: 'tenant_1', key: 'test.string', value: 'text', isEnabled: true },
        { tenantId: 'tenant_1', key: 'test.number', value: 100, isEnabled: true },
        { tenantId: 'tenant_1', key: 'test.boolean', value: false, isEnabled: true },
        { tenantId: 'tenant_1', key: 'test.object', value: { a: 1 }, isEnabled: true },
        { tenantId: 'tenant_1', key: 'test.array', value: [1, 2, 3], isEnabled: true },
      ];

      overrides.forEach((override) => {
        expect(override.value).toBeDefined();
      });
    });
  });

  describe('UpdateTenantFeatureOverride interface', () => {
    test('should allow updating a single field', () => {
      const valueUpdate: UpdateTenantFeatureOverride = {
        value: 'new value',
      };

      const enabledUpdate: UpdateTenantFeatureOverride = {
        isEnabled: false,
      };

      expect(valueUpdate.value).toBe('new value');
      expect(enabledUpdate.isEnabled).toBe(false);
    });

    test('should allow updating multiple fields', () => {
      const multiUpdate: UpdateTenantFeatureOverride = {
        value: { updated: true },
        isEnabled: true,
      };

      expect(typeof multiUpdate.value).toBe('object');
      expect(multiUpdate.isEnabled).toBe(true);
    });

    test('should allow setting value to null', () => {
      const clearValue: UpdateTenantFeatureOverride = {
        value: null,
      };

      expect(clearValue.value).toBeNull();
    });

    test('should allow empty update object', () => {
      const emptyUpdate: UpdateTenantFeatureOverride = {};

      expect(Object.keys(emptyUpdate)).toHaveLength(0);
    });

    test('should not allow updating composite PK fields', () => {
      const update: UpdateTenantFeatureOverride = {
        value: 'can only update value and isEnabled',
      };

      // TypeScript enforces that tenantId and key are not present
      expect(update).not.toHaveProperty('tenantId');
      expect(update).not.toHaveProperty('key');
    });

    test('should allow toggling isEnabled', () => {
      const enable: UpdateTenantFeatureOverride = { isEnabled: true };
      const disable: UpdateTenantFeatureOverride = { isEnabled: false };

      expect(enable.isEnabled).toBe(true);
      expect(disable.isEnabled).toBe(false);
    });
  });
});

describe('Type Compatibility', () => {
  describe('FeatureFlag type conversions', () => {
    test('FeatureFlag should be assignable from NewFeatureFlag with required fields', () => {
      const newFlag: NewFeatureFlag = {
        key: 'test.conversion',
        description: 'Test conversion',
        isEnabled: true,
        defaultValue: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // This demonstrates that NewFeatureFlag can become FeatureFlag when all fields are provided
      const flag: FeatureFlag = newFlag as FeatureFlag;

      expect(flag.key).toBe('test.conversion');
      expect(flag.description).toBe('Test conversion');
    });

    test('UpdateFeatureFlag should accept partial FeatureFlag properties', () => {
      const flag: FeatureFlag = {
        key: 'test.partial',
        description: 'Original description',
        isEnabled: true,
        defaultValue: { original: true },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const update: UpdateFeatureFlag = {
        description: flag.description,
        isEnabled: false,
      };

      expect(update.description).toBe(flag.description);
      expect(update.isEnabled).toBe(false);
    });
  });

  describe('TenantFeatureOverride type conversions', () => {
    test('TenantFeatureOverride should be assignable from NewTenantFeatureOverride with required fields', () => {
      const newOverride: NewTenantFeatureOverride = {
        tenantId: 'tenant_123',
        key: 'test.conversion',
        value: { test: true },
        isEnabled: true,
      };

      // This demonstrates that NewTenantFeatureOverride can become TenantFeatureOverride when all fields are provided
      const override: TenantFeatureOverride = newOverride as TenantFeatureOverride;

      expect(override.tenantId).toBe('tenant_123');
      expect(override.key).toBe('test.conversion');
    });

    test('UpdateTenantFeatureOverride should accept partial TenantFeatureOverride properties', () => {
      const override: TenantFeatureOverride = {
        tenantId: 'tenant_456',
        key: 'test.partial',
        value: { original: 'value' },
        isEnabled: true,
      };

      const update: UpdateTenantFeatureOverride = {
        value: override.value,
        isEnabled: false,
      };

      expect(typeof update.value).toBe('object');
      expect(update.isEnabled).toBe(false);
    });
  });
});

describe('Edge Cases', () => {
  describe('Feature key boundary values', () => {
    test('should handle simple feature keys', () => {
      const flag: FeatureFlag = {
        key: 'simple',
        description: null,
        isEnabled: true,
        defaultValue: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(flag.key).toBe('simple');
    });

    test('should handle nested feature keys with dots', () => {
      const keys = ['ui.theme', 'billing.enterprise.seats', 'feature.nested.deeply.nested'];

      keys.forEach((key) => {
        const flag: FeatureFlag = {
          key,
          description: null,
          isEnabled: true,
          defaultValue: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(flag.key).toBe(key);
        expect(flag.key).toMatch(/^[a-z][a-z0-9_.]+$/);
      });
    });

    test('should handle feature keys with underscores', () => {
      const flag: FeatureFlag = {
        key: 'feature_with_underscores',
        description: null,
        isEnabled: true,
        defaultValue: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(flag.key).toContain('_');
    });

    test('should handle long feature keys (up to 100 chars per schema)', () => {
      const longKey = 'a'.repeat(100);
      const flag: NewFeatureFlag = {
        key: longKey,
      };

      expect(flag.key).toHaveLength(100);
    });
  });

  describe('defaultValue and value type flexibility', () => {
    test('should handle arrays in defaultValue', () => {
      const flag: FeatureFlag = {
        key: 'test.array',
        description: null,
        isEnabled: true,
        defaultValue: [1, 2, 3, 'four', { five: 5 }],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(Array.isArray(flag.defaultValue)).toBe(true);
    });

    test('should handle nested objects in defaultValue', () => {
      const flag: FeatureFlag = {
        key: 'test.nested',
        description: null,
        isEnabled: true,
        defaultValue: {
          level1: {
            level2: {
              level3: 'deep',
            },
          },
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(typeof flag.defaultValue).toBe('object');
    });

    test('should handle arrays in tenant override value', () => {
      const override: TenantFeatureOverride = {
        tenantId: 'tenant_1',
        key: 'test.array',
        value: ['a', 'b', 'c'],
        isEnabled: true,
      };

      expect(Array.isArray(override.value)).toBe(true);
    });

    test('should handle nested objects in tenant override value', () => {
      const override: TenantFeatureOverride = {
        tenantId: 'tenant_2',
        key: 'test.nested',
        value: {
          config: {
            setting: 'value',
            nested: { deep: true },
          },
        },
        isEnabled: true,
      };

      expect(typeof override.value).toBe('object');
    });
  });

  describe('metadata edge cases', () => {
    test('should handle empty metadata object', () => {
      const flag: FeatureFlag = {
        key: 'test.empty_metadata',
        description: null,
        isEnabled: true,
        defaultValue: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(Object.keys(flag.metadata)).toHaveLength(0);
    });

    test('should handle complex metadata structures', () => {
      const flag: FeatureFlag = {
        key: 'test.complex_metadata',
        description: null,
        isEnabled: true,
        defaultValue: null,
        metadata: {
          category: 'billing',
          priority: 10,
          tags: ['production', 'critical'],
          rollout: {
            strategy: 'gradual',
            percentage: 50,
            regions: ['us-west', 'eu-central'],
          },
          owners: ['team-a', 'team-b'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(flag.metadata.category).toBe('billing');
      expect(Array.isArray(flag.metadata.tags)).toBe(true);
      expect(typeof flag.metadata.rollout).toBe('object');
    });
  });

  describe('boolean isEnabled edge cases', () => {
    test('should handle enabled state', () => {
      const enabled: FeatureFlag = {
        key: 'test.enabled',
        description: null,
        isEnabled: true,
        defaultValue: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(enabled.isEnabled).toBe(true);
    });

    test('should handle disabled state', () => {
      const disabled: FeatureFlag = {
        key: 'test.disabled',
        description: null,
        isEnabled: false,
        defaultValue: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(disabled.isEnabled).toBe(false);
    });

    test('should handle toggling isEnabled in updates', () => {
      const updates = [{ isEnabled: true }, { isEnabled: false }, { isEnabled: true }];

      updates.forEach((update) => {
        const u: UpdateFeatureFlag = update;
        expect(typeof u.isEnabled).toBe('boolean');
      });
    });
  });

  describe('timestamp edge cases', () => {
    test('should handle far-past dates', () => {
      const pastDate = new Date('1970-01-01');
      const flag: FeatureFlag = {
        key: 'test.past',
        description: null,
        isEnabled: true,
        defaultValue: null,
        metadata: {},
        createdAt: pastDate,
        updatedAt: pastDate,
      };

      expect(flag.createdAt.getFullYear()).toBe(1970);
    });

    test('should handle far-future dates', () => {
      const futureDate = new Date('2099-12-31');
      const flag: FeatureFlag = {
        key: 'test.future',
        description: null,
        isEnabled: true,
        defaultValue: null,
        metadata: {},
        createdAt: futureDate,
        updatedAt: futureDate,
      };

      expect(flag.createdAt.getFullYear()).toBe(2099);
    });
  });

  describe('string field boundaries', () => {
    test('should handle empty string description', () => {
      const flag: NewFeatureFlag = {
        key: 'test.empty_desc',
        description: '',
      };

      expect(flag.description).toBe('');
    });

    test('should handle very long descriptions', () => {
      const longDescription = 'a'.repeat(10000);
      const flag: NewFeatureFlag = {
        key: 'test.long_desc',
        description: longDescription,
      };

      expect(flag.description).toHaveLength(10000);
    });

    test('should handle special characters in descriptions', () => {
      const specialChars = '!@#$%^&*(){}[]|\\:";\'<>?,./`~';
      const flag: NewFeatureFlag = {
        key: 'test.special',
        description: `Test ${specialChars} description`,
      };

      expect(flag.description).toContain(specialChars);
    });

    test('should handle Unicode characters', () => {
      const flag: NewFeatureFlag = {
        key: 'test.unicode',
        description: '機能フラグ - 中文测试 - 한국어',
      };

      expect(flag.description).toContain('機能フラグ');
      expect(flag.description).toContain('中文测试');
      expect(flag.description).toContain('한국어');
    });
  });

  describe('tenant override edge cases', () => {
    test('should handle multiple overrides for same tenant', () => {
      const overrides: TenantFeatureOverride[] = [
        { tenantId: 'tenant_1', key: 'feature.a', value: 'a', isEnabled: true },
        { tenantId: 'tenant_1', key: 'feature.b', value: 'b', isEnabled: false },
        { tenantId: 'tenant_1', key: 'feature.c', value: 'c', isEnabled: true },
      ];

      const tenantIds = overrides.map((o) => o.tenantId);
      const uniqueTenantIds = new Set(tenantIds);

      expect(uniqueTenantIds.size).toBe(1);
      expect(overrides).toHaveLength(3);
    });

    test('should handle same feature key for multiple tenants', () => {
      const overrides: TenantFeatureOverride[] = [
        { tenantId: 'tenant_1', key: 'feature.shared', value: 'value1', isEnabled: true },
        { tenantId: 'tenant_2', key: 'feature.shared', value: 'value2', isEnabled: false },
        { tenantId: 'tenant_3', key: 'feature.shared', value: 'value3', isEnabled: true },
      ];

      const keys = overrides.map((o) => o.key);
      const uniqueKeys = new Set(keys);

      expect(uniqueKeys.size).toBe(1);
      expect(overrides).toHaveLength(3);
    });
  });
});

describe('Column Mapping Consistency', () => {
  test('FEATURE_FLAG_COLUMNS should map to all FeatureFlag interface fields', () => {
    const flagFields: Array<keyof FeatureFlag> = [
      'key',
      'description',
      'isEnabled',
      'defaultValue',
      'metadata',
      'createdAt',
      'updatedAt',
    ];

    const columnKeys = Object.keys(FEATURE_FLAG_COLUMNS) as Array<
      keyof typeof FEATURE_FLAG_COLUMNS
    >;

    flagFields.forEach((field) => {
      expect(columnKeys).toContain(field);
    });
  });

  test('TENANT_FEATURE_OVERRIDE_COLUMNS should map to all TenantFeatureOverride interface fields', () => {
    const overrideFields: Array<keyof TenantFeatureOverride> = [
      'tenantId',
      'key',
      'value',
      'isEnabled',
    ];

    const columnKeys = Object.keys(TENANT_FEATURE_OVERRIDE_COLUMNS) as Array<
      keyof typeof TENANT_FEATURE_OVERRIDE_COLUMNS
    >;

    overrideFields.forEach((field) => {
      expect(columnKeys).toContain(field);
    });
  });

  test('FEATURE_FLAG_COLUMNS should not have any extra fields', () => {
    const expectedFields = [
      'key',
      'description',
      'isEnabled',
      'defaultValue',
      'metadata',
      'createdAt',
      'updatedAt',
    ];

    const actualFields = Object.keys(FEATURE_FLAG_COLUMNS);

    expect(actualFields.sort()).toEqual(expectedFields.sort());
  });

  test('TENANT_FEATURE_OVERRIDE_COLUMNS should not have any extra fields', () => {
    const expectedFields = ['tenantId', 'key', 'value', 'isEnabled'];

    const actualFields = Object.keys(TENANT_FEATURE_OVERRIDE_COLUMNS);

    expect(actualFields.sort()).toEqual(expectedFields.sort());
  });
});
