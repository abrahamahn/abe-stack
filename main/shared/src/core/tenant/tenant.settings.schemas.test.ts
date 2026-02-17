// main/shared/src/core/tenant/tenant-settings.schemas.test.ts

/**
 * @file Unit Tests for Tenant Settings Schemas
 * @description Tests for tenant key-value settings validation schemas.
 * @module Core/Tenant/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  createTenantSettingSchema,
  tenantSettingSchema,
  updateTenantSettingSchema,
  type CreateTenantSetting,
  type TenantSetting,
  type UpdateTenantSetting,
} from './tenant.settings.schemas';

// ============================================================================
// Test Constants
// ============================================================================

const VALID_UUID = '00000000-0000-0000-0000-000000000001';
const VALID_DATE = new Date('2026-01-15T12:00:00.000Z');
const VALID_ISO = '2026-01-15T12:00:00.000Z';

const VALID_TENANT_SETTING = {
  tenantId: VALID_UUID,
  key: 'branding.primary_color',
  value: '#3b82f6',
  updatedAt: VALID_ISO,
};

// ============================================================================
// tenantSettingSchema
// ============================================================================

describe('tenantSettingSchema', () => {
  describe('valid inputs', () => {
    it('should parse a valid tenant setting with string value', () => {
      const result: TenantSetting = tenantSettingSchema.parse(VALID_TENANT_SETTING);

      expect(result.tenantId).toBe(VALID_UUID);
      expect(result.key).toBe('branding.primary_color');
      expect(result.value).toBe('#3b82f6');
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept number value', () => {
      const result: TenantSetting = tenantSettingSchema.parse({
        ...VALID_TENANT_SETTING,
        value: 42,
      });

      expect(result.value).toBe(42);
    });

    it('should accept boolean value', () => {
      const result: TenantSetting = tenantSettingSchema.parse({
        ...VALID_TENANT_SETTING,
        value: true,
      });

      expect(result.value).toBe(true);
    });

    it('should accept object value', () => {
      const result: TenantSetting = tenantSettingSchema.parse({
        ...VALID_TENANT_SETTING,
        value: { primary: '#3b82f6', secondary: '#10b981' },
      });

      expect(result.value).toEqual({ primary: '#3b82f6', secondary: '#10b981' });
    });

    it('should accept array value', () => {
      const result: TenantSetting = tenantSettingSchema.parse({
        ...VALID_TENANT_SETTING,
        value: ['red', 'green', 'blue'],
      });

      expect(result.value).toEqual(['red', 'green', 'blue']);
    });

    it('should accept null value', () => {
      const result: TenantSetting = tenantSettingSchema.parse({
        ...VALID_TENANT_SETTING,
        value: null,
      });

      expect(result.value).toBeNull();
    });

    it('should coerce ISO string dates to Date objects', () => {
      const result: TenantSetting = tenantSettingSchema.parse(VALID_TENANT_SETTING);

      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept Date objects for date fields', () => {
      const result: TenantSetting = tenantSettingSchema.parse({
        ...VALID_TENANT_SETTING,
        updatedAt: VALID_DATE,
      });

      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept dot-notation keys', () => {
      const keys = ['branding.logo', 'features.enabled', 'limits.max_users', 'email.smtp.host'];
      keys.forEach((key) => {
        const result: TenantSetting = tenantSettingSchema.parse({
          ...VALID_TENANT_SETTING,
          key,
        });
        expect(result.key).toBe(key);
      });
    });

    it('should accept simple keys without dots', () => {
      const result: TenantSetting = tenantSettingSchema.parse({
        ...VALID_TENANT_SETTING,
        key: 'timezone',
      });

      expect(result.key).toBe('timezone');
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid UUID for tenantId', () => {
      expect(() =>
        tenantSettingSchema.parse({ ...VALID_TENANT_SETTING, tenantId: 'bad' }),
      ).toThrow();
    });

    it('should reject empty key', () => {
      expect(() => tenantSettingSchema.parse({ ...VALID_TENANT_SETTING, key: '' })).toThrow();
    });

    it('should reject key longer than 100 characters', () => {
      const longKey = 'a'.repeat(101);
      expect(() => tenantSettingSchema.parse({ ...VALID_TENANT_SETTING, key: longKey })).toThrow();
    });

    it('should reject missing tenantId', () => {
      expect(() =>
        tenantSettingSchema.parse({ key: 'test', value: 'test', updatedAt: VALID_ISO }),
      ).toThrow();
    });

    it('should reject missing key', () => {
      expect(() =>
        tenantSettingSchema.parse({ tenantId: VALID_UUID, value: 'test', updatedAt: VALID_ISO }),
      ).toThrow();
    });

    it('should reject invalid date for updatedAt', () => {
      expect(() =>
        tenantSettingSchema.parse({ ...VALID_TENANT_SETTING, updatedAt: 'not-a-date' }),
      ).toThrow();
    });

    it('should reject non-object input', () => {
      expect(() => tenantSettingSchema.parse(null)).toThrow();
      expect(() => tenantSettingSchema.parse('string')).toThrow();
      expect(() => tenantSettingSchema.parse(42)).toThrow();
    });
  });
});

// ============================================================================
// createTenantSettingSchema
// ============================================================================

describe('createTenantSettingSchema', () => {
  describe('valid inputs', () => {
    it('should parse with required fields only', () => {
      const result: CreateTenantSetting = createTenantSettingSchema.parse({
        tenantId: VALID_UUID,
        key: 'test.key',
      });

      expect(result.tenantId).toBe(VALID_UUID);
      expect(result.key).toBe('test.key');
      expect(result.value).toBeUndefined();
    });

    it('should parse with string value', () => {
      const result: CreateTenantSetting = createTenantSettingSchema.parse({
        tenantId: VALID_UUID,
        key: 'app.name',
        value: 'My App',
      });

      expect(result.value).toBe('My App');
    });

    it('should parse with number value', () => {
      const result: CreateTenantSetting = createTenantSettingSchema.parse({
        tenantId: VALID_UUID,
        key: 'limits.max',
        value: 100,
      });

      expect(result.value).toBe(100);
    });

    it('should parse with boolean value', () => {
      const result: CreateTenantSetting = createTenantSettingSchema.parse({
        tenantId: VALID_UUID,
        key: 'features.beta',
        value: true,
      });

      expect(result.value).toBe(true);
    });

    it('should parse with object value', () => {
      const result: CreateTenantSetting = createTenantSettingSchema.parse({
        tenantId: VALID_UUID,
        key: 'config',
        value: { nested: { deep: 'value' } },
      });

      expect(result.value).toEqual({ nested: { deep: 'value' } });
    });

    it('should parse with array value', () => {
      const result: CreateTenantSetting = createTenantSettingSchema.parse({
        tenantId: VALID_UUID,
        key: 'allowed.domains',
        value: ['example.com', 'test.com'],
      });

      expect(result.value).toEqual(['example.com', 'test.com']);
    });

    it('should parse with null value', () => {
      const result: CreateTenantSetting = createTenantSettingSchema.parse({
        tenantId: VALID_UUID,
        key: 'nullable.setting',
        value: null,
      });

      expect(result.value).toBeNull();
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing tenantId', () => {
      expect(() => createTenantSettingSchema.parse({ key: 'test' })).toThrow();
    });

    it('should reject missing key', () => {
      expect(() => createTenantSettingSchema.parse({ tenantId: VALID_UUID })).toThrow();
    });

    it('should reject invalid UUID for tenantId', () => {
      expect(() =>
        createTenantSettingSchema.parse({ tenantId: 'bad-uuid', key: 'test' }),
      ).toThrow();
    });

    it('should reject empty key', () => {
      expect(() => createTenantSettingSchema.parse({ tenantId: VALID_UUID, key: '' })).toThrow();
    });

    it('should reject key longer than 100 characters', () => {
      const longKey = 'a'.repeat(101);
      expect(() =>
        createTenantSettingSchema.parse({ tenantId: VALID_UUID, key: longKey }),
      ).toThrow();
    });
  });
});

// ============================================================================
// updateTenantSettingSchema
// ============================================================================

describe('updateTenantSettingSchema', () => {
  describe('valid inputs', () => {
    it('should parse empty update (no changes)', () => {
      const result: UpdateTenantSetting = updateTenantSettingSchema.parse({});

      expect(result.value).toBeUndefined();
    });

    it('should parse with string value', () => {
      const result: UpdateTenantSetting = updateTenantSettingSchema.parse({
        value: 'Updated value',
      });

      expect(result.value).toBe('Updated value');
    });

    it('should parse with number value', () => {
      const result: UpdateTenantSetting = updateTenantSettingSchema.parse({
        value: 999,
      });

      expect(result.value).toBe(999);
    });

    it('should parse with boolean value', () => {
      const result: UpdateTenantSetting = updateTenantSettingSchema.parse({
        value: false,
      });

      expect(result.value).toBe(false);
    });

    it('should parse with object value', () => {
      const result: UpdateTenantSetting = updateTenantSettingSchema.parse({
        value: { updated: true, timestamp: '2026-01-15' },
      });

      expect(result.value).toEqual({ updated: true, timestamp: '2026-01-15' });
    });

    it('should parse with array value', () => {
      const result: UpdateTenantSetting = updateTenantSettingSchema.parse({
        value: [1, 2, 3],
      });

      expect(result.value).toEqual([1, 2, 3]);
    });

    it('should parse with null value', () => {
      const result: UpdateTenantSetting = updateTenantSettingSchema.parse({
        value: null,
      });

      expect(result.value).toBeNull();
    });

    it('should parse with undefined value', () => {
      const result: UpdateTenantSetting = updateTenantSettingSchema.parse({
        value: undefined,
      });

      expect(result.value).toBeUndefined();
    });
  });

  describe('invalid inputs', () => {
    it('should coerce non-object input to empty update', () => {
      const result: UpdateTenantSetting = updateTenantSettingSchema.parse(null);
      expect(result.value).toBeUndefined();
    });

    it('should handle string input', () => {
      const result: UpdateTenantSetting = updateTenantSettingSchema.parse('string' as never);
      expect(result.value).toBeUndefined();
    });
  });
});
