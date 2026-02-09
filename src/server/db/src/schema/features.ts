// src/server/db/src/schema/features.ts
/**
 * Feature Management Schema Types
 *
 * TypeScript interfaces for feature_flags and tenant_feature_overrides tables.
 * Maps to migration 0006_features.sql.
 */

// ============================================================================
// Table Names
// ============================================================================

export const FEATURE_FLAGS_TABLE = 'feature_flags';
export const TENANT_FEATURE_OVERRIDES_TABLE = 'tenant_feature_overrides';

// ============================================================================
// Feature Flag Types
// ============================================================================

/**
 * Feature flag record (SELECT result).
 * Uses TEXT primary key (e.g., "billing.seat_based", "ui.dark_mode").
 *
 * @see 0006_features.sql — key format: `^[a-z][a-z0-9_.]+$`, max 100 chars
 */
export interface FeatureFlag {
  key: string;
  description: string | null;
  isEnabled: boolean;
  defaultValue: unknown;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fields for inserting a new feature flag.
 */
export interface NewFeatureFlag {
  key: string;
  description?: string | null;
  isEnabled?: boolean;
  defaultValue?: unknown;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Fields for updating an existing feature flag.
 * Key is the primary key and cannot be changed.
 */
export interface UpdateFeatureFlag {
  description?: string | null;
  isEnabled?: boolean;
  defaultValue?: unknown;
  metadata?: Record<string, unknown>;
  updatedAt?: Date;
}

// ============================================================================
// Tenant Feature Override Types
// ============================================================================

/**
 * Per-tenant feature flag override (SELECT result).
 * Composite primary key: (tenant_id, key).
 *
 * @see 0006_features.sql
 */
export interface TenantFeatureOverride {
  tenantId: string;
  key: string;
  value: unknown;
  isEnabled: boolean;
}

/**
 * Fields for inserting a new tenant feature override.
 * Both tenantId and key are required (composite PK).
 */
export interface NewTenantFeatureOverride {
  tenantId: string;
  key: string;
  value?: unknown;
  isEnabled: boolean;
}

/**
 * Fields for updating an existing tenant feature override.
 * Composite PK (tenantId, key) cannot be changed.
 */
export interface UpdateTenantFeatureOverride {
  value?: unknown;
  isEnabled?: boolean;
}

// ============================================================================
// Column Name Mappings (camelCase TS → snake_case SQL)
// ============================================================================

export const FEATURE_FLAG_COLUMNS = {
  key: 'key',
  description: 'description',
  isEnabled: 'is_enabled',
  defaultValue: 'default_value',
  metadata: 'metadata',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

export const TENANT_FEATURE_OVERRIDE_COLUMNS = {
  tenantId: 'tenant_id',
  key: 'key',
  value: 'value',
  isEnabled: 'is_enabled',
} as const;
