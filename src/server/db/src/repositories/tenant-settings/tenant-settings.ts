// src/server/db/src/repositories/tenant-settings/tenant-settings.ts
/**
 * Tenant Settings Repository (Functional)
 *
 * Data access layer for the tenant_settings table.
 * Provides key-value configuration storage per tenant with upsert support.
 *
 * @module
 */

import { and, eq, insert, select, update, deleteFrom } from '../../builder/index';
import {
  type TenantSetting,
  type NewTenantSetting,
  type UpdateTenantSetting,
  TENANT_SETTING_COLUMNS,
  TENANT_SETTINGS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Tenant Settings Repository Interface
// ============================================================================

/**
 * Functional repository for tenant setting operations.
 */
export interface TenantSettingRepository {
  /**
   * Find a single setting by tenant ID and key.
   *
   * @param tenantId - The tenant UUID
   * @param key - Setting key (e.g., "branding.primary_color")
   * @returns Setting or null if not found
   * @complexity O(1)
   */
  findByTenantIdAndKey(tenantId: string, key: string): Promise<TenantSetting | null>;

  /**
   * Find all settings for a tenant.
   *
   * @param tenantId - The tenant UUID
   * @returns Array of settings, sorted by key
   * @complexity O(n) where n is number of settings
   */
  findByTenantId(tenantId: string): Promise<TenantSetting[]>;

  /**
   * Insert or update a tenant setting (upsert).
   * If the (tenantId, key) pair already exists, updates the value.
   *
   * @param data - Setting data with tenantId, key, and value
   * @returns Upserted setting
   * @throws Error if upsert fails
   * @complexity O(1)
   */
  upsert(data: NewTenantSetting): Promise<TenantSetting>;

  /**
   * Update an existing tenant setting value.
   *
   * @param tenantId - The tenant UUID
   * @param key - Setting key
   * @param data - Fields to update
   * @returns Updated setting or null if not found
   * @complexity O(1)
   */
  update(tenantId: string, key: string, data: UpdateTenantSetting): Promise<TenantSetting | null>;

  /**
   * Delete a single setting by tenant ID and key.
   *
   * @param tenantId - The tenant UUID
   * @param key - Setting key
   * @returns True if a setting was deleted
   * @complexity O(1)
   */
  delete(tenantId: string, key: string): Promise<boolean>;

  /**
   * Delete all settings for a tenant.
   *
   * @param tenantId - The tenant UUID
   * @returns Number of settings deleted
   * @complexity O(n) where n is number of settings
   */
  deleteByTenantId(tenantId: string): Promise<number>;
}

// ============================================================================
// Tenant Settings Repository Implementation
// ============================================================================

/**
 * Transform raw database row to TenantSetting type.
 *
 * @param row - Raw database row with snake_case keys
 * @returns Typed TenantSetting object
 * @complexity O(n) where n is number of columns
 */
function transformSetting(row: Record<string, unknown>): TenantSetting {
  return toCamelCase<TenantSetting>(row, TENANT_SETTING_COLUMNS);
}

/**
 * Create a tenant setting repository bound to a database connection.
 *
 * @param db - The raw database client
 * @returns TenantSettingRepository implementation
 */
export function createTenantSettingRepository(db: RawDb): TenantSettingRepository {
  return {
    async findByTenantIdAndKey(tenantId: string, key: string): Promise<TenantSetting | null> {
      const result = await db.queryOne(
        select(TENANT_SETTINGS_TABLE)
          .where(and(eq('tenant_id', tenantId), eq('key', key)))
          .toSql(),
      );
      return result !== null ? transformSetting(result) : null;
    },

    async findByTenantId(tenantId: string): Promise<TenantSetting[]> {
      const results = await db.query(
        select(TENANT_SETTINGS_TABLE)
          .where(eq('tenant_id', tenantId))
          .orderBy('key', 'asc')
          .toSql(),
      );
      return results.map(transformSetting);
    },

    async upsert(data: NewTenantSetting): Promise<TenantSetting> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        TENANT_SETTING_COLUMNS,
      );
      const result = await db.queryOne(
        insert(TENANT_SETTINGS_TABLE)
          .values(snakeData)
          .onConflictDoUpdate(['tenant_id', 'key'], ['value'])
          .returningAll()
          .toSql(),
      );
      if (result === null) {
        throw new Error('Failed to upsert tenant setting');
      }
      return transformSetting(result);
    },

    async update(
      tenantId: string,
      key: string,
      data: UpdateTenantSetting,
    ): Promise<TenantSetting | null> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        TENANT_SETTING_COLUMNS,
      );
      const result = await db.queryOne(
        update(TENANT_SETTINGS_TABLE)
          .set(snakeData)
          .where(and(eq('tenant_id', tenantId), eq('key', key)))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformSetting(result) : null;
    },

    async delete(tenantId: string, key: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(TENANT_SETTINGS_TABLE)
          .where(and(eq('tenant_id', tenantId), eq('key', key)))
          .toSql(),
      );
      return count > 0;
    },

    async deleteByTenantId(tenantId: string): Promise<number> {
      return db.execute(deleteFrom(TENANT_SETTINGS_TABLE).where(eq('tenant_id', tenantId)).toSql());
    },
  };
}
