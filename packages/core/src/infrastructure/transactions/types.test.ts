// packages/core/src/infrastructure/transactions/types.test.ts
import { describe, expect, it } from 'vitest';

import {
  isListInsertOperation,
  isListRemoveOperation,
  isSetOperation,
  type ListInsertOperation,
  type ListRemoveOperation,
  type Operation,
  type SetOperation,
  type Transaction,
} from './types';

describe('Transaction Types', () => {
  describe('SetOperation', () => {
    it('should have correct structure', () => {
      const op: SetOperation = {
        type: 'set',
        path: ['users', 'user-1', 'name'],
        value: 'John',
        previousValue: 'Jane',
      };

      expect(op.type).toBe('set');
      expect(op.path).toEqual(['users', 'user-1', 'name']);
      expect(op.value).toBe('John');
      expect(op.previousValue).toBe('Jane');
    });

    it('should allow undefined previousValue', () => {
      const op: SetOperation = {
        type: 'set',
        path: ['config', 'theme'],
        value: 'dark',
      };

      expect(op.previousValue).toBeUndefined();
    });
  });

  describe('ListInsertOperation', () => {
    it('should support append position', () => {
      const op: ListInsertOperation = {
        type: 'listInsert',
        path: ['items'],
        value: { id: '1', name: 'Item 1' },
        position: 'append',
      };

      expect(op.type).toBe('listInsert');
      expect(op.position).toBe('append');
    });

    it('should support prepend position', () => {
      const op: ListInsertOperation = {
        type: 'listInsert',
        path: ['items'],
        value: { id: '1' },
        position: 'prepend',
      };

      expect(op.position).toBe('prepend');
    });

    it('should support after position', () => {
      const op: ListInsertOperation = {
        type: 'listInsert',
        path: ['items'],
        value: { id: '2' },
        position: { after: { id: '1' } },
      };

      expect(op.position).toEqual({ after: { id: '1' } });
    });
  });

  describe('ListRemoveOperation', () => {
    it('should have correct structure', () => {
      const op: ListRemoveOperation = {
        type: 'listRemove',
        path: ['items'],
        value: { id: '1', name: 'Item 1' },
        previousPosition: 0,
      };

      expect(op.type).toBe('listRemove');
      expect(op.path).toEqual(['items']);
      expect(op.value).toEqual({ id: '1', name: 'Item 1' });
      expect(op.previousPosition).toBe(0);
    });

    it('should allow undefined previousPosition', () => {
      const op: ListRemoveOperation = {
        type: 'listRemove',
        path: ['items'],
        value: { id: '1' },
      };

      expect(op.previousPosition).toBeUndefined();
    });
  });

  describe('Transaction', () => {
    it('should have correct structure', () => {
      const transaction: Transaction = {
        id: 'tx-1',
        timestamp: Date.now(),
        operations: [
          {
            type: 'set',
            path: ['users', 'user-1', 'name'],
            value: 'John',
          },
        ],
      };

      expect(transaction.id).toBe('tx-1');
      expect(typeof transaction.timestamp).toBe('number');
      expect(transaction.operations).toHaveLength(1);
    });

    it('should support multiple operations', () => {
      const transaction: Transaction = {
        id: 'tx-2',
        timestamp: Date.now(),
        operations: [
          { type: 'set', path: ['a'], value: 1 },
          { type: 'listInsert', path: ['b'], value: 2, position: 'append' },
          { type: 'listRemove', path: ['c'], value: 3 },
        ],
      };

      expect(transaction.operations).toHaveLength(3);
    });
  });

  describe('isSetOperation', () => {
    it('should return true for set operations', () => {
      const op: Operation = { type: 'set', path: [], value: 'test' };
      expect(isSetOperation(op)).toBe(true);
    });

    it('should return false for other operations', () => {
      const insertOp: Operation = {
        type: 'listInsert',
        path: [],
        value: 'test',
        position: 'append',
      };
      const removeOp: Operation = { type: 'listRemove', path: [], value: 'test' };

      expect(isSetOperation(insertOp)).toBe(false);
      expect(isSetOperation(removeOp)).toBe(false);
    });

    it('should narrow type correctly', () => {
      const op: Operation = { type: 'set', path: ['test'], value: 'value', previousValue: 'old' };

      if (isSetOperation(op)) {
        // TypeScript should know op.previousValue exists
        expect(op.previousValue).toBe('old');
      }
    });
  });

  describe('isListInsertOperation', () => {
    it('should return true for listInsert operations', () => {
      const op: Operation = { type: 'listInsert', path: [], value: 'test', position: 'append' };
      expect(isListInsertOperation(op)).toBe(true);
    });

    it('should return false for other operations', () => {
      const setOp: Operation = { type: 'set', path: [], value: 'test' };
      const removeOp: Operation = { type: 'listRemove', path: [], value: 'test' };

      expect(isListInsertOperation(setOp)).toBe(false);
      expect(isListInsertOperation(removeOp)).toBe(false);
    });

    it('should narrow type correctly', () => {
      const op: Operation = {
        type: 'listInsert',
        path: ['items'],
        value: 'item',
        position: 'prepend',
      };

      if (isListInsertOperation(op)) {
        // TypeScript should know op.position exists
        expect(op.position).toBe('prepend');
      }
    });
  });

  describe('isListRemoveOperation', () => {
    it('should return true for listRemove operations', () => {
      const op: Operation = { type: 'listRemove', path: [], value: 'test' };
      expect(isListRemoveOperation(op)).toBe(true);
    });

    it('should return false for other operations', () => {
      const setOp: Operation = { type: 'set', path: [], value: 'test' };
      const insertOp: Operation = {
        type: 'listInsert',
        path: [],
        value: 'test',
        position: 'append',
      };

      expect(isListRemoveOperation(setOp)).toBe(false);
      expect(isListRemoveOperation(insertOp)).toBe(false);
    });

    it('should narrow type correctly', () => {
      const op: Operation = {
        type: 'listRemove',
        path: ['items'],
        value: 'item',
        previousPosition: 5,
      };

      if (isListRemoveOperation(op)) {
        // TypeScript should know op.previousPosition exists
        expect(op.previousPosition).toBe(5);
      }
    });
  });
});
