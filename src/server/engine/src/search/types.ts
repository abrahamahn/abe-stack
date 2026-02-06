// backend/engine/src/search/types.ts
/**
 * Search Provider Types
 *
 * Server-side interfaces for search providers.
 * Extends the core types with server-specific functionality.
 *
 * @module @abe-stack/server-engine/search
 */

import type {
  CursorSearchResult,
  FacetedSearchQuery,
  FacetedSearchResult,
  SearchCapabilities,
  SearchQuery,
  SearchResult,
} from '@abe-stack/shared';

// ============================================================================
// SQL Table/Column Types
// ============================================================================

/**
 * Column mapping for SQL queries.
 */
export interface SqlColumnMapping {
  /** Source field name (from query) */
  field: string;
  /** Target column name (in database) */
  column: string;
  /** Column type for proper escaping */
  type?: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array';
  /** Is this column sortable? */
  sortable?: boolean;
  /** Is this column filterable? */
  filterable?: boolean;
  /** Custom SQL expression for the column */
  expression?: string;
}

/**
 * Table configuration for SQL search.
 */
export interface SqlTableConfig {
  /** Table name */
  table: string;
  /** Primary key column(s) */
  primaryKey: string | string[];
  /** Column mappings */
  columns: SqlColumnMapping[];
  /** Columns to include in text search */
  searchColumns?: string[];
  /** Default sort configuration */
  defaultSort?: { column: string; order: 'asc' | 'desc' };
}

// ============================================================================
// Provider Configuration
// ============================================================================

/**
 * Base configuration for search providers.
 */
export interface SearchProviderConfig {
  /** Provider name for logging (defaults to provider type if not specified) */
  name?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable query logging */
  logging?: boolean;
}

/**
 * SQL provider configuration.
 */
export interface SqlSearchProviderConfig extends SearchProviderConfig {
  /** Maximum query complexity (depth of nested filters) */
  maxQueryDepth?: number;
  /** Maximum number of filter conditions */
  maxConditions?: number;
  /** Default page size */
  defaultPageSize?: number;
  /** Maximum page size */
  maxPageSize?: number;
}

/**
 * Elasticsearch provider configuration.
 */
export interface ElasticsearchProviderConfig extends SearchProviderConfig {
  /** Elasticsearch node URL */
  node: string;
  /** Index name or pattern */
  index: string;
  /** Authentication */
  auth?: {
    username: string;
    password: string;
  };
  /** API key authentication */
  apiKey?: string;
  /** Use SSL/TLS */
  tls?: boolean;
  /** Request timeout for ES queries */
  requestTimeout?: number;
}

// ============================================================================
// Search Context
// ============================================================================

/**
 * Search execution context with request metadata.
 */
export interface SearchContext {
  /** Request ID for tracing */
  requestId?: string;
  /** User ID for permission filtering */
  userId?: string;
  /** Tenant ID for multi-tenant queries */
  tenantId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Search Provider Interface
// ============================================================================

/**
 * Server-side search provider interface.
 * Implements the core SearchProvider with additional server functionality.
 */
export interface ServerSearchProvider<T = Record<string, unknown>> {
  /** Provider name */
  readonly name: string;

  /**
   * Get provider capabilities.
   *
   * @returns Search capabilities supported by this provider.
   */
  getCapabilities(): SearchCapabilities;

  /**
   * Execute a search query with offset pagination.
   *
   * @param query - Search query with filters, pagination, sorting.
   * @param context - Optional execution context for tracing and permissions.
   * @returns Paginated search results.
   */
  search(query: SearchQuery<T>, context?: SearchContext): Promise<SearchResult<T>>;

  /**
   * Execute a search query with cursor pagination.
   *
   * @param query - Search query with cursor-based pagination.
   * @param context - Optional execution context.
   * @returns Cursor-paginated search results.
   */
  searchWithCursor(query: SearchQuery<T>, context?: SearchContext): Promise<CursorSearchResult<T>>;

  /**
   * Execute a faceted search query.
   *
   * @param query - Search query with facet configuration.
   * @param context - Optional execution context.
   * @returns Faceted search results with bucket counts.
   */
  searchFaceted(
    query: FacetedSearchQuery<T>,
    context?: SearchContext,
  ): Promise<FacetedSearchResult<T>>;

  /**
   * Count matching results without fetching data.
   *
   * @param query - Search query to count matches for.
   * @param context - Optional execution context.
   * @returns Number of matching records.
   */
  count(query: SearchQuery<T>, context?: SearchContext): Promise<number>;

  /**
   * Check if the provider is healthy/available.
   *
   * @returns `true` if the provider can handle requests.
   */
  healthCheck(): Promise<boolean>;

  /**
   * Close the provider and release resources.
   */
  close(): Promise<void>;
}

// ============================================================================
// Search Provider Factory
// ============================================================================

/**
 * Provider type identifiers.
 */
export type SearchProviderType = 'sql' | 'elasticsearch' | 'memory';

/**
 * Factory options for creating search providers.
 */
export interface SearchProviderFactoryOptions {
  /** Provider type */
  type: SearchProviderType;
  /** Provider configuration */
  config: SearchProviderConfig | SqlSearchProviderConfig | ElasticsearchProviderConfig;
}

// ============================================================================
// SQL-Specific Types
// ============================================================================

/**
 * SQL query execution options.
 */
export interface SqlQueryOptions {
  /** Execute as a prepared statement */
  prepared?: boolean;
  /** Query timeout in milliseconds */
  timeout?: number;
  /** Include EXPLAIN output (for debugging) */
  explain?: boolean;
}
