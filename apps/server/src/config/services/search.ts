// apps/server/src/config/services/search.ts
import type {
    ElasticsearchProviderConfig,
    FullEnv,
    SqlSearchProviderConfig,
    SqlTableConfig,
} from '@abe-stack/core/config';

/**
 * Default Search Schemas
 *
 * Defines the searchable columns, filters, and sort options for domain entities.
 * Decoupled from the App / Composition Root to allow easier modification.
 */
export const DEFAULT_SEARCH_SCHEMAS: Record<string, SqlTableConfig> = {
  users: {
    table: 'users',
    primaryKey: 'id',
    columns: [
      {
        field: 'name',
        column: 'name',
        type: 'string',
        filterable: true,
        sortable: true,
      },
      {
        field: 'email',
        column: 'email',
        type: 'string',
        filterable: true,
        sortable: true,
      },
    ],
  },
};

/**
 * Load Elasticsearch Configuration.
 *
 * **Use Case**:
 * High-performance full-text search for large datasets (>100k records).
 * Supports both self-hosted (Username/Pass) and Cloud (API Key) auth.
 *
 * @param env - Environment variable map
 * @returns Elasticsearch provider configuration
 */
export function loadElasticsearchConfig(env: FullEnv): ElasticsearchProviderConfig {
  return {
    node: env.ELASTICSEARCH_NODE ?? 'http://localhost:9200',
    index: env.ELASTICSEARCH_INDEX ?? 'default',
    auth:
      (env.ELASTICSEARCH_USERNAME != null && env.ELASTICSEARCH_USERNAME !== '') && (env.ELASTICSEARCH_PASSWORD != null && env.ELASTICSEARCH_PASSWORD !== '')
        ? {
            username: env.ELASTICSEARCH_USERNAME,
            password: env.ELASTICSEARCH_PASSWORD,
          }
        : undefined,
    apiKey: env.ELASTICSEARCH_API_KEY,
    tls: env.ELASTICSEARCH_TLS ? env.ELASTICSEARCH_TLS === 'true' : undefined,
    requestTimeout: env.ELASTICSEARCH_REQUEST_TIMEOUT_MS ?? undefined,
  };
}

/**
 * Load SQL Search Configuration.
 *
 * **Use Case**:
 * Simple, ACID-compliant search for small-to-medium datasets using standard `ILIKE` queries.
 * No external infrastructure required, but less performant for fuzzy matching.
 *
 * @param env - Environment variable map
 * @returns SQL search provider configuration
 */
export function loadSqlSearchConfig(env: FullEnv): SqlSearchProviderConfig {
  return {
    defaultPageSize: env.SQL_SEARCH_DEFAULT_PAGE_SIZE ?? 50,
    maxPageSize: env.SQL_SEARCH_MAX_PAGE_SIZE ?? 1000,
    maxQueryDepth: env.SQL_SEARCH_MAX_QUERY_DEPTH ?? undefined,
    maxConditions: env.SQL_SEARCH_MAX_CONDITIONS ?? undefined,
    logging: env.SQL_SEARCH_LOGGING ? env.SQL_SEARCH_LOGGING === 'true' : undefined,
    timeout: env.SQL_SEARCH_TIMEOUT_MS ?? undefined,
  };
}

/**
 * Validates Elasticsearch configuration for production readiness.
 *
 * @param config - Elasticsearch provider configuration
 * @returns Array of validation error messages (empty if valid)
 */
export function validateElasticsearchConfig(config: ElasticsearchProviderConfig): string[] {
  const errors: string[] = [];
  if (!config.node) errors.push('ELASTICSEARCH_NODE is required');
  if (!config.index) errors.push('ELASTICSEARCH_INDEX is required');
  return errors;
}

/**
 * Validates SQL search configuration for consistency.
 *
 * @param config - SQL search provider configuration
 * @returns Array of validation error messages (empty if valid)
 */
export function validateSqlSearchConfig(config: SqlSearchProviderConfig): string[] {
  const errors: string[] = [];
  if ((config.defaultPageSize ?? 0) > (config.maxPageSize ?? 0)) {
    errors.push('SQL_SEARCH_DEFAULT_PAGE_SIZE cannot exceed MAX_PAGE_SIZE');
  }
  return errors;
}

/** Default Elasticsearch configuration for development */
export const DEFAULT_ELASTICSEARCH_CONFIG: ElasticsearchProviderConfig = {
  node: 'http://localhost:9200',
  index: 'default',
};

/** Default SQL search configuration */
export const DEFAULT_SQL_SEARCH_CONFIG: SqlSearchProviderConfig = {
  defaultPageSize: 50,
  maxPageSize: 1000,
};
