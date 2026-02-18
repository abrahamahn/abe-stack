// main/client/react/src/stores/index.ts
/**
 * Stores (merged into @bslt/react)
 *
 * Custom React hook-based stores for toast notifications and undo/redo functionality.
 */

export { createStore } from './createStore';
export type { StoreApi, UseBoundStore } from './createStore';

export { toastStore } from './toastStore';
export type { ToastMessage, ToastTone } from './toastStore';

export { createUndoRedoStore, useUndoRedoStore } from './undoRedoStore';
export type { UndoRedoState } from './undoRedoStore';

