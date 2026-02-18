// main/shared/src/config/env.search.ts
/**
 * Search Environment Configuration
 *
 * Search types, env interface, and validation schema.
 * Merged from config/types/services.ts (search section), config/types/index.ts, and config/env.ts.
 *
 * @module config/env.search
 */

import {
  coerceNumber,
  createEnumSchema,
  createSchema,
  parseObject,
  parseOptional,
  parseString,
  withDefault,
} from '../primitives/schema';

import { trueFalseSchema } from './env.base';

import type { Schema } from '../primitives/schema';

// ============================================================================
// Types
// ============================================================================

/** Elasticsearch provider configuration. */
export interface ElasticsearchProviderConfig {
  node: string;
  index: string;
  auth?: {
    username: string;
    password: string;
  };
  apiKey?: string;
  tls?: boolean;
  requestTimeout?: number;
}

/** SQL-based search provider configuration. */
export interface SqlSearchProviderConfig {
  defaultPageSize: number;
  maxPageSize: number;
  maxQueryDepth?: number;
  maxConditions?: number;
  logging?: boolean;
  timeout?: number;
}

/** Column mapping for SQL queries. */
export interface SqlColumnMapping {
  field: string;
  column: string;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array';
  sortable?: boolean;
  filterable?: boolean;
  expression?: string;
}

/** Table configuration for SQL search. */
export interface SqlTableConfig {
  table: string;
  primaryKey: string | string[];
  columns: SqlColumnMapping[];
  searchColumns?: string[];
  defaultSort?: { column: string; order: 'asc' | 'desc' };
}

/** Unified search configuration for SQL provider. */
export interface SqlSearchConfig {
  provider: 'sql';
  config: SqlSearchProviderConfig;
}

/** Unified search configuration for Elasticsearch provider. */
export interface ElasticsearchSearchConfig {
  provider: 'elasticsearch';
  config: ElasticsearchProviderConfig;
}

/** Unified search configuration. */
export type SearchConfig = SqlSearchConfig | ElasticsearchSearchConfig;

// ============================================================================
// Env Interface
// ============================================================================

/** Search environment variables */
export interface SearchEnv {
  SEARCH_PROVIDER: 'sql' | 'elasticsearch';
  ELASTICSEARCH_NODE?: string | undefined;
  ELASTICSEARCH_INDEX?: string | undefined;
  ELASTICSEARCH_USERNAME?: string | undefined;
  ELASTICSEARCH_PASSWORD?: string | undefined;
  ELASTICSEARCH_API_KEY?: string | undefined;
  ELASTICSEARCH_TLS?: 'true' | 'false' | undefined;
  ELASTICSEARCH_REQUEST_TIMEOUT_MS?: number | undefined;
  SQL_SEARCH_DEFAULT_PAGE_SIZE?: number | undefined;
  SQL_SEARCH_MAX_PAGE_SIZE?: number | undefined;
  SQL_SEARCH_MAX_QUERY_DEPTH?: number | undefined;
  SQL_SEARCH_MAX_CONDITIONS?: number | undefined;
  SQL_SEARCH_LOGGING?: 'true' | 'false' | undefined;
  SQL_SEARCH_TIMEOUT_MS?: number | undefined;
}

// ============================================================================
// Env Schema
// ============================================================================

export const SearchEnvSchema: Schema<SearchEnv> = createSchema<SearchEnv>((data: unknown) => {
  const obj = parseObject(data, 'SearchEnv');
  return {
    SEARCH_PROVIDER: createEnumSchema(['sql', 'elasticsearch'] as const, 'SEARCH_PROVIDER').parse(
      withDefault(obj['SEARCH_PROVIDER'], 'sql'),
    ),
    ELASTICSEARCH_NODE: parseOptional(obj['ELASTICSEARCH_NODE'], (v: unknown) =>
      parseString(v, 'ELASTICSEARCH_NODE'),
    ),
    ELASTICSEARCH_INDEX: parseOptional(obj['ELASTICSEARCH_INDEX'], (v: unknown) =>
      parseString(v, 'ELASTICSEARCH_INDEX'),
    ),
    ELASTICSEARCH_USERNAME: parseOptional(obj['ELASTICSEARCH_USERNAME'], (v: unknown) =>
      parseString(v, 'ELASTICSEARCH_USERNAME'),
    ),
    ELASTICSEARCH_PASSWORD: parseOptional(obj['ELASTICSEARCH_PASSWORD'], (v: unknown) =>
      parseString(v, 'ELASTICSEARCH_PASSWORD'),
    ),
    ELASTICSEARCH_API_KEY: parseOptional(obj['ELASTICSEARCH_API_KEY'], (v: unknown) =>
      parseString(v, 'ELASTICSEARCH_API_KEY'),
    ),
    ELASTICSEARCH_TLS: parseOptional(obj['ELASTICSEARCH_TLS'], (v: unknown) =>
      trueFalseSchema.parse(v),
    ),
    ELASTICSEARCH_REQUEST_TIMEOUT_MS: parseOptional(
      obj['ELASTICSEARCH_REQUEST_TIMEOUT_MS'],
      (v: unknown) => coerceNumber(v, 'ELASTICSEARCH_REQUEST_TIMEOUT_MS'),
    ),
    SQL_SEARCH_DEFAULT_PAGE_SIZE: parseOptional(obj['SQL_SEARCH_DEFAULT_PAGE_SIZE'], (v: unknown) =>
      coerceNumber(v, 'SQL_SEARCH_DEFAULT_PAGE_SIZE'),
    ),
    SQL_SEARCH_MAX_PAGE_SIZE: parseOptional(obj['SQL_SEARCH_MAX_PAGE_SIZE'], (v: unknown) =>
      coerceNumber(v, 'SQL_SEARCH_MAX_PAGE_SIZE'),
    ),
    SQL_SEARCH_MAX_QUERY_DEPTH: parseOptional(obj['SQL_SEARCH_MAX_QUERY_DEPTH'], (v: unknown) =>
      coerceNumber(v, 'SQL_SEARCH_MAX_QUERY_DEPTH'),
    ),
    SQL_SEARCH_MAX_CONDITIONS: parseOptional(obj['SQL_SEARCH_MAX_CONDITIONS'], (v: unknown) =>
      coerceNumber(v, 'SQL_SEARCH_MAX_CONDITIONS'),
    ),
    SQL_SEARCH_LOGGING: parseOptional(obj['SQL_SEARCH_LOGGING'], (v: unknown) =>
      trueFalseSchema.parse(v),
    ),
    SQL_SEARCH_TIMEOUT_MS: parseOptional(obj['SQL_SEARCH_TIMEOUT_MS'], (v: unknown) =>
      coerceNumber(v, 'SQL_SEARCH_TIMEOUT_MS'),
    ),
  };
});
