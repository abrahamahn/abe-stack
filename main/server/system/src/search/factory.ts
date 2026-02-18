// main/server/system/src/search/factory.ts
/**
 * Search Provider Factory
 *
 * Factory for creating and managing search providers.
 * Currently supports SQL providers with a unified interface.
 *
 * @module @bslt/server-system/search
 */

import {
  createSqlSearchProvider,
  type DbClient,
  type Repositories,
  type SearchProviderType,
  type ServerSearchProvider,
  type SqlSearchProvider,
  type SqlSearchProviderConfig,
  type SqlTableConfig,
} from '@bslt/db';

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
 * All provider options mapped by type.
 */
export type ProviderOptions = {
  sql: SqlSearchProviderOptions;
};

// ============================================================================
// Factory Class
// ============================================================================

/**
 * Factory for creating search providers.
 *
 * Creates SQL-based search providers with a unified management interface.
 *
 * @example
 * ```typescript
 * const factory = new SearchProviderFactory();
 *
 * // Create SQL provider
 * const sqlProvider = factory.createSqlProvider(
 *   db,
 *   repos,
 *   { table: 'users', primaryKey: 'id', columns: [...] },
 *   { name: 'users-sql' }
 * );
 * ```
 */
export class SearchProviderFactory {
  private readonly providers: Map<string, ServerSearchProvider> = new Map();

  /**
   * Create a SQL search provider.
   *
   * @param db - Database client for executing queries.
   * @param repos - Repository container.
   * @param tableConfig - Table and column configuration.
   * @param config - Optional provider configuration.
   * @returns A registered SQL search provider instance.
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
   * Get a provider by name.
   *
   * @param name - Registered provider name.
   * @returns The provider instance, or undefined if not found.
   * @complexity O(1)
   */
  getProvider(name: string): ServerSearchProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered providers.
   *
   * @returns A new Map containing all registered providers.
   * @complexity O(n) where n is the number of registered providers.
   */
  getProviders(): Map<string, ServerSearchProvider> {
    return new Map(this.providers);
  }

  /**
   * Get provider names by type.
   *
   * @param type - The search provider type to filter by.
   * @returns Array of provider names matching the type.
   * @complexity O(n) where n is the number of registered providers.
   */
  getProvidersByType(type: SearchProviderType): string[] {
    return Array.from(this.providers.entries())
      .filter(([, provider]) => {
        if (type === 'sql') {
          return provider instanceof Object && 'name' in provider && provider.name.includes('sql');
        }
        return false;
      })
      .map(([name]) => name);
  }

  /**
   * Check if a provider exists by name.
   *
   * @param name - Provider name to check.
   * @returns `true` if the provider is registered.
   * @complexity O(1)
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Remove a provider by name.
   *
   * @param name - Provider name to remove.
   * @returns `true` if the provider was found and removed.
   * @complexity O(1)
   */
  removeProvider(name: string): boolean {
    return this.providers.delete(name);
  }

  /**
   * Close all providers and clear the registry.
   *
   * @returns A promise that resolves when all providers are closed.
   * @complexity O(n) where n is the number of registered providers.
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
 *
 * @returns The shared SearchProviderFactory instance.
 */
export function getSearchProviderFactory(): SearchProviderFactory {
  factoryInstance ??= new SearchProviderFactory();
  return factoryInstance;
}

/**
 * Reset the singleton factory instance (for testing).
 * Closes all providers before resetting.
 */
export function resetSearchProviderFactory(): void {
  if (factoryInstance != null) {
    void factoryInstance.closeAll();
    factoryInstance = null;
  }
}
