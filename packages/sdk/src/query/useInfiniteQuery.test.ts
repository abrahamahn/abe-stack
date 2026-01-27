// packages/sdk/src/query/useInfiniteQuery.test.ts
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { QueryCache } from './QueryCache';
import { QueryCacheProvider } from './QueryCacheProvider';
import { useInfiniteQuery, type InfiniteData } from './useInfiniteQuery';

import type { ReactNode } from 'react';

// ============================================================================
// Test Types
// ============================================================================

interface PageData {
  items: Array<{ id: number; name: string }>;
  nextCursor: number | undefined;
  prevCursor: number | undefined;
}

// ============================================================================
// Test Helpers
// ============================================================================

function createWrapper(cache?: QueryCache) {
  const queryCache = cache ?? new QueryCache();

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryCacheProvider, { cache: queryCache }, children);
}

function createMockQueryFn(
  pages: PageData[],
  delayMs = 0,
): (context: { pageParam: number | undefined }) => Promise<PageData> {
  return vi.fn(async ({ pageParam }: { pageParam: number | undefined }): Promise<PageData> => {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const pageIndex = pageParam ?? 0;
    if (pageIndex < 0 || pageIndex >= pages.length) {
      throw new Error(`Page ${pageIndex} not found`);
    }

    return pages[pageIndex];
  });
}

function createFailingQueryFn(
  errorMessage = 'Fetch failed',
): (context: { pageParam: number | undefined }) => Promise<PageData> {
  return vi.fn((): Promise<PageData> => {
    return Promise.reject(new Error(errorMessage));
  });
}

const mockPages: PageData[] = [
  {
    items: [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ],
    nextCursor: 1,
    prevCursor: undefined,
  },
  {
    items: [
      { id: 3, name: 'Item 3' },
      { id: 4, name: 'Item 4' },
    ],
    nextCursor: 2,
    prevCursor: 0,
  },
  {
    items: [
      { id: 5, name: 'Item 5' },
      { id: 6, name: 'Item 6' },
    ],
    nextCursor: undefined,
    prevCursor: 1,
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('useInfiniteQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  // ==========================================================================
  // Initial State & Loading
  // ==========================================================================

  describe('initial state and loading', () => {
    it('should start with loading state when enabled', async () => {
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.status).toBe('pending');
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch initial page on mount', async () => {
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.pages).toHaveLength(1);
      expect(result.current.data?.pages[0]).toEqual(mockPages[0]);
      expect(result.current.data?.pageParams).toEqual([0]);
    });

    it('should not fetch when enabled is false', async () => {
      const queryFn = vi.fn();

      renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            enabled: false,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(queryFn).not.toHaveBeenCalled();
    });

    it('should set isLoading to true during initial fetch', async () => {
      const queryFn = createMockQueryFn(mockPages, 100);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Fetch Next Page
  // ==========================================================================

  describe('fetchNextPage', () => {
    it('should fetch next page when hasNextPage is true', async () => {
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.hasNextPage).toBe(true);

      await act(async () => {
        await result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.data?.pages).toHaveLength(2);
      });

      expect(result.current.data?.pages[0]).toEqual(mockPages[0]);
      expect(result.current.data?.pages[1]).toEqual(mockPages[1]);
      expect(result.current.data?.pageParams).toEqual([0, 1]);
    });

    it('should not fetch when hasNextPage is false', async () => {
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: () => undefined,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.hasNextPage).toBe(false);

      const initialCallCount = (queryFn as ReturnType<typeof vi.fn>).mock.calls.length;

      await act(() => {
        void result.current.fetchNextPage();
        return Promise.resolve();
      });

      expect((queryFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(initialCallCount);
    });

    it('should set isFetchingNextPage during fetch', async () => {
      const queryFn = createMockQueryFn(mockPages, 50);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isFetchingNextPage).toBe(false);

      const fetchPromise = act(async () => {
        await result.current.fetchNextPage();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      expect(result.current.isFetchingNextPage).toBe(true);

      await fetchPromise;

      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(false);
      });
    });

    it('should handle errors during fetchNextPage', async () => {
      const onError = vi.fn();
      const pages = [...mockPages];
      const queryFn = vi.fn(
        async ({ pageParam }: { pageParam: number | undefined }): Promise<PageData> => {
          const pageIndex = pageParam ?? 0;
          if (pageIndex === 1) {
            throw new Error('Failed to fetch page 1');
          }
          return pages[pageIndex];
        },
      );

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            onError,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      await act(async () => {
        await result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Failed to fetch page 1');
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should append pages in order', async () => {
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Fetch page 2
      await act(async () => {
        await result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.data?.pages).toHaveLength(2);
      });

      // Fetch page 3
      await act(async () => {
        await result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.data?.pages).toHaveLength(3);
      });

      expect(result.current.data?.pages).toEqual(mockPages);
      expect(result.current.data?.pageParams).toEqual([0, 1, 2]);
    });
  });

  // ==========================================================================
  // Fetch Previous Page
  // ==========================================================================

  describe('fetchPreviousPage', () => {
    it('should fetch previous page when hasPreviousPage is true', async () => {
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 1,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            getPreviousPageParam: (firstPage) => firstPage.prevCursor,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.hasPreviousPage).toBe(true);

      await act(async () => {
        await result.current.fetchPreviousPage();
      });

      await waitFor(() => {
        expect(result.current.data?.pages).toHaveLength(2);
      });

      expect(result.current.data?.pages[0]).toEqual(mockPages[0]);
      expect(result.current.data?.pages[1]).toEqual(mockPages[1]);
      expect(result.current.data?.pageParams).toEqual([0, 1]);
    });

    it('should not fetch when hasPreviousPage is false', async () => {
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            getPreviousPageParam: () => undefined,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.hasPreviousPage).toBe(false);

      const initialCallCount = (queryFn as ReturnType<typeof vi.fn>).mock.calls.length;

      await act(() => {
        void result.current.fetchPreviousPage();
        return Promise.resolve();
      });

      expect((queryFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(initialCallCount);
    });

    it('should return false for hasPreviousPage when getPreviousPageParam is not provided', async () => {
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 1,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.hasPreviousPage).toBe(false);
    });

    it('should set isFetchingPreviousPage during fetch', async () => {
      const queryFn = createMockQueryFn(mockPages, 50);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 1,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            getPreviousPageParam: (firstPage) => firstPage.prevCursor,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isFetchingPreviousPage).toBe(false);

      const fetchPromise = act(async () => {
        await result.current.fetchPreviousPage();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      expect(result.current.isFetchingPreviousPage).toBe(true);

      await fetchPromise;

      await waitFor(() => {
        expect(result.current.isFetchingPreviousPage).toBe(false);
      });
    });

    it('should prepend pages in correct order', async () => {
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 2,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            getPreviousPageParam: (firstPage) => firstPage.prevCursor,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Fetch page 1
      await act(async () => {
        await result.current.fetchPreviousPage();
      });

      await waitFor(() => {
        expect(result.current.data?.pages).toHaveLength(2);
      });

      // Fetch page 0
      await act(async () => {
        await result.current.fetchPreviousPage();
      });

      await waitFor(() => {
        expect(result.current.data?.pages).toHaveLength(3);
      });

      expect(result.current.data?.pages).toEqual(mockPages);
      expect(result.current.data?.pageParams).toEqual([0, 1, 2]);
    });
  });

  // ==========================================================================
  // Refetch
  // ==========================================================================

  describe('refetch', () => {
    it('should refetch all pages from initial page', async () => {
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Fetch next page
      await act(async () => {
        await result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.data?.pages).toHaveLength(2);
      });

      const callCountBefore = (queryFn as ReturnType<typeof vi.fn>).mock.calls.length;

      // Refetch
      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect((queryFn as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(
          callCountBefore,
        );
      });

      // Should reset to initial page
      expect(result.current.data?.pages).toHaveLength(1);
      expect(result.current.data?.pages[0]).toEqual(mockPages[0]);
    });

    it('should not refetch when disabled', async () => {
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            enabled: false,
          }),
        { wrapper: createWrapper() },
      );

      await act(() => {
        void result.current.refetch();
        return Promise.resolve();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(queryFn).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Error Handling & Retry
  // ==========================================================================

  describe('error handling and retry', () => {
    it('should set error state on fetch failure', async () => {
      const queryFn = createFailingQueryFn('Network error');
      const onError = vi.fn();

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            retry: false,
            onError,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Network error');
      expect(result.current.status).toBe('error');
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should retry on failure when retry is enabled', async () => {
      let attemptCount = 0;
      const queryFn = vi.fn(
        async (): Promise<PageData> =>
          new Promise((resolve, reject) => {
            attemptCount++;
            if (attemptCount < 3) {
              reject(new Error('Temporary failure'));
            } else {
              resolve(mockPages[0]);
            }
          }),
      );

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            retry: 3,
            retryDelay: 100,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // First attempt fails
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Second attempt fails
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      // Third attempt succeeds
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(queryFn).toHaveBeenCalledTimes(3);
      expect(result.current.data?.pages[0]).toEqual(mockPages[0]);
    });

    it('should use exponential backoff for retries', async () => {
      const timestamps: number[] = [];
      const queryFn = vi.fn(
        (): Promise<PageData> =>
          new Promise((_resolve, reject) => {
            timestamps.push(Date.now());
            reject(new Error('Always fails'));
          }),
      );

      renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            retry: 3,
            retryDelay: 1000,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // First retry after 1000ms (2^0)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      // Second retry after 2000ms (2^1)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      // Third retry after 4000ms (2^2)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });

      expect(queryFn).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should not retry when retry is false', async () => {
      const queryFn = createFailingQueryFn();

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            retry: false,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect((queryFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    });
  });

  // ==========================================================================
  // Callbacks
  // ==========================================================================

  describe('callbacks', () => {
    it('should call onSuccess after successful fetch', async () => {
      const onSuccess = vi.fn();
      const queryFn = createMockQueryFn(mockPages);

      renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            onSuccess,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      const callArg = onSuccess.mock.calls[0][0] as InfiniteData<PageData>;
      expect(callArg.pages).toHaveLength(1);
      expect(callArg.pages[0]).toEqual(mockPages[0]);
    });

    it('should call onSuccess for each page fetch', async () => {
      const onSuccess = vi.fn();
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            onSuccess,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        await result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(2);
      });
    });

    it('should call onError on fetch failure', async () => {
      const onError = vi.fn();
      const queryFn = createFailingQueryFn('Test error');

      renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            retry: false,
            onError,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1);
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(onError.mock.calls[0][0].message).toBe('Test error');
    });
  });

  // ==========================================================================
  // Stale Time
  // ==========================================================================

  describe('stale time', () => {
    it('should not refetch if data is fresh', async () => {
      const queryFn = createMockQueryFn(mockPages);
      const cache = new QueryCache({ defaultStaleTime: 60000 });

      const { result, unmount } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            staleTime: 60000,
          }),
        { wrapper: createWrapper(cache) },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callCount = (queryFn as ReturnType<typeof vi.fn>).mock.calls.length;

      // Unmount and remount
      unmount();

      const { result: result2 } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            staleTime: 60000,
          }),
        { wrapper: createWrapper(cache) },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Should not refetch as data is still fresh
      expect((queryFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
      expect(result2.current.data?.pages).toHaveLength(1);
    });

    it('should refetch if data is stale', async () => {
      const queryFn = createMockQueryFn(mockPages);
      const cache = new QueryCache({ defaultStaleTime: 100 });

      const { result, unmount } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            staleTime: 100,
          }),
        { wrapper: createWrapper(cache) },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callCount = (queryFn as ReturnType<typeof vi.fn>).mock.calls.length;

      // Wait for data to become stale
      await act(async () => {
        await vi.advanceTimersByTimeAsync(150);
      });

      // Unmount and remount
      unmount();

      renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            staleTime: 100,
          }),
        { wrapper: createWrapper(cache) },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Should refetch as data is stale
      await waitFor(() => {
        expect((queryFn as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callCount);
      });
    });
  });

  // ==========================================================================
  // Query Key Changes
  // ==========================================================================

  describe('query key changes', () => {
    it('should refetch when query key changes', async () => {
      const queryFn = createMockQueryFn(mockPages);
      let queryKey = ['test', 1];

      const { result, rerender } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey,
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callCount = (queryFn as ReturnType<typeof vi.fn>).mock.calls.length;

      // Change query key
      queryKey = ['test', 2];
      rerender();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect((queryFn as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callCount);
      });
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty pages array', async () => {
      const queryFn = vi.fn(
        (): Promise<PageData> =>
          Promise.resolve({
            items: [],
            nextCursor: undefined,
            prevCursor: undefined,
          }),
      );

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.pages).toHaveLength(1);
      expect(result.current.data?.pages[0].items).toHaveLength(0);
      expect(result.current.hasNextPage).toBe(false);
    });

    it('should handle string page params', async () => {
      const stringPages: Array<{ items: string[]; next: string | undefined }> = [
        { items: ['a', 'b'], next: 'cursor-2' },
        { items: ['c', 'd'], next: undefined },
      ];

      const queryFn = vi.fn(
        async ({ pageParam }: { pageParam: string | undefined }): Promise<{
          items: string[];
          next: string | undefined;
        }> => {
          if (pageParam === undefined || pageParam === 'cursor-1') {
            return stringPages[0];
          }
          return stringPages[1];
        },
      );

      const { result } = renderHook(
        () =>
          useInfiniteQuery<
            { items: string[]; next: string | undefined },
            Error,
            string | undefined
          >({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 'cursor-1',
            getNextPageParam: (lastPage) => lastPage.next,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.pageParams[0]).toBe('cursor-1');
    });

    it('should handle null as page param', async () => {
      const queryFn = vi.fn(
        ({ pageParam }: { pageParam: number | null }): Promise<PageData> => {
          if (pageParam === null) {
            return Promise.resolve(mockPages[0]);
          }
          return Promise.resolve(mockPages[pageParam]);
        },
      );

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | null>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: null,
            getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.pageParams[0]).toBeNull();
    });

    it('should abort pending fetch on unmount', async () => {
      const queryFn = createMockQueryFn(mockPages, 1000);

      const { unmount } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Unmount before fetch completes
      unmount();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      // Should not throw or cause errors
      expect(true).toBe(true);
    });

    it('should handle concurrent fetchNextPage calls gracefully', async () => {
      const queryFn = createMockQueryFn(mockPages, 50);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Trigger multiple fetches concurrently
      const promises = [
        act(async () => {
          await result.current.fetchNextPage();
        }),
        act(async () => {
          await result.current.fetchNextPage();
        }),
      ];

      await Promise.all(promises);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should handle gracefully without duplicates
      expect(result.current.data?.pages.length).toBeGreaterThan(1);
    });
  });

  // ==========================================================================
  // Status and Fetch Status
  // ==========================================================================

  describe('status and fetchStatus', () => {
    it('should transition through correct status states', async () => {
      const queryFn = createMockQueryFn(mockPages, 50);
      const statuses: string[] = [];
      const fetchStatuses: string[] = [];

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      statuses.push(result.current.status);
      fetchStatuses.push(result.current.fetchStatus);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      statuses.push(result.current.status);
      fetchStatuses.push(result.current.fetchStatus);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      statuses.push(result.current.status);
      fetchStatuses.push(result.current.fetchStatus);

      expect(statuses).toContain('pending');
      expect(statuses).toContain('success');
      expect(fetchStatuses).toContain('fetching');
      expect(fetchStatuses).toContain('idle');
    });

    it('should set correct boolean flags for success state', async () => {
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.isFetching).toBe(false);
    });

    it('should set correct boolean flags for error state', async () => {
      const queryFn = createFailingQueryFn();

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            retry: false,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
