// packages/sdk/src/undo/index.ts
/**
 * Undo/Redo Stack
 *
 * Provides a generic undo/redo stack for tracking and reverting operations.
 * Supports grouping operations for batch undo/redo.
 */

export {
  UndoRedoStack,
  createUndoRedoStack,
  type UndoableOperation,
  type OperationGroup,
  type UndoRedoState,
  type UndoRedoStackOptions,
} from './UndoRedoStack';
