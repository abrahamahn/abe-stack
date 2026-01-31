// packages/ui/src/hooks/usePaginatedQuery.test.ts
/** @vitest-environment jsdom */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { QueryCache, QueryCacheProvider } from '@abe-stack/sdk';

import { useOffsetPaginatedQuery, usePaginatedQuery } from './usePaginatedQuery';

import type {
  UseOffsetPaginatedQueryOptions,
  UseOffsetPaginatedQueryResult,
  UsePaginatedQueryOptions,
  UsePaginatedQueryResult,
} from './usePaginatedQuery';
import type { ReactNode } from 'react';
const createWrapper = () => {
  const queryCache = new QueryCache({
    defaultStaleTime: 0,
    defaultGcTime: 0,
  });
  // eslint-disable-next-line @typescript-eslint/naming-convention
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryCacheProvider, { cache: queryCache }, children);
  };
};
describe('usePaginatedQuery', () => {
  describe('type definitions', () => {
    it('should export usePaginatedQuery hook', () => {
      expect(usePaginatedQuery).toBeDefined();
      expect(typeof usePaginatedQuery).toBe('function');
    });
    it('should export useOffsetPaginatedQuery hook', () => {
      expect(useOffsetPaginatedQuery).toBeDefined();
      expect(typeof useOffsetPaginatedQuery).toBe('function');
    });
    it('should have correct type definitions for UsePaginatedQueryOptions', () => {
      const options: UsePaginatedQueryOptions<{
        id: string;
      }> = {
        queryKey: ['test'],
        queryFn: () =>
          Promise.resolve({
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
      const result: UsePaginatedQueryResult<{
        id: string;
      }> = {
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
      const options: UseOffsetPaginatedQueryOptions<{
        id: string;
      }> = {
        queryKey: ['test'],
        queryFn: () =>
          Promise.resolve({
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
      const result: UseOffsetPaginatedQueryResult<{
        id: string;
      }> = {
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
  describe('usePaginatedQuery hook', () => {
    it('should fetch initial data', async () => {
      const queryFn = vi.fn().mockResolvedValue({
        data: [{ id: '1' }, { id: '2' }],
        nextCursor: null,
        hasNext: false,
        limit: 10,
      });
      const { result } = renderHook(
        () =>
          usePaginatedQuery({
            queryKey: ['test-items'],
            queryFn,
          }),
        { wrapper: createWrapper() },
      );
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isEnabled).toBe(true);
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.data).toHaveLength(2);
      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.itemCount).toBe(2);
    });
    it('should not fetch when disabled', async () => {
      const queryFn = vi.fn().mockResolvedValue({
        data: [],
        nextCursor: null,
        hasNext: false,
        limit: 10,
      });
      const { result } = renderHook(
        () =>
          usePaginatedQuery({
            queryKey: ['test-disabled'],
            queryFn,
            enabled: false,
          }),
        { wrapper: createWrapper() },
      );
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(queryFn).not.toHaveBeenCalled();
      expect(result.current.data).toHaveLength(0);
      expect(result.current.isEnabled).toBe(false);
    });
    it('should handle errors', async () => {
      const error = new Error('Test error');
      const queryFn = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();
      const { result } = renderHook(
        () =>
          usePaginatedQuery({
            queryKey: ['test-error'],
            queryFn,
            onError,
            retry: false,
          }),
        { wrapper: createWrapper() },
      );
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error).toBe(error);
      expect(onError).toHaveBeenCalledWith(error);
    });
    it('should call onDataReceived callback', async () => {
      const onDataReceived = vi.fn();
      const queryFn = vi.fn().mockResolvedValue({
        data: [{ id: '1' }],
        nextCursor: null,
        hasNext: false,
        limit: 10,
      });
      const { result } = renderHook(
        () =>
          usePaginatedQuery({
            queryKey: ['test-callback'],
            queryFn,
            onDataReceived,
          }),
        { wrapper: createWrapper() },
      );
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(onDataReceived).toHaveBeenCalled();
    });
    it('should provide fetchNextPage function', async () => {
      let callCount = 0;
      const queryFn = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          data: [{ id: `item-${callCount}` }],
          nextCursor: callCount === 1 ? 'cursor-2' : null,
          hasNext: callCount === 1,
          limit: 10,
        });
      });
      const { result } = renderHook(
        () =>
          usePaginatedQuery({
            queryKey: ['test-pagination'],
            queryFn,
          }),
        { wrapper: createWrapper() },
      );
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.hasNextPage).toBe(true);
      expect(typeof result.current.fetchNextPage).toBe('function');
    });
    it('should provide refetch function', async () => {
      const queryFn = vi.fn().mockResolvedValue({
        data: [{ id: '1' }],
        nextCursor: null,
        hasNext: false,
        limit: 10,
      });
      const { result } = renderHook(
        () =>
          usePaginatedQuery({
            queryKey: ['test-refetch'],
            queryFn,
          }),
        { wrapper: createWrapper() },
      );
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(typeof result.current.refetch).toBe('function');
      act(() => {
        result.current.refetch();
      });
      expect(queryFn.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
    it('should provide reset function', async () => {
      const queryFn = vi.fn().mockResolvedValue({
        data: [{ id: '1' }],
        nextCursor: null,
        hasNext: false,
        limit: 10,
      });
      const { result } = renderHook(
        () =>
          usePaginatedQuery({
            queryKey: ['test-reset'],
            queryFn,
          }),
        { wrapper: createWrapper() },
      );
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(typeof result.current.reset).toBe('function');
    });
  });
  describe('useOffsetPaginatedQuery hook', () => {
    it('should fetch initial data', async () => {
      const queryFn = vi.fn().mockResolvedValue({
        data: [{ id: '1' }],
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrev: false,
      });
      const { result } = renderHook(
        () =>
          useOffsetPaginatedQuery({
            queryKey: ['offset-test'],
            queryFn,
          }),
        { wrapper: createWrapper() },
      );
      expect(result.current.isLoading).toBe(true);
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.data).toHaveLength(1);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.totalPages).toBe(10);
      expect(result.current.totalItems).toBe(100);
      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.hasPrevPage).toBe(false);
    });
    it('should not fetch when disabled', async () => {
      const queryFn = vi.fn().mockResolvedValue({
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
      const { result } = renderHook(
        () =>
          useOffsetPaginatedQuery({
            queryKey: ['offset-disabled'],
            queryFn,
            enabled: false,
          }),
        { wrapper: createWrapper() },
      );
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(queryFn).not.toHaveBeenCalled();
      expect(result.current.isEnabled).toBe(false);
    });
    it('should handle errors', async () => {
      const error = new Error('Offset query error');
      const queryFn = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();
      const { result } = renderHook(
        () =>
          useOffsetPaginatedQuery({
            queryKey: ['offset-error'],
            queryFn,
            onError,
            retry: false,
          }),
        { wrapper: createWrapper() },
      );
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error).toBe(error);
      expect(onError).toHaveBeenCalledWith(error);
    });
    it('should provide fetchPage function', async () => {
      const queryFn = vi.fn().mockResolvedValue({
        data: [{ id: '1' }],
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrev: false,
      });
      const { result } = renderHook(
        () =>
          useOffsetPaginatedQuery({
            queryKey: ['offset-fetchpage'],
            queryFn,
          }),
        { wrapper: createWrapper() },
      );
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(typeof result.current.fetchPage).toBe('function');
    });
    it('should provide refetch function', async () => {
      const queryFn = vi.fn().mockResolvedValue({
        data: [{ id: '1' }],
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrev: false,
      });
      const { result } = renderHook(
        () =>
          useOffsetPaginatedQuery({
            queryKey: ['offset-refetch'],
            queryFn,
          }),
        { wrapper: createWrapper() },
      );
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(typeof result.current.refetch).toBe('function');
    });
  });
});
