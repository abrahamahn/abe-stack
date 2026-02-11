// src/server/db/src/repositories/tenant/invitations.ts
/**
 * Invitations Repository (Functional)
 *
 * Data access layer for the invitations table.
 * Manages email invites to join tenant workspaces.
 *
 * @module
 */

import { and, eq, lt, select, selectCount, insert, update } from '../../builder/index';
import {
  type Invitation,
  type NewInvitation,
  type UpdateInvitation,
  INVITATION_COLUMNS,
  INVITATIONS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Invitation Repository Interface
// ============================================================================

/**
 * Functional repository for invitation operations
 */
export interface InvitationRepository {
  /**
   * Create a new invitation
   * @param data - The invitation data to insert
   * @returns The created invitation
   * @throws Error if insert fails
   */
  create(data: NewInvitation): Promise<Invitation>;

  /**
   * Find an invitation by its ID
   * @param id - The invitation ID
   * @returns The invitation or null if not found
   */
  findById(id: string): Promise<Invitation | null>;

  /**
   * Find all invitations for a tenant
   * @param tenantId - The tenant ID
   * @returns Array of invitations, most recent first
   */
  findByTenantId(tenantId: string): Promise<Invitation[]>;

  /**
   * Find a pending invitation by tenant and email
   * @param tenantId - The tenant ID
   * @param email - The invitee email
   * @returns The pending invitation or null if not found
   */
  findPendingByTenantAndEmail(tenantId: string, email: string): Promise<Invitation | null>;

  /**
   * Find all pending invitations for an email address
   * @param email - The invitee email
   * @returns Array of pending invitations
   */
  findPendingByEmail(email: string): Promise<Invitation[]>;

  /**
   * Count pending invitations for a tenant
   * @param tenantId - The tenant ID
   * @returns Number of pending invitations
   */
  countPendingByTenantId(tenantId: string): Promise<number>;

  /**
   * Find pending invitations past their expiry date
   * @param limit - Max number to return
   * @returns Array of expired pending invitations
   */
  findExpiredPending(limit: number): Promise<Invitation[]>;

  /**
   * Update an invitation (e.g., accept, revoke)
   * @param id - The invitation ID to update
   * @param data - The fields to update
   * @returns The updated invitation or null if not found
   */
  update(id: string, data: UpdateInvitation): Promise<Invitation | null>;
}

// ============================================================================
// Invitation Repository Implementation
// ============================================================================

/**
 * Transform raw database row to Invitation type
 * @param row - Raw database row with snake_case keys
 * @returns Typed Invitation object
 * @complexity O(n) where n is number of columns
 */
function transformInvitation(row: Record<string, unknown>): Invitation {
  return toCamelCase<Invitation>(row, INVITATION_COLUMNS);
}

/**
 * Create an invitation repository bound to a database connection
 * @param db - The raw database client
 * @returns InvitationRepository implementation
 */
export function createInvitationRepository(db: RawDb): InvitationRepository {
  return {
    async create(data: NewInvitation): Promise<Invitation> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, INVITATION_COLUMNS);
      const result = await db.queryOne(
        insert(INVITATIONS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create invitation');
      }
      return transformInvitation(result);
    },

    async findById(id: string): Promise<Invitation | null> {
      const result = await db.queryOne(select(INVITATIONS_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformInvitation(result) : null;
    },

    async findByTenantId(tenantId: string): Promise<Invitation[]> {
      const results = await db.query(
        select(INVITATIONS_TABLE)
          .where(eq('tenant_id', tenantId))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return results.map(transformInvitation);
    },

    async findPendingByTenantAndEmail(tenantId: string, email: string): Promise<Invitation | null> {
      const result = await db.queryOne(
        select(INVITATIONS_TABLE)
          .where(and(eq('tenant_id', tenantId), eq('email', email), eq('status', 'pending')))
          .toSql(),
      );
      return result !== null ? transformInvitation(result) : null;
    },

    async countPendingByTenantId(tenantId: string): Promise<number> {
      const result = await db.queryOne(
        selectCount(INVITATIONS_TABLE)
          .where(and(eq('tenant_id', tenantId), eq('status', 'pending')))
          .toSql(),
      );
      return result !== null ? Number(result['count'] ?? 0) : 0;
    },

    async findExpiredPending(limit: number): Promise<Invitation[]> {
      const results = await db.query(
        select(INVITATIONS_TABLE)
          .where(and(eq('status', 'pending'), lt('expires_at', new Date())))
          .limit(limit)
          .orderBy('expires_at', 'asc')
          .toSql(),
      );
      return results.map(transformInvitation);
    },

    async findPendingByEmail(email: string): Promise<Invitation[]> {
      const results = await db.query(
        select(INVITATIONS_TABLE)
          .where(and(eq('email', email), eq('status', 'pending')))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return results.map(transformInvitation);
    },

    async update(id: string, data: UpdateInvitation): Promise<Invitation | null> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, INVITATION_COLUMNS);
      const result = await db.queryOne(
        update(INVITATIONS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformInvitation(result) : null;
    },
  };
}
