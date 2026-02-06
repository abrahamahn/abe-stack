// backend/engine/src/search/elastic.ts
/**
 * Elasticsearch Search Provider (Stub)
 *
 * Placeholder for future Elasticsearch integration.
 * Implements the ServerSearchProvider interface with not-implemented errors.
 *
 * @module
 */

import {
  FILTER_OPERATORS,
  SearchProviderUnavailableError,
  type CursorSearchResult,
  type FacetedSearchQuery,
  type FacetedSearchResult,
  type FilterOperator,
  type SearchCapabilities,
  type SearchQuery,
  type SearchResult,
} from '@abe-stack/shared';

import type { ElasticsearchProviderConfig, SearchContext, ServerSearchProvider } from './types';

// ============================================================================
// Constants
// ============================================================================

const SUPPORTED_OPERATORS: FilterOperator[] = [
  FILTER_OPERATORS.EQ,
  FILTER_OPERATORS.NEQ,
  FILTER_OPERATORS.GT,
  FILTER_OPERATORS.GTE,
  FILTER_OPERATORS.LT,
  FILTER_OPERATORS.LTE,
  FILTER_OPERATORS.CONTAINS,
  FILTER_OPERATORS.StartsWith,
  FILTER_OPERATORS.EndsWith,
  FILTER_OPERATORS.IN,
  FILTER_OPERATORS.NotIn,
  FILTER_OPERATORS.IsNull,
  FILTER_OPERATORS.IsNotNull,
  FILTER_OPERATORS.BETWEEN,
  FILTER_OPERATORS.FullText,
  FILTER_OPERATORS.ArrayContains,
  FILTER_OPERATORS.ArrayContainsAny,
];

// ============================================================================
// Elasticsearch Search Provider
// ============================================================================

/**
 * Elasticsearch search provider.
 *
 * This is a stub implementation for future Elasticsearch integration.
 * To implement, add the @elastic/elasticsearch package and implement
 * the search methods using the Elasticsearch client.
 *
 * @example Future implementation:
 * ```typescript
 * import { Client } from '@elastic/elasticsearch';
 *
 * export class ElasticsearchProvider<T> implements ServerSearchProvider<T> {
 *   private client: Client;
 *
 *   constructor(config: ElasticsearchProviderConfig) {
 *     this.client = new Client({
 *       node: config.node,
 *       auth: config.auth,
 *     });
 *   }
 *
 *   async search(query: SearchQuery<T>): Promise<SearchResult<T>> {
 *     const response = await this.client.search({
 *       index: this.config.index,
 *       body: this.buildElasticsearchQuery(query),
 *     });
 *     return this.transformResponse(response);
 *   }
 * }
 * ```
 */
export class ElasticsearchProvider<
  TRecord = Record<string, unknown>,
> implements ServerSearchProvider<TRecord> {
  readonly name: string;
  private readonly _config: ElasticsearchProviderConfig;
  private connected = false;

  /**
   * Create a new Elasticsearch provider.
   *
   * @param config - Elasticsearch provider configuration.
   */
  constructor(config: ElasticsearchProviderConfig) {
    this.name = config.name ?? 'elasticsearch';
    this._config = config;
  }

  /**
   * Get the provider configuration.
   *
   * @returns The Elasticsearch provider configuration.
   */
  getConfig(): Readonly<ElasticsearchProviderConfig> {
    return this._config;
  }

  /**
   * Reject with a not-implemented error for stub methods.
   *
   * @param method - Name of the unimplemented method.
   * @returns A rejected promise with SearchProviderUnavailableError.
   */
  private throwNotImplementedAsync(method: string): Promise<never> {
    return Promise.reject(
      new SearchProviderUnavailableError(
        this.name,
        `Elasticsearch provider method '${method}' is not yet implemented. ` +
          `To use Elasticsearch, add @elastic/elasticsearch as a dependency and implement this provider.`,
      ),
    );
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get provider capabilities.
   *
   * @returns Search capabilities supported by Elasticsearch.
   */
  getCapabilities(): SearchCapabilities {
    return {
      fullTextSearch: true,
      fuzzyMatching: true,
      highlighting: true,
      nestedFields: true,
      arrayOperations: true,
      cursorPagination: true,
      maxPageSize: 10000,
      supportedOperators: SUPPORTED_OPERATORS,
    };
  }

  /**
   * Execute a search query with offset pagination.
   *
   * @param _query - Search query with filters, pagination, sorting.
   * @param _context - Optional execution context for tracing and permissions.
   * @returns Rejected promise (not yet implemented).
   * @throws {SearchProviderUnavailableError} Always -- stub implementation.
   */
  search(_query: SearchQuery<TRecord>, _context?: SearchContext): Promise<SearchResult<TRecord>> {
    return this.throwNotImplementedAsync('search');
  }

  /**
   * Execute a search query with cursor pagination.
   *
   * @param _query - Search query with cursor-based pagination.
   * @param _context - Optional execution context.
   * @returns Rejected promise (not yet implemented).
   * @throws {SearchProviderUnavailableError} Always -- stub implementation.
   */
  searchWithCursor(
    _query: SearchQuery<TRecord>,
    _context?: SearchContext,
  ): Promise<CursorSearchResult<TRecord>> {
    return this.throwNotImplementedAsync('searchWithCursor');
  }

  /**
   * Execute a faceted search query.
   *
   * @param _query - Search query with facet configuration.
   * @param _context - Optional execution context.
   * @returns Rejected promise (not yet implemented).
   * @throws {SearchProviderUnavailableError} Always -- stub implementation.
   */
  searchFaceted(
    _query: FacetedSearchQuery<TRecord>,
    _context?: SearchContext,
  ): Promise<FacetedSearchResult<TRecord>> {
    return this.throwNotImplementedAsync('searchFaceted');
  }

  /**
   * Count matching results without fetching data.
   *
   * @param _query - Search query to count matches for.
   * @param _context - Optional execution context.
   * @returns Rejected promise (not yet implemented).
   * @throws {SearchProviderUnavailableError} Always -- stub implementation.
   */
  count(_query: SearchQuery<TRecord>, _context?: SearchContext): Promise<number> {
    return this.throwNotImplementedAsync('count');
  }

  /**
   * Check if the provider is healthy/available.
   *
   * @returns `false` since the provider is a stub.
   */
  healthCheck(): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Close the provider and release resources.
   */
  close(): Promise<void> {
    this.connected = false;
    return Promise.resolve();
  }

  // ============================================================================
  // Connection Methods (for future implementation)
  // ============================================================================

  /**
   * Connect to Elasticsearch cluster.
   *
   * @returns Rejected promise (not yet implemented).
   * @throws {SearchProviderUnavailableError} Always -- stub implementation.
   */
  connect(): Promise<void> {
    return this.throwNotImplementedAsync('connect');
  }

  /**
   * Check if connected to Elasticsearch.
   *
   * @returns `false` since the provider is a stub.
   */
  isConnected(): boolean {
    return this.connected;
  }

  // ============================================================================
  // Index Management (for future implementation)
  // ============================================================================

  /**
   * Create or update index mapping.
   *
   * @param _mapping - Index mapping configuration.
   * @returns Rejected promise (not yet implemented).
   * @throws {SearchProviderUnavailableError} Always -- stub implementation.
   */
  createIndex(_mapping: Record<string, unknown>): Promise<void> {
    return this.throwNotImplementedAsync('createIndex');
  }

  /**
   * Delete an index.
   *
   * @returns Rejected promise (not yet implemented).
   * @throws {SearchProviderUnavailableError} Always -- stub implementation.
   */
  deleteIndex(): Promise<void> {
    return this.throwNotImplementedAsync('deleteIndex');
  }

  /**
   * Check if index exists.
   *
   * @returns Rejected promise (not yet implemented).
   * @throws {SearchProviderUnavailableError} Always -- stub implementation.
   */
  indexExists(): Promise<boolean> {
    return this.throwNotImplementedAsync('indexExists');
  }

  // ============================================================================
  // Document Operations (for future implementation)
  // ============================================================================

  /**
   * Index a document.
   *
   * @param _id - Document ID.
   * @param _document - Document data.
   * @returns Rejected promise (not yet implemented).
   * @throws {SearchProviderUnavailableError} Always -- stub implementation.
   */
  indexDocument(_id: string, _document: TRecord): Promise<void> {
    return this.throwNotImplementedAsync('indexDocument');
  }

  /**
   * Bulk index documents.
   *
   * @param _documents - Array of documents with IDs.
   * @returns Rejected promise (not yet implemented).
   * @throws {SearchProviderUnavailableError} Always -- stub implementation.
   */
  bulkIndex(_documents: Array<{ id: string; document: TRecord }>): Promise<void> {
    return this.throwNotImplementedAsync('bulkIndex');
  }

  /**
   * Delete a document.
   *
   * @param _id - Document ID to delete.
   * @returns Rejected promise (not yet implemented).
   * @throws {SearchProviderUnavailableError} Always -- stub implementation.
   */
  deleteDocument(_id: string): Promise<void> {
    return this.throwNotImplementedAsync('deleteDocument');
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an Elasticsearch search provider.
 *
 * Note: This creates a stub implementation. For production use,
 * implement the actual Elasticsearch integration.
 *
 * @param config - Elasticsearch provider configuration.
 * @returns A new ElasticsearchProvider instance.
 */
export function createElasticsearchProvider<TRecord = Record<string, unknown>>(
  config: ElasticsearchProviderConfig,
): ElasticsearchProvider<TRecord> {
  return new ElasticsearchProvider<TRecord>(config);
}
