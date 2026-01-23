// apps/server/src/config/services/search.ts
import { getBool, getInt } from '@abe-stack/core/config/utils';
import type {
  ElasticsearchProviderConfig,
  SqlSearchProviderConfig,
} from '@abe-stack/core/contracts/config';

/**
 * Loads Elasticsearch configuration from environment variables.
 *
 * Supports both basic auth (username/password) and API key authentication.
 * For cloud-hosted Elasticsearch, use API keys for better security.
 *
 * @param env - Environment variable map
 * @returns Elasticsearch provider configuration
 */
export function loadElasticsearchConfig(
  env: Record<string, string | undefined>
): ElasticsearchProviderConfig {
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
    tls: env.ELASTICSEARCH_TLS ? getBool(env.ELASTICSEARCH_TLS) : undefined,
    requestTimeout: env.ELASTICSEARCH_REQUEST_TIMEOUT_MS
      ? getInt(env.ELASTICSEARCH_REQUEST_TIMEOUT_MS, 30000)
      : undefined,
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
export function loadSqlSearchConfig(
  env: Record<string, string | undefined>
): SqlSearchProviderConfig {
  return {
    defaultPageSize: getInt(env.SQL_SEARCH_DEFAULT_PAGE_SIZE, 50),
    maxPageSize: getInt(env.SQL_SEARCH_MAX_PAGE_SIZE, 1000),
    maxQueryDepth: env.SQL_SEARCH_MAX_QUERY_DEPTH
      ? getInt(env.SQL_SEARCH_MAX_QUERY_DEPTH, 5)
      : undefined,
    maxConditions: env.SQL_SEARCH_MAX_CONDITIONS
      ? getInt(env.SQL_SEARCH_MAX_CONDITIONS, 20)
      : undefined,
    logging: env.SQL_SEARCH_LOGGING ? getBool(env.SQL_SEARCH_LOGGING) : undefined,
    timeout: env.SQL_SEARCH_TIMEOUT_MS ? getInt(env.SQL_SEARCH_TIMEOUT_MS, 5000) : undefined,
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
