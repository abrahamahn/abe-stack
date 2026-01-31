// shared/core/src/infrastructure/search/schemas.test.ts
import { describe, expect, test } from 'vitest';

import {
  compoundFilterSchema,
  facetConfigSchema,
  filterConditionSchema,
  filterOperatorSchema,
  filterValueSchema,
  fullTextSearchConfigSchema,
  logicalOperatorSchema,
  rangeValueSchema,
  SEARCH_DEFAULTS,
  searchQuerySchema,
  sortConfigSchema,
  urlSearchParamsSchema,
} from './schemas';

describe('search schemas', () => {
  describe('filterOperatorSchema', () => {
    test('should accept valid operators', () => {
      const validOperators = [
        'eq',
        'neq',
        'gt',
        'gte',
        'lt',
        'lte',
        'contains',
        'startsWith',
        'endsWith',
        'like',
        'ilike',
        'in',
        'notIn',
        'isNull',
        'isNotNull',
        'between',
        'arrayContains',
        'arrayContainsAny',
        'fullText',
      ];

      for (const op of validOperators) {
        expect(filterOperatorSchema.safeParse(op).success).toBe(true);
      }
    });

    test('should reject invalid operators', () => {
      expect(filterOperatorSchema.safeParse('invalid').success).toBe(false);
      expect(filterOperatorSchema.safeParse('EQUALS').success).toBe(false);
    });
  });

  describe('logicalOperatorSchema', () => {
    test('should accept valid operators', () => {
      expect(logicalOperatorSchema.safeParse('and').success).toBe(true);
      expect(logicalOperatorSchema.safeParse('or').success).toBe(true);
      expect(logicalOperatorSchema.safeParse('not').success).toBe(true);
    });

    test('should reject invalid operators', () => {
      expect(logicalOperatorSchema.safeParse('xor').success).toBe(false);
    });
  });

  describe('filterValueSchema', () => {
    test('should accept primitives', () => {
      expect(filterValueSchema.safeParse('string').success).toBe(true);
      expect(filterValueSchema.safeParse(123).success).toBe(true);
      expect(filterValueSchema.safeParse(true).success).toBe(true);
      expect(filterValueSchema.safeParse(null).success).toBe(true);
      expect(filterValueSchema.safeParse(new Date()).success).toBe(true);
    });

    test('should accept arrays', () => {
      expect(filterValueSchema.safeParse(['a', 'b', 'c']).success).toBe(true);
      expect(filterValueSchema.safeParse([1, 2, 3]).success).toBe(true);
    });

    test('should accept range objects', () => {
      expect(filterValueSchema.safeParse({ min: 10, max: 20 }).success).toBe(true);
      expect(filterValueSchema.safeParse({ min: 'a', max: 'z' }).success).toBe(true);
    });
  });

  describe('rangeValueSchema', () => {
    test('should accept valid ranges', () => {
      expect(rangeValueSchema.safeParse({ min: 0, max: 100 }).success).toBe(true);
      expect(rangeValueSchema.safeParse({ min: 'a', max: 'z' }).success).toBe(true);
    });

    test('should reject invalid ranges', () => {
      expect(rangeValueSchema.safeParse({ min: 0 }).success).toBe(false);
      expect(rangeValueSchema.safeParse({ max: 100 }).success).toBe(false);
      expect(rangeValueSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('filterConditionSchema', () => {
    test('should accept valid conditions', () => {
      const result = filterConditionSchema.safeParse({
        field: 'name',
        operator: 'eq',
        value: 'John',
      });
      expect(result.success).toBe(true);
    });

    test('should accept condition with caseSensitive', () => {
      const result = filterConditionSchema.safeParse({
        field: 'name',
        operator: 'contains',
        value: 'test',
        caseSensitive: true,
      });
      expect(result.success).toBe(true);
    });

    test('should reject empty field', () => {
      const result = filterConditionSchema.safeParse({
        field: '',
        operator: 'eq',
        value: 'test',
      });
      expect(result.success).toBe(false);
    });

    test('should reject missing fields', () => {
      expect(filterConditionSchema.safeParse({ field: 'name' }).success).toBe(false);
      expect(filterConditionSchema.safeParse({ operator: 'eq' }).success).toBe(false);
    });
  });

  describe('compoundFilterSchema', () => {
    test('should accept simple compound filter', () => {
      const result = compoundFilterSchema.safeParse({
        operator: 'and',
        conditions: [{ field: 'status', operator: 'eq', value: 'active' }],
      });
      expect(result.success).toBe(true);
    });

    test('should accept nested compound filters', () => {
      const result = compoundFilterSchema.safeParse({
        operator: 'or',
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          {
            operator: 'and',
            conditions: [
              { field: 'age', operator: 'gte', value: 18 },
              { field: 'country', operator: 'eq', value: 'US' },
            ],
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    test('should reject empty conditions array', () => {
      const result = compoundFilterSchema.safeParse({
        operator: 'and',
        conditions: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('sortConfigSchema', () => {
    test('should accept valid sort config', () => {
      expect(sortConfigSchema.safeParse({ field: 'name', order: 'asc' }).success).toBe(true);
      expect(sortConfigSchema.safeParse({ field: 'date', order: 'desc' }).success).toBe(true);
    });

    test('should accept nulls option', () => {
      const result = sortConfigSchema.safeParse({
        field: 'name',
        order: 'asc',
        nulls: 'last',
      });
      expect(result.success).toBe(true);
    });

    test('should reject invalid order', () => {
      const result = sortConfigSchema.safeParse({
        field: 'name',
        order: 'ascending',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('fullTextSearchConfigSchema', () => {
    test('should accept valid config', () => {
      expect(fullTextSearchConfigSchema.safeParse({ query: 'test' }).success).toBe(true);
    });

    test('should accept all options', () => {
      const result = fullTextSearchConfigSchema.safeParse({
        query: 'search terms',
        fields: ['title', 'description'],
        fuzziness: 0.8,
        highlight: true,
        highlightPrefix: '<em>',
        highlightSuffix: '</em>',
      });
      expect(result.success).toBe(true);
    });

    test('should reject empty query', () => {
      expect(fullTextSearchConfigSchema.safeParse({ query: '' }).success).toBe(false);
    });

    test('should reject query over 1000 chars', () => {
      const longQuery = 'a'.repeat(1001);
      expect(fullTextSearchConfigSchema.safeParse({ query: longQuery }).success).toBe(false);
    });

    test('should reject fuzziness out of range', () => {
      expect(fullTextSearchConfigSchema.safeParse({ query: 'test', fuzziness: -0.1 }).success).toBe(
        false,
      );
      expect(fullTextSearchConfigSchema.safeParse({ query: 'test', fuzziness: 1.1 }).success).toBe(
        false,
      );
    });
  });

  describe('searchQuerySchema', () => {
    test('should accept empty query with defaults', () => {
      const result = searchQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(SEARCH_DEFAULTS.PAGE);
        expect(result.data.limit).toBe(SEARCH_DEFAULTS.LIMIT);
      }
    });

    test('should accept full query', () => {
      const result = searchQuerySchema.safeParse({
        filters: { field: 'status', operator: 'eq', value: 'active' },
        sort: [{ field: 'createdAt', order: 'desc' }],
        search: { query: 'test' },
        page: 2,
        limit: 25,
        select: ['id', 'name'],
        includeCount: true,
      });
      expect(result.success).toBe(true);
    });

    test('should reject page < 1', () => {
      const result = searchQuerySchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    test('should reject limit > MAX_LIMIT', () => {
      const result = searchQuerySchema.safeParse({ limit: 1001 });
      expect(result.success).toBe(false);
    });
  });

  describe('facetConfigSchema', () => {
    test('should accept simple facet', () => {
      expect(facetConfigSchema.safeParse({ field: 'category' }).success).toBe(true);
    });

    test('should accept facet with options', () => {
      const result = facetConfigSchema.safeParse({
        field: 'status',
        size: 20,
        sortBy: 'count',
        sortOrder: 'desc',
        includeMissing: true,
      });
      expect(result.success).toBe(true);
    });

    test('should reject size > 100', () => {
      const result = facetConfigSchema.safeParse({
        field: 'category',
        size: 150,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('urlSearchParamsSchema', () => {
    test('should accept string params', () => {
      const result = urlSearchParamsSchema.safeParse({
        q: 'search term',
        page: '2',
        limit: '25',
        sort: 'name:asc,date:desc',
        filters: '{"status":"active"}',
      });
      expect(result.success).toBe(true);
    });

    test('should coerce page and limit to numbers', () => {
      const result = urlSearchParamsSchema.safeParse({
        page: '3',
        limit: '50',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(50);
      }
    });

    test('should accept optional params', () => {
      const result = urlSearchParamsSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('SEARCH_DEFAULTS', () => {
    test('should have correct defaults', () => {
      expect(SEARCH_DEFAULTS.PAGE).toBe(1);
      expect(SEARCH_DEFAULTS.LIMIT).toBe(50);
      expect(SEARCH_DEFAULTS.MaxLimit).toBe(1000);
    });
  });
});
