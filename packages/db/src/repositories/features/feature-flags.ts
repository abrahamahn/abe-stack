// packages/db/src/repositories/features/feature-flags.ts
/**
 * Feature Flags Repository (Functional)
 *
 * Data access layer for the feature_flags table.
 * Manages global feature flag definitions with TEXT primary key.
 *
 * @module
 */

import { eq, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type FeatureFlag,
  type NewFeatureFlag,
  type UpdateFeatureFlag,
  FEATURE_FLAG_COLUMNS,
  FEATURE_FLAGS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Feature Flag Repository Interface
// ============================================================================

/**
 * Functional repository for feature flag operations
 */
export interface FeatureFlagRepository {
  /**
   * Create a new feature flag
   * @param data - The feature flag data to insert
   * @returns The created feature flag
   * @throws Error if insert fails
   */
  create(data: NewFeatureFlag): Promise<FeatureFlag>;

  /**
   * Find a feature flag by its key (primary key)
   * @param key - The feature flag key (e.g., "billing.seat_based")
   * @returns The feature flag or null if not found
   */
  findByKey(key: string): Promise<FeatureFlag | null>;

  /**
   * Find all feature flags
   * @returns Array of all feature flags, ordered by key
   */
  findAll(): Promise<FeatureFlag[]>;

  /**
   * Find all enabled feature flags
   * @returns Array of enabled feature flags
   */
  findEnabled(): Promise<FeatureFlag[]>;

  /**
   * Update a feature flag by its key
   * @param key - The feature flag key
   * @param data - The fields to update
   * @returns The updated feature flag or null if not found
   */
  update(key: string, data: UpdateFeatureFlag): Promise<FeatureFlag | null>;

  /**
   * Delete a feature flag by its key
   * @param key - The feature flag key to delete
   * @returns True if the flag was deleted
   */
  delete(key: string): Promise<boolean>;
}

// ============================================================================
// Feature Flag Repository Implementation
// ============================================================================

/**
 * Transform raw database row to FeatureFlag type
 * @param row - Raw database row with snake_case keys
 * @returns Typed FeatureFlag object
 * @complexity O(n) where n is number of columns
 */
function transformFeatureFlag(row: Record<string, unknown>): FeatureFlag {
  return toCamelCase<FeatureFlag>(row, FEATURE_FLAG_COLUMNS);
}

/**
 * Create a feature flag repository bound to a database connection
 * @param db - The raw database client
 * @returns FeatureFlagRepository implementation
 */
export function createFeatureFlagRepository(db: RawDb): FeatureFlagRepository {
  return {
    async create(data: NewFeatureFlag): Promise<FeatureFlag> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        FEATURE_FLAG_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        insert(FEATURE_FLAGS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create feature flag');
      }
      return transformFeatureFlag(result);
    },

    async findByKey(key: string): Promise<FeatureFlag | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(FEATURE_FLAGS_TABLE).where(eq('key', key)).toSql(),
      );
      return result !== null ? transformFeatureFlag(result) : null;
    },

    async findAll(): Promise<FeatureFlag[]> {
      const results = await db.query<Record<string, unknown>>(
        select(FEATURE_FLAGS_TABLE).orderBy('key', 'asc').toSql(),
      );
      return results.map(transformFeatureFlag);
    },

    async findEnabled(): Promise<FeatureFlag[]> {
      const results = await db.query<Record<string, unknown>>(
        select(FEATURE_FLAGS_TABLE)
          .where(eq('is_enabled', true))
          .orderBy('key', 'asc')
          .toSql(),
      );
      return results.map(transformFeatureFlag);
    },

    async update(key: string, data: UpdateFeatureFlag): Promise<FeatureFlag | null> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        FEATURE_FLAG_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        update(FEATURE_FLAGS_TABLE)
          .set(snakeData)
          .where(eq('key', key))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformFeatureFlag(result) : null;
    },

    async delete(key: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(FEATURE_FLAGS_TABLE).where(eq('key', key)).toSql(),
      );
      return count > 0;
    },
  };
}
