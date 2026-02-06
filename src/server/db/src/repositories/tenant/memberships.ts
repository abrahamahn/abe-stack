// backend/db/src/repositories/tenant/memberships.ts
/**
 * Memberships Repository (Functional)
 *
 * Data access layer for the memberships table.
 * Manages user roles within tenant workspaces.
 *
 * @module
 */

import { and, eq, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type Membership,
  type NewMembership,
  type UpdateMembership,
  MEMBERSHIP_COLUMNS,
  MEMBERSHIPS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Membership Repository Interface
// ============================================================================

/**
 * Functional repository for membership operations
 */
export interface MembershipRepository {
  /**
   * Create a new membership
   * @param data - The membership data to insert
   * @returns The created membership
   * @throws Error if insert fails
   */
  create(data: NewMembership): Promise<Membership>;

  /**
   * Find a membership by tenant and user (unique pair)
   * @param tenantId - The tenant ID
   * @param userId - The user ID
   * @returns The membership or null if not found
   */
  findByTenantAndUser(tenantId: string, userId: string): Promise<Membership | null>;

  /**
   * Find all memberships for a tenant
   * @param tenantId - The tenant ID
   * @returns Array of memberships
   */
  findByTenantId(tenantId: string): Promise<Membership[]>;

  /**
   * Find all memberships for a user (all tenants they belong to)
   * @param userId - The user ID
   * @returns Array of memberships
   */
  findByUserId(userId: string): Promise<Membership[]>;

  /**
   * Update a membership's role
   * @param id - The membership ID to update
   * @param data - The fields to update
   * @returns The updated membership or null if not found
   */
  update(id: string, data: UpdateMembership): Promise<Membership | null>;

  /**
   * Delete a membership (remove user from tenant)
   * @param id - The membership ID to delete
   * @returns True if the membership was deleted
   */
  delete(id: string): Promise<boolean>;
}

// ============================================================================
// Membership Repository Implementation
// ============================================================================

/**
 * Transform raw database row to Membership type
 * @param row - Raw database row with snake_case keys
 * @returns Typed Membership object
 * @complexity O(n) where n is number of columns
 */
function transformMembership(row: Record<string, unknown>): Membership {
  return toCamelCase<Membership>(row, MEMBERSHIP_COLUMNS);
}

/**
 * Create a membership repository bound to a database connection
 * @param db - The raw database client
 * @returns MembershipRepository implementation
 */
export function createMembershipRepository(db: RawDb): MembershipRepository {
  return {
    async create(data: NewMembership): Promise<Membership> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, MEMBERSHIP_COLUMNS);
      const result = await db.queryOne(
        insert(MEMBERSHIPS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create membership');
      }
      return transformMembership(result);
    },

    async findByTenantAndUser(tenantId: string, userId: string): Promise<Membership | null> {
      const result = await db.queryOne(
        select(MEMBERSHIPS_TABLE)
          .where(and(eq('tenant_id', tenantId), eq('user_id', userId)))
          .toSql(),
      );
      return result !== null ? transformMembership(result) : null;
    },

    async findByTenantId(tenantId: string): Promise<Membership[]> {
      const results = await db.query(
        select(MEMBERSHIPS_TABLE)
          .where(eq('tenant_id', tenantId))
          .orderBy('created_at', 'asc')
          .toSql(),
      );
      return results.map(transformMembership);
    },

    async findByUserId(userId: string): Promise<Membership[]> {
      const results = await db.query(
        select(MEMBERSHIPS_TABLE).where(eq('user_id', userId)).orderBy('created_at', 'asc').toSql(),
      );
      return results.map(transformMembership);
    },

    async update(id: string, data: UpdateMembership): Promise<Membership | null> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, MEMBERSHIP_COLUMNS);
      const result = await db.queryOne(
        update(MEMBERSHIPS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformMembership(result) : null;
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(deleteFrom(MEMBERSHIPS_TABLE).where(eq('id', id)).toSql());
      return count > 0;
    },
  };
}
