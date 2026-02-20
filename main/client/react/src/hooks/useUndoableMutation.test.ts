// main/client/react/src/hooks/useUndoableMutation.test.ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted ensures mockStore is available in the hoisted vi.mock factory
const { mockStore } = vi.hoisted(() => {
  // Inline a minimal store for the mock — avoids importing createUndoRedoStore
  // which would be intercepted by vi.mock
  let undoStack: Array<{ id: string; timestamp: number; operations: unknown[] }> = [];
  const store = {
    getState: () => ({
      undoStack,
      undoStackSize: () => undoStack.length,
      push: (tx: { id: string; timestamp: number; operations: unknown[] }) => {
        undoStack = [...undoStack, tx];
      },
      clear: () => {
        undoStack = [];
      },
    }),
  };
  return { mockStore: store };
});

interface MockMutationOptions {
  mutationFn: (v: unknown) => Promise<unknown>;
  onMutate?: (v: unknown) => void;
  onSuccess?: (d: unknown, v: unknown, c: unknown) => void;
}

vi.mock('../query/useMutation', async () => {
  const react = await import('react');
  return {
    useMutation: (options: MockMutationOptions) => {
      const [status, setStatus] = react.useState<string>('idle');
      const [data, setData] = react.useState<unknown>(undefined);

      const mutateAsync = react.useCallback(
        async (variables: unknown) => {
          setStatus('pending');
          options.onMutate?.(variables);
          const result = await options.mutationFn(variables);
          setStatus('success');
          setData(result);
          options.onSuccess?.(result, variables, undefined);
          return result;
        },
        [options.mutationFn, options.onMutate, options.onSuccess],
      );

      const mutate = react.useCallback(
        (variables: unknown) => {
          void mutateAsync(variables);
        },
        [mutateAsync],
      );

      return {
        mutate,
        mutateAsync,
        isLoading: status === 'pending',
        isPending: status === 'pending',
        isSuccess: status === 'success',
        isError: false,
        isIdle: status === 'idle',
        error: null,
        data,
        reset: vi.fn(),
        status,
        variables: undefined,
      };
    },
  };
});

vi.mock('../query/QueryCacheProvider', () => ({
  useQueryCache: () => ({ invalidateQuery: vi.fn() }),
}));

vi.mock('../stores/undoRedoStore', () => ({
  useUndoRedoStore: () => mockStore.getState(),
}));

// Must import after mocks are set up
import { useUndoableMutation } from './useUndoableMutation';

describe('useUndoableMutation', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => `uuid-${Math.random().toString(36).slice(2)}`),
    });
    mockStore.getState().clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pushes transaction to undoRedoStore on success with changed values', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ name: 'Alice', email: 'alice@test.com' });

    const { result } = renderHook(() =>
      useUndoableMutation({
        mutationFn,
        getSnapshot: () => ({ name: 'Bob', email: 'bob@test.com' }),
        path: ['users', '1'],
        applyTransaction: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    expect(mockStore.getState().undoStackSize()).toBe(1);
    const tx = mockStore.getState().undoStack[0];
    expect(tx?.operations).toHaveLength(2);
  });

  it('creates correct set operations with old and new values', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ name: 'Alice' });

    const { result } = renderHook(() =>
      useUndoableMutation({
        mutationFn,
        getSnapshot: () => ({ name: 'Bob' }),
        path: ['users', '1'],
        applyTransaction: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    const tx = mockStore.getState().undoStack[0];
    const op = tx?.operations[0] as {
      type: string;
      path: string[];
      value: unknown;
      previousValue: unknown;
    };
    expect(op.type).toBe('set');
    expect(op.path).toEqual(['users', '1', 'name']);
    expect(op.value).toBe('Alice');
    expect(op.previousValue).toBe('Bob');
  });

  it('does not push transaction when values have not changed', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ name: 'Same' });

    const { result } = renderHook(() =>
      useUndoableMutation({
        mutationFn,
        getSnapshot: () => ({ name: 'Same' }),
        path: ['users', '1'],
        applyTransaction: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    expect(mockStore.getState().undoStackSize()).toBe(0);
  });

  it('captures snapshot before mutation starts', async () => {
    let snapshotValue = 'initial';
    const mutationFn = vi.fn().mockImplementation(() => {
      snapshotValue = 'changed-during-mutation';
      return Promise.resolve({ name: 'new' });
    });

    const { result } = renderHook(() =>
      useUndoableMutation({
        mutationFn,
        getSnapshot: () => ({ name: snapshotValue }),
        path: ['test'],
        applyTransaction: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    const tx = mockStore.getState().undoStack[0];
    const op = tx?.operations[0] as { type: string; previousValue: unknown };
    expect(op.previousValue).toBe('initial');
  });

  it('calls original onSuccess callback', async () => {
    const onSuccess = vi.fn();
    const mutationFn = vi.fn().mockResolvedValue({ name: 'Alice' });

    const { result } = renderHook(() =>
      useUndoableMutation({
        mutationFn,
        getSnapshot: () => ({ name: 'Bob' }),
        path: ['users', '1'],
        applyTransaction: vi.fn(),
        onSuccess,
      }),
    );

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    expect(onSuccess).toHaveBeenCalledWith({ name: 'Alice' }, undefined, undefined);
  });

  it('only includes keys present in both snapshot and result', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ name: 'Alice', age: 30, extra: 'value' });

    const { result } = renderHook(() =>
      useUndoableMutation({
        mutationFn,
        getSnapshot: () => ({ name: 'Bob', age: 25 }),
        path: ['users', '1'],
        applyTransaction: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    const tx = mockStore.getState().undoStack[0];
    // 'extra' not in snapshot, so only name and age
    expect(tx?.operations).toHaveLength(2);
  });
});
