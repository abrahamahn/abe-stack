// main/shared/src/engine/pagination/pagination.ts
/**
 * @file Pagination Utilities
 * @description Validation schemas and offset/cursor logic for pagination.
 * Uses createSchema instead of Zod.
 * @module Utils/Pagination
 */

import {
  coerceNumber,
  createEnumSchema,
  createSchema,
  parseBoolean,
  parseOptional,
  parseString,
} from '../../primitives/schema';

import type { Schema } from '../../primitives/schema';

export const sortOrderSchema = createEnumSchema(['asc', 'desc'] as const, 'sort order');

// ============================================================================
// Pagination Defaults
// ============================================================================

import {
  DEFAULT_PAGINATION,
  DEFAULT_SORT_ORDER,
  PAGINATION_ERROR_TYPES,
} from '../constants/limits';

export const DEFAULT_PAGE_LIMIT = DEFAULT_PAGINATION.LIMIT;
export const DEFAULT_SORT_BY = 'createdAt';
export { DEFAULT_SORT_ORDER, PAGINATION_ERROR_TYPES };

// ============================================================================
// Pagination Defaults
// ============================================================================

// ============================================================================
// Errors
// ============================================================================

export type PaginationErrorType =
  (typeof PAGINATION_ERROR_TYPES)[keyof typeof PAGINATION_ERROR_TYPES];

/**
 * Error class for pagination-related errors
 */
export class PaginationError extends Error {
  public readonly type: PaginationErrorType;
  public readonly details?: unknown;

  constructor(type: PaginationErrorType, message: string, details?: unknown) {
    super(message);
    this.name = 'PaginationError';
    this.type = type;
    this.details = details;
  }

  /**
   * Check if an error is a PaginationError
   */
  static isPaginationError(error: unknown): error is PaginationError {
    return error instanceof PaginationError;
  }

  /**
   * Check if an error is a PaginationError of a specific type
   * @param error - The error to check
   * @param type - The pagination error type to match
   * @returns True if the error is a PaginationError with the given type
   */
  static isType(error: unknown, type: PaginationErrorType): boolean {
    return error instanceof PaginationError && error.type === type;
  }
}

// ============================================================================

/**
 * Pagination options for offset-based pagination.
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string | undefined;
  sortOrder: 'asc' | 'desc';
}

export const paginationOptionsSchema: Schema<PaginationOptions> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  let page = 1;
  if (obj['page'] !== undefined) {
    page = coerceNumber(obj['page'], 'page', { int: true, min: 1 });
  }

  let limit: number = DEFAULT_PAGE_LIMIT;
  if (obj['limit'] !== undefined) {
    limit = coerceNumber(obj['limit'], 'limit', { int: true, min: 1, max: 1000 });
  }

  const sortBy = parseOptional(obj['sortBy'], (v) => parseString(v, 'sortBy'));
  const sortOrder =
    obj['sortOrder'] !== undefined ? sortOrderSchema.parse(obj['sortOrder']) : DEFAULT_SORT_ORDER;

  return { page, limit, sortBy, sortOrder };
});

/**
 * Paginated result for offset-based pagination.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  totalPages: number;
}

/**
 * Schema factory for paginated results.
 *
 * @param itemSchema - Schema for each item in the data array
 * @returns Schema that validates paginated results
 * @complexity O(n) where n is number of items
 */
export function paginatedResultSchema<T>(itemSchema: Schema<T>): Schema<PaginatedResult<T>> {
  return createSchema((data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid paginated result');
    }
    const obj = data as Record<string, unknown>;

    if (!Array.isArray(obj['data'])) {
      throw new Error('data must be an array');
    }
    const parsedData = obj['data'].map((item: unknown) => itemSchema.parse(item));

    const total = coerceNumber(obj['total'], 'total', { int: true, min: 0 });
    const page = coerceNumber(obj['page'], 'page', { int: true, min: 1 });
    const limit = coerceNumber(obj['limit'], 'limit', { int: true, min: 1 });
    const hasNext = parseBoolean(obj['hasNext'], 'hasNext');
    const hasPrev = parseBoolean(obj['hasPrev'], 'hasPrev');
    const totalPages = coerceNumber(obj['totalPages'], 'totalPages', { int: true, min: 0 });

    return { data: parsedData, total, page, limit, hasNext, hasPrev, totalPages };
  });
}

/**
 * Cursor-based pagination options.
 */
export interface CursorPaginationOptions {
  cursor?: string | undefined;
  limit: number;
  sortBy?: string | undefined;
  sortOrder: 'asc' | 'desc';
}

export const cursorPaginationOptionsSchema: Schema<CursorPaginationOptions> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    const cursor = parseOptional(obj['cursor'], (v: unknown) => parseString(v, 'cursor'));

    let limit: number = DEFAULT_PAGE_LIMIT;
    if (obj['limit'] !== undefined) {
      limit = coerceNumber(obj['limit'], 'limit', { int: true, min: 1, max: 1000 });
    }

    const sortBy = parseOptional(obj['sortBy'], (v: unknown) => parseString(v, 'sortBy'));
    const sortOrder =
      obj['sortOrder'] !== undefined ? sortOrderSchema.parse(obj['sortOrder']) : DEFAULT_SORT_ORDER;

    return { cursor, limit, sortBy, sortOrder };
  },
);

/**
 * Cursor-based pagination result.
 */
export interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasNext: boolean;
  limit: number;
}

/**
 * Schema factory for cursor-based paginated results.
 *
 * @param itemSchema - Schema for each item in the data array
 * @returns Schema that validates cursor-paginated results
 * @complexity O(n) where n is number of items
 */
export function cursorPaginatedResultSchema<T>(
  itemSchema: Schema<T>,
): Schema<CursorPaginatedResult<T>> {
  return createSchema((data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid cursor paginated result');
    }
    const obj = data as Record<string, unknown>;

    if (!Array.isArray(obj['data'])) {
      throw new Error('data must be an array');
    }
    const parsedData = obj['data'].map((item: unknown) => itemSchema.parse(item));

    let nextCursor: string | null = null;
    if (obj['nextCursor'] !== null && obj['nextCursor'] !== undefined) {
      if (typeof obj['nextCursor'] !== 'string') {
        throw new Error('nextCursor must be a string or null');
      }
      nextCursor = obj['nextCursor'];
    }

    const hasNext = parseBoolean(obj['hasNext'], 'hasNext');
    const limit = coerceNumber(obj['limit'], 'limit', { int: true, min: 1 });

    return { data: parsedData, nextCursor, hasNext, limit };
  });
}

// ============================================================================
// Pagination Metadata Helpers
// ============================================================================

/**
 * Calculate pagination metadata for offset-based pagination.
 */
export function calculateOffsetPaginationMetadata({
  page,
  limit,
  total,
}: {
  page: number;
  limit: number;
  total: number;
}): Pick<PaginatedResult<unknown>, 'hasNext' | 'hasPrev' | 'totalPages'> {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    hasNext,
    hasPrev,
    totalPages,
  };
}

/**
 * Calculate pagination metadata for cursor-based pagination.
 * Expects 'data' to contain 'limit + 1' items if a next page exists.
 *
 * NOTE: This helper assumes the data is already sorted by the database.
 * The nextCursor is the 'id' of the last item in the viewport (limit-th item).
 *
 * @param data - The result set (potentially containing 1 extra item for lookahead)
 * @param limit - The requested page size
 * @returns Metadata for hasNext and nextCursor
 */
export function calculateCursorPaginationMetadata<T extends { id?: string | number }>(
  data: T[],
  limit: number,
): Pick<CursorPaginatedResult<T>, 'hasNext' | 'nextCursor'> {
  const hasNext = data.length > limit;

  // The nextCursor is the ID of the last item in the current page (the limit-th item).
  // The consumer (API/DB) will then use this value for the next query (e.g. id > cursor or id < cursor).
  const lastItemInRange = data[limit - 1];
  const nextCursor =
    hasNext && lastItemInRange !== undefined ? String(lastItemInRange.id ?? '') : null;

  return {
    hasNext,
    nextCursor: nextCursor !== null && nextCursor !== '' ? nextCursor : null,
  };
}

/**
 * Helper to create a cursor-based paginated result.
 * Automatically handles trimming the extra 'lookahead' item.
 */
export function createCursorPaginatedResult<T extends { id?: string | number }>(
  data: T[],
  limit: number,
): CursorPaginatedResult<T> {
  const { hasNext, nextCursor } = calculateCursorPaginationMetadata(data, limit);

  // Trim data to requested limit
  const resultData = data.slice(0, limit);

  return {
    data: resultData,
    nextCursor,
    hasNext,
    limit,
  };
}

/**
 * Helper to create a standard paginated result.
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  options: PaginationOptions,
): PaginatedResult<T> {
  const { hasNext, hasPrev, totalPages } = calculateOffsetPaginationMetadata({
    page: options.page,
    limit: options.limit,
    total,
  });

  return {
    data,
    total,
    page: options.page,
    limit: options.limit,
    hasNext,
    hasPrev,
    totalPages,
  };
}
