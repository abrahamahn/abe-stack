// main/apps/server/src/http/pagination/helpers.ts
/**
 * Pagination helper functions for creating paginated responses
 * and applying pagination to database queries.
 */

import { applyCursorPagination, applyOffsetPagination } from '@bslt/db';
import { createPaginatedResult } from '@bslt/shared';

import type { PaginationHelpers } from './types';
import type { CursorPaginatedResult, PaginatedResult, PaginationOptions } from '@bslt/shared';

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
  return createPaginatedResult(data, total, options);
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
