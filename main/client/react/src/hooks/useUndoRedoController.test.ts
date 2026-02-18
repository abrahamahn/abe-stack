// main/client/react/src/hooks/useUndoRedoController.test.ts
import { createSetOperation, createTransaction } from '@bslt/shared';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { toastStore } from '../stores/toastStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';

import { useUndoRedoController } from './useUndoRedoController';

describe('useUndoRedoController', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => `uuid-${Math.random().toString(36).slice(2)}`),
    });
    // Clear the global singleton store
    useUndoRedoStore.getState().clear();
    toastStore.setState({ messages: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns canUndo false when stack is empty', () => {
    const { result } = renderHook(() => useUndoRedoController());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo calls store.undo() and shows toast', () => {
    const tx = createTransaction([createSetOperation(['a'], 1, 0)]);
    useUndoRedoStore.getState().push(tx);

    const handler = { apply: vi.fn() };
    const { result } = renderHook(() => useUndoRedoController({ handler }));

    act(() => {
      result.current.undo();
    });

    expect(handler.apply).toHaveBeenCalledTimes(1);
    const toastMessages = toastStore.getState().messages;
    expect(toastMessages.length).toBeGreaterThan(0);
    expect(toastMessages[toastMessages.length - 1]?.title).toBe('Action undone');
  });

  it('undo toast includes Redo action button', () => {
    const tx = createTransaction([createSetOperation(['a'], 1, 0)]);
    useUndoRedoStore.getState().push(tx);

    const handler = { apply: vi.fn() };
    const { result } = renderHook(() => useUndoRedoController({ handler }));

    act(() => {
      result.current.undo();
    });

    const toastMessages = toastStore.getState().messages;
    const lastToast = toastMessages[toastMessages.length - 1];
    expect(lastToast?.action).toBeDefined();
    expect(lastToast?.action?.label).toBe('Redo');
  });

  it('redo calls store.redo() and shows toast', () => {
    const tx = createTransaction([createSetOperation(['a'], 1, 0)]);
    useUndoRedoStore.getState().push(tx);
    useUndoRedoStore.getState().undo();

    const handler = { apply: vi.fn() };
    const { result } = renderHook(() => useUndoRedoController({ handler }));

    act(() => {
      result.current.redo();
    });

    expect(handler.apply).toHaveBeenCalledTimes(1);
    const toastMessages = toastStore.getState().messages;
    expect(toastMessages.length).toBeGreaterThan(0);
    expect(toastMessages[toastMessages.length - 1]?.title).toBe('Action redone');
  });

  it('handler.apply receives inverse transaction on undo', () => {
    const tx = createTransaction([createSetOperation(['name'], 'new', 'old')]);
    useUndoRedoStore.getState().push(tx);

    const handler = { apply: vi.fn() };
    const { result } = renderHook(() => useUndoRedoController({ handler }));

    act(() => {
      result.current.undo();
    });

    const appliedTx = handler.apply.mock.calls[0]?.[0];
    expect(appliedTx).toBeDefined();
    const op = appliedTx?.operations[0];
    expect(op?.type).toBe('set');
    if (op?.type === 'set') {
      expect(op.value).toBe('old');
      expect(op.previousValue).toBe('new');
    }
  });

  it('does nothing when undo is called on empty stack', () => {
    const handler = { apply: vi.fn() };
    const { result } = renderHook(() => useUndoRedoController({ handler }));

    act(() => {
      result.current.undo();
    });

    expect(handler.apply).not.toHaveBeenCalled();
    expect(toastStore.getState().messages).toHaveLength(0);
  });

  it('does nothing when redo is called on empty stack', () => {
    const handler = { apply: vi.fn() };
    const { result } = renderHook(() => useUndoRedoController({ handler }));

    act(() => {
      result.current.redo();
    });

    expect(handler.apply).not.toHaveBeenCalled();
    expect(toastStore.getState().messages).toHaveLength(0);
  });

  it('reports correct undoCount and redoCount after undo/redo actions', () => {
    // Use timestamps far apart to avoid auto-batching (threshold = 1200ms)
    const tx1 = { id: 'tx-1', timestamp: 1000, operations: [createSetOperation(['a'], 1, 0)] };
    const tx2 = { id: 'tx-2', timestamp: 5000, operations: [createSetOperation(['b'], 2, 0)] };
    useUndoRedoStore.getState().push(tx1);
    useUndoRedoStore.getState().push(tx2);

    const handler = { apply: vi.fn() };
    const { result } = renderHook(() => useUndoRedoController({ handler }));

    // Initially both on undo stack
    expect(result.current.undoCount).toBe(2);
    expect(result.current.redoCount).toBe(0);

    // Undo one — should move to redo stack
    act(() => {
      result.current.undo();
    });

    expect(result.current.undoCount).toBe(1);
    expect(result.current.redoCount).toBe(1);
  });
});
