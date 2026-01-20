// packages/core/src/contracts/pagination.ts
/**
 * Pagination Schemas
 *
 * Zod schemas for pagination options and results.
 * Used in API contracts for paginated endpoints.
 */

import { z } from 'zod';

// ============================================================================
// Sort Order
// ============================================================================

export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortOrder = (typeof SORT_ORDER)[keyof typeof SORT_ORDER];

// ============================================================================
// Offset-based Pagination
// ============================================================================

/**
 * Pagination options for offset-based pagination.
 * Used for traditional page-based pagination.
 */
export const paginationOptionsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(1000).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum([SORT_ORDER.ASC, SORT_ORDER.DESC]).default(SORT_ORDER.DESC),
});

export type PaginationOptions = z.infer<typeof paginationOptionsSchema>;

/**
 * Paginated result for offset-based pagination.
 */
type PaginatedResultSchema<T extends z.ZodTypeAny> = z.ZodObject<{
  data: z.ZodArray<T>;
  total: z.ZodNumber;
  page: z.ZodNumber;
  limit: z.ZodNumber;
  hasNext: z.ZodBoolean;
  hasPrev: z.ZodBoolean;
  totalPages: z.ZodNumber;
}>;

export const paginatedResultSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
): PaginatedResultSchema<T> =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
    totalPages: z.number().int().min(0),
  });

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  totalPages: number;
};

// ============================================================================
// Cursor-based Pagination
// ============================================================================

/**
 * Cursor-based pagination options.
 * More efficient for large datasets and infinite scroll.
 */
export const cursorPaginationOptionsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum([SORT_ORDER.ASC, SORT_ORDER.DESC]).default(SORT_ORDER.DESC),
});

export type CursorPaginationOptions = z.infer<typeof cursorPaginationOptionsSchema>;

/**
 * Cursor-based pagination result.
 */
type CursorPaginatedResultSchema<T extends z.ZodTypeAny> = z.ZodObject<{
  data: z.ZodArray<T>;
  nextCursor: z.ZodNullable<z.ZodString>;
  hasNext: z.ZodBoolean;
  limit: z.ZodNumber;
}>;

export const cursorPaginatedResultSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
): CursorPaginatedResultSchema<T> =>
  z.object({
    data: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
    limit: z.number().int().min(1),
  });

export type CursorPaginatedResult<T> = {
  data: T[];
  nextCursor: string | null;
  hasNext: boolean;
  limit: number;
};

// ============================================================================
// Universal Pagination
// ============================================================================

/**
 * Universal pagination options that can be either offset or cursor-based.
 */
export const universalPaginationOptionsSchema = z.union([
  paginationOptionsSchema.extend({ type: z.literal('offset') }),
  cursorPaginationOptionsSchema.extend({ type: z.literal('cursor') }),
]);

export type UniversalPaginationOptions = z.infer<typeof universalPaginationOptionsSchema>;

/**
 * Universal pagination result.
 */
export const universalPaginatedResultSchema = (itemSchema: z.ZodTypeAny): z.ZodTypeAny =>
  z.union([
    paginatedResultSchema(itemSchema).extend({ type: z.literal('offset') }),
    cursorPaginatedResultSchema(itemSchema).extend({ type: z.literal('cursor') }),
  ]);

export type UniversalPaginatedResult = z.infer<ReturnType<typeof universalPaginatedResultSchema>>;
