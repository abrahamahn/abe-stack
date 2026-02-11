// src/server/db/src/repositories/system/audit-events.ts
/**
 * Audit Events Repository (Functional)
 *
 * Data access layer for the audit_events table.
 * Append-only repository for security and compliance audit trails.
 *
 * @module
 */

import { and, deleteFrom, eq, insert, lt, select } from '../../builder/index';
import {
  type AuditEvent,
  type NewAuditEvent,
  AUDIT_EVENT_COLUMNS,
  AUDIT_EVENTS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Audit Event Repository Interface
// ============================================================================

/**
 * Functional repository for audit event operations (append-only)
 */
export interface AuditEventRepository {
  /**
   * Record a new audit event
   * @param data - The event data to insert
   * @returns The created audit event
   * @throws Error if insert fails
   */
  create(data: NewAuditEvent): Promise<AuditEvent>;

  /**
   * Find an audit event by its ID
   * @param id - The event ID
   * @returns The event or null if not found
   */
  findById(id: string): Promise<AuditEvent | null>;

  /**
   * Find recent audit events across all actors
   * @param limit - Maximum number of events (default: 100)
   * @returns Array of audit events, most recent first
   */
  findRecent(limit?: number): Promise<AuditEvent[]>;

  /**
   * Find audit events by actor (user who performed the action)
   * @param actorId - The actor's user ID
   * @param limit - Maximum number of events (default: 100)
   * @returns Array of audit events, most recent first
   */
  findByActorId(actorId: string, limit?: number): Promise<AuditEvent[]>;

  /**
   * Find audit events for a tenant
   * @param tenantId - The tenant ID
   * @param limit - Maximum number of events (default: 100)
   * @returns Array of audit events, most recent first
   */
  findByTenantId(tenantId: string, limit?: number): Promise<AuditEvent[]>;

  /**
   * Find audit events by action type
   * @param action - The action string (e.g., "user.created")
   * @param limit - Maximum number of events (default: 100)
   * @returns Array of audit events, most recent first
   */
  findByAction(action: string, limit?: number): Promise<AuditEvent[]>;

  /**
   * Find audit events for a specific resource
   * @param resource - The resource type
   * @param resourceId - The resource ID
   * @param limit - Maximum number of events (default: 100)
   * @returns Array of audit events, most recent first
   */
  findByResource(resource: string, resourceId: string, limit?: number): Promise<AuditEvent[]>;

  /**
   * Delete audit events older than the given cutoff date
   * @param cutoff - ISO date string; events with created_at < cutoff are deleted
   * @returns Number of deleted rows
   */
  deleteOlderThan(cutoff: string): Promise<number>;
}

// ============================================================================
// Audit Event Repository Implementation
// ============================================================================

/**
 * Transform raw database row to AuditEvent type
 * @param row - Raw database row with snake_case keys
 * @returns Typed AuditEvent object
 * @complexity O(n) where n is number of columns
 */
function transformAuditEvent(row: Record<string, unknown>): AuditEvent {
  return toCamelCase<AuditEvent>(row, AUDIT_EVENT_COLUMNS);
}

/**
 * Create an audit event repository bound to a database connection
 * @param db - The raw database client
 * @returns AuditEventRepository implementation
 */
export function createAuditEventRepository(db: RawDb): AuditEventRepository {
  return {
    async create(data: NewAuditEvent): Promise<AuditEvent> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        AUDIT_EVENT_COLUMNS,
      );
      const result = await db.queryOne(
        insert(AUDIT_EVENTS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create audit event');
      }
      return transformAuditEvent(result);
    },

    async findById(id: string): Promise<AuditEvent | null> {
      const result = await db.queryOne(select(AUDIT_EVENTS_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformAuditEvent(result) : null;
    },

    async findRecent(limit = 100): Promise<AuditEvent[]> {
      const results = await db.query(
        select(AUDIT_EVENTS_TABLE).orderBy('created_at', 'desc').limit(limit).toSql(),
      );
      return results.map(transformAuditEvent);
    },

    async findByActorId(actorId: string, limit = 100): Promise<AuditEvent[]> {
      const results = await db.query(
        select(AUDIT_EVENTS_TABLE)
          .where(eq('actor_id', actorId))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformAuditEvent);
    },

    async findByTenantId(tenantId: string, limit = 100): Promise<AuditEvent[]> {
      const results = await db.query(
        select(AUDIT_EVENTS_TABLE)
          .where(eq('tenant_id', tenantId))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformAuditEvent);
    },

    async findByAction(action: string, limit = 100): Promise<AuditEvent[]> {
      const results = await db.query(
        select(AUDIT_EVENTS_TABLE)
          .where(eq('action', action))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformAuditEvent);
    },

    async findByResource(resource: string, resourceId: string, limit = 100): Promise<AuditEvent[]> {
      const results = await db.query(
        select(AUDIT_EVENTS_TABLE)
          .where(and(eq('resource', resource), eq('resource_id', resourceId)))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformAuditEvent);
    },

    async deleteOlderThan(cutoff: string): Promise<number> {
      return db.execute(deleteFrom(AUDIT_EVENTS_TABLE).where(lt('created_at', cutoff)).toSql());
    },
  };
}
