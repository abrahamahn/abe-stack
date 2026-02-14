// main/server/db/src/utils/pagination.ts
/**
 * Cursor pagination helpers for repository list methods.
 *
 * Eliminates duplicated cursor decoding, condition combining,
 * and result-trimming boilerplate across billing repositories.
 */

import {
  buildCursorPaginationQuery,
  calculateCursorPaginationMetadata,
  createCursorForItem,
  decodeCursor,
} from '@abe-stack/shared';

import { and, eq, gt, lt, or } from '../builder/index';

import type { SortDirection, SqlFragment } from '../builder/index';
import type {
  CursorPaginatedResult,
  CursorPaginationOptions,
  PaginationOptions,
} from '@abe-stack/shared';

/**
 * Build a SQL condition for cursor-based pagination on created_at + id.
 * Returns null if no valid cursor is provided.
 */
export function buildCursorCondition(
  cursor: string | undefined,
  sortOrder: SortDirection,
): SqlFragment | null {
  if (cursor === undefined || cursor === '') return null;

  const cursorData = decodeCursor(cursor);
  if (cursorData === null) return null;

  const cursorDate =
    cursorData.value instanceof Date ? cursorData.value : new Date(String(cursorData.value));
  const cursorId = cursorData.tieBreaker;

  const cmp = sortOrder === 'desc' ? lt : gt;
  return or(cmp('created_at', cursorDate), and(eq('created_at', cursorDate), cmp('id', cursorId)));
}

/**
 * Combine an array of SQL conditions with AND.
 * Returns null if the array is empty.
 */
export function combineConditions(conditions: SqlFragment[]): SqlFragment | null {
  if (conditions.length === 0) return null;
  const [first, ...rest] = conditions;
  if (first === undefined) return null;
  return rest.length === 0 ? first : and(first, ...rest);
}

/**
 * Build a CursorPaginatedResult from a data array fetched with limit+1.
 * Trims the extra lookahead item and encodes the next cursor.
 */
export function buildCursorResult<T extends { id: string; createdAt: Date }>(
  data: T[],
  limit: number,
  sortOrder: SortDirection,
): CursorPaginatedResult<T> {
  const hasMore = data.length > limit;
  if (hasMore) {
    data.pop();
  }

  const lastItem = data[data.length - 1];
  const nextCursor =
    hasMore && lastItem !== undefined
      ? createCursorForItem(lastItem, 'createdAt', sortOrder, 'id')
      : null;

  return { data, nextCursor, hasNext: hasMore, limit };
}

// ============================================================================
// Generic Query Application
// ============================================================================

/**
 * Result of a count operation (number or object with count)
 */
export type CountResult =
  | number
  | { count?: number | string }
  | Array<{ count?: number | string }>
  | { count: number | string };

/**
 * Interface for query builders supporting offset pagination
 */
export type OffsetPaginationQueryBuilder<T> = {
  clone?: () => OffsetPaginationQueryBuilder<T>;
  orderBy: (
    sortBy: string,
    sortOrder?: SortDirection,
  ) => OffsetPaginationQueryBuilder<T>;
  count: () => PromiseLike<CountResult>;
  offset: (value: number) => OffsetPaginationQueryBuilder<T>;
  limit: (value: number) => OffsetPaginationQueryBuilder<T> | PromiseLike<T[]>;
  then?: PromiseLike<T[]>['then'];
};

/**
 * Interface for query builders supporting cursor pagination
 */
export type CursorPaginationQueryBuilder<T> = {
  clone?: () => CursorPaginationQueryBuilder<T>;
  whereRaw: (clause: string, params: unknown[]) => CursorPaginationQueryBuilder<T>;
  orderByRaw: (clause: string) => CursorPaginationQueryBuilder<T>;
  limit: (value: number) => CursorPaginationQueryBuilder<T> | PromiseLike<T[]>;
  then?: PromiseLike<T[]>['then'];
};

/**
 * Apply offset pagination to a database query
 * Generic implementation that works with most query builders (Knex/Kysely)
 *
 * @param queryBuilder - The query builder supporting offset pagination
 * @param options - The pagination options
 * @returns Promise resolving to data array and total count
 */
export async function applyOffsetPagination<T>(
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

  // Handle various count result formats (array, object, string, number)
  // Kysely/Knex often return [{ count: '100' }] or { count: '100' }
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
 * Uses the cursor-based pagination utilities from core/shared
 *
 * @param queryBuilder - The query builder supporting cursor pagination
 * @param options - The cursor pagination options
 * @param sortBy - The field to sort by
 * @param tieBreakerField - The tie-breaker field for deterministic ordering (default: 'id')
 * @returns Promise resolving to data array, hasNext flag, and nextCursor
 */
export async function applyCursorPagination<T extends Record<string, unknown>>(
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
  // The shared utility only uses data and limit to calculate hasNext and nextCursor
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
