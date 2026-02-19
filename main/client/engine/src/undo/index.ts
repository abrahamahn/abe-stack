// main/client/engine/src/undo/index.ts
export { createUndoRedoStack, UndoRedoStack } from './UndoRedoStack';
export type {
  OperationGroup,
  UndoableOperation,
  UndoRedoStackOptions,
  UndoRedoState,
} from './UndoRedoStack';
