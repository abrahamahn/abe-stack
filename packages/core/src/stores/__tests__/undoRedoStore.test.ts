// packages/core/src/stores/__tests__/undoRedoStore.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { createTransaction, createSetOperation } from '../../infrastructure/transactions';
import { createUndoRedoStore } from '../undoRedoStore';

describe('undoRedoStore', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => `uuid-${Math.random().toString(36).slice(2)}`),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('push', () => {
    it('should add transaction to undo stack', () => {
      const store = createUndoRedoStore();
      const tx = createTransaction([createSetOperation(['a'], 1, 0)]);

      store.getState().push(tx);

      expect(store.getState().undoStackSize()).toBe(1);
      expect(store.getState().undoStack[0]).toBe(tx);
    });

    it('should clear redo stack on push', () => {
      const store = createUndoRedoStore();

      // Push and undo to populate redo stack
      const tx1 = createTransaction([createSetOperation(['a'], 1, 0)]);
      store.getState().push(tx1);
      store.getState().undo();

      expect(store.getState().redoStackSize()).toBe(1);

      // Push new transaction
      const tx2 = createTransaction([createSetOperation(['b'], 2, 0)]);
      store.getState().push(tx2);

      expect(store.getState().redoStackSize()).toBe(0);
    });

    it('should merge transactions within batch threshold', () => {
      const store = createUndoRedoStore(1000); // 1 second threshold

      const tx1 = {
        id: 'tx-1',
        timestamp: 1000,
        operations: [createSetOperation(['a'], 1, 0)],
      };

      const tx2 = {
        id: 'tx-2',
        timestamp: 1500, // 500ms after tx1 - within threshold
        operations: [createSetOperation(['b'], 2, 0)],
      };

      store.getState().push(tx1);
      store.getState().push(tx2);

      // Should be merged into one transaction
      expect(store.getState().undoStackSize()).toBe(1);

      const merged = store.getState().undoStack[0];
      expect(merged?.operations).toHaveLength(2);
    });

    it('should not merge transactions outside batch threshold', () => {
      const store = createUndoRedoStore(1000);

      const tx1 = {
        id: 'tx-1',
        timestamp: 1000,
        operations: [createSetOperation(['a'], 1, 0)],
      };

      const tx2 = {
        id: 'tx-2',
        timestamp: 3000, // 2 seconds after tx1 - outside threshold
        operations: [createSetOperation(['b'], 2, 0)],
      };

      store.getState().push(tx1);
      store.getState().push(tx2);

      expect(store.getState().undoStackSize()).toBe(2);
    });
  });

  describe('undo', () => {
    it('should return undefined when stack is empty', () => {
      const store = createUndoRedoStore();

      const result = store.getState().undo();

      expect(result).toBeUndefined();
    });

    it('should return inverted transaction', () => {
      const store = createUndoRedoStore();
      const tx = createTransaction([createSetOperation(['name'], 'new', 'old')]);

      store.getState().push(tx);
      const inverse = store.getState().undo();

      expect(inverse).toBeDefined();
      expect(inverse?.operations[0]?.type).toBe('set');
      // Value and previousValue should be swapped
      const setOp = inverse?.operations[0] as {
        type: string;
        value: unknown;
        previousValue: unknown;
      };
      expect(setOp.value).toBe('old');
      expect(setOp.previousValue).toBe('new');
    });

    it('should move transaction to redo stack', () => {
      const store = createUndoRedoStore();
      const tx = createTransaction([createSetOperation(['a'], 1, 0)]);

      store.getState().push(tx);
      expect(store.getState().undoStackSize()).toBe(1);
      expect(store.getState().redoStackSize()).toBe(0);

      store.getState().undo();

      expect(store.getState().undoStackSize()).toBe(0);
      expect(store.getState().redoStackSize()).toBe(1);
    });

    it('should undo multiple transactions in reverse order', () => {
      const store = createUndoRedoStore(0); // Disable batching

      const tx1 = {
        id: 'tx-1',
        timestamp: 1000,
        operations: [createSetOperation(['a'], 1, 0)],
      };
      const tx2 = {
        id: 'tx-2',
        timestamp: 2000,
        operations: [createSetOperation(['a'], 2, 1)],
      };
      const tx3 = {
        id: 'tx-3',
        timestamp: 3000,
        operations: [createSetOperation(['a'], 3, 2)],
      };

      store.getState().push(tx1);
      store.getState().push(tx2);
      store.getState().push(tx3);

      // Undo should return transactions in reverse order (3, 2, 1)
      const undo1 = store.getState().undo();
      expect((undo1?.operations[0] as { value: unknown }).value).toBe(2);

      const undo2 = store.getState().undo();
      expect((undo2?.operations[0] as { value: unknown }).value).toBe(1);

      const undo3 = store.getState().undo();
      expect((undo3?.operations[0] as { value: unknown }).value).toBe(0);
    });
  });

  describe('redo', () => {
    it('should return undefined when stack is empty', () => {
      const store = createUndoRedoStore();

      const result = store.getState().redo();

      expect(result).toBeUndefined();
    });

    it('should return original transaction (not inverted)', () => {
      const store = createUndoRedoStore();
      const tx = createTransaction([createSetOperation(['name'], 'new', 'old')]);

      store.getState().push(tx);
      store.getState().undo();
      const redone = store.getState().redo();

      expect(redone).toBeDefined();
      const setOp = redone?.operations[0] as {
        type: string;
        value: unknown;
        previousValue: unknown;
      };
      expect(setOp.value).toBe('new');
      expect(setOp.previousValue).toBe('old');
    });

    it('should move transaction back to undo stack', () => {
      const store = createUndoRedoStore();
      const tx = createTransaction([createSetOperation(['a'], 1, 0)]);

      store.getState().push(tx);
      store.getState().undo();

      expect(store.getState().undoStackSize()).toBe(0);
      expect(store.getState().redoStackSize()).toBe(1);

      store.getState().redo();

      expect(store.getState().undoStackSize()).toBe(1);
      expect(store.getState().redoStackSize()).toBe(0);
    });
  });

  describe('canUndo / canRedo', () => {
    it('should return false initially', () => {
      const store = createUndoRedoStore();

      expect(store.getState().canUndo()).toBe(false);
      expect(store.getState().canRedo()).toBe(false);
    });

    it('should return true when actions are available', () => {
      const store = createUndoRedoStore();
      const tx = createTransaction([createSetOperation(['a'], 1, 0)]);

      store.getState().push(tx);
      expect(store.getState().canUndo()).toBe(true);
      expect(store.getState().canRedo()).toBe(false);

      store.getState().undo();
      expect(store.getState().canUndo()).toBe(false);
      expect(store.getState().canRedo()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear both stacks', () => {
      const store = createUndoRedoStore(0); // Disable batching

      const tx1 = {
        id: 'tx-1',
        timestamp: 1000,
        operations: [createSetOperation(['a'], 1, 0)],
      };
      const tx2 = {
        id: 'tx-2',
        timestamp: 2000,
        operations: [createSetOperation(['b'], 2, 0)],
      };

      store.getState().push(tx1);
      store.getState().push(tx2);
      store.getState().undo();

      expect(store.getState().undoStackSize()).toBe(1);
      expect(store.getState().redoStackSize()).toBe(1);

      store.getState().clear();

      expect(store.getState().undoStackSize()).toBe(0);
      expect(store.getState().redoStackSize()).toBe(0);
      expect(store.getState().canUndo()).toBe(false);
      expect(store.getState().canRedo()).toBe(false);
    });

    it('should reset lastTimestamp', () => {
      const store = createUndoRedoStore();
      const tx = {
        id: 'tx-1',
        timestamp: 5000,
        operations: [createSetOperation(['a'], 1, 0)],
      };

      store.getState().push(tx);
      expect(store.getState().lastTimestamp).toBe(5000);

      store.getState().clear();
      expect(store.getState().lastTimestamp).toBe(0);
    });
  });

  describe('undo/redo cycle', () => {
    it('should maintain consistency through undo/redo cycles', () => {
      const store = createUndoRedoStore(0);

      const tx1 = {
        id: 'tx-1',
        timestamp: 1000,
        operations: [createSetOperation(['value'], 'A', 'initial')],
      };
      const tx2 = {
        id: 'tx-2',
        timestamp: 2000,
        operations: [createSetOperation(['value'], 'B', 'A')],
      };

      store.getState().push(tx1);
      store.getState().push(tx2);

      // State: A -> B, undo stack has 2

      const undo1 = store.getState().undo();
      // Should revert B -> A
      expect((undo1?.operations[0] as { value: unknown }).value).toBe('A');

      const undo2 = store.getState().undo();
      // Should revert A -> initial
      expect((undo2?.operations[0] as { value: unknown }).value).toBe('initial');

      const redo1 = store.getState().redo();
      // Should apply initial -> A
      expect((redo1?.operations[0] as { value: unknown }).value).toBe('A');

      const redo2 = store.getState().redo();
      // Should apply A -> B
      expect((redo2?.operations[0] as { value: unknown }).value).toBe('B');
    });
  });

  describe('stack size helpers', () => {
    it('should return correct stack sizes', () => {
      const store = createUndoRedoStore(0);

      expect(store.getState().undoStackSize()).toBe(0);
      expect(store.getState().redoStackSize()).toBe(0);

      const tx1 = {
        id: 'tx-1',
        timestamp: 1000,
        operations: [createSetOperation(['a'], 1, 0)],
      };
      const tx2 = {
        id: 'tx-2',
        timestamp: 2000,
        operations: [createSetOperation(['b'], 2, 0)],
      };
      const tx3 = {
        id: 'tx-3',
        timestamp: 3000,
        operations: [createSetOperation(['c'], 3, 0)],
      };

      store.getState().push(tx1);
      store.getState().push(tx2);
      store.getState().push(tx3);

      expect(store.getState().undoStackSize()).toBe(3);
      expect(store.getState().redoStackSize()).toBe(0);

      store.getState().undo();
      store.getState().undo();

      expect(store.getState().undoStackSize()).toBe(1);
      expect(store.getState().redoStackSize()).toBe(2);
    });
  });

  describe('store isolation', () => {
    it('should create independent store instances', () => {
      const store1 = createUndoRedoStore(0);
      const store2 = createUndoRedoStore(0);

      const tx1 = {
        id: 'tx-1',
        timestamp: 1000,
        operations: [createSetOperation(['a'], 1, 0)],
      };
      const tx2 = {
        id: 'tx-2',
        timestamp: 2000,
        operations: [createSetOperation(['b'], 2, 0)],
      };

      store1.getState().push(tx1);
      store2.getState().push(tx2);

      expect(store1.getState().undoStackSize()).toBe(1);
      expect(store2.getState().undoStackSize()).toBe(1);

      // Operations should not affect each other
      store1.getState().undo();

      expect(store1.getState().undoStackSize()).toBe(0);
      expect(store2.getState().undoStackSize()).toBe(1);
    });

    it('should have independent batch thresholds', () => {
      const fastStore = createUndoRedoStore(100); // 100ms threshold
      const slowStore = createUndoRedoStore(5000); // 5 second threshold

      const tx1 = { id: 'tx-1', timestamp: 1000, operations: [createSetOperation(['a'], 1, 0)] };
      const tx2 = { id: 'tx-2', timestamp: 1500, operations: [createSetOperation(['b'], 2, 0)] };

      fastStore.getState().push(tx1);
      fastStore.getState().push(tx2);
      slowStore.getState().push(tx1);
      slowStore.getState().push(tx2);

      // 500ms difference - outside fast threshold, inside slow threshold
      expect(fastStore.getState().undoStackSize()).toBe(2); // Not batched
      expect(slowStore.getState().undoStackSize()).toBe(1); // Batched
    });

    it('should allow clearing one store without affecting others', () => {
      const store1 = createUndoRedoStore(0);
      const store2 = createUndoRedoStore(0);

      const tx = { id: 'tx-1', timestamp: 1000, operations: [createSetOperation(['a'], 1, 0)] };

      store1.getState().push(tx);
      store2.getState().push(tx);
      store1.getState().undo();
      store2.getState().undo();

      expect(store1.getState().redoStackSize()).toBe(1);
      expect(store2.getState().redoStackSize()).toBe(1);

      store1.getState().clear();

      expect(store1.getState().undoStackSize()).toBe(0);
      expect(store1.getState().redoStackSize()).toBe(0);
      expect(store2.getState().redoStackSize()).toBe(1);
    });
  });

  describe('large stack behavior', () => {
    it('should handle large number of transactions', () => {
      const store = createUndoRedoStore(0);

      // Push 100 transactions
      for (let i = 0; i < 100; i++) {
        const tx = {
          id: `tx-${i}`,
          timestamp: i * 1000,
          operations: [createSetOperation(['value'], i + 1, i)],
        };
        store.getState().push(tx);
      }

      expect(store.getState().undoStackSize()).toBe(100);

      // Undo all 100
      for (let i = 0; i < 100; i++) {
        const result = store.getState().undo();
        expect(result).toBeDefined();
      }

      expect(store.getState().undoStackSize()).toBe(0);
      expect(store.getState().redoStackSize()).toBe(100);

      // Redo all 100
      for (let i = 0; i < 100; i++) {
        const result = store.getState().redo();
        expect(result).toBeDefined();
      }

      expect(store.getState().undoStackSize()).toBe(100);
      expect(store.getState().redoStackSize()).toBe(0);
    });

    it('should maintain stack integrity after mixed operations', () => {
      const store = createUndoRedoStore(0);

      // Push 10 transactions
      for (let i = 0; i < 10; i++) {
        const tx = {
          id: `tx-${i}`,
          timestamp: i * 1000,
          operations: [createSetOperation(['value'], i + 1, i)],
        };
        store.getState().push(tx);
      }

      // Undo 5
      for (let i = 0; i < 5; i++) {
        store.getState().undo();
      }

      expect(store.getState().undoStackSize()).toBe(5);
      expect(store.getState().redoStackSize()).toBe(5);

      // Push new transaction (should clear redo stack)
      const newTx = {
        id: 'new-tx',
        timestamp: 20000,
        operations: [createSetOperation(['value'], 100, 5)],
      };
      store.getState().push(newTx);

      expect(store.getState().undoStackSize()).toBe(6);
      expect(store.getState().redoStackSize()).toBe(0); // Redo cleared
    });

    it('should handle operations with multiple ops per transaction', () => {
      const store = createUndoRedoStore(0);

      const tx = {
        id: 'multi-op-tx',
        timestamp: 1000,
        operations: [
          createSetOperation(['a'], 1, 0),
          createSetOperation(['b'], 2, 0),
          createSetOperation(['c'], 3, 0),
        ],
      };

      store.getState().push(tx);
      const result = store.getState().undo();

      expect(result?.operations).toHaveLength(3);
    });
  });
});
