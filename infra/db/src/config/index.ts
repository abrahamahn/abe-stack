// infra/db/src/config/index.ts
/**
 * Database Configuration Barrel Exports
 *
 * @module
 */

export {
  buildConfigConnectionString,
  getSafeConnectionString,
  isJsonDatabase,
  isPostgres,
  loadDatabaseConfig,
} from './database';

export {
  DEFAULT_ELASTICSEARCH_CONFIG,
  DEFAULT_SEARCH_SCHEMAS,
  DEFAULT_SQL_SEARCH_CONFIG,
  loadElasticsearchConfig,
  loadSqlSearchConfig,
  validateElasticsearchConfig,
  validateSqlSearchConfig,
} from './search';
