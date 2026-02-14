// main/shared/src/domain/tenant-settings/tenant-settings.schemas.ts

/**
 * @file Tenant Settings Domain Schemas
 * @description Schemas for tenant key-value settings validation.
 * @module Domain/TenantSettings
 */

import { coerceDate, createSchema, parseString } from '../../core/schema.utils';
import { tenantIdSchema } from '../../types/ids';

import type { Schema } from '../../core/api';
import type { TenantId } from '../../types/ids';

// ============================================================================
// Types
// ============================================================================

/**
 * Full tenant setting (matches DB SELECT result).
 * Composite primary key: (tenantId, key).
 *
 * @param tenantId - The owning tenant (CASCADE on delete)
 * @param key - Dot-notation key (e.g. "branding.primary_color")
 * @param value - Arbitrary JSONB value (can be null)
 * @param updatedAt - Last modification timestamp
 */
export interface TenantSetting {
  tenantId: TenantId;
  key: string;
  value: unknown;
  updatedAt: Date;
}

/**
 * Input for creating/upserting a tenant setting.
 */
export interface CreateTenantSetting {
  tenantId: TenantId;
  key: string;
  value?: unknown;
}

/**
 * Input for updating an existing tenant setting.
 */
export interface UpdateTenantSetting {
  value?: unknown;
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Full tenant setting schema (matches DB SELECT result).
 */
export const tenantSettingSchema: Schema<TenantSetting> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    tenantId: tenantIdSchema.parse(obj['tenantId']),
    key: parseString(obj['key'], 'key', { min: 1, max: 100 }),
    value: obj['value'],
    updatedAt: coerceDate(obj['updatedAt'], 'updatedAt'),
  };
});

/**
 * Schema for creating/upserting a tenant setting.
 */
export const createTenantSettingSchema: Schema<CreateTenantSetting> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      tenantId: tenantIdSchema.parse(obj['tenantId']),
      key: parseString(obj['key'], 'key', { min: 1, max: 100 }),
      value: obj['value'],
    };
  },
);

/**
 * Schema for updating an existing tenant setting.
 */
export const updateTenantSettingSchema: Schema<UpdateTenantSetting> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      value: obj['value'],
    };
  },
);
