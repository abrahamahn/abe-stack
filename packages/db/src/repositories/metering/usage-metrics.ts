// packages/db/src/repositories/metering/usage-metrics.ts
/**
 * Usage Metrics Repository (Functional)
 *
 * Data access layer for the usage_metrics table.
 * Manages metric definitions (e.g., "api_calls", "storage_gb") with TEXT primary key.
 *
 * @module
 */

import { eq, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type NewUsageMetric,
  type UpdateUsageMetric,
  type UsageMetric,
  USAGE_METRIC_COLUMNS,
  USAGE_METRICS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Usage Metric Repository Interface
// ============================================================================

/**
 * Functional repository for usage metric definition operations
 */
export interface UsageMetricRepository {
  /**
   * Create a new usage metric definition
   * @param data - The metric data to insert
   * @returns The created metric
   * @throws Error if insert fails
   */
  create(data: NewUsageMetric): Promise<UsageMetric>;

  /**
   * Find a metric by its key (primary key)
   * @param key - The metric key (e.g., "api_calls")
   * @returns The metric or null if not found
   */
  findByKey(key: string): Promise<UsageMetric | null>;

  /**
   * Find all metric definitions
   * @returns Array of all metrics, ordered by key
   */
  findAll(): Promise<UsageMetric[]>;

  /**
   * Update a metric definition
   * @param key - The metric key
   * @param data - The fields to update
   * @returns The updated metric or null if not found
   */
  update(key: string, data: UpdateUsageMetric): Promise<UsageMetric | null>;

  /**
   * Delete a metric definition by its key
   * @param key - The metric key to delete
   * @returns True if the metric was deleted
   */
  delete(key: string): Promise<boolean>;
}

// ============================================================================
// Usage Metric Repository Implementation
// ============================================================================

/**
 * Transform raw database row to UsageMetric type
 * @param row - Raw database row with snake_case keys
 * @returns Typed UsageMetric object
 * @complexity O(n) where n is number of columns
 */
function transformMetric(row: Record<string, unknown>): UsageMetric {
  return toCamelCase<UsageMetric>(row, USAGE_METRIC_COLUMNS);
}

/**
 * Create a usage metric repository bound to a database connection
 * @param db - The raw database client
 * @returns UsageMetricRepository implementation
 */
export function createUsageMetricRepository(db: RawDb): UsageMetricRepository {
  return {
    async create(data: NewUsageMetric): Promise<UsageMetric> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        USAGE_METRIC_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        insert(USAGE_METRICS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create usage metric');
      }
      return transformMetric(result);
    },

    async findByKey(key: string): Promise<UsageMetric | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(USAGE_METRICS_TABLE).where(eq('key', key)).toSql(),
      );
      return result !== null ? transformMetric(result) : null;
    },

    async findAll(): Promise<UsageMetric[]> {
      const results = await db.query<Record<string, unknown>>(
        select(USAGE_METRICS_TABLE).orderBy('key', 'asc').toSql(),
      );
      return results.map(transformMetric);
    },

    async update(key: string, data: UpdateUsageMetric): Promise<UsageMetric | null> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        USAGE_METRIC_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        update(USAGE_METRICS_TABLE)
          .set(snakeData)
          .where(eq('key', key))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformMetric(result) : null;
    },

    async delete(key: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(USAGE_METRICS_TABLE).where(eq('key', key)).toSql(),
      );
      return count > 0;
    },
  };
}
