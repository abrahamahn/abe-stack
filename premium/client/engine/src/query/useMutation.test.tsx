// client/src/query/useMutation.test.tsx
/**
 * Unit tests for useMutation hook.
 *
 * Tests mutation state management, callbacks, retries, cache invalidation,
 * and race condition handling.
 *
 * @vitest-environment jsdom
 */

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryCache } from './QueryCache';
import { QueryCacheProvider } from './QueryCacheProvider';
import { useMutation } from './useMutation';

import type { UseMutationOptions } from './useMutation';

// ============================================================================
// Test Utilities
// ============================================================================

/** Track active caches for cleanup */
const activeCaches: QueryCache[] = [];

/**
 * Create a wrapper component with QueryCacheProvider.
 */
function createWrapper(cache?: QueryCache) {
  const queryCache = cache ?? new QueryCache();
  activeCaches.push(queryCache);
  // React component wrapper - PascalCase is correct for component name
  return function wrapper({ children }: { children: ReactNode }): ReactNode {
    return <QueryCacheProvider cache={queryCache}>{children}</QueryCacheProvider>;
  };
}

/**
 * Wait for a specific number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Test Data
// ============================================================================

interface TestData {
  id: string;
  value: number;
}

interface TestVariables {
  value: number;
}

interface TestContext {
  previousValue?: number;
}

// ============================================================================
// Tests: Basic Functionality
// ============================================================================

describe('useMutation - Basic Functionality', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cleanup();
    // Destroy any leftover caches
    while (activeCaches.length > 0) {
      const c = activeCaches.pop();
      c?.destroy();
    }
    cache = new QueryCache();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
    vi.clearAllMocks();
    // Destroy caches after test
    while (activeCaches.length > 0) {
      const c = activeCaches.pop();
      c?.destroy();
    }
    cache?.destroy();
    // Give time for async cleanup
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it('should initialize with idle state', () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', value: 42 });
    const { result } = renderHook(() => useMutation({ mutationFn }), {
      wrapper: createWrapper(cache),
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
    expect(result.current.variables).toBeUndefined();
  });

  it('should transition to pending state when mutating', async () => {
    const mutationFn = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve({ id: '1', value: 42 });
          }, 50),
        ),
    );
    const { result } = renderHook(() => useMutation({ mutationFn }), {
      wrapper: createWrapper(cache),
    });

    act(() => {
      result.current.mutate({ value: 42 });
    });

    // Check pending state
    expect(result.current.status).toBe('pending');
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isPending).toBe(true);
    expect(result.current.isIdle).toBe(false);
    expect(result.current.variables).toEqual({ value: 42 });

    // Wait for completion
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should transition to success state after successful mutation', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', value: 42 });
    const { result } = renderHook(
      () => useMutation<TestData, Error, TestVariables>({ mutationFn }),
      {
        wrapper: createWrapper(cache),
      },
    );

    await act(async () => {
      await result.current.mutateAsync({ value: 42 });
    });

    expect(result.current.status).toBe('success');
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toEqual({ id: '1', value: 42 });
    expect(result.current.error).toBeNull();
  });

  it('should transition to error state after failed mutation', async () => {
    const error = new Error('Mutation failed');
    const mutationFn = vi.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useMutation({ mutationFn }), {
      wrapper: createWrapper(cache),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ value: 42 });
      } catch {
        // Expected error
      }
    });

    expect(result.current.status).toBe('error');
    expect(result.current.isError).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toBe(error);
    expect(result.current.data).toBeUndefined();
  });

  it('should reset mutation state', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', value: 42 });
    const { result } = renderHook(() => useMutation({ mutationFn }), {
      wrapper: createWrapper(cache),
    });

    // Execute mutation
    await act(async () => {
      await result.current.mutateAsync({ value: 42 });
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual({ id: '1', value: 42 });

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.isIdle).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
    expect(result.current.variables).toBeUndefined();
  });
});

// ============================================================================
// Tests: mutate vs mutateAsync
// ============================================================================

describe('useMutation - mutate vs mutateAsync', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cleanup();
    while (activeCaches.length > 0) {
      activeCaches.pop()?.destroy();
    }
    cache = new QueryCache();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
    while (activeCaches.length > 0) {
      activeCaches.pop()?.destroy();
    }
    cache?.destroy();
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it('should execute mutation with mutate (fire and forget)', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', value: 42 });
    const { result } = renderHook(() => useMutation({ mutationFn }), {
      wrapper: createWrapper(cache),
    });

    act(() => {
      result.current.mutate({ value: 42 });
    });

    // mutate doesn't return a promise
    expect(mutationFn).toHaveBeenCalledWith({ value: 42 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should execute mutation with mutateAsync and return promise', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', value: 42 });
    const { result } = renderHook(() => useMutation({ mutationFn }), {
      wrapper: createWrapper(cache),
    });

    const promise = act(async () => {
      return await result.current.mutateAsync({ value: 42 });
    });

    const data = await promise;
    expect(data).toEqual({ id: '1', value: 42 });
    expect(result.current.isSuccess).toBe(true);
  });

  it('should handle errors silently with mutate', async () => {
    const error = new Error('Mutation failed');
    const mutationFn = vi.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useMutation({ mutationFn }), {
      wrapper: createWrapper(cache),
    });

    // mutate should not throw
    act(() => {
      result.current.mutate({ value: 42 });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });

  it('should throw errors with mutateAsync', async () => {
    const error = new Error('Mutation failed');
    const mutationFn = vi.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useMutation({ mutationFn }), {
      wrapper: createWrapper(cache),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ value: 42 });
      }),
    ).rejects.toThrow('Mutation failed');
  });
});

// ============================================================================
// Tests: Lifecycle Callbacks
// ============================================================================

describe('useMutation - Lifecycle Callbacks', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cleanup();
    while (activeCaches.length > 0) {
      activeCaches.pop()?.destroy();
    }
    cache = new QueryCache();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
    while (activeCaches.length > 0) {
      activeCaches.pop()?.destroy();
    }
    cache?.destroy();
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it('should call onMutate before mutation starts', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', value: 42 });
    const onMutate = vi.fn().mockReturnValue({ previousValue: 10 });

    const { result } = renderHook(
      () => useMutation<TestData, Error, TestVariables, TestContext>({ mutationFn, onMutate }),
      { wrapper: createWrapper(cache) },
    );

    await act(async () => {
      await result.current.mutateAsync({ value: 42 });
    });

    expect(onMutate).toHaveBeenCalledWith({ value: 42 });
    expect(onMutate).toHaveBeenCalledBefore(mutationFn);
  });

  it('should call onSuccess after successful mutation', async () => {
    const data = { id: '1', value: 42 };
    const mutationFn = vi.fn().mockResolvedValue(data);
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useMutation({ mutationFn, onSuccess }), {
      wrapper: createWrapper(cache),
    });

    await act(async () => {
      await result.current.mutateAsync({ value: 42 });
    });

    expect(onSuccess).toHaveBeenCalledWith(data, { value: 42 }, undefined);
  });

  it('should call onError after failed mutation', async () => {
    const error = new Error('Mutation failed');
    const mutationFn = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();

    const { result } = renderHook(() => useMutation({ mutationFn, onError }), {
      wrapper: createWrapper(cache),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ value: 42 });
      } catch {
        // Expected error
      }
    });

    expect(onError).toHaveBeenCalledWith(error, { value: 42 }, undefined);
  });

  it('should call onSettled after successful mutation', async () => {
    const data = { id: '1', value: 42 };
    const mutationFn = vi.fn().mockResolvedValue(data);
    const onSettled = vi.fn();

    const { result } = renderHook(() => useMutation({ mutationFn, onSettled }), {
      wrapper: createWrapper(cache),
    });

    await act(async () => {
      await result.current.mutateAsync({ value: 42 });
    });

    expect(onSettled).toHaveBeenCalledWith(data, null, { value: 42 }, undefined);
  });

  it('should call onSettled after failed mutation', async () => {
    const error = new Error('Mutation failed');
    const mutationFn = vi.fn().mockRejectedValue(error);
    const onSettled = vi.fn();

    const { result } = renderHook(() => useMutation({ mutationFn, onSettled }), {
      wrapper: createWrapper(cache),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ value: 42 });
      } catch {
        // Expected error
      }
    });

    expect(onSettled).toHaveBeenCalledWith(undefined, error, { value: 42 }, undefined);
  });

  it('should pass context from onMutate to callbacks', async () => {
    const data = { id: '1', value: 42 };
    const context = { previousValue: 10 };
    const mutationFn = vi.fn().mockResolvedValue(data);
    const onMutate = vi.fn().mockReturnValue(context);
    const onSuccess = vi.fn();
    const onSettled = vi.fn();

    const { result } = renderHook(
      () =>
        useMutation<TestData, Error, TestVariables, TestContext>({
          mutationFn,
          onMutate,
          onSuccess,
          onSettled,
        }),
      { wrapper: createWrapper(cache) },
    );

    await act(async () => {
      await result.current.mutateAsync({ value: 42 });
    });

    expect(onSuccess).toHaveBeenCalledWith(data, { value: 42 }, context);
    expect(onSettled).toHaveBeenCalledWith(data, null, { value: 42 }, context);
  });

  it('should handle async onMutate callback', async () => {
    const context = { previousValue: 10 };
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', value: 42 });
    const onMutate = vi.fn().mockResolvedValue(context);
    const onSuccess = vi.fn();

    const { result } = renderHook(
      () =>
        useMutation<TestData, Error, TestVariables, TestContext>({
          mutationFn,
          onMutate,
          onSuccess,
        }),
      { wrapper: createWrapper(cache) },
    );

    await act(async () => {
      await result.current.mutateAsync({ value: 42 });
    });

    expect(onSuccess).toHaveBeenCalledWith({ id: '1', value: 42 }, { value: 42 }, context);
  });

  it('should handle async callbacks', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', value: 42 });
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const onSettled = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useMutation({ mutationFn, onSuccess, onSettled }), {
      wrapper: createWrapper(cache),
    });

    await act(async () => {
      await result.current.mutateAsync({ value: 42 });
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: Retry Logic
// ============================================================================

describe('useMutation - Retry Logic', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cleanup();
    while (activeCaches.length > 0) {
      activeCaches.pop()?.destroy();
    }
    cache = new QueryCache();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
    while (activeCaches.length > 0) {
      activeCaches.pop()?.destroy();
    }
    cache?.destroy();
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it('should not retry by default', async () => {
    const error = new Error('Mutation failed');
    const mutationFn = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useMutation({ mutationFn }), {
      wrapper: createWrapper(cache),
    });

    const promise = act(async () => {
      try {
        await result.current.mutateAsync({ value: 42 });
      } catch {
        // Expected error
      }
    });

    await promise;

    expect(mutationFn).toHaveBeenCalledTimes(1);
  });

  it('should retry specified number of times', async () => {
    const error = new Error('Mutation failed');
    const mutationFn = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useMutation({ mutationFn, retry: 2, retryDelay: 50 }), {
      wrapper: createWrapper(cache),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ value: 42 });
      } catch {
        // Expected error
      }
    });

    // Initial attempt + 2 retries = 3 total
    expect(mutationFn).toHaveBeenCalledTimes(3);
  });

  it('should succeed on retry', async () => {
    const mutationFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('First attempt'))
      .mockResolvedValueOnce({ id: '1', value: 42 });

    const { result } = renderHook(() => useMutation({ mutationFn, retry: 2, retryDelay: 50 }), {
      wrapper: createWrapper(cache),
    });

    await act(async () => {
      await result.current.mutateAsync({ value: 42 });
    });

    expect(mutationFn).toHaveBeenCalledTimes(2);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual({ id: '1', value: 42 });
  });

  it('should use exponential backoff for retries', async () => {
    vi.useFakeTimers();
    const error = new Error('Mutation failed');
    const mutationFn = vi.fn().mockRejectedValue(error);
    const retryDelay = 100;

    const { result } = renderHook(() => useMutation({ mutationFn, retry: 2, retryDelay }), {
      wrapper: createWrapper(cache),
    });

    const promise = act(async () => {
      try {
        await result.current.mutateAsync({ value: 42 });
      } catch {
        // Expected error
      }
    });

    // First retry: 100ms
    await vi.advanceTimersByTimeAsync(100);
    expect(mutationFn).toHaveBeenCalledTimes(2);

    // Second retry: 200ms (exponential backoff)
    await vi.advanceTimersByTimeAsync(200);
    expect(mutationFn).toHaveBeenCalledTimes(3);

    await promise;
    vi.useRealTimers();
  });

  it('should retry 3 times when retry is true', async () => {
    const error = new Error('Mutation failed');
    const mutationFn = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useMutation({ mutationFn, retry: true, retryDelay: 50 }), {
      wrapper: createWrapper(cache),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ value: 42 });
      } catch {
        // Expected error
      }
    });

    // Initial attempt + 3 retries = 4 total
    expect(mutationFn).toHaveBeenCalledTimes(4);
  });

  it('should not retry when retry is false', async () => {
    const error = new Error('Mutation failed');
    const mutationFn = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useMutation({ mutationFn, retry: false }), {
      wrapper: createWrapper(cache),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ value: 42 });
      } catch {
        // Expected error
      }
    });

    expect(mutationFn).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Tests: Cache Invalidation
// ============================================================================

describe('useMutation - Cache Invalidation', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cleanup();
    while (activeCaches.length > 0) {
      activeCaches.pop()?.destroy();
    }
    cache = new QueryCache();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
    while (activeCaches.length > 0) {
      activeCaches.pop()?.destroy();
    }
    cache?.destroy();
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it('should invalidate specified queries on success', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', value: 42 });
    const queryKey = ['users', '1'];

    // Set up initial query data
    cache.setQueryData(queryKey, { id: '1', name: 'John' });
    expect(cache.isStale(queryKey)).toBe(false);

    const { result } = renderHook(
      () => useMutation({ mutationFn, invalidateOnSuccess: [queryKey] }),
      { wrapper: createWrapper(cache) },
    );

    await act(async () => {
      await result.current.mutateAsync({ value: 42 });
    });

    // Query should be invalidated
    expect(cache.isStale(queryKey)).toBe(true);
  });

  it('should invalidate multiple queries on success', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', value: 42 });
    const queryKey1 = ['users', '1'];
    const queryKey2 = ['users', 'list'];

    // Set up initial query data
    cache.setQueryData(queryKey1, { id: '1', name: 'John' });
    cache.setQueryData(queryKey2, [{ id: '1', name: 'John' }]);

    const { result } = renderHook(
      () => useMutation({ mutationFn, invalidateOnSuccess: [queryKey1, queryKey2] }),
      { wrapper: createWrapper(cache) },
    );

    await act(async () => {
      await result.current.mutateAsync({ value: 42 });
    });

    expect(cache.isStale(queryKey1)).toBe(true);
    expect(cache.isStale(queryKey2)).toBe(true);
  });

  it('should not invalidate queries on error', async () => {
    const error = new Error('Mutation failed');
    const mutationFn = vi.fn().mockRejectedValue(error);
    const queryKey = ['users', '1'];

    // Set up initial query data
    cache.setQueryData(queryKey, { id: '1', name: 'John' });
    expect(cache.isStale(queryKey)).toBe(false);

    const { result } = renderHook(
      () => useMutation({ mutationFn, invalidateOnSuccess: [queryKey] }),
      { wrapper: createWrapper(cache) },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync({ value: 42 });
      } catch {
        // Expected error
      }
    });

    // Query should NOT be invalidated
    expect(cache.isStale(queryKey)).toBe(false);
  });
});

// ============================================================================
// Tests: Race Conditions
// ============================================================================

describe('useMutation - Race Conditions', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cleanup();
    while (activeCaches.length > 0) {
      activeCaches.pop()?.destroy();
    }
    cache = new QueryCache();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
    while (activeCaches.length > 0) {
      activeCaches.pop()?.destroy();
    }
    cache?.destroy();
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it('should handle superseded mutations', async () => {
    const mutationFn = vi.fn().mockImplementation(
      (vars: TestVariables) =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve({ id: '1', value: vars.value });
          }, 100),
        ),
    );

    const { result } = renderHook(
      () => useMutation<TestData, Error, TestVariables>({ mutationFn }),
      {
        wrapper: createWrapper(cache),
      },
    );

    // Start first mutation and capture the promise
    let promise1: Promise<TestData>;
    act(() => {
      promise1 = result.current.mutateAsync({ value: 1 });
    });

    // Start second mutation immediately (should supersede first)
    await delay(10);
    let promise2: Promise<TestData>;
    act(() => {
      promise2 = result.current.mutateAsync({ value: 2 });
    });

    // First mutation should be rejected with "Mutation superseded"
    await expect(promise1!).rejects.toThrow('Mutation superseded');

    // Second mutation should succeed
    const result2 = await promise2!;
    expect(result2).toEqual({ id: '1', value: 2 });
  });

  it('should track current mutation ID correctly with manual resolution', async () => {
    // Track resolvers by call index to avoid race condition
    const resolvers: Array<(value: TestData) => void> = [];
    const mutationFn = vi.fn().mockImplementation(
      (vars: TestVariables) =>
        new Promise<TestData>((resolve) => {
          resolvers.push((data: TestData) => {
            resolve({ ...data, value: vars.value });
          });
        }),
    );

    const { result } = renderHook(
      () => useMutation<TestData, Error, TestVariables>({ mutationFn }),
      {
        wrapper: createWrapper(cache),
      },
    );

    // Start first mutation and attach a catch handler immediately to prevent unhandled rejection
    let promise1: Promise<TestData>;
    let promise1Error: Error | null = null;
    await act(async () => {
      promise1 = result.current.mutateAsync({ value: 1 });
      // Attach catch handler immediately to prevent unhandled rejection warning
      promise1.catch((err: unknown) => {
        promise1Error = err instanceof Error ? err : new Error(String(err));
      });
      await delay(10);
    });

    // Start second mutation (supersedes first)
    let promise2: Promise<TestData>;
    await act(async () => {
      promise2 = result.current.mutateAsync({ value: 2 });
      await delay(10);
    });

    // Resolve first mutation (should be rejected because second superseded it)
    await act(async () => {
      resolvers[0]?.({ id: '1', value: 1 });
      await delay(10);
    });

    // Wait for the rejection to be handled
    await delay(20);

    // First mutation should have been rejected
    expect(promise1Error).not.toBeNull();
    expect(promise1Error?.message).toBe('Mutation superseded');

    // Now resolve second mutation
    await act(async () => {
      resolvers[1]?.({ id: '1', value: 2 });
      await delay(10);
    });

    const result2 = await promise2!;
    expect(result2).toEqual({ id: '1', value: 2 });
  });
});

// ============================================================================
// Tests: Edge Cases
// ============================================================================

describe('useMutation - Edge Cases', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cleanup();
    while (activeCaches.length > 0) {
      activeCaches.pop()?.destroy();
    }
    cache = new QueryCache();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
    while (activeCaches.length > 0) {
      activeCaches.pop()?.destroy();
    }
    cache?.destroy();
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it('should handle mutations with undefined variables', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ success: true });
    const { result } = renderHook(
      () => useMutation<{ success: boolean }, Error, undefined>({ mutationFn }),
      {
        wrapper: createWrapper(cache),
      },
    );

    // Ensure hook rendered without errors
    expect(result.error).toBeUndefined();
    expect(result.current).not.toBeNull();

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    expect(mutationFn).toHaveBeenCalledWith(undefined);
    expect(result.current.isSuccess).toBe(true);
  });

  it('should handle non-Error objects as errors', async () => {
    const errorString = 'Something went wrong';
    const mutationFn = vi.fn().mockRejectedValue(errorString);

    const { result } = renderHook(() => useMutation({ mutationFn }), {
      wrapper: createWrapper(cache),
    });

    expect(result.error).toBeUndefined();
    expect(result.current).not.toBeNull();

    await act(async () => {
      try {
        await result.current.mutateAsync({ value: 42 });
      } catch {
        // Expected error
      }
    });

    expect(result.current.isError).toBe(true);
    // Error should be wrapped in Error object
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should throw error when used without cache provider', () => {
    // Test that useMutation throws when used outside QueryCacheProvider
    // We capture the error by suppressing console.error and checking the result
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', value: 42 });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const { result } = renderHook(() => useMutation({ mutationFn }));
      // If we get here, check if the hook returned an error state
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain(
        'useQueryCache must be used within a QueryCacheProvider',
      );
    } catch (error) {
      // React 18 may throw directly during render
      expect(error).toBeDefined();
      expect((error as Error).message).toContain(
        'useQueryCache must be used within a QueryCacheProvider',
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('should preserve variables after mutation completes', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', value: 42 });
    const { result } = renderHook(
      () => useMutation<TestData, Error, TestVariables>({ mutationFn }),
      {
        wrapper: createWrapper(cache),
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.current).not.toBeNull();

    await act(async () => {
      await result.current.mutateAsync({ value: 42 });
    });

    expect(result.current.variables).toEqual({ value: 42 });
  });

  it('should handle empty invalidateOnSuccess array', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', value: 42 });
    const { result } = renderHook(() => useMutation({ mutationFn, invalidateOnSuccess: [] }), {
      wrapper: createWrapper(cache),
    });

    expect(result.error).toBeUndefined();
    expect(result.current).not.toBeNull();

    await act(async () => {
      await result.current.mutateAsync({ value: 42 });
    });

    expect(result.current.isSuccess).toBe(true);
  });

  it('should maintain stable function references', () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', value: 42 });
    const { result, rerender } = renderHook(() => useMutation({ mutationFn }), {
      wrapper: createWrapper(cache),
    });

    expect(result.error).toBeUndefined();
    expect(result.current).not.toBeNull();

    const firstMutate = result.current.mutate;
    const firstMutateAsync = result.current.mutateAsync;
    const firstReset = result.current.reset;

    rerender();

    // Functions should be stable across renders
    expect(result.current.mutate).toBe(firstMutate);
    expect(result.current.mutateAsync).toBe(firstMutateAsync);
    expect(result.current.reset).toBe(firstReset);
  });
});

// ============================================================================
// Tests: Options Updates
// ============================================================================

describe('useMutation - Options Updates', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cleanup();
    // Destroy any leftover caches
    while (activeCaches.length > 0) {
      const c = activeCaches.pop();
      c?.destroy();
    }
    cache = new QueryCache();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
    vi.clearAllMocks();
    // Destroy caches after test
    while (activeCaches.length > 0) {
      const c = activeCaches.pop();
      c?.destroy();
    }
    cache?.destroy();
    // Give time for async cleanup
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it('should use updated mutationFn', async () => {
    const mutationFn1 = vi.fn().mockResolvedValue({ id: '1', value: 1 });
    const mutationFn2 = vi.fn().mockResolvedValue({ id: '1', value: 2 });

    const { result, rerender } = renderHook(
      ({ mutationFn }: UseMutationOptions<TestData, Error, TestVariables>) =>
        useMutation({ mutationFn }),
      {
        wrapper: createWrapper(cache),
        initialProps: { mutationFn: mutationFn1 },
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.current).not.toBeNull();

    // First mutation
    await act(async () => {
      await result.current.mutateAsync({ value: 1 });
    });

    expect(mutationFn1).toHaveBeenCalled();
    expect(result.current.data).toEqual({ id: '1', value: 1 });

    // Update mutation function
    rerender({ mutationFn: mutationFn2 });

    // Second mutation with new function
    await act(async () => {
      await result.current.mutateAsync({ value: 2 });
    });

    expect(mutationFn2).toHaveBeenCalled();
    expect(result.current.data).toEqual({ id: '1', value: 2 });
  });

  it('should use updated callbacks', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', value: 42 });
    const onSuccess1 = vi.fn();
    const onSuccess2 = vi.fn();

    interface HookProps {
      onSuccess?: (
        data: TestData,
        variables: TestVariables,
        context: unknown,
      ) => void | Promise<void>;
    }

    const { result, rerender } = renderHook(
      ({ onSuccess }: HookProps) =>
        useMutation({ mutationFn, ...(onSuccess !== undefined && { onSuccess }) }),
      {
        wrapper: createWrapper(cache),
        initialProps: { onSuccess: onSuccess1 } as HookProps,
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.current).not.toBeNull();

    // First mutation
    await act(async () => {
      await result.current.mutateAsync({ value: 1 });
    });

    expect(onSuccess1).toHaveBeenCalled();
    expect(onSuccess2).not.toHaveBeenCalled();

    // Update callback
    rerender({ onSuccess: onSuccess2 });

    // Second mutation with new callback
    await act(async () => {
      await result.current.mutateAsync({ value: 2 });
    });

    expect(onSuccess2).toHaveBeenCalled();
  });
});
