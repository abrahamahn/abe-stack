// src/server/db/src/search/search-factory.test.ts
/**
 * Tests for Search Provider Factory
 *
 * Verifies factory creation, provider registration, singleton management,
 * and lifecycle methods.
 */

import { afterEach, describe, expect, test } from 'vitest';

import {
  getSearchProviderFactory,
  resetSearchProviderFactory,
  SearchProviderFactory,
} from './search-factory';

import type { SqlTableConfig } from './types';
import type { RawDb, Repositories } from '../index';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockDb = {
  raw: async () => await Promise.resolve([]),
  query: async () => await Promise.resolve([]),
  queryOne: async () => await Promise.resolve(null),
  execute: async () => await Promise.resolve(0),
} as unknown as RawDb;

const mockRepos = {} as Repositories;

const tableConfig: Partial<SqlTableConfig> & { table: string } = {
  table: 'users',
  primaryKey: 'id',
  columns: [
    { field: 'id', column: 'id', type: 'string' },
    { field: 'name', column: 'name', type: 'string' },
  ],
};

// ============================================================================
// Tests
// ============================================================================

describe('SearchProviderFactory', () => {
  afterEach(() => {
    resetSearchProviderFactory();
  });

  describe('createSqlProvider', () => {
    test('should create and register SQL provider', () => {
      const factory = new SearchProviderFactory();

      const provider = factory.createSqlProvider(mockDb, mockRepos, tableConfig, {
        name: 'test-sql',
      });

      expect(provider).toBeDefined();
      expect(provider.name).toBe('test-sql');
      expect(factory.hasProvider('test-sql')).toBe(true);
    });

    test('should use default name when not specified', () => {
      const factory = new SearchProviderFactory();

      const provider = factory.createSqlProvider(mockDb, mockRepos, tableConfig);

      expect(provider.name).toBe('sql');
      expect(factory.hasProvider('sql')).toBe(true);
    });
  });

  describe('createElasticsearchProvider', () => {
    test('should create and register Elasticsearch provider', () => {
      const factory = new SearchProviderFactory();

      const provider = factory.createElasticsearchProvider({
        name: 'test-es',
        node: 'http://localhost:9200',
        index: 'test',
      });

      expect(provider).toBeDefined();
      expect(provider.name).toBe('test-es');
      expect(factory.hasProvider('test-es')).toBe(true);
    });
  });

  describe('getProvider', () => {
    test('should return registered provider', () => {
      const factory = new SearchProviderFactory();

      factory.createSqlProvider(mockDb, mockRepos, tableConfig, { name: 'sql-test' });

      const provider = factory.getProvider('sql-test');

      expect(provider).toBeDefined();
    });

    test('should return undefined for non-existent provider', () => {
      const factory = new SearchProviderFactory();

      const provider = factory.getProvider('non-existent');

      expect(provider).toBeUndefined();
    });
  });

  describe('hasProvider', () => {
    test('should return true for existing provider', () => {
      const factory = new SearchProviderFactory();

      factory.createSqlProvider(mockDb, mockRepos, tableConfig, { name: 'my-provider' });

      expect(factory.hasProvider('my-provider')).toBe(true);
    });

    test('should return false for non-existent provider', () => {
      const factory = new SearchProviderFactory();

      expect(factory.hasProvider('missing')).toBe(false);
    });
  });

  describe('removeProvider', () => {
    test('should remove existing provider', () => {
      const factory = new SearchProviderFactory();

      factory.createSqlProvider(mockDb, mockRepos, tableConfig, { name: 'to-remove' });

      const removed = factory.removeProvider('to-remove');

      expect(removed).toBe(true);
      expect(factory.hasProvider('to-remove')).toBe(false);
    });

    test('should return false for non-existent provider', () => {
      const factory = new SearchProviderFactory();

      const removed = factory.removeProvider('not-there');

      expect(removed).toBe(false);
    });
  });

  describe('getProviders', () => {
    test('should return all providers as a Map', () => {
      const factory = new SearchProviderFactory();

      factory.createSqlProvider(mockDb, mockRepos, tableConfig, { name: 'provider1' });
      factory.createElasticsearchProvider({
        name: 'provider2',
        node: 'http://localhost:9200',
        index: 'test',
      });

      const providers = factory.getProviders();

      expect(providers.has('provider1')).toBe(true);
      expect(providers.has('provider2')).toBe(true);
      expect(providers.size).toBe(2);
    });
  });

  describe('getProvidersByType', () => {
    test('should return provider names by type', () => {
      const factory = new SearchProviderFactory();

      factory.createSqlProvider(mockDb, mockRepos, tableConfig, { name: 'users-sql' });
      factory.createSqlProvider(mockDb, mockRepos, tableConfig, { name: 'orders-sql' });
      factory.createElasticsearchProvider({
        name: 'search-es',
        node: 'http://localhost:9200',
        index: 'test',
      });

      const sqlProviders = factory.getProvidersByType('sql');
      const esProviders = factory.getProvidersByType('elasticsearch');

      expect(sqlProviders).toContain('users-sql');
      expect(sqlProviders).toContain('orders-sql');
      expect(esProviders).toContain('search-es');
    });
  });

  describe('closeAll', () => {
    test('should close all providers and clear the map', async () => {
      const factory = new SearchProviderFactory();

      factory.createSqlProvider(mockDb, mockRepos, tableConfig, { name: 'p1' });
      factory.createElasticsearchProvider({
        name: 'p2',
        node: 'http://localhost:9200',
        index: 'test',
      });

      await factory.closeAll();

      expect(factory.getProviders().size).toBe(0);
    });
  });
});

describe('getSearchProviderFactory', () => {
  afterEach(() => {
    resetSearchProviderFactory();
  });

  test('should return singleton instance', () => {
    const factory1 = getSearchProviderFactory();
    const factory2 = getSearchProviderFactory();

    expect(factory1).toBe(factory2);
  });

  test('should persist providers across calls', () => {
    const factory1 = getSearchProviderFactory();
    factory1.createSqlProvider(mockDb, mockRepos, tableConfig, { name: 'singleton-test' });

    const factory2 = getSearchProviderFactory();

    expect(factory2.hasProvider('singleton-test')).toBe(true);
  });
});

describe('resetSearchProviderFactory', () => {
  test('should create new instance after reset', () => {
    const factory1 = getSearchProviderFactory();
    factory1.createSqlProvider(mockDb, mockRepos, tableConfig, { name: 'will-be-gone' });

    resetSearchProviderFactory();

    const factory2 = getSearchProviderFactory();

    expect(factory2.hasProvider('will-be-gone')).toBe(false);
  });
});
