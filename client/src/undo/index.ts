// client/src/undo/index.ts
/**
 * Undo/Redo Stack
 *
 * Provides a generic undo/redo stack for tracking and reverting operations.
 * Supports grouping operations for batch undo/redo.
 */

export {
    UndoRedoStack,
    createUndoRedoStack, type OperationGroup, type UndoRedoStackOptions, type UndoRedoState, type UndoableOperation
} from './UndoRedoStack';

