// main/shared/src/system/search/schemas.ts
/**
 * Search & Filtering Validation Schemas
 *
 * Validation schemas for search queries, filters, and results.
 * Used for API validation and type inference.
 */

import { createSchema } from '../../primitives/schema';
import { FILTER_OPERATORS, LOGICAL_OPERATORS, SEARCH_DEFAULTS } from '../constants/limits';
import { sortOrderSchema } from '../pagination/pagination';

import type {
    CompoundFilter,
    CursorSearchResult,
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
} from './types';
import type { Schema } from '../../primitives/schema';

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
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid range value');
  }
  const obj = data as Record<string, unknown>;
  return {
    min: filterPrimitiveSchema.parse(obj['min']),
    max: filterPrimitiveSchema.parse(obj['max']),
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
  if (
    data !== null &&
    data !== undefined &&
    typeof data === 'object' &&
    'min' in data &&
    'max' in data
  ) {
    return rangeValueSchema.parse(data);
  }
  // Try as primitive
  return filterPrimitiveSchema.parse(data);
});

// ============================================================================
// Filter Condition Schemas
// ============================================================================

/** Operators that require no meaningful value (nullary checks) */
const NULLARY_OPERATORS = new Set(['isNull', 'isNotNull']);

/** Operators that require a { min, max } range value */
const RANGE_OPERATORS = new Set(['between']);

/** Operators that require an array value */
const ARRAY_OPERATORS = new Set(['in', 'notIn', 'arrayContains', 'arrayContainsAny']);

/** Operators that require a string value */
const STRING_OPERATORS = new Set(['contains', 'startsWith', 'endsWith', 'like', 'ilike', 'fullText']);

/**
 * Schema for a single filter condition.
 * Cross-validates operator and value compatibility.
 */
export const filterConditionSchema: Schema<FilterCondition> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid filter condition');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj['field'] !== 'string' || obj['field'].length < 1) {
    throw new Error('Filter field must be a non-empty string');
  }

  const operator = filterOperatorSchema.parse(obj['operator']);
  const value = NULLARY_OPERATORS.has(operator)
    ? (obj['value'] ?? null)
    : filterValueSchema.parse(obj['value']);

  // Cross-validate operator/value compatibility
  if (RANGE_OPERATORS.has(operator)) {
    if (value === null || typeof value !== 'object' || Array.isArray(value) || !('min' in value)) {
      throw new Error(`Operator "${operator}" requires a { min, max } range value`);
    }
  } else if (ARRAY_OPERATORS.has(operator)) {
    if (!Array.isArray(value)) {
      throw new Error(`Operator "${operator}" requires an array value`);
    }
  } else if (STRING_OPERATORS.has(operator)) {
    if (typeof value !== 'string') {
      throw new Error(`Operator "${operator}" requires a string value`);
    }
  }

  const result: FilterCondition = {
    field: obj['field'],
    operator,
    value: value as FilterCondition['value'],
  };
  if (typeof obj['caseSensitive'] === 'boolean') {
    result.caseSensitive = obj['caseSensitive'];
  }
  return result;
});

/**
 * Recursive schema for compound filters.
 */
export const compoundFilterSchema: Schema<CompoundFilter> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid compound filter');
  }
  const obj = data as Record<string, unknown>;

  const operator = logicalOperatorSchema.parse(obj['operator']);

  if (!Array.isArray(obj['conditions']) || obj['conditions'].length < 1) {
    throw new Error('Compound filter must have at least one condition');
  }

  const conditions = obj['conditions'].map((cond) => {
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
    if (data === null || data === undefined || typeof data !== 'object') {
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

export { sortOrderSchema };

/**
 * Schema for sort configuration.
 */
export const sortConfigSchema: Schema<SortConfig> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid sort config');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj['field'] !== 'string' || obj['field'].length < 1) {
    throw new Error('Sort field must be a non-empty string');
  }

  const result: SortConfig = {
    field: obj['field'],
    order: sortOrderSchema.parse(obj['order']),
  };
  if (obj['nulls'] === 'first' || obj['nulls'] === 'last') {
    result.nulls = obj['nulls'];
  }
  return result;
});

// ============================================================================
// Full-Text Search Schema
// ============================================================================

/**
 * Schema for full-text search configuration.
 */
export const fullTextSearchConfigSchema: Schema<FullTextSearchConfig> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid full-text search config');
    }
    const obj = data as Record<string, unknown>;

    if (typeof obj['query'] !== 'string' || obj['query'].length < 1 || obj['query'].length > 1000) {
      throw new Error('Search query must be 1-1000 characters');
    }

    // Validate fuzziness if provided
    let fuzziness: number | undefined;
    if (obj['fuzziness'] !== undefined) {
      if (typeof obj['fuzziness'] !== 'number' || obj['fuzziness'] < 0 || obj['fuzziness'] > 1) {
        throw new Error('fuzziness must be a number between 0 and 1');
      }
      fuzziness = obj['fuzziness'];
    }

    const result: FullTextSearchConfig = {
      query: obj['query'],
    };
    if (Array.isArray(obj['fields'])) {
      result.fields = obj['fields'];
    }
    if (fuzziness !== undefined) {
      result.fuzziness = fuzziness;
    }
    if (typeof obj['highlight'] === 'boolean') {
      result.highlight = obj['highlight'];
    }
    if (typeof obj['highlightPrefix'] === 'string') {
      result.highlightPrefix = obj['highlightPrefix'];
    }
    if (typeof obj['highlightSuffix'] === 'string') {
      result.highlightSuffix = obj['highlightSuffix'];
    }
    return result;
  },
);

// ============================================================================
// Search Query Schema
// ============================================================================

/**
 * Schema for search query.
 */
export const searchQuerySchema: Schema<SearchQuery> = createSchema((data: unknown) => {
  const obj = (
    data !== null && data !== undefined && typeof data === 'object' ? data : {}
  ) as Record<string, unknown>;

  // Parse filters if present
  let filters: FilterCondition | CompoundFilter | undefined;
  if (obj['filters'] !== undefined) {
    filters = filterSchema.parse(obj['filters']);
  }

  // Parse sort if present
  let sort: SortConfig[] | undefined;
  if (Array.isArray(obj['sort'])) {
    sort = obj['sort'].map((s) => sortConfigSchema.parse(s));
  }

  // Parse search if present
  let search: FullTextSearchConfig | undefined;
  if (obj['search'] !== undefined) {
    search = fullTextSearchConfigSchema.parse(obj['search']);
  }

  // Parse pagination
  let page: number = SEARCH_DEFAULTS.PAGE;
  if (obj['page'] !== undefined) {
    if (typeof obj['page'] !== 'number' || !Number.isInteger(obj['page']) || obj['page'] < 1) {
      throw new Error('page must be a positive integer');
    }
    page = obj['page'];
  }

  let limit: number = SEARCH_DEFAULTS.LIMIT;
  if (typeof obj['limit'] === 'number' && Number.isInteger(obj['limit'])) {
    if (obj['limit'] < 1 || obj['limit'] > SEARCH_DEFAULTS.MAX_LIMIT) {
      throw new Error(`Limit must be between 1 and ${String(SEARCH_DEFAULTS.MAX_LIMIT)}`);
    }
    limit = obj['limit'];
  }

  const result: SearchQuery = {
    page,
    limit,
  };
  if (filters !== undefined) {
    result.filters = filters;
  }
  if (sort !== undefined) {
    result.sort = sort;
  }
  if (search !== undefined) {
    result.search = search;
  }
  if (typeof obj['cursor'] === 'string') {
    result.cursor = obj['cursor'];
  }
  if (Array.isArray(obj['select'])) {
    result.select = obj['select'] as string[];
  }
  if (typeof obj['includeCount'] === 'boolean') {
    result.includeCount = obj['includeCount'];
  }
  return result;
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
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid highlighted field');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj['field'] !== 'string') {
    throw new Error('Highlighted field must have a field name');
  }
  if (typeof obj['highlighted'] !== 'string') {
    throw new Error('Highlighted field must have highlighted text');
  }
  if (typeof obj['original'] !== 'string') {
    throw new Error('Highlighted field must have original text');
  }

  return {
    field: obj['field'],
    highlighted: obj['highlighted'],
    original: obj['original'],
  };
});

/**
 * Schema factory for search result items.
 */
export function searchResultItemSchema<T>(itemSchema: Schema<T>): Schema<SearchResultItem<T>> {
  return createSchema((data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid search result item');
    }
    const obj = data as Record<string, unknown>;

    const item = itemSchema.parse(obj['item']);

    const result: SearchResultItem<T> = { item };
    if (typeof obj['score'] === 'number') {
      result.score = obj['score'];
    }
    if (Array.isArray(obj['highlights'])) {
      result.highlights = obj['highlights'].map((h) => highlightedFieldSchema.parse(h));
    }
    return result;
  });
}

/**
 * Schema factory for paginated search results.
 */
export function searchResultSchema<T>(itemSchema: Schema<T>): Schema<SearchResult<T>> {
  const resultItemSchema = searchResultItemSchema(itemSchema);

  return createSchema((data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid search result');
    }
    const obj = data as Record<string, unknown>;

    if (!Array.isArray(obj['data'])) {
      throw new Error('Search result data must be an array');
    }

    const parsedData = obj['data'].map((item) => resultItemSchema.parse(item));

    if (typeof obj['page'] !== 'number' || obj['page'] < 1) {
      throw new Error('Page must be a positive integer');
    }
    if (typeof obj['limit'] !== 'number' || obj['limit'] < 1) {
      throw new Error('Limit must be a positive integer');
    }
    if (typeof obj['hasNext'] !== 'boolean') {
      throw new Error('hasNext must be a boolean');
    }
    if (typeof obj['hasPrev'] !== 'boolean') {
      throw new Error('hasPrev must be a boolean');
    }

    const result: SearchResult<T> = {
      data: parsedData,
      page: obj['page'],
      limit: obj['limit'],
      hasNext: obj['hasNext'],
      hasPrev: obj['hasPrev'],
    };
    if (typeof obj['total'] === 'number' && obj['total'] >= 0) {
      result.total = obj['total'];
    }
    if (typeof obj['totalPages'] === 'number' && obj['totalPages'] >= 0) {
      result.totalPages = obj['totalPages'];
    }
    if (typeof obj['executionTime'] === 'number') {
      result.executionTime = obj['executionTime'];
    }
    return result;
  });
}

/**
 * Schema factory for cursor-based search results.
 */
export function cursorSearchResultSchema<T>(itemSchema: Schema<T>): Schema<CursorSearchResult<T>> {
  const resultItemSchema = searchResultItemSchema(itemSchema);

  return createSchema((data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid cursor search result');
    }
    const obj = data as Record<string, unknown>;

    if (!Array.isArray(obj['data'])) {
      throw new Error('Search result data must be an array');
    }

    const parsedData = obj['data'].map((item) => resultItemSchema.parse(item));

    if (typeof obj['hasNext'] !== 'boolean') {
      throw new Error('hasNext must be a boolean');
    }
    if (typeof obj['hasPrev'] !== 'boolean') {
      throw new Error('hasPrev must be a boolean');
    }
    if (typeof obj['limit'] !== 'number' || obj['limit'] < 1) {
      throw new Error('Limit must be a positive integer');
    }

    const result: CursorSearchResult<T> = {
      data: parsedData,
      nextCursor:
        obj['nextCursor'] === null || typeof obj['nextCursor'] === 'string'
          ? obj['nextCursor']
          : null,
      prevCursor:
        obj['prevCursor'] === null || typeof obj['prevCursor'] === 'string'
          ? obj['prevCursor']
          : null,
      hasNext: obj['hasNext'],
      hasPrev: obj['hasPrev'],
      limit: obj['limit'],
    };
    if (typeof obj['total'] === 'number' && obj['total'] >= 0) {
      result.total = obj['total'];
    }
    if (typeof obj['executionTime'] === 'number') {
      result.executionTime = obj['executionTime'];
    }
    return result;
  });
}

// ============================================================================
// Facet Schemas
// ============================================================================

/**
 * Schema for facet bucket.
 */
export const facetBucketSchema: Schema<FacetBucket> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid facet bucket');
  }
  const obj = data as Record<string, unknown>;

  const result: FacetBucket = {
    value: filterPrimitiveSchema.parse(obj['value']),
    count: typeof obj['count'] === 'number' && Number.isInteger(obj['count']) ? obj['count'] : 0,
  };
  if (typeof obj['selected'] === 'boolean') {
    result.selected = obj['selected'];
  }
  return result;
});

/**
 * Schema for facet configuration.
 */
export const facetConfigSchema: Schema<FacetConfig> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid facet config');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj['field'] !== 'string' || obj['field'].length < 1) {
    throw new Error('Facet field must be a non-empty string');
  }

  // Validate size if provided
  let size: number | undefined;
  if (obj['size'] !== undefined) {
    if (
      typeof obj['size'] !== 'number' ||
      !Number.isInteger(obj['size']) ||
      obj['size'] < 1 ||
      obj['size'] > 100
    ) {
      throw new Error('Facet size must be an integer between 1 and 100');
    }
    size = obj['size'];
  }

  const result: FacetConfig = {
    field: obj['field'],
  };
  if (size !== undefined) {
    result.size = size;
  }
  if (obj['sortBy'] === 'count' || obj['sortBy'] === 'value') {
    result.sortBy = obj['sortBy'];
  }
  if (obj['sortOrder'] === 'asc' || obj['sortOrder'] === 'desc') {
    result.sortOrder = obj['sortOrder'] as SortOrder;
  }
  if (typeof obj['includeMissing'] === 'boolean') {
    result.includeMissing = obj['includeMissing'];
  }
  return result;
});

/**
 * Schema for facet result.
 */
export const facetResultSchema: Schema<FacetResult> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid facet result');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj['field'] !== 'string') {
    throw new Error('Facet result must have a field');
  }

  if (!Array.isArray(obj['buckets'])) {
    throw new Error('Facet result must have buckets array');
  }

  const result: FacetResult = {
    field: obj['field'],
    buckets: obj['buckets'].map((b) => facetBucketSchema.parse(b)),
  };
  if (typeof obj['totalUnique'] === 'number') {
    result.totalUnique = obj['totalUnique'];
  }
  return result;
});

/**
 * Schema for faceted search query.
 */
export const facetedSearchQuerySchema: Schema<FacetedSearchQuery> = createSchema(
  (data: unknown) => {
    const base = searchQuerySchema.parse(data);
    const obj = (
      data !== null && data !== undefined && typeof data === 'object' ? data : {}
    ) as Record<string, unknown>;

    const result: FacetedSearchQuery = { ...base };
    if (Array.isArray(obj['facets'])) {
      result.facets = (obj['facets'] as unknown[]).map((f) => facetConfigSchema.parse(f));
    }
    return result;
  },
);

/**
 * Schema factory for faceted search results.
 */
export function facetedSearchResultSchema<T>(
  itemSchema: Schema<T>,
): Schema<SearchResult<T> & { facets?: FacetResult[] | undefined }> {
  const baseSchema = searchResultSchema(itemSchema);

  return createSchema((data: unknown) => {
    const base = baseSchema.parse(data);
    const obj = (
      data !== null && data !== undefined && typeof data === 'object' ? data : {}
    ) as Record<string, unknown>;

    const result: SearchResult<T> & { facets?: FacetResult[] } = { ...base };
    if (Array.isArray(obj['facets'])) {
      result.facets = obj['facets'].map((f) => facetResultSchema.parse(f));
    }
    return result;
  });
}

// ============================================================================
// URL Query Parameter Schemas
// ============================================================================

export interface UrlSearchParams {
  q?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  sort?: string | undefined;
  filters?: string | undefined;
  cursor?: string | undefined;
  fields?: string | undefined;
}

/**
 * Schema for parsing search params from URL query strings.
 * Handles string-to-type conversions for URL parameters.
 */
export const urlSearchParamsSchema: Schema<UrlSearchParams> = createSchema((data: unknown) => {
  const obj = (
    data !== null && data !== undefined && typeof data === 'object' ? data : {}
  ) as Record<string, unknown>;

  let page: number | undefined;
  if (obj['page'] !== undefined) {
    const parsed = Number(obj['page']);
    if (!isNaN(parsed) && Number.isInteger(parsed) && parsed >= 1) {
      page = parsed;
    }
  }

  let limit: number | undefined;
  if (obj['limit'] !== undefined) {
    const parsed = Number(obj['limit']);
    if (
      !isNaN(parsed) &&
      Number.isInteger(parsed) &&
      parsed >= 1 &&
      parsed <= SEARCH_DEFAULTS.MAX_LIMIT
    ) {
      limit = parsed;
    }
  }

  const result: UrlSearchParams = {};
  if (typeof obj['q'] === 'string') {
    result.q = obj['q'];
  }
  if (page !== undefined) {
    result.page = page;
  }
  if (limit !== undefined) {
    result.limit = limit;
  }
  if (typeof obj['sort'] === 'string') {
    result.sort = obj['sort'];
  }
  if (typeof obj['filters'] === 'string') {
    result.filters = obj['filters'];
  }
  if (typeof obj['cursor'] === 'string') {
    result.cursor = obj['cursor'];
  }
  if (typeof obj['fields'] === 'string') {
    result.fields = obj['fields'];
  }
  return result;
});

export type UrlSearchParamsInput = UrlSearchParams;
