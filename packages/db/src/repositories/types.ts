// packages/db/src/repositories/types.ts
/**
 * Repository Types
 *
 * Common types used across all repositories.
 */

/**
 * Pagination options for list queries
 */
export interface PaginationOptions {
  /** Maximum number of items to return */
  limit?: number;
  /** Cursor for pagination (typically the last item's ID or timestamp) */
  cursor?: string;
  /** Sort direction */
  direction?: 'asc' | 'desc';
  /** Column to sort by */
  sortBy?: string;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  /** Items in this page */
  items: T[];
  /** Cursor for the next page (null if no more pages) */
  nextCursor: string | null;
  /** Total count (optional, expensive to compute) */
  totalCount?: number;
}

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
