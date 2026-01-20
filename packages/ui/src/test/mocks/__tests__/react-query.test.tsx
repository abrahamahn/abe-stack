// packages/ui/src/test/mocks/__tests__/react-query.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider, useInfiniteQuery, useQueryClient } from '../react-query';

import type { ReactNode } from 'react';

const createWrapper = (client?: InstanceType<typeof QueryClient>) => {
  const queryClient = client ?? new QueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('react-query mock', () => {
  describe('QueryClient', () => {
    it('should store and retrieve query data', () => {
      const client = new QueryClient();
      const queryKey = ['test'];
      const data = { value: 'test-data' };

      client.setQueryData(queryKey, data);
      expect(client.getQueryData(queryKey)).toEqual(data);
    });

    it('should return undefined for non-existent query data', () => {
      const client = new QueryClient();
      expect(client.getQueryData(['non-existent'])).toBeUndefined();
    });

    it('should track query state after setting data', () => {
      const client = new QueryClient();
      const queryKey = ['test-state'];

      expect(client.getQueryState(queryKey)).toBeUndefined();

      client.setQueryData(queryKey, { value: 'data' });

      expect(client.getQueryState(queryKey)).toEqual({ status: 'success' });
    });

    it('should remove queries with exact match', () => {
      const client = new QueryClient();
      const queryKey = ['test-remove'];

      client.setQueryData(queryKey, { value: 'data' });
      expect(client.getQueryData(queryKey)).toBeDefined();

      client.removeQueries({ queryKey, exact: true });
      expect(client.getQueryData(queryKey)).toBeUndefined();
      expect(client.getQueryState(queryKey)).toBeUndefined();
    });

    it('should invalidate queries and trigger refetch', () => {
      const client = new QueryClient();
      const queryKey = ['test-invalidate'];
      const refetch = vi.fn();

      const clientInternal = client as unknown as {
        __registerQuery: (key: readonly unknown[], fn: () => void) => void;
      };
      clientInternal.__registerQuery(queryKey, refetch);

      client.invalidateQueries({ queryKey });
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('should unregister query subscribers', () => {
      const client = new QueryClient();
      const queryKey = ['test-unregister'];
      const refetch = vi.fn();

      const clientInternal = client as unknown as {
        __registerQuery: (key: readonly unknown[], fn: () => void) => void;
        __unregisterQuery: (key: readonly unknown[], fn: () => void) => void;
      };

      clientInternal.__registerQuery(queryKey, refetch);
      clientInternal.__unregisterQuery(queryKey, refetch);

      client.invalidateQueries({ queryKey });
      expect(refetch).not.toHaveBeenCalled();
    });
  });

  describe('QueryClientProvider', () => {
    it('should provide query client to children', () => {
      const client = new QueryClient();
      let providedClient: unknown;

      const TestComponent = () => {
        providedClient = useQueryClient();
        return <div>Test</div>;
      };

      render(
        <QueryClientProvider client={client}>
          <TestComponent />
        </QueryClientProvider>,
      );

      expect(providedClient).toBe(client);
    });

    it('should render children correctly', () => {
      const client = new QueryClient();

      render(
        <QueryClientProvider client={client}>
          <div>Child Content</div>
        </QueryClientProvider>,
      );

      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });
  });

  describe('useQueryClient', () => {
    it('should throw error when used outside provider', () => {
      const TestComponent = () => {
        useQueryClient();
        return <div>Test</div>;
      };

      expect(() => {
        render(<TestComponent />);
      }).toThrow('QueryClientProvider is missing in the component tree.');
    });

    it('should return the query client from context', () => {
      const client = new QueryClient();

      const { result } = renderHook(() => useQueryClient(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
      });

      expect(result.current).toBe(client);
    });
  });

  describe('useInfiniteQuery', () => {
    it('should fetch initial data', async () => {
      const queryFn = vi.fn().mockResolvedValue({ items: [1, 2, 3] });

      const { result } = renderHook(
        () =>
          useInfiniteQuery({
            queryKey: ['test-infinite'],
            queryFn,
          }),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.pages).toHaveLength(1);
      expect(result.current.data?.pages[0]).toEqual({ items: [1, 2, 3] });
    });

    it('should not fetch when disabled', async () => {
      const queryFn = vi.fn().mockResolvedValue({ items: [] });

      const { result } = renderHook(
        () =>
          useInfiniteQuery({
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
      expect(result.current.data).toBeUndefined();
    });

    it('should handle errors', async () => {
      const error = new Error('Query failed');
      const queryFn = vi.fn().mockRejectedValue(error);

      const { result } = renderHook(
        () =>
          useInfiniteQuery({
            queryKey: ['test-error'],
            queryFn,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
      expect(result.current.isLoading).toBe(false);
    });

    it('should fetch next page', async () => {
      let callCount = 0;
      const queryFn = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          items: [`page${callCount}`],
          nextCursor: callCount === 1 ? 'cursor2' : null,
        });
      });

      const getNextPageParam = (lastPage: { nextCursor: string | null }) =>
        lastPage.nextCursor ?? undefined;

      const { result } = renderHook(
        () =>
          useInfiniteQuery({
            queryKey: ['test-next-page'],
            queryFn,
            getNextPageParam,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasNextPage).toBe(true);

      await act(async () => {
        await result.current.fetchNextPage();
      });

      expect(result.current.data?.pages).toHaveLength(2);
    });

    it('should refetch data', async () => {
      const queryFn = vi.fn().mockResolvedValue({ items: [] });

      const { result } = renderHook(
        () =>
          useInfiniteQuery({
            queryKey: ['test-refetch'],
            queryFn,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = queryFn.mock.calls.length;

      await act(async () => {
        await result.current.refetch();
      });

      expect(queryFn.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('should remove data with remove()', async () => {
      const queryFn = vi.fn().mockResolvedValue({ items: [1] });

      const { result } = renderHook(
        () =>
          useInfiniteQuery({
            queryKey: ['test-remove'],
            queryFn,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.data?.pages).toHaveLength(1);
      });

      await act(async () => {
        result.current.remove();
      });

      await waitFor(() => {
        expect(result.current.data?.pages).toBeDefined();
      });
    });

    it('should not fetch next page when disabled', async () => {
      const queryFn = vi.fn().mockResolvedValue({ items: [] });

      const { result } = renderHook(
        () =>
          useInfiniteQuery({
            queryKey: ['test-disabled-next'],
            queryFn,
            enabled: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchNextPage();
      });

      expect(queryFn).not.toHaveBeenCalled();
    });

    it('should not refetch when disabled', async () => {
      const queryFn = vi.fn().mockResolvedValue({ items: [] });

      const { result } = renderHook(
        () =>
          useInfiniteQuery({
            queryKey: ['test-disabled-refetch'],
            queryFn,
            enabled: false,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(queryFn).not.toHaveBeenCalled();
    });
  });
});
