// packages/sdk/src/search/hooks.test.ts
/**
 * @vitest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi, beforeEach } from 'vitest';

import { QueryCacheProvider } from '../query/QueryCacheProvider';
import { useSearch, useInfiniteSearch, useSearchParams, useDebounceSearch } from './hooks';

import type { CursorSearchResult, SearchResult } from '@abe-stack/core';

// Helper to create wrapper with QueryCacheProvider
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryCacheProvider, { options: { defaultGcTime: 0 } }, children);
  };
}

interface TestUser {
  id: string;
  name: string;
  email: string;
}

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should execute search function with query', async () => {
    const mockSearchFn = vi.fn().mockResolvedValue({
      data: [{ item: { id: '1', name: 'John' }, score: 1 }],
      page: 1,
      limit: 10,
      hasNext: false,
      hasPrev: false,
    } as SearchResult<TestUser>);

    const { result } = renderHook(
      () => useSearch<TestUser>(mockSearchFn, { initialQuery: { limit: 10 } }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockSearchFn).toHaveBeenCalledWith({ limit: 10 });
    expect(result.current.data?.data).toHaveLength(1);
  });

  test('should update query with setQuery', async () => {
    const mockSearchFn = vi.fn().mockResolvedValue({
      data: [],
      page: 1,
      limit: 10,
      hasNext: false,
      hasPrev: false,
    } as SearchResult<TestUser>);

    const { result } = renderHook(() => useSearch<TestUser>(mockSearchFn), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setQuery({ page: 2, limit: 25 });
    });

    await waitFor(() => {
      expect(mockSearchFn).toHaveBeenLastCalledWith({ page: 2, limit: 25 });
    });
  });

  test('should update search text with setSearch', async () => {
    const mockSearchFn = vi.fn().mockResolvedValue({
      data: [],
      page: 1,
      limit: 10,
      hasNext: false,
      hasPrev: false,
    } as SearchResult<TestUser>);

    const { result } = renderHook(
      () => useSearch<TestUser>(mockSearchFn, { initialQuery: { page: 2 } }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSearch('test query');
    });

    await waitFor(() => {
      expect(mockSearchFn).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: { query: 'test query' },
          page: 1, // Should reset to page 1
        }),
      );
    });
  });

  test('should update page with setPage', async () => {
    const mockSearchFn = vi.fn().mockResolvedValue({
      data: [],
      page: 1,
      limit: 10,
      hasNext: true,
      hasPrev: false,
    } as SearchResult<TestUser>);

    const { result } = renderHook(() => useSearch<TestUser>(mockSearchFn), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setPage(3);
    });

    await waitFor(() => {
      expect(mockSearchFn).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 }));
    });
  });

  test('should update sort with setSort', async () => {
    const mockSearchFn = vi.fn().mockResolvedValue({
      data: [],
      page: 1,
      limit: 10,
      hasNext: false,
      hasPrev: false,
    } as SearchResult<TestUser>);

    const { result } = renderHook(() => useSearch<TestUser>(mockSearchFn), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSort('name', 'desc');
    });

    await waitFor(() => {
      expect(mockSearchFn).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sort: [{ field: 'name', order: 'desc' }],
          page: 1,
        }),
      );
    });
  });

  test('should clear filters with clearFilters', async () => {
    const mockSearchFn = vi.fn().mockResolvedValue({
      data: [],
      page: 1,
      limit: 10,
      hasNext: false,
      hasPrev: false,
    } as SearchResult<TestUser>);

    const { result } = renderHook(
      () =>
        useSearch<TestUser>(mockSearchFn, {
          initialQuery: {
            filters: { field: 'status', operator: 'eq', value: 'active' },
            search: { query: 'test' },
            page: 3,
          },
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.clearFilters();
    });

    await waitFor(() => {
      expect(mockSearchFn).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: undefined,
          search: undefined,
          page: 1,
        }),
      );
    });
  });

  test('should handle error states', async () => {
    const error = new Error('Search failed');
    const mockSearchFn = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useSearch<TestUser>(mockSearchFn, { retry: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.isLoading).toBe(false);
  });

  test('should provide query builder', async () => {
    const mockSearchFn = vi.fn().mockResolvedValue({
      data: [],
      page: 1,
      limit: 10,
      hasNext: false,
      hasPrev: false,
    } as SearchResult<TestUser>);

    const { result } = renderHook(
      () =>
        useSearch<TestUser>(mockSearchFn, {
          initialQuery: { page: 2, limit: 25 },
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.builder).toBeDefined();
    expect(typeof result.current.builder.build).toBe('function');
  });
});

describe('useInfiniteSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should execute search function', async () => {
    const mockSearchFn = vi.fn().mockResolvedValue({
      data: [{ item: { id: '1', name: 'John' }, score: 1 }],
      limit: 10,
      hasNext: true,
      nextCursor: 'cursor-1',
    } as CursorSearchResult<TestUser>);

    const { result } = renderHook(
      () => useInfiniteSearch<TestUser>(mockSearchFn, { initialQuery: { limit: 10 } }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockSearchFn).toHaveBeenCalledWith({ limit: 10, cursor: undefined });
    expect(result.current.data).toHaveLength(1);
    expect(result.current.hasNextPage).toBe(true);
  });

  test('should fetch next page', async () => {
    const mockSearchFn = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ item: { id: '1', name: 'John' }, score: 1 }],
        limit: 10,
        hasNext: true,
        nextCursor: 'cursor-1',
      } as CursorSearchResult<TestUser>)
      .mockResolvedValueOnce({
        data: [{ item: { id: '2', name: 'Jane' }, score: 1 }],
        limit: 10,
        hasNext: false,
        nextCursor: undefined,
      } as CursorSearchResult<TestUser>);

    const { result } = renderHook(
      () => useInfiniteSearch<TestUser>(mockSearchFn, { initialQuery: { limit: 10 } }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });

    expect(mockSearchFn).toHaveBeenLastCalledWith({ limit: 10, cursor: 'cursor-1' });
  });

  test('should flatten data from all pages', async () => {
    const mockSearchFn = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          { item: { id: '1', name: 'John' }, score: 1 },
          { item: { id: '2', name: 'Jane' }, score: 0.9 },
        ],
        limit: 2,
        hasNext: true,
        nextCursor: 'cursor-1',
      } as CursorSearchResult<TestUser>)
      .mockResolvedValueOnce({
        data: [{ item: { id: '3', name: 'Bob' }, score: 0.8 }],
        limit: 2,
        hasNext: false,
      } as CursorSearchResult<TestUser>);

    const { result } = renderHook(
      () => useInfiniteSearch<TestUser>(mockSearchFn, { initialQuery: { limit: 2 } }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(3);
    });

    expect(result.current.data.map((u) => u.id)).toEqual(['1', '2', '3']);
  });

  test('should reset pagination when query changes', async () => {
    const mockSearchFn = vi.fn().mockResolvedValue({
      data: [{ item: { id: '1', name: 'John' }, score: 1 }],
      limit: 10,
      hasNext: false,
    } as CursorSearchResult<TestUser>);

    const { result } = renderHook(() => useInfiniteSearch<TestUser>(mockSearchFn), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSearch('new search');
    });

    await waitFor(() => {
      expect(mockSearchFn).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: { query: 'new search' },
          cursor: undefined,
        }),
      );
    });
  });

  test('should provide pages array', async () => {
    const mockSearchFn = vi.fn().mockResolvedValue({
      data: [{ item: { id: '1', name: 'John' }, score: 1 }],
      limit: 10,
      hasNext: false,
      total: 1,
    } as CursorSearchResult<TestUser>);

    const { result } = renderHook(() => useInfiniteSearch<TestUser>(mockSearchFn), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pages).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });
});

describe('useSearchParams', () => {
  const originalWindow = globalThis.window;
  const mockLocation = {
    search: '?page=2&limit=25',
    pathname: '/test',
  };
  const mockReplaceState = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: mockLocation,
        history: {
          replaceState: mockReplaceState,
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
    });
  });

  test('should initialize from URL params', () => {
    const { result } = renderHook(() => useSearchParams<TestUser>());

    expect(result.current.query.page).toBe(2);
    expect(result.current.query.limit).toBe(25);
  });

  test('should update URL when query changes', () => {
    const { result } = renderHook(() => useSearchParams<TestUser>());

    act(() => {
      result.current.setQuery({ page: 3, limit: 50 });
    });

    expect(mockReplaceState).toHaveBeenCalled();
    expect(result.current.query.page).toBe(3);
    expect(result.current.query.limit).toBe(50);
  });

  test('should provide searchParams', () => {
    const { result } = renderHook(() => useSearchParams<TestUser>());

    expect(result.current.searchParams).toBeInstanceOf(URLSearchParams);
    expect(result.current.searchParams.get('page')).toBe('2');
  });

  test('should support partial updates', () => {
    const { result } = renderHook(() => useSearchParams<TestUser>());

    act(() => {
      result.current.updateParams({ page: 5 });
    });

    expect(result.current.query.page).toBe(5);
    expect(result.current.query.limit).toBe(25); // Preserved from initial
  });
});

describe('useDebounceSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should debounce value updates', () => {
    const { result } = renderHook(() => useDebounceSearch(300));

    act(() => {
      result.current.setValue('t');
    });

    expect(result.current.value).toBe('t');
    expect(result.current.debouncedValue).toBe('');

    act(() => {
      result.current.setValue('te');
    });

    act(() => {
      result.current.setValue('tes');
    });

    act(() => {
      result.current.setValue('test');
    });

    expect(result.current.value).toBe('test');
    expect(result.current.debouncedValue).toBe('');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedValue).toBe('test');
  });

  test('should accept initial value', () => {
    const { result } = renderHook(() => useDebounceSearch(300, 'initial'));

    expect(result.current.value).toBe('initial');
    expect(result.current.debouncedValue).toBe('initial');
  });

  test('should clear values', () => {
    const { result } = renderHook(() => useDebounceSearch(300, 'initial'));

    act(() => {
      result.current.clear();
    });

    expect(result.current.value).toBe('');
    expect(result.current.debouncedValue).toBe('');
  });

  test('should use custom delay', () => {
    const { result } = renderHook(() => useDebounceSearch(500));

    act(() => {
      result.current.setValue('test');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedValue).toBe('');

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.debouncedValue).toBe('test');
  });
});
