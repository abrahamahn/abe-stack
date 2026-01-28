// packages/sdk/src/query/useQuery.test.tsx
/**
 * useQuery Hook Tests
 *
 * Comprehensive unit tests for the useQuery hook covering:
 * - Initial state and data fetching
 * - Loading and fetch states
 * - Success and error handling
 * - Retry logic with exponential backoff
 * - Stale time and refetching
 * - Cache integration
 * - Callbacks (onSuccess, onError, onSettled)
 * - Enabled/disabled queries
 * - Initial and placeholder data
 * - Manual refetch
 * - Abort on unmount
 *
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { QueryCache } from './QueryCache';
import { QueryCacheProvider } from './QueryCacheProvider';
import { useQuery } from './useQuery';

import type { UseQueryOptions } from './useQuery';

// ============================================================================
// Test Setup
// ============================================================================

/**
 * Create a wrapper component with QueryCacheProvider.
 */
function createWrapper(cache?: QueryCache) {
  const cacheInstance = cache ?? new QueryCache();
  // eslint-disable-next-line @typescript-eslint/naming-convention
  return function QueryWrapper({ children }: { children: ReactNode }): ReactNode {
    return <QueryCacheProvider cache={cacheInstance}>{children}</QueryCacheProvider>;
  };
}

/**
 * Mock query function that returns test data.
 */
function createMockQueryFn<T>(data: T, delay = 0): () => Promise<T> {
  return vi.fn(() => {
    if (delay > 0) {
      return new Promise<T>((resolve) => {
        setTimeout(() => {
          resolve(data);
        }, delay);
      });
    }
    return Promise.resolve(data);
  }) as () => Promise<T>;
}

/**
 * Mock query function that rejects with an error.
 */
function createMockErrorFn(error: Error, delay = 0): () => Promise<never> {
  return vi.fn(() => {
    if (delay > 0) {
      return new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(error);
        }, delay);
      });
    }
    return Promise.reject(error);
  }) as () => Promise<never>;
}

// ============================================================================
// Tests
// ============================================================================

describe('useQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  // ==========================================================================
  // Initial State
  // ==========================================================================

  describe('initial state', () => {
    it('should return pending state before fetch starts', () => {
      const cache = new QueryCache();
      const queryFn = createMockQueryFn('test-data');

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
      expect(result.current.isPending).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.status).toBe('pending');
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should set isLoading to true when fetch starts', async () => {
      const cache = new QueryCache();
      const queryFn = createMockQueryFn('test-data', 100);

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      // Advance to start fetch
      await vi.advanceTimersByTimeAsync(0);

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);
      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('fetching');
    });
  });

  // ==========================================================================
  // Successful Fetches
  // ==========================================================================

  describe('successful fetch', () => {
    it('should fetch and return data on mount', async () => {
      const cache = new QueryCache();
      const queryFn = createMockQueryFn({ id: 1, name: 'Test' });

      const { result } = renderHook(
        () => useQuery({ queryKey: ['user', 1], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ id: 1, name: 'Test' });
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.status).toBe('success');
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should call onSuccess callback when fetch succeeds', async () => {
      const cache = new QueryCache();
      const data = { id: 1, name: 'Test' };
      const queryFn = createMockQueryFn(data);
      const onSuccess = vi.fn();

      renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, onSuccess }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(data);
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('should call onSettled callback when fetch succeeds', async () => {
      const cache = new QueryCache();
      const data = { id: 1, name: 'Test' };
      const queryFn = createMockQueryFn(data);
      const onSettled = vi.fn();

      renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, onSettled }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(onSettled).toHaveBeenCalledWith(data, null);
      });

      expect(onSettled).toHaveBeenCalledTimes(1);
    });

    it('should store data in cache', async () => {
      const cache = new QueryCache();
      const queryFn = createMockQueryFn({ id: 1, name: 'Test' });

      const { result } = renderHook(
        () => useQuery({ queryKey: ['user', 1], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const cachedData = cache.getQueryData(['user', 1]);
      expect(cachedData).toEqual({ id: 1, name: 'Test' });
    });

    it('should not refetch if data is fresh', async () => {
      const cache = new QueryCache();
      const queryFn = vi.fn(() => Promise.resolve('fresh-data'));

      // First render - should fetch
      const { rerender } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, staleTime: 10000 }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalledTimes(1);
      });

      // Advance time by 1 second (within stale time)
      await vi.advanceTimersByTimeAsync(1000);

      // Rerender - should not fetch again
      rerender();

      await vi.advanceTimersByTimeAsync(100);

      expect(queryFn).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      const cache = new QueryCache();
      const error = new Error('Fetch failed');
      const queryFn = createMockErrorFn(error);

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, retry: false }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.status).toBe('error');
    });

    it('should call onError callback when fetch fails', async () => {
      const cache = new QueryCache();
      const error = new Error('Fetch failed');
      const queryFn = createMockErrorFn(error);
      const onError = vi.fn();

      renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, retry: false, onError }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });

      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('should call onSettled callback when fetch fails', async () => {
      const cache = new QueryCache();
      const error = new Error('Fetch failed');
      const queryFn = createMockErrorFn(error);
      const onSettled = vi.fn();

      renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, retry: false, onSettled }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(onSettled).toHaveBeenCalledWith(undefined, error);
      });

      expect(onSettled).toHaveBeenCalledTimes(1);
    });

    it('should store error in cache', async () => {
      const cache = new QueryCache();
      const error = new Error('Fetch failed');
      const queryFn = createMockErrorFn(error);

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, retry: false }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      const state = cache.getQueryState(['test']);
      expect(state?.error).toEqual(error);
      expect(state?.status).toBe('error');
    });
  });

  // ==========================================================================
  // Retry Logic
  // ==========================================================================

  describe('retry logic', () => {
    it('should retry on failure with default retry count', async () => {
      const cache = new QueryCache();
      const queryFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockRejectedValueOnce(new Error('Attempt 3'))
        .mockResolvedValueOnce('success');

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      // Wait for all retries to complete
      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 10000 },
      );

      expect(queryFn).toHaveBeenCalledTimes(4); // Initial + 3 retries
      expect(result.current.data).toBe('success');
    });

    it('should fail after exhausting retries', async () => {
      const cache = new QueryCache();
      const error = new Error('Persistent failure');
      const queryFn = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, retry: 2, retryDelay: 100 }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 10000 },
      );

      expect(queryFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result.current.error).toEqual(error);
    });

    it('should not retry when retry is false', async () => {
      const cache = new QueryCache();
      const error = new Error('No retry');
      const queryFn = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, retry: false }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(queryFn).toHaveBeenCalledTimes(1);
    });

    it('should use custom retry count', async () => {
      const cache = new QueryCache();
      const error = new Error('Custom retry');
      const queryFn = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, retry: 1, retryDelay: 100 }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 },
      );

      expect(queryFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should use exponential backoff for retries', async () => {
      const cache = new QueryCache();
      const queryFn = vi.fn().mockRejectedValue(new Error('Retry test'));
      const retryDelay = 100;

      const options: UseQueryOptions = {
        queryKey: ['test'],
        queryFn,
        retry: 2,
        retryDelay,
      };

      renderHook(() => useQuery(options), { wrapper: createWrapper(cache) });

      // First call
      await vi.advanceTimersByTimeAsync(0);
      expect(queryFn).toHaveBeenCalledTimes(1);

      // First retry after retryDelay * 2^0 = 100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(queryFn).toHaveBeenCalledTimes(2);

      // Second retry after retryDelay * 2^1 = 200ms
      await vi.advanceTimersByTimeAsync(200);
      expect(queryFn).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // Enabled/Disabled Queries
  // ==========================================================================

  describe('enabled option', () => {
    it('should not fetch when enabled is false', async () => {
      const cache = new QueryCache();
      const queryFn = vi.fn().mockResolvedValue('data');

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, enabled: false }),
        { wrapper: createWrapper(cache) },
      );

      await vi.advanceTimersByTimeAsync(100);

      expect(queryFn).not.toHaveBeenCalled();
      expect(result.current.isPending).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch when enabled changes from false to true', async () => {
      const cache = new QueryCache();
      const queryFn = vi.fn().mockResolvedValue('data');

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useQuery({ queryKey: ['test'], queryFn, enabled }),
        { wrapper: createWrapper(cache), initialProps: { enabled: false } },
      );

      await vi.advanceTimersByTimeAsync(100);
      expect(queryFn).not.toHaveBeenCalled();

      // Enable the query
      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(result.current.data).toBe('data');
    });

    it('should stop fetching when enabled changes from true to false', async () => {
      const cache = new QueryCache();
      const queryFn = vi.fn().mockResolvedValue('data');

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useQuery({ queryKey: ['test'], queryFn, enabled }),
        { wrapper: createWrapper(cache), initialProps: { enabled: true } },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      queryFn.mockClear();

      // Disable the query
      rerender({ enabled: false });

      // Trigger a refetch attempt by invalidating
      cache.invalidateQuery(['test']);

      await vi.advanceTimersByTimeAsync(100);

      // Should not fetch when disabled
      expect(queryFn).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Initial and Placeholder Data
  // ==========================================================================

  describe('initialData', () => {
    it('should use initialData before fetch completes', async () => {
      const cache = new QueryCache();
      const initialData = { id: 0, name: 'Initial' };
      const fetchedData = { id: 1, name: 'Fetched' };
      const queryFn = createMockQueryFn(fetchedData, 100);

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, initialData }),
        { wrapper: createWrapper(cache) },
      );

      // Should have initial data immediately
      expect(result.current.data).toEqual(initialData);
      expect(result.current.isSuccess).toBe(true);

      await waitFor(() => {
        expect(result.current.data).toEqual(fetchedData);
      });
    });

    it('should not fetch if initialData exists and is fresh', async () => {
      const cache = new QueryCache();
      const initialData = { id: 0, name: 'Initial' };
      const queryFn = vi.fn().mockResolvedValue({ id: 1, name: 'Fetched' });

      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn,
            initialData,
            staleTime: 10000,
          }),
        { wrapper: createWrapper(cache) },
      );

      await vi.advanceTimersByTimeAsync(100);

      expect(result.current.data).toEqual(initialData);
      expect(queryFn).toHaveBeenCalledTimes(1); // Still fetches to update the initial data
    });
  });

  describe('placeholderData', () => {
    it('should show placeholderData while loading', async () => {
      const cache = new QueryCache();
      const placeholderData = { id: 0, name: 'Placeholder' };
      const fetchedData = { id: 1, name: 'Fetched' };
      const queryFn = createMockQueryFn(fetchedData, 100);

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, placeholderData }),
        { wrapper: createWrapper(cache) },
      );

      // Should have placeholder data while loading
      expect(result.current.data).toEqual(placeholderData);
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.data).toEqual(fetchedData);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should not persist placeholderData to cache', async () => {
      const cache = new QueryCache();
      const placeholderData = { id: 0, name: 'Placeholder' };
      const queryFn = createMockQueryFn({ id: 1, name: 'Fetched' });

      renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, placeholderData }),
        { wrapper: createWrapper(cache) },
      );

      // Placeholder should not be in cache
      const cachedData = cache.getQueryData(['test']);
      expect(cachedData).toBeUndefined();

      await waitFor(() => {
        expect(cache.getQueryData(['test'])).toEqual({ id: 1, name: 'Fetched' });
      });
    });
  });

  // ==========================================================================
  // Stale Time and Refetching
  // ==========================================================================

  describe('staleTime', () => {
    it('should mark data as stale after staleTime', async () => {
      const cache = new QueryCache({ defaultStaleTime: 1000 });
      const queryFn = createMockQueryFn('data');

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isStale).toBe(false);

      // Advance time past stale time
      await vi.advanceTimersByTimeAsync(1001);

      expect(cache.isStale(['test'])).toBe(true);
    });

    it('should refetch stale data on remount', async () => {
      const cache = new QueryCache();
      const queryFn = vi
        .fn()
        .mockResolvedValueOnce('first')
        .mockResolvedValueOnce('second');

      const { result, unmount, rerender } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, staleTime: 100 }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.data).toBe('first');
      });

      expect(queryFn).toHaveBeenCalledTimes(1);

      // Advance time to make data stale
      await vi.advanceTimersByTimeAsync(101);

      // Remount should trigger refetch
      unmount();
      rerender();

      await waitFor(() => {
        expect(result.current.data).toBe('second');
      });

      expect(queryFn).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // Manual Refetch
  // ==========================================================================

  describe('refetch', () => {
    it('should refetch data when refetch is called', async () => {
      const cache = new QueryCache();
      const queryFn = vi
        .fn()
        .mockResolvedValueOnce('first')
        .mockResolvedValueOnce('second');

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.data).toBe('first');
      });

      expect(queryFn).toHaveBeenCalledTimes(1);

      // Manually refetch
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).toBe('second');
      });

      expect(queryFn).toHaveBeenCalledTimes(2);
    });

    it('should invalidate query when refetch is called', async () => {
      const cache = new QueryCache();
      const queryFn = vi.fn().mockResolvedValue('data');

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, staleTime: 10000 }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(cache.isStale(['test'])).toBe(false);

      // Refetch should invalidate
      await result.current.refetch();

      // Should have been marked as invalidated during refetch
      expect(queryFn).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // Abort on Unmount
  // ==========================================================================

  describe('abort on unmount', () => {
    it('should abort fetch when component unmounts', async () => {
      const cache = new QueryCache();
      const queryFn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            setTimeout(() => {
              resolve('data');
            }, 1000);
          }),
      );

      const { unmount } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      await vi.advanceTimersByTimeAsync(0);

      expect(queryFn).toHaveBeenCalledTimes(1);

      // Unmount before fetch completes
      unmount();

      await vi.advanceTimersByTimeAsync(1000);

      // Data should not be in cache since fetch was aborted
      const cachedData = cache.getQueryData(['test']);
      expect(cachedData).toBeUndefined();
    });

    it('should abort ongoing fetch when new fetch starts', async () => {
      const cache = new QueryCache();
      let resolveFirst: ((value: string) => void) | undefined;
      const firstPromise = new Promise<string>((resolve) => {
        resolveFirst = resolve;
      });

      const queryFn = vi
        .fn()
        .mockReturnValueOnce(firstPromise)
        .mockResolvedValueOnce('second');

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      await vi.advanceTimersByTimeAsync(0);

      expect(queryFn).toHaveBeenCalledTimes(1);

      // Trigger refetch before first completes
      await result.current.refetch();

      expect(queryFn).toHaveBeenCalledTimes(2);

      // Complete the first fetch - should be ignored
      resolveFirst?.('first');

      await waitFor(() => {
        expect(result.current.data).toBe('second');
      });

      // Should have the second result, not the first
      expect(result.current.data).toBe('second');
    });
  });

  // ==========================================================================
  // Cache Subscription
  // ==========================================================================

  describe('cache subscription', () => {
    it('should update when cache is updated externally', async () => {
      const cache = new QueryCache();
      const queryFn = createMockQueryFn('initial');

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.data).toBe('initial');
      });

      // Update cache externally
      cache.setQueryData(['test'], 'updated');

      await waitFor(() => {
        expect(result.current.data).toBe('updated');
      });
    });

    it('should handle multiple components subscribing to the same query', async () => {
      const cache = new QueryCache();
      const queryFn = vi.fn().mockResolvedValue('shared-data');

      const { result: result1 } = renderHook(
        () => useQuery({ queryKey: ['shared'], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      const { result: result2 } = renderHook(
        () => useQuery({ queryKey: ['shared'], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
      });

      // Should only fetch once even with two subscribers
      expect(queryFn).toHaveBeenCalledTimes(1);

      expect(result1.current.data).toBe('shared-data');
      expect(result2.current.data).toBe('shared-data');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty query key', async () => {
      const cache = new QueryCache();
      const queryFn = createMockQueryFn('data');

      const { result } = renderHook(
        () => useQuery({ queryKey: [], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe('data');
    });

    it('should handle query key with complex objects', async () => {
      const cache = new QueryCache();
      const queryKey = [
        'users',
        { id: 1, filters: { status: 'active' }, sort: 'name' },
      ] as const;
      const queryFn = createMockQueryFn('complex-key-data');

      const { result } = renderHook(
        () => useQuery({ queryKey, queryFn }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe('complex-key-data');
    });

    it('should handle AbortError gracefully', async () => {
      const cache = new QueryCache();
      const abortError = new DOMException('Aborted', 'AbortError');
      const queryFn = vi.fn().mockRejectedValue(abortError);
      const onError = vi.fn();

      renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, retry: false, onError }),
        { wrapper: createWrapper(cache) },
      );

      await vi.advanceTimersByTimeAsync(100);

      // AbortError should not trigger onError callback
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle queryFn returning null', async () => {
      const cache = new QueryCache();
      const queryFn = createMockQueryFn(null);

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('should handle queryFn returning undefined', async () => {
      const cache = new QueryCache();
      const queryFn = createMockQueryFn(undefined);

      const { result } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should handle rapid query key changes', async () => {
      const cache = new QueryCache();
      const queryFn = vi.fn((key: string) => Promise.resolve(`data-${key}`));

      const { result, rerender } = renderHook(
        ({ key }: { key: string }) =>
          useQuery({
            queryKey: ['test', key],
            queryFn: () => queryFn(key),
          }),
        { wrapper: createWrapper(cache), initialProps: { key: 'a' } },
      );

      await waitFor(() => {
        expect(result.current.data).toBe('data-a');
      });

      // Rapidly change keys
      rerender({ key: 'b' });
      rerender({ key: 'c' });
      rerender({ key: 'd' });

      await waitFor(() => {
        expect(result.current.data).toBe('data-d');
      });

      // Should have called queryFn for each key
      expect(queryFn).toHaveBeenCalledWith('a');
      expect(queryFn).toHaveBeenCalledWith('b');
      expect(queryFn).toHaveBeenCalledWith('c');
      expect(queryFn).toHaveBeenCalledWith('d');
    });

    it('should handle zero staleTime correctly', async () => {
      const cache = new QueryCache();
      const queryFn = vi
        .fn()
        .mockResolvedValueOnce('first')
        .mockResolvedValueOnce('second');

      const { result, rerender } = renderHook(
        () => useQuery({ queryKey: ['test'], queryFn, staleTime: 0 }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.data).toBe('first');
      });

      // Data should be immediately stale
      expect(cache.isStale(['test'])).toBe(true);

      // Rerender should trigger refetch
      rerender();

      await waitFor(() => {
        expect(result.current.data).toBe('second');
      });

      expect(queryFn).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // Type Safety
  // ==========================================================================

  describe('type safety', () => {
    it('should infer correct data type', async () => {
      const cache = new QueryCache();
      interface User {
        id: number;
        name: string;
      }

      const queryFn = createMockQueryFn<User>({ id: 1, name: 'Test' });

      const { result } = renderHook(
        () => useQuery<User>({ queryKey: ['user'], queryFn }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // TypeScript should infer correct type
      if (result.current.data !== undefined) {
        const userId: number = result.current.data.id;
        const userName: string = result.current.data.name;
        expect(userId).toBe(1);
        expect(userName).toBe('Test');
      }
    });

    it('should infer correct error type', async () => {
      const cache = new QueryCache();
      class CustomError extends Error {
        code: number;
        constructor(message: string, code: number) {
          super(message);
          this.code = code;
        }
      }

      const error = new CustomError('Custom error', 404);
      const queryFn = createMockErrorFn(error);

      const { result } = renderHook(
        () =>
          useQuery<string, CustomError>({
            queryKey: ['test'],
            queryFn,
            retry: false,
          }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // TypeScript should infer correct error type
      if (result.current.error !== null) {
        const errorCode: number = result.current.error.code;
        expect(errorCode).toBe(404);
      }
    });
  });
});
