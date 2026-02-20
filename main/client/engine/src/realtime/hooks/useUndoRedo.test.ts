// main/client/engine/src/realtime/hooks/useUndoRedo.test.ts
/**
 * Tests for useUndoRedo hook.
 *
 * Validates the hook's contract, types, and integration with UndoRedoStack.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { UndoRedoStack, type UndoRedoState } from '../../undo/UndoRedoStack';

import type { UseUndoRedoDeps, UseUndoRedoResult } from './useUndoRedo';

// ============================================================================
// Test Types
// ============================================================================

interface TestWriteData {
  table: string;
  id: string;
  updates: Record<string, unknown>;
}

// ============================================================================
// Tests
// ============================================================================

describe('useUndoRedo types and deps', () => {
  let undoRedoStack: UndoRedoStack<TestWriteData>;
  let stateChanges: UndoRedoState[];

  beforeEach(() => {
    stateChanges = [];
    undoRedoStack = new UndoRedoStack<TestWriteData>({
      maxUndoSize: 100,
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onStateChange: (state: UndoRedoState) => {
        stateChanges.push(state);
      },
    });
  });

  describe('UseUndoRedoDeps interface', () => {
    it('should accept an UndoRedoStack', () => {
      const deps: UseUndoRedoDeps<TestWriteData> = {
        undoRedoStack,
      };

      expect(deps.undoRedoStack).toBe(undoRedoStack);
    });
  });

  describe('UseUndoRedoResult interface', () => {
    it('should represent initial state', () => {
      const result: UseUndoRedoResult = {
        undo: vi.fn(),
        redo: vi.fn(),
        canUndo: false,
        canRedo: false,
        undoCount: 0,
        redoCount: 0,
      };

      expect(result.canUndo).toBe(false);
      expect(result.canRedo).toBe(false);
      expect(result.undoCount).toBe(0);
      expect(result.redoCount).toBe(0);
    });
  });

  describe('UndoRedoStack integration', () => {
    it('should start with canUndo false', () => {
      const state = undoRedoStack.getState();
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
    });

    it('should have canUndo true after push', () => {
      undoRedoStack.push({ table: 'user', id: 'u1', updates: { name: 'Bob' } });

      const state = undoRedoStack.getState();
      expect(state.canUndo).toBe(true);
      expect(state.undoCount).toBe(1);
    });

    it('should have canRedo true after undo', () => {
      undoRedoStack.push({ table: 'user', id: 'u1', updates: { name: 'Bob' } });
      undoRedoStack.undo();

      const state = undoRedoStack.getState();
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(true);
      expect(state.redoCount).toBe(1);
    });

    it('should emit state changes on push', () => {
      undoRedoStack.push({ table: 'user', id: 'u1', updates: { name: 'Bob' } });

      expect(stateChanges.length).toBeGreaterThan(0);
      const lastState = stateChanges[stateChanges.length - 1];
      expect(lastState?.canUndo).toBe(true);
      expect(lastState?.undoCount).toBe(1);
    });

    it('should emit state changes on undo', () => {
      undoRedoStack.push({ table: 'user', id: 'u1', updates: { name: 'Bob' } });
      const countBefore = stateChanges.length;

      undoRedoStack.undo();

      expect(stateChanges.length).toBeGreaterThan(countBefore);
      const lastState = stateChanges[stateChanges.length - 1];
      expect(lastState?.canRedo).toBe(true);
    });

    it('should emit state changes on redo', () => {
      undoRedoStack.push({ table: 'user', id: 'u1', updates: { name: 'Bob' } });
      undoRedoStack.undo();
      const countBefore = stateChanges.length;

      undoRedoStack.redo();

      expect(stateChanges.length).toBeGreaterThan(countBefore);
      const lastState = stateChanges[stateChanges.length - 1];
      expect(lastState?.canUndo).toBe(true);
      expect(lastState?.canRedo).toBe(false);
    });

    it('should track checkpoint changes', () => {
      const cp0 = undoRedoStack.getCheckpoint();
      undoRedoStack.push({ table: 'user', id: 'u1', updates: { name: 'Bob' } });
      const cp1 = undoRedoStack.getCheckpoint();

      expect(cp1).toBeGreaterThan(cp0);

      undoRedoStack.undo();
      const cp2 = undoRedoStack.getCheckpoint();

      expect(cp2).toBeGreaterThan(cp1);
    });

    it('should clear redo stack on new push', () => {
      undoRedoStack.push({ table: 'user', id: 'u1', updates: { name: 'Bob' } });
      undoRedoStack.undo();

      expect(undoRedoStack.getState().canRedo).toBe(true);

      undoRedoStack.push({ table: 'user', id: 'u2', updates: { name: 'Alice' } });

      expect(undoRedoStack.getState().canRedo).toBe(false);
    });

    it('should handle multiple operations', () => {
      undoRedoStack.push({ table: 'user', id: 'u1', updates: { name: 'Bob' } });
      undoRedoStack.push({ table: 'user', id: 'u2', updates: { name: 'Alice' } });
      undoRedoStack.push({ table: 'user', id: 'u3', updates: { name: 'Charlie' } });

      const state = undoRedoStack.getState();
      expect(state.undoCount).toBe(3);
      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(false);
    });
  });
});
