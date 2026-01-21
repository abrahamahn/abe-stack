// packages/core/src/domains/search/schemas.ts
/**
 * Search & Filtering Zod Schemas
 *
 * Validation schemas for search queries, filters, and results.
 * Used for API validation and type inference.
 */

import { z } from 'zod';

import { FILTER_OPERATORS, LOGICAL_OPERATORS, SORT_ORDER } from './types';

// ============================================================================
// Filter Operator Schemas
// ============================================================================

/**
 * Schema for filter operators.
 */
export const filterOperatorSchema = z.enum([
  FILTER_OPERATORS.EQ,
  FILTER_OPERATORS.NEQ,
  FILTER_OPERATORS.GT,
  FILTER_OPERATORS.GTE,
  FILTER_OPERATORS.LT,
  FILTER_OPERATORS.LTE,
  FILTER_OPERATORS.CONTAINS,
  FILTER_OPERATORS.STARTS_WITH,
  FILTER_OPERATORS.ENDS_WITH,
  FILTER_OPERATORS.LIKE,
  FILTER_OPERATORS.ILIKE,
  FILTER_OPERATORS.IN,
  FILTER_OPERATORS.NOT_IN,
  FILTER_OPERATORS.IS_NULL,
  FILTER_OPERATORS.IS_NOT_NULL,
  FILTER_OPERATORS.BETWEEN,
  FILTER_OPERATORS.ARRAY_CONTAINS,
  FILTER_OPERATORS.ARRAY_CONTAINS_ANY,
  FILTER_OPERATORS.FULL_TEXT,
]);

/**
 * Schema for logical operators.
 */
export const logicalOperatorSchema = z.enum([
  LOGICAL_OPERATORS.AND,
  LOGICAL_OPERATORS.OR,
  LOGICAL_OPERATORS.NOT,
]);

// ============================================================================
// Filter Value Schemas
// ============================================================================

/**
 * Schema for primitive filter values.
 */
export const filterPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.date(),
  z.null(),
]);

/**
 * Schema for range values.
 */
export const rangeValueSchema = z.object({
  min: filterPrimitiveSchema,
  max: filterPrimitiveSchema,
});

/**
 * Schema for filter values (primitives, arrays, or ranges).
 */
export const filterValueSchema = z.union([
  filterPrimitiveSchema,
  z.array(filterPrimitiveSchema),
  rangeValueSchema,
]);

// ============================================================================
// Filter Condition Schemas
// ============================================================================

/**
 * Schema for a single filter condition.
 */
export const filterConditionSchema = z.object({
  field: z.string().min(1),
  operator: filterOperatorSchema,
  value: filterValueSchema,
  caseSensitive: z.boolean().optional(),
});

/**
 * Recursive schema for compound filters.
 */
export const compoundFilterSchema: z.ZodType<{
  operator: 'and' | 'or' | 'not';
  conditions: Array<
    | { field: string; operator: string; value: unknown; caseSensitive?: boolean }
    | { operator: 'and' | 'or' | 'not'; conditions: unknown[] }
  >;
}> = z.lazy(() =>
  z.object({
    operator: logicalOperatorSchema,
    conditions: z.array(z.union([filterConditionSchema, compoundFilterSchema])).min(1),
  }),
);

/**
 * Schema for any filter (single or compound).
 */
export const filterSchema = z.union([filterConditionSchema, compoundFilterSchema]);

// ============================================================================
// Sort Schemas
// ============================================================================

/**
 * Schema for sort order.
 */
export const sortOrderSchema = z.enum([SORT_ORDER.ASC, SORT_ORDER.DESC]);

/**
 * Schema for sort configuration.
 */
export const sortConfigSchema = z.object({
  field: z.string().min(1),
  order: sortOrderSchema,
  nulls: z.enum(['first', 'last']).optional(),
});

// ============================================================================
// Full-Text Search Schema
// ============================================================================

/**
 * Schema for full-text search configuration.
 */
export const fullTextSearchConfigSchema = z.object({
  query: z.string().min(1).max(1000),
  fields: z.array(z.string()).optional(),
  fuzziness: z.number().min(0).max(1).optional(),
  highlight: z.boolean().optional(),
  highlightPrefix: z.string().optional(),
  highlightSuffix: z.string().optional(),
});

// ============================================================================
// Search Query Schema
// ============================================================================

/**
 * Default pagination values.
 */
export const SEARCH_DEFAULTS = {
  PAGE: 1,
  LIMIT: 50,
  MAX_LIMIT: 1000,
} as const;

/**
 * Schema for search query.
 */
export const searchQuerySchema = z.object({
  filters: filterSchema.optional(),
  sort: z.array(sortConfigSchema).optional(),
  search: fullTextSearchConfigSchema.optional(),
  page: z.number().int().min(1).default(SEARCH_DEFAULTS.PAGE),
  limit: z.number().int().min(1).max(SEARCH_DEFAULTS.MAX_LIMIT).default(SEARCH_DEFAULTS.LIMIT),
  cursor: z.string().optional(),
  select: z.array(z.string()).optional(),
  includeCount: z.boolean().optional(),
});

export type SearchQueryInput = z.input<typeof searchQuerySchema>;
export type SearchQueryOutput = z.output<typeof searchQuerySchema>;

// ============================================================================
// Search Result Schemas
// ============================================================================

/**
 * Schema for highlighted field.
 */
export const highlightedFieldSchema = z.object({
  field: z.string(),
  highlighted: z.string(),
  original: z.string(),
});

/**
 * Schema factory for search result items.
 */
export const searchResultItemSchema = <T extends z.ZodType>(
  itemSchema: T,
): z.ZodObject<{
  item: T;
  score: z.ZodOptional<z.ZodNumber>;
  highlights: z.ZodOptional<z.ZodArray<typeof highlightedFieldSchema>>;
}> =>
  z.object({
    item: itemSchema,
    score: z.number().optional(),
    highlights: z.array(highlightedFieldSchema).optional(),
  });

/**
 * Schema factory for paginated search results.
 */
export const searchResultSchema = <T extends z.ZodType>(
  itemSchema: T,
): z.ZodObject<{
  data: z.ZodArray<ReturnType<typeof searchResultItemSchema<T>>>;
  total: z.ZodOptional<z.ZodNumber>;
  page: z.ZodNumber;
  limit: z.ZodNumber;
  hasNext: z.ZodBoolean;
  hasPrev: z.ZodBoolean;
  totalPages: z.ZodOptional<z.ZodNumber>;
  executionTime: z.ZodOptional<z.ZodNumber>;
}> =>
  z.object({
    data: z.array(searchResultItemSchema(itemSchema)),
    total: z.number().int().min(0).optional(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
    totalPages: z.number().int().min(0).optional(),
    executionTime: z.number().optional(),
  });

/**
 * Schema factory for cursor-based search results.
 */
export const cursorSearchResultSchema = <T extends z.ZodType>(
  itemSchema: T,
): z.ZodObject<{
  data: z.ZodArray<ReturnType<typeof searchResultItemSchema<T>>>;
  nextCursor: z.ZodNullable<z.ZodString>;
  prevCursor: z.ZodNullable<z.ZodString>;
  hasNext: z.ZodBoolean;
  hasPrev: z.ZodBoolean;
  limit: z.ZodNumber;
  total: z.ZodOptional<z.ZodNumber>;
  executionTime: z.ZodOptional<z.ZodNumber>;
}> =>
  z.object({
    data: z.array(searchResultItemSchema(itemSchema)),
    nextCursor: z.string().nullable(),
    prevCursor: z.string().nullable(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
    limit: z.number().int().min(1),
    total: z.number().int().min(0).optional(),
    executionTime: z.number().optional(),
  });

// ============================================================================
// Facet Schemas
// ============================================================================

/**
 * Schema for facet bucket.
 */
export const facetBucketSchema = z.object({
  value: filterPrimitiveSchema,
  count: z.number().int().min(0),
  selected: z.boolean().optional(),
});

/**
 * Schema for facet configuration.
 */
export const facetConfigSchema = z.object({
  field: z.string().min(1),
  size: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['count', 'value']).optional(),
  sortOrder: sortOrderSchema.optional(),
  includeMissing: z.boolean().optional(),
});

/**
 * Schema for facet result.
 */
export const facetResultSchema = z.object({
  field: z.string(),
  buckets: z.array(facetBucketSchema),
  totalUnique: z.number().int().min(0).optional(),
});

/**
 * Schema for faceted search query.
 */
export const facetedSearchQuerySchema = searchQuerySchema.extend({
  facets: z.array(facetConfigSchema).optional(),
});

/**
 * Schema factory for faceted search results.
 */
export const facetedSearchResultSchema = <T extends z.ZodType>(
  itemSchema: T,
): ReturnType<typeof searchResultSchema<T>> & {
  extend: ReturnType<typeof searchResultSchema<T>>['extend'];
} =>
  searchResultSchema(itemSchema).extend({
    facets: z.array(facetResultSchema).optional(),
  });

// ============================================================================
// URL Query Parameter Schemas
// ============================================================================

/**
 * Schema for parsing search params from URL query strings.
 * Handles string-to-type conversions for URL parameters.
 */
export const urlSearchParamsSchema = z.object({
  q: z.string().optional(), // Full-text search query
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(SEARCH_DEFAULTS.MAX_LIMIT).optional(),
  sort: z.string().optional(), // Format: "field:asc,field2:desc"
  filters: z.string().optional(), // JSON-encoded filters
  cursor: z.string().optional(),
  fields: z.string().optional(), // Comma-separated field names
});

export type UrlSearchParamsInput = z.input<typeof urlSearchParamsSchema>;
