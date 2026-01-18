// packages/core/src/stores/undoRedoStore.ts
import { create, type StoreApi, type UseBoundStore } from 'zustand';

import { invertTransaction, mergeTransactions, type Transaction } from '../transactions';

/**
 * Default threshold in milliseconds for batching rapid edits.
 * Transactions created within this window will be merged.
 */
const BATCH_THRESHOLD_MS = 1200;

/**
 * State interface for the undo/redo store.
 */
export interface UndoRedoState {
  /** Stack of transactions that can be undone */
  undoStack: Transaction[];
  /** Stack of transactions that can be redone */
  redoStack: Transaction[];
  /** Timestamp of the last pushed transaction */
  lastTimestamp: number;

  /**
   * Push a new transaction onto the undo stack.
   * Transactions within BATCH_THRESHOLD_MS are merged.
   * Clears the redo stack.
   */
  push: (tx: Transaction) => void;

  /**
   * Pop and invert the top transaction from the undo stack.
   * Returns the inverted transaction to be applied, or undefined if stack is empty.
   */
  undo: () => Transaction | undefined;

  /**
   * Pop and return the top transaction from the redo stack.
   * Returns the transaction to be reapplied, or undefined if stack is empty.
   */
  redo: () => Transaction | undefined;

  /** Check if undo is available */
  canUndo: () => boolean;

  /** Check if redo is available */
  canRedo: () => boolean;

  /** Clear all undo/redo history */
  clear: () => void;

  /** Get the number of undoable transactions */
  undoStackSize: () => number;

  /** Get the number of redoable transactions */
  redoStackSize: () => number;
}

/**
 * Create an undo/redo store with the specified batch threshold.
 * Useful for creating isolated instances for testing or multiple undo contexts.
 */
export function createUndoRedoStore(
  batchThresholdMs: number = BATCH_THRESHOLD_MS,
): UseBoundStore<StoreApi<UndoRedoState>> {
  return create<UndoRedoState>((set, get) => ({
    undoStack: [],
    redoStack: [],
    lastTimestamp: 0,

    push: (tx: Transaction): void => {
      set((state) => {
        const shouldBatch =
          tx.timestamp - state.lastTimestamp < batchThresholdMs && state.undoStack.length > 0;

        let undoStack: Transaction[];
        if (shouldBatch) {
          const lastTx = state.undoStack[state.undoStack.length - 1];
          if (lastTx !== undefined) {
            const merged = mergeTransactions(lastTx, tx);
            undoStack = [...state.undoStack.slice(0, -1), merged];
          } else {
            undoStack = [...state.undoStack, tx];
          }
        } else {
          undoStack = [...state.undoStack, tx];
        }

        return {
          undoStack,
          redoStack: [], // Clear redo stack on new action
          lastTimestamp: tx.timestamp,
        };
      });
    },

    undo: (): Transaction | undefined => {
      const { undoStack } = get();
      if (undoStack.length === 0) return undefined;

      const tx = undoStack[undoStack.length - 1];
      if (tx === undefined) return undefined;

      const inverse = invertTransaction(tx);

      set((state) => ({
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, tx],
      }));

      return inverse;
    },

    redo: (): Transaction | undefined => {
      const { redoStack } = get();
      if (redoStack.length === 0) return undefined;

      const tx = redoStack[redoStack.length - 1];
      if (tx === undefined) return undefined;

      set((state) => ({
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, tx],
      }));

      return tx;
    },

    canUndo: (): boolean => get().undoStack.length > 0,

    canRedo: (): boolean => get().redoStack.length > 0,

    clear: (): void => {
      set({
        undoStack: [],
        redoStack: [],
        lastTimestamp: 0,
      });
    },

    undoStackSize: (): number => get().undoStack.length,

    redoStackSize: (): number => get().redoStack.length,
  }));
}

/**
 * Default global undo/redo store instance.
 * Use this for application-wide undo/redo functionality.
 */
export const useUndoRedoStore = createUndoRedoStore();
