// packages/core/src/domains/search/types.ts
/**
 * Search & Filtering Core Types
 *
 * Type definitions for the search and filtering system.
 * Supports type-safe filtering, sorting, and full-text search.
 */

// ============================================================================
// Filter Operators
// ============================================================================

/**
 * Comparison operators for filtering.
 */
export const FILTER_OPERATORS = Object.freeze({
  // Equality
  EQ: 'eq',
  NEQ: 'neq',

  // Comparison
  GT: 'gt',
  GTE: 'gte',
  LT: 'lt',
  LTE: 'lte',

  // String operations
  CONTAINS: 'contains',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith',
  LIKE: 'like',
  ILIKE: 'ilike',

  // Array operations
  IN: 'in',
  NOT_IN: 'notIn',

  // Null checks
  IS_NULL: 'isNull',
  IS_NOT_NULL: 'isNotNull',

  // Range
  BETWEEN: 'between',

  // Array field operations
  ARRAY_CONTAINS: 'arrayContains',
  ARRAY_CONTAINS_ANY: 'arrayContainsAny',

  // Full-text search
  FULL_TEXT: 'fullText',
} as const);

export type FilterOperator = (typeof FILTER_OPERATORS)[keyof typeof FILTER_OPERATORS];

/**
 * Logical operators for combining conditions.
 */
export const LOGICAL_OPERATORS = {
  AND: 'and',
  OR: 'or',
  NOT: 'not',
} as const;

export type LogicalOperator = (typeof LOGICAL_OPERATORS)[keyof typeof LOGICAL_OPERATORS];

// ============================================================================
// Filter Values
// ============================================================================

/**
 * Primitive value types for filtering.
 */
export type FilterPrimitive = string | number | boolean | Date | null;

/**
 * Value types for filter conditions.
 */
export type FilterValue =
  | FilterPrimitive
  | FilterPrimitive[]
  | { min: FilterPrimitive; max: FilterPrimitive };

// ============================================================================
// Filter Conditions
// ============================================================================

/**
 * Single filter condition on a field.
 */
export interface FilterCondition<T = Record<string, unknown>> {
  /** Field path (supports dot notation for nested fields) */
  field: keyof T | string;
  /** Filter operator */
  operator: FilterOperator;
  /** Value to compare against */
  value: FilterValue;
  /** Case-insensitive comparison (for string operators) */
  caseSensitive?: boolean;
}

/**
 * Compound filter with logical operators.
 */
export interface CompoundFilter<T = Record<string, unknown>> {
  /** Logical operator to combine conditions */
  operator: LogicalOperator;
  /** Array of conditions or nested compound filters */
  conditions: Array<FilterCondition<T> | CompoundFilter<T>>;
}

/**
 * Type guard for FilterCondition.
 */
export function isFilterCondition<T>(
  filter: FilterCondition<T> | CompoundFilter<T>,
): filter is FilterCondition<T> {
  return 'field' in filter && 'value' in filter;
}

/**
 * Type guard for CompoundFilter.
 */
export function isCompoundFilter<T>(
  filter: FilterCondition<T> | CompoundFilter<T>,
): filter is CompoundFilter<T> {
  return 'conditions' in filter && Array.isArray(filter.conditions);
}

// ============================================================================
// Sort Configuration
// ============================================================================

/**
 * Sort order direction.
 */
export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortOrder = (typeof SORT_ORDER)[keyof typeof SORT_ORDER];

/**
 * Sort configuration for a single field.
 */
export interface SortConfig<T = Record<string, unknown>> {
  /** Field to sort by */
  field: keyof T | string;
  /** Sort direction */
  order: SortOrder;
  /** Nulls first or last */
  nulls?: 'first' | 'last';
}

// ============================================================================
// Full-Text Search
// ============================================================================

/**
 * Full-text search configuration.
 */
export interface FullTextSearchConfig {
  /** Search query string */
  query: string;
  /** Fields to search in (empty = all searchable fields) */
  fields?: string[];
  /** Fuzzy matching threshold (0-1, lower = more strict) */
  fuzziness?: number;
  /** Highlight matching terms in results */
  highlight?: boolean;
  /** Prefix length for highlighting */
  highlightPrefix?: string;
  /** Suffix length for highlighting */
  highlightSuffix?: string;
}

// ============================================================================
// Search Query
// ============================================================================

/**
 * Complete search query configuration.
 */
export interface SearchQuery<T = Record<string, unknown>> {
  /** Filter conditions */
  filters?: FilterCondition<T> | CompoundFilter<T>;
  /** Sort configuration (array for multi-sort) */
  sort?: SortConfig<T>[];
  /** Full-text search configuration */
  search?: FullTextSearchConfig;
  /** Pagination: page number (1-indexed) */
  page?: number;
  /** Pagination: items per page */
  limit?: number;
  /** Cursor for cursor-based pagination */
  cursor?: string;
  /** Select specific fields */
  select?: Array<keyof T | string>;
  /** Include total count in response */
  includeCount?: boolean;
}

// ============================================================================
// Search Results
// ============================================================================

/**
 * Highlighted field in search results.
 */
export interface HighlightedField {
  /** Field name */
  field: string;
  /** Highlighted text with markers */
  highlighted: string;
  /** Original text */
  original: string;
}

/**
 * Search result item with optional metadata.
 */
export interface SearchResultItem<T> {
  /** The matched item */
  item: T;
  /** Relevance score (for full-text search) */
  score?: number;
  /** Highlighted fields (if highlight enabled) */
  highlights?: HighlightedField[];
}

/**
 * Paginated search results (offset-based).
 */
export interface SearchResult<T> {
  /** Result items */
  data: SearchResultItem<T>[];
  /** Total count (if includeCount=true) */
  total?: number;
  /** Current page */
  page: number;
  /** Items per page */
  limit: number;
  /** Has next page */
  hasNext: boolean;
  /** Has previous page */
  hasPrev: boolean;
  /** Total pages (if total is known) */
  totalPages?: number;
  /** Query execution time in ms */
  executionTime?: number;
}

/**
 * Cursor-based search results.
 */
export interface CursorSearchResult<T> {
  /** Result items */
  data: SearchResultItem<T>[];
  /** Next page cursor (null if no more pages) */
  nextCursor: string | null;
  /** Previous page cursor (null if at start) */
  prevCursor: string | null;
  /** Has next page */
  hasNext: boolean;
  /** Has previous page */
  hasPrev: boolean;
  /** Items per page */
  limit: number;
  /** Total count (if includeCount=true) */
  total?: number;
  /** Query execution time in ms */
  executionTime?: number;
}

// ============================================================================
// Search Provider Interface
// ============================================================================

/**
 * Search provider capabilities.
 */
export interface SearchCapabilities {
  /** Supports full-text search */
  fullTextSearch: boolean;
  /** Supports fuzzy matching */
  fuzzyMatching: boolean;
  /** Supports highlighting */
  highlighting: boolean;
  /** Supports nested field filtering */
  nestedFields: boolean;
  /** Supports array field operations */
  arrayOperations: boolean;
  /** Supports cursor pagination */
  cursorPagination: boolean;
  /** Maximum results per page */
  maxPageSize: number;
  /** Supported filter operators */
  supportedOperators: FilterOperator[];
}

/**
 * Search provider interface for implementing different backends.
 */
export interface SearchProvider<T = Record<string, unknown>> {
  /** Provider name */
  readonly name: string;

  /** Get provider capabilities */
  getCapabilities(): SearchCapabilities;

  /**
   * Execute a search query with offset pagination.
   */
  search(query: SearchQuery<T>): Promise<SearchResult<T>>;

  /**
   * Execute a search query with cursor pagination.
   */
  searchWithCursor?(query: SearchQuery<T>): Promise<CursorSearchResult<T>>;

  /**
   * Count matching results without fetching data.
   */
  count(query: SearchQuery<T>): Promise<number>;

  /**
   * Check if the provider is healthy/available.
   */
  healthCheck(): Promise<boolean>;
}

// ============================================================================
// Faceted Search
// ============================================================================

/**
 * Facet bucket for aggregating results.
 */
export interface FacetBucket {
  /** Facet value */
  value: FilterPrimitive;
  /** Count of items with this value */
  count: number;
  /** Optional: is this bucket selected in current query */
  selected?: boolean;
}

/**
 * Facet configuration for a field.
 */
export interface FacetConfig {
  /** Field to aggregate on */
  field: string;
  /** Maximum number of buckets */
  size?: number;
  /** Sort buckets by count or value */
  sortBy?: 'count' | 'value';
  /** Sort order for buckets */
  sortOrder?: SortOrder;
  /** Include missing values bucket */
  includeMissing?: boolean;
}

/**
 * Facet result for a field.
 */
export interface FacetResult {
  /** Field name */
  field: string;
  /** Buckets with counts */
  buckets: FacetBucket[];
  /** Total unique values */
  totalUnique?: number;
}

/**
 * Extended search query with facet support.
 */
export interface FacetedSearchQuery<T = Record<string, unknown>> extends SearchQuery<T> {
  /** Facet configurations */
  facets?: FacetConfig[];
}

/**
 * Faceted search result.
 */
export interface FacetedSearchResult<T> extends SearchResult<T> {
  /** Facet results */
  facets?: FacetResult[];
}
