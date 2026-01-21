// apps/server/src/infrastructure/search/__tests__/search-factory.test.ts
import { afterEach, describe, expect, test } from 'vitest';

import {
  getSearchProviderFactory,
  parseProviderType,
  resetSearchProviderFactory,
  SearchProviderFactory,
} from '../search-factory';

// Mock database and table
const mockDb = {} as never;
const mockTable = {
  id: { name: 'id' },
  name: { name: 'name' },
} as never;

describe('SearchProviderFactory', () => {
  afterEach(() => {
    resetSearchProviderFactory();
  });

  describe('createSqlProvider', () => {
    test('should create and register SQL provider', () => {
      const factory = new SearchProviderFactory();

      const provider = factory.createSqlProvider(
        mockDb,
        mockTable,
        { table: 'users' },
        { name: 'test-sql' },
      );

      expect(provider).toBeDefined();
      expect(provider.name).toBe('test-sql');
      expect(factory.hasProvider('test-sql')).toBe(true);
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

      factory.createSqlProvider(mockDb, mockTable, { table: 'users' }, { name: 'sql-test' });

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

      factory.createSqlProvider(mockDb, mockTable, { table: 'users' }, { name: 'my-provider' });

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

      factory.createSqlProvider(mockDb, mockTable, { table: 'users' }, { name: 'to-remove' });

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

  describe('getProviderNames', () => {
    test('should return all provider names', () => {
      const factory = new SearchProviderFactory();

      factory.createSqlProvider(mockDb, mockTable, { table: 'users' }, { name: 'provider1' });
      factory.createElasticsearchProvider({
        name: 'provider2',
        node: 'http://localhost:9200',
        index: 'test',
      });

      const names = factory.getProviderNames();

      expect(names).toContain('provider1');
      expect(names).toContain('provider2');
      expect(names).toHaveLength(2);
    });
  });

  describe('closeAll', () => {
    test('should close all providers', async () => {
      const factory = new SearchProviderFactory();

      factory.createSqlProvider(mockDb, mockTable, { table: 'users' }, { name: 'p1' });
      factory.createElasticsearchProvider({
        name: 'p2',
        node: 'http://localhost:9200',
        index: 'test',
      });

      await factory.closeAll();

      expect(factory.getProviderNames()).toHaveLength(0);
    });
  });

  describe('healthCheckAll', () => {
    test('should check health of all providers', async () => {
      const factory = new SearchProviderFactory();

      // SQL provider health check will fail (no real db)
      factory.createSqlProvider(mockDb, mockTable, { table: 'users' }, { name: 'sql' });

      // ES provider health check returns false (stub implementation)
      factory.createElasticsearchProvider({
        name: 'es',
        node: 'http://localhost:9200',
        index: 'test',
      });

      const results = await factory.healthCheckAll();

      expect(results.has('sql')).toBe(true);
      expect(results.has('es')).toBe(true);
      // Both should fail as they're not connected to real services
      expect(results.get('sql')).toBe(false);
      expect(results.get('es')).toBe(false);
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
    factory1.createSqlProvider(mockDb, mockTable, { table: 'users' }, { name: 'singleton-test' });

    const factory2 = getSearchProviderFactory();

    expect(factory2.hasProvider('singleton-test')).toBe(true);
  });
});

describe('resetSearchProviderFactory', () => {
  test('should create new instance after reset', () => {
    const factory1 = getSearchProviderFactory();
    factory1.createSqlProvider(mockDb, mockTable, { table: 'users' }, { name: 'will-be-gone' });

    resetSearchProviderFactory();

    const factory2 = getSearchProviderFactory();

    expect(factory2.hasProvider('will-be-gone')).toBe(false);
  });
});

describe('parseProviderType', () => {
  test('should parse valid provider types', () => {
    expect(parseProviderType('sql')).toBe('sql');
    expect(parseProviderType('elasticsearch')).toBe('elasticsearch');
    expect(parseProviderType('memory')).toBe('memory');
  });

  test('should throw for invalid provider type', () => {
    expect(() => parseProviderType('invalid')).toThrow('Invalid provider type');
    expect(() => parseProviderType('mongodb')).toThrow('Invalid provider type');
  });
});
