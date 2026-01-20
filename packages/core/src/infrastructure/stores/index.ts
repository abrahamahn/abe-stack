// packages/core/src/infrastructure/stores/index.ts
/**
 * State Stores
 *
 * Zustand-based stores for toast notifications and undo/redo functionality.
 */

export { toastStore } from './toastStore';
export type { ToastMessage } from './toastStore';

export { createUndoRedoStore, useUndoRedoStore } from './undoRedoStore';
export type { UndoRedoState } from './undoRedoStore';
