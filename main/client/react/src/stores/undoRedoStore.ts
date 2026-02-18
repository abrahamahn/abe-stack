// main/client/react/src/stores/undoRedoStore.ts
/**
 * Undo/Redo Store
 *
 * This module provides an undo/redo store for managing transaction history.
 * These utilities are part of the public API and available for use throughout the application.
 *
 * Features:
 * - Transaction-based undo/redo with automatic batching of rapid edits
 * - Configurable batch threshold for grouping related changes
 * - Support for multiple isolated undo contexts via `createUndoRedoStore`
 * - Default global store instance via `useUndoRedoStore`
 *
 * @packageDocumentation
 */
import { invertTransaction, mergeTransactions, type Transaction } from '@bslt/shared';

import { createStore, type UseBoundStore } from './createStore';

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
 *
 * This factory function is part of the public API. Use it when you need:
 * - Multiple isolated undo/redo contexts (e.g., different editors)
 * - Custom batch thresholds for different use cases
 * - Testing with fresh store instances
 *
 * For most applications, use the default `useUndoRedoStore` instead.
 *
 * @param batchThresholdMs - Time window for batching rapid edits (default: 1200ms)
 * @returns A store hook for undo/redo state
 *
 * @example Creating an isolated undo context for a specific editor
 * ```typescript
 * // Create a dedicated undo store for a diagram editor
 * const useDiagramUndoRedo = createUndoRedoStore(500); // Faster batching
 *
 * function DiagramEditor() {
 *   const { push, undo, redo, canUndo, canRedo } = useDiagramUndoRedo();
 *
 *   const handleNodeMove = (nodeId: string, newPosition: Position) => {
 *     const transaction = createMoveTransaction(nodeId, oldPos, newPosition);
 *     push(transaction);
 *     applyTransaction(transaction);
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={undo} disabled={!canUndo()}>Undo</Button>
 *       <button onClick={redo} disabled={!canRedo()}>Redo</Button>
 *     </>
 *   );
 * }
 * ```
 *
 * @example Using in tests with fresh state
 * ```typescript
 * describe('UndoRedo', () => {
 *   it('should undo transaction', () => {
 *     const useStore = createUndoRedoStore();
 *     const { push, undo, canUndo } = useStore.getState();
 *
 *     push(testTransaction);
 *     expect(canUndo()).toBe(true);
 *
 *     const inverse = undo();
 *     expect(inverse).toBeDefined();
 *     expect(canUndo()).toBe(false);
 *   });
 * });
 * ```
 */
export function createUndoRedoStore(
  batchThresholdMs: number = BATCH_THRESHOLD_MS,
): UseBoundStore<UndoRedoState> {
  return createStore<UndoRedoState>((set, get) => ({
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
 *
 * This hook is part of the public API. Use it for application-wide undo/redo
 * functionality when you don't need isolated contexts.
 *
 * @example Basic undo/redo implementation
 * ```typescript
 * function Editor() {
 *   const { push, undo, redo, canUndo, canRedo } = useUndoRedoStore();
 *
 *   const handleChange = (change: Change) => {
 *     const transaction = createTransaction(change);
 *     push(transaction);
 *     applyChange(change);
 *   };
 *
 *   const handleUndo = () => {
 *     const inverse = undo();
 *     if (inverse) {
 *       applyTransaction(inverse);
 *     }
 *   };
 *
 *   const handleRedo = () => {
 *     const transaction = redo();
 *     if (transaction) {
 *       applyTransaction(transaction);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleUndo} disabled={!canUndo()}>Undo</Button>
 *       <button onClick={handleRedo} disabled={!canRedo()}>Redo</Button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Keyboard shortcuts
 * ```typescript
 * useEffect(() => {
 *   const handleKeyDown = (e: KeyboardEvent) => {
 *     if (e.metaKey || e.ctrlKey) {
 *       if (e.key === 'z' && !e.shiftKey && canUndo()) {
 *         e.preventDefault();
 *         handleUndo();
 *       } else if ((e.key === 'z' && e.shiftKey || e.key === 'y') && canRedo()) {
 *         e.preventDefault();
 *         handleRedo();
 *       }
 *     }
 *   };
 *   window.addEventListener('keydown', handleKeyDown);
 *   return () => window.removeEventListener('keydown', handleKeyDown);
 * }, [canUndo, canRedo, handleUndo, handleRedo]);
 * ```
 */
export const useUndoRedoStore = createUndoRedoStore();
