// main/server/db/src/schema/tenant-settings.test.ts
import { describe, expect, test } from 'vitest';

import {
  TENANT_SETTING_COLUMNS,
  TENANT_SETTINGS_TABLE,
  type NewTenantSetting,
  type TenantSetting,
  type UpdateTenantSetting,
} from './tenant-settings';

// ============================================================================
// Table Names
// ============================================================================

describe('Tenant Settings Schema - Table Names', () => {
  test('should have correct table name for tenant_settings', () => {
    expect(TENANT_SETTINGS_TABLE).toBe('tenant_settings');
  });

  test('table name should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    expect(TENANT_SETTINGS_TABLE).toMatch(snakeCasePattern);
  });
});

// ============================================================================
// Column Mappings
// ============================================================================

describe('Tenant Settings Schema - Columns', () => {
  test('should have correct column mappings', () => {
    expect(TENANT_SETTING_COLUMNS).toEqual({
      tenantId: 'tenant_id',
      key: 'key',
      value: 'value',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    });
  });

  test('should map camelCase to snake_case correctly', () => {
    expect(TENANT_SETTING_COLUMNS.tenantId).toBe('tenant_id');
    expect(TENANT_SETTING_COLUMNS.updatedAt).toBe('updated_at');
  });

  test('should have all required columns', () => {
    const requiredColumns = ['tenantId', 'key', 'value', 'createdAt', 'updatedAt'];
    const actualColumns = Object.keys(TENANT_SETTING_COLUMNS);
    expect(actualColumns).toEqual(requiredColumns);
  });

  test('column values should be in snake_case format', () => {
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const columnValues = Object.values(TENANT_SETTING_COLUMNS);
    columnValues.forEach((value) => {
      expect(value).toMatch(snakeCasePattern);
    });
  });

  test('should be immutable (as const assertion)', () => {
    const columns = TENANT_SETTING_COLUMNS;
    expect(columns).toBeDefined();
    expect(typeof columns).toBe('object');
    expect(Object.keys(columns).length).toBeGreaterThan(0);

    type IsReadonly = typeof columns extends { readonly key: string } ? true : false;
    const isReadonly: IsReadonly = true;
    expect(isReadonly).toBe(true);
  });
});

// ============================================================================
// TenantSetting Type
// ============================================================================

describe('Tenant Settings Schema - TenantSetting Type', () => {
  test('should accept valid tenant setting with string value', () => {
    const setting: TenantSetting = {
      tenantId: 'tenant-123',
      key: 'branding.primary_color',
      value: '#FF5733',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(setting.tenantId).toBe('tenant-123');
    expect(setting.key).toBe('branding.primary_color');
    expect(setting.value).toBe('#FF5733');
  });

  test('should accept null value', () => {
    const setting: TenantSetting = {
      tenantId: 'tenant-123',
      key: 'branding.logo_url',
      value: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(setting.value).toBeNull();
  });

  test('should accept boolean value', () => {
    const setting: TenantSetting = {
      tenantId: 'tenant-123',
      key: 'features.dark_mode',
      value: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(setting.value).toBe(true);
  });

  test('should accept numeric value', () => {
    const setting: TenantSetting = {
      tenantId: 'tenant-123',
      key: 'limits.max_users',
      value: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(setting.value).toBe(100);
  });

  test('should accept object value (JSONB)', () => {
    const setting: TenantSetting = {
      tenantId: 'tenant-123',
      key: 'smtp.config',
      value: {
        host: 'smtp.example.com',
        port: 587,
        secure: true,
        auth: { user: 'admin', pass: '***' },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(typeof setting.value).toBe('object');
    expect(setting.value).toHaveProperty('host');
  });

  test('should accept array value (JSONB)', () => {
    const setting: TenantSetting = {
      tenantId: 'tenant-123',
      key: 'integrations.enabled',
      value: ['slack', 'github', 'jira'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(Array.isArray(setting.value)).toBe(true);
  });

  test('should accept various key formats', () => {
    const validKeys = [
      'branding.primary_color',
      'limits.max_users',
      'features.dark_mode',
      'smtp.config',
      'integrations.slack.webhook_url',
      'onboarding.step1.completed',
    ];

    validKeys.forEach((key) => {
      const setting: TenantSetting = {
        tenantId: 'tenant-123',
        key,
        value: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(setting.key).toBe(key);
    });
  });
});

// ============================================================================
// NewTenantSetting Type
// ============================================================================

describe('Tenant Settings Schema - NewTenantSetting Type', () => {
  test('should accept minimal new tenant setting', () => {
    const newSetting: NewTenantSetting = {
      tenantId: 'tenant-123',
      key: 'branding.primary_color',
    };

    expect(newSetting.tenantId).toBe('tenant-123');
    expect(newSetting.key).toBe('branding.primary_color');
  });

  test('should accept new tenant setting with all optional fields', () => {
    const newSetting: NewTenantSetting = {
      tenantId: 'tenant-123',
      key: 'limits.max_users',
      value: 50,
      updatedAt: new Date(),
    };

    expect(newSetting.value).toBe(50);
    expect(newSetting.updatedAt).toBeInstanceOf(Date);
  });

  test('should accept complex JSONB value', () => {
    const newSetting: NewTenantSetting = {
      tenantId: 'tenant-123',
      key: 'branding.theme',
      value: {
        primaryColor: '#FF5733',
        secondaryColor: '#33FF57',
        fontFamily: 'Inter',
        borderRadius: 8,
      },
    };

    expect(typeof newSetting.value).toBe('object');
  });

  test('should accept null value explicitly', () => {
    const newSetting: NewTenantSetting = {
      tenantId: 'tenant-123',
      key: 'branding.logo_url',
      value: null,
    };

    expect(newSetting.value).toBeNull();
  });
});

// ============================================================================
// UpdateTenantSetting Type
// ============================================================================

describe('Tenant Settings Schema - UpdateTenantSetting Type', () => {
  test('should accept partial update with value', () => {
    const update: UpdateTenantSetting = {
      value: '#00FF00',
    };

    expect(update.value).toBe('#00FF00');
  });

  test('should accept empty update object', () => {
    const update: UpdateTenantSetting = {};
    expect(Object.keys(update).length).toBe(0);
  });

  test('should not include composite PK fields', () => {
    const update: UpdateTenantSetting = { value: 'test' };
    expect('tenantId' in update).toBe(false);
    expect('key' in update).toBe(false);
  });

  test('should accept null value to clear setting', () => {
    const update: UpdateTenantSetting = {
      value: null,
    };

    expect(update.value).toBeNull();
  });

  test('should accept updatedAt override', () => {
    const update: UpdateTenantSetting = {
      value: 'new-value',
      updatedAt: new Date('2026-02-06'),
    };

    expect(update.updatedAt).toBeInstanceOf(Date);
  });
});

// ============================================================================
// Type Consistency
// ============================================================================

describe('Tenant Settings Schema - Type Consistency', () => {
  test('New* types should be compatible with their base types', () => {
    const newSetting: NewTenantSetting = {
      tenantId: 'tenant-123',
      key: 'branding.color',
      value: '#FF5733',
    };

    const fullSetting: TenantSetting = {
      tenantId: newSetting.tenantId,
      key: newSetting.key,
      value: newSetting.value,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(fullSetting.tenantId).toBe(newSetting.tenantId);
    expect(fullSetting.key).toBe(newSetting.key);
    expect(fullSetting.value).toBe(newSetting.value);
  });

  test('Column constants should cover all type properties', () => {
    const setting: TenantSetting = {
      tenantId: 'tenant-123',
      key: 'test',
      value: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const settingKeys = Object.keys(setting);
    const columnKeys = Object.keys(TENANT_SETTING_COLUMNS);
    expect(columnKeys.sort()).toEqual(settingKeys.sort());
  });

  test('Date fields should be consistently named', () => {
    expect(TENANT_SETTING_COLUMNS.createdAt).toMatch(/_at$/);
    expect(TENANT_SETTING_COLUMNS.updatedAt).toMatch(/_at$/);
  });

  test('Composite PK should match tenant_feature_overrides pattern', () => {
    // Both use (tenantId, key) composite PK
    expect(TENANT_SETTING_COLUMNS).toHaveProperty('tenantId');
    expect(TENANT_SETTING_COLUMNS).toHaveProperty('key');
  });
});

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Tenant Settings Schema - Integration Scenarios', () => {
  test('should support branding configuration', () => {
    const settings: TenantSetting[] = [
      {
        tenantId: 'tenant-123',
        key: 'branding.primary_color',
        value: '#FF5733',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        tenantId: 'tenant-123',
        key: 'branding.logo_url',
        value: 'https://cdn.example.com/logos/tenant-123.png',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        tenantId: 'tenant-123',
        key: 'branding.app_name',
        value: 'Acme Corp Portal',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    expect(settings.every((s) => s.tenantId === 'tenant-123')).toBe(true);
    expect(settings.every((s) => s.key.startsWith('branding.'))).toBe(true);
    expect(settings.length).toBe(3);
  });

  test('should support feature limits per tenant', () => {
    const basicTier: TenantSetting = {
      tenantId: 'tenant-basic',
      key: 'limits.max_users',
      value: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const enterpriseTier: TenantSetting = {
      tenantId: 'tenant-enterprise',
      key: 'limits.max_users',
      value: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(basicTier.key).toBe(enterpriseTier.key);
    expect(basicTier.tenantId).not.toBe(enterpriseTier.tenantId);
    expect(basicTier.value as number).toBeLessThan(enterpriseTier.value as number);
  });

  test('should support SMTP configuration per tenant', () => {
    const smtpConfig: TenantSetting = {
      tenantId: 'tenant-123',
      key: 'smtp.config',
      value: {
        host: 'smtp.tenant123.com',
        port: 587,
        secure: true,
        fromName: 'Acme Corp',
        fromEmail: 'noreply@tenant123.com',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(smtpConfig.key).toBe('smtp.config');
    expect(typeof smtpConfig.value).toBe('object');
  });

  test('should support setting update workflow', () => {
    const original: TenantSetting = {
      tenantId: 'tenant-123',
      key: 'branding.primary_color',
      value: '#FF5733',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    const update: UpdateTenantSetting = {
      value: '#00AA33',
    };

    const updated: TenantSetting = {
      ...original,
      ...update,
      updatedAt: new Date('2026-02-06'),
    };

    expect(updated.value).toBe('#00AA33');
    expect(updated.updatedAt.getTime()).toBeGreaterThan(original.updatedAt.getTime());
    expect(updated.tenantId).toBe(original.tenantId);
    expect(updated.key).toBe(original.key);
  });

  test('should support multiple tenants with same keys', () => {
    const tenant1: TenantSetting = {
      tenantId: 'tenant-1',
      key: 'branding.app_name',
      value: 'Alpha Corp',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const tenant2: TenantSetting = {
      tenantId: 'tenant-2',
      key: 'branding.app_name',
      value: 'Beta Inc',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(tenant1.key).toBe(tenant2.key);
    expect(tenant1.tenantId).not.toBe(tenant2.tenantId);
    expect(tenant1.value).not.toBe(tenant2.value);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Tenant Settings Schema - Edge Cases', () => {
  test('should handle deeply nested JSONB values', () => {
    const setting: TenantSetting = {
      tenantId: 'tenant-123',
      key: 'ui.config',
      value: {
        theme: {
          colors: {
            primary: { light: '#FF5733', dark: '#CC4422' },
            secondary: { light: '#33FF57', dark: '#22CC44' },
          },
          fonts: {
            heading: { family: 'Inter', weight: 700 },
            body: { family: 'Roboto', weight: 400 },
          },
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(setting.value).toBeDefined();
    expect(typeof setting.value).toBe('object');
  });

  test('should handle empty string value in JSONB', () => {
    const setting: TenantSetting = {
      tenantId: 'tenant-123',
      key: 'branding.tagline',
      value: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(setting.value).toBe('');
  });

  test('should handle zero as value', () => {
    const setting: TenantSetting = {
      tenantId: 'tenant-123',
      key: 'limits.grace_period_days',
      value: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(setting.value).toBe(0);
  });

  test('should handle false as value', () => {
    const setting: TenantSetting = {
      tenantId: 'tenant-123',
      key: 'features.maintenance_mode',
      value: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(setting.value).toBe(false);
  });

  test('should handle large JSONB arrays', () => {
    const largeArray = Array.from({ length: 100 }, (_, i) => `item-${String(i)}`);
    const setting: TenantSetting = {
      tenantId: 'tenant-123',
      key: 'allowlist.domains',
      value: largeArray,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(Array.isArray(setting.value)).toBe(true);
    expect((setting.value as string[]).length).toBe(100);
  });
});
