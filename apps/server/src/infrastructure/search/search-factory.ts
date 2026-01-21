// apps/server/src/infrastructure/search/search-factory.ts
/**
 * Search Provider Factory
 *
 * Factory for creating and managing search providers.
 * Supports multiple provider types with a unified interface.
 */



import { createElasticsearchProvider } from './elasticsearch-provider';
import { createSqlSearchProvider } from './sql-provider';

import type { ElasticsearchProvider } from './elasticsearch-provider';
import type { SqlSearchProvider } from './sql-provider';
import type {
  ElasticsearchProviderConfig,
  SearchProviderType,
  ServerSearchProvider,
  SqlSearchProviderConfig,
  SqlTableConfig,
} from './types';
import type { DbClient } from '@database';
import type { PgColumn, PgTableWithColumns } from 'drizzle-orm/pg-core';

// ============================================================================
// Factory Types
// ============================================================================

/**
 * Options for creating a SQL search provider.
 */
export interface SqlSearchProviderOptions<
  TTable extends PgTableWithColumns<{
    name: string;
    schema: string | undefined;
    columns: Record<string, PgColumn>;
    dialect: 'pg';
  }>,
> {
  type: 'sql';
  db: DbClient;
  table: TTable;
  tableConfig: Partial<SqlTableConfig> & { table: string };
  config?: SqlSearchProviderConfig;
}

/**
 * Options for creating an Elasticsearch provider.
 */
export interface ElasticsearchProviderOptions {
  type: 'elasticsearch';
  config: ElasticsearchProviderConfig;
}

/**
 * Options for creating an in-memory provider.
 */
export interface MemoryProviderOptions<TRecord> {
  type: 'memory';
  data: TRecord[];
  config?: { name?: string };
}

/**
 * Union of all provider options.
 */
export type SearchProviderOptions<
  TTable extends PgTableWithColumns<{
    name: string;
    schema: string | undefined;
    columns: Record<string, PgColumn>;
    dialect: 'pg';
  }>,
  TRecord = Record<string, unknown>,
> = SqlSearchProviderOptions<TTable> | ElasticsearchProviderOptions | MemoryProviderOptions<TRecord>;

// ============================================================================
// Search Provider Factory
// ============================================================================

/**
 * Factory for creating search providers.
 *
 * @example
 * ```typescript
 * const factory = new SearchProviderFactory();
 *
 * // Create SQL provider
 * const sqlProvider = factory.createSqlProvider(db, usersTable, {
 *   table: 'users',
 *   primaryKey: 'id',
 * });
 *
 * // Create Elasticsearch provider
 * const esProvider = factory.createElasticsearchProvider({
 *   name: 'elasticsearch',
 *   node: 'http://localhost:9200',
 *   index: 'users',
 * });
 * ```
 */
export class SearchProviderFactory {
  private providers: Map<string, ServerSearchProvider> = new Map();

  /**
   * Create a SQL search provider.
   */
  createSqlProvider<
    TTable extends PgTableWithColumns<{
      name: string;
      schema: string | undefined;
      columns: Record<string, PgColumn>;
      dialect: 'pg';
    }>,
    TRecord extends Record<string, unknown> = Record<string, unknown>,
  >(
    db: DbClient,
    table: TTable,
    tableConfig: Partial<SqlTableConfig> & { table: string },
    config?: SqlSearchProviderConfig,
  ): SqlSearchProvider<TTable, TRecord> {
    const provider = createSqlSearchProvider<TTable, TRecord>(db, table, tableConfig, config);
    this.providers.set(provider.name, provider as ServerSearchProvider);
    return provider;
  }

  /**
   * Create an Elasticsearch provider.
   */
  createElasticsearchProvider<TRecord = Record<string, unknown>>(
    config: ElasticsearchProviderConfig,
  ): ElasticsearchProvider<TRecord> {
    const provider = createElasticsearchProvider<TRecord>(config);
    this.providers.set(provider.name, provider as ServerSearchProvider);
    return provider;
  }

  /**
   * Get a provider by name.
   */
  getProvider<TRecord = Record<string, unknown>>(
    name: string,
  ): ServerSearchProvider<TRecord> | undefined {
    return this.providers.get(name) as ServerSearchProvider<TRecord> | undefined;
  }

  /**
   * Check if a provider exists.
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Remove a provider.
   */
  removeProvider(name: string): boolean {
    return this.providers.delete(name);
  }

  /**
   * Get all provider names.
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Close all providers and release resources.
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.providers.values()).map((provider) =>
      provider.close(),
    );
    await Promise.all(closePromises);
    this.providers.clear();
  }

  /**
   * Health check all providers.
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [name, provider] of this.providers) {
      try {
        const healthy = await provider.healthCheck();
        results.set(name, healthy);
      } catch {
        results.set(name, false);
      }
    }

    return results;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let factoryInstance: SearchProviderFactory | null = null;

/**
 * Get the singleton factory instance.
 */
export function getSearchProviderFactory(): SearchProviderFactory {
  if (!factoryInstance) {
    factoryInstance = new SearchProviderFactory();
  }
  return factoryInstance;
}

/**
 * Reset the singleton factory (for testing).
 */
export function resetSearchProviderFactory(): void {
  if (factoryInstance) {
    void factoryInstance.closeAll();
    factoryInstance = null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a search provider from options.
 */
export function createSearchProvider<
  TTable extends PgTableWithColumns<{
    name: string;
    schema: string | undefined;
    columns: Record<string, PgColumn>;
    dialect: 'pg';
  }>,
  TRecord extends Record<string, unknown> = Record<string, unknown>,
>(
  options: SearchProviderOptions<TTable, TRecord>,
): ServerSearchProvider<TRecord> {
  const factory = getSearchProviderFactory();

  switch (options.type) {
    case 'sql':
      return factory.createSqlProvider<TTable, TRecord>(
        options.db,
        options.table,
        options.tableConfig,
        options.config,
      );

    case 'elasticsearch':
      return factory.createElasticsearchProvider<TRecord>(options.config);

    case 'memory':
      // Memory provider would be implemented for testing
      throw new Error('Memory provider not yet implemented');

    default:
      throw new Error(`Unknown provider type: ${(options as { type: string }).type}`);
  }
}

/**
 * Get provider type from string.
 */
export function parseProviderType(type: string): SearchProviderType {
  const validTypes: SearchProviderType[] = ['sql', 'elasticsearch', 'memory'];

  if (validTypes.includes(type as SearchProviderType)) {
    return type as SearchProviderType;
  }

  throw new Error(`Invalid provider type: ${type}. Valid types are: ${validTypes.join(', ')}`);
}
