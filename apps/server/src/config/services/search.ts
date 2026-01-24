// apps/server/src/config/services/search.ts
import type {
  ElasticsearchProviderConfig,
  SqlSearchProviderConfig,
} from '@abe-stack/core/contracts/config';
import type { FullEnv } from '@abe-stack/core/contracts/config/environment';

/**
 * Loads Elasticsearch configuration from environment variables.
 *
 * Supports both basic auth (username/password) and API key authentication.
 * For cloud-hosted Elasticsearch, use API keys for better security.
 *
 * @param env - Environment variable map
 * @returns Elasticsearch provider configuration
 */
export function loadElasticsearchConfig(env: FullEnv): ElasticsearchProviderConfig {
  return {
    node: env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    index: env.ELASTICSEARCH_INDEX || 'default',
    auth:
      env.ELASTICSEARCH_USERNAME && env.ELASTICSEARCH_PASSWORD
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
 * Loads SQL-based search configuration from environment variables.
 *
 * SQL search uses database LIKE/ILIKE queries - simpler than Elasticsearch
 * but sufficient for smaller datasets. Includes DoS protection via limits.
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
