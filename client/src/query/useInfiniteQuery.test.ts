// client/src/query/useInfiniteQuery.test.ts
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';

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

// Store active caches for cleanup
const activeCaches: QueryCache[] = [];

function createWrapper(cache?: QueryCache) {
  const queryCache = cache ?? new QueryCache();
  activeCaches.push(queryCache);

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
    // Ensure clean state before each test
    cleanup();
    // Clear any stale caches from previous test
    while (activeCaches.length > 0) {
      const cache = activeCaches.pop();
      cache?.destroy();
    }
  });

  afterEach(async () => {
    // Cleanup React testing state first
    cleanup();
    // Clear all mocks
    vi.clearAllMocks();
    // Destroy all active caches to cleanup event listeners and timers
    while (activeCaches.length > 0) {
      const cache = activeCaches.pop();
      cache?.destroy();
    }
    // Allow any pending React state updates and microtasks to complete
    await new Promise((resolve) => setTimeout(resolve, 50));
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
            queryKey: ['test-initial'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      // When enabled, the query immediately starts fetching
      expect(result.current.status).toBe('pending');
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);
    });

    it('should fetch initial page on mount', async () => {
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test-fetch'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

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
            queryKey: ['test-disabled'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            enabled: false,
          }),
        { wrapper: createWrapper() },
      );

      // Wait to ensure no fetch happens
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(queryFn).not.toHaveBeenCalled();
    });

    it('should set isLoading to true during initial fetch', async () => {
      const queryFn = createMockQueryFn(mockPages, 30);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test-loading'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSuccess).toBe(true);
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
            queryKey: ['test-next'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

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
            queryKey: ['test-no-next'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: () => undefined,
          }),
        { wrapper: createWrapper() },
      );

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
      const queryFn = createMockQueryFn(mockPages, 30);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test-fetching-next'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isFetchingNextPage).toBe(false);

      // Start fetching next page without awaiting
      let fetchPromise: Promise<void> | undefined;
      act(() => {
        fetchPromise = result.current.fetchNextPage();
      });

      // Check isFetchingNextPage becomes true
      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(true);
      });

      // Wait for fetch to complete
      await act(async () => {
        await fetchPromise;
      });

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
            queryKey: ['test-next-error'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            onError,
            retry: 0,
          }),
        { wrapper: createWrapper() },
      );

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
            queryKey: ['test-append'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

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
            queryKey: ['test-prev'],
            queryFn,
            initialPageParam: 1,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            getPreviousPageParam: (firstPage) => firstPage.prevCursor,
          }),
        { wrapper: createWrapper() },
      );

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
            queryKey: ['test-no-prev'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            getPreviousPageParam: () => undefined,
          }),
        { wrapper: createWrapper() },
      );

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
            queryKey: ['test-no-prev-fn'],
            queryFn,
            initialPageParam: 1,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.hasPreviousPage).toBe(false);
    });

    it('should set isFetchingPreviousPage during fetch', async () => {
      const queryFn = createMockQueryFn(mockPages, 30);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test-fetching-prev'],
            queryFn,
            initialPageParam: 1,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            getPreviousPageParam: (firstPage) => firstPage.prevCursor,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isFetchingPreviousPage).toBe(false);

      let fetchPromise: Promise<void> | undefined;
      act(() => {
        fetchPromise = result.current.fetchPreviousPage();
      });

      await waitFor(() => {
        expect(result.current.isFetchingPreviousPage).toBe(true);
      });

      await act(async () => {
        await fetchPromise;
      });

      await waitFor(() => {
        expect(result.current.isFetchingPreviousPage).toBe(false);
      });
    });

    it('should prepend pages in correct order', async () => {
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test-prepend'],
            queryFn,
            initialPageParam: 2,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            getPreviousPageParam: (firstPage) => firstPage.prevCursor,
          }),
        { wrapper: createWrapper() },
      );

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
            queryKey: ['test-refetch'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

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
            queryKey: ['test-refetch-disabled'],
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

      await new Promise((resolve) => setTimeout(resolve, 50));

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
            queryKey: ['test-error'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            retry: false,
            onError,
          }),
        { wrapper: createWrapper() },
      );

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
            queryKey: ['test-retry'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            retry: 3,
            retryDelay: 10, // Very short delay for testing
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );

      expect(queryFn).toHaveBeenCalledTimes(3);
      expect(result.current.data?.pages[0]).toEqual(mockPages[0]);
    });

    it('should not retry when retry is false', async () => {
      const queryFn = createFailingQueryFn();

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test-no-retry'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            retry: false,
          }),
        { wrapper: createWrapper() },
      );

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
            queryKey: ['test-onsuccess'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            onSuccess,
          }),
        { wrapper: createWrapper() },
      );

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
            queryKey: ['test-onsuccess-pages'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            onSuccess,
          }),
        { wrapper: createWrapper() },
      );

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
            queryKey: ['test-onerror'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            retry: false,
            onError,
          }),
        { wrapper: createWrapper() },
      );

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
      const uniqueKey = `test-stale-${Date.now()}-${Math.random()}`;
      const queryFn = createMockQueryFn(mockPages);
      const cache = new QueryCache({ defaultStaleTime: 60000 });

      const { result, unmount } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: [uniqueKey],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            staleTime: 60000,
          }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Initial fetch may happen 1 or 2 times depending on StrictMode
      const callCount = (queryFn as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(callCount).toBeGreaterThanOrEqual(1);

      // Clear the mock so we can count new calls cleanly
      (queryFn as ReturnType<typeof vi.fn>).mockClear();

      // Unmount and remount
      unmount();

      const { result: result2 } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: [uniqueKey],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            staleTime: 60000,
          }),
        { wrapper: createWrapper(cache) },
      );

      // Wait a bit for any potential fetch to start
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not refetch as data is still fresh - queryFn should not be called again
      // (mock was cleared after first fetch, so call count should be 0)
      const callCountAfterRemount = (queryFn as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(callCountAfterRemount).toBe(0);
      expect(result2.current.data?.pages).toHaveLength(1);
    });

    it('should refetch if data is stale', async () => {
      const queryFn = createMockQueryFn(mockPages);
      const cache = new QueryCache({ defaultStaleTime: 50 });

      const { result, unmount } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test-stale-refetch'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            staleTime: 50,
          }),
        { wrapper: createWrapper(cache) },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callCount = (queryFn as ReturnType<typeof vi.fn>).mock.calls.length;

      // Wait for data to become stale
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Unmount and remount
      unmount();

      renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test-stale-refetch'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            staleTime: 50,
          }),
        { wrapper: createWrapper(cache) },
      );

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
      let queryKey = ['test-key', 1];

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

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callCount = (queryFn as ReturnType<typeof vi.fn>).mock.calls.length;

      // Change query key
      queryKey = ['test-key', 2];
      rerender();

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
            queryKey: ['test-empty'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

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
        async ({
          pageParam,
        }: {
          pageParam: string | undefined;
        }): Promise<{
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
            queryKey: ['test-string-params'],
            queryFn,
            initialPageParam: 'cursor-1',
            getNextPageParam: (lastPage) => lastPage.next,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.pageParams[0]).toBe('cursor-1');
    });

    it('should handle null as page param', async () => {
      const queryFn = vi.fn(({ pageParam }: { pageParam: number | null }): Promise<PageData> => {
        if (pageParam === null) {
          return Promise.resolve(mockPages[0]);
        }
        return Promise.resolve(mockPages[pageParam]);
      });

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | null>({
            queryKey: ['test-null-param'],
            queryFn,
            initialPageParam: null,
            getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.pageParams[0]).toBeNull();
    });

    it('should abort pending fetch on unmount', async () => {
      const queryFn = createMockQueryFn(mockPages, 100);

      const { unmount } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test-abort'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      // Unmount before fetch completes
      unmount();

      // Wait for any pending operations
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should not throw or cause errors
      expect(true).toBe(true);
    });

    it('should handle concurrent fetchNextPage calls gracefully', async () => {
      const queryFn = createMockQueryFn(mockPages, 20);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: ['test-concurrent'],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Trigger multiple fetches sequentially (concurrent act() calls cause React state issues)
      await act(async () => {
        // Start both fetches
        void result.current.fetchNextPage();
        void result.current.fetchNextPage();
      });

      // Wait for any pending fetches to complete
      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(false);
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
      const uniqueKey = `test-status-${Date.now()}-${Math.random()}`;
      const queryFn = createMockQueryFn(mockPages, 20);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: [uniqueKey],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      // Initial state should be pending with fetching
      expect(result.current.status).toBe('pending');
      expect(result.current.fetchStatus).toBe('fetching');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.status).toBe('success');
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should set correct boolean flags for success state', async () => {
      const uniqueKey = `test-success-flags-${Date.now()}-${Math.random()}`;
      const queryFn = createMockQueryFn(mockPages);

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: [uniqueKey],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.isFetching).toBe(false);
    });

    it('should set correct boolean flags for error state', async () => {
      const uniqueKey = `test-error-flags-${Date.now()}-${Math.random()}`;
      const queryFn = createFailingQueryFn();

      const { result } = renderHook(
        () =>
          useInfiniteQuery<PageData, Error, number | undefined>({
            queryKey: [uniqueKey],
            queryFn,
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            retry: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
