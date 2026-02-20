// main/client/engine/src/__tests__/undo-redo-create-record.integration.test.ts
/**
 * Integration tests for UndoRedoStack with record creation/deletion.
 *
 * Tests the full flow: create record -> undo -> record removed from cache
 * -> redo -> record restored in cache.
 *
 * Uses the UndoRedoStack directly (not React hooks) with a real RecordCache
 * to verify state transitions through the undo/redo lifecycle.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RecordCache, type TableMap } from '../cache/RecordCache';
import { UndoRedoStack, type UndoableOperation, type UndoRedoState } from '../undo/UndoRedoStack';

// ============================================================================
// Test Types
// ============================================================================

interface Task {
  id: string;
  version: number;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  assigneeId: string | null;
}

interface Project {
  id: string;
  version: number;
  name: string;
  taskIds: string[];
}

interface TestTables extends TableMap {
  task: Task;
  project: Project;
}

/**
 * Represents an undoable record operation that can handle creates and deletes
 * in addition to updates.
 */
interface RecordOperation {
  type: 'create' | 'delete' | 'update';
  table: string;
  id: string;
  /** The record data for create/restore, or the field updates for update */
  record?: Record<string, unknown>;
  /** Previous values for update operations, or the full record for delete */
  previousRecord?: Record<string, unknown>;
}

// ============================================================================
// Test Helpers
// ============================================================================

interface CacheUndoRedoSystem {
  cache: RecordCache<TestTables>;
  undoStack: UndoRedoStack<RecordOperation>;
  stateChanges: UndoRedoState[];
  createRecord: <T extends keyof TestTables & string>(
    table: T,
    record: TestTables[T],
  ) => void;
  deleteRecord: <T extends keyof TestTables & string>(table: T, id: string) => void;
  updateRecord: <T extends keyof TestTables & string>(
    table: T,
    id: string,
    updates: Partial<TestTables[T]>,
  ) => void;
}

function createCacheUndoRedoSystem(): CacheUndoRedoSystem {
  const cache = new RecordCache<TestTables>();
  const stateChanges: UndoRedoState[] = [];

  const undoStack = new UndoRedoStack<RecordOperation>({
    maxUndoSize: 50,
    onUndo: (operation: UndoableOperation<RecordOperation>) => {
      const op = operation.data;

      switch (op.type) {
        case 'create': {
          // Undo a create = delete the record from cache
          cache.delete(op.table as keyof TestTables & string, op.id);
          break;
        }
        case 'delete': {
          // Undo a delete = restore the record into cache
          if (op.previousRecord !== undefined) {
            cache.set(
              op.table as keyof TestTables & string,
              op.id,
              op.previousRecord as TestTables[keyof TestTables & string],
              { force: true },
            );
          }
          break;
        }
        case 'update': {
          // Undo an update = restore previous field values
          if (op.previousRecord !== undefined) {
            const existing = cache.get(op.table as keyof TestTables & string, op.id);
            if (existing !== undefined) {
              cache.set(
                op.table as keyof TestTables & string,
                op.id,
                { ...existing, ...op.previousRecord } as TestTables[keyof TestTables & string],
                { force: true },
              );
            }
          }
          break;
        }
      }
    },
    onRedo: (operation: UndoableOperation<RecordOperation>) => {
      const op = operation.data;

      switch (op.type) {
        case 'create': {
          // Redo a create = re-add the record to cache
          if (op.record !== undefined) {
            cache.set(
              op.table as keyof TestTables & string,
              op.id,
              op.record as TestTables[keyof TestTables & string],
              { force: true },
            );
          }
          break;
        }
        case 'delete': {
          // Redo a delete = delete the record from cache again
          cache.delete(op.table as keyof TestTables & string, op.id);
          break;
        }
        case 'update': {
          // Redo an update = re-apply the field updates
          if (op.record !== undefined) {
            const existing = cache.get(op.table as keyof TestTables & string, op.id);
            if (existing !== undefined) {
              cache.set(
                op.table as keyof TestTables & string,
                op.id,
                { ...existing, ...op.record } as TestTables[keyof TestTables & string],
                { force: true },
              );
            }
          }
          break;
        }
      }
    },
    onStateChange: (state: UndoRedoState) => {
      stateChanges.push(state);
    },
  });

  const createRecord = <T extends keyof TestTables & string>(
    table: T,
    record: TestTables[T],
  ): void => {
    cache.set(table, record.id, record);
    undoStack.push({
      type: 'create',
      table,
      id: record.id,
      record: record as unknown as Record<string, unknown>,
    });
  };

  const deleteRecord = <T extends keyof TestTables & string>(table: T, id: string): void => {
    const existing = cache.get(table, id);
    if (existing !== undefined) {
      cache.delete(table, id);
      undoStack.push({
        type: 'delete',
        table,
        id,
        previousRecord: existing as unknown as Record<string, unknown>,
      });
    }
  };

  const updateRecord = <T extends keyof TestTables & string>(
    table: T,
    id: string,
    updates: Partial<TestTables[T]>,
  ): void => {
    const existing = cache.get(table, id);
    if (existing !== undefined) {
      // Capture previous values for the updated fields
      const previousRecord: Record<string, unknown> = {};
      for (const key of Object.keys(updates)) {
        previousRecord[key] = (existing as Record<string, unknown>)[key];
      }

      cache.set(table, id, { ...existing, ...updates } as TestTables[T], { force: true });
      undoStack.push({
        type: 'update',
        table,
        id,
        record: updates as Record<string, unknown>,
        previousRecord,
      });
    }
  };

  return { cache, undoStack, stateChanges, createRecord, deleteRecord, updateRecord };
}

// ============================================================================
// Tests
// ============================================================================

describe('UndoRedoStack — create record integration', () => {
  let system: CacheUndoRedoSystem;

  beforeEach(() => {
    system = createCacheUndoRedoSystem();
  });

  afterEach(() => {
    system.cache.reset();
    system.undoStack.reset();
  });

  // ==========================================================================
  // Core flow: create -> undo -> redo
  // ==========================================================================

  describe('create -> undo -> redo lifecycle', () => {
    it('should remove record from cache on undo of create, then restore on redo', () => {
      const { cache, undoStack, createRecord } = system;

      const task: Task = {
        id: 'task-1',
        version: 1,
        title: 'Write integration tests',
        status: 'todo',
        assigneeId: null,
      };

      // Step 1: Create record
      createRecord('task', task);
      expect(cache.get('task', 'task-1')).toEqual(task);
      expect(cache.has('task', 'task-1')).toBe(true);
      expect(undoStack.canUndo).toBe(true);
      expect(undoStack.canRedo).toBe(false);

      // Step 2: Undo -> record removed from cache
      undoStack.undo();
      expect(cache.get('task', 'task-1')).toBeUndefined();
      expect(cache.has('task', 'task-1')).toBe(false);
      expect(undoStack.canUndo).toBe(false);
      expect(undoStack.canRedo).toBe(true);

      // Step 3: Redo -> record restored in cache
      undoStack.redo();
      expect(cache.get('task', 'task-1')).toEqual(task);
      expect(cache.has('task', 'task-1')).toBe(true);
      expect(undoStack.canUndo).toBe(true);
      expect(undoStack.canRedo).toBe(false);
    });

    it('should preserve all record fields through undo/redo cycle', () => {
      const { cache, undoStack, createRecord } = system;

      const task: Task = {
        id: 'task-2',
        version: 1,
        title: 'Complex task',
        status: 'in_progress',
        assigneeId: 'user-42',
      };

      createRecord('task', task);
      undoStack.undo();
      undoStack.redo();

      const restored = cache.get('task', 'task-2');
      expect(restored).toBeDefined();
      expect(restored?.id).toBe('task-2');
      expect(restored?.version).toBe(1);
      expect(restored?.title).toBe('Complex task');
      expect(restored?.status).toBe('in_progress');
      expect(restored?.assigneeId).toBe('user-42');
    });

    it('should handle multiple undo/redo cycles on the same create', () => {
      const { cache, undoStack, createRecord } = system;

      const task: Task = {
        id: 'task-3',
        version: 1,
        title: 'Cycled task',
        status: 'todo',
        assigneeId: null,
      };

      createRecord('task', task);

      // Cycle 1
      undoStack.undo();
      expect(cache.has('task', 'task-3')).toBe(false);
      undoStack.redo();
      expect(cache.has('task', 'task-3')).toBe(true);

      // Cycle 2
      undoStack.undo();
      expect(cache.has('task', 'task-3')).toBe(false);
      undoStack.redo();
      expect(cache.has('task', 'task-3')).toBe(true);

      // Cycle 3
      undoStack.undo();
      expect(cache.has('task', 'task-3')).toBe(false);
      undoStack.redo();
      expect(cache.get('task', 'task-3')).toEqual(task);
    });
  });

  // ==========================================================================
  // Multiple record creates
  // ==========================================================================

  describe('multiple record creates', () => {
    it('should undo creates in LIFO order', () => {
      const { cache, undoStack, createRecord } = system;

      const task1: Task = {
        id: 'task-1',
        version: 1,
        title: 'Task 1',
        status: 'todo',
        assigneeId: null,
      };
      const task2: Task = {
        id: 'task-2',
        version: 1,
        title: 'Task 2',
        status: 'todo',
        assigneeId: null,
      };
      const task3: Task = {
        id: 'task-3',
        version: 1,
        title: 'Task 3',
        status: 'todo',
        assigneeId: null,
      };

      createRecord('task', task1);
      createRecord('task', task2);
      createRecord('task', task3);

      expect(cache.has('task', 'task-1')).toBe(true);
      expect(cache.has('task', 'task-2')).toBe(true);
      expect(cache.has('task', 'task-3')).toBe(true);

      // Undo last create
      undoStack.undo();
      expect(cache.has('task', 'task-1')).toBe(true);
      expect(cache.has('task', 'task-2')).toBe(true);
      expect(cache.has('task', 'task-3')).toBe(false);

      // Undo second create
      undoStack.undo();
      expect(cache.has('task', 'task-1')).toBe(true);
      expect(cache.has('task', 'task-2')).toBe(false);
      expect(cache.has('task', 'task-3')).toBe(false);

      // Undo first create
      undoStack.undo();
      expect(cache.has('task', 'task-1')).toBe(false);
      expect(cache.has('task', 'task-2')).toBe(false);
      expect(cache.has('task', 'task-3')).toBe(false);
    });

    it('should redo creates in FIFO order', () => {
      const { cache, undoStack, createRecord } = system;

      const task1: Task = {
        id: 'task-1',
        version: 1,
        title: 'Task 1',
        status: 'todo',
        assigneeId: null,
      };
      const task2: Task = {
        id: 'task-2',
        version: 1,
        title: 'Task 2',
        status: 'todo',
        assigneeId: null,
      };

      createRecord('task', task1);
      createRecord('task', task2);

      // Undo all
      undoStack.undo();
      undoStack.undo();

      expect(cache.has('task', 'task-1')).toBe(false);
      expect(cache.has('task', 'task-2')).toBe(false);

      // Redo first
      undoStack.redo();
      expect(cache.has('task', 'task-1')).toBe(true);
      expect(cache.has('task', 'task-2')).toBe(false);

      // Redo second
      undoStack.redo();
      expect(cache.has('task', 'task-1')).toBe(true);
      expect(cache.has('task', 'task-2')).toBe(true);
    });
  });

  // ==========================================================================
  // Delete -> undo -> redo
  // ==========================================================================

  describe('delete -> undo -> redo lifecycle', () => {
    it('should restore record to cache on undo of delete, then remove on redo', () => {
      const { cache, undoStack, deleteRecord } = system;

      const task: Task = {
        id: 'task-1',
        version: 1,
        title: 'Existing task',
        status: 'done',
        assigneeId: 'user-1',
      };

      // Pre-populate cache
      cache.set('task', task.id, task);
      expect(cache.has('task', 'task-1')).toBe(true);

      // Delete
      deleteRecord('task', 'task-1');
      expect(cache.has('task', 'task-1')).toBe(false);

      // Undo delete -> record restored
      undoStack.undo();
      expect(cache.get('task', 'task-1')).toEqual(task);

      // Redo delete -> record removed again
      undoStack.redo();
      expect(cache.has('task', 'task-1')).toBe(false);
    });
  });

  // ==========================================================================
  // Mixed operations: create, update, then undo/redo
  // ==========================================================================

  describe('create -> update -> undo -> redo', () => {
    it('should undo update first, then undo create', () => {
      const { cache, undoStack, createRecord, updateRecord } = system;

      const task: Task = {
        id: 'task-1',
        version: 1,
        title: 'New task',
        status: 'todo',
        assigneeId: null,
      };

      // Create
      createRecord('task', task);
      expect(cache.get('task', 'task-1')?.title).toBe('New task');

      // Update
      updateRecord('task', 'task-1', { title: 'Updated task', status: 'in_progress' });
      expect(cache.get('task', 'task-1')?.title).toBe('Updated task');
      expect(cache.get('task', 'task-1')?.status).toBe('in_progress');

      // Undo update -> back to original values
      undoStack.undo();
      expect(cache.get('task', 'task-1')?.title).toBe('New task');
      expect(cache.get('task', 'task-1')?.status).toBe('todo');

      // Undo create -> record removed
      undoStack.undo();
      expect(cache.has('task', 'task-1')).toBe(false);

      // Redo create -> record restored
      undoStack.redo();
      expect(cache.get('task', 'task-1')).toEqual(task);

      // Redo update -> updates re-applied
      undoStack.redo();
      expect(cache.get('task', 'task-1')?.title).toBe('Updated task');
      expect(cache.get('task', 'task-1')?.status).toBe('in_progress');
    });
  });

  // ==========================================================================
  // Cross-table operations
  // ==========================================================================

  describe('cross-table create -> undo -> redo', () => {
    it('should handle creates across different tables', () => {
      const { cache, undoStack, createRecord } = system;

      const project: Project = {
        id: 'proj-1',
        version: 1,
        name: 'Sprint 6',
        taskIds: ['task-1'],
      };

      const task: Task = {
        id: 'task-1',
        version: 1,
        title: 'Undo/redo test',
        status: 'todo',
        assigneeId: null,
      };

      // Create both records
      createRecord('project', project);
      createRecord('task', task);

      expect(cache.has('project', 'proj-1')).toBe(true);
      expect(cache.has('task', 'task-1')).toBe(true);

      // Undo task create
      undoStack.undo();
      expect(cache.has('project', 'proj-1')).toBe(true);
      expect(cache.has('task', 'task-1')).toBe(false);

      // Undo project create
      undoStack.undo();
      expect(cache.has('project', 'proj-1')).toBe(false);
      expect(cache.has('task', 'task-1')).toBe(false);

      // Redo project create
      undoStack.redo();
      expect(cache.get('project', 'proj-1')).toEqual(project);
      expect(cache.has('task', 'task-1')).toBe(false);

      // Redo task create
      undoStack.redo();
      expect(cache.get('project', 'proj-1')).toEqual(project);
      expect(cache.get('task', 'task-1')).toEqual(task);
    });
  });

  // ==========================================================================
  // Redo cleared by new operation
  // ==========================================================================

  describe('redo cleared by new operation after undo', () => {
    it('should discard redo when a new create is pushed after undo', () => {
      const { cache, undoStack, createRecord } = system;

      const task1: Task = {
        id: 'task-1',
        version: 1,
        title: 'Task 1',
        status: 'todo',
        assigneeId: null,
      };
      const task2: Task = {
        id: 'task-2',
        version: 1,
        title: 'Task 2',
        status: 'todo',
        assigneeId: null,
      };

      createRecord('task', task1);
      undoStack.undo();
      expect(undoStack.canRedo).toBe(true);

      // New operation clears redo
      createRecord('task', task2);
      expect(undoStack.canRedo).toBe(false);

      // Can only undo the second create, not redo the first
      expect(cache.has('task', 'task-1')).toBe(false);
      expect(cache.has('task', 'task-2')).toBe(true);

      undoStack.undo();
      expect(cache.has('task', 'task-2')).toBe(false);
      expect(undoStack.canUndo).toBe(false);
    });
  });

  // ==========================================================================
  // State transitions and callbacks
  // ==========================================================================

  describe('state tracking through create lifecycle', () => {
    it('should emit correct state changes through create -> undo -> redo', () => {
      const { undoStack, stateChanges, createRecord } = system;

      const task: Task = {
        id: 'task-1',
        version: 1,
        title: 'Test',
        status: 'todo',
        assigneeId: null,
      };

      const initialLength = stateChanges.length;

      // Create
      createRecord('task', task);
      expect(stateChanges[initialLength]).toEqual(
        expect.objectContaining({
          canUndo: true,
          canRedo: false,
          undoCount: 1,
          redoCount: 0,
        }),
      );

      // Undo
      undoStack.undo();
      expect(stateChanges[initialLength + 1]).toEqual(
        expect.objectContaining({
          canUndo: false,
          canRedo: true,
          undoCount: 0,
          redoCount: 1,
        }),
      );

      // Redo
      undoStack.redo();
      expect(stateChanges[initialLength + 2]).toEqual(
        expect.objectContaining({
          canUndo: true,
          canRedo: false,
          undoCount: 1,
          redoCount: 0,
        }),
      );
    });

    it('should increment checkpoint on each create, undo, and redo', () => {
      const { undoStack, createRecord } = system;

      const cp0 = undoStack.getCheckpoint();

      createRecord('task', {
        id: 'task-1',
        version: 1,
        title: 'Test',
        status: 'todo',
        assigneeId: null,
      });
      expect(undoStack.getCheckpoint()).toBe(cp0 + 1);

      undoStack.undo();
      expect(undoStack.getCheckpoint()).toBe(cp0 + 2);

      undoStack.redo();
      expect(undoStack.getCheckpoint()).toBe(cp0 + 3);
    });
  });

  // ==========================================================================
  // Grouped create operations
  // ==========================================================================

  describe('grouped create operations', () => {
    it('should undo/redo grouped creates atomically', () => {
      const { cache, undoStack, createRecord } = system;

      // Group multiple creates (e.g., creating a project with its initial tasks)
      undoStack.beginGroup();

      createRecord('project', {
        id: 'proj-1',
        version: 1,
        name: 'Sprint 6',
        taskIds: ['task-1', 'task-2'],
      });
      createRecord('task', {
        id: 'task-1',
        version: 1,
        title: 'Task A',
        status: 'todo',
        assigneeId: null,
      });
      createRecord('task', {
        id: 'task-2',
        version: 1,
        title: 'Task B',
        status: 'todo',
        assigneeId: null,
      });

      undoStack.endGroup();

      expect(cache.has('project', 'proj-1')).toBe(true);
      expect(cache.has('task', 'task-1')).toBe(true);
      expect(cache.has('task', 'task-2')).toBe(true);

      // Undo all grouped creates at once
      undoStack.undo();

      expect(cache.has('project', 'proj-1')).toBe(false);
      expect(cache.has('task', 'task-1')).toBe(false);
      expect(cache.has('task', 'task-2')).toBe(false);

      // Redo all grouped creates at once
      undoStack.redo();

      expect(cache.has('project', 'proj-1')).toBe(true);
      expect(cache.has('task', 'task-1')).toBe(true);
      expect(cache.has('task', 'task-2')).toBe(true);
    });
  });

  // ==========================================================================
  // Edge cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle undo on empty stack gracefully', () => {
      const { undoStack } = system;

      const result = undoStack.undo();
      expect(result).toBeNull();
      expect(undoStack.canUndo).toBe(false);
    });

    it('should handle redo on empty stack gracefully', () => {
      const { undoStack } = system;

      const result = undoStack.redo();
      expect(result).toBeNull();
      expect(undoStack.canRedo).toBe(false);
    });

    it('should handle create -> undo -> create same id -> undo -> redo', () => {
      const { cache, undoStack, createRecord } = system;

      const taskV1: Task = {
        id: 'task-1',
        version: 1,
        title: 'Version 1',
        status: 'todo',
        assigneeId: null,
      };

      // Create, then undo
      createRecord('task', taskV1);
      undoStack.undo();
      expect(cache.has('task', 'task-1')).toBe(false);

      // Create same ID with different data (redo stack cleared)
      const taskV2: Task = {
        id: 'task-1',
        version: 2,
        title: 'Version 2',
        status: 'in_progress',
        assigneeId: 'user-1',
      };

      createRecord('task', taskV2);
      expect(cache.get('task', 'task-1')?.title).toBe('Version 2');
      expect(undoStack.canRedo).toBe(false);

      // Undo the second create
      undoStack.undo();
      expect(cache.has('task', 'task-1')).toBe(false);

      // Redo the second create
      undoStack.redo();
      expect(cache.get('task', 'task-1')?.title).toBe('Version 2');
      expect(cache.get('task', 'task-1')?.status).toBe('in_progress');
    });

    it('should correctly track undo/redo stacks through create and delete sequence', () => {
      const { cache, undoStack, createRecord, deleteRecord } = system;

      const task: Task = {
        id: 'task-1',
        version: 1,
        title: 'Created then deleted',
        status: 'todo',
        assigneeId: null,
      };

      // Create then delete
      createRecord('task', task);
      deleteRecord('task', 'task-1');
      expect(cache.has('task', 'task-1')).toBe(false);
      expect(undoStack.getState().undoCount).toBe(2);

      // Undo delete -> record restored
      undoStack.undo();
      expect(cache.get('task', 'task-1')).toEqual(task);
      expect(undoStack.getState().undoCount).toBe(1);

      // Undo create -> record removed
      undoStack.undo();
      expect(cache.has('task', 'task-1')).toBe(false);
      expect(undoStack.getState().undoCount).toBe(0);

      // Redo create -> record restored
      undoStack.redo();
      expect(cache.get('task', 'task-1')).toEqual(task);

      // Redo delete -> record removed
      undoStack.redo();
      expect(cache.has('task', 'task-1')).toBe(false);
    });
  });
});
