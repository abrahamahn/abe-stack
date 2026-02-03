// infra/src/http/pagination/helpers.ts
/**
 * Pagination helper functions for creating paginated responses
 * and applying pagination to database queries.
 */

import { buildCursorPaginationQuery, calculateCursorPaginationMetadata } from '@abe-stack/shared';

import type {
  CursorPaginationQueryBuilder,
  OffsetPaginationQueryBuilder,
  PaginationHelpers,
} from './types';
import type {
  CursorPaginatedResult,
  CursorPaginationOptions,
  PaginatedResult,
  PaginationOptions,
} from '@abe-stack/shared';

/**
 * Create pagination helper functions
 * These are attached to the request context for easy access in route handlers
 *
 * @returns PaginationHelpers object with offset and cursor pagination utilities
 */
export function createPaginationHelpers(): PaginationHelpers {
  return {
    createOffsetResult,
    createCursorResult,
    applyOffsetPagination,
    applyCursorPagination,
  };
}

/**
 * Create offset-based paginated result
 *
 * @param data - The page of data items
 * @param total - Total number of items across all pages
 * @param options - The pagination options used for the query
 * @returns A complete PaginatedResult with metadata
 */
function createOffsetResult<T>(
  data: T[],
  total: number,
  options: PaginationOptions,
): PaginatedResult<T> {
  const { page, limit } = options;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    totalPages,
  };
}

/**
 * Create cursor-based paginated result
 *
 * @param data - The page of data items
 * @param nextCursor - The cursor for the next page, or null if no more pages
 * @param hasNext - Whether there are more pages
 * @param limit - The page size limit
 * @returns A complete CursorPaginatedResult with metadata
 */
function createCursorResult<T>(
  data: T[],
  nextCursor: string | null,
  hasNext: boolean,
  limit: number,
): CursorPaginatedResult<T> {
  return {
    data,
    nextCursor,
    hasNext,
    limit,
  };
}

/**
 * Apply offset pagination to a database query
 * Generic implementation that works with most query builders
 *
 * @param queryBuilder - The query builder supporting offset pagination
 * @param options - The pagination options
 * @returns Promise resolving to data array and total count
 */
async function applyOffsetPagination<T>(
  queryBuilder: OffsetPaginationQueryBuilder<T>,
  options: PaginationOptions,
): Promise<{ data: T[]; total: number }> {
  const { page, limit, sortBy, sortOrder } = options;

  // Clone the query builder to avoid mutating the original
  let query = queryBuilder.clone !== undefined ? queryBuilder.clone() : queryBuilder;

  // Apply sorting
  if (typeof sortBy === 'string' && sortBy !== '') {
    query = query.orderBy(sortBy, sortOrder);
  }

  // Get total count
  const countResult = await (queryBuilder.clone !== undefined
    ? queryBuilder.clone().count()
    : queryBuilder.count());
  const total = Array.isArray(countResult)
    ? Number((countResult[0] as { count?: number | string } | undefined)?.count ?? 0)
    : typeof countResult === 'number'
      ? countResult
      : Number((countResult as { count?: number | string }).count ?? 0);

  // Apply pagination
  const offset = (page - 1) * limit;
  const pagedQuery = query.offset(offset).limit(limit);

  // Execute query
  const data = await (pagedQuery as unknown as PromiseLike<T[]>);

  return { data, total };
}

/**
 * Apply cursor pagination to a database query
 * Uses the cursor-based pagination utilities from core
 *
 * @param queryBuilder - The query builder supporting cursor pagination
 * @param options - The cursor pagination options
 * @param sortBy - The field to sort by
 * @param tieBreakerField - The tie-breaker field for deterministic ordering (default: 'id')
 * @returns Promise resolving to data array, hasNext flag, and nextCursor
 */
async function applyCursorPagination<T extends Record<string, unknown>>(
  queryBuilder: CursorPaginationQueryBuilder<T>,
  options: CursorPaginationOptions,
  sortBy: string,
  tieBreakerField: string = 'id',
): Promise<{ data: T[]; hasNext: boolean; nextCursor: string | null }> {
  const { cursor, limit, sortOrder } = options;

  // Build pagination query
  const { whereClause, orderByClause, params } = buildCursorPaginationQuery(
    cursor,
    sortBy,
    sortOrder,
    tieBreakerField,
  );

  let query = queryBuilder.clone !== undefined ? queryBuilder.clone() : queryBuilder;

  // Apply where clause if cursor exists
  if (whereClause !== '') {
    query = query.whereRaw(whereClause, params);
  }

  // Apply ordering
  query = query.orderByRaw(orderByClause);

  // Get one extra item to determine if there are more results
  const pagedQuery = query.limit(limit + 1);

  const results = await (pagedQuery as unknown as PromiseLike<T[]>);

  // Calculate pagination metadata
  const metadata = calculateCursorPaginationMetadata(
    results,
    limit,
    sortBy,
    sortOrder,
    tieBreakerField as keyof T,
  );

  return {
    data: results.slice(0, limit),
    hasNext: metadata.hasNext,
    nextCursor: metadata.nextCursor,
  };
}
