/**
 * Filter operators for search queries
 */
export enum FilterOperator {
  EQUALS = "equals",
  NOT_EQUALS = "not_equals",
  GREATER_THAN = "greater_than",
  GREATER_THAN_OR_EQUAL = "greater_than_or_equal",
  LESS_THAN = "less_than",
  LESS_THAN_OR_EQUAL = "less_than_or_equal",
  CONTAINS = "contains",
  NOT_CONTAINS = "not_contains",
  STARTS_WITH = "starts_with",
  ENDS_WITH = "ends_with",
  IN = "in",
  NOT_IN = "not_in",
  EXISTS = "exists",
  NOT_EXISTS = "not_exists",
  RANGE = "range",
}

/**
 * Sort direction for search results
 */
export enum SortDirection {
  ASC = "asc",
  DESC = "desc",
}

/**
 * Search filter definition
 */
export interface SearchFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Sort option definition
 */
export interface SortOption {
  field: string;
  direction: SortDirection;
}

/**
 * Search options for queries
 */
export interface SearchOptions {
  filters?: SearchFilter[];
  sort?: SortOption[];
  page?: number;
  pageSize?: number;
  fields?: string[] | null;
  explain?: boolean;
  highlight?: boolean;
  aggregations?: Record<string, unknown>;
}

/**
 * Search results structure
 */
export interface SearchResults<T> {
  hits: T[];
  total: number;
  took: number;
  page: number;
  pageSize: number;
  totalPages: number;
  aggregations?: Record<string, unknown>;
  explanation?: unknown;
}

/**
 * Index configuration
 */
export interface IndexConfig {
  name: string;
  mappings?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  aliases?: string[];
}

/**
 * Search provider interface
 */
export interface ISearchProvider {
  /**
   * Initialize the search provider
   */
  initialize(): Promise<void>;

  /**
   * Create a new search index
   */
  createIndex(config: IndexConfig): Promise<void>;

  /**
   * Delete an existing index
   */
  deleteIndex(indexName: string): Promise<void>;

  /**
   * Add or update a document in the index
   */
  indexDocument<T>(indexName: string, id: string, document: T): Promise<void>;

  /**
   * Add or update multiple documents in the index
   */
  bulkIndexDocuments<T>(
    indexName: string,
    documents: Array<{ id: string; document: T }>
  ): Promise<void>;

  /**
   * Remove a document from the index
   */
  removeDocument(indexName: string, id: string): Promise<void>;

  /**
   * Search for documents in the index
   */
  search<T>(
    indexName: string,
    query: string,
    options?: SearchOptions
  ): Promise<SearchResults<T>>;

  /**
   * Get a document by ID
   */
  getDocument<T>(indexName: string, id: string): Promise<T | null>;

  /**
   * Close the search provider
   */
  close(): Promise<void>;
}
