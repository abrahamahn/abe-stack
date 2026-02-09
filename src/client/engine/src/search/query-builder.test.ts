// src/client/engine/src/search/query-builder.test.ts
import { describe, expect, test } from 'vitest';

import {
  ClientSearchQueryBuilder,
  contains,
  createClientSearchQuery,
  eq,
  fromClientSearchQuery,
  gt,
  inArray,
  lt,
  neq,
  queryToURLSearchParams,
  urlSearchParamsToQuery,
} from './query-builder';

describe('ClientSearchQueryBuilder', () => {
  describe('createClientSearchQuery', () => {
    test('should create empty builder', () => {
      const builder = createClientSearchQuery();
      const query = builder.build();

      expect(query).toEqual({});
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
      const builder = createClientSearchQuery()
        .search('test query')
        .searchIn(['title', 'description']);

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
        .includeCount()
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

  describe('queryToURLSearchParams', () => {
    test('should serialize empty query', () => {
      const params = queryToURLSearchParams({});
      expect(params.toString()).toBe('');
    });

    test('should serialize filters as JSON', () => {
      const params = queryToURLSearchParams({
        filters: { field: 'status', operator: 'eq', value: 'active' },
      });

      expect(params.has('filters')).toBe(true);
      const filtersValue = params.get('filters');
      if (filtersValue === null) throw new Error('filters is null');
      const parsed = JSON.parse(filtersValue);
      expect(parsed.f).toBe('status');
    });

    test('should serialize sort as colon-separated string', () => {
      const params = queryToURLSearchParams({
        sort: [
          { field: 'createdAt', order: 'desc' },
          { field: 'name', order: 'asc' },
        ],
      });

      expect(params.get('sort')).toBe('createdAt:desc,name:asc');
    });

    test('should serialize search query', () => {
      const params = queryToURLSearchParams({
        search: { query: 'test', fields: ['title'], fuzziness: 0.5 },
      });

      expect(params.get('q')).toBe('test');
      expect(params.get('searchFields')).toBe('title');
      expect(params.get('fuzziness')).toBe('0.5');
    });

    test('should skip page=1', () => {
      const params = queryToURLSearchParams({ page: 1 });
      expect(params.has('page')).toBe(false);
    });

    test('should include page > 1', () => {
      const params = queryToURLSearchParams({ page: 2 });
      expect(params.get('page')).toBe('2');
    });

    test('should serialize includeCount as 1', () => {
      const params = queryToURLSearchParams({ includeCount: true });
      expect(params.get('includeCount')).toBe('1');
    });

    test('should serialize Date values with $date marker', () => {
      const date = new Date('2024-01-15T00:00:00.000Z');
      const params = queryToURLSearchParams({
        filters: { field: 'createdAt', operator: 'gte', value: date },
      });

      const filtersValue = params.get('filters');
      if (filtersValue === null) throw new Error('filters is null');
      const parsed = JSON.parse(filtersValue);
      expect(parsed.v.$date).toBe('2024-01-15T00:00:00.000Z');
    });

    test('should serialize range values with $range marker', () => {
      const params = queryToURLSearchParams({
        filters: { field: 'price', operator: 'between', value: { min: 10, max: 100 } },
      });

      const filtersValue = params.get('filters');
      if (filtersValue === null) throw new Error('filters is null');
      const parsed = JSON.parse(filtersValue);
      expect(parsed.v.$range).toEqual({ min: 10, max: 100 });
    });
  });

  describe('urlSearchParamsToQuery', () => {
    test('should parse empty params', () => {
      const query = urlSearchParamsToQuery(new URLSearchParams());
      expect(query).toEqual({});
    });

    test('should parse filters JSON', () => {
      const params = new URLSearchParams();
      params.set('filters', JSON.stringify({ f: 'status', o: 'eq', v: 'active' }));

      const query = urlSearchParamsToQuery(params);
      expect(query.filters).toEqual({
        field: 'status',
        operator: 'eq',
        value: 'active',
        caseSensitive: undefined,
      });
    });

    test('should parse sort string', () => {
      const params = new URLSearchParams();
      params.set('sort', 'createdAt:desc,name:asc');

      const query = urlSearchParamsToQuery(params);
      expect(query.sort).toEqual([
        { field: 'createdAt', order: 'desc' },
        { field: 'name', order: 'asc' },
      ]);
    });

    test('should parse search params', () => {
      const params = new URLSearchParams();
      params.set('q', 'test search');
      params.set('searchFields', 'title,description');
      params.set('fuzziness', '0.8');

      const query = urlSearchParamsToQuery(params);
      expect(query.search).toEqual({
        query: 'test search',
        fields: ['title', 'description'],
        fuzziness: 0.8,
      });
    });

    test('should parse pagination', () => {
      const params = new URLSearchParams();
      params.set('page', '3');
      params.set('limit', '50');

      const query = urlSearchParamsToQuery(params);
      expect(query.page).toBe(3);
      expect(query.limit).toBe(50);
    });

    test('should parse cursor', () => {
      const params = new URLSearchParams();
      params.set('cursor', 'abc123');

      const query = urlSearchParamsToQuery(params);
      expect(query.cursor).toBe('abc123');
    });

    test('should parse select', () => {
      const params = new URLSearchParams();
      params.set('select', 'id,name,email');

      const query = urlSearchParamsToQuery(params);
      expect(query.select).toEqual(['id', 'name', 'email']);
    });

    test('should parse includeCount', () => {
      const params = new URLSearchParams();
      params.set('includeCount', '1');

      const query = urlSearchParamsToQuery(params);
      expect(query.includeCount).toBe(true);

      params.set('includeCount', 'true');
      const query2 = urlSearchParamsToQuery(params);
      expect(query2.includeCount).toBe(true);
    });

    test('should handle invalid filters JSON gracefully', () => {
      const params = new URLSearchParams();
      params.set('filters', 'not-json');

      const query = urlSearchParamsToQuery(params);
      expect(query.filters).toBeUndefined();
    });

    test('should deserialize Date values', () => {
      const params = new URLSearchParams();
      params.set(
        'filters',
        JSON.stringify({ f: 'createdAt', o: 'gte', v: { $date: '2024-01-15T00:00:00.000Z' } }),
      );

      const query = urlSearchParamsToQuery(params);
      const filter = query.filters as { value: Date };
      expect(filter.value).toBeInstanceOf(Date);
    });

    test('should deserialize range values', () => {
      const params = new URLSearchParams();
      params.set(
        'filters',
        JSON.stringify({ f: 'price', o: 'between', v: { $range: { min: 10, max: 100 } } }),
      );

      const query = urlSearchParamsToQuery(params);
      const filter = query.filters as { value: { min: number; max: number } };
      expect(filter.value).toEqual({ min: 10, max: 100 });
    });
  });

  describe('Quick filter helpers', () => {
    describe('eq', () => {
      test('should create equality filter', () => {
        const filter = eq('status', 'active');
        expect(filter).toEqual({
          field: 'status',
          operator: 'eq',
          value: 'active',
        });
      });

      test('should handle number values', () => {
        const filter = eq('age', 25);
        expect(filter.value).toBe(25);
      });

      test('should handle boolean values', () => {
        const filter = eq('isActive', true);
        expect(filter.value).toBe(true);
      });

      test('should handle null values', () => {
        const filter = eq('deletedAt', null);
        expect(filter.value).toBe(null);
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

      test('should handle Date values', () => {
        const date = new Date('2024-01-01');
        const filter = gt('createdAt', date);
        expect(filter.value).toEqual(date);
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

      test('should handle number arrays', () => {
        const filter = inArray('categoryId', [1, 2, 3]);
        expect(filter.value).toEqual([1, 2, 3]);
      });
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

      const params = queryToURLSearchParams(original);
      const restored = urlSearchParamsToQuery(params);

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

      const params = queryToURLSearchParams(original);
      const restored = urlSearchParamsToQuery<TestRecord>(params);

      const originalFilters = original.filters as { operator: string; conditions: unknown[] };
      const restoredFilters = restored.filters as { operator: string; conditions: unknown[] };

      expect(restoredFilters.operator).toBe(originalFilters.operator);
      expect(restoredFilters.conditions).toHaveLength(originalFilters.conditions.length);
    });
  });
});
