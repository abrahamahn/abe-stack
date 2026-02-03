// infra/contracts/src/pagination.ts
/**
 * Pagination Schemas
 *
 * Validation schemas for pagination options and results.
 * Used in API contracts for paginated endpoints.
 */

import { createSchema } from './schema';

import type { Schema } from './types';

// ============================================================================
// Sort Order
// ============================================================================

export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortOrder = (typeof SORT_ORDER)[keyof typeof SORT_ORDER];

// ============================================================================
// Validation Helpers
// ============================================================================

function validateInt(data: unknown, fieldName: string): number {
  if (typeof data !== 'number' || !Number.isInteger(data)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return data;
}

function validateSortOrder(data: unknown): SortOrder {
  if (data !== 'asc' && data !== 'desc') {
    throw new Error('sortOrder must be "asc" or "desc"');
  }
  return data;
}

// ============================================================================
// Offset-based Pagination
// ============================================================================

/**
 * Pagination options for offset-based pagination.
 * Used for traditional page-based pagination.
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string | undefined;
  sortOrder: SortOrder;
}

export const paginationOptionsSchema: Schema<PaginationOptions> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  // Page defaults to 1
  let page = 1;
  if (obj['page'] !== undefined) {
    page = validateInt(obj['page'], 'page');
    if (page < 1) {
      throw new Error('page must be at least 1');
    }
  }

  // Limit defaults to 50
  let limit = 50;
  if (obj['limit'] !== undefined) {
    limit = validateInt(obj['limit'], 'limit');
    if (limit < 1) {
      throw new Error('limit must be at least 1');
    }
    if (limit > 1000) {
      throw new Error('limit must be at most 1000');
    }
  }

  // sortBy is optional
  const sortBy = typeof obj['sortBy'] === 'string' ? obj['sortBy'] : undefined;

  // sortOrder defaults to desc
  const sortOrder = obj['sortOrder'] !== undefined ? validateSortOrder(obj['sortOrder']) : 'desc';

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
    const parsedData = obj['data'].map((item) => itemSchema.parse(item));

    const total = validateInt(obj['total'], 'total');
    if (total < 0) {
      throw new Error('total must be non-negative');
    }

    const page = validateInt(obj['page'], 'page');
    if (page < 1) {
      throw new Error('page must be at least 1');
    }

    const limit = validateInt(obj['limit'], 'limit');
    if (limit < 1) {
      throw new Error('limit must be at least 1');
    }

    if (typeof obj['hasNext'] !== 'boolean') {
      throw new Error('hasNext must be a boolean');
    }
    if (typeof obj['hasPrev'] !== 'boolean') {
      throw new Error('hasPrev must be a boolean');
    }

    const totalPages = validateInt(obj['totalPages'], 'totalPages');
    if (totalPages < 0) {
      throw new Error('totalPages must be non-negative');
    }

    return {
      data: parsedData,
      total,
      page,
      limit,
      hasNext: obj['hasNext'],
      hasPrev: obj['hasPrev'],
      totalPages,
    };
  });
}

// ============================================================================
// Cursor-based Pagination
// ============================================================================

/**
 * Cursor-based pagination options.
 * More efficient for large datasets and infinite scroll.
 */
export interface CursorPaginationOptions {
  cursor?: string | undefined;
  limit: number;
  sortBy?: string | undefined;
  sortOrder: SortOrder;
}

export const cursorPaginationOptionsSchema: Schema<CursorPaginationOptions> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    // cursor is optional
    const cursor = typeof obj['cursor'] === 'string' ? obj['cursor'] : undefined;

    // Limit defaults to 50
    let limit = 50;
    if (obj['limit'] !== undefined) {
      limit = validateInt(obj['limit'], 'limit');
      if (limit < 1) {
        throw new Error('limit must be at least 1');
      }
      if (limit > 1000) {
        throw new Error('limit must be at most 1000');
      }
    }

    // sortBy is optional
    const sortBy = typeof obj['sortBy'] === 'string' ? obj['sortBy'] : undefined;

    // sortOrder defaults to desc
    const sortOrder = obj['sortOrder'] !== undefined ? validateSortOrder(obj['sortOrder']) : 'desc';

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
    const parsedData = obj['data'].map((item) => itemSchema.parse(item));

    // nextCursor can be string or null
    let nextCursor: string | null = null;
    if (obj['nextCursor'] !== null && obj['nextCursor'] !== undefined) {
      if (typeof obj['nextCursor'] !== 'string') {
        throw new Error('nextCursor must be a string or null');
      }
      nextCursor = obj['nextCursor'];
    }

    if (typeof obj['hasNext'] !== 'boolean') {
      throw new Error('hasNext must be a boolean');
    }

    const limit = validateInt(obj['limit'], 'limit');
    if (limit < 1) {
      throw new Error('limit must be at least 1');
    }

    return {
      data: parsedData,
      nextCursor,
      hasNext: obj['hasNext'],
      limit,
    };
  });
}

// ============================================================================
// Universal Pagination
// ============================================================================

/**
 * Universal pagination options that can be either offset or cursor-based.
 */
export type UniversalPaginationOptions =
  | (PaginationOptions & { type: 'offset' })
  | (CursorPaginationOptions & { type: 'cursor' });

export const universalPaginationOptionsSchema: Schema<UniversalPaginationOptions> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid universal pagination options');
    }
    const obj = data as Record<string, unknown>;

    if (obj['type'] === 'offset') {
      const parsed = paginationOptionsSchema.parse(data);
      return { ...parsed, type: 'offset' as const };
    } else if (obj['type'] === 'cursor') {
      const parsed = cursorPaginationOptionsSchema.parse(data);
      return { ...parsed, type: 'cursor' as const };
    } else {
      throw new Error('type must be "offset" or "cursor"');
    }
  },
);

/**
 * Universal pagination result.
 */
export type UniversalPaginatedResult<T> =
  | (PaginatedResult<T> & { type: 'offset' })
  | (CursorPaginatedResult<T> & { type: 'cursor' });

/**
 * Schema factory for universal paginated results.
 */
export function universalPaginatedResultSchema<T>(
  itemSchema: Schema<T>,
): Schema<UniversalPaginatedResult<T>> {
  return createSchema((data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid universal paginated result');
    }
    const obj = data as Record<string, unknown>;

    if (obj['type'] === 'offset') {
      const parsed = paginatedResultSchema(itemSchema).parse(data);
      return { ...parsed, type: 'offset' as const };
    } else if (obj['type'] === 'cursor') {
      const parsed = cursorPaginatedResultSchema(itemSchema).parse(data);
      return { ...parsed, type: 'cursor' as const };
    } else {
      throw new Error('type must be "offset" or "cursor"');
    }
  });
}
