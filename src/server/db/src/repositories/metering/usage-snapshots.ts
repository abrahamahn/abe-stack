// backend/db/src/repositories/metering/usage-snapshots.ts
/**
 * Usage Snapshots Repository (Functional)
 *
 * Data access layer for the usage_snapshots table.
 * Manages per-tenant per-period usage data with
 * UNIQUE(tenant_id, metric_key, period_start).
 *
 * @module
 */

import { and, eq, select, insert, update } from '../../builder/index';
import {
  type NewUsageSnapshot,
  type UpdateUsageSnapshot,
  type UsageSnapshot,
  USAGE_SNAPSHOT_COLUMNS,
  USAGE_SNAPSHOTS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Usage Snapshot Repository Interface
// ============================================================================

/**
 * Functional repository for usage snapshot operations
 */
export interface UsageSnapshotRepository {
  /**
   * Create a new usage snapshot
   * @param data - The snapshot data to insert
   * @returns The created snapshot
   * @throws Error if insert fails
   */
  create(data: NewUsageSnapshot): Promise<UsageSnapshot>;

  /**
   * Find a snapshot by its ID
   * @param id - The snapshot ID
   * @returns The snapshot or null if not found
   */
  findById(id: string): Promise<UsageSnapshot | null>;

  /**
   * Find all snapshots for a tenant
   * @param tenantId - The tenant ID
   * @param limit - Maximum results (default: 100)
   * @returns Array of snapshots, most recent period first
   */
  findByTenantId(tenantId: string, limit?: number): Promise<UsageSnapshot[]>;

  /**
   * Find snapshots for a tenant and specific metric
   * @param tenantId - The tenant ID
   * @param metricKey - The metric key
   * @param limit - Maximum results (default: 100)
   * @returns Array of snapshots, most recent period first
   */
  findByTenantAndMetric(
    tenantId: string,
    metricKey: string,
    limit?: number,
  ): Promise<UsageSnapshot[]>;

  /**
   * Update a snapshot's value
   * @param id - The snapshot ID
   * @param data - The fields to update
   * @returns The updated snapshot or null if not found
   */
  update(id: string, data: UpdateUsageSnapshot): Promise<UsageSnapshot | null>;

  /**
   * Create or update a snapshot (upsert on unique constraint)
   * @param data - The snapshot data to upsert
   * @returns The created or updated snapshot
   * @throws Error if upsert fails
   */
  upsert(data: NewUsageSnapshot): Promise<UsageSnapshot>;
}

// ============================================================================
// Usage Snapshot Repository Implementation
// ============================================================================

/**
 * Transform raw database row to UsageSnapshot type
 * @param row - Raw database row with snake_case keys
 * @returns Typed UsageSnapshot object
 * @complexity O(n) where n is number of columns
 */
function transformSnapshot(row: Record<string, unknown>): UsageSnapshot {
  return toCamelCase<UsageSnapshot>(row, USAGE_SNAPSHOT_COLUMNS);
}

/**
 * Create a usage snapshot repository bound to a database connection
 * @param db - The raw database client
 * @returns UsageSnapshotRepository implementation
 */
export function createUsageSnapshotRepository(db: RawDb): UsageSnapshotRepository {
  return {
    async create(data: NewUsageSnapshot): Promise<UsageSnapshot> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        USAGE_SNAPSHOT_COLUMNS,
      );
      const result = await db.queryOne(
        insert(USAGE_SNAPSHOTS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create usage snapshot');
      }
      return transformSnapshot(result);
    },

    async findById(id: string): Promise<UsageSnapshot | null> {
      const result = await db.queryOne(select(USAGE_SNAPSHOTS_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformSnapshot(result) : null;
    },

    async findByTenantId(tenantId: string, limit = 100): Promise<UsageSnapshot[]> {
      const results = await db.query(
        select(USAGE_SNAPSHOTS_TABLE)
          .where(eq('tenant_id', tenantId))
          .orderBy('period_start', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformSnapshot);
    },

    async findByTenantAndMetric(
      tenantId: string,
      metricKey: string,
      limit = 100,
    ): Promise<UsageSnapshot[]> {
      const results = await db.query(
        select(USAGE_SNAPSHOTS_TABLE)
          .where(and(eq('tenant_id', tenantId), eq('metric_key', metricKey)))
          .orderBy('period_start', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformSnapshot);
    },

    async update(id: string, data: UpdateUsageSnapshot): Promise<UsageSnapshot | null> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        USAGE_SNAPSHOT_COLUMNS,
      );
      const result = await db.queryOne(
        update(USAGE_SNAPSHOTS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformSnapshot(result) : null;
    },

    async upsert(data: NewUsageSnapshot): Promise<UsageSnapshot> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        USAGE_SNAPSHOT_COLUMNS,
      );
      const result = await db.queryOne(
        insert(USAGE_SNAPSHOTS_TABLE)
          .values(snakeData)
          .onConflictDoUpdate(['tenant_id', 'metric_key', 'period_start'], ['value', 'updated_at'])
          .returningAll()
          .toSql(),
      );
      if (result === null) {
        throw new Error('Failed to upsert usage snapshot');
      }
      return transformSnapshot(result);
    },
  };
}
