// main/client/engine/src/__tests__/client-engine-search.integration.test.ts
/**
 * Client Engine & Search Integration Tests (4.18)
 *
 * Tests:
 * - ClientSearchQueryBuilder URL serialization/deserialization roundtrip
 * - Client engine exports validation
 * - Search query builder advanced filter compositions
 * - Faceted search query building
 * - Query builder clone and reset isolation
 */

import {
  contains,
  createSearchQuery,
  deserializeFromURLParams,
  eq,
  gt,
  inArray,
  lt,
  neq,
  serializeToURLParams,
} from '@bslt/shared';
import { describe, expect, it } from 'vitest';

import {
  ClientSearchQueryBuilder,
  createClientSearchQuery,
  fromClientSearchQuery,
} from '../search/query-builder';

// ============================================================================
// Client Search Query Builder - Advanced Integration Tests
// ============================================================================

describe('ClientSearchQueryBuilder — Advanced Integration', () => {
  describe('URL roundtrip with complex queries', () => {
    it('roundtrips multi-filter query through URL params', () => {
      const original = createClientSearchQuery()
        .whereEq('status', 'active')
        .whereGt('age', 18)
        .orderByDesc('createdAt')
        .orderByAsc('name')
        .page(3)
        .limit(25)
        .withCount()
        .build();

      const params = serializeToURLParams(original);
      const restored = deserializeFromURLParams(params) as Record<string, unknown>;

      expect(restored['page']).toBe(original.page);
      expect(restored['limit']).toBe(original.limit);
      expect(restored['sort']).toEqual(original.sort);
      expect(restored['includeCount']).toBe(true);
    });

    it('roundtrips search query with full-text search through URL', () => {
      const builder = createClientSearchQuery().search('hello world').page(1).limit(10);

      const queryString = builder.toQueryString();
      const restored = ClientSearchQueryBuilder.fromURLSearchParams(queryString);
      const restoredQuery = restored.build();

      expect(restoredQuery.search?.query).toBe('hello world');
      expect(restoredQuery.limit).toBe(10);
    });

    it('roundtrips through toURLSearchParams -> fromURLSearchParams', () => {
      const builder = createClientSearchQuery()
        .whereEq('status', 'active')
        .orderByDesc('updatedAt')
        .page(2)
        .limit(20);

      const params = builder.toURLSearchParams();
      const restored = ClientSearchQueryBuilder.fromURLSearchParams(params);
      const restoredQuery = restored.build();

      expect(restoredQuery.page).toBe(2);
      expect(restoredQuery.limit).toBe(20);
      expect(restoredQuery.sort).toEqual([{ field: 'updatedAt', order: 'desc' }]);
    });
  });

  describe('complex filter compositions', () => {
    it('builds compound AND filter with nested OR', () => {
      interface TestRecord {
        status: string;
        role: string;
        age: number;
      }

      const query = createClientSearchQuery<TestRecord>()
        .whereEq('status', 'active')
        .or((b) => b.whereEq('role', 'admin').whereEq('role', 'moderator'))
        .build();

      expect(query.filters).toBeDefined();
      // Should have AND at top level containing status filter and OR group
      const filters = query.filters as { operator: string; conditions: unknown[] };
      expect(filters.operator).toBe('and');
      expect(filters.conditions.length).toBe(2);
    });

    it('builds NOT filter', () => {
      const query = createClientSearchQuery()
        .not((b) => b.whereEq('status', 'deleted'))
        .build();

      const filters = query.filters as { operator: string; conditions: unknown[] };
      expect(filters.operator).toBe('not');
      expect(filters.conditions.length).toBe(1);
    });

    it('builds deeply nested compound filters', () => {
      interface TestRecord {
        status: string;
        role: string;
        tier: string;
      }

      const query = createClientSearchQuery<TestRecord>()
        .and((b) =>
          b
            .whereEq('status', 'active')
            .or((b2) => b2.whereEq('role', 'admin').whereEq('role', 'moderator')),
        )
        .build();

      expect(query.filters).toBeDefined();
    });

    it('supports all filter operators', () => {
      const builder = createClientSearchQuery();

      // Apply all operator types
      const query = builder
        .whereEq('a', 1)
        .whereNeq('b', 2)
        .whereGt('c', 3)
        .whereGte('d', 4)
        .whereLt('e', 5)
        .whereLte('f', 6)
        .whereContains('g', 'test')
        .whereStartsWith('h', 'pre')
        .whereEndsWith('i', 'suf')
        .whereIn('j', [1, 2, 3])
        .whereNotIn('k', [4, 5])
        .whereNull('l')
        .whereNotNull('m')
        .whereBetween('n', 1, 100)
        .build();

      expect(query.filters).toBeDefined();
      const filters = query.filters as { operator: string; conditions: unknown[] };
      expect(filters.conditions.length).toBe(14);
    });
  });

  describe('search configuration', () => {
    it('supports searchIn with specific fields', () => {
      const query = createClientSearchQuery()
        .searchIn('test', ['title', 'description', 'body'])
        .build();

      expect(query.search?.query).toBe('test');
      expect(query.search?.fields).toEqual(['title', 'description', 'body']);
    });

    it('supports fuzzy search', () => {
      const query = createClientSearchQuery().searchFuzzy('test', 0.7).build();

      expect(query.search?.query).toBe('test');
      expect(query.search?.fuzziness).toBe(0.7);
    });

    it('clearSearch removes search config', () => {
      const query = createClientSearchQuery().search('test').clearSearch().build();

      expect(query.search).toBeUndefined();
    });
  });

  describe('pagination edge cases', () => {
    it('page defaults to 1', () => {
      const query = createClientSearchQuery().build();
      expect(query.page).toBe(1);
    });

    it('limit defaults to 50', () => {
      const query = createClientSearchQuery().build();
      expect(query.limit).toBe(50);
    });

    it('page(0) is coerced to 1', () => {
      const query = createClientSearchQuery().page(0).build();
      expect(query.page).toBe(1);
    });

    it('negative page is coerced to 1', () => {
      const query = createClientSearchQuery().page(-5).build();
      expect(query.page).toBe(1);
    });

    it('limit respects maxPageSize', () => {
      const query = createClientSearchQuery().limit(5000).build();
      // Default max is 1000
      expect(query.limit).toBeLessThanOrEqual(1000);
    });

    it('skip converts to correct page', () => {
      const query = createClientSearchQuery().limit(10).skip(30).build();
      // floor(30/10) + 1 = 4
      expect(query.page).toBe(4);
    });

    it('cursor pagination works', () => {
      const query = createClientSearchQuery().cursor('eyJpZCI6MTAwfQ==').limit(20).build();

      expect(query.cursor).toBe('eyJpZCI6MTAwfQ==');
      expect(query.limit).toBe(20);
    });
  });

  describe('select and count options', () => {
    it('select specifies fields to return', () => {
      const query = createClientSearchQuery().select('id', 'name', 'email').build();

      expect(query.select).toEqual(['id', 'name', 'email']);
    });

    it('withCount enables count', () => {
      const query = createClientSearchQuery().withCount().build();
      expect(query.includeCount).toBe(true);
    });

    it('withoutCount disables count', () => {
      const query = createClientSearchQuery().withCount().withoutCount().build();

      expect(query.includeCount).toBe(false);
    });
  });

  describe('faceted search', () => {
    it('builds faceted query with single facet', () => {
      const query = createClientSearchQuery().facet('category').buildFaceted();

      expect(query.facets).toEqual([{ field: 'category' }]);
    });

    it('builds faceted query with multiple facets and options', () => {
      const query = createClientSearchQuery()
        .facet('category')
        .facet('status', { size: 10, sortBy: 'count' })
        .facet('tags', { size: 20 })
        .buildFaceted();

      expect(query.facets).toHaveLength(3);
      expect(query.facets?.[1]).toEqual({
        field: 'status',
        size: 10,
        sortBy: 'count',
      });
    });

    it('clearFacets removes all facets', () => {
      const query = createClientSearchQuery().facet('category').clearFacets().buildFaceted();

      expect(query.facets).toBeUndefined();
    });
  });

  describe('builder isolation (clone and reset)', () => {
    it('clone creates independent copy', () => {
      const original = createClientSearchQuery().whereEq('status', 'active').limit(20);

      const cloned = original.clone();
      cloned.whereEq('age', 25).limit(50);

      const originalQuery = original.build();
      const clonedQuery = cloned.build();

      expect(originalQuery.limit).toBe(20);
      expect(clonedQuery.limit).toBe(50);
    });

    it('reset clears all builder state', () => {
      const query = createClientSearchQuery()
        .whereEq('status', 'active')
        .orderByDesc('createdAt')
        .search('test')
        .limit(20)
        .page(3)
        .select('id', 'name')
        .withCount()
        .reset()
        .build();

      expect(query.filters).toBeUndefined();
      expect(query.sort).toBeUndefined();
      expect(query.search).toBeUndefined();
      expect(query.page).toBe(1);
      expect(query.limit).toBe(50);
      expect(query.select).toBeUndefined();
      expect(query.includeCount).toBeUndefined();
    });
  });
});

// ============================================================================
// Quick Filter Helpers
// ============================================================================

describe('Quick Filter Helpers — Integration', () => {
  it('eq creates equality filter usable in builder', () => {
    const filter = eq('status', 'active');
    expect(filter.operator).toBe('eq');
    expect(filter.value).toBe('active');
  });

  it('neq creates not-equal filter', () => {
    const filter = neq('status', 'deleted');
    expect(filter.operator).toBe('neq');
    expect(filter.value).toBe('deleted');
  });

  it('gt creates greater-than filter', () => {
    const filter = gt('age', 18);
    expect(filter.operator).toBe('gt');
    expect(filter.value).toBe(18);
  });

  it('lt creates less-than filter', () => {
    const filter = lt('price', 100);
    expect(filter.operator).toBe('lt');
    expect(filter.value).toBe(100);
  });

  it('contains creates contains filter', () => {
    const filter = contains('name', 'john');
    expect(filter.operator).toBe('contains');
    expect(filter.value).toBe('john');
  });

  it('inArray creates in filter', () => {
    const filter = inArray('status', ['active', 'pending']);
    expect(filter.operator).toBe('in');
    expect(filter.value).toEqual(['active', 'pending']);
  });
});

// ============================================================================
// fromSearchQuery and fromClientSearchQuery Integration
// ============================================================================

describe('fromSearchQuery — Integration', () => {
  it('reconstructs builder from complete query object', () => {
    const original = createClientSearchQuery()
      .whereEq('status', 'active')
      .orderByDesc('createdAt')
      .page(3)
      .limit(25)
      .search('test')
      .withCount()
      .build();

    const restored = fromClientSearchQuery(original);
    const restoredQuery = restored.build();

    expect(restoredQuery.page).toBe(3);
    expect(restoredQuery.limit).toBe(25);
    expect(restoredQuery.sort).toEqual(original.sort);
    expect(restoredQuery.search?.query).toBe('test');
    expect(restoredQuery.includeCount).toBe(true);
  });

  it('reconstructed builder can be further modified', () => {
    const original = createClientSearchQuery().whereEq('status', 'active').page(2).build();

    const restored = fromClientSearchQuery(original);
    const modified = restored.orderByAsc('name').limit(10).build();

    expect(modified.page).toBe(2);
    expect(modified.limit).toBe(10);
    expect(modified.sort).toEqual([{ field: 'name', order: 'asc' }]);
  });

  it('preserves cursor from original query', () => {
    const original = { cursor: 'abc123', limit: 20 };
    const restored = fromClientSearchQuery(original);
    const query = restored.build();

    expect(query.cursor).toBe('abc123');
  });

  it('preserves select fields from original query', () => {
    const original = { select: ['id', 'name', 'email'] };
    const restored = fromClientSearchQuery(original);
    const query = restored.build();

    expect(query.select).toEqual(['id', 'name', 'email']);
  });
});

// ============================================================================
// Server-side SearchQueryBuilder (from shared)
// ============================================================================

describe('Server SearchQueryBuilder — Integration', () => {
  it('creates query with all supported filter operators', () => {
    const query = createSearchQuery()
      .whereEq('status', 'active')
      .whereNeq('deleted', true)
      .whereGt('age', 18)
      .whereGte('score', 80)
      .whereLt('price', 1000)
      .whereLte('quantity', 100)
      .whereContains('name', 'john')
      .whereStartsWith('email', 'j')
      .whereEndsWith('domain', '.com')
      .whereIn('role', ['admin', 'editor'])
      .whereNotIn('id', ['1', '2'])
      .whereNull('deletedAt')
      .whereNotNull('createdAt')
      .whereBetween('age', 18, 65)
      .whereArrayContains('tags', 'featured')
      .build();

    expect(query.filters).toBeDefined();
    const filters = query.filters as { operator: string; conditions: unknown[] };
    expect(filters.operator).toBe('and');
    expect(filters.conditions.length).toBe(15);
  });

  it('supports custom maxPageSize', () => {
    const query = createSearchQuery(500).limit(1000).build();
    expect(query.limit).toBe(500);
  });

  it('supports like and ilike operators', () => {
    const query = createSearchQuery()
      .whereLike('name', 'J%', true)
      .whereIlike('email', '%@example.com')
      .build();

    const filters = query.filters as { operator: string; conditions: unknown[] };
    expect(filters.conditions.length).toBe(2);
  });

  it('supports null handling in sort', () => {
    const query = createSearchQuery().orderByWithNulls('deletedAt', 'asc', 'last').build();

    expect(query.sort).toEqual([{ field: 'deletedAt', order: 'asc', nulls: 'last' }]);
  });
});

// ============================================================================
// Client Engine Module Exports
// ============================================================================

describe('Client Engine Exports', () => {
  it('exports createClientSearchQuery', () => {
    expect(typeof createClientSearchQuery).toBe('function');
  });

  it('exports ClientSearchQueryBuilder class', () => {
    expect(typeof ClientSearchQueryBuilder).toBe('function');
    const instance = new ClientSearchQueryBuilder();
    expect(typeof instance.toURLSearchParams).toBe('function');
    expect(typeof instance.toQueryString).toBe('function');
    expect(typeof instance.build).toBe('function');
  });

  it('exports fromClientSearchQuery', () => {
    expect(typeof fromClientSearchQuery).toBe('function');
  });

  it('ClientSearchQueryBuilder.fromURLSearchParams is a static method', () => {
    expect(typeof ClientSearchQueryBuilder.fromURLSearchParams).toBe('function');
  });

  it('ClientSearchQueryBuilder.fromQuery is a static method', () => {
    expect(typeof ClientSearchQueryBuilder.fromQuery).toBe('function');
  });
});
