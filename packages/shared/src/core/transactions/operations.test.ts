// shared/src/core/transactions/operations.test.ts
import { describe, expect, it } from 'vitest';

import {
  createListInsertOperation,
  createListRemoveOperation,
  createSetOperation,
  createTransaction,
  invertOperation,
  invertTransaction,
  mergeTransactions,
} from './operations';
import type { ListInsertOperation, ListRemoveOperation, SetOperation, Transaction } from './types';

describe('transactions/operations', () => {
  // ==========================================================================
  // invertOperation - Set
  // ==========================================================================
  describe('invertOperation (set)', () => {
    it('swaps value and previousValue for set operations', () => {
      const op: SetOperation = {
        type: 'set',
        path: ['user', 'name'],
        value: 'New Name',
        previousValue: 'Old Name',
      };

      const inverted = invertOperation(op);
      expect(inverted.type).toBe('set');
      expect(inverted).toEqual({
        type: 'set',
        path: ['user', 'name'],
        value: 'Old Name',
        previousValue: 'New Name',
      });
    });

    it('handles undefined previousValue', () => {
      const op: SetOperation = {
        type: 'set',
        path: ['user', 'email'],
        value: 'new@test.com',
      };

      const inverted = invertOperation(op);
      expect(inverted).toEqual({
        type: 'set',
        path: ['user', 'email'],
        value: undefined,
        previousValue: 'new@test.com',
      });
    });
  });

  // ==========================================================================
  // invertOperation - ListInsert
  // ==========================================================================
  describe('invertOperation (listInsert)', () => {
    it('converts listInsert to listRemove', () => {
      const op: ListInsertOperation = {
        type: 'listInsert',
        path: ['items'],
        value: 'item-1',
        position: 'append',
      };

      const inverted = invertOperation(op);
      expect(inverted.type).toBe('listRemove');
      expect(inverted).toEqual({
        type: 'listRemove',
        path: ['items'],
        value: 'item-1',
      });
    });
  });

  // ==========================================================================
  // invertOperation - ListRemove
  // ==========================================================================
  describe('invertOperation (listRemove)', () => {
    it('converts listRemove to listInsert with append when no previousPosition', () => {
      const op: ListRemoveOperation = {
        type: 'listRemove',
        path: ['items'],
        value: 'item-1',
      };

      const inverted = invertOperation(op);
      expect(inverted.type).toBe('listInsert');
      expect(inverted).toEqual({
        type: 'listInsert',
        path: ['items'],
        value: 'item-1',
        position: 'append',
      });
    });

    it('converts to prepend when previousPosition is 0', () => {
      const op: ListRemoveOperation = {
        type: 'listRemove',
        path: ['items'],
        value: 'item-1',
        previousPosition: 0,
      };

      const inverted = invertOperation(op);
      expect(inverted).toEqual({
        type: 'listInsert',
        path: ['items'],
        value: 'item-1',
        position: 'prepend',
      });
    });

    it('converts to after position when previousPosition > 0', () => {
      const op: ListRemoveOperation = {
        type: 'listRemove',
        path: ['items'],
        value: 'item-1',
        previousPosition: 3,
      };

      const inverted = invertOperation(op);
      expect(inverted).toEqual({
        type: 'listInsert',
        path: ['items'],
        value: 'item-1',
        position: { after: 2 },
      });
    });
  });

  // ==========================================================================
  // invertTransaction
  // ==========================================================================
  describe('invertTransaction', () => {
    it('inverts and reverses all operations', () => {
      const tx: Transaction = {
        id: 'tx-1',
        timestamp: 1000,
        operations: [
          { type: 'set', path: ['a'], value: 1, previousValue: 0 },
          { type: 'set', path: ['b'], value: 2, previousValue: 0 },
        ],
      };

      const inverted = invertTransaction(tx);

      // New ID and timestamp
      expect(inverted.id).not.toBe('tx-1');
      expect(inverted.timestamp).toBeGreaterThan(0);

      // Operations reversed and each inverted
      expect(inverted.operations).toHaveLength(2);
      expect(inverted.operations[0]).toEqual({
        type: 'set',
        path: ['b'],
        value: 0,
        previousValue: 2,
      });
      expect(inverted.operations[1]).toEqual({
        type: 'set',
        path: ['a'],
        value: 0,
        previousValue: 1,
      });
    });
  });

  // ==========================================================================
  // mergeTransactions
  // ==========================================================================
  describe('mergeTransactions', () => {
    it('combines operations from two transactions', () => {
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
    });
  });

  // ==========================================================================
  // Factory Functions
  // ==========================================================================
  describe('createSetOperation', () => {
    it('creates a set operation', () => {
      const op = createSetOperation(['user', 'name'], 'John', 'Jane');
      expect(op).toEqual({
        type: 'set',
        path: ['user', 'name'],
        value: 'John',
        previousValue: 'Jane',
      });
    });

    it('creates a set operation without previousValue', () => {
      const op = createSetOperation(['key'], 'value');
      expect(op.previousValue).toBeUndefined();
    });
  });

  describe('createListInsertOperation', () => {
    it('creates with default append position', () => {
      const op = createListInsertOperation(['items'], 'item-1');
      expect(op).toEqual({
        type: 'listInsert',
        path: ['items'],
        value: 'item-1',
        position: 'append',
      });
    });

    it('creates with custom position', () => {
      const op = createListInsertOperation(['items'], 'item-1', 'prepend');
      expect(op.position).toBe('prepend');
    });
  });

  describe('createListRemoveOperation', () => {
    it('creates a list remove operation', () => {
      const op = createListRemoveOperation(['items'], 'item-1', 2);
      expect(op).toEqual({
        type: 'listRemove',
        path: ['items'],
        value: 'item-1',
        previousPosition: 2,
      });
    });

    it('creates without previousPosition', () => {
      const op = createListRemoveOperation(['items'], 'item-1');
      expect(op.previousPosition).toBeUndefined();
    });
  });

  describe('createTransaction', () => {
    it('creates a transaction with generated id and timestamp', () => {
      const ops = [createSetOperation(['key'], 'value')];
      const tx = createTransaction(ops);
      expect(tx.id).toBeDefined();
      expect(tx.timestamp).toBeGreaterThan(0);
      expect(tx.operations).toBe(ops);
    });
  });
});
