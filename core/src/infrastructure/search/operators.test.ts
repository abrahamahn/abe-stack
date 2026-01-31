// core/src/infrastructure/search/operators.test.ts
import { describe, expect, test } from 'vitest';

import {
  evaluateCompoundFilter,
  evaluateCondition,
  evaluateFilter,
  filterArray,
  getFieldValue,
  paginateArray,
  sortArray,
} from './operators';
import { type CompoundFilter, type FilterCondition } from './types';

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
});
