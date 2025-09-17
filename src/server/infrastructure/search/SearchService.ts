import { inject, injectable } from "inversify";

import { TYPES } from "@infrastructure/di/types";
import { generateCorrelationId } from "@infrastructure/errors";
import type { ILoggerService } from "@infrastructure/logging";
import {
  FilterOperator,
  type ISearchProvider,
  IndexConfig,
  SearchFilter,
  SearchOptions,
  SearchResults,
  SortDirection,
  SortOption,
} from "@infrastructure/search/ISearchProvider";

/**
 * Search query builder for creating search queries
 */
export class SearchQueryBuilder<T = unknown> {
  private _query: string = "";
  private _filters: SearchFilter[] = [];
  private _sort: SortOption[] = [];
  private _page: number = 1;
  private _pageSize: number = 10;
  private _fields: string[] | null = null;
  private _explain: boolean = false;

  /**
   * Set the search query
   */
  query(query: string): SearchQueryBuilder<T> {
    this._query = query;
    return this;
  }

  /**
   * Add a filter
   */
  filter(
    field: keyof T | string,
    operator: FilterOperator,
    value: unknown
  ): SearchQueryBuilder<T> {
    this._filters.push({
      field: field as string,
      operator,
      value,
    });
    return this;
  }

  /**
   * Add a sort option
   */
  sort(
    field: keyof T | string,
    direction: SortDirection = SortDirection.ASC
  ): SearchQueryBuilder<T> {
    this._sort.push({
      field: field as string,
      direction,
    });
    return this;
  }

  /**
   * Set pagination
   */
  paginate(page: number, pageSize: number): SearchQueryBuilder<T> {
    this._page = page;
    this._pageSize = pageSize;
    return this;
  }

  /**
   * Set fields to include in search
   */
  fields(fields: Array<keyof T | string> | null): SearchQueryBuilder<T> {
    this._fields = fields as string[] | null;
    return this;
  }

  /**
   * Explain the query instead of executing it
   */
  explain(enable: boolean = true): SearchQueryBuilder<T> {
    this._explain = enable;
    return this;
  }

  /**
   * Build the search options
   */
  build(): { query: string; options: SearchOptions } {
    return {
      query: this._query,
      options: {
        filters: this._filters,
        sort: this._sort,
        page: this._page,
        pageSize: this._pageSize,
        fields: this._fields,
        explain: this._explain,
      },
    };
  }
}

/**
 * Search service interface
 */
export interface ISearchService {
  /**
   * Initialize the search service
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
   * Create a query builder for the given index and document type
   */
  createQueryBuilder<T>(indexName: string): SearchQueryBuilder<T>;

  /**
   * Execute a search query using a query builder
   */
  executeQuery<T>(
    indexName: string,
    builder: SearchQueryBuilder<T>
  ): Promise<SearchResults<T>>;

  /**
   * Get a document by ID
   */
  getDocument<T>(indexName: string, id: string): Promise<T | null>;

  /**
   * Close the search service
   */
  close(): Promise<void>;
}

/**
 * Implementation of the search service
 */
@injectable()
export class SearchService implements ISearchService {
  private isInitialized = false;
  private readonly logger: ILoggerService;

  constructor(
    @inject(TYPES.LoggerService) loggerService: ILoggerService,
    @inject(TYPES.SearchProvider) private searchProvider: ISearchProvider
  ) {
    this.logger = loggerService.createLogger("SearchService");
  }

  /**
   * Initialize the search service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info("Initializing search service");
      await this.searchProvider.initialize();
      this.isInitialized = true;
      this.logger.info("Search service initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize search service", {
        error,
        correlationId: generateCorrelationId(),
      });
      throw error;
    }
  }

  /**
   * Create a new search index
   */
  async createIndex(config: IndexConfig): Promise<void> {
    await this.ensureInitialized();

    try {
      this.logger.info(`Creating search index '${config.name}'`);
      await this.searchProvider.createIndex(config);
      this.logger.info(`Search index '${config.name}' created successfully`);
    } catch (error) {
      this.logger.error(`Failed to create search index '${config.name}'`, {
        error,
        correlationId: generateCorrelationId(),
      });
      throw error;
    }
  }

  /**
   * Delete an existing index
   */
  async deleteIndex(indexName: string): Promise<void> {
    await this.ensureInitialized();

    try {
      this.logger.info(`Deleting search index '${indexName}'`);
      await this.searchProvider.deleteIndex(indexName);
      this.logger.info(`Search index '${indexName}' deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete search index '${indexName}'`, {
        error,
        correlationId: generateCorrelationId(),
      });
      throw error;
    }
  }

  /**
   * Add or update a document in the index
   */
  async indexDocument<T>(
    indexName: string,
    id: string,
    document: T
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.searchProvider.indexDocument<T>(indexName, id, document);
      this.logger.debug(`Indexed document '${id}' in index '${indexName}'`);
    } catch (error) {
      this.logger.error(
        `Failed to index document '${id}' in index '${indexName}'`,
        {
          error,
          correlationId: generateCorrelationId(),
        }
      );
      throw error;
    }
  }

  /**
   * Add or update multiple documents in the index
   */
  async bulkIndexDocuments<T>(
    indexName: string,
    documents: Array<{ id: string; document: T }>
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.searchProvider.bulkIndexDocuments<T>(indexName, documents);
      this.logger.debug(
        `Bulk indexed ${documents.length} documents in index '${indexName}'`
      );
    } catch (error) {
      this.logger.error(
        `Failed to bulk index documents in index '${indexName}'`,
        {
          error,
          count: documents.length,
          correlationId: generateCorrelationId(),
        }
      );
      throw error;
    }
  }

  /**
   * Remove a document from the index
   */
  async removeDocument(indexName: string, id: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.searchProvider.removeDocument(indexName, id);
      this.logger.debug(`Removed document '${id}' from index '${indexName}'`);
    } catch (error) {
      this.logger.error(
        `Failed to remove document '${id}' from index '${indexName}'`,
        {
          error,
          correlationId: generateCorrelationId(),
        }
      );
      throw error;
    }
  }

  /**
   * Search for documents in the index
   */
  async search<T>(
    indexName: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResults<T>> {
    await this.ensureInitialized();

    try {
      const results = await this.searchProvider.search<T>(
        indexName,
        query,
        options
      );
      this.logger.debug(
        `Search in index '${indexName}' returned ${results.total} results`,
        {
          query,
          took: results.took,
          page: results.page,
          pageSize: results.pageSize,
        }
      );
      return results;
    } catch (error) {
      this.logger.error(`Failed to search in index '${indexName}'`, {
        error,
        query,
        correlationId: generateCorrelationId(),
      });
      throw error;
    }
  }

  /**
   * Create a query builder for the given index and document type
   */
  createQueryBuilder<T>(_indexName: string): SearchQueryBuilder<T> {
    return new SearchQueryBuilder<T>();
  }

  /**
   * Execute a search query using a query builder
   */
  async executeQuery<T>(
    indexName: string,
    builder: SearchQueryBuilder<T>
  ): Promise<SearchResults<T>> {
    const { query, options } = builder.build();
    return this.search<T>(indexName, query, options);
  }

  /**
   * Get a document by ID
   */
  async getDocument<T>(indexName: string, id: string): Promise<T | null> {
    await this.ensureInitialized();

    try {
      return await this.searchProvider.getDocument<T>(indexName, id);
    } catch (error) {
      this.logger.error(
        `Failed to get document '${id}' from index '${indexName}'`,
        {
          error,
          correlationId: generateCorrelationId(),
        }
      );
      throw error;
    }
  }

  /**
   * Close the search service
   */
  async close(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      this.logger.info("Closing search service");
      await this.searchProvider.close();
      this.isInitialized = false;
      this.logger.info("Search service closed successfully");
    } catch (error) {
      this.logger.error("Failed to close search service", {
        error,
        correlationId: generateCorrelationId(),
      });
      throw error;
    }
  }

  /**
   * Ensure the search service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}
