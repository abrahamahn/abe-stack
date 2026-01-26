// apps/server/src/infrastructure/search/search-factory.ts
/**
 * Search Provider Factory
 *
 * Factory for creating and managing search providers.
 * Supports multiple provider types with a unified interface.
 */

import { createElasticsearchProvider } from './elasticsearch-provider';
import { createSqlSearchProvider } from './sql-provider';

import type { DbClient, Repositories } from '@database';
import type { ElasticsearchProvider } from './elasticsearch-provider';
import type { SqlSearchProvider } from './sql-provider';
import type {
    ElasticsearchProviderConfig,
    SearchProviderType,
    ServerSearchProvider,
    SqlSearchProviderConfig,
    SqlTableConfig,
} from './types';

// ============================================================================
// Factory Types
// ============================================================================

/**
 * Options for creating a SQL search provider.
 */
export interface SqlSearchProviderOptions {
  /** Database client */
  db: DbClient;
  /** Repositories */
  repos: Repositories;
  /** Table configuration */
  tableConfig: Partial<SqlTableConfig> & { table: string };
  /** Optional provider configuration */
  config?: SqlSearchProviderConfig;
}

/**
 * Options for creating an Elasticsearch search provider.
 */
export interface ElasticsearchProviderOptions {
  /** Elasticsearch configuration */
  config: ElasticsearchProviderConfig;
}

/**
 * All provider options mapped by type.
 */
export type ProviderOptions = {
  sql: SqlSearchProviderOptions;
  elasticsearch: ElasticsearchProviderOptions;
};

// ============================================================================
// Factory Class
// ============================================================================

/**
 * Factory for creating search providers.
 *
 * Supports multiple provider types:
 * - SQL: Query-based search using raw SQL
 * - Elasticsearch: Full-text search using Elasticsearch
 *
 * @example
 * const factory = new SearchProviderFactory();
 *
 * // Create SQL provider
 * const sqlProvider = factory.createSqlProvider(
 *   db,
 *   repos,
 *   { table: 'users', primaryKey: 'id', columns: [...] },
 *   { name: 'users-sql' }
 * );
 *
 * // Create Elasticsearch provider
 * const esProvider = factory.createElasticsearchProvider({
 *   node: 'http://localhost:9200',
 *   index: 'users',
 *   name: 'users-es',
 * });
 */
export class SearchProviderFactory {
  private providers: Map<string, ServerSearchProvider> = new Map();

  /**
   * Create a SQL search provider.
   */
  createSqlProvider<TRecord extends Record<string, unknown> = Record<string, unknown>>(
    db: DbClient,
    repos: Repositories,
    tableConfig: Partial<SqlTableConfig> & { table: string },
    config?: SqlSearchProviderConfig,
  ): SqlSearchProvider<TRecord> {
    const provider = createSqlSearchProvider<TRecord>(db, repos, tableConfig, config);
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
  getProvider(name: string): ServerSearchProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered providers.
   */
  getProviders(): Map<string, ServerSearchProvider> {
    return new Map(this.providers);
  }

  /**
   * Get provider names by type.
   */
  getProvidersByType(type: SearchProviderType): string[] {
    return Array.from(this.providers.entries())
      .filter(([, provider]) => {
        if (type === 'sql') {
          return provider instanceof Object && 'name' in provider && provider.name.includes('sql');
        }
        if (type === 'elasticsearch') {
          return provider instanceof Object && 'name' in provider && provider.name.includes('es');
        }
        return false;
      })
      .map(([name]) => name);
  }

  /**
   * Check if a provider exists by name.
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Remove a provider by name.
   */
  removeProvider(name: string): boolean {
    return this.providers.delete(name);
  }

  /**
   * Close all providers.
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.providers.values()).map(async (provider) => {
      if (typeof provider.close === 'function') {
        await provider.close();
      }
    });
    await Promise.all(closePromises);
    this.providers.clear();
  }
}

// ============================================================================
// Factory Instance (Singleton)
// ============================================================================

let factoryInstance: SearchProviderFactory | null = null;

/**
 * Get the singleton factory instance.
 */
export function getSearchProviderFactory(): SearchProviderFactory {
  factoryInstance ??= new SearchProviderFactory();
  return factoryInstance;
}

/**
 * Reset the singleton factory instance (for testing).
 */
export function resetSearchProviderFactory(): void {
  if (factoryInstance) {
    void factoryInstance.closeAll();
    factoryInstance = null;
  }
}
