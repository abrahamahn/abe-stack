// shared/core/src/infrastructure/search/types.ts
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
  StartsWith: 'startsWith',
  EndsWith: 'endsWith',
  LIKE: 'like',
  ILIKE: 'ilike',

  // Array operations
  IN: 'in',
  NotIn: 'notIn',

  // Null checks
  IsNull: 'isNull',
  IsNotNull: 'isNotNull',

  // Range
  BETWEEN: 'between',

  // Array field operations
  ArrayContains: 'arrayContains',
  ArrayContainsAny: 'arrayContainsAny',

  // Full-text search
  FullText: 'fullText',
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
  caseSensitive?: boolean | undefined;
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
  nulls?: 'first' | 'last' | undefined;
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
  fields?: string[] | undefined;
  /** Fuzzy matching threshold (0-1, lower = more strict) */
  fuzziness?: number | undefined;
  /** Highlight matching terms in results */
  highlight?: boolean | undefined;
  /** Prefix length for highlighting */
  highlightPrefix?: string | undefined;
  /** Suffix length for highlighting */
  highlightSuffix?: string | undefined;
}

// ============================================================================
// Search Query
// ============================================================================

/**
 * Complete search query configuration.
 */
export interface SearchQuery<T = Record<string, unknown>> {
  /** Filter conditions */
  filters?: FilterCondition<T> | CompoundFilter<T> | undefined;
  /** Sort configuration (array for multi-sort) */
  sort?: SortConfig<T>[] | undefined;
  /** Full-text search configuration */
  search?: FullTextSearchConfig | undefined;
  /** Pagination: page number (1-indexed) */
  page?: number | undefined;
  /** Pagination: items per page */
  limit?: number | undefined;
  /** Cursor for cursor-based pagination */
  cursor?: string | undefined;
  /** Select specific fields */
  select?: Array<keyof T | string> | undefined;
  /** Include total count in response */
  includeCount?: boolean | undefined;
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
  score?: number | undefined;
  /** Highlighted fields (if highlight enabled) */
  highlights?: HighlightedField[] | undefined;
}

/**
 * Paginated search results (offset-based).
 */
export interface SearchResult<T> {
  /** Result items */
  data: SearchResultItem<T>[];
  /** Total count (if includeCount=true) */
  total?: number | undefined;
  /** Current page */
  page: number;
  /** Items per page */
  limit: number;
  /** Has next page */
  hasNext: boolean;
  /** Has previous page */
  hasPrev: boolean;
  /** Total pages (if total is known) */
  totalPages?: number | undefined;
  /** Query execution time in ms */
  executionTime?: number | undefined;
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
  total?: number | undefined;
  /** Query execution time in ms */
  executionTime?: number | undefined;
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
  selected?: boolean | undefined;
}

/**
 * Facet configuration for a field.
 */
export interface FacetConfig {
  /** Field to aggregate on */
  field: string;
  /** Maximum number of buckets */
  size?: number | undefined;
  /** Sort buckets by count or value */
  sortBy?: 'count' | 'value' | undefined;
  /** Sort order for buckets */
  sortOrder?: SortOrder | undefined;
  /** Include missing values bucket */
  includeMissing?: boolean | undefined;
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
  totalUnique?: number | undefined;
}

/**
 * Extended search query with facet support.
 */
export interface FacetedSearchQuery<T = Record<string, unknown>> extends SearchQuery<T> {
  /** Facet configurations */
  facets?: FacetConfig[] | undefined;
}

/**
 * Faceted search result.
 */
export interface FacetedSearchResult<T> extends SearchResult<T> {
  /** Facet results */
  facets?: FacetResult[] | undefined;
}
