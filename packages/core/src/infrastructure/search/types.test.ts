// packages/core/src/infrastructure/search/types.test.ts
import { describe, expect, test } from 'vitest';

import {
  FILTER_OPERATORS,
  isCompoundFilter,
  isFilterCondition,
  LOGICAL_OPERATORS,
  SORT_ORDER,
  type CompoundFilter,
  type FilterCondition,
} from './types';

describe('search types', () => {
  describe('FILTER_OPERATORS', () => {
    test('should have all expected operators', () => {
      expect(FILTER_OPERATORS.EQ).toBe('eq');
      expect(FILTER_OPERATORS.NEQ).toBe('neq');
      expect(FILTER_OPERATORS.GT).toBe('gt');
      expect(FILTER_OPERATORS.GTE).toBe('gte');
      expect(FILTER_OPERATORS.LT).toBe('lt');
      expect(FILTER_OPERATORS.LTE).toBe('lte');
      expect(FILTER_OPERATORS.CONTAINS).toBe('contains');
      expect(FILTER_OPERATORS.STARTS_WITH).toBe('startsWith');
      expect(FILTER_OPERATORS.ENDS_WITH).toBe('endsWith');
      expect(FILTER_OPERATORS.LIKE).toBe('like');
      expect(FILTER_OPERATORS.ILIKE).toBe('ilike');
      expect(FILTER_OPERATORS.IN).toBe('in');
      expect(FILTER_OPERATORS.NOT_IN).toBe('notIn');
      expect(FILTER_OPERATORS.IS_NULL).toBe('isNull');
      expect(FILTER_OPERATORS.IS_NOT_NULL).toBe('isNotNull');
      expect(FILTER_OPERATORS.BETWEEN).toBe('between');
      expect(FILTER_OPERATORS.ARRAY_CONTAINS).toBe('arrayContains');
      expect(FILTER_OPERATORS.ARRAY_CONTAINS_ANY).toBe('arrayContainsAny');
      expect(FILTER_OPERATORS.FULL_TEXT).toBe('fullText');
    });

    test('should be readonly', () => {
      expect(Object.isFrozen(FILTER_OPERATORS)).toBe(true);
    });
  });

  describe('LOGICAL_OPERATORS', () => {
    test('should have all expected operators', () => {
      expect(LOGICAL_OPERATORS.AND).toBe('and');
      expect(LOGICAL_OPERATORS.OR).toBe('or');
      expect(LOGICAL_OPERATORS.NOT).toBe('not');
    });
  });

  describe('SORT_ORDER', () => {
    test('should have asc and desc', () => {
      expect(SORT_ORDER.ASC).toBe('asc');
      expect(SORT_ORDER.DESC).toBe('desc');
    });
  });

  describe('isFilterCondition', () => {
    test('should return true for filter conditions', () => {
      const condition: FilterCondition = {
        field: 'name',
        operator: 'eq',
        value: 'test',
      };

      expect(isFilterCondition(condition)).toBe(true);
    });

    test('should return false for compound filters', () => {
      const compound: CompoundFilter = {
        operator: 'and',
        conditions: [{ field: 'name', operator: 'eq', value: 'test' }],
      };

      expect(isFilterCondition(compound)).toBe(false);
    });
  });

  describe('isCompoundFilter', () => {
    test('should return true for compound filters', () => {
      const compound: CompoundFilter = {
        operator: 'and',
        conditions: [{ field: 'name', operator: 'eq', value: 'test' }],
      };

      expect(isCompoundFilter(compound)).toBe(true);
    });

    test('should return false for filter conditions', () => {
      const condition: FilterCondition = {
        field: 'name',
        operator: 'eq',
        value: 'test',
      };

      expect(isCompoundFilter(condition)).toBe(false);
    });

    test('should handle nested compound filters', () => {
      const nested: CompoundFilter = {
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
      };

      expect(isCompoundFilter(nested)).toBe(true);
    });
  });
});
