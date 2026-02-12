// src/client/engine/src/search/query-builder.test.ts
import { describe, expect, test } from 'vitest';

import {
  contains,
  deserializeFromURLParams,
  eq,
  gt,
  inArray,
  lt,
  neq,
  serializeToURLParams,
} from '@abe-stack/shared';

import {
  ClientSearchQueryBuilder,
  createClientSearchQuery,
  fromClientSearchQuery,
} from './query-builder';

describe('ClientSearchQueryBuilder', () => {
  describe('createClientSearchQuery', () => {
    test('should create empty builder with defaults', () => {
      const builder = createClientSearchQuery();
      const query = builder.build();

      expect(query.page).toBe(1);
      expect(query.limit).toBe(50);
    });

    test('should build query with filters', () => {
      const builder = createClientSearchQuery().whereEq('status', 'active').whereGt('age', 18);

      const query = builder.build();

      expect(query.filters).toBeDefined();
    });

    test('should build query with sort', () => {
      const builder = createClientSearchQuery().orderByDesc('createdAt').orderByAsc('name');

      const query = builder.build();

      expect(query.sort).toEqual([
        { field: 'createdAt', order: 'desc' },
        { field: 'name', order: 'asc' },
      ]);
    });

    test('should build query with search', () => {
      const builder = createClientSearchQuery().searchIn('test query', ['title', 'description']);

      const query = builder.build();

      expect(query.search?.query).toBe('test query');
      expect(query.search?.fields).toEqual(['title', 'description']);
    });

    test('should build query with pagination', () => {
      const builder = createClientSearchQuery().page(3).limit(25);

      const query = builder.build();

      expect(query.page).toBe(3);
      expect(query.limit).toBe(25);
    });

    test('should support method chaining', () => {
      const query = createClientSearchQuery()
        .whereEq('status', 'active')
        .orderByDesc('createdAt')
        .search('test')
        .page(2)
        .limit(10)
        .withCount()
        .build();

      expect(query.filters).toBeDefined();
      expect(query.sort).toBeDefined();
      expect(query.search).toBeDefined();
      expect(query.page).toBe(2);
      expect(query.limit).toBe(10);
      expect(query.includeCount).toBe(true);
    });
  });

  describe('ClientSearchQueryBuilder URL methods', () => {
    test('toURLSearchParams should serialize to URLSearchParams', () => {
      const builder = createClientSearchQuery().page(2).limit(25);

      const params = builder.toURLSearchParams();

      expect(params.get('page')).toBe('2');
      expect(params.get('limit')).toBe('25');
    });

    test('toQueryString should return query string', () => {
      const builder = createClientSearchQuery().page(2).limit(10);

      const queryString = builder.toQueryString();

      expect(queryString).toContain('page=2');
      expect(queryString).toContain('limit=10');
    });

    test('fromURLSearchParams should create builder from params', () => {
      const params = new URLSearchParams();
      params.set('page', '3');
      params.set('limit', '50');
      params.set('sort', 'name:asc');

      const builder = ClientSearchQueryBuilder.fromURLSearchParams(params);
      const query = builder.build();

      expect(query.page).toBe(3);
      expect(query.limit).toBe(50);
      expect(query.sort).toEqual([{ field: 'name', order: 'asc' }]);
    });

    test('fromURLSearchParams should accept string', () => {
      const builder = ClientSearchQueryBuilder.fromURLSearchParams('page=2&limit=10');
      const query = builder.build();

      expect(query.page).toBe(2);
      expect(query.limit).toBe(10);
    });
  });

  describe('fromClientSearchQuery', () => {
    test('should create builder from existing query', () => {
      const originalQuery = {
        filters: { field: 'status', operator: 'eq' as const, value: 'active' },
        sort: [{ field: 'createdAt', order: 'desc' as const }],
        page: 2,
        limit: 25,
      };

      const builder = fromClientSearchQuery(originalQuery);
      const query = builder.build();

      expect(query.page).toBe(2);
      expect(query.limit).toBe(25);
      expect(query.sort).toEqual([{ field: 'createdAt', order: 'desc' }]);
    });

    test('should preserve search configuration', () => {
      const originalQuery = {
        search: {
          query: 'test',
          fields: ['title'],
          fuzziness: 0.8,
        },
      };

      const builder = fromClientSearchQuery(originalQuery);
      const query = builder.build();

      expect(query.search?.query).toBe('test');
      expect(query.search?.fields).toEqual(['title']);
      expect(query.search?.fuzziness).toBe(0.8);
    });

    test('should preserve cursor', () => {
      const originalQuery = {
        cursor: 'abc123',
      };

      const builder = fromClientSearchQuery(originalQuery);
      const query = builder.build();

      expect(query.cursor).toBe('abc123');
    });

    test('should preserve select fields', () => {
      const originalQuery = {
        select: ['id', 'name', 'email'],
      };

      const builder = fromClientSearchQuery(originalQuery);
      const query = builder.build();

      expect(query.select).toEqual(['id', 'name', 'email']);
    });

    test('should preserve includeCount', () => {
      const originalQuery = {
        includeCount: true,
      };

      const builder = fromClientSearchQuery(originalQuery);
      const query = builder.build();

      expect(query.includeCount).toBe(true);
    });
  });

  describe('roundtrip tests', () => {
    test('should roundtrip basic query through URL params', () => {
      const original = createClientSearchQuery()
        .whereEq('status', 'active')
        .orderByDesc('createdAt')
        .page(2)
        .limit(25)
        .build();

      const params = serializeToURLParams(original);
      const restored = deserializeFromURLParams(params);

      expect(restored.page).toBe(original.page);
      expect(restored.limit).toBe(original.limit);
      expect(restored.sort).toEqual(original.sort);
    });

    test('should roundtrip complex filters', () => {
      interface TestRecord {
        status: string;
        age: number;
      }

      const builder = createClientSearchQuery<TestRecord>();
      const original = builder
        .and((b) => b.whereEq('status', 'active').whereGte('age', 18))
        .build();

      const params = serializeToURLParams(original);
      const restored = deserializeFromURLParams<TestRecord>(params);

      const originalFilters = original.filters as { operator: string; conditions: unknown[] };
      const restoredFilters = restored.filters as { operator: string; conditions: unknown[] };

      expect(restoredFilters.operator).toBe(originalFilters.operator);
      expect(restoredFilters.conditions).toHaveLength(originalFilters.conditions.length);
    });
  });

  describe('Quick filter helpers (from shared)', () => {
    describe('eq', () => {
      test('should create equality filter', () => {
        const filter = eq('status', 'active');
        expect(filter).toEqual({
          field: 'status',
          operator: 'eq',
          value: 'active',
        });
      });
    });

    describe('neq', () => {
      test('should create not-equal filter', () => {
        const filter = neq('status', 'deleted');
        expect(filter).toEqual({
          field: 'status',
          operator: 'neq',
          value: 'deleted',
        });
      });
    });

    describe('gt', () => {
      test('should create greater-than filter', () => {
        const filter = gt('age', 18);
        expect(filter).toEqual({
          field: 'age',
          operator: 'gt',
          value: 18,
        });
      });
    });

    describe('lt', () => {
      test('should create less-than filter', () => {
        const filter = lt('price', 100);
        expect(filter).toEqual({
          field: 'price',
          operator: 'lt',
          value: 100,
        });
      });
    });

    describe('contains', () => {
      test('should create contains filter', () => {
        const filter = contains('name', 'john');
        expect(filter).toEqual({
          field: 'name',
          operator: 'contains',
          value: 'john',
        });
      });
    });

    describe('inArray', () => {
      test('should create in-array filter', () => {
        const filter = inArray('status', ['active', 'pending']);
        expect(filter).toEqual({
          field: 'status',
          operator: 'in',
          value: ['active', 'pending'],
        });
      });
    });
  });
});
