// shared/core/src/infrastructure/transactions/operations.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  invertOperation,
  invertTransaction,
  mergeTransactions,
  createSetOperation,
  createListInsertOperation,
  createListRemoveOperation,
  createTransaction,
} from './operations';

import type { SetOperation, ListInsertOperation, ListRemoveOperation, Transaction } from './types';

describe('operations', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'test-uuid'),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('invertOperation', () => {
    describe('set operations', () => {
      it('should swap value and previousValue', () => {
        const op: SetOperation = {
          type: 'set',
          path: ['user', 'name'],
          value: 'New Name',
          previousValue: 'Old Name',
        };

        const inverted = invertOperation(op);

        expect(inverted.type).toBe('set');
        expect((inverted as SetOperation).value).toBe('Old Name');
        expect((inverted as SetOperation).previousValue).toBe('New Name');
        expect((inverted as SetOperation).path).toEqual(['user', 'name']);
      });

      it('should handle undefined previousValue', () => {
        const op: SetOperation = {
          type: 'set',
          path: ['config', 'setting'],
          value: 'value',
        };

        const inverted = invertOperation(op);

        expect((inverted as SetOperation).value).toBeUndefined();
        expect((inverted as SetOperation).previousValue).toBe('value');
      });

      it('should handle complex values', () => {
        const op: SetOperation = {
          type: 'set',
          path: ['data'],
          value: { a: 1, b: { c: 2 } },
          previousValue: { a: 0 },
        };

        const inverted = invertOperation(op);

        expect((inverted as SetOperation).value).toEqual({ a: 0 });
        expect((inverted as SetOperation).previousValue).toEqual({ a: 1, b: { c: 2 } });
      });
    });

    describe('listInsert operations', () => {
      it('should convert to listRemove', () => {
        const op: ListInsertOperation = {
          type: 'listInsert',
          path: ['items'],
          value: { id: '1' },
          position: 'append',
        };

        const inverted = invertOperation(op);

        expect(inverted.type).toBe('listRemove');
        expect((inverted as ListRemoveOperation).path).toEqual(['items']);
        expect((inverted as ListRemoveOperation).value).toEqual({ id: '1' });
      });

      it('should handle different positions', () => {
        const prependOp: ListInsertOperation = {
          type: 'listInsert',
          path: ['list'],
          value: 'item',
          position: 'prepend',
        };

        const afterOp: ListInsertOperation = {
          type: 'listInsert',
          path: ['list'],
          value: 'item',
          position: { after: 'other-item' },
        };

        expect(invertOperation(prependOp).type).toBe('listRemove');
        expect(invertOperation(afterOp).type).toBe('listRemove');
      });
    });

    describe('listRemove operations', () => {
      it('should convert to listInsert with append when no previousPosition', () => {
        const op: ListRemoveOperation = {
          type: 'listRemove',
          path: ['items'],
          value: { id: '1' },
        };

        const inverted = invertOperation(op);

        expect(inverted.type).toBe('listInsert');
        expect((inverted as ListInsertOperation).path).toEqual(['items']);
        expect((inverted as ListInsertOperation).value).toEqual({ id: '1' });
        expect((inverted as ListInsertOperation).position).toBe('append');
      });

      it('should convert to listInsert with prepend when previousPosition is 0', () => {
        const op: ListRemoveOperation = {
          type: 'listRemove',
          path: ['items'],
          value: { id: '1' },
          previousPosition: 0,
        };

        const inverted = invertOperation(op);

        expect((inverted as ListInsertOperation).position).toBe('prepend');
      });

      it('should convert to listInsert with after when previousPosition > 0', () => {
        const op: ListRemoveOperation = {
          type: 'listRemove',
          path: ['items'],
          value: { id: '1' },
          previousPosition: 3,
        };

        const inverted = invertOperation(op);

        expect((inverted as ListInsertOperation).position).toEqual({ after: 2 });
      });
    });
  });

  describe('invertTransaction', () => {
    it('should invert all operations and reverse order', () => {
      const tx: Transaction = {
        id: 'tx-1',
        timestamp: 1000,
        operations: [
          { type: 'set', path: ['a'], value: 1, previousValue: 0 },
          { type: 'set', path: ['b'], value: 2, previousValue: 0 },
          { type: 'set', path: ['c'], value: 3, previousValue: 0 },
        ],
      };

      const inverted = invertTransaction(tx);

      expect(inverted.id).toBe('test-uuid');
      expect(inverted.operations).toHaveLength(3);

      // Check operations are reversed
      expect((inverted.operations[0] as SetOperation).path).toEqual(['c']);
      expect((inverted.operations[1] as SetOperation).path).toEqual(['b']);
      expect((inverted.operations[2] as SetOperation).path).toEqual(['a']);

      // Check values are inverted
      expect((inverted.operations[0] as SetOperation).value).toBe(0);
      expect((inverted.operations[0] as SetOperation).previousValue).toBe(3);
    });

    it('should handle mixed operation types', () => {
      const tx: Transaction = {
        id: 'tx-2',
        timestamp: 2000,
        operations: [
          { type: 'set', path: ['name'], value: 'new', previousValue: 'old' },
          { type: 'listInsert', path: ['items'], value: 'item-1', position: 'append' },
        ],
      };

      const inverted = invertTransaction(tx);

      expect(inverted.operations).toHaveLength(2);
      expect(inverted.operations[0]?.type).toBe('listRemove');
      expect(inverted.operations[1]?.type).toBe('set');
    });
  });

  describe('mergeTransactions', () => {
    it('should combine operations from both transactions', () => {
      const tx1: Transaction = {
        id: 'tx-1',
        timestamp: 1000,
        operations: [{ type: 'set', path: ['a'], value: 1 }],
      };

      const tx2: Transaction = {
        id: 'tx-2',
        timestamp: 2000,
        operations: [{ type: 'set', path: ['b'], value: 2 }],
      };

      const merged = mergeTransactions(tx1, tx2);

      expect(merged.id).toBe('tx-2');
      expect(merged.timestamp).toBe(2000);
      expect(merged.operations).toHaveLength(2);
      expect((merged.operations[0] as SetOperation).path).toEqual(['a']);
      expect((merged.operations[1] as SetOperation).path).toEqual(['b']);
    });
  });

  describe('factory functions', () => {
    describe('createSetOperation', () => {
      it('should create a set operation', () => {
        const op = createSetOperation(['user', 'name'], 'John', 'Jane');

        expect(op.type).toBe('set');
        expect(op.path).toEqual(['user', 'name']);
        expect(op.value).toBe('John');
        expect(op.previousValue).toBe('Jane');
      });

      it('should handle optional previousValue', () => {
        const op = createSetOperation(['data'], 'value');

        expect(op.previousValue).toBeUndefined();
      });
    });

    describe('createListInsertOperation', () => {
      it('should create a list insert operation with default append', () => {
        const op = createListInsertOperation(['items'], { id: '1' });

        expect(op.type).toBe('listInsert');
        expect(op.path).toEqual(['items']);
        expect(op.value).toEqual({ id: '1' });
        expect(op.position).toBe('append');
      });

      it('should accept custom position', () => {
        const op = createListInsertOperation(['items'], { id: '1' }, 'prepend');

        expect(op.position).toBe('prepend');
      });
    });

    describe('createListRemoveOperation', () => {
      it('should create a list remove operation', () => {
        const op = createListRemoveOperation(['items'], { id: '1' }, 2);

        expect(op.type).toBe('listRemove');
        expect(op.path).toEqual(['items']);
        expect(op.value).toEqual({ id: '1' });
        expect(op.previousPosition).toBe(2);
      });
    });

    describe('createTransaction', () => {
      it('should create a transaction with operations', () => {
        const ops = [createSetOperation(['a'], 1), createSetOperation(['b'], 2)];

        const tx = createTransaction(ops);

        expect(tx.id).toBe('test-uuid');
        expect(tx.operations).toEqual(ops);
        expect(typeof tx.timestamp).toBe('number');
      });
    });
  });

  describe('double inversion', () => {
    it('should return equivalent operation after double inversion for set', () => {
      const original: SetOperation = {
        type: 'set',
        path: ['data'],
        value: 'new',
        previousValue: 'old',
      };

      const doubleInverted = invertOperation(invertOperation(original));

      expect(doubleInverted).toEqual(original);
    });

    it('should preserve path and value through double inversion for list ops', () => {
      const insertOp: ListInsertOperation = {
        type: 'listInsert',
        path: ['items'],
        value: { id: '1' },
        position: 'append',
      };

      // Insert -> Remove -> Insert
      const firstInvert = invertOperation(insertOp);
      expect(firstInvert.type).toBe('listRemove');

      const secondInvert = invertOperation(firstInvert);
      expect(secondInvert.type).toBe('listInsert');
      expect((secondInvert as ListInsertOperation).path).toEqual(['items']);
      expect((secondInvert as ListInsertOperation).value).toEqual({ id: '1' });
    });
  });
});
