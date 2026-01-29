// packages/sdk/src/search/serialization.test.ts
import { describe, expect, test } from 'vitest';

import {
  buildURLWithQuery,
  deserializeFromHash,
  deserializeFromJSON,
  deserializeFromURLParams,
  extractQueryFromURL,
  mergeSearchParamsIntoURL,
  serializeToHash,
  serializeToJSON,
  serializeToURLParams,
} from './serialization';

import type { SearchQuery } from '@abe-stack/core';

describe('serialization', () => {
  describe('serializeToURLParams', () => {
    test('should serialize empty query', () => {
      const params = serializeToURLParams({});
      expect(params.toString()).toBe('');
    });

    test('should serialize filters', () => {
      const query: SearchQuery = {
        filters: {
          field: 'status',
          operator: 'eq',
          value: 'active',
        },
      };

      const params = serializeToURLParams(query);
      expect(params.has('filters')).toBe(true);

      const filtersStr = params.get('filters');
      expect(filtersStr).toBeDefined();
      if (filtersStr === null) throw new Error('filters is null');
      const parsed = JSON.parse(filtersStr);
      expect(parsed.f).toBe('status');
      expect(parsed.o).toBe('eq');
      expect(parsed.v).toBe('active');
    });

    test('should serialize compound filters', () => {
      const query: SearchQuery = {
        filters: {
          operator: 'and',
          conditions: [
            { field: 'status', operator: 'eq', value: 'active' },
            { field: 'age', operator: 'gte', value: 18 },
          ],
        },
      };

      const params = serializeToURLParams(query);
      const filtersStr = params.get('filters');
      if (filtersStr === null) throw new Error('filters is null');
      const parsed = JSON.parse(filtersStr);

      expect(parsed.op).toBe('and');
      expect(parsed.c).toHaveLength(2);
    });

    test('should serialize sort', () => {
      const query: SearchQuery = {
        sort: [
          { field: 'createdAt', order: 'desc' },
          { field: 'name', order: 'asc' },
        ],
      };

      const params = serializeToURLParams(query);
      expect(params.get('sort')).toBe('createdAt:desc,name:asc');
    });

    test('should serialize search query', () => {
      const query: SearchQuery = {
        search: {
          query: 'test search',
          fields: ['title', 'description'],
          fuzziness: 0.8,
        },
      };

      const params = serializeToURLParams(query);
      expect(params.get('q')).toBe('test search');
      expect(params.get('searchFields')).toBe('title,description');
      expect(params.get('fuzziness')).toBe('0.8');
    });

    test('should serialize pagination', () => {
      const query: SearchQuery = {
        page: 3,
        limit: 25,
      };

      const params = serializeToURLParams(query);
      expect(params.get('page')).toBe('3');
      expect(params.get('limit')).toBe('25');
    });

    test('should not serialize page=1 by default', () => {
      const query: SearchQuery = {
        page: 1,
        limit: 10,
      };

      const params = serializeToURLParams(query);
      expect(params.has('page')).toBe(false);
      expect(params.get('limit')).toBe('10');
    });

    test('should include page=1 when includeDefaults is true', () => {
      const query: SearchQuery = {
        page: 1,
        limit: 10,
      };

      const params = serializeToURLParams(query, { includeDefaults: true });
      expect(params.get('page')).toBe('1');
    });

    test('should serialize cursor', () => {
      const query: SearchQuery = {
        cursor: 'abc123',
      };

      const params = serializeToURLParams(query);
      expect(params.get('cursor')).toBe('abc123');
    });

    test('should serialize select fields', () => {
      const query: SearchQuery = {
        select: ['id', 'name', 'email'],
      };

      const params = serializeToURLParams(query);
      expect(params.get('select')).toBe('id,name,email');
    });

    test('should serialize includeCount', () => {
      const query: SearchQuery = {
        includeCount: true,
      };

      const params = serializeToURLParams(query);
      expect(params.get('includeCount')).toBe('1');
    });

    test('should use compact keys when compact option is true', () => {
      const query: SearchQuery = {
        filters: { field: 'status', operator: 'eq', value: 'active' },
        sort: [{ field: 'name', order: 'asc' }],
        page: 2,
        limit: 10,
      };

      const params = serializeToURLParams(query, { compact: true });
      expect(params.has('f')).toBe(true);
      expect(params.has('s')).toBe(true);
      expect(params.has('p')).toBe(true);
      expect(params.has('l')).toBe(true);
    });

    test('should serialize Date values', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const query: SearchQuery = {
        filters: {
          field: 'createdAt',
          operator: 'gte',
          value: date,
        },
      };

      const params = serializeToURLParams(query);
      const filtersStr = params.get('filters');
      if (filtersStr === null) throw new Error('filters is null');
      const parsed = JSON.parse(filtersStr);

      expect(parsed.v).toEqual({ $d: '2024-01-15T10:30:00.000Z' });
    });

    test('should serialize range values', () => {
      const query: SearchQuery = {
        filters: {
          field: 'price',
          operator: 'between',
          value: { min: 10, max: 100 },
        },
      };

      const params = serializeToURLParams(query);
      const filtersStr = params.get('filters');
      if (filtersStr === null) throw new Error('filters is null');
      const parsed = JSON.parse(filtersStr);

      expect(parsed.v).toEqual({ $r: { min: 10, max: 100 } });
    });
  });

  describe('deserializeFromURLParams', () => {
    test('should deserialize empty params', () => {
      const query = deserializeFromURLParams(new URLSearchParams());
      expect(query).toEqual({});
    });

    test('should deserialize filters', () => {
      const params = new URLSearchParams();
      params.set('filters', JSON.stringify({ f: 'status', o: 'eq', v: 'active' }));

      const query = deserializeFromURLParams(params);
      expect(query.filters).toEqual({
        field: 'status',
        operator: 'eq',
        value: 'active',
        caseSensitive: undefined,
      });
    });

    test('should deserialize compound filters', () => {
      const params = new URLSearchParams();
      params.set(
        'filters',
        JSON.stringify({
          op: 'and',
          c: [
            { f: 'status', o: 'eq', v: 'active' },
            { f: 'age', o: 'gte', v: 18 },
          ],
        }),
      );

      const query = deserializeFromURLParams(params);
      const filters = query.filters as { operator: string; conditions: unknown[] };
      expect(filters.operator).toBe('and');
      expect(filters.conditions).toHaveLength(2);
    });

    test('should deserialize sort', () => {
      const params = new URLSearchParams();
      params.set('sort', 'createdAt:desc,name:asc');

      const query = deserializeFromURLParams(params);
      expect(query.sort).toEqual([
        { field: 'createdAt', order: 'desc' },
        { field: 'name', order: 'asc' },
      ]);
    });

    test('should deserialize search', () => {
      const params = new URLSearchParams();
      params.set('q', 'test search');
      params.set('searchFields', 'title,description');
      params.set('fuzziness', '0.8');

      const query = deserializeFromURLParams(params);
      expect(query.search).toEqual({
        query: 'test search',
        fields: ['title', 'description'],
        fuzziness: 0.8,
      });
    });

    test('should deserialize pagination', () => {
      const params = new URLSearchParams();
      params.set('page', '3');
      params.set('limit', '25');

      const query = deserializeFromURLParams(params);
      expect(query.page).toBe(3);
      expect(query.limit).toBe(25);
    });

    test('should deserialize cursor', () => {
      const params = new URLSearchParams();
      params.set('cursor', 'abc123');

      const query = deserializeFromURLParams(params);
      expect(query.cursor).toBe('abc123');
    });

    test('should deserialize select fields', () => {
      const params = new URLSearchParams();
      params.set('select', 'id,name,email');

      const query = deserializeFromURLParams(params);
      expect(query.select).toEqual(['id', 'name', 'email']);
    });

    test('should deserialize includeCount', () => {
      const params = new URLSearchParams();
      params.set('includeCount', '1');

      const query = deserializeFromURLParams(params);
      expect(query.includeCount).toBe(true);
    });

    test('should accept string input', () => {
      const query = deserializeFromURLParams('page=2&limit=10');
      expect(query.page).toBe(2);
      expect(query.limit).toBe(10);
    });

    test('should handle compact keys', () => {
      const params = new URLSearchParams();
      params.set('f', JSON.stringify({ f: 'status', o: 'eq', v: 'active' }));
      params.set('s', 'name:asc');
      params.set('p', '2');
      params.set('l', '10');

      const query = deserializeFromURLParams(params);
      expect(query.filters).toBeDefined();
      expect(query.sort).toEqual([{ field: 'name', order: 'asc' }]);
      expect(query.page).toBe(2);
      expect(query.limit).toBe(10);
    });

    test('should handle invalid JSON in filters gracefully', () => {
      const params = new URLSearchParams();
      params.set('filters', 'invalid-json');

      const query = deserializeFromURLParams(params);
      expect(query.filters).toBeUndefined();
    });

    test('should ignore invalid page values', () => {
      const params = new URLSearchParams();
      params.set('page', 'abc');

      const query = deserializeFromURLParams(params);
      expect(query.page).toBeUndefined();
    });

    test('should ignore negative page values', () => {
      const params = new URLSearchParams();
      params.set('page', '-1');

      const query = deserializeFromURLParams(params);
      expect(query.page).toBeUndefined();
    });

    test('should deserialize Date values', () => {
      const params = new URLSearchParams();
      params.set(
        'filters',
        JSON.stringify({ f: 'createdAt', o: 'gte', v: { $d: '2024-01-15T10:30:00.000Z' } }),
      );

      const query = deserializeFromURLParams(params);
      const filter = query.filters as { value: Date };
      expect(filter.value).toBeInstanceOf(Date);
      expect(filter.value.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    test('should deserialize range values', () => {
      const params = new URLSearchParams();
      params.set(
        'filters',
        JSON.stringify({ f: 'price', o: 'between', v: { $r: { min: 10, max: 100 } } }),
      );

      const query = deserializeFromURLParams(params);
      const filter = query.filters as { value: { min: number; max: number } };
      expect(filter.value).toEqual({ min: 10, max: 100 });
    });
  });

  describe('serializeToJSON / deserializeFromJSON', () => {
    test('should serialize and deserialize basic query', () => {
      const query: SearchQuery = {
        filters: { field: 'status', operator: 'eq', value: 'active' },
        sort: [{ field: 'name', order: 'asc' }],
        page: 2,
        limit: 25,
      };

      const json = serializeToJSON(query);
      const restored = deserializeFromJSON(json);

      expect(restored.sort).toEqual(query.sort);
      expect(restored.page).toBe(query.page);
      expect(restored.limit).toBe(query.limit);
    });

    test('should handle base64 encoding', () => {
      const query: SearchQuery = {
        filters: { field: 'status', operator: 'eq', value: 'active' },
      };

      const encoded = serializeToJSON(query, { base64: true });
      expect(encoded).not.toContain('{'); // Should be base64

      const restored = deserializeFromJSON(encoded, { base64: true });
      expect(restored.filters).toBeDefined();
    });

    test('should preserve search configuration', () => {
      const query: SearchQuery = {
        search: {
          query: 'test',
          fields: ['title'],
          fuzziness: 0.5,
        },
      };

      const json = serializeToJSON(query);
      const restored = deserializeFromJSON(json);

      expect(restored.search?.query).toBe('test');
      expect(restored.search?.fields).toEqual(['title']);
      expect(restored.search?.fuzziness).toBe(0.5);
    });
  });

  describe('URL helpers', () => {
    describe('mergeSearchParamsIntoURL', () => {
      test('should merge params into URL', () => {
        const params = new URLSearchParams();
        params.set('page', '2');
        params.set('limit', '10');

        const url = mergeSearchParamsIntoURL('https://example.com/api', params);
        expect(url.searchParams.get('page')).toBe('2');
        expect(url.searchParams.get('limit')).toBe('10');
      });

      test('should preserve existing URL params', () => {
        const params = new URLSearchParams();
        params.set('newParam', 'value');

        const url = mergeSearchParamsIntoURL('https://example.com/api?existing=true', params);
        expect(url.searchParams.get('existing')).toBe('true');
        expect(url.searchParams.get('newParam')).toBe('value');
      });

      test('should accept URL object', () => {
        const baseUrl = new URL('https://example.com/api');
        const params = new URLSearchParams();
        params.set('page', '1');

        const url = mergeSearchParamsIntoURL(baseUrl, params);
        expect(url.searchParams.get('page')).toBe('1');
      });
    });

    describe('extractQueryFromURL', () => {
      test('should extract query from URL string', () => {
        const query = extractQueryFromURL('https://example.com/api?page=2&limit=10');
        expect(query.page).toBe(2);
        expect(query.limit).toBe(10);
      });

      test('should extract query from URL object', () => {
        const url = new URL('https://example.com/api?sort=name:asc');
        const query = extractQueryFromURL(url);
        expect(query.sort).toEqual([{ field: 'name', order: 'asc' }]);
      });
    });

    describe('buildURLWithQuery', () => {
      test('should build URL with query', () => {
        const query: SearchQuery = {
          page: 2,
          limit: 25,
          sort: [{ field: 'name', order: 'asc' }],
        };

        const url = buildURLWithQuery('https://example.com/api', query);
        expect(url.searchParams.get('page')).toBe('2');
        expect(url.searchParams.get('limit')).toBe('25');
        expect(url.searchParams.get('sort')).toBe('name:asc');
      });

      test('should apply serialization options', () => {
        const query: SearchQuery = {
          page: 2,
          filters: { field: 'status', operator: 'eq', value: 'active' },
        };

        const url = buildURLWithQuery('https://example.com/api', query, { compact: true });
        expect(url.searchParams.has('p')).toBe(true);
        expect(url.searchParams.has('f')).toBe(true);
      });
    });
  });

  describe('hash-based state', () => {
    describe('serializeToHash', () => {
      test('should serialize query to base64 hash', () => {
        const query: SearchQuery = {
          page: 2,
          filters: { field: 'status', operator: 'eq', value: 'active' },
        };

        const hash = serializeToHash(query);
        expect(hash).not.toContain('{'); // Should be base64
      });
    });

    describe('deserializeFromHash', () => {
      test('should deserialize query from hash', () => {
        const query: SearchQuery = {
          page: 2,
          filters: { field: 'status', operator: 'eq', value: 'active' },
        };

        const hash = serializeToHash(query);
        const restored = deserializeFromHash(hash);

        expect(restored.page).toBe(2);
        expect(restored.filters).toBeDefined();
      });

      test('should handle hash with # prefix', () => {
        const query: SearchQuery = { page: 3 };
        const hash = `#${String(serializeToHash(query))}`;

        const restored = deserializeFromHash(hash);
        expect(restored.page).toBe(3);
      });
    });

    test('should roundtrip complex queries', () => {
      const query: SearchQuery = {
        filters: {
          operator: 'and',
          conditions: [
            { field: 'status', operator: 'eq', value: 'active' },
            { field: 'age', operator: 'gte', value: 18 },
          ],
        },
        sort: [{ field: 'createdAt', order: 'desc' }],
        search: { query: 'test', fuzziness: 0.8 },
        page: 2,
        limit: 25,
        includeCount: true,
      };

      const hash = serializeToHash(query);
      const restored = deserializeFromHash(hash);

      expect(restored.page).toBe(query.page);
      expect(restored.limit).toBe(query.limit);
      expect(restored.includeCount).toBe(true);
      expect(restored.sort).toEqual(query.sort);
      expect(restored.search?.query).toBe('test');
    });
  });
});
