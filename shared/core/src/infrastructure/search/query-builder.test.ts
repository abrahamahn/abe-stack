// shared/core/src/infrastructure/search/query-builder.test.ts
import { describe, expect, test } from 'vitest';

import { createSearchQuery, fromSearchQuery, SearchQueryBuilder } from './query-builder';
import { FILTER_OPERATORS, LOGICAL_OPERATORS, type SearchQuery } from './types';

interface TestUser {
  id: string;
  name: string;
  email: string;
  age: number;
  status: 'active' | 'inactive';
  tags: string[];
  createdAt: Date;
}

describe('SearchQueryBuilder', () => {
  describe('filter methods', () => {
    test('where should add filter condition', () => {
      const query = new SearchQueryBuilder<TestUser>().where('status', 'eq', 'active').build();

      expect(query.filters).toEqual({
        field: 'status',
        operator: 'eq',
        value: 'active',
        caseSensitive: undefined,
      });
    });

    test('whereEq should add equality filter', () => {
      const query = new SearchQueryBuilder<TestUser>().whereEq('name', 'John').build();

      expect(query.filters).toMatchObject({
        field: 'name',
        operator: FILTER_OPERATORS.EQ,
        value: 'John',
      });
    });

    test('whereNeq should add not-equal filter', () => {
      const query = new SearchQueryBuilder<TestUser>().whereNeq('status', 'inactive').build();

      expect(query.filters).toMatchObject({
        field: 'status',
        operator: FILTER_OPERATORS.NEQ,
        value: 'inactive',
      });
    });

    test('comparison methods should work', () => {
      const query = new SearchQueryBuilder<TestUser>()
        .whereGt('age', 18)
        .whereGte('age', 21)
        .whereLt('age', 65)
        .whereLte('age', 60)
        .build();

      expect(query.filters).toMatchObject({
        operator: LOGICAL_OPERATORS.AND,
        conditions: expect.arrayContaining([
          expect.objectContaining({ field: 'age', operator: FILTER_OPERATORS.GT, value: 18 }),
          expect.objectContaining({ field: 'age', operator: FILTER_OPERATORS.GTE, value: 21 }),
          expect.objectContaining({ field: 'age', operator: FILTER_OPERATORS.LT, value: 65 }),
          expect.objectContaining({ field: 'age', operator: FILTER_OPERATORS.LTE, value: 60 }),
        ]),
      });
    });

    test('string filter methods should work', () => {
      const query = new SearchQueryBuilder<TestUser>()
        .whereContains('name', 'oh')
        .whereStartsWith('email', 'john')
        .whereEndsWith('email', '.com')
        .build();

      expect(query.filters).toMatchObject({
        operator: LOGICAL_OPERATORS.AND,
        conditions: expect.arrayContaining([
          expect.objectContaining({ field: 'name', operator: FILTER_OPERATORS.CONTAINS }),
          expect.objectContaining({ field: 'email', operator: FILTER_OPERATORS.StartsWith }),
          expect.objectContaining({ field: 'email', operator: FILTER_OPERATORS.EndsWith }),
        ]),
      });
    });

    test('whereLike and whereIlike should work', () => {
      const query = new SearchQueryBuilder<TestUser>()
        .whereLike('name', 'J%')
        .whereIlike('email', '%@example.com')
        .build();

      expect(query.filters).toMatchObject({
        operator: LOGICAL_OPERATORS.AND,
        conditions: [
          expect.objectContaining({ field: 'name', operator: FILTER_OPERATORS.LIKE }),
          expect.objectContaining({ field: 'email', operator: FILTER_OPERATORS.ILIKE }),
        ],
      });
    });

    test('whereIn and whereNotIn should work', () => {
      const query = new SearchQueryBuilder<TestUser>()
        .whereIn('status', ['active', 'pending'])
        .whereNotIn('id', ['1', '2', '3'])
        .build();

      expect(query.filters).toMatchObject({
        operator: LOGICAL_OPERATORS.AND,
        conditions: [
          expect.objectContaining({
            field: 'status',
            operator: FILTER_OPERATORS.IN,
            value: ['active', 'pending'],
          }),
          expect.objectContaining({
            field: 'id',
            operator: FILTER_OPERATORS.NotIn,
            value: ['1', '2', '3'],
          }),
        ],
      });
    });

    test('whereNull and whereNotNull should work', () => {
      const query = new SearchQueryBuilder<TestUser>()
        .whereNull('email')
        .whereNotNull('name')
        .build();

      expect(query.filters).toMatchObject({
        operator: LOGICAL_OPERATORS.AND,
        conditions: [
          expect.objectContaining({ field: 'email', operator: FILTER_OPERATORS.IsNull }),
          expect.objectContaining({ field: 'name', operator: FILTER_OPERATORS.IsNotNull }),
        ],
      });
    });

    test('whereBetween should work', () => {
      const query = new SearchQueryBuilder<TestUser>().whereBetween('age', 18, 65).build();

      expect(query.filters).toMatchObject({
        field: 'age',
        operator: FILTER_OPERATORS.BETWEEN,
        value: { min: 18, max: 65 },
      });
    });

    test('array field methods should work', () => {
      const query = new SearchQueryBuilder<TestUser>()
        .whereArrayContains('tags', 'typescript')
        .whereArrayContainsAny('tags', ['react', 'vue'])
        .build();

      expect(query.filters).toMatchObject({
        operator: LOGICAL_OPERATORS.AND,
        conditions: [
          expect.objectContaining({ field: 'tags', operator: FILTER_OPERATORS.ArrayContains }),
          expect.objectContaining({ field: 'tags', operator: FILTER_OPERATORS.ArrayContainsAny }),
        ],
      });
    });
  });

  describe('compound filters', () => {
    test('and should combine filters with AND', () => {
      const query = new SearchQueryBuilder<TestUser>()
        .and((b) => b.whereEq('status', 'active').whereGte('age', 18))
        .build();

      expect(query.filters).toMatchObject({
        operator: LOGICAL_OPERATORS.AND,
        conditions: expect.arrayContaining([
          expect.objectContaining({ field: 'status', operator: 'eq' }),
          expect.objectContaining({ field: 'age', operator: 'gte' }),
        ]),
      });
    });

    test('or should combine filters with OR', () => {
      const query = new SearchQueryBuilder<TestUser>()
        .or((b) => b.whereEq('status', 'active').whereEq('status', 'pending'))
        .build();

      expect(query.filters).toMatchObject({
        operator: LOGICAL_OPERATORS.OR,
        conditions: expect.any(Array),
      });
    });

    test('not should negate filters', () => {
      const query = new SearchQueryBuilder<TestUser>()
        .not((b) => b.whereEq('status', 'deleted'))
        .build();

      expect(query.filters).toMatchObject({
        operator: LOGICAL_OPERATORS.NOT,
        conditions: expect.any(Array),
      });
    });

    test('should allow nested compound filters', () => {
      const query = new SearchQueryBuilder<TestUser>()
        .whereEq('status', 'active')
        .or((b) => b.whereEq('age', 25).whereEq('age', 30))
        .build();

      expect(query.filters).toMatchObject({
        operator: LOGICAL_OPERATORS.AND,
        conditions: expect.arrayContaining([
          expect.objectContaining({ field: 'status' }),
          expect.objectContaining({ operator: LOGICAL_OPERATORS.OR }),
        ]),
      });
    });
  });

  describe('sort methods', () => {
    test('orderBy should add sort config', () => {
      const query = new SearchQueryBuilder<TestUser>().orderBy('createdAt', 'desc').build();

      expect(query.sort).toEqual([{ field: 'createdAt', order: 'desc' }]);
    });

    test('orderByAsc and orderByDesc should work', () => {
      const query = new SearchQueryBuilder<TestUser>()
        .orderByAsc('name')
        .orderByDesc('createdAt')
        .build();

      expect(query.sort).toEqual([
        { field: 'name', order: 'asc' },
        { field: 'createdAt', order: 'desc' },
      ]);
    });

    test('orderByWithNulls should include nulls option', () => {
      const query = new SearchQueryBuilder<TestUser>()
        .orderByWithNulls('age', 'asc', 'last')
        .build();

      expect(query.sort).toEqual([{ field: 'age', order: 'asc', nulls: 'last' }]);
    });

    test('clearSort should remove all sorts', () => {
      const query = new SearchQueryBuilder<TestUser>().orderBy('name', 'asc').clearSort().build();

      expect(query.sort).toBeUndefined();
    });
  });

  describe('search methods', () => {
    test('search should add full-text search config', () => {
      const query = new SearchQueryBuilder<TestUser>().search('john doe').build();

      expect(query.search).toEqual({ query: 'john doe' });
    });

    test('searchIn should specify fields', () => {
      const query = new SearchQueryBuilder<TestUser>().searchIn('john', ['name', 'email']).build();

      expect(query.search).toEqual({ query: 'john', fields: ['name', 'email'] });
    });

    test('searchFuzzy should add fuzziness', () => {
      const query = new SearchQueryBuilder<TestUser>().searchFuzzy('john', 0.7).build();

      expect(query.search).toEqual({ query: 'john', fuzziness: 0.7 });
    });

    test('clearSearch should remove search config', () => {
      const query = new SearchQueryBuilder<TestUser>().search('test').clearSearch().build();

      expect(query.search).toBeUndefined();
    });
  });

  describe('pagination methods', () => {
    test('page should set page number', () => {
      const query = new SearchQueryBuilder<TestUser>().page(3).build();

      expect(query.page).toBe(3);
    });

    test('page should enforce minimum of 1', () => {
      const query = new SearchQueryBuilder<TestUser>().page(0).build();

      expect(query.page).toBe(1);
    });

    test('limit should set items per page', () => {
      const query = new SearchQueryBuilder<TestUser>().limit(25).build();

      expect(query.limit).toBe(25);
    });

    test('limit should enforce maximum of 1000', () => {
      const query = new SearchQueryBuilder<TestUser>().limit(2000).build();

      expect(query.limit).toBe(1000);
    });

    test('cursor should set cursor', () => {
      const query = new SearchQueryBuilder<TestUser>().cursor('abc123').build();

      expect(query.cursor).toBe('abc123');
    });

    test('skip should convert to page', () => {
      const query = new SearchQueryBuilder<TestUser>().limit(10).skip(25).build();

      expect(query.page).toBe(3); // Math.floor(25/10) + 1 = 3
    });

    test('take should be alias for limit', () => {
      const query = new SearchQueryBuilder<TestUser>().take(15).build();

      expect(query.limit).toBe(15);
    });
  });

  describe('select methods', () => {
    test('select should specify fields', () => {
      const query = new SearchQueryBuilder<TestUser>().select('id', 'name', 'email').build();

      expect(query.select).toEqual(['id', 'name', 'email']);
    });

    test('clearSelect should remove selection', () => {
      const query = new SearchQueryBuilder<TestUser>().select('id', 'name').clearSelect().build();

      expect(query.select).toBeUndefined();
    });
  });

  describe('count methods', () => {
    test('withCount should enable count', () => {
      const query = new SearchQueryBuilder<TestUser>().withCount().build();

      expect(query.includeCount).toBe(true);
    });

    test('withoutCount should disable count', () => {
      const query = new SearchQueryBuilder<TestUser>().withCount().withoutCount().build();

      expect(query.includeCount).toBe(false);
    });
  });

  describe('facet methods', () => {
    test('facet should add facet config', () => {
      const query = new SearchQueryBuilder<TestUser>()
        .facet('status')
        .facet('tags', { size: 20, sortBy: 'count' })
        .buildFaceted();

      expect(query.facets).toEqual([
        { field: 'status' },
        { field: 'tags', size: 20, sortBy: 'count' },
      ]);
    });

    test('clearFacets should remove all facets', () => {
      const query = new SearchQueryBuilder<TestUser>().facet('status').clearFacets().buildFaceted();

      expect(query.facets).toBeUndefined();
    });
  });

  describe('utility methods', () => {
    test('clone should create independent copy', () => {
      const original = new SearchQueryBuilder<TestUser>()
        .whereEq('status', 'active')
        .orderBy('name', 'asc')
        .limit(20);

      const cloned = original.clone();
      cloned.whereEq('age', 25).limit(50);

      const originalQuery = original.build();
      const clonedQuery = cloned.build();

      expect(originalQuery.limit).toBe(20);
      expect(clonedQuery.limit).toBe(50);
    });

    test('reset should clear all state', () => {
      const builder = new SearchQueryBuilder<TestUser>()
        .whereEq('status', 'active')
        .orderBy('name', 'asc')
        .limit(20)
        .search('test')
        .reset();

      const query = builder.build();

      expect(query.filters).toBeUndefined();
      expect(query.sort).toBeUndefined();
      expect(query.search).toBeUndefined();
      expect(query.page).toBe(1);
      expect(query.limit).toBe(50);
    });
  });
});

describe('createSearchQuery', () => {
  test('should create new builder', () => {
    const query = createSearchQuery<TestUser>().whereEq('status', 'active').build();

    expect(query.filters).toMatchObject({
      field: 'status',
      operator: 'eq',
      value: 'active',
    });
  });
});

describe('fromSearchQuery', () => {
  test('should create builder from existing query', () => {
    const existingQuery: SearchQuery<TestUser> = {
      filters: { field: 'status', operator: 'eq', value: 'active' },
      sort: [{ field: 'name', order: 'asc' }],
      page: 2,
      limit: 25,
    };

    const builder = fromSearchQuery(existingQuery);
    const newQuery = builder.whereGte('age', 18).build();

    expect(newQuery.page).toBe(2);
    expect(newQuery.limit).toBe(25);
    expect(newQuery.sort).toEqual([{ field: 'name', order: 'asc' }]);
  });
});
