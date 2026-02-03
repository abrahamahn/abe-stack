// shared/src/utils/pagination.ts
/**
 * @file Pagination Utilities
 * @description Zod schemas and offset/cursor logic for pagination.
 * @module Utils/Pagination
 */

import { z } from 'zod';

export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortOrder = (typeof SORT_ORDER)[keyof typeof SORT_ORDER];

export const sortOrderSchema = z.enum(['asc', 'desc']);

// ============================================================================
// Errors
// ============================================================================

export const PAGINATION_ERROR_TYPES = {
  INVALID_CURSOR: 'INVALID_CURSOR',
  CURSOR_SORT_MISMATCH: 'CURSOR_SORT_MISMATCH',
  INVALID_LIMIT: 'INVALID_LIMIT',
  INVALID_SORT_ORDER: 'INVALID_SORT_ORDER',
} as const;

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
}

// ============================================================================

/**
 * Pagination options for offset-based pagination.
 */
export const paginationOptionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema.default('desc'),
});

export type PaginationOptions = z.infer<typeof paginationOptionsSchema>;

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
export function paginatedResultSchema<T>(itemSchema: z.ZodSchema<T>): z.ZodObject<{
  data: z.ZodArray<z.ZodSchema<T>>;
  total: z.ZodNumber;
  page: z.ZodNumber;
  limit: z.ZodNumber;
  hasNext: z.ZodBoolean;
  hasPrev: z.ZodBoolean;
  totalPages: z.ZodNumber;
}> {
  return z.object({
    data: z.array(itemSchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
    totalPages: z.number().int().min(0),
  });
}

/**
 * Cursor-based pagination options.
 */
export const cursorPaginationOptionsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema.default('desc'),
});

export type CursorPaginationOptions = z.infer<typeof cursorPaginationOptionsSchema>;

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
export function cursorPaginatedResultSchema<T>(itemSchema: z.ZodSchema<T>): z.ZodObject<{
  data: z.ZodArray<z.ZodSchema<T>>;
  nextCursor: z.ZodNullable<z.ZodString>;
  hasNext: z.ZodBoolean;
  limit: z.ZodNumber;
}> {
  return z.object({
    data: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
    limit: z.number().int().min(1),
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
