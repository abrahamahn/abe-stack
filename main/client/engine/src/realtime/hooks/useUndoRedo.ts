// main/client/engine/src/realtime/hooks/useUndoRedo.ts
/**
 * useUndoRedo - React hook wrapping UndoRedoStack for the real-time context.
 *
 * Integrates with useWrite for executing undo/redo operations.
 * Provides `{ undo, redo, canUndo, canRedo }`.
 */

import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// Types — inline to avoid cross-package resolution issues at lint time
// ============================================================================

/** Snapshot of the undo/redo stack state. */
interface UndoRedoSnapshot {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
}

/** Minimal interface for the UndoRedoStack. */
interface UndoRedoStackLike {
  getState(): UndoRedoSnapshot;
  getCheckpoint(): number;
  undo(): void;
  redo(): void;
}

/** Return value of the useUndoRedo hook. */
export interface UseUndoRedoResult {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
}

/** Dependencies injected into useUndoRedo. */
export interface UseUndoRedoDeps<_TState = unknown> {
  undoRedoStack: UndoRedoStackLike;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * React hook wrapping UndoRedoStack for the real-time context.
 *
 * @param deps - Injected dependencies (undoRedoStack)
 */
export function useUndoRedo(deps: UseUndoRedoDeps): UseUndoRedoResult {
  const { undoRedoStack } = deps;

  const [state, setState] = useState<UndoRedoSnapshot>(() => undoRedoStack.getState());

  // Poll for stack state changes (every 50ms)
  useEffect(() => {
    let lastCheckpoint: number = undoRedoStack.getCheckpoint();

    const checkForChanges = (): void => {
      const currentCheckpoint: number = undoRedoStack.getCheckpoint();
      if (currentCheckpoint !== lastCheckpoint) {
        lastCheckpoint = currentCheckpoint;
        setState(undoRedoStack.getState());
      }
    };

    const intervalId: ReturnType<typeof setInterval> = setInterval(checkForChanges, 50);
    setState(undoRedoStack.getState());

    return (): void => {
      clearInterval(intervalId);
    };
  }, [undoRedoStack]);

  const undo = useCallback((): void => {
    undoRedoStack.undo();
    setState(undoRedoStack.getState());
  }, [undoRedoStack]);

  const redo = useCallback((): void => {
    undoRedoStack.redo();
    setState(undoRedoStack.getState());
  }, [undoRedoStack]);

  return {
    undo,
    redo,
    canUndo: state.canUndo,
    canRedo: state.canRedo,
    undoCount: state.undoCount,
    redoCount: state.redoCount,
  };
}
