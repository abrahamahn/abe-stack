// apps/server/src/config/services/search.test.ts
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ELASTICSEARCH_CONFIG,
  DEFAULT_SEARCH_SCHEMAS,
  DEFAULT_SQL_SEARCH_CONFIG,
  loadElasticsearchConfig,
  loadSqlSearchConfig,
  validateElasticsearchConfig,
  validateSqlSearchConfig,
} from './search';

import type { FullEnv } from '@abe-stack/core/config';

describe('Search Configuration', () => {
  describe('Elasticsearch Configuration', () => {
    it('loads default configuration when no environment variables are set', () => {
      const env = {} as unknown as FullEnv;
      const config = loadElasticsearchConfig(env);

      expect(config).toEqual({
        node: 'http://localhost:9200',
        index: 'default',
        apiKey: undefined,
        auth: undefined,
        requestTimeout: undefined,
        tls: undefined,
      });
    });

    it('loads custom configuration from environment variables', () => {
      const env = {
        ELASTICSEARCH_NODE: 'https://my-es-cluster.com',
        ELASTICSEARCH_INDEX: 'my-index',
        ELASTICSEARCH_USERNAME: 'elastic-user',
        ELASTICSEARCH_PASSWORD: 'elastic-password',
        ELASTICSEARCH_API_KEY: 'my-api-key',
        ELASTICSEARCH_TLS: 'true',
        ELASTICSEARCH_REQUEST_TIMEOUT_MS: 60000,
      } as unknown as FullEnv;

      const config = loadElasticsearchConfig(env);

      expect(config).toEqual({
        node: 'https://my-es-cluster.com',
        index: 'my-index',
        auth: {
          username: 'elastic-user',
          password: 'elastic-password',
        },
        apiKey: 'my-api-key',
        tls: true,
        requestTimeout: 60000,
      });
    });

    it('loads configuration with basic auth only', () => {
      const env = {
        ELASTICSEARCH_NODE: 'http://localhost:9200',
        ELASTICSEARCH_INDEX: 'my-index',
        ELASTICSEARCH_USERNAME: 'elastic-user',
        ELASTICSEARCH_PASSWORD: 'elastic-password',
      } as unknown as FullEnv;

      const config = loadElasticsearchConfig(env);

      expect(config.auth).toEqual({
        username: 'elastic-user',
        password: 'elastic-password',
      });
      expect(config.apiKey).toBeUndefined();
    });

    it('loads configuration with API key only', () => {
      const env = {
        ELASTICSEARCH_NODE: 'https://my-es-cluster.com',
        ELASTICSEARCH_INDEX: 'my-index',
        ELASTICSEARCH_API_KEY: 'my-api-key',
      } as unknown as FullEnv;

      const config = loadElasticsearchConfig(env);

      expect(config.auth).toBeUndefined();
      expect(config.apiKey).toBe('my-api-key');
    });

    it('handles TLS and request timeout correctly', () => {
      const env = {
        ELASTICSEARCH_TLS: 'false',
        ELASTICSEARCH_REQUEST_TIMEOUT_MS: 15000,
      } as unknown as FullEnv;

      const config = loadElasticsearchConfig(env);

      expect(config.tls).toBe(false);
      expect(config.requestTimeout).toBe(15000);
    });

    it('validateElasticsearchConfig returns errors for missing required fields', () => {
      const config = {
        node: '',
        index: '',
      } as any;

      const errors = validateElasticsearchConfig(config);
      expect(errors).toContain('ELASTICSEARCH_NODE is required');
      expect(errors).toContain('ELASTICSEARCH_INDEX is required');
    });

    it('validateElasticsearchConfig returns no errors for valid configuration', () => {
      const config = {
        node: 'http://localhost:9200',
        index: 'my-index',
      } as any;

      const errors = validateElasticsearchConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('exports default configuration constants', () => {
      expect(DEFAULT_ELASTICSEARCH_CONFIG).toBeDefined();
      expect(DEFAULT_ELASTICSEARCH_CONFIG.node).toBe('http://localhost:9200');
      expect(DEFAULT_ELASTICSEARCH_CONFIG.index).toBe('default');
    });
  });

  describe('SQL Search Configuration', () => {
    it('loads default configuration when no environment variables are set', () => {
      const env = {} as unknown as FullEnv;
      const config = loadSqlSearchConfig(env);

      expect(config).toEqual({
        defaultPageSize: 50,
        maxPageSize: 1000,
        maxQueryDepth: undefined,
        maxConditions: undefined,
        logging: undefined,
        timeout: undefined,
      });
    });

    it('loads custom configuration from environment variables', () => {
      const env = {
        SQL_SEARCH_DEFAULT_PAGE_SIZE: 25,
        SQL_SEARCH_MAX_PAGE_SIZE: 500,
        SQL_SEARCH_MAX_QUERY_DEPTH: 10,
        SQL_SEARCH_MAX_CONDITIONS: 50,
        SQL_SEARCH_LOGGING: 'true',
        SQL_SEARCH_TIMEOUT_MS: 10000,
      } as unknown as FullEnv;

      const config = loadSqlSearchConfig(env);

      expect(config).toEqual({
        defaultPageSize: 25,
        maxPageSize: 500,
        maxQueryDepth: 10,
        maxConditions: 50,
        logging: true,
        timeout: 10000,
      });
    });

    it('handles boolean conversion for logging', () => {
      const env = {
        SQL_SEARCH_LOGGING: 'true',
      } as unknown as FullEnv;

      const config = loadSqlSearchConfig(env);
      expect(config.logging).toBe(true);
    });

    it('handles zero values correctly for optional fields', () => {
      const env = {
        SQL_SEARCH_MAX_QUERY_DEPTH: 0,
        SQL_SEARCH_MAX_CONDITIONS: 0,
        SQL_SEARCH_TIMEOUT_MS: 0,
      } as unknown as FullEnv;

      const config = loadSqlSearchConfig(env);

      expect(config.maxQueryDepth).toBe(0);
      expect(config.maxConditions).toBe(0);
      expect(config.timeout).toBe(0);
    });

    it('validateSqlSearchConfig returns error when default page size exceeds max', () => {
      const config = {
        defaultPageSize: 1500,
        maxPageSize: 1000,
      } as any;

      const errors = validateSqlSearchConfig(config);
      expect(errors).toContain('SQL_SEARCH_DEFAULT_PAGE_SIZE cannot exceed MAX_PAGE_SIZE');
    });

    it('validateSqlSearchConfig returns no errors when page sizes are valid', () => {
      const config = {
        defaultPageSize: 50,
        maxPageSize: 1000,
      } as any;

      const errors = validateSqlSearchConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('exports default configuration constants', () => {
      expect(DEFAULT_SQL_SEARCH_CONFIG).toBeDefined();
      expect(DEFAULT_SQL_SEARCH_CONFIG.defaultPageSize).toBe(50);
      expect(DEFAULT_SQL_SEARCH_CONFIG.maxPageSize).toBe(1000);
    });

    it('exports default search schemas with correct structure', () => {
      expect(DEFAULT_SEARCH_SCHEMAS).toBeDefined();
      expect(DEFAULT_SEARCH_SCHEMAS.users).toBeDefined();
      expect(DEFAULT_SEARCH_SCHEMAS.users?.table).toBe('users');

      const emailColumn = DEFAULT_SEARCH_SCHEMAS.users?.columns.find((c) => c.field === 'email');
      expect(emailColumn).toBeDefined();
      expect(emailColumn?.type).toBe('string');
      expect(emailColumn?.filterable).toBe(true);
    });
  });
});
