// main/server/db/src/schema/tenant-settings.ts
/**
 * Tenant Settings Schema Types
 *
 * Explicit TypeScript interfaces for the tenant_settings table.
 * Provides key-value configuration storage per tenant.
 * Maps to migration 0100_tenants.sql.
 *
 * @remarks Uses composite primary key: (tenant_id, key).
 * Same pattern as tenant_feature_overrides in features.ts.
 */

// ============================================================================
// Table Names
// ============================================================================

export const TENANT_SETTINGS_TABLE = 'tenant_settings';

// ============================================================================
// Tenant Setting Types
// ============================================================================

/**
 * Tenant setting record (SELECT result).
 * Composite primary key: (tenantId, key).
 *
 * @see 0100_tenants.sql — key format: `^[a-z][a-z0-9_.]+$`, max 100 chars
 */
export interface TenantSetting {
  tenantId: string;
  key: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fields for inserting a new tenant setting (INSERT / UPSERT).
 * Both tenantId and key are required (composite PK).
 *
 * @param tenantId - The owning tenant (CASCADE on delete)
 * @param key - Dot-notation key (e.g., "branding.primary_color")
 * @param value - Arbitrary JSONB value (nullable)
 */
export interface NewTenantSetting {
  tenantId: string;
  key: string;
  value?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Fields for updating an existing tenant setting (UPDATE).
 * Composite PK (tenantId, key) cannot be changed.
 */
export interface UpdateTenantSetting {
  value?: unknown;
  updatedAt?: Date;
}

// ============================================================================
// Column Name Mappings (camelCase TS → snake_case SQL)
// ============================================================================

/**
 * Column mappings for tenant_settings table.
 * Maps camelCase TypeScript property names to snake_case SQL column names.
 */
export const TENANT_SETTING_COLUMNS = {
  tenantId: 'tenant_id',
  key: 'key',
  value: 'value',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;
