// main/client/react/src/hooks/useUndoRedoController.ts
import { useCallback, useLayoutEffect, useRef } from 'react';

import { toastStore } from '../stores/toastStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';

import { useUndoRedoShortcuts } from './useUndoRedoShortcuts';

import type { Transaction } from '@bslt/shared';

/** Handler for applying undo/redo transactions. */
export interface UndoRedoHandler {
  /** Apply a transaction (forward or inverse) */
  apply: (tx: Transaction) => void | Promise<void>;
}

/** Options for useUndoRedoController. */
export interface UseUndoRedoControllerOptions {
  /** Handler for applying transactions */
  handler?: UndoRedoHandler;
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean;
  /** Skip inputs for keyboard shortcuts (default: true) */
  skipInputs?: boolean;
}

/** Result returned by useUndoRedoController. */
export interface UseUndoRedoControllerResult {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
}

/**
 * Integrates `undoRedoStore` with keyboard shortcuts and toast notifications.
 *
 * On undo: pops the undo stack, applies the inverse transaction via handler,
 * and shows a toast with a "Redo" action button.
 *
 * On redo: pops the redo stack, applies the transaction via handler,
 * and shows a confirmation toast.
 *
 * Keyboard shortcuts (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z) are automatically
 * registered when `enabled` is true.
 *
 * @example
 * ```typescript
 * const { undo, redo, canUndo, canRedo } = useUndoRedoController({
 *   handler: { apply: (tx) => applyTransactionToApi(tx) },
 * });
 * ```
 */
export function useUndoRedoController(
  options?: UseUndoRedoControllerOptions,
): UseUndoRedoControllerResult {
  const store = useUndoRedoStore();
  const handlerRef = useRef(options?.handler);
  useLayoutEffect(() => {
    handlerRef.current = options?.handler;
  });

  const canUndo = store.canUndo();
  const canRedo = store.canRedo();

  const handleRedo = useCallback((): void => {
    const tx = store.redo();
    if (tx !== undefined) {
      void handlerRef.current?.apply(tx);
      toastStore.getState().show({ title: 'Action redone', tone: 'info' });
    }
  }, [store]);

  const handleUndo = useCallback((): void => {
    const inverse = store.undo();
    if (inverse !== undefined) {
      void handlerRef.current?.apply(inverse);
      toastStore.getState().show({
        title: 'Action undone',
        tone: 'info',
        action: { label: 'Redo', onClick: handleRedo },
      });
    }
  }, [store, handleRedo]);

  useUndoRedoShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    canUndo,
    canRedo,
    skipInputs: options?.skipInputs ?? true,
    enabled: options?.enabled ?? true,
  });

  return {
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo,
    undoCount: store.undoStackSize(),
    redoCount: store.redoStackSize(),
  };
}
