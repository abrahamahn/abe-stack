// packages/core/src/domains/search/schemas.ts
/**
 * Search & Filtering Validation Schemas
 *
 * Validation schemas for search queries, filters, and results.
 * Used for API validation and type inference.
 */

import { createSchema, type Schema } from '../../contracts/types';

import { FILTER_OPERATORS, LOGICAL_OPERATORS, SORT_ORDER } from './types';

import type {
  CompoundFilter,
  FacetBucket,
  FacetConfig,
  FacetedSearchQuery,
  FacetResult,
  FilterCondition,
  FilterOperator,
  FilterPrimitive,
  FilterValue,
  FullTextSearchConfig,
  HighlightedField,
  LogicalOperator,
  SearchQuery,
  SearchResult,
  SearchResultItem,
  SortConfig,
  SortOrder,
  CursorSearchResult,
} from './types';

// ============================================================================
// Filter Operator Schemas
// ============================================================================

const FILTER_OPERATOR_VALUES = Object.values(FILTER_OPERATORS);

/**
 * Schema for filter operators.
 */
export const filterOperatorSchema: Schema<FilterOperator> = createSchema((data: unknown) => {
  if (typeof data !== 'string' || !FILTER_OPERATOR_VALUES.includes(data as FilterOperator)) {
    throw new Error(`Invalid filter operator: ${String(data)}`);
  }
  return data as FilterOperator;
});

const LOGICAL_OPERATOR_VALUES = Object.values(LOGICAL_OPERATORS);

/**
 * Schema for logical operators.
 */
export const logicalOperatorSchema: Schema<LogicalOperator> = createSchema((data: unknown) => {
  if (typeof data !== 'string' || !LOGICAL_OPERATOR_VALUES.includes(data as LogicalOperator)) {
    throw new Error(`Invalid logical operator: ${String(data)}`);
  }
  return data as LogicalOperator;
});

// ============================================================================
// Filter Value Schemas
// ============================================================================

/**
 * Schema for primitive filter values.
 */
export const filterPrimitiveSchema: Schema<FilterPrimitive> = createSchema((data: unknown) => {
  if (
    data === null ||
    typeof data === 'string' ||
    typeof data === 'number' ||
    typeof data === 'boolean' ||
    data instanceof Date
  ) {
    return data as FilterPrimitive;
  }
  throw new Error('Invalid filter primitive value');
});

/**
 * Schema for range values.
 */
export interface RangeValue {
  min: FilterPrimitive;
  max: FilterPrimitive;
}

export const rangeValueSchema: Schema<RangeValue> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid range value');
  }
  const obj = data as Record<string, unknown>;
  return {
    min: filterPrimitiveSchema.parse(obj.min),
    max: filterPrimitiveSchema.parse(obj.max),
  };
});

/**
 * Schema for filter values (primitives, arrays, or ranges).
 */
export const filterValueSchema: Schema<FilterValue> = createSchema((data: unknown) => {
  // Try as array of primitives
  if (Array.isArray(data)) {
    return data.map((item) => filterPrimitiveSchema.parse(item));
  }
  // Try as range
  if (data && typeof data === 'object' && 'min' in data && 'max' in data) {
    return rangeValueSchema.parse(data);
  }
  // Try as primitive
  return filterPrimitiveSchema.parse(data);
});

// ============================================================================
// Filter Condition Schemas
// ============================================================================

/**
 * Schema for a single filter condition.
 */
export const filterConditionSchema: Schema<FilterCondition> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid filter condition');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj.field !== 'string' || obj.field.length < 1) {
    throw new Error('Filter field must be a non-empty string');
  }

  return {
    field: obj.field,
    operator: filterOperatorSchema.parse(obj.operator),
    value: filterValueSchema.parse(obj.value),
    caseSensitive: typeof obj.caseSensitive === 'boolean' ? obj.caseSensitive : undefined,
  };
});

/**
 * Recursive schema for compound filters.
 */
export const compoundFilterSchema: Schema<CompoundFilter> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid compound filter');
  }
  const obj = data as Record<string, unknown>;

  const operator = logicalOperatorSchema.parse(obj.operator);

  if (!Array.isArray(obj.conditions) || obj.conditions.length < 1) {
    throw new Error('Compound filter must have at least one condition');
  }

  const conditions = obj.conditions.map((cond) => {
    const c = cond as Record<string, unknown>;
    // Determine if it's a simple condition or compound filter
    if ('field' in c) {
      return filterConditionSchema.parse(c);
    } else if ('conditions' in c) {
      return compoundFilterSchema.parse(c);
    }
    throw new Error('Invalid condition in compound filter');
  });

  return { operator, conditions };
});

/**
 * Schema for any filter (single or compound).
 */
export const filterSchema: Schema<FilterCondition | CompoundFilter> = createSchema(
  (data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid filter');
    }
    const obj = data as Record<string, unknown>;

    // Determine type by checking for 'field' vs 'conditions'
    if ('field' in obj) {
      return filterConditionSchema.parse(data);
    }
    if ('conditions' in obj) {
      return compoundFilterSchema.parse(data);
    }
    throw new Error('Filter must have either field or conditions');
  },
);

// ============================================================================
// Sort Schemas
// ============================================================================

/**
 * Schema for sort order.
 */
export const sortOrderSchema: Schema<SortOrder> = createSchema((data: unknown) => {
  if (data !== SORT_ORDER.ASC && data !== SORT_ORDER.DESC) {
    throw new Error('Sort order must be "asc" or "desc"');
  }
  return data;
});

/**
 * Schema for sort configuration.
 */
export const sortConfigSchema: Schema<SortConfig> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid sort config');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj.field !== 'string' || obj.field.length < 1) {
    throw new Error('Sort field must be a non-empty string');
  }

  return {
    field: obj.field,
    order: sortOrderSchema.parse(obj.order),
    nulls: obj.nulls === 'first' || obj.nulls === 'last' ? obj.nulls : undefined,
  };
});

// ============================================================================
// Full-Text Search Schema
// ============================================================================

/**
 * Schema for full-text search configuration.
 */
export const fullTextSearchConfigSchema: Schema<FullTextSearchConfig> = createSchema(
  (data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid full-text search config');
    }
    const obj = data as Record<string, unknown>;

    if (typeof obj.query !== 'string' || obj.query.length < 1 || obj.query.length > 1000) {
      throw new Error('Search query must be 1-1000 characters');
    }

    // Validate fuzziness if provided
    let fuzziness: number | undefined;
    if (obj.fuzziness !== undefined) {
      if (typeof obj.fuzziness !== 'number' || obj.fuzziness < 0 || obj.fuzziness > 1) {
        throw new Error('fuzziness must be a number between 0 and 1');
      }
      fuzziness = obj.fuzziness;
    }

    return {
      query: obj.query,
      fields: Array.isArray(obj.fields) ? obj.fields : undefined,
      fuzziness,
      highlight: typeof obj.highlight === 'boolean' ? obj.highlight : undefined,
      highlightPrefix: typeof obj.highlightPrefix === 'string' ? obj.highlightPrefix : undefined,
      highlightSuffix: typeof obj.highlightSuffix === 'string' ? obj.highlightSuffix : undefined,
    };
  },
);

// ============================================================================
// Search Query Schema
// ============================================================================

/**
 * Default pagination values.
 */
export const SEARCH_DEFAULTS = {
  PAGE: 1 as number,
  LIMIT: 50 as number,
  MAX_LIMIT: 1000 as number,
};

/**
 * Schema for search query.
 */
export const searchQuerySchema: Schema<SearchQuery> = createSchema((data: unknown) => {
  const obj = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  // Parse filters if present
  let filters: FilterCondition | CompoundFilter | undefined;
  if (obj.filters !== undefined) {
    filters = filterSchema.parse(obj.filters);
  }

  // Parse sort if present
  let sort: SortConfig[] | undefined;
  if (Array.isArray(obj.sort)) {
    sort = obj.sort.map((s) => sortConfigSchema.parse(s));
  }

  // Parse search if present
  let search: FullTextSearchConfig | undefined;
  if (obj.search !== undefined) {
    search = fullTextSearchConfigSchema.parse(obj.search);
  }

  // Parse pagination
  let page = SEARCH_DEFAULTS.PAGE;
  if (obj.page !== undefined) {
    if (typeof obj.page !== 'number' || !Number.isInteger(obj.page) || obj.page < 1) {
      throw new Error('page must be a positive integer');
    }
    page = obj.page;
  }

  let limit = SEARCH_DEFAULTS.LIMIT;
  if (typeof obj.limit === 'number' && Number.isInteger(obj.limit)) {
    if (obj.limit < 1 || obj.limit > SEARCH_DEFAULTS.MAX_LIMIT) {
      throw new Error(`Limit must be between 1 and ${String(SEARCH_DEFAULTS.MAX_LIMIT)}`);
    }
    limit = obj.limit;
  }

  return {
    filters,
    sort,
    search,
    page,
    limit,
    cursor: typeof obj.cursor === 'string' ? obj.cursor : undefined,
    select: Array.isArray(obj.select) ? (obj.select as string[]) : undefined,
    includeCount: typeof obj.includeCount === 'boolean' ? obj.includeCount : undefined,
  };
});

export type SearchQueryInput = SearchQuery;
export type SearchQueryOutput = SearchQuery;

// ============================================================================
// Search Result Schemas
// ============================================================================

/**
 * Schema for highlighted field.
 */
export const highlightedFieldSchema: Schema<HighlightedField> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid highlighted field');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj.field !== 'string') {
    throw new Error('Highlighted field must have a field name');
  }
  if (typeof obj.highlighted !== 'string') {
    throw new Error('Highlighted field must have highlighted text');
  }
  if (typeof obj.original !== 'string') {
    throw new Error('Highlighted field must have original text');
  }

  return {
    field: obj.field,
    highlighted: obj.highlighted,
    original: obj.original,
  };
});

/**
 * Schema factory for search result items.
 */
export function searchResultItemSchema<T>(itemSchema: Schema<T>): Schema<SearchResultItem<T>> {
  return createSchema((data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid search result item');
    }
    const obj = data as Record<string, unknown>;

    const item = itemSchema.parse(obj.item);

    return {
      item,
      score: typeof obj.score === 'number' ? obj.score : undefined,
      highlights: Array.isArray(obj.highlights)
        ? obj.highlights.map((h) => highlightedFieldSchema.parse(h))
        : undefined,
    };
  });
}

/**
 * Schema factory for paginated search results.
 */
export function searchResultSchema<T>(itemSchema: Schema<T>): Schema<SearchResult<T>> {
  const resultItemSchema = searchResultItemSchema(itemSchema);

  return createSchema((data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid search result');
    }
    const obj = data as Record<string, unknown>;

    if (!Array.isArray(obj.data)) {
      throw new Error('Search result data must be an array');
    }

    const parsedData = obj.data.map((item) => resultItemSchema.parse(item));

    if (typeof obj.page !== 'number' || obj.page < 1) {
      throw new Error('Page must be a positive integer');
    }
    if (typeof obj.limit !== 'number' || obj.limit < 1) {
      throw new Error('Limit must be a positive integer');
    }
    if (typeof obj.hasNext !== 'boolean') {
      throw new Error('hasNext must be a boolean');
    }
    if (typeof obj.hasPrev !== 'boolean') {
      throw new Error('hasPrev must be a boolean');
    }

    return {
      data: parsedData,
      total: typeof obj.total === 'number' && obj.total >= 0 ? obj.total : undefined,
      page: obj.page,
      limit: obj.limit,
      hasNext: obj.hasNext,
      hasPrev: obj.hasPrev,
      totalPages:
        typeof obj.totalPages === 'number' && obj.totalPages >= 0 ? obj.totalPages : undefined,
      executionTime: typeof obj.executionTime === 'number' ? obj.executionTime : undefined,
    };
  });
}

/**
 * Schema factory for cursor-based search results.
 */
export function cursorSearchResultSchema<T>(itemSchema: Schema<T>): Schema<CursorSearchResult<T>> {
  const resultItemSchema = searchResultItemSchema(itemSchema);

  return createSchema((data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid cursor search result');
    }
    const obj = data as Record<string, unknown>;

    if (!Array.isArray(obj.data)) {
      throw new Error('Search result data must be an array');
    }

    const parsedData = obj.data.map((item) => resultItemSchema.parse(item));

    if (typeof obj.hasNext !== 'boolean') {
      throw new Error('hasNext must be a boolean');
    }
    if (typeof obj.hasPrev !== 'boolean') {
      throw new Error('hasPrev must be a boolean');
    }
    if (typeof obj.limit !== 'number' || obj.limit < 1) {
      throw new Error('Limit must be a positive integer');
    }

    return {
      data: parsedData,
      nextCursor:
        obj.nextCursor === null || typeof obj.nextCursor === 'string' ? obj.nextCursor : null,
      prevCursor:
        obj.prevCursor === null || typeof obj.prevCursor === 'string' ? obj.prevCursor : null,
      hasNext: obj.hasNext,
      hasPrev: obj.hasPrev,
      limit: obj.limit,
      total: typeof obj.total === 'number' && obj.total >= 0 ? obj.total : undefined,
      executionTime: typeof obj.executionTime === 'number' ? obj.executionTime : undefined,
    };
  });
}

// ============================================================================
// Facet Schemas
// ============================================================================

/**
 * Schema for facet bucket.
 */
export const facetBucketSchema: Schema<FacetBucket> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid facet bucket');
  }
  const obj = data as Record<string, unknown>;

  return {
    value: filterPrimitiveSchema.parse(obj.value),
    count: typeof obj.count === 'number' && Number.isInteger(obj.count) ? obj.count : 0,
    selected: typeof obj.selected === 'boolean' ? obj.selected : undefined,
  };
});

/**
 * Schema for facet configuration.
 */
export const facetConfigSchema: Schema<FacetConfig> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid facet config');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj.field !== 'string' || obj.field.length < 1) {
    throw new Error('Facet field must be a non-empty string');
  }

  // Validate size if provided
  let size: number | undefined;
  if (obj.size !== undefined) {
    if (typeof obj.size !== 'number' || !Number.isInteger(obj.size) || obj.size < 1 || obj.size > 100) {
      throw new Error('Facet size must be an integer between 1 and 100');
    }
    size = obj.size;
  }

  return {
    field: obj.field,
    size,
    sortBy:
      obj.sortBy === 'count' || obj.sortBy === 'value' ? obj.sortBy : undefined,
    sortOrder:
      obj.sortOrder === 'asc' || obj.sortOrder === 'desc'
        ? (obj.sortOrder as SortOrder)
        : undefined,
    includeMissing: typeof obj.includeMissing === 'boolean' ? obj.includeMissing : undefined,
  };
});

/**
 * Schema for facet result.
 */
export const facetResultSchema: Schema<FacetResult> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid facet result');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj.field !== 'string') {
    throw new Error('Facet result must have a field');
  }

  if (!Array.isArray(obj.buckets)) {
    throw new Error('Facet result must have buckets array');
  }

  return {
    field: obj.field,
    buckets: obj.buckets.map((b) => facetBucketSchema.parse(b)),
    totalUnique: typeof obj.totalUnique === 'number' ? obj.totalUnique : undefined,
  };
});

/**
 * Schema for faceted search query.
 */
export const facetedSearchQuerySchema: Schema<FacetedSearchQuery> = createSchema(
  (data: unknown) => {
    const base = searchQuerySchema.parse(data);
    const obj = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      ...base,
      facets: Array.isArray(obj.facets)
        ? (obj.facets as unknown[]).map((f) => facetConfigSchema.parse(f))
        : undefined,
    };
  },
);

/**
 * Schema factory for faceted search results.
 */
export function facetedSearchResultSchema<T>(
  itemSchema: Schema<T>,
): Schema<SearchResult<T> & { facets?: FacetResult[] }> {
  const baseSchema = searchResultSchema(itemSchema);

  return createSchema((data: unknown) => {
    const base = baseSchema.parse(data);
    const obj = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      ...base,
      facets: Array.isArray(obj.facets)
        ? obj.facets.map((f) => facetResultSchema.parse(f))
        : undefined,
    };
  });
}

// ============================================================================
// URL Query Parameter Schemas
// ============================================================================

export interface UrlSearchParams {
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
  filters?: string;
  cursor?: string;
  fields?: string;
}

/**
 * Schema for parsing search params from URL query strings.
 * Handles string-to-type conversions for URL parameters.
 */
export const urlSearchParamsSchema: Schema<UrlSearchParams> = createSchema((data: unknown) => {
  const obj = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  let page: number | undefined;
  if (obj.page !== undefined) {
    const parsed = Number(obj.page);
    if (!isNaN(parsed) && Number.isInteger(parsed) && parsed >= 1) {
      page = parsed;
    }
  }

  let limit: number | undefined;
  if (obj.limit !== undefined) {
    const parsed = Number(obj.limit);
    if (
      !isNaN(parsed) &&
      Number.isInteger(parsed) &&
      parsed >= 1 &&
      parsed <= SEARCH_DEFAULTS.MAX_LIMIT
    ) {
      limit = parsed;
    }
  }

  return {
    q: typeof obj.q === 'string' ? obj.q : undefined,
    page,
    limit,
    sort: typeof obj.sort === 'string' ? obj.sort : undefined,
    filters: typeof obj.filters === 'string' ? obj.filters : undefined,
    cursor: typeof obj.cursor === 'string' ? obj.cursor : undefined,
    fields: typeof obj.fields === 'string' ? obj.fields : undefined,
  };
});

export type UrlSearchParamsInput = UrlSearchParams;
