// src/server/db/src/repositories/types.ts
/**
 * Repository Types
 *
 * Common types used across all repositories.
 * Pagination types are re-exported from @abe-stack/shared for DRY compliance.
 */

// Re-export pagination types from shared (replaces DB-local duplicates)
export type { CursorPaginatedResult, CursorPaginationOptions } from '@abe-stack/shared';

/**
 * Time range filter
 */
export interface TimeRangeFilter {
  /** Start of range (inclusive) */
  from?: Date;
  /** End of range (inclusive) */
  to?: Date;
}

/**
 * Base repository interface
 */
export interface Repository<T, TNew, TUpdate = Partial<T>> {
  findById(id: string): Promise<T | null>;
  create(data: TNew): Promise<T>;
  update(id: string, data: TUpdate): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}
