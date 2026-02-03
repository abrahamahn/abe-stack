// client/src/undo/UndoRedoStack.ts
/**
 * Undo/Redo Stack
 *
 * A generic undo/redo stack implementation that:
 * - Tracks operations in an undo stack
 * - Supports redo stack for undone operations
 * - Clears redo stack when new operation is pushed
 * - Supports grouping operations (batch undo)
 * - Provides canUndo/canRedo state
 * - Emits state change notifications
 */

// ============================================================================
// Types
// ============================================================================

/**
 * A single undoable operation with forward and inverse actions.
 */
export interface UndoableOperation<T = unknown> {
  /** Unique identifier for this operation */
  id: string;
  /** The operation data */
  data: T;
  /** Optional group ID for batch undo/redo */
  groupId?: string;
  /** Timestamp when the operation was created */
  timestamp: number;
}

/**
 * A group of operations that should be undone/redone together.
 */
export interface OperationGroup<T = unknown> {
  /** Unique identifier for this group */
  groupId: string;
  /** Operations in this group (in order of execution) */
  operations: UndoableOperation<T>[];
  /** Timestamp when the group was created */
  timestamp: number;
}

/**
 * Current state of the undo/redo stack.
 */
export interface UndoRedoState {
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Number of items in the undo stack */
  undoCount: number;
  /** Number of items in the redo stack */
  redoCount: number;
  /** Current checkpoint version */
  checkpoint: number;
}

/**
 * Configuration options for UndoRedoStack.
 */
export interface UndoRedoStackOptions<T = unknown> {
  /** Maximum size of the undo stack (default: 100) */
  maxUndoSize?: number;
  /** Called when an operation needs to be undone */
  onUndo?: (operation: UndoableOperation<T>) => void;
  /** Called when an operation needs to be redone */
  onRedo?: (operation: UndoableOperation<T>) => void;
  /** Called when the state changes */
  onStateChange?: (state: UndoRedoState) => void;
}

// ============================================================================
// UndoRedoStack Class
// ============================================================================

const DEFAULT_MAX_UNDO_SIZE = 100;

/**
 * A generic undo/redo stack for tracking and reverting operations.
 *
 * @example
 * ```typescript
 * interface TextChange {
 *   oldText: string;
 *   newText: string;
 *   position: number;
 * }
 *
 * const undoStack = new UndoRedoStack<TextChange>({
 *   onUndo: (op) => {
 *     // Apply the inverse: restore old text
 *     editor.replaceText(op.data.position, op.data.newText.length, op.data.oldText);
 *   },
 *   onRedo: (op) => {
 *     // Apply the operation again
 *     editor.replaceText(op.data.position, op.data.oldText.length, op.data.newText);
 *   },
 *   onStateChange: (state) => {
 *     undoButton.disabled = !state.canUndo;
 *     redoButton.disabled = !state.canRedo;
 *   },
 * });
 *
 * // Push an operation after user makes a change
 * undoStack.push({
 *   oldText: 'Hello',
 *   newText: 'Hello World',
 *   position: 0,
 * });
 *
 * // Undo the last operation
 * undoStack.undo();
 *
 * // Redo the undone operation
 * undoStack.redo();
 * ```
 */
export class UndoRedoStack<T = unknown> {
  private undoStack: UndoableOperation<T>[] = [];
  private redoStack: UndoableOperation<T>[] = [];
  private checkpoint = 0;
  private activeGroupId: string | null = null;
  private readonly maxUndoSize: number;
  private readonly onUndo: (operation: UndoableOperation<T>) => void;
  private readonly onRedo: (operation: UndoableOperation<T>) => void;
  private readonly onStateChange: (state: UndoRedoState) => void;

  constructor(options: UndoRedoStackOptions<T> = {}) {
    this.maxUndoSize = options.maxUndoSize ?? DEFAULT_MAX_UNDO_SIZE;
    this.onUndo = options.onUndo ?? noop;
    this.onRedo = options.onRedo ?? noop;
    this.onStateChange = options.onStateChange ?? noop;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Push a new operation onto the undo stack.
   * This clears the redo stack.
   */
  push(data: T, groupId?: string): string {
    const finalGroupId = groupId ?? this.activeGroupId ?? undefined;
    const operation: UndoableOperation<T> = {
      id: this.generateId(),
      data,
      ...(finalGroupId !== undefined && { groupId: finalGroupId }),
      timestamp: Date.now(),
    };

    this.undoStack.push(operation);

    // Clear redo stack when new operation is pushed
    this.redoStack = [];

    // Enforce max size
    while (this.undoStack.length > this.maxUndoSize) {
      this.undoStack.shift();
    }

    this.checkpoint += 1;
    this.notifyStateChange();

    return operation.id;
  }

  /**
   * Undo the last operation (or group of operations).
   * Returns the undone operation(s), or null if nothing to undo.
   */
  undo(): UndoableOperation<T>[] | null {
    if (this.undoStack.length === 0) {
      return null;
    }

    // Get the last operation
    const lastOperation = this.undoStack[this.undoStack.length - 1];
    if (lastOperation === undefined) {
      return null;
    }

    // If it has a group ID, undo all operations in that group
    if (lastOperation.groupId !== undefined && lastOperation.groupId.length > 0) {
      return this.undoGroup(lastOperation.groupId);
    }

    // Undo single operation
    const operation = this.undoStack.pop();
    if (operation === undefined) {
      return null;
    }

    this.redoStack.push(operation);
    this.onUndo(operation);
    this.checkpoint += 1;
    this.notifyStateChange();

    return [operation];
  }

  /**
   * Redo the last undone operation (or group of operations).
   * Returns the redone operation(s), or null if nothing to redo.
   */
  redo(): UndoableOperation<T>[] | null {
    if (this.redoStack.length === 0) {
      return null;
    }

    // Get the last undone operation
    const lastOperation = this.redoStack[this.redoStack.length - 1];
    if (lastOperation === undefined) {
      return null;
    }

    // If it has a group ID, redo all operations in that group
    if (lastOperation.groupId !== undefined && lastOperation.groupId.length > 0) {
      return this.redoGroup(lastOperation.groupId);
    }

    // Redo single operation
    const operation = this.redoStack.pop();
    if (operation === undefined) {
      return null;
    }

    this.undoStack.push(operation);
    this.onRedo(operation);
    this.checkpoint += 1;
    this.notifyStateChange();

    return [operation];
  }

  /**
   * Start a group of operations that will be undone/redone together.
   * Returns the group ID.
   */
  beginGroup(groupId?: string): string {
    this.activeGroupId = groupId ?? this.generateId();
    return this.activeGroupId;
  }

  /**
   * End the current operation group.
   */
  endGroup(): void {
    this.activeGroupId = null;
  }

  /**
   * Execute a function within a group context.
   * All operations pushed during the function will be grouped.
   */
  withGroup<R>(fn: () => R, groupId?: string): R {
    this.beginGroup(groupId);
    try {
      return fn();
    } finally {
      this.endGroup();
    }
  }

  /**
   * Get the current state of the undo/redo stack.
   */
  getState(): UndoRedoState {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      checkpoint: this.checkpoint,
    };
  }

  /**
   * Check if undo is available.
   */
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available.
   */
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get the current checkpoint version.
   */
  getCheckpoint(): number {
    return this.checkpoint;
  }

  /**
   * Get all operations in the undo stack.
   */
  getUndoStack(): UndoableOperation<T>[] {
    return [...this.undoStack];
  }

  /**
   * Get all operations in the redo stack.
   */
  getRedoStack(): UndoableOperation<T>[] {
    return [...this.redoStack];
  }

  /**
   * Get the last operation in the undo stack without removing it.
   */
  peek(): UndoableOperation<T> | null {
    return this.undoStack[this.undoStack.length - 1] ?? null;
  }

  /**
   * Clear both undo and redo stacks.
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.activeGroupId = null;
    this.checkpoint += 1;
    this.notifyStateChange();
  }

  /**
   * Clear only the redo stack.
   */
  clearRedo(): void {
    this.redoStack = [];
    this.notifyStateChange();
  }

  /**
   * Reset to initial state including checkpoint.
   */
  reset(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.activeGroupId = null;
    this.checkpoint = 0;
    this.notifyStateChange();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Undo all operations with the given group ID.
   */
  private undoGroup(groupId: string): UndoableOperation<T>[] {
    const operations: UndoableOperation<T>[] = [];

    // Pop all operations with this group ID from the undo stack
    while (this.undoStack.length > 0) {
      const lastOp = this.undoStack[this.undoStack.length - 1];
      if (lastOp?.groupId !== groupId) {
        break;
      }

      const operation = this.undoStack.pop();
      if (operation !== undefined) {
        operations.push(operation);
        this.onUndo(operation);
      }
    }

    // Push to redo stack in reverse order (so redo applies in original order)
    for (let i = operations.length - 1; i >= 0; i--) {
      const op = operations[i];
      if (op !== undefined) {
        this.redoStack.push(op);
      }
    }

    this.checkpoint += 1;
    this.notifyStateChange();

    return operations;
  }

  /**
   * Redo all operations with the given group ID.
   */
  private redoGroup(groupId: string): UndoableOperation<T>[] {
    const operations: UndoableOperation<T>[] = [];

    // Pop all operations with this group ID from the redo stack
    while (this.redoStack.length > 0) {
      const lastOp = this.redoStack[this.redoStack.length - 1];
      if (lastOp?.groupId !== groupId) {
        break;
      }

      const operation = this.redoStack.pop();
      if (operation !== undefined) {
        operations.push(operation);
      }
    }

    // Reverse to get original execution order
    operations.reverse();

    // Call onRedo in original execution order and push to undo stack
    for (const op of operations) {
      this.onRedo(op);
      this.undoStack.push(op);
    }

    this.checkpoint += 1;
    this.notifyStateChange();

    return operations;
  }

  private notifyStateChange(): void {
    this.onStateChange(this.getState());
  }

  private generateId(): string {
    return `${String(Date.now())}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function noop(): void {
  // Intentionally empty
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create an UndoRedoStack instance.
 *
 * @example
 * ```typescript
 * import { createUndoRedoStack } from '@abe-stack/engine/undo';
 *
 * interface Command {
 *   type: 'add' | 'remove' | 'update';
 *   entityId: string;
 *   oldValue?: unknown;
 *   newValue?: unknown;
 * }
 *
 * const history = createUndoRedoStack<Command>({
 *   onUndo: (op) => {
 *     switch (op.data.type) {
 *       case 'add':
 *         store.remove(op.data.entityId);
 *         break;
 *       case 'remove':
 *         store.add(op.data.entityId, op.data.oldValue);
 *         break;
 *       case 'update':
 *         store.update(op.data.entityId, op.data.oldValue);
 *         break;
 *     }
 *   },
 *   onRedo: (op) => {
 *     switch (op.data.type) {
 *       case 'add':
 *         store.add(op.data.entityId, op.data.newValue);
 *         break;
 *       case 'remove':
 *         store.remove(op.data.entityId);
 *         break;
 *       case 'update':
 *         store.update(op.data.entityId, op.data.newValue);
 *         break;
 *     }
 *   },
 *   maxUndoSize: 50,
 * });
 *
 * // Push operations
 * history.push({ type: 'add', entityId: '1', newValue: { name: 'Item 1' } });
 *
 * // Group related operations
 * history.beginGroup();
 * history.push({ type: 'update', entityId: '1', oldValue: { name: 'Item 1' }, newValue: { name: 'Updated' } });
 * history.push({ type: 'add', entityId: '2', newValue: { name: 'Item 2' } });
 * history.endGroup();
 *
 * // Undo/redo
 * history.undo(); // Undoes both grouped operations
 * history.redo(); // Redoes both grouped operations
 * ```
 */
export function createUndoRedoStack<T = unknown>(
  options?: UndoRedoStackOptions<T>,
): UndoRedoStack<T> {
  return new UndoRedoStack<T>(options);
}
