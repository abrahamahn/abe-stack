// packages/sdk/src/__tests__/integration/undo-redo-operations.integration.test.ts
/**
 * Integration tests for UndoRedoStack with actual operations.
 *
 * Tests undo/redo functionality coordinated with RecordCache updates.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RecordCache, type TableMap } from '../../cache/RecordCache';
import {
  UndoRedoStack,
  type UndoableOperation,
  type UndoRedoState,
} from '../../undo/UndoRedoStack';

// ============================================================================
// Test Types
// ============================================================================

interface User {
  id: string;
  version: number;
  name: string;
  email: string;
  bio: string;
}

interface Post {
  id: string;
  version: number;
  title: string;
  content: string;
  authorId: string;
}

interface TestTables extends TableMap {
  user: User;
  post: Post;
}

/**
 * Represents an undoable write operation.
 */
interface UndoableWrite {
  operations: Array<{ table: string; id: string; updates: Record<string, unknown> }>;
  previousValues: Array<Record<string, unknown> | undefined>;
}

// ============================================================================
// Test Helpers
// ============================================================================

interface UndoRedoSystem {
  cache: RecordCache<TestTables>;
  undoStack: UndoRedoStack<UndoableWrite>;
  stateChanges: UndoRedoState[];
  write: (
    operations: Array<{
      table: keyof TestTables & string;
      id: string;
      updates: Partial<TestTables[keyof TestTables]>;
    }>,
    skipUndo?: boolean,
  ) => void;
}

function createUndoRedoSystem(): UndoRedoSystem {
  const cache = new RecordCache<TestTables>();
  const stateChanges: UndoRedoState[] = [];

  const undoStack = new UndoRedoStack<UndoableWrite>({
    maxUndoSize: 50,
    onUndo: (operation: UndoableOperation<UndoableWrite>) => {
      // Restore previous values
      const { operations: ops, previousValues } = operation.data;
      for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        const prevValue = previousValues[i];
        if (op && prevValue !== undefined) {
          // op.table is 'user' | 'post' which are valid TestTables keys
          const existing = cache.get(op.table as 'user' | 'post', op.id);
          if (existing) {
            cache.set(
              op.table as 'user' | 'post',
              op.id,
              { ...existing, ...prevValue },
              { force: true },
            );
          }
        }
      }
    },
    onRedo: (operation: UndoableOperation<UndoableWrite>) => {
      // Re-apply the operations
      const { operations: ops } = operation.data;
      for (const op of ops) {
        // op.table is 'user' | 'post' which are valid TestTables keys
        const existing = cache.get(op.table as 'user' | 'post', op.id);
        if (existing) {
          cache.set(
            op.table as 'user' | 'post',
            op.id,
            { ...existing, ...op.updates },
            { force: true },
          );
        }
      }
    },
    onStateChange: (state: UndoRedoState) => {
      stateChanges.push(state);
    },
  });

  const write = (
    operations: Array<{
      table: keyof TestTables & string;
      id: string;
      updates: Partial<TestTables[keyof TestTables]>;
    }>,
    skipUndo = false,
  ): void => {
    const previousValues: Array<Record<string, unknown> | undefined> = [];

    // Apply updates and capture previous values
    for (const op of operations) {
      const existing = cache.get(op.table, op.id) as Record<string, unknown> | undefined;

      if (existing) {
        const prevValue: Record<string, unknown> = {};
        for (const key of Object.keys(op.updates)) {
          prevValue[key] = existing[key];
        }
        previousValues.push(prevValue);

        const updated = { ...existing, ...op.updates } as TestTables[typeof op.table];
        cache.set(op.table, op.id, updated, { force: true });
      } else {
        previousValues.push(undefined);
      }
    }

    if (!skipUndo && operations.length > 0) {
      undoStack.push({
        operations: operations.map((op) => ({
          table: op.table,
          id: op.id,
          updates: op.updates as Record<string, unknown>,
        })),
        previousValues,
      });
    }
  };

  return { cache, undoStack, stateChanges, write };
}

// ============================================================================
// Tests
// ============================================================================

describe('UndoRedoStack with Operations Integration', () => {
  let system: UndoRedoSystem;

  beforeEach(() => {
    system = createUndoRedoSystem();
  });

  afterEach(() => {
    system.cache.reset();
    system.undoStack.reset();
  });

  describe('basic undo/redo', () => {
    it('should undo a single field update', () => {
      const { cache, undoStack, write } = system;

      // Initial data
      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com', bio: '' };
      cache.set('user', user.id, user);

      // Update name
      write([{ table: 'user', id: 'u1', updates: { name: 'Alice Updated' } }]);
      expect(cache.get('user', 'u1')?.name).toBe('Alice Updated');

      // Undo
      undoStack.undo();
      expect(cache.get('user', 'u1')?.name).toBe('Alice');
    });

    it('should redo an undone update', () => {
      const { cache, undoStack, write } = system;

      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com', bio: '' };
      cache.set('user', user.id, user);

      write([{ table: 'user', id: 'u1', updates: { name: 'Alice Updated' } }]);
      expect(cache.get('user', 'u1')?.name).toBe('Alice Updated');

      undoStack.undo();
      expect(cache.get('user', 'u1')?.name).toBe('Alice');

      // Redo
      undoStack.redo();
      expect(cache.get('user', 'u1')?.name).toBe('Alice Updated');
    });

    it('should update multiple fields in a single operation', () => {
      const { cache, undoStack, write } = system;

      const user: User = {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'alice@test.com',
        bio: 'Original bio',
      };
      cache.set('user', user.id, user);

      write([{ table: 'user', id: 'u1', updates: { name: 'Alice New', bio: 'New bio' } }]);

      expect(cache.get('user', 'u1')?.name).toBe('Alice New');
      expect(cache.get('user', 'u1')?.bio).toBe('New bio');

      undoStack.undo();

      expect(cache.get('user', 'u1')?.name).toBe('Alice');
      expect(cache.get('user', 'u1')?.bio).toBe('Original bio');
    });
  });

  describe('multiple operations', () => {
    it('should undo operations in LIFO order', () => {
      const { cache, undoStack, write } = system;

      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com', bio: '' };
      cache.set('user', user.id, user);

      write([{ table: 'user', id: 'u1', updates: { name: 'Update 1' } }]);
      write([{ table: 'user', id: 'u1', updates: { name: 'Update 2' } }]);
      write([{ table: 'user', id: 'u1', updates: { name: 'Update 3' } }]);

      expect(cache.get('user', 'u1')?.name).toBe('Update 3');

      undoStack.undo();
      expect(cache.get('user', 'u1')?.name).toBe('Update 2');

      undoStack.undo();
      expect(cache.get('user', 'u1')?.name).toBe('Update 1');

      undoStack.undo();
      expect(cache.get('user', 'u1')?.name).toBe('Alice');
    });

    it('should redo operations in FIFO order', () => {
      const { cache, undoStack, write } = system;

      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com', bio: '' };
      cache.set('user', user.id, user);

      write([{ table: 'user', id: 'u1', updates: { name: 'Update 1' } }]);
      write([{ table: 'user', id: 'u1', updates: { name: 'Update 2' } }]);
      write([{ table: 'user', id: 'u1', updates: { name: 'Update 3' } }]);

      // Undo all
      undoStack.undo();
      undoStack.undo();
      undoStack.undo();

      expect(cache.get('user', 'u1')?.name).toBe('Alice');

      // Redo in order
      undoStack.redo();
      expect(cache.get('user', 'u1')?.name).toBe('Update 1');

      undoStack.redo();
      expect(cache.get('user', 'u1')?.name).toBe('Update 2');

      undoStack.redo();
      expect(cache.get('user', 'u1')?.name).toBe('Update 3');
    });

    it('should clear redo stack on new operation', () => {
      const { cache, undoStack, write } = system;

      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com', bio: '' };
      cache.set('user', user.id, user);

      write([{ table: 'user', id: 'u1', updates: { name: 'Update 1' } }]);
      write([{ table: 'user', id: 'u1', updates: { name: 'Update 2' } }]);

      // Undo once
      undoStack.undo();
      expect(cache.get('user', 'u1')?.name).toBe('Update 1');
      expect(undoStack.canRedo).toBe(true);

      // New operation clears redo
      write([{ table: 'user', id: 'u1', updates: { name: 'New Update' } }]);

      expect(undoStack.canRedo).toBe(false);
      expect(cache.get('user', 'u1')?.name).toBe('New Update');
    });
  });

  describe('multi-record operations', () => {
    it('should undo updates to multiple records atomically', () => {
      const { cache, undoStack, write } = system;

      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com', bio: '' };
      const post: Post = {
        id: 'p1',
        version: 1,
        title: 'Original Title',
        content: '',
        authorId: 'u1',
      };

      cache.set('user', user.id, user);
      cache.set('post', post.id, post);

      // Atomic update across records
      write([
        { table: 'user', id: 'u1', updates: { name: 'Alice Updated' } },
        { table: 'post', id: 'p1', updates: { title: 'Updated Title' } },
      ]);

      expect(cache.get('user', 'u1')?.name).toBe('Alice Updated');
      expect(cache.get('post', 'p1')?.title).toBe('Updated Title');

      // Undo should restore both
      undoStack.undo();

      expect(cache.get('user', 'u1')?.name).toBe('Alice');
      expect(cache.get('post', 'p1')?.title).toBe('Original Title');
    });

    it('should redo updates to multiple records atomically', () => {
      const { cache, undoStack, write } = system;

      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'a@test.com',
        bio: '',
      });
      cache.set('post', 'p1', {
        id: 'p1',
        version: 1,
        title: 'Original',
        content: '',
        authorId: 'u1',
      });

      write([
        { table: 'user', id: 'u1', updates: { name: 'Alice Updated' } },
        { table: 'post', id: 'p1', updates: { title: 'Updated Title' } },
      ]);

      undoStack.undo();
      undoStack.redo();

      expect(cache.get('user', 'u1')?.name).toBe('Alice Updated');
      expect(cache.get('post', 'p1')?.title).toBe('Updated Title');
    });
  });

  describe('grouped operations', () => {
    it('should undo grouped operations together', () => {
      const { cache, undoStack, write } = system;

      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com', bio: '' };
      cache.set('user', user.id, user);

      // Start group
      const _groupId = undoStack.beginGroup();

      write([{ table: 'user', id: 'u1', updates: { name: 'Step 1' } }]);
      write([{ table: 'user', id: 'u1', updates: { email: 'step2@test.com' } }]);
      write([{ table: 'user', id: 'u1', updates: { bio: 'Step 3' } }]);

      undoStack.endGroup();

      expect(cache.get('user', 'u1')?.name).toBe('Step 1');
      expect(cache.get('user', 'u1')?.email).toBe('step2@test.com');
      expect(cache.get('user', 'u1')?.bio).toBe('Step 3');

      // Undo all grouped operations at once
      undoStack.undo();

      expect(cache.get('user', 'u1')?.name).toBe('Alice');
      expect(cache.get('user', 'u1')?.email).toBe('alice@test.com');
      expect(cache.get('user', 'u1')?.bio).toBe('');
    });

    it('should redo grouped operations together', () => {
      const { cache, undoStack, write } = system;

      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'alice@test.com',
        bio: '',
      });

      undoStack.beginGroup();
      write([{ table: 'user', id: 'u1', updates: { name: 'Step 1' } }]);
      write([{ table: 'user', id: 'u1', updates: { email: 'step2@test.com' } }]);
      undoStack.endGroup();

      undoStack.undo();

      expect(cache.get('user', 'u1')?.name).toBe('Alice');
      expect(cache.get('user', 'u1')?.email).toBe('alice@test.com');

      undoStack.redo();

      expect(cache.get('user', 'u1')?.name).toBe('Step 1');
      expect(cache.get('user', 'u1')?.email).toBe('step2@test.com');
    });

    it('should handle withGroup helper', () => {
      const { cache, undoStack, write } = system;

      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'alice@test.com',
        bio: '',
      });

      undoStack.withGroup(() => {
        write([{ table: 'user', id: 'u1', updates: { name: 'Grouped 1' } }]);
        write([{ table: 'user', id: 'u1', updates: { email: 'grouped@test.com' } }]);
      });

      expect(cache.get('user', 'u1')?.name).toBe('Grouped 1');

      undoStack.undo();

      expect(cache.get('user', 'u1')?.name).toBe('Alice');
      expect(cache.get('user', 'u1')?.email).toBe('alice@test.com');
    });
  });

  describe('state tracking', () => {
    it('should track canUndo correctly', () => {
      const { cache, undoStack, write } = system;

      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'a@test.com',
        bio: '',
      });

      expect(undoStack.canUndo).toBe(false);

      write([{ table: 'user', id: 'u1', updates: { name: 'Update' } }]);
      expect(undoStack.canUndo).toBe(true);

      undoStack.undo();
      expect(undoStack.canUndo).toBe(false);
    });

    it('should track canRedo correctly', () => {
      const { cache, undoStack, write } = system;

      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'a@test.com',
        bio: '',
      });

      expect(undoStack.canRedo).toBe(false);

      write([{ table: 'user', id: 'u1', updates: { name: 'Update' } }]);
      expect(undoStack.canRedo).toBe(false);

      undoStack.undo();
      expect(undoStack.canRedo).toBe(true);

      undoStack.redo();
      expect(undoStack.canRedo).toBe(false);
    });

    it('should notify state changes', () => {
      const { cache, stateChanges, write } = system;

      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'a@test.com',
        bio: '',
      });

      write([{ table: 'user', id: 'u1', updates: { name: 'Update' } }]);

      expect(stateChanges.length).toBeGreaterThan(0);
      const lastState = stateChanges[stateChanges.length - 1];
      expect(lastState?.canUndo).toBe(true);
      expect(lastState?.undoCount).toBe(1);
    });

    it('should increment checkpoint on each operation', () => {
      const { cache, undoStack, write } = system;

      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'a@test.com',
        bio: '',
      });

      const checkpoint0 = undoStack.getCheckpoint();

      write([{ table: 'user', id: 'u1', updates: { name: 'Update 1' } }]);
      const checkpoint1 = undoStack.getCheckpoint();
      expect(checkpoint1).toBe(checkpoint0 + 1);

      write([{ table: 'user', id: 'u1', updates: { name: 'Update 2' } }]);
      const checkpoint2 = undoStack.getCheckpoint();
      expect(checkpoint2).toBe(checkpoint1 + 1);

      undoStack.undo();
      const checkpoint3 = undoStack.getCheckpoint();
      expect(checkpoint3).toBe(checkpoint2 + 1);
    });
  });

  describe('skip undo option', () => {
    it('should allow skipping undo stack for certain writes', () => {
      const { cache, undoStack, write } = system;

      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'a@test.com',
        bio: '',
      });

      // Skip undo
      write([{ table: 'user', id: 'u1', updates: { name: 'Skipped Update' } }], true);

      expect(cache.get('user', 'u1')?.name).toBe('Skipped Update');
      expect(undoStack.canUndo).toBe(false);
    });

    it('should mix skipUndo and regular writes correctly', () => {
      const { cache, undoStack, write } = system;

      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'a@test.com',
        bio: '',
      });

      write([{ table: 'user', id: 'u1', updates: { name: 'Regular 1' } }], false);
      write([{ table: 'user', id: 'u1', updates: { name: 'Skipped' } }], true);
      write([{ table: 'user', id: 'u1', updates: { name: 'Regular 2' } }], false);

      expect(cache.get('user', 'u1')?.name).toBe('Regular 2');
      expect(undoStack.getState().undoCount).toBe(2); // Only 2 regular writes

      undoStack.undo();
      expect(cache.get('user', 'u1')?.name).toBe('Skipped'); // Back to skipped value
    });
  });

  describe('max undo size', () => {
    it('should respect maxUndoSize limit', () => {
      const testCache = new RecordCache<TestTables>();

      const testUndoStack = new UndoRedoStack<UndoableWrite>({
        maxUndoSize: 3,
        onUndo: (operation: UndoableOperation<UndoableWrite>) => {
          const { operations: ops, previousValues } = operation.data;
          for (let i = 0; i < ops.length; i++) {
            const op = ops[i];
            const prevValue = previousValues[i];
            if (op && prevValue !== undefined) {
              const existing = testCache.get(op.table as 'user' | 'post', op.id);
              if (existing) {
                testCache.set(
                  op.table as 'user' | 'post',
                  op.id,
                  { ...existing, ...prevValue },
                  { force: true },
                );
              }
            }
          }
        },
        onRedo: () => {},
      });

      testCache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Original',
        email: 'a@test.com',
        bio: '',
      });

      // Push more than max
      for (let i = 1; i <= 5; i++) {
        testCache.set(
          'user',
          'u1',
          { id: 'u1', version: 1, name: `Update ${i}`, email: 'a@test.com', bio: '' },
          { force: true },
        );
        testUndoStack.push({
          operations: [{ table: 'user', id: 'u1', updates: { name: `Update ${i}` } }],
          previousValues: [{ name: i === 1 ? 'Original' : `Update ${i - 1}` }],
        });
      }

      // Should only have last 3
      expect(testUndoStack.getState().undoCount).toBe(3);

      // Can undo back to Update 2 (oldest in stack)
      testUndoStack.undo();
      expect(testCache.get('user', 'u1')?.name).toBe('Update 4');

      testUndoStack.undo();
      expect(testCache.get('user', 'u1')?.name).toBe('Update 3');

      testUndoStack.undo();
      expect(testCache.get('user', 'u1')?.name).toBe('Update 2');

      // No more to undo
      expect(testUndoStack.canUndo).toBe(false);
    });
  });

  describe('clear and reset', () => {
    it('should clear undo and redo stacks', () => {
      const { cache, undoStack, write } = system;

      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'a@test.com',
        bio: '',
      });

      write([{ table: 'user', id: 'u1', updates: { name: 'Update 1' } }]);
      write([{ table: 'user', id: 'u1', updates: { name: 'Update 2' } }]);

      undoStack.undo();

      expect(undoStack.canUndo).toBe(true);
      expect(undoStack.canRedo).toBe(true);

      undoStack.clear();

      expect(undoStack.canUndo).toBe(false);
      expect(undoStack.canRedo).toBe(false);
    });

    it('should reset checkpoint on reset', () => {
      const { cache, undoStack, write } = system;

      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'a@test.com',
        bio: '',
      });

      write([{ table: 'user', id: 'u1', updates: { name: 'Update' } }]);

      expect(undoStack.getCheckpoint()).toBeGreaterThan(0);

      undoStack.reset();

      expect(undoStack.getCheckpoint()).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle undo when stack is empty', () => {
      const { undoStack } = system;

      const result = undoStack.undo();
      expect(result).toBeNull();
    });

    it('should handle redo when stack is empty', () => {
      const { undoStack } = system;

      const result = undoStack.redo();
      expect(result).toBeNull();
    });

    it('should handle operations on non-existent records gracefully', () => {
      const { undoStack, write } = system;

      // Write to non-existent record
      write([{ table: 'user', id: 'nonexistent', updates: { name: 'Update' } }]);

      // Should still be in undo stack
      expect(undoStack.canUndo).toBe(true);

      // Undo should not crash
      undoStack.undo();
    });

    it('should peek without modifying stack', () => {
      const { cache, undoStack, write } = system;

      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'a@test.com',
        bio: '',
      });

      write([{ table: 'user', id: 'u1', updates: { name: 'Update' } }]);

      const peeked = undoStack.peek();
      expect(peeked?.data.operations[0]?.updates.name).toBe('Update');

      // Stack unchanged
      expect(undoStack.getState().undoCount).toBe(1);
    });
  });
});
