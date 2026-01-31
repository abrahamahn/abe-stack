// client/src/undo/UndoRedoStack.test.ts
import { describe, expect, it, vi } from 'vitest';

import { UndoRedoStack, createUndoRedoStack } from './UndoRedoStack';

interface TestOperation {
  type: 'add' | 'remove' | 'update';
  entityId: string;
  value?: string;
}

describe('UndoRedoStack', () => {
  describe('push', () => {
    it('should add operation to undo stack', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.push({ type: 'add', entityId: '1', value: 'test' });

      expect(stack.canUndo).toBe(true);
      expect(stack.getUndoStack()).toHaveLength(1);
    });

    it('should return operation id', () => {
      const stack = new UndoRedoStack<TestOperation>();

      const id = stack.push({ type: 'add', entityId: '1', value: 'test' });

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should clear redo stack when new operation is pushed', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.push({ type: 'add', entityId: '1', value: 'test' });
      stack.undo();
      expect(stack.canRedo).toBe(true);

      stack.push({ type: 'add', entityId: '2', value: 'test2' });
      expect(stack.canRedo).toBe(false);
    });

    it('should enforce max undo size', () => {
      const stack = new UndoRedoStack<TestOperation>({ maxUndoSize: 3 });

      stack.push({ type: 'add', entityId: '1', value: 'test1' });
      stack.push({ type: 'add', entityId: '2', value: 'test2' });
      stack.push({ type: 'add', entityId: '3', value: 'test3' });
      stack.push({ type: 'add', entityId: '4', value: 'test4' });

      expect(stack.getUndoStack()).toHaveLength(3);
      // First operation should have been removed
      expect(stack.getUndoStack()[0]?.data.entityId).toBe('2');
    });

    it('should increment checkpoint on push', () => {
      const stack = new UndoRedoStack<TestOperation>();
      const initialCheckpoint: number = stack.getCheckpoint();

      stack.push({ type: 'add', entityId: '1', value: 'test' });

      expect(stack.getCheckpoint()).toBe(initialCheckpoint + 1);
    });
  });

  describe('undo', () => {
    it('should return null when undo stack is empty', () => {
      const stack = new UndoRedoStack<TestOperation>();

      const result = stack.undo();

      expect(result).toBeNull();
    });

    it('should call onUndo callback with the operation', () => {
      const onUndo = vi.fn();
      const stack = new UndoRedoStack<TestOperation>({ onUndo });
      const operation = { type: 'add' as const, entityId: '1', value: 'test' };

      stack.push(operation);
      stack.undo();

      expect(onUndo).toHaveBeenCalledTimes(1);
      expect(onUndo.mock.calls[0]?.[0]?.data).toEqual(operation);
    });

    it('should move operation to redo stack', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.push({ type: 'add', entityId: '1', value: 'test' });
      stack.undo();

      expect(stack.canUndo).toBe(false);
      expect(stack.canRedo).toBe(true);
      expect(stack.getRedoStack()).toHaveLength(1);
    });

    it('should return the undone operation', () => {
      const stack = new UndoRedoStack<TestOperation>();
      const operation = { type: 'add' as const, entityId: '1', value: 'test' };

      stack.push(operation);
      const result = stack.undo();

      expect(result).toHaveLength(1);
      expect(result?.[0]?.data).toEqual(operation);
    });

    it('should increment checkpoint on undo', () => {
      const stack = new UndoRedoStack<TestOperation>();
      stack.push({ type: 'add', entityId: '1', value: 'test' });
      const checkpointAfterPush: number = stack.getCheckpoint();

      stack.undo();

      expect(stack.getCheckpoint()).toBe(checkpointAfterPush + 1);
    });
  });

  describe('redo', () => {
    it('should return null when redo stack is empty', () => {
      const stack = new UndoRedoStack<TestOperation>();

      const result = stack.redo();

      expect(result).toBeNull();
    });

    it('should call onRedo callback with the operation', () => {
      const onRedo = vi.fn();
      const stack = new UndoRedoStack<TestOperation>({ onRedo });
      const operation = { type: 'add' as const, entityId: '1', value: 'test' };

      stack.push(operation);
      stack.undo();
      stack.redo();

      expect(onRedo).toHaveBeenCalledTimes(1);
      expect(onRedo.mock.calls[0]?.[0]?.data).toEqual(operation);
    });

    it('should move operation back to undo stack', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.push({ type: 'add', entityId: '1', value: 'test' });
      stack.undo();
      stack.redo();

      expect(stack.canUndo).toBe(true);
      expect(stack.canRedo).toBe(false);
      expect(stack.getUndoStack()).toHaveLength(1);
    });

    it('should return the redone operation', () => {
      const stack = new UndoRedoStack<TestOperation>();
      const operation = { type: 'add' as const, entityId: '1', value: 'test' };

      stack.push(operation);
      stack.undo();
      const result = stack.redo();

      expect(result).toHaveLength(1);
      expect(result?.[0]?.data).toEqual(operation);
    });

    it('should increment checkpoint on redo', () => {
      const stack = new UndoRedoStack<TestOperation>();
      stack.push({ type: 'add', entityId: '1', value: 'test' });
      stack.undo();
      const checkpointAfterUndo: number = stack.getCheckpoint();

      stack.redo();

      expect(stack.getCheckpoint()).toBe(checkpointAfterUndo + 1);
    });
  });

  describe('operation grouping', () => {
    it('should group operations with beginGroup/endGroup', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.beginGroup();
      stack.push({ type: 'add', entityId: '1', value: 'test1' });
      stack.push({ type: 'add', entityId: '2', value: 'test2' });
      stack.push({ type: 'add', entityId: '3', value: 'test3' });
      stack.endGroup();

      expect(stack.getUndoStack()).toHaveLength(3);
      // All should have the same group ID
      const groupId = stack.getUndoStack()[0]?.groupId;
      expect(groupId).toBeDefined();
      expect(stack.getUndoStack()[1]?.groupId).toBe(groupId);
      expect(stack.getUndoStack()[2]?.groupId).toBe(groupId);
    });

    it('should undo all operations in a group together', () => {
      const onUndo = vi.fn();
      const stack = new UndoRedoStack<TestOperation>({ onUndo });

      stack.beginGroup();
      stack.push({ type: 'add', entityId: '1', value: 'test1' });
      stack.push({ type: 'add', entityId: '2', value: 'test2' });
      stack.push({ type: 'add', entityId: '3', value: 'test3' });
      stack.endGroup();

      const undone = stack.undo();

      expect(undone).toHaveLength(3);
      expect(onUndo).toHaveBeenCalledTimes(3);
      expect(stack.canUndo).toBe(false);
    });

    it('should redo all operations in a group together', () => {
      const onRedo = vi.fn();
      const stack = new UndoRedoStack<TestOperation>({ onRedo });

      stack.beginGroup();
      stack.push({ type: 'add', entityId: '1', value: 'test1' });
      stack.push({ type: 'add', entityId: '2', value: 'test2' });
      stack.push({ type: 'add', entityId: '3', value: 'test3' });
      stack.endGroup();

      stack.undo();
      const redone = stack.redo();

      expect(redone).toHaveLength(3);
      expect(onRedo).toHaveBeenCalledTimes(3);
      expect(stack.canRedo).toBe(false);
    });

    it('should support withGroup helper', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.withGroup(() => {
        stack.push({ type: 'add', entityId: '1', value: 'test1' });
        stack.push({ type: 'add', entityId: '2', value: 'test2' });
      });

      const groupId = stack.getUndoStack()[0]?.groupId;
      expect(groupId).toBeDefined();
      expect(stack.getUndoStack()[1]?.groupId).toBe(groupId);
    });

    it('should return result from withGroup', () => {
      const stack = new UndoRedoStack<TestOperation>();

      const result = stack.withGroup(() => {
        stack.push({ type: 'add', entityId: '1', value: 'test1' });
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should end group even if function throws', () => {
      const stack = new UndoRedoStack<TestOperation>();

      expect(() => {
        stack.withGroup(() => {
          stack.push({ type: 'add', entityId: '1', value: 'test1' });
          throw new Error('test error');
        });
      }).toThrow('test error');

      // Next push should not be in a group
      stack.push({ type: 'add', entityId: '2', value: 'test2' });
      expect(stack.getUndoStack()[1]?.groupId).toBeUndefined();
    });

    it('should support custom group IDs', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.beginGroup('my-custom-group');
      stack.push({ type: 'add', entityId: '1', value: 'test1' });
      stack.endGroup();

      expect(stack.getUndoStack()[0]?.groupId).toBe('my-custom-group');
    });

    it('should allow explicit groupId in push to override active group', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.beginGroup('group-a');
      stack.push({ type: 'add', entityId: '1', value: 'test1' });
      stack.push({ type: 'add', entityId: '2', value: 'test2' }, 'group-b');
      stack.push({ type: 'add', entityId: '3', value: 'test3' });
      stack.endGroup();

      expect(stack.getUndoStack()[0]?.groupId).toBe('group-a');
      expect(stack.getUndoStack()[1]?.groupId).toBe('group-b');
      expect(stack.getUndoStack()[2]?.groupId).toBe('group-a');
    });

    it('should handle mixed grouped and ungrouped operations', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.push({ type: 'add', entityId: '1', value: 'test1' });
      stack.beginGroup();
      stack.push({ type: 'add', entityId: '2', value: 'test2' });
      stack.push({ type: 'add', entityId: '3', value: 'test3' });
      stack.endGroup();
      stack.push({ type: 'add', entityId: '4', value: 'test4' });

      // Undo last single operation
      const undone1 = stack.undo();
      expect(undone1).toHaveLength(1);
      expect(undone1?.[0]?.data.entityId).toBe('4');

      // Undo group
      const undone2 = stack.undo();
      expect(undone2).toHaveLength(2);

      // Undo first single operation
      const undone3 = stack.undo();
      expect(undone3).toHaveLength(1);
      expect(undone3?.[0]?.data.entityId).toBe('1');
    });
  });

  describe('state management', () => {
    it('should call onStateChange when state changes', () => {
      const onStateChange = vi.fn();
      const stack = new UndoRedoStack<TestOperation>({ onStateChange });

      stack.push({ type: 'add', entityId: '1', value: 'test' });

      expect(onStateChange).toHaveBeenCalledTimes(1);
      expect(onStateChange).toHaveBeenCalledWith({
        canUndo: true,
        canRedo: false,
        undoCount: 1,
        redoCount: 0,
        checkpoint: 1,
      });
    });

    it('should return correct state from getState', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.push({ type: 'add', entityId: '1', value: 'test1' });
      stack.push({ type: 'add', entityId: '2', value: 'test2' });
      stack.undo();

      const state = stack.getState();

      expect(state).toEqual({
        canUndo: true,
        canRedo: true,
        undoCount: 1,
        redoCount: 1,
        checkpoint: 3,
      });
    });
  });

  describe('peek', () => {
    it('should return the last operation without removing it', () => {
      const stack = new UndoRedoStack<TestOperation>();
      const operation = { type: 'add' as const, entityId: '1', value: 'test' };

      stack.push(operation);
      const peeked = stack.peek();

      expect(peeked?.data).toEqual(operation);
      expect(stack.getUndoStack()).toHaveLength(1);
    });

    it('should return null when stack is empty', () => {
      const stack = new UndoRedoStack<TestOperation>();

      const peeked = stack.peek();

      expect(peeked).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear both undo and redo stacks', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.push({ type: 'add', entityId: '1', value: 'test1' });
      stack.push({ type: 'add', entityId: '2', value: 'test2' });
      stack.undo();

      stack.clear();

      expect(stack.canUndo).toBe(false);
      expect(stack.canRedo).toBe(false);
    });

    it('should clear active group', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.beginGroup();
      stack.push({ type: 'add', entityId: '1', value: 'test1' });
      stack.clear();

      stack.push({ type: 'add', entityId: '2', value: 'test2' });
      expect(stack.getUndoStack()[0]?.groupId).toBeUndefined();
    });

    it('should increment checkpoint', () => {
      const stack = new UndoRedoStack<TestOperation>();
      stack.push({ type: 'add', entityId: '1', value: 'test' });
      const checkpointBefore: number = stack.getCheckpoint();

      stack.clear();

      expect(stack.getCheckpoint()).toBe(checkpointBefore + 1);
    });
  });

  describe('clearRedo', () => {
    it('should clear only redo stack', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.push({ type: 'add', entityId: '1', value: 'test1' });
      stack.push({ type: 'add', entityId: '2', value: 'test2' });
      stack.undo();

      stack.clearRedo();

      expect(stack.canUndo).toBe(true);
      expect(stack.canRedo).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset everything including checkpoint', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.push({ type: 'add', entityId: '1', value: 'test1' });
      stack.push({ type: 'add', entityId: '2', value: 'test2' });
      stack.undo();

      stack.reset();

      expect(stack.canUndo).toBe(false);
      expect(stack.canRedo).toBe(false);
      expect(stack.getCheckpoint()).toBe(0);
    });
  });

  describe('createUndoRedoStack factory', () => {
    it('should create an instance with options', () => {
      const onUndo = vi.fn();
      const stack = createUndoRedoStack<TestOperation>({ onUndo });

      stack.push({ type: 'add', entityId: '1', value: 'test' });
      stack.undo();

      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('should create an instance without options', () => {
      const stack = createUndoRedoStack<TestOperation>();

      expect(stack).toBeInstanceOf(UndoRedoStack);
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple undo/redo cycles', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.push({ type: 'add', entityId: '1', value: 'test1' });
      stack.push({ type: 'add', entityId: '2', value: 'test2' });
      stack.push({ type: 'add', entityId: '3', value: 'test3' });

      // Undo all
      stack.undo();
      stack.undo();
      stack.undo();

      expect(stack.canUndo).toBe(false);
      expect(stack.canRedo).toBe(true);
      expect(stack.getRedoStack()).toHaveLength(3);

      // Redo all
      stack.redo();
      stack.redo();
      stack.redo();

      expect(stack.canUndo).toBe(true);
      expect(stack.canRedo).toBe(false);
      expect(stack.getUndoStack()).toHaveLength(3);
    });

    it('should correctly handle interleaved group and single operations for undo', () => {
      const onUndo = vi.fn();
      const stack = new UndoRedoStack<TestOperation>({ onUndo });

      // Single operation
      stack.push({ type: 'add', entityId: '1', value: 'single1' });

      // Grouped operations
      stack.withGroup(() => {
        stack.push({ type: 'add', entityId: '2', value: 'group1' });
        stack.push({ type: 'add', entityId: '3', value: 'group2' });
      });

      // Another single
      stack.push({ type: 'add', entityId: '4', value: 'single2' });

      // Undo single2
      stack.undo();
      expect(onUndo).toHaveBeenCalledTimes(1);

      // Undo group (2 operations)
      stack.undo();
      expect(onUndo).toHaveBeenCalledTimes(3);

      // Undo single1
      stack.undo();
      expect(onUndo).toHaveBeenCalledTimes(4);

      expect(stack.canUndo).toBe(false);
    });

    it('should preserve operation order in redo stack after grouped undo', () => {
      const stack = new UndoRedoStack<TestOperation>();

      stack.withGroup(() => {
        stack.push({ type: 'add', entityId: '1', value: 'test1' });
        stack.push({ type: 'add', entityId: '2', value: 'test2' });
        stack.push({ type: 'add', entityId: '3', value: 'test3' });
      });

      stack.undo();

      // Redo should restore in original order
      const redone = stack.redo();
      expect(redone?.[0]?.data.entityId).toBe('1');
      expect(redone?.[1]?.data.entityId).toBe('2');
      expect(redone?.[2]?.data.entityId).toBe('3');
    });
  });
});
