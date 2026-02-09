// src/server/db/src/repositories/tenant/tenants.ts
/**
 * Tenants Repository (Functional)
 *
 * Data access layer for the tenants table.
 * Manages workspace/organization records.
 *
 * @module
 */

import { eq, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type NewTenant,
  type Tenant,
  type UpdateTenant,
  TENANT_COLUMNS,
  TENANTS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Tenant Repository Interface
// ============================================================================

/**
 * Functional repository for tenant CRUD operations
 */
export interface TenantRepository {
  /**
   * Create a new tenant
   * @param data - The tenant data to insert
   * @returns The created tenant
   * @throws Error if insert fails
   */
  create(data: NewTenant): Promise<Tenant>;

  /**
   * Find a tenant by its ID
   * @param id - The tenant ID
   * @returns The tenant or null if not found
   */
  findById(id: string): Promise<Tenant | null>;

  /**
   * Find a tenant by its unique slug
   * @param slug - The tenant slug
   * @returns The tenant or null if not found
   */
  findBySlug(slug: string): Promise<Tenant | null>;

  /**
   * Find all tenants owned by a specific user
   * @param ownerId - The owner's user ID
   * @returns Array of tenants
   */
  findByOwnerId(ownerId: string): Promise<Tenant[]>;

  /**
   * Update a tenant by ID
   * @param id - The tenant ID to update
   * @param data - The fields to update
   * @returns The updated tenant or null if not found
   */
  update(id: string, data: UpdateTenant): Promise<Tenant | null>;

  /**
   * Delete a tenant by ID
   * @param id - The tenant ID to delete
   * @returns True if the tenant was deleted
   */
  delete(id: string): Promise<boolean>;
}

// ============================================================================
// Tenant Repository Implementation
// ============================================================================

/**
 * Transform raw database row to Tenant type
 * @param row - Raw database row with snake_case keys
 * @returns Typed Tenant object
 * @complexity O(n) where n is number of columns
 */
function transformTenant(row: Record<string, unknown>): Tenant {
  return toCamelCase<Tenant>(row, TENANT_COLUMNS);
}

/**
 * Create a tenant repository bound to a database connection
 * @param db - The raw database client
 * @returns TenantRepository implementation
 */
export function createTenantRepository(db: RawDb): TenantRepository {
  return {
    async create(data: NewTenant): Promise<Tenant> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, TENANT_COLUMNS);
      const result = await db.queryOne(
        insert(TENANTS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create tenant');
      }
      return transformTenant(result);
    },

    async findById(id: string): Promise<Tenant | null> {
      const result = await db.queryOne(select(TENANTS_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformTenant(result) : null;
    },

    async findBySlug(slug: string): Promise<Tenant | null> {
      const result = await db.queryOne(select(TENANTS_TABLE).where(eq('slug', slug)).toSql());
      return result !== null ? transformTenant(result) : null;
    },

    async findByOwnerId(ownerId: string): Promise<Tenant[]> {
      const results = await db.query(
        select(TENANTS_TABLE).where(eq('owner_id', ownerId)).orderBy('created_at', 'desc').toSql(),
      );
      return results.map(transformTenant);
    },

    async update(id: string, data: UpdateTenant): Promise<Tenant | null> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, TENANT_COLUMNS);
      const result = await db.queryOne(
        update(TENANTS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformTenant(result) : null;
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(deleteFrom(TENANTS_TABLE).where(eq('id', id)).toSql());
      return count > 0;
    },
  };
}
