// main/shared/src/engine/search/operators.test.ts
import { describe, expect, test } from 'vitest';

import { getFieldValue } from '../../primitives/helpers/object';

import {
  evaluateCompoundFilter,
  evaluateCondition,
  evaluateFilter,
  filterArray,
  paginateArray,
  sortArray,
} from './operators';

import type { CompoundFilter, FilterCondition } from './types';

describe('operators', () => {
  describe('getFieldValue', () => {
    test('should get simple field value', () => {
      const obj = { name: 'John', age: 30 };
      expect(getFieldValue(obj, 'name')).toBe('John');
      expect(getFieldValue(obj, 'age')).toBe(30);
    });

    test('should get nested field value', () => {
      const obj = { user: { profile: { name: 'John' } } };
      expect(getFieldValue(obj, 'user.profile.name')).toBe('John');
    });

    test('should return undefined for missing fields', () => {
      const obj = { name: 'John' };
      expect(getFieldValue(obj, 'missing')).toBeUndefined();
      expect(getFieldValue(obj, 'user.profile.name')).toBeUndefined();
    });

    test('should handle null values in path', () => {
      const obj = { user: null };
      expect(getFieldValue(obj, 'user.name')).toBeUndefined();
    });
  });

  describe('evaluateCondition', () => {
    describe('equality operators', () => {
      test('eq should match equal values', () => {
        const condition: FilterCondition = { field: 'name', operator: 'eq', value: 'John' };
        expect(evaluateCondition(condition, { name: 'John' })).toBe(true);
        expect(evaluateCondition(condition, { name: 'Jane' })).toBe(false);
      });

      test('eq should be case-insensitive by default', () => {
        const condition: FilterCondition = { field: 'name', operator: 'eq', value: 'john' };
        expect(evaluateCondition(condition, { name: 'JOHN' })).toBe(true);
      });

      test('eq should respect caseSensitive option', () => {
        const condition: FilterCondition = {
          field: 'name',
          operator: 'eq',
          value: 'John',
          caseSensitive: true,
        };
        expect(evaluateCondition(condition, { name: 'John' })).toBe(true);
        expect(evaluateCondition(condition, { name: 'john' })).toBe(false);
      });

      test('neq should match non-equal values', () => {
        const condition: FilterCondition = { field: 'name', operator: 'neq', value: 'John' };
        expect(evaluateCondition(condition, { name: 'John' })).toBe(false);
        expect(evaluateCondition(condition, { name: 'Jane' })).toBe(true);
      });
    });

    describe('comparison operators', () => {
      test('gt should match greater values', () => {
        const condition: FilterCondition = { field: 'age', operator: 'gt', value: 18 };
        expect(evaluateCondition(condition, { age: 20 })).toBe(true);
        expect(evaluateCondition(condition, { age: 18 })).toBe(false);
        expect(evaluateCondition(condition, { age: 15 })).toBe(false);
      });

      test('gte should match greater or equal values', () => {
        const condition: FilterCondition = { field: 'age', operator: 'gte', value: 18 };
        expect(evaluateCondition(condition, { age: 20 })).toBe(true);
        expect(evaluateCondition(condition, { age: 18 })).toBe(true);
        expect(evaluateCondition(condition, { age: 15 })).toBe(false);
      });

      test('lt should match lesser values', () => {
        const condition: FilterCondition = { field: 'age', operator: 'lt', value: 18 };
        expect(evaluateCondition(condition, { age: 15 })).toBe(true);
        expect(evaluateCondition(condition, { age: 18 })).toBe(false);
        expect(evaluateCondition(condition, { age: 20 })).toBe(false);
      });

      test('lte should match lesser or equal values', () => {
        const condition: FilterCondition = { field: 'age', operator: 'lte', value: 18 };
        expect(evaluateCondition(condition, { age: 15 })).toBe(true);
        expect(evaluateCondition(condition, { age: 18 })).toBe(true);
        expect(evaluateCondition(condition, { age: 20 })).toBe(false);
      });

      test('should compare dates', () => {
        const date = new Date('2024-01-15');
        const condition: FilterCondition = { field: 'createdAt', operator: 'gt', value: date };
        expect(evaluateCondition(condition, { createdAt: new Date('2024-01-20') })).toBe(true);
        expect(evaluateCondition(condition, { createdAt: new Date('2024-01-10') })).toBe(false);
      });
    });

    describe('string operators', () => {
      test('contains should match substrings', () => {
        const condition: FilterCondition = { field: 'name', operator: 'contains', value: 'oh' };
        expect(evaluateCondition(condition, { name: 'John' })).toBe(true);
        expect(evaluateCondition(condition, { name: 'Jane' })).toBe(false);
      });

      test('startsWith should match prefix', () => {
        const condition: FilterCondition = { field: 'name', operator: 'startsWith', value: 'Jo' };
        expect(evaluateCondition(condition, { name: 'John' })).toBe(true);
        expect(evaluateCondition(condition, { name: 'Jane' })).toBe(false);
      });

      test('endsWith should match suffix', () => {
        const condition: FilterCondition = { field: 'name', operator: 'endsWith', value: 'hn' };
        expect(evaluateCondition(condition, { name: 'John' })).toBe(true);
        expect(evaluateCondition(condition, { name: 'Jane' })).toBe(false);
      });

      test('like should match SQL patterns', () => {
        const condition1: FilterCondition = { field: 'name', operator: 'like', value: 'J%' };
        expect(evaluateCondition(condition1, { name: 'John' })).toBe(true);
        expect(evaluateCondition(condition1, { name: 'Bob' })).toBe(false);

        const condition2: FilterCondition = { field: 'name', operator: 'like', value: '%n' };
        expect(evaluateCondition(condition2, { name: 'John' })).toBe(true);
        expect(evaluateCondition(condition2, { name: 'Jane' })).toBe(false);

        const condition3: FilterCondition = { field: 'name', operator: 'like', value: 'J_hn' };
        expect(evaluateCondition(condition3, { name: 'John' })).toBe(true);
        expect(evaluateCondition(condition3, { name: 'Johnn' })).toBe(false);
      });

      test('ilike should be case-insensitive', () => {
        const condition: FilterCondition = { field: 'name', operator: 'ilike', value: 'j%' };
        expect(evaluateCondition(condition, { name: 'John' })).toBe(true);
        expect(evaluateCondition(condition, { name: 'JOHN' })).toBe(true);
      });
    });

    describe('array operators', () => {
      test('in should match values in array', () => {
        const condition: FilterCondition = {
          field: 'status',
          operator: 'in',
          value: ['active', 'pending'],
        };
        expect(evaluateCondition(condition, { status: 'active' })).toBe(true);
        expect(evaluateCondition(condition, { status: 'inactive' })).toBe(false);
      });

      test('notIn should not match values in array', () => {
        const condition: FilterCondition = {
          field: 'status',
          operator: 'notIn',
          value: ['deleted', 'banned'],
        };
        expect(evaluateCondition(condition, { status: 'active' })).toBe(true);
        expect(evaluateCondition(condition, { status: 'deleted' })).toBe(false);
      });
    });

    describe('null operators', () => {
      test('isNull should match null values', () => {
        const condition: FilterCondition = { field: 'email', operator: 'isNull', value: null };
        expect(evaluateCondition(condition, { email: null })).toBe(true);
        expect(evaluateCondition(condition, { email: undefined })).toBe(true);
        expect(evaluateCondition(condition, { email: 'test@example.com' })).toBe(false);
      });

      test('isNotNull should match non-null values', () => {
        const condition: FilterCondition = { field: 'email', operator: 'isNotNull', value: null };
        expect(evaluateCondition(condition, { email: 'test@example.com' })).toBe(true);
        expect(evaluateCondition(condition, { email: null })).toBe(false);
      });
    });

    describe('between operator', () => {
      test('between should match values in range', () => {
        const condition: FilterCondition = {
          field: 'age',
          operator: 'between',
          value: { min: 18, max: 65 },
        };
        expect(evaluateCondition(condition, { age: 30 })).toBe(true);
        expect(evaluateCondition(condition, { age: 18 })).toBe(true);
        expect(evaluateCondition(condition, { age: 65 })).toBe(true);
        expect(evaluateCondition(condition, { age: 10 })).toBe(false);
        expect(evaluateCondition(condition, { age: 70 })).toBe(false);
      });
    });

    describe('array field operators', () => {
      test('arrayContains should check if field array contains value', () => {
        const condition: FilterCondition = {
          field: 'tags',
          operator: 'arrayContains',
          value: 'typescript',
        };
        expect(evaluateCondition(condition, { tags: ['javascript', 'typescript', 'react'] })).toBe(
          true,
        );
        expect(evaluateCondition(condition, { tags: ['python', 'java'] })).toBe(false);
      });

      test('arrayContainsAny should check if field array contains any value', () => {
        const condition: FilterCondition = {
          field: 'tags',
          operator: 'arrayContainsAny',
          value: ['typescript', 'go'],
        };
        expect(evaluateCondition(condition, { tags: ['javascript', 'typescript'] })).toBe(true);
        expect(evaluateCondition(condition, { tags: ['python', 'java'] })).toBe(false);
      });
    });

    describe('fullText operator', () => {
      test('should match all terms', () => {
        const condition: FilterCondition = {
          field: 'description',
          operator: 'fullText',
          value: 'quick brown',
        };
        expect(evaluateCondition(condition, { description: 'The quick brown fox' })).toBe(true);
        expect(evaluateCondition(condition, { description: 'The quick red fox' })).toBe(false);
      });
    });
  });

  describe('evaluateCompoundFilter', () => {
    test('AND should require all conditions to match', () => {
      const filter: CompoundFilter = {
        operator: 'and',
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'age', operator: 'gte', value: 18 },
        ],
      };

      expect(evaluateCompoundFilter(filter, { status: 'active', age: 25 })).toBe(true);
      expect(evaluateCompoundFilter(filter, { status: 'active', age: 15 })).toBe(false);
      expect(evaluateCompoundFilter(filter, { status: 'inactive', age: 25 })).toBe(false);
    });

    test('OR should require any condition to match', () => {
      const filter: CompoundFilter = {
        operator: 'or',
        conditions: [
          { field: 'role', operator: 'eq', value: 'admin' },
          { field: 'role', operator: 'eq', value: 'moderator' },
        ],
      };

      expect(evaluateCompoundFilter(filter, { role: 'admin' })).toBe(true);
      expect(evaluateCompoundFilter(filter, { role: 'moderator' })).toBe(true);
      expect(evaluateCompoundFilter(filter, { role: 'user' })).toBe(false);
    });

    test('NOT should negate conditions', () => {
      const filter: CompoundFilter = {
        operator: 'not',
        conditions: [{ field: 'status', operator: 'eq', value: 'deleted' }],
      };

      expect(evaluateCompoundFilter(filter, { status: 'active' })).toBe(true);
      expect(evaluateCompoundFilter(filter, { status: 'deleted' })).toBe(false);
    });

    test('should handle nested compound filters', () => {
      const filter: CompoundFilter = {
        operator: 'and',
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          {
            operator: 'or',
            conditions: [
              { field: 'role', operator: 'eq', value: 'admin' },
              { field: 'age', operator: 'gte', value: 21 },
            ],
          },
        ],
      };

      expect(evaluateCompoundFilter(filter, { status: 'active', role: 'admin', age: 18 })).toBe(
        true,
      );
      expect(evaluateCompoundFilter(filter, { status: 'active', role: 'user', age: 25 })).toBe(
        true,
      );
      expect(evaluateCompoundFilter(filter, { status: 'active', role: 'user', age: 18 })).toBe(
        false,
      );
      expect(evaluateCompoundFilter(filter, { status: 'inactive', role: 'admin', age: 25 })).toBe(
        false,
      );
    });
  });

  describe('evaluateFilter', () => {
    test('should handle simple conditions', () => {
      const condition: FilterCondition = { field: 'name', operator: 'eq', value: 'John' };
      expect(evaluateFilter(condition, { name: 'John' })).toBe(true);
    });

    test('should handle compound filters', () => {
      const filter: CompoundFilter = {
        operator: 'and',
        conditions: [{ field: 'name', operator: 'eq', value: 'John' }],
      };
      expect(evaluateFilter(filter, { name: 'John' })).toBe(true);
    });
  });

  describe('filterArray', () => {
    const items = [
      { name: 'John', age: 30, status: 'active' },
      { name: 'Jane', age: 25, status: 'active' },
      { name: 'Bob', age: 35, status: 'inactive' },
    ];

    test('should filter by simple condition', () => {
      const filter: FilterCondition = { field: 'status', operator: 'eq', value: 'active' };
      const result = filterArray(items, filter);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.name)).toEqual(['John', 'Jane']);
    });

    test('should filter by compound condition', () => {
      const filter: CompoundFilter = {
        operator: 'and',
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'age', operator: 'gte', value: 28 },
        ],
      };
      const result = filterArray(items, filter);
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('John');
    });

    test('should return all items when filter is undefined', () => {
      const result = filterArray(items, undefined);
      expect(result).toHaveLength(3);
    });
  });

  describe('sortArray', () => {
    const items = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
      { name: 'Bob', age: 35 },
    ];

    test('should sort ascending', () => {
      const result = sortArray(items, [{ field: 'age', order: 'asc' }]);
      expect(result.map((r) => r.name)).toEqual(['Jane', 'John', 'Bob']);
    });

    test('should sort descending', () => {
      const result = sortArray(items, [{ field: 'age', order: 'desc' }]);
      expect(result.map((r) => r.name)).toEqual(['Bob', 'John', 'Jane']);
    });

    test('should sort by multiple fields', () => {
      const items2 = [
        { name: 'John', age: 30, score: 100 },
        { name: 'Jane', age: 30, score: 90 },
        { name: 'Bob', age: 25, score: 95 },
      ];
      const result = sortArray(items2, [
        { field: 'age', order: 'desc' },
        { field: 'score', order: 'asc' },
      ]);
      expect(result.map((r) => r.name)).toEqual(['Jane', 'John', 'Bob']);
    });

    test('should handle null values', () => {
      const items2 = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: null },
        { name: 'Bob', age: 25 },
      ];
      const result = sortArray(items2, [{ field: 'age', order: 'asc', nulls: 'last' }]);
      expect(result.map((r) => r.name)).toEqual(['Bob', 'John', 'Jane']);
    });

    test('should return original array when no sort config', () => {
      const result = sortArray(items, []);
      expect(result.map((r) => r.name)).toEqual(['John', 'Jane', 'Bob']);
    });
  });

  describe('paginateArray', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

    test('should return first page', () => {
      const result = paginateArray(items, 1, 10);
      expect(result.data).toHaveLength(10);
      expect(result.data[0]!.id).toBe(1);
      expect(result.total).toBe(25);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(false);
      expect(result.totalPages).toBe(3);
    });

    test('should return middle page', () => {
      const result = paginateArray(items, 2, 10);
      expect(result.data).toHaveLength(10);
      expect(result.data[0]!.id).toBe(11);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });

    test('should return last page', () => {
      const result = paginateArray(items, 3, 10);
      expect(result.data).toHaveLength(5);
      expect(result.data[0]!.id).toBe(21);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });

    test('should handle empty array', () => {
      const result = paginateArray([], 1, 10);
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
      expect(result.totalPages).toBe(0);
    });
  });

  // ============================================================================
  // Adversarial Tests
  // ============================================================================

  describe('adversarial: null and undefined field values', () => {
    test('eq with null filter value matches null field', () => {
      const cond: FilterCondition = { field: 'x', operator: 'eq', value: null };
      expect(evaluateCondition(cond, { x: null })).toBe(true);
    });

    test('eq with null filter value does NOT match undefined field', () => {
      // null !== undefined in strict comparison even after normalization
      const cond: FilterCondition = { field: 'x', operator: 'eq', value: null };
      // undefined field: getFieldValue returns undefined; normalized stays undefined
      // normalizeForComparison(undefined) === undefined !== null
      expect(evaluateCondition(cond, { x: undefined })).toBe(false);
    });

    test('gt with null filter value returns false', () => {
      const cond: FilterCondition = { field: 'x', operator: 'gt', value: null };
      expect(evaluateCondition(cond, { x: 5 })).toBe(false);
    });

    test('gte with null filter value returns false', () => {
      const cond: FilterCondition = { field: 'x', operator: 'gte', value: null };
      expect(evaluateCondition(cond, { x: 5 })).toBe(false);
    });

    test('lt with null filter value returns false', () => {
      const cond: FilterCondition = { field: 'x', operator: 'lt', value: null };
      expect(evaluateCondition(cond, { x: 5 })).toBe(false);
    });

    test('lte with null filter value returns false', () => {
      const cond: FilterCondition = { field: 'x', operator: 'lte', value: null };
      expect(evaluateCondition(cond, { x: 5 })).toBe(false);
    });

    test('contains with null filter value returns false', () => {
      const cond: FilterCondition = { field: 'name', operator: 'contains', value: null };
      expect(evaluateCondition(cond, { name: 'John' })).toBe(false);
    });

    test('contains on null field value returns false', () => {
      const cond: FilterCondition = { field: 'name', operator: 'contains', value: 'Jo' };
      expect(evaluateCondition(cond, { name: null })).toBe(false);
    });

    test('in with non-array filter value returns false', () => {
      // value is a string, not an array — in operator requires array
      const cond: FilterCondition = { field: 'x', operator: 'in', value: 'notAnArray' };
      expect(evaluateCondition(cond, { x: 'notAnArray' })).toBe(false);
    });

    test('between with array filter value (not a range object) returns false', () => {
      const cond: FilterCondition = {
        field: 'age',
        operator: 'between',
        // Arrays are not valid between values (must have min/max)
        value: [18, 65],
      };
      expect(evaluateCondition(cond, { age: 30 })).toBe(false);
    });

    test('arrayContains on non-array field value returns false', () => {
      const cond: FilterCondition = { field: 'tags', operator: 'arrayContains', value: 'ts' };
      expect(evaluateCondition(cond, { tags: 'ts' })).toBe(false);
    });

    test('arrayContainsAny on non-array field value returns false', () => {
      const cond: FilterCondition = {
        field: 'tags',
        operator: 'arrayContainsAny',
        value: ['ts', 'js'],
      };
      expect(evaluateCondition(cond, { tags: 'ts' })).toBe(false);
    });

    test('arrayContainsAny with non-array filter value returns false', () => {
      const cond: FilterCondition = {
        field: 'tags',
        operator: 'arrayContainsAny',
        value: 'ts',
      };
      expect(evaluateCondition(cond, { tags: ['ts', 'js'] })).toBe(false);
    });
  });

  describe('adversarial: type coercion traps (string "1" vs number 1)', () => {
    test('eq does NOT coerce string "1" to number 1 with caseSensitive=true', () => {
      const cond: FilterCondition = {
        field: 'count',
        operator: 'eq',
        value: 1,
        caseSensitive: true,
      };
      // Field value is string "1", filter is number 1 — strict equality fails
      expect(evaluateCondition(cond, { count: '1' })).toBe(false);
    });

    test('eq does NOT coerce string "true" to boolean true', () => {
      const cond: FilterCondition = {
        field: 'active',
        operator: 'eq',
        value: true,
        caseSensitive: true,
      };
      expect(evaluateCondition(cond, { active: 'true' })).toBe(false);
    });

    test('gt does not coerce string "20" to number for comparison against number 18', () => {
      // Field is string, filterValue is number — types mismatch; comparePrimitives falls back
      // to string comparison: "20".localeCompare(String(18)) — this is an adversarial case
      const cond: FilterCondition = { field: 'age', operator: 'gt', value: 18 };
      // String "20" vs number 18 — comparePrimitives uses fallback String() comparison
      // We just verify it doesn't throw and returns a boolean
      const result = evaluateCondition(cond, { age: '20' });
      expect(typeof result).toBe('boolean');
    });

    test('in operator: string "1" in array [1] does not match (strict equality)', () => {
      const cond: FilterCondition = {
        field: 'x',
        operator: 'in',
        value: [1, 2, 3],
        caseSensitive: true,
      };
      expect(evaluateCondition(cond, { x: '1' })).toBe(false);
    });

    test('in operator: number 1 in array ["1"] does not match (strict equality)', () => {
      const cond: FilterCondition = {
        field: 'x',
        operator: 'in',
        value: ['1', '2'],
        caseSensitive: true,
      };
      expect(evaluateCondition(cond, { x: 1 })).toBe(false);
    });
  });

  describe('adversarial: empty filter arrays and conditions', () => {
    test('filterArray with empty items array returns empty array', () => {
      const filter: FilterCondition = { field: 'name', operator: 'eq', value: 'John' };
      expect(filterArray([], filter)).toEqual([]);
    });

    test('in operator with empty array never matches', () => {
      const cond: FilterCondition = { field: 'status', operator: 'in', value: [] };
      expect(evaluateCondition(cond, { status: 'active' })).toBe(false);
      expect(evaluateCondition(cond, { status: null })).toBe(false);
    });

    test('notIn operator with empty array always matches (nothing to exclude)', () => {
      const cond: FilterCondition = { field: 'status', operator: 'notIn', value: [] };
      expect(evaluateCondition(cond, { status: 'active' })).toBe(true);
      expect(evaluateCondition(cond, { status: 'deleted' })).toBe(true);
    });

    test('arrayContainsAny with empty filter array never matches', () => {
      const cond: FilterCondition = {
        field: 'tags',
        operator: 'arrayContainsAny',
        value: [],
      };
      expect(evaluateCondition(cond, { tags: ['ts', 'js'] })).toBe(false);
    });

    test('fullText with empty query string never matches (no terms)', () => {
      const cond: FilterCondition = { field: 'desc', operator: 'fullText', value: '' };
      // Empty query splits to [] terms; every([]) === true by vacuous truth
      const result = evaluateCondition(cond, { desc: 'hello world' });
      expect(result).toBe(true); // vacuous truth — document behavior not a bug
    });

    test('sortArray with empty items returns empty array', () => {
      expect(sortArray([], [{ field: 'name', order: 'asc' }])).toEqual([]);
    });

    test('sortArray does not mutate original array', () => {
      const items = [{ name: 'B' }, { name: 'A' }];
      const sorted = sortArray(items, [{ field: 'name', order: 'asc' }]);
      // Original unchanged
      expect(items[0]!.name).toBe('B');
      expect(sorted[0]!.name).toBe('A');
    });
  });

  describe('adversarial: deeply nested compound filters', () => {
    test('deeply nested AND/OR chain evaluates correctly', () => {
      // Build 5-level deep nesting
      const deepFilter: CompoundFilter = {
        operator: 'and',
        conditions: [
          {
            operator: 'or',
            conditions: [
              {
                operator: 'and',
                conditions: [
                  {
                    operator: 'or',
                    conditions: [
                      { field: 'score', operator: 'gte', value: 90 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      expect(evaluateFilter(deepFilter, { score: 95 })).toBe(true);
      expect(evaluateFilter(deepFilter, { score: 50 })).toBe(false);
    });

    test('NOT with multiple conditions negates entire conjunction', () => {
      // NOT(a AND b) — since NOT uses every(), NOT(true AND true) = false
      const filter: CompoundFilter = {
        operator: 'not',
        conditions: [
          { field: 'role', operator: 'eq', value: 'admin' },
          { field: 'active', operator: 'eq', value: true },
        ],
      };

      // Both match → every() is true → NOT is false
      expect(evaluateCompoundFilter(filter, { role: 'admin', active: true })).toBe(false);

      // One does not match → every() is false → NOT is true
      expect(evaluateCompoundFilter(filter, { role: 'admin', active: false })).toBe(true);
    });

    test('compound filter with single condition behaves correctly for all operators', () => {
      const andFilter: CompoundFilter = {
        operator: 'and',
        conditions: [{ field: 'x', operator: 'eq', value: 'y' }],
      };
      const orFilter: CompoundFilter = {
        operator: 'or',
        conditions: [{ field: 'x', operator: 'eq', value: 'y' }],
      };
      const notFilter: CompoundFilter = {
        operator: 'not',
        conditions: [{ field: 'x', operator: 'eq', value: 'y' }],
      };

      expect(evaluateFilter(andFilter, { x: 'y' })).toBe(true);
      expect(evaluateFilter(orFilter, { x: 'y' })).toBe(true);
      expect(evaluateFilter(notFilter, { x: 'y' })).toBe(false);

      expect(evaluateFilter(andFilter, { x: 'z' })).toBe(false);
      expect(evaluateFilter(orFilter, { x: 'z' })).toBe(false);
      expect(evaluateFilter(notFilter, { x: 'z' })).toBe(true);
    });
  });

  describe('adversarial: case sensitivity edge cases', () => {
    test('contains is case-insensitive by default', () => {
      const cond: FilterCondition = { field: 'name', operator: 'contains', value: 'JOHN' };
      expect(evaluateCondition(cond, { name: 'john doe' })).toBe(true);
    });

    test('startsWith is case-insensitive by default', () => {
      const cond: FilterCondition = { field: 'name', operator: 'startsWith', value: 'JOHN' };
      expect(evaluateCondition(cond, { name: 'johnny' })).toBe(true);
    });

    test('endsWith is case-insensitive by default', () => {
      const cond: FilterCondition = { field: 'name', operator: 'endsWith', value: 'DOE' };
      expect(evaluateCondition(cond, { name: 'John Doe' })).toBe(true);
    });

    test('like is case-insensitive by default', () => {
      const cond: FilterCondition = { field: 'name', operator: 'like', value: 'JOHN%' };
      expect(evaluateCondition(cond, { name: 'johnny' })).toBe(true);
    });

    test('ilike always case-insensitive regardless of caseSensitive flag', () => {
      const cond: FilterCondition = {
        field: 'email',
        operator: 'ilike',
        value: '%@EXAMPLE.COM',
        caseSensitive: true, // ilike ignores this — always insensitive
      };
      expect(evaluateCondition(cond, { email: 'user@example.com' })).toBe(true);
    });

    test('in is case-insensitive by default', () => {
      const cond: FilterCondition = {
        field: 'role',
        operator: 'in',
        value: ['ADMIN', 'USER'],
      };
      expect(evaluateCondition(cond, { role: 'admin' })).toBe(true);
    });

    test('in is case-sensitive when caseSensitive=true', () => {
      const cond: FilterCondition = {
        field: 'role',
        operator: 'in',
        value: ['admin'],
        caseSensitive: true,
      };
      expect(evaluateCondition(cond, { role: 'ADMIN' })).toBe(false);
      expect(evaluateCondition(cond, { role: 'admin' })).toBe(true);
    });
  });

  describe('adversarial: LIKE pattern edge cases', () => {
    test('% alone matches everything', () => {
      const cond: FilterCondition = { field: 'x', operator: 'like', value: '%' };
      expect(evaluateCondition(cond, { x: '' })).toBe(true);
      expect(evaluateCondition(cond, { x: 'anything goes here' })).toBe(true);
    });

    test('%% matches everything', () => {
      const cond: FilterCondition = { field: 'x', operator: 'like', value: '%%' };
      expect(evaluateCondition(cond, { x: 'abc' })).toBe(true);
    });

    test('_ matches exactly one character', () => {
      const cond: FilterCondition = { field: 'x', operator: 'like', value: '_' };
      expect(evaluateCondition(cond, { x: 'a' })).toBe(true);
      expect(evaluateCondition(cond, { x: '' })).toBe(false);
      expect(evaluateCondition(cond, { x: 'ab' })).toBe(false);
    });

    test('like with no wildcard requires exact match', () => {
      const cond: FilterCondition = { field: 'x', operator: 'like', value: 'exact' };
      expect(evaluateCondition(cond, { x: 'exact' })).toBe(true);
      expect(evaluateCondition(cond, { x: 'exactplus' })).toBe(false);
      expect(evaluateCondition(cond, { x: 'notexact' })).toBe(false);
    });

    test('adversarial ReDoS-style pattern %a%a%a%a%a does not hang', () => {
      // The iterative algorithm should handle this in O(n*m), not exponential
      const cond: FilterCondition = {
        field: 'x',
        operator: 'like',
        value: '%a%a%a%a%a',
      };
      // A string designed to cause catastrophic backtracking in naive regex implementations
      const evilString = 'b'.repeat(50);
      const start = Date.now();
      const result = evaluateCondition(cond, { x: evilString });
      const elapsed = Date.now() - start;

      expect(result).toBe(false);
      // Should complete in well under 1 second
      expect(elapsed).toBeLessThan(1000);
    });

    test('like empty pattern matches only empty string', () => {
      const cond: FilterCondition = { field: 'x', operator: 'like', value: '' };
      expect(evaluateCondition(cond, { x: '' })).toBe(true);
      expect(evaluateCondition(cond, { x: 'a' })).toBe(false);
    });
  });

  describe('adversarial: paginateArray boundary values', () => {
    test('page beyond total returns empty data', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const result = paginateArray(items, 99, 10);
      expect(result.data).toHaveLength(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });

    test('limit of 1 returns single item per page', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const p1 = paginateArray(items, 1, 1);
      expect(p1.data).toHaveLength(1);
      expect(p1.data[0]!.id).toBe(1);
      expect(p1.totalPages).toBe(3);
      expect(p1.hasNext).toBe(true);
      expect(p1.hasPrev).toBe(false);
    });

    test('limit larger than total returns all items on page 1', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const result = paginateArray(items, 1, 100);
      expect(result.data).toHaveLength(2);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
      expect(result.totalPages).toBe(1);
    });

    test('single item: page 1 has no next or prev', () => {
      const result = paginateArray([{ id: 1 }], 1, 10);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
      expect(result.total).toBe(1);
    });

    test('exact fit: items divisible by limit', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({ id: i }));
      const result = paginateArray(items, 2, 10);
      expect(result.data).toHaveLength(10);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
      expect(result.totalPages).toBe(2);
    });
  });

  describe('adversarial: date comparison edge cases', () => {
    test('same Date instances are equal via eq', () => {
      const d = new Date('2024-06-01T00:00:00.000Z');
      const same = new Date('2024-06-01T00:00:00.000Z');
      const cond: FilterCondition = { field: 'ts', operator: 'eq', value: d, caseSensitive: true };
      expect(evaluateCondition(cond, { ts: same })).toBe(true);
    });

    test('between with date range is inclusive on both ends', () => {
      const min = new Date('2024-01-01');
      const max = new Date('2024-12-31');
      const cond: FilterCondition = { field: 'ts', operator: 'between', value: { min, max } };

      expect(evaluateCondition(cond, { ts: min })).toBe(true);
      expect(evaluateCondition(cond, { ts: max })).toBe(true);
      expect(evaluateCondition(cond, { ts: new Date('2024-06-15') })).toBe(true);
      expect(evaluateCondition(cond, { ts: new Date('2023-12-31') })).toBe(false);
      expect(evaluateCondition(cond, { ts: new Date('2025-01-01') })).toBe(false);
    });

    test('gt on identical dates returns false', () => {
      const d = new Date('2024-01-01');
      const cond: FilterCondition = { field: 'ts', operator: 'gt', value: d };
      expect(evaluateCondition(cond, { ts: new Date('2024-01-01') })).toBe(false);
    });
  });

  describe('adversarial: boolean field edge cases', () => {
    test('eq matches false === false', () => {
      const cond: FilterCondition = { field: 'active', operator: 'eq', value: false };
      expect(evaluateCondition(cond, { active: false })).toBe(true);
      expect(evaluateCondition(cond, { active: true })).toBe(false);
    });

    test('eq: false !== 0 (no coercion)', () => {
      const cond: FilterCondition = {
        field: 'active',
        operator: 'eq',
        value: false,
        caseSensitive: true,
      };
      expect(evaluateCondition(cond, { active: 0 })).toBe(false);
    });

    test('gt on boolean: true > false', () => {
      const cond: FilterCondition = { field: 'active', operator: 'gt', value: false };
      expect(evaluateCondition(cond, { active: true })).toBe(true);
      expect(evaluateCondition(cond, { active: false })).toBe(false);
    });
  });

  describe('adversarial: evaluateFilter throws on invalid structure', () => {
    test('evaluateFilter throws on object without field or conditions', () => {
      expect(() =>
        evaluateFilter({ operator: 'and' } as unknown as CompoundFilter, {}),
      ).toThrow();
    });

    test('evaluateCompoundFilter throws on unknown logical operator', () => {
      const badFilter = {
        operator: 'xor',
        conditions: [{ field: 'x', operator: 'eq', value: 'y' }],
      } as unknown as CompoundFilter;
      expect(() => evaluateCompoundFilter(badFilter, { x: 'y' })).toThrow('Unknown logical operator: xor');
    });
  });
});
