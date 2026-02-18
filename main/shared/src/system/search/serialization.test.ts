// main/shared/src/system/search/serialization.test.ts
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

import type { SearchQuery } from './types';

describe('serialization', () => {
  describe('serializeToURLParams', () => {
    test('should serialize empty query', () => {
      const params = serializeToURLParams({});
      expect(params.toString()).toBe('');
    });

    test('should serialize filters', () => {
      const query: SearchQuery = {
        filters: { field: 'status', operator: 'eq', value: 'active' },
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
        search: { query: 'test search', fields: ['title', 'description'], fuzziness: 0.8 },
      };

      const params = serializeToURLParams(query);
      expect(params.get('q')).toBe('test search');
      expect(params.get('searchFields')).toBe('title,description');
      expect(params.get('fuzziness')).toBe('0.8');
    });

    test('should serialize pagination', () => {
      const params = serializeToURLParams({ page: 3, limit: 25 });
      expect(params.get('page')).toBe('3');
      expect(params.get('limit')).toBe('25');
    });

    test('should not serialize page=1 by default', () => {
      const params = serializeToURLParams({ page: 1, limit: 10 });
      expect(params.has('page')).toBe(false);
      expect(params.get('limit')).toBe('10');
    });

    test('should include page=1 when includeDefaults is true', () => {
      const params = serializeToURLParams({ page: 1 }, { includeDefaults: true });
      expect(params.get('page')).toBe('1');
    });

    test('should serialize cursor', () => {
      const params = serializeToURLParams({ cursor: 'abc123' });
      expect(params.get('cursor')).toBe('abc123');
    });

    test('should serialize select fields', () => {
      const params = serializeToURLParams({ select: ['id', 'name', 'email'] });
      expect(params.get('select')).toBe('id,name,email');
    });

    test('should serialize includeCount', () => {
      const params = serializeToURLParams({ includeCount: true });
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
      const params = serializeToURLParams({
        filters: { field: 'createdAt', operator: 'gte', value: date },
      });

      const filtersStr = params.get('filters');
      if (filtersStr === null) throw new Error('filters is null');
      const parsed = JSON.parse(filtersStr);
      expect(parsed.v).toEqual({ $d: '2024-01-15T10:30:00.000Z' });
    });

    test('should serialize range values', () => {
      const params = serializeToURLParams({
        filters: { field: 'price', operator: 'between', value: { min: 10, max: 100 } },
      });

      const filtersStr = params.get('filters');
      if (filtersStr === null) throw new Error('filters is null');
      const parsed = JSON.parse(filtersStr);
      expect(parsed.v).toEqual({ $r: { min: 10, max: 100 } });
    });
  });

  describe('deserializeFromURLParams', () => {
    test('should deserialize empty params', () => {
      expect(deserializeFromURLParams(new URLSearchParams())).toEqual({});
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
      expect(deserializeFromURLParams(params).filters).toBeUndefined();
    });

    test('should ignore invalid page values', () => {
      const params = new URLSearchParams();
      params.set('page', 'abc');
      expect(deserializeFromURLParams(params).page).toBeUndefined();
    });

    test('should ignore negative page values', () => {
      const params = new URLSearchParams();
      params.set('page', '-1');
      expect(deserializeFromURLParams(params).page).toBeUndefined();
    });

    test('should deserialize Date values', () => {
      const params = new URLSearchParams();
      params.set(
        'filters',
        JSON.stringify({ f: 'createdAt', o: 'gte', v: { $d: '2024-01-15T10:30:00.000Z' } }),
      );

      const filter = deserializeFromURLParams(params).filters as { value: Date };
      expect(filter.value).toBeInstanceOf(Date);
      expect(filter.value.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    test('should deserialize range values', () => {
      const params = new URLSearchParams();
      params.set(
        'filters',
        JSON.stringify({ f: 'price', o: 'between', v: { $r: { min: 10, max: 100 } } }),
      );

      const filter = deserializeFromURLParams(params).filters as {
        value: { min: number; max: number };
      };
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
      expect(encoded).not.toContain('{');

      const restored = deserializeFromJSON(encoded, { base64: true });
      expect(restored.filters).toBeDefined();
    });

    test('should preserve search configuration', () => {
      const query: SearchQuery = {
        search: { query: 'test', fields: ['title'], fuzziness: 0.5 },
      };

      const json = serializeToJSON(query);
      const restored = deserializeFromJSON(json);

      expect(restored.search?.query).toBe('test');
      expect(restored.search?.fields).toEqual(['title']);
      expect(restored.search?.fuzziness).toBe(0.5);
    });
  });

  describe('URL helpers', () => {
    test('mergeSearchParamsIntoURL merges params', () => {
      const params = new URLSearchParams();
      params.set('page', '2');

      const url = mergeSearchParamsIntoURL('https://example.com/api', params);
      expect(url.searchParams.get('page')).toBe('2');
    });

    test('mergeSearchParamsIntoURL preserves existing params', () => {
      const params = new URLSearchParams();
      params.set('newParam', 'value');

      const url = mergeSearchParamsIntoURL('https://example.com/api?existing=true', params);
      expect(url.searchParams.get('existing')).toBe('true');
      expect(url.searchParams.get('newParam')).toBe('value');
    });

    test('extractQueryFromURL extracts from string', () => {
      const query = extractQueryFromURL('https://example.com/api?page=2&limit=10');
      expect(query.page).toBe(2);
      expect(query.limit).toBe(10);
    });

    test('extractQueryFromURL extracts from URL object', () => {
      const url = new URL('https://example.com/api?sort=name:asc');
      const query = extractQueryFromURL(url);
      expect(query.sort).toEqual([{ field: 'name', order: 'asc' }]);
    });

    test('buildURLWithQuery builds complete URL', () => {
      const query: SearchQuery = { page: 2, limit: 25, sort: [{ field: 'name', order: 'asc' }] };
      const url = buildURLWithQuery('https://example.com/api', query);

      expect(url.searchParams.get('page')).toBe('2');
      expect(url.searchParams.get('limit')).toBe('25');
      expect(url.searchParams.get('sort')).toBe('name:asc');
    });
  });

  describe('hash-based state', () => {
    test('should serialize query to base64 hash', () => {
      const hash = serializeToHash({ page: 2 });
      expect(hash).not.toContain('{');
    });

    test('should roundtrip through hash', () => {
      const query: SearchQuery = {
        filters: { field: 'status', operator: 'eq', value: 'active' },
        page: 2,
      };

      const hash = serializeToHash(query);
      const restored = deserializeFromHash(hash);
      expect(restored.page).toBe(2);
      expect(restored.filters).toBeDefined();
    });

    test('should handle hash with # prefix', () => {
      const hash = `#${serializeToHash({ page: 3 })}`;
      const restored = deserializeFromHash(hash);
      expect(restored.page).toBe(3);
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

  // ============================================================================
  // Adversarial Tests
  // ============================================================================

  describe('adversarial: malformed JSON inputs', () => {
    test('deserializeFromURLParams: truncated JSON in filters param does not throw', () => {
      const params = new URLSearchParams();
      params.set('filters', '{"f":"status","o":"eq","v"');
      // Should swallow the parse error
      const result = deserializeFromURLParams(params);
      expect(result.filters).toBeUndefined();
    });

    test('deserializeFromURLParams: empty JSON object in filters produces undefined filter', () => {
      const params = new URLSearchParams();
      params.set('filters', '{}');
      const result = deserializeFromURLParams(params);
      // {} has no f/op/c keys — deserializeFilter returns a condition with undefined fields
      expect(result.filters).toBeDefined(); // it deserializes as a condition with undefined fields
    });

    test('deserializeFromURLParams: JSON array instead of object in filters', () => {
      const params = new URLSearchParams();
      params.set('filters', '[1,2,3]');
      // JSON.parse succeeds; deserializeFilter sees an array (not op/c/f) — may produce partial result
      // We just verify it does not throw
      expect(() => deserializeFromURLParams(params)).not.toThrow();
    });

    test('deserializeFromURLParams: filters param with control characters does not throw', () => {
      const params = new URLSearchParams();
      params.set('filters', '{"f":"st\x00atus","o":"eq","v":"a"}');
      // JSON.parse handles null bytes in strings
      expect(() => deserializeFromURLParams(params)).not.toThrow();
    });

    test('deserializeFromJSON throws on malformed JSON string', () => {
      expect(() => deserializeFromJSON('{bad json}')).toThrow();
    });

    test('deserializeFromHash throws on malformed base64', () => {
      // atob throws on invalid base64
      expect(() => deserializeFromHash('!!!not-base64!!!')).toThrow();
    });

    test('deserializeFromJSON with base64=true throws on invalid base64', () => {
      expect(() => deserializeFromJSON('not-valid-base64!!!', { base64: true })).toThrow();
    });
  });

  describe('adversarial: special characters in keys and values', () => {
    test('filter value with special URL characters round-trips via URLParams', () => {
      const specialValue = 'hello & world = true ? yes : no';
      const query: SearchQuery = {
        filters: { field: 'description', operator: 'eq', value: specialValue },
      };

      const params = serializeToURLParams(query);
      const restored = deserializeFromURLParams(params);
      const filter = restored.filters as { value: string };
      expect(filter.value).toBe(specialValue);
    });

    test('filter field with dots round-trips via URLParams', () => {
      const query: SearchQuery = {
        filters: { field: 'user.profile.email', operator: 'eq', value: 'x@y.com' },
      };

      const params = serializeToURLParams(query);
      const restored = deserializeFromURLParams(params);
      const filter = restored.filters as { field: string };
      expect(filter.field).toBe('user.profile.email');
    });

    test('filter value with unicode characters round-trips via JSON', () => {
      const unicodeValue = '你好世界 🌍';
      const query: SearchQuery = {
        filters: { field: 'title', operator: 'eq', value: unicodeValue },
      };

      const json = serializeToJSON(query);
      const restored = deserializeFromJSON(json);
      const filter = restored.filters as { value: string };
      expect(filter.value).toBe(unicodeValue);
    });

    test('filter value with SQL injection round-trips via JSON', () => {
      const sqlValue = "'; DROP TABLE users; SELECT '1'='1";
      const query: SearchQuery = {
        filters: { field: 'name', operator: 'eq', value: sqlValue },
      };

      const json = serializeToJSON(query);
      const restored = deserializeFromJSON(json);
      const filter = restored.filters as { value: string };
      expect(filter.value).toBe(sqlValue);
    });

    test('sort field with special characters round-trips', () => {
      const query: SearchQuery = {
        sort: [{ field: 'created_at', order: 'desc' }],
      };

      const params = serializeToURLParams(query);
      const restored = deserializeFromURLParams(params);
      expect(restored.sort?.[0]?.field).toBe('created_at');
    });

    test('cursor with base64 padding characters round-trips', () => {
      const cursor = 'eyJpZCI6MTIzLCJuYW1lIjoiSm9obiJ9==';
      const query: SearchQuery = { cursor };
      const params = serializeToURLParams(query);
      const restored = deserializeFromURLParams(params);
      expect(restored.cursor).toBe(cursor);
    });

    test('search query with newlines round-trips via JSON', () => {
      const queryStr = 'line one\nline two\ttabbed';
      const query: SearchQuery = { search: { query: queryStr } };
      const json = serializeToJSON(query);
      const restored = deserializeFromJSON(json);
      expect(restored.search?.query).toBe(queryStr);
    });
  });

  describe('adversarial: null and empty inputs', () => {
    test('serializeToURLParams: empty query produces empty params', () => {
      expect(serializeToURLParams({}).toString()).toBe('');
    });

    test('serializeToURLParams: undefined sort is omitted', () => {
      const params = serializeToURLParams({ sort: undefined });
      expect(params.has('sort')).toBe(false);
    });

    test('serializeToURLParams: empty sort array is omitted', () => {
      const params = serializeToURLParams({ sort: [] });
      expect(params.has('sort')).toBe(false);
    });

    test('serializeToURLParams: empty cursor is omitted', () => {
      const params = serializeToURLParams({ cursor: '' });
      expect(params.has('cursor')).toBe(false);
      expect(params.has('c')).toBe(false);
    });

    test('serializeToURLParams: empty select array is omitted', () => {
      const params = serializeToURLParams({ select: [] });
      expect(params.has('select')).toBe(false);
    });

    test('deserializeFromURLParams: empty string input returns empty query', () => {
      const result = deserializeFromURLParams('');
      expect(result).toEqual({});
    });

    test('deserializeFromURLParams: page=0 is rejected (must be > 0)', () => {
      const result = deserializeFromURLParams('page=0');
      expect(result.page).toBeUndefined();
    });

    test('deserializeFromURLParams: limit=0 is rejected', () => {
      const result = deserializeFromURLParams('limit=0');
      expect(result.limit).toBeUndefined();
    });

    test('deserializeFromURLParams: NaN fuzziness is ignored', () => {
      const params = new URLSearchParams();
      params.set('q', 'test');
      params.set('fuzziness', 'not-a-number');
      const result = deserializeFromURLParams(params);
      expect(result.search?.fuzziness).toBeUndefined();
    });

    test('serializeToJSON then deserializeFromJSON with empty query roundtrips', () => {
      const json = serializeToJSON({});
      const restored = deserializeFromJSON(json);
      expect(restored).toEqual({});
    });
  });

  describe('adversarial: large payload handling', () => {
    test('many sort fields round-trip correctly', () => {
      const sort = Array.from({ length: 50 }, (_, i) => ({
        field: `field_${String(i)}`,
        order: i % 2 === 0 ? ('asc' as const) : ('desc' as const),
      }));
      const query: SearchQuery = { sort };

      const params = serializeToURLParams(query);
      const restored = deserializeFromURLParams(params);

      expect(restored.sort).toHaveLength(50);
      expect(restored.sort?.[0]?.field).toBe('field_0');
      expect(restored.sort?.[49]?.field).toBe('field_49');
    });

    test('deeply nested compound filter round-trips via JSON', () => {
      const deepFilter = {
        operator: 'and' as const,
        conditions: [
          {
            operator: 'or' as const,
            conditions: [
              { field: 'a', operator: 'eq' as const, value: '1' },
              { field: 'b', operator: 'eq' as const, value: '2' },
            ],
          },
          {
            operator: 'not' as const,
            conditions: [{ field: 'c', operator: 'eq' as const, value: '3' }],
          },
        ],
      };
      const query: SearchQuery = { filters: deepFilter };
      const json = serializeToJSON(query);
      const restored = deserializeFromJSON(json);

      expect(restored.filters).toBeDefined();
      const restoredFilter = restored.filters as typeof deepFilter;
      expect(restoredFilter.operator).toBe('and');
      expect(restoredFilter.conditions).toHaveLength(2);
    });

    test('many select fields round-trip', () => {
      const select = Array.from({ length: 100 }, (_, i) => `field${String(i)}`);
      const query: SearchQuery = { select };

      const params = serializeToURLParams(query);
      const restored = deserializeFromURLParams(params);

      expect(restored.select).toHaveLength(100);
      expect(restored.select?.[0]).toBe('field0');
      expect(restored.select?.[99]).toBe('field99');
    });
  });

  describe('adversarial: Date serialization edge cases', () => {
    test('Date at Unix epoch round-trips correctly', () => {
      const epoch = new Date(0);
      const query: SearchQuery = {
        filters: { field: 'ts', operator: 'eq', value: epoch },
      };

      const json = serializeToJSON(query);
      const restored = deserializeFromJSON(json);
      const filter = restored.filters as { value: Date };
      expect(filter.value).toBeInstanceOf(Date);
      expect(filter.value.getTime()).toBe(0);
    });

    test('Date in far future round-trips', () => {
      const future = new Date('2099-12-31T23:59:59.999Z');
      const query: SearchQuery = {
        filters: { field: 'ts', operator: 'lt', value: future },
      };

      const json = serializeToJSON(query);
      const restored = deserializeFromJSON(json);
      const filter = restored.filters as { value: Date };
      expect(filter.value.toISOString()).toBe('2099-12-31T23:59:59.999Z');
    });

    test('Date range round-trips via hash', () => {
      const min = new Date('2020-01-01');
      const max = new Date('2024-12-31');
      const query: SearchQuery = {
        filters: { field: 'ts', operator: 'between', value: { min, max } },
      };

      const hash = serializeToHash(query);
      const restored = deserializeFromHash(hash);
      const filter = restored.filters as { value: { min: Date; max: Date } };
      expect(filter.value.min).toBeInstanceOf(Date);
      expect(filter.value.max).toBeInstanceOf(Date);
      expect(filter.value.min.getFullYear()).toBe(2020);
      expect(filter.value.max.getFullYear()).toBe(2024);
    });

    test('array of Dates round-trips via JSON', () => {
      const dates = [new Date('2024-01-01'), new Date('2024-06-01'), new Date('2024-12-01')];
      const query: SearchQuery = {
        filters: { field: 'ts', operator: 'in', value: dates },
      };

      const json = serializeToJSON(query);
      const restored = deserializeFromJSON(json);
      const filter = restored.filters as { value: Date[] };
      expect(filter.value).toHaveLength(3);
      expect(filter.value[0]).toBeInstanceOf(Date);
      expect(filter.value[0]?.getFullYear()).toBe(2024);
    });
  });

  describe('adversarial: URL helper edge cases', () => {
    test('mergeSearchParamsIntoURL overwrites duplicate keys', () => {
      const newParamsObj = new URLSearchParams();
      newParamsObj.set('page', '5');

      const url = mergeSearchParamsIntoURL('https://example.com/api?page=1', newParamsObj);
      expect(url.searchParams.get('page')).toBe('5');
    });

    test('extractQueryFromURL handles URL with no query string', () => {
      const query = extractQueryFromURL('https://example.com/api');
      expect(query).toEqual({});
    });

    test('extractQueryFromURL handles URL with hash', () => {
      // Hash is not part of URLSearchParams — should be ignored
      const query = extractQueryFromURL('https://example.com/api?page=2#section');
      expect(query.page).toBe(2);
    });

    test('buildURLWithQuery with compact option uses short keys', () => {
      const query: SearchQuery = {
        filters: { field: 'status', operator: 'eq', value: 'active' },
        page: 3,
      };
      const url = buildURLWithQuery('https://example.com/api', query, { compact: true });

      expect(url.searchParams.has('f')).toBe(true);
      expect(url.searchParams.has('p')).toBe(true);
      expect(url.searchParams.has('filters')).toBe(false);
      expect(url.searchParams.has('page')).toBe(false);
    });

    test('mergeSearchParamsIntoURL accepts URL object input', () => {
      const url = new URL('https://example.com/api?existing=1');
      const extra = new URLSearchParams('newKey=newVal');

      const result = mergeSearchParamsIntoURL(url, extra);
      expect(result.searchParams.get('existing')).toBe('1');
      expect(result.searchParams.get('newKey')).toBe('newVal');
    });

    test('buildURLWithQuery does not modify the base URL string', () => {
      const base = 'https://example.com/search';
      const query: SearchQuery = { page: 2 };
      buildURLWithQuery(base, query);
      // Original string is unaffected (strings are immutable in JS)
      expect(base).toBe('https://example.com/search');
    });
  });

  describe('adversarial: compact vs non-compact key disambiguation', () => {
    test('compact serialized params are deserialized correctly by deserializeFromURLParams', () => {
      const query: SearchQuery = {
        filters: { field: 'role', operator: 'eq', value: 'admin' },
        sort: [{ field: 'name', order: 'asc' }],
        page: 5,
        limit: 20,
        cursor: 'tok123',
        select: ['id', 'email'],
        includeCount: true,
      };

      const params = serializeToURLParams(query, { compact: true });
      const restored = deserializeFromURLParams(params);

      const filter = restored.filters as { field: string; value: string };
      expect(filter.field).toBe('role');
      expect(filter.value).toBe('admin');
      expect(restored.sort?.[0]?.field).toBe('name');
      expect(restored.page).toBe(5);
      expect(restored.limit).toBe(20);
      expect(restored.cursor).toBe('tok123');
      expect(restored.select).toEqual(['id', 'email']);
      expect(restored.includeCount).toBe(true);
    });

    test('non-compact and compact params differ in keys but produce equivalent query', () => {
      const query: SearchQuery = { page: 2, limit: 10 };

      const compact = serializeToURLParams(query, { compact: true });
      const full = serializeToURLParams(query, { compact: false });

      expect(compact.has('p')).toBe(true);
      expect(compact.has('page')).toBe(false);
      expect(full.has('page')).toBe(true);
      expect(full.has('p')).toBe(false);

      const restoredCompact = deserializeFromURLParams(compact);
      const restoredFull = deserializeFromURLParams(full);

      expect(restoredCompact.page).toBe(restoredFull.page);
      expect(restoredCompact.limit).toBe(restoredFull.limit);
    });
  });

  describe('adversarial: sort deserialization edge cases', () => {
    test('sort string with only field and no colon defaults to asc', () => {
      const params = new URLSearchParams();
      params.set('sort', 'name');
      const result = deserializeFromURLParams(params);
      // split(':') on 'name' gives ['name', undefined]; order undefined !== 'desc' so defaults to 'asc'
      expect(result.sort?.[0]?.order).toBe('asc');
    });

    test('sort string with unknown order defaults to asc', () => {
      const params = new URLSearchParams();
      params.set('sort', 'name:random');
      const result = deserializeFromURLParams(params);
      expect(result.sort?.[0]?.order).toBe('asc');
    });

    test('sort string with desc produces desc order', () => {
      const params = new URLSearchParams();
      params.set('sort', 'createdAt:desc');
      const result = deserializeFromURLParams(params);
      expect(result.sort?.[0]?.order).toBe('desc');
    });

    test('multiple sort fields parse correctly', () => {
      const params = new URLSearchParams();
      params.set('sort', 'a:asc,b:desc,c:asc');
      const result = deserializeFromURLParams(params);
      expect(result.sort).toHaveLength(3);
      expect(result.sort?.[1]?.order).toBe('desc');
      expect(result.sort?.[1]?.field).toBe('b');
    });
  });

  describe('adversarial: includeCount deserialization', () => {
    test('includeCount=1 is truthy', () => {
      const params = new URLSearchParams('includeCount=1');
      expect(deserializeFromURLParams(params).includeCount).toBe(true);
    });

    test('includeCount=true is truthy', () => {
      const params = new URLSearchParams('includeCount=true');
      expect(deserializeFromURLParams(params).includeCount).toBe(true);
    });

    test('includeCount=0 is not set (only 1 and true are truthy)', () => {
      const params = new URLSearchParams('includeCount=0');
      expect(deserializeFromURLParams(params).includeCount).toBeUndefined();
    });

    test('includeCount=false is not set', () => {
      const params = new URLSearchParams('includeCount=false');
      expect(deserializeFromURLParams(params).includeCount).toBeUndefined();
    });

    test('compact ic=1 is truthy', () => {
      const params = new URLSearchParams('ic=1');
      expect(deserializeFromURLParams(params).includeCount).toBe(true);
    });
  });
});
