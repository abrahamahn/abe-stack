// main/server/db/src/repositories/features/tenant-feature-overrides.ts
/**
 * Tenant Feature Overrides Repository (Functional)
 *
 * Data access layer for the tenant_feature_overrides table.
 * Manages per-tenant feature flag overrides with composite PK (tenant_id, key).
 *
 * @module
 */

import { and, eq, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type NewTenantFeatureOverride,
  type TenantFeatureOverride,
  type UpdateTenantFeatureOverride,
  TENANT_FEATURE_OVERRIDE_COLUMNS,
  TENANT_FEATURE_OVERRIDES_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Tenant Feature Override Repository Interface
// ============================================================================

/**
 * Functional repository for tenant feature override operations
 */
export interface TenantFeatureOverrideRepository {
  /**
   * Create a new tenant feature override
   * @param data - The override data to insert
   * @returns The created override
   * @throws Error if insert fails
   */
  create(data: NewTenantFeatureOverride): Promise<TenantFeatureOverride>;

  /**
   * Find an override by composite key (tenant + feature key)
   * @param tenantId - The tenant ID
   * @param key - The feature flag key
   * @returns The override or null if not found
   */
  findByTenantAndKey(tenantId: string, key: string): Promise<TenantFeatureOverride | null>;

  /**
   * Find all overrides for a tenant
   * @param tenantId - The tenant ID
   * @returns Array of overrides for the tenant
   */
  findByTenantId(tenantId: string): Promise<TenantFeatureOverride[]>;

  /**
   * Update an existing override
   * @param tenantId - The tenant ID
   * @param key - The feature flag key
   * @param data - The fields to update
   * @returns The updated override or null if not found
   */
  update(
    tenantId: string,
    key: string,
    data: UpdateTenantFeatureOverride,
  ): Promise<TenantFeatureOverride | null>;

  /**
   * Create or update an override (upsert on composite PK)
   * @param data - The override data to upsert
   * @returns The created or updated override
   * @throws Error if upsert fails
   */
  upsert(data: NewTenantFeatureOverride): Promise<TenantFeatureOverride>;

  /**
   * Delete an override by composite key
   * @param tenantId - The tenant ID
   * @param key - The feature flag key
   * @returns True if the override was deleted
   */
  delete(tenantId: string, key: string): Promise<boolean>;
}

// ============================================================================
// Tenant Feature Override Repository Implementation
// ============================================================================

/**
 * Transform raw database row to TenantFeatureOverride type
 * @param row - Raw database row with snake_case keys
 * @returns Typed TenantFeatureOverride object
 * @complexity O(n) where n is number of columns
 */
function transformOverride(row: Record<string, unknown>): TenantFeatureOverride {
  return toCamelCase<TenantFeatureOverride>(row, TENANT_FEATURE_OVERRIDE_COLUMNS);
}

/**
 * Create a tenant feature override repository bound to a database connection
 * @param db - The raw database client
 * @returns TenantFeatureOverrideRepository implementation
 */
export function createTenantFeatureOverrideRepository(db: RawDb): TenantFeatureOverrideRepository {
  return {
    async create(data: NewTenantFeatureOverride): Promise<TenantFeatureOverride> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        TENANT_FEATURE_OVERRIDE_COLUMNS,
      );
      const result = await db.queryOne(
        insert(TENANT_FEATURE_OVERRIDES_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create tenant feature override');
      }
      return transformOverride(result);
    },

    async findByTenantAndKey(tenantId: string, key: string): Promise<TenantFeatureOverride | null> {
      const result = await db.queryOne(
        select(TENANT_FEATURE_OVERRIDES_TABLE)
          .where(and(eq('tenant_id', tenantId), eq('key', key)))
          .toSql(),
      );
      return result !== null ? transformOverride(result) : null;
    },

    async findByTenantId(tenantId: string): Promise<TenantFeatureOverride[]> {
      const results = await db.query(
        select(TENANT_FEATURE_OVERRIDES_TABLE)
          .where(eq('tenant_id', tenantId))
          .orderBy('key', 'asc')
          .toSql(),
      );
      return results.map(transformOverride);
    },

    async update(
      tenantId: string,
      key: string,
      data: UpdateTenantFeatureOverride,
    ): Promise<TenantFeatureOverride | null> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        TENANT_FEATURE_OVERRIDE_COLUMNS,
      );
      const result = await db.queryOne(
        update(TENANT_FEATURE_OVERRIDES_TABLE)
          .set(snakeData)
          .where(and(eq('tenant_id', tenantId), eq('key', key)))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformOverride(result) : null;
    },

    async upsert(data: NewTenantFeatureOverride): Promise<TenantFeatureOverride> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        TENANT_FEATURE_OVERRIDE_COLUMNS,
      );
      const result = await db.queryOne(
        insert(TENANT_FEATURE_OVERRIDES_TABLE)
          .values(snakeData)
          .onConflictDoUpdate(['tenant_id', 'key'], ['is_enabled', 'value'])
          .returningAll()
          .toSql(),
      );
      if (result === null) {
        throw new Error('Failed to upsert tenant feature override');
      }
      return transformOverride(result);
    },

    async delete(tenantId: string, key: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(TENANT_FEATURE_OVERRIDES_TABLE)
          .where(and(eq('tenant_id', tenantId), eq('key', key)))
          .toSql(),
      );
      return count > 0;
    },
  };
}
