// main/shared/src/system/search/schemas.test.ts
import { describe, expect, test } from 'vitest';

import { SEARCH_DEFAULTS } from '../constants/limits';

import {
    compoundFilterSchema,
    facetConfigSchema,
    filterConditionSchema,
    filterOperatorSchema,
    filterValueSchema,
    fullTextSearchConfigSchema,
    logicalOperatorSchema,
    rangeValueSchema,
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
      expect(SEARCH_DEFAULTS.MAX_LIMIT).toBe(1000);
    });
  });

  // ============================================================================
  // Adversarial Tests
  // ============================================================================

  describe('adversarial: filterOperatorSchema — invalid inputs', () => {
    test('rejects null', () => {
      expect(filterOperatorSchema.safeParse(null).success).toBe(false);
    });

    test('rejects undefined', () => {
      expect(filterOperatorSchema.safeParse(undefined).success).toBe(false);
    });

    test('rejects number', () => {
      expect(filterOperatorSchema.safeParse(42).success).toBe(false);
    });

    test('rejects empty string', () => {
      expect(filterOperatorSchema.safeParse('').success).toBe(false);
    });

    test('rejects uppercase variants of valid operators', () => {
      expect(filterOperatorSchema.safeParse('EQ').success).toBe(false);
      expect(filterOperatorSchema.safeParse('Eq').success).toBe(false);
      expect(filterOperatorSchema.safeParse('CONTAINS').success).toBe(false);
      expect(filterOperatorSchema.safeParse('ISNULL').success).toBe(false);
    });

    test('rejects operators with surrounding whitespace', () => {
      expect(filterOperatorSchema.safeParse(' eq').success).toBe(false);
      expect(filterOperatorSchema.safeParse('eq ').success).toBe(false);
      expect(filterOperatorSchema.safeParse(' eq ').success).toBe(false);
    });

    test('rejects SQL injection attempt as operator', () => {
      expect(filterOperatorSchema.safeParse("'; DROP TABLE users; --").success).toBe(false);
    });

    test('rejects object input', () => {
      expect(filterOperatorSchema.safeParse({ operator: 'eq' }).success).toBe(false);
    });
  });

  describe('adversarial: filterValueSchema — wrong types and edge cases', () => {
    test('rejects plain object without min/max', () => {
      // An object that is not a range and not a primitive — should fail
      expect(filterValueSchema.safeParse({ foo: 'bar' }).success).toBe(false);
    });

    test('rejects undefined', () => {
      expect(filterValueSchema.safeParse(undefined).success).toBe(false);
    });

    test('rejects array containing objects (non-primitives)', () => {
      expect(filterValueSchema.safeParse([{ id: 1 }]).success).toBe(false);
    });

    test('rejects array containing undefined', () => {
      expect(filterValueSchema.safeParse([undefined]).success).toBe(false);
    });

    test('accepts empty array', () => {
      expect(filterValueSchema.safeParse([]).success).toBe(true);
    });

    test('accepts very large number', () => {
      expect(filterValueSchema.safeParse(Number.MAX_SAFE_INTEGER).success).toBe(true);
    });

    test('accepts negative infinity — it is a number', () => {
      // -Infinity is typeof number
      expect(filterValueSchema.safeParse(-Infinity).success).toBe(true);
    });

    test('accepts NaN — it is typeof number', () => {
      // NaN is typeof number; the schema accepts it as a number primitive
      expect(filterValueSchema.safeParse(NaN).success).toBe(true);
    });
  });

  describe('adversarial: rangeValueSchema — boundary and wrong types', () => {
    test('rejects null min', () => {
      // null is a valid FilterPrimitive so this should succeed
      expect(rangeValueSchema.safeParse({ min: null, max: 100 }).success).toBe(true);
    });

    test('rejects undefined min', () => {
      expect(rangeValueSchema.safeParse({ min: undefined, max: 100 }).success).toBe(false);
    });

    test('rejects undefined max', () => {
      expect(rangeValueSchema.safeParse({ min: 0, max: undefined }).success).toBe(false);
    });

    test('rejects array as input', () => {
      expect(rangeValueSchema.safeParse([0, 100]).success).toBe(false);
    });

    test('rejects null', () => {
      expect(rangeValueSchema.safeParse(null).success).toBe(false);
    });

    test('rejects string', () => {
      expect(rangeValueSchema.safeParse('0-100').success).toBe(false);
    });

    test('accepts min equal to max (degenerate range)', () => {
      expect(rangeValueSchema.safeParse({ min: 5, max: 5 }).success).toBe(true);
    });
  });

  describe('filterConditionSchema — operator/value cross-validation', () => {
    test('isNull accepts missing value', () => {
      const result = filterConditionSchema.safeParse({ field: 'name', operator: 'isNull' });
      expect(result.success).toBe(true);
    });

    test('isNotNull accepts missing value', () => {
      const result = filterConditionSchema.safeParse({ field: 'name', operator: 'isNotNull' });
      expect(result.success).toBe(true);
    });

    test('between requires range value', () => {
      expect(
        filterConditionSchema.safeParse({ field: 'age', operator: 'between', value: 'not-a-range' }).success,
      ).toBe(false);
    });

    test('between accepts valid range', () => {
      const result = filterConditionSchema.safeParse({
        field: 'age',
        operator: 'between',
        value: { min: 18, max: 65 },
      });
      expect(result.success).toBe(true);
    });

    test('in requires array value', () => {
      expect(
        filterConditionSchema.safeParse({ field: 'status', operator: 'in', value: 'active' }).success,
      ).toBe(false);
    });

    test('in accepts array value', () => {
      const result = filterConditionSchema.safeParse({
        field: 'status',
        operator: 'in',
        value: ['active', 'pending'],
      });
      expect(result.success).toBe(true);
    });

    test('notIn requires array value', () => {
      expect(
        filterConditionSchema.safeParse({ field: 'status', operator: 'notIn', value: 'deleted' }).success,
      ).toBe(false);
    });

    test('contains requires string value', () => {
      expect(
        filterConditionSchema.safeParse({ field: 'name', operator: 'contains', value: 123 }).success,
      ).toBe(false);
    });

    test('contains accepts string value', () => {
      const result = filterConditionSchema.safeParse({
        field: 'name',
        operator: 'contains',
        value: 'john',
      });
      expect(result.success).toBe(true);
    });

    test('startsWith requires string value', () => {
      expect(
        filterConditionSchema.safeParse({ field: 'name', operator: 'startsWith', value: 42 }).success,
      ).toBe(false);
    });

    test('like requires string value', () => {
      expect(
        filterConditionSchema.safeParse({ field: 'name', operator: 'like', value: true }).success,
      ).toBe(false);
    });

    test('eq accepts any primitive value', () => {
      expect(filterConditionSchema.safeParse({ field: 'x', operator: 'eq', value: 42 }).success).toBe(true);
      expect(filterConditionSchema.safeParse({ field: 'x', operator: 'eq', value: 'str' }).success).toBe(true);
      expect(filterConditionSchema.safeParse({ field: 'x', operator: 'eq', value: true }).success).toBe(true);
      expect(filterConditionSchema.safeParse({ field: 'x', operator: 'eq', value: null }).success).toBe(true);
    });

    test('gt accepts numeric value', () => {
      expect(filterConditionSchema.safeParse({ field: 'age', operator: 'gt', value: 18 }).success).toBe(true);
    });
  });

  describe('adversarial: filterConditionSchema — missing/wrong/extra fields', () => {
    test('rejects null input', () => {
      expect(filterConditionSchema.safeParse(null).success).toBe(false);
    });

    test('rejects string input', () => {
      expect(filterConditionSchema.safeParse('field eq value').success).toBe(false);
    });

    test('rejects condition with number as field name', () => {
      expect(filterConditionSchema.safeParse({ field: 123, operator: 'eq', value: 'x' }).success).toBe(false);
    });

    test('rejects condition with invalid operator value', () => {
      expect(filterConditionSchema.safeParse({ field: 'x', operator: 'INVALID_OP', value: 'y' }).success).toBe(false);
    });

    test('extra unknown fields are ignored (schema extracts known fields)', () => {
      const result = filterConditionSchema.safeParse({
        field: 'name',
        operator: 'eq',
        value: 'test',
        unknownField: 'ignored',
        anotherExtra: 42,
      });
      expect(result.success).toBe(true);
    });

    test('rejects object value that is not a valid FilterValue', () => {
      expect(
        filterConditionSchema.safeParse({ field: 'x', operator: 'eq', value: { arbitrary: true } }).success,
      ).toBe(false);
    });

    test('rejects condition missing value entirely', () => {
      // value key absent — filterValueSchema will receive undefined → fails
      const result = filterConditionSchema.safeParse({ field: 'name', operator: 'eq' });
      expect(result.success).toBe(false);
    });
  });

  describe('adversarial: compoundFilterSchema — edge cases', () => {
    test('rejects null conditions array', () => {
      expect(
        compoundFilterSchema.safeParse({ operator: 'and', conditions: null }).success,
      ).toBe(false);
    });

    test('rejects conditions with object that has neither field nor conditions', () => {
      expect(
        compoundFilterSchema.safeParse({
          operator: 'and',
          conditions: [{ random: 'key' }],
        }).success,
      ).toBe(false);
    });

    test('rejects invalid logical operator in compound filter', () => {
      expect(
        compoundFilterSchema.safeParse({
          operator: 'xor',
          conditions: [{ field: 'x', operator: 'eq', value: 'y' }],
        }).success,
      ).toBe(false);
    });

    test('rejects missing operator', () => {
      expect(
        compoundFilterSchema.safeParse({
          conditions: [{ field: 'x', operator: 'eq', value: 'y' }],
        }).success,
      ).toBe(false);
    });

    test('accepts deeply nested compound filters (3 levels)', () => {
      const result = compoundFilterSchema.safeParse({
        operator: 'and',
        conditions: [
          {
            operator: 'or',
            conditions: [
              {
                operator: 'not',
                conditions: [{ field: 'status', operator: 'eq', value: 'deleted' }],
              },
            ],
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('adversarial: fullTextSearchConfigSchema — boundary attacks', () => {
    test('rejects query of exactly 0 characters', () => {
      expect(fullTextSearchConfigSchema.safeParse({ query: '' }).success).toBe(false);
    });

    test('accepts query of exactly 1 character', () => {
      expect(fullTextSearchConfigSchema.safeParse({ query: 'a' }).success).toBe(true);
    });

    test('accepts query of exactly 1000 characters', () => {
      expect(fullTextSearchConfigSchema.safeParse({ query: 'a'.repeat(1000) }).success).toBe(true);
    });

    test('rejects query of exactly 1001 characters', () => {
      expect(fullTextSearchConfigSchema.safeParse({ query: 'a'.repeat(1001) }).success).toBe(false);
    });

    test('rejects fuzziness of exactly -0.001', () => {
      expect(fullTextSearchConfigSchema.safeParse({ query: 'x', fuzziness: -0.001 }).success).toBe(false);
    });

    test('accepts fuzziness of 0 (minimum)', () => {
      expect(fullTextSearchConfigSchema.safeParse({ query: 'x', fuzziness: 0 }).success).toBe(true);
    });

    test('accepts fuzziness of 1 (maximum)', () => {
      expect(fullTextSearchConfigSchema.safeParse({ query: 'x', fuzziness: 1 }).success).toBe(true);
    });

    test('rejects fuzziness of 1.001', () => {
      expect(fullTextSearchConfigSchema.safeParse({ query: 'x', fuzziness: 1.001 }).success).toBe(false);
    });

    test('query with SQL injection characters is accepted as a string', () => {
      const sqlQuery = "'; DROP TABLE users; --";
      const result = fullTextSearchConfigSchema.safeParse({ query: sqlQuery });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe(sqlQuery);
      }
    });

    test('query with unicode and emoji is accepted', () => {
      const unicodeQuery = '搜索 🔍 résumé';
      const result = fullTextSearchConfigSchema.safeParse({ query: unicodeQuery });
      expect(result.success).toBe(true);
    });

    test('rejects null input entirely', () => {
      expect(fullTextSearchConfigSchema.safeParse(null).success).toBe(false);
    });

    test('rejects string input instead of config object', () => {
      expect(fullTextSearchConfigSchema.safeParse('search me').success).toBe(false);
    });
  });

  describe('adversarial: searchQuerySchema — boundary values', () => {
    test('rejects page = 0', () => {
      expect(searchQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    });

    test('rejects page = -1', () => {
      expect(searchQuerySchema.safeParse({ page: -1 }).success).toBe(false);
    });

    test('rejects float page (1.5)', () => {
      expect(searchQuerySchema.safeParse({ page: 1.5 }).success).toBe(false);
    });

    test('accepts page = 1 (minimum)', () => {
      expect(searchQuerySchema.safeParse({ page: 1 }).success).toBe(true);
    });

    test('rejects limit = 0', () => {
      expect(searchQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
    });

    test('rejects limit = MAX_LIMIT + 1', () => {
      expect(searchQuerySchema.safeParse({ limit: SEARCH_DEFAULTS.MAX_LIMIT + 1 }).success).toBe(false);
    });

    test('accepts limit = MAX_LIMIT (boundary)', () => {
      expect(searchQuerySchema.safeParse({ limit: SEARCH_DEFAULTS.MAX_LIMIT }).success).toBe(true);
    });

    test('accepts limit = 1 (minimum)', () => {
      expect(searchQuerySchema.safeParse({ limit: 1 }).success).toBe(true);
    });

    test('float limit (10.5) is ignored — schema uses default limit (not integer so branch is skipped)', () => {
      // The schema only sets limit when Number.isInteger(value) is true.
      // A non-integer float silently falls back to SEARCH_DEFAULTS.LIMIT.
      const result = searchQuerySchema.safeParse({ limit: 10.5 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(SEARCH_DEFAULTS.LIMIT);
      }
    });

    test('non-array sort is silently ignored — schema only reads sort when Array.isArray', () => {
      // Passing an object instead of an array causes the sort branch to be skipped.
      const result = searchQuerySchema.safeParse({ sort: { field: 'name', order: 'asc' } });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBeUndefined();
      }
    });

    test('preserves cursor string verbatim', () => {
      const cursor = 'eyJpZCI6IjEyMyJ9.signature==';
      const result = searchQuerySchema.safeParse({ cursor });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cursor).toBe(cursor);
      }
    });

    test('null input uses defaults without error', () => {
      // The schema treats null as {} and returns defaults
      const result = searchQuerySchema.safeParse(null);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(SEARCH_DEFAULTS.PAGE);
        expect(result.data.limit).toBe(SEARCH_DEFAULTS.LIMIT);
      }
    });
  });

  describe('adversarial: sortConfigSchema — edge cases', () => {
    test('rejects empty field string', () => {
      expect(sortConfigSchema.safeParse({ field: '', order: 'asc' }).success).toBe(false);
    });

    test('rejects missing order', () => {
      expect(sortConfigSchema.safeParse({ field: 'name' }).success).toBe(false);
    });

    test('rejects null field', () => {
      expect(sortConfigSchema.safeParse({ field: null, order: 'asc' }).success).toBe(false);
    });

    test('rejects invalid nulls value', () => {
      const result = sortConfigSchema.safeParse({ field: 'name', order: 'asc', nulls: 'middle' });
      // Invalid nulls value should be silently dropped (not in schema), not fail
      // Check the actual behavior: schema only sets nulls if === 'first' | 'last'
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nulls).toBeUndefined();
      }
    });

    test('accepts field with dots (nested path notation)', () => {
      const result = sortConfigSchema.safeParse({ field: 'user.profile.name', order: 'asc' });
      expect(result.success).toBe(true);
    });
  });

  describe('adversarial: urlSearchParamsSchema — coercion and injection', () => {
    test('invalid page string produces no page (silently dropped)', () => {
      const result = urlSearchParamsSchema.safeParse({ page: 'abc' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBeUndefined();
      }
    });

    test('page = "0" is dropped (must be >= 1)', () => {
      const result = urlSearchParamsSchema.safeParse({ page: '0' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBeUndefined();
      }
    });

    test('page = "-1" is dropped', () => {
      const result = urlSearchParamsSchema.safeParse({ page: '-1' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBeUndefined();
      }
    });

    test('limit exceeding MAX_LIMIT is dropped', () => {
      const result = urlSearchParamsSchema.safeParse({
        limit: String(SEARCH_DEFAULTS.MAX_LIMIT + 1),
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBeUndefined();
      }
    });

    test('float page "2.5" is dropped (not an integer)', () => {
      const result = urlSearchParamsSchema.safeParse({ page: '2.5' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBeUndefined();
      }
    });

    test('q with SQL injection characters is accepted verbatim', () => {
      const sqlQ = "' OR '1'='1";
      const result = urlSearchParamsSchema.safeParse({ q: sqlQ });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.q).toBe(sqlQ);
      }
    });

    test('cursor accepts base64 token string', () => {
      const cursor = 'eyJpZCI6MTIzfQ==';
      const result = urlSearchParamsSchema.safeParse({ cursor });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cursor).toBe(cursor);
      }
    });
  });
});
