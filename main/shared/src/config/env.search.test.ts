// main/shared/src/config/env.search.test.ts
import { describe, expect, it } from 'vitest';

import { SearchEnvSchema } from './env.search';

describe('SearchEnvSchema', () => {
  describe('defaults', () => {
    it('defaults SEARCH_PROVIDER to sql', () => {
      const result = SearchEnvSchema.parse({});
      expect(result.SEARCH_PROVIDER).toBe('sql');
    });

    it('leaves all optional fields undefined when absent', () => {
      const result = SearchEnvSchema.parse({});
      expect(result.ELASTICSEARCH_NODE).toBeUndefined();
      expect(result.ELASTICSEARCH_INDEX).toBeUndefined();
      expect(result.ELASTICSEARCH_USERNAME).toBeUndefined();
      expect(result.ELASTICSEARCH_PASSWORD).toBeUndefined();
      expect(result.ELASTICSEARCH_API_KEY).toBeUndefined();
      expect(result.ELASTICSEARCH_TLS).toBeUndefined();
      expect(result.ELASTICSEARCH_REQUEST_TIMEOUT_MS).toBeUndefined();
      expect(result.SQL_SEARCH_DEFAULT_PAGE_SIZE).toBeUndefined();
      expect(result.SQL_SEARCH_MAX_PAGE_SIZE).toBeUndefined();
      expect(result.SQL_SEARCH_MAX_QUERY_DEPTH).toBeUndefined();
      expect(result.SQL_SEARCH_MAX_CONDITIONS).toBeUndefined();
      expect(result.SQL_SEARCH_LOGGING).toBeUndefined();
      expect(result.SQL_SEARCH_TIMEOUT_MS).toBeUndefined();
    });
  });

  describe('SEARCH_PROVIDER', () => {
    it('accepts sql', () => {
      expect(SearchEnvSchema.parse({ SEARCH_PROVIDER: 'sql' }).SEARCH_PROVIDER).toBe('sql');
    });

    it('accepts elasticsearch', () => {
      expect(SearchEnvSchema.parse({ SEARCH_PROVIDER: 'elasticsearch' }).SEARCH_PROVIDER).toBe(
        'elasticsearch',
      );
    });

    it('rejects meilisearch', () => {
      expect(() => SearchEnvSchema.parse({ SEARCH_PROVIDER: 'meilisearch' })).toThrow();
    });

    it('rejects algolia', () => {
      expect(() => SearchEnvSchema.parse({ SEARCH_PROVIDER: 'algolia' })).toThrow();
    });

    it('rejects an empty string', () => {
      expect(() => SearchEnvSchema.parse({ SEARCH_PROVIDER: '' })).toThrow();
    });

    it('rejects uppercase SQL', () => {
      expect(() => SearchEnvSchema.parse({ SEARCH_PROVIDER: 'SQL' })).toThrow();
    });

    it('rejects a numeric value', () => {
      expect(() => SearchEnvSchema.parse({ SEARCH_PROVIDER: 1 })).toThrow();
    });
  });

  describe('Elasticsearch fields', () => {
    it('accepts all Elasticsearch fields', () => {
      const result = SearchEnvSchema.parse({
        SEARCH_PROVIDER: 'elasticsearch',
        ELASTICSEARCH_NODE: 'https://es.example.com:9200',
        ELASTICSEARCH_INDEX: 'users',
        ELASTICSEARCH_USERNAME: 'elastic',
        ELASTICSEARCH_PASSWORD: 'changeme',
        ELASTICSEARCH_API_KEY: 'api-key-value',
        ELASTICSEARCH_TLS: 'true',
        ELASTICSEARCH_REQUEST_TIMEOUT_MS: 30000,
      });
      expect(result.ELASTICSEARCH_NODE).toBe('https://es.example.com:9200');
      expect(result.ELASTICSEARCH_INDEX).toBe('users');
      expect(result.ELASTICSEARCH_USERNAME).toBe('elastic');
      expect(result.ELASTICSEARCH_PASSWORD).toBe('changeme');
      expect(result.ELASTICSEARCH_API_KEY).toBe('api-key-value');
      expect(result.ELASTICSEARCH_TLS).toBe('true');
      expect(result.ELASTICSEARCH_REQUEST_TIMEOUT_MS).toBe(30000);
    });

    it('rejects a non-string ELASTICSEARCH_NODE', () => {
      expect(() => SearchEnvSchema.parse({ ELASTICSEARCH_NODE: 9200 })).toThrow();
    });

    it('rejects a non-string ELASTICSEARCH_INDEX', () => {
      expect(() => SearchEnvSchema.parse({ ELASTICSEARCH_INDEX: true })).toThrow();
    });

    it('rejects invalid ELASTICSEARCH_TLS value', () => {
      expect(() => SearchEnvSchema.parse({ ELASTICSEARCH_TLS: 'yes' })).toThrow();
    });

    it('rejects a boolean ELASTICSEARCH_TLS', () => {
      expect(() => SearchEnvSchema.parse({ ELASTICSEARCH_TLS: true })).toThrow();
    });

    it('coerces ELASTICSEARCH_REQUEST_TIMEOUT_MS from string', () => {
      const result = SearchEnvSchema.parse({ ELASTICSEARCH_REQUEST_TIMEOUT_MS: '5000' });
      expect(result.ELASTICSEARCH_REQUEST_TIMEOUT_MS).toBe(5000);
    });

    it('rejects a non-numeric ELASTICSEARCH_REQUEST_TIMEOUT_MS', () => {
      expect(() => SearchEnvSchema.parse({ ELASTICSEARCH_REQUEST_TIMEOUT_MS: 'slow' })).toThrow();
    });
  });

  describe('SQL search fields', () => {
    it('accepts all SQL search fields', () => {
      const result = SearchEnvSchema.parse({
        SQL_SEARCH_DEFAULT_PAGE_SIZE: 20,
        SQL_SEARCH_MAX_PAGE_SIZE: 100,
        SQL_SEARCH_MAX_QUERY_DEPTH: 5,
        SQL_SEARCH_MAX_CONDITIONS: 50,
        SQL_SEARCH_LOGGING: 'true',
        SQL_SEARCH_TIMEOUT_MS: 10000,
      });
      expect(result.SQL_SEARCH_DEFAULT_PAGE_SIZE).toBe(20);
      expect(result.SQL_SEARCH_MAX_PAGE_SIZE).toBe(100);
      expect(result.SQL_SEARCH_MAX_QUERY_DEPTH).toBe(5);
      expect(result.SQL_SEARCH_MAX_CONDITIONS).toBe(50);
      expect(result.SQL_SEARCH_LOGGING).toBe('true');
      expect(result.SQL_SEARCH_TIMEOUT_MS).toBe(10000);
    });

    it('coerces SQL_SEARCH_DEFAULT_PAGE_SIZE from string', () => {
      const result = SearchEnvSchema.parse({ SQL_SEARCH_DEFAULT_PAGE_SIZE: '10' });
      expect(result.SQL_SEARCH_DEFAULT_PAGE_SIZE).toBe(10);
    });

    it('rejects a non-numeric SQL_SEARCH_DEFAULT_PAGE_SIZE', () => {
      expect(() => SearchEnvSchema.parse({ SQL_SEARCH_DEFAULT_PAGE_SIZE: 'all' })).toThrow();
    });

    it('rejects a non-numeric SQL_SEARCH_MAX_PAGE_SIZE', () => {
      expect(() => SearchEnvSchema.parse({ SQL_SEARCH_MAX_PAGE_SIZE: 'unlimited' })).toThrow();
    });

    it('accepts SQL_SEARCH_DEFAULT_PAGE_SIZE of 1 (minimal page)', () => {
      const result = SearchEnvSchema.parse({ SQL_SEARCH_DEFAULT_PAGE_SIZE: 1 });
      expect(result.SQL_SEARCH_DEFAULT_PAGE_SIZE).toBe(1);
    });

    it('accepts a very large SQL_SEARCH_MAX_PAGE_SIZE (no upper cap enforced)', () => {
      const result = SearchEnvSchema.parse({ SQL_SEARCH_MAX_PAGE_SIZE: 100000 });
      expect(result.SQL_SEARCH_MAX_PAGE_SIZE).toBe(100000);
    });

    it('rejects invalid SQL_SEARCH_LOGGING value', () => {
      expect(() => SearchEnvSchema.parse({ SQL_SEARCH_LOGGING: 'on' })).toThrow();
    });

    it('accepts false for SQL_SEARCH_LOGGING', () => {
      const result = SearchEnvSchema.parse({ SQL_SEARCH_LOGGING: 'false' });
      expect(result.SQL_SEARCH_LOGGING).toBe('false');
    });

    it('coerces SQL_SEARCH_TIMEOUT_MS from string', () => {
      const result = SearchEnvSchema.parse({ SQL_SEARCH_TIMEOUT_MS: '3000' });
      expect(result.SQL_SEARCH_TIMEOUT_MS).toBe(3000);
    });

    it('rejects a non-numeric SQL_SEARCH_TIMEOUT_MS', () => {
      expect(() => SearchEnvSchema.parse({ SQL_SEARCH_TIMEOUT_MS: 'never' })).toThrow();
    });
  });

  describe('non-object input', () => {
    it('rejects null', () => {
      expect(() => SearchEnvSchema.parse(null)).toThrow();
    });

    it('rejects an array', () => {
      expect(() => SearchEnvSchema.parse(['sql'])).toThrow();
    });

    it('rejects a string', () => {
      expect(() => SearchEnvSchema.parse('elasticsearch')).toThrow();
    });
  });

  describe('safeParse', () => {
    it('returns success:true for an empty object', () => {
      const result = SearchEnvSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('returns success:false for an invalid provider without throwing', () => {
      const result = SearchEnvSchema.safeParse({ SEARCH_PROVIDER: 'solr' });
      expect(result.success).toBe(false);
    });

    it('returns success:false for non-numeric page size without throwing', () => {
      const result = SearchEnvSchema.safeParse({ SQL_SEARCH_DEFAULT_PAGE_SIZE: 'page' });
      expect(result.success).toBe(false);
    });
  });
});
