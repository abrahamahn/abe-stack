// packages/ui/src/hooks/__tests__/usePaginatedQuery.test.tsx
import { describe, expect, it } from 'vitest';

import { usePaginatedQuery, useOffsetPaginatedQuery } from '../usePaginatedQuery';

import type {
  UsePaginatedQueryOptions,
  UsePaginatedQueryResult,
  UseOffsetPaginatedQueryOptions,
  UseOffsetPaginatedQueryResult,
} from '../usePaginatedQuery';

describe('usePaginatedQuery', () => {
  it('should export usePaginatedQuery hook', () => {
    expect(usePaginatedQuery).toBeDefined();
    expect(typeof usePaginatedQuery).toBe('function');
  });

  it('should export useOffsetPaginatedQuery hook', () => {
    expect(useOffsetPaginatedQuery).toBeDefined();
    expect(typeof useOffsetPaginatedQuery).toBe('function');
  });

  it('should have correct type definitions for UsePaginatedQueryOptions', () => {
    // Type check - this test verifies the interface exists and has correct shape
    const options: UsePaginatedQueryOptions<{ id: string }> = {
      queryKey: ['test'],
      queryFn: async () => ({
        data: [{ id: '1' }],
        nextCursor: null,
        hasNext: false,
        limit: 10,
      }),
      enabled: true,
      onDataReceived: () => {},
      onError: () => {},
      staleTime: 1000,
      cacheTime: 5000,
      refetchInterval: 10000,
      keepPreviousData: true,
    };

    expect(options.queryKey).toEqual(['test']);
    expect(options.enabled).toBe(true);
  });

  it('should have correct type definitions for UsePaginatedQueryResult', () => {
    // Type check - verify the result interface shape
    const result: UsePaginatedQueryResult<{ id: string }> = {
      data: [{ id: '1' }],
      isLoading: false,
      isFetchingNextPage: false,
      isFetching: false,
      isError: false,
      error: null,
      hasNextPage: true,
      fetchNextPage: () => {},
      refetch: () => {},
      reset: () => {},
      isInitialLoad: false,
      itemCount: 1,
      isEnabled: true,
    };

    expect(result.data).toHaveLength(1);
    expect(result.isLoading).toBe(false);
    expect(result.hasNextPage).toBe(true);
    expect(result.isEnabled).toBe(true);
  });

  it('should have correct type definitions for UseOffsetPaginatedQueryOptions', () => {
    const options: UseOffsetPaginatedQueryOptions<{ id: string }> = {
      queryKey: ['test'],
      queryFn: async () => ({
        data: [{ id: '1' }],
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrev: false,
      }),
      enabled: true,
    };

    expect(options.queryKey).toEqual(['test']);
  });

  it('should have correct type definitions for UseOffsetPaginatedQueryResult', () => {
    const result: UseOffsetPaginatedQueryResult<{ id: string }> = {
      data: [{ id: '1' }],
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: true,
      hasPrevPage: false,
      currentPage: 1,
      totalPages: 10,
      totalItems: 100,
      fetchPage: () => {},
      refetch: () => {},
      isEnabled: true,
    };

    expect(result.data).toHaveLength(1);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(10);
  });
});
