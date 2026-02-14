// main/shared/src/core/transactions/types.test.ts
import { describe, expect, it } from 'vitest';

import { isListInsertOperation, isListRemoveOperation, isSetOperation } from './types';

import type { ListInsertOperation, ListRemoveOperation, Operation, SetOperation } from './types';

describe('transaction type guards', () => {
  const setOp: SetOperation = {
    type: 'set',
    path: ['user', 'name'],
    value: 'John',
  };

  const listInsertOp: ListInsertOperation = {
    type: 'listInsert',
    path: ['items'],
    value: 'item-1',
    position: 'append',
  };

  const listRemoveOp: ListRemoveOperation = {
    type: 'listRemove',
    path: ['items'],
    value: 'item-1',
  };

  // ==========================================================================
  // isSetOperation
  // ==========================================================================
  describe('isSetOperation', () => {
    it('returns true for set operations', () => {
      expect(isSetOperation(setOp)).toBe(true);
    });

    it('returns false for listInsert operations', () => {
      expect(isSetOperation(listInsertOp as Operation)).toBe(false);
    });

    it('returns false for listRemove operations', () => {
      expect(isSetOperation(listRemoveOp as Operation)).toBe(false);
    });
  });

  // ==========================================================================
  // isListInsertOperation
  // ==========================================================================
  describe('isListInsertOperation', () => {
    it('returns true for listInsert operations', () => {
      expect(isListInsertOperation(listInsertOp)).toBe(true);
    });

    it('returns false for set operations', () => {
      expect(isListInsertOperation(setOp as Operation)).toBe(false);
    });

    it('returns false for listRemove operations', () => {
      expect(isListInsertOperation(listRemoveOp as Operation)).toBe(false);
    });
  });

  // ==========================================================================
  // isListRemoveOperation
  // ==========================================================================
  describe('isListRemoveOperation', () => {
    it('returns true for listRemove operations', () => {
      expect(isListRemoveOperation(listRemoveOp)).toBe(true);
    });

    it('returns false for set operations', () => {
      expect(isListRemoveOperation(setOp as Operation)).toBe(false);
    });

    it('returns false for listInsert operations', () => {
      expect(isListRemoveOperation(listInsertOp as Operation)).toBe(false);
    });
  });
});
