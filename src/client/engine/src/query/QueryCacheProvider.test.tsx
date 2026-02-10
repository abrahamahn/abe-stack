// src/client/engine/src/query/QueryCacheProvider.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { QueryCache } from './QueryCache';
import { QueryCacheProvider, useQueryCache } from './QueryCacheProvider';

import type { ReactNode } from 'react';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Simple consumer component to test the useQueryCache hook.
 */
const TestConsumer = (): ReactNode => {
  const cache = useQueryCache();
  const queryData = cache.getQueryData(['test-key']);
  const queryDataDisplay =
    queryData === null || queryData === undefined
      ? 'undefined'
      : typeof queryData === 'string'
        ? queryData
        : JSON.stringify(queryData);
  return (
    <div>
      <span data-testid="cache-exists">{'true'}</span>
      <span data-testid="cache-size">{cache.size}</span>
      <span data-testid="query-data">{queryDataDisplay}</span>
    </div>
  );
};

/**
 * Component that attempts to use the hook without a provider.
 */
const OrphanConsumer = (): ReactNode => {
  useQueryCache();
  return <div>Should not render</div>;
};

// ============================================================================
// Tests
// ============================================================================

describe('QueryCacheProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider component', () => {
    it('should render children without errors', () => {
      render(
        <QueryCacheProvider>
          <div data-testid="child">Child Content</div>
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByTestId('child').textContent).toBe('Child Content');
    });

    it('should provide a QueryCache instance to children', () => {
      render(
        <QueryCacheProvider>
          <TestConsumer />
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('cache-exists').textContent).toBe('true');
    });

    it('should create a new cache with default options when no cache provided', () => {
      render(
        <QueryCacheProvider>
          <TestConsumer />
        </QueryCacheProvider>,
      );

      // Should have a cache with size 0 initially
      expect(screen.getByTestId('cache-size').textContent).toBe('0');
    });

    it('should accept an existing cache instance', () => {
      const existingCache = new QueryCache();
      existingCache.setQueryData(['test-key'], 'test-value');

      render(
        <QueryCacheProvider cache={existingCache}>
          <TestConsumer />
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('cache-size').textContent).toBe('1');
      expect(screen.getByTestId('query-data').textContent).toBe('test-value');
    });

    it('should accept custom options when creating a new cache', () => {
      const options = {
        defaultStaleTime: 30000,
        defaultGcTime: 60000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      };

      render(
        <QueryCacheProvider options={options}>
          <TestConsumer />
        </QueryCacheProvider>,
      );

      // Cache should be created and accessible
      expect(screen.getByTestId('cache-exists').textContent).toBe('true');
      expect(screen.getByTestId('cache-size').textContent).toBe('0');
    });

    it('should prefer provided cache over options', () => {
      const existingCache = new QueryCache();
      existingCache.setQueryData(['existing'], 'from-cache');

      const options = {
        defaultStaleTime: 10000,
      };

      render(
        <QueryCacheProvider cache={existingCache} options={options}>
          <TestConsumer />
        </QueryCacheProvider>,
      );

      // Should use the existing cache, not create a new one with options
      expect(screen.getByTestId('cache-size').textContent).toBe('1');
      const cacheData = existingCache.getQueryData(['existing']);
      expect(cacheData).toBe('from-cache');
    });

    it('should render multiple children correctly', () => {
      render(
        <QueryCacheProvider>
          <div data-testid="child-1">First Child</div>
          <div data-testid="child-2">Second Child</div>
          <div data-testid="child-3">Third Child</div>
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });
  });

  describe('useQueryCache hook', () => {
    it('should return the QueryCache instance from context', () => {
      render(
        <QueryCacheProvider>
          <TestConsumer />
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('cache-exists').textContent).toBe('true');
    });

    it('should throw error when used outside of QueryCacheProvider', () => {
      // Suppress console.error for this test to avoid polluting test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<OrphanConsumer />);
      }).toThrow('useQueryCache must be used within a QueryCacheProvider');

      consoleSpy.mockRestore();
    });

    it('should provide access to cache methods', () => {
      const CacheMethodConsumer = (): ReactNode => {
        const cache = useQueryCache();

        // Set some data
        cache.setQueryData(['users', 1], { id: 1, name: 'Alice' });

        // Get the data back
        const data = cache.getQueryData(['users', 1]) as { id: number; name: string } | undefined;

        return (
          <div>
            <span data-testid="has-query">{cache.hasQuery(['users', 1]) ? 'true' : 'false'}</span>
            <span data-testid="user-name">{data?.name ?? 'not found'}</span>
          </div>
        );
      };

      render(
        <QueryCacheProvider>
          <CacheMethodConsumer />
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('has-query').textContent).toBe('true');
      expect(screen.getByTestId('user-name').textContent).toBe('Alice');
    });

    it('should provide access to cache subscriptions', () => {
      const mockCallback = vi.fn();

      const SubscriptionConsumer = (): ReactNode => {
        const cache = useQueryCache();

        // Subscribe to changes
        const unsubscribe = cache.subscribe(['test'], mockCallback);

        // Trigger a change
        cache.setQueryData(['test'], 'new-value');

        // Unsubscribe
        unsubscribe();

        return <div data-testid="subscribed">Subscribed</div>;
      };

      render(
        <QueryCacheProvider>
          <SubscriptionConsumer />
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('subscribed')).toBeInTheDocument();
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should share the same cache instance across multiple consumers', () => {
      const cache = new QueryCache();
      cache.setQueryData(['shared-key'], 'shared-value');

      const FirstConsumer = (): ReactNode => {
        const cacheInstance = useQueryCache();
        const data = cacheInstance.getQueryData(['shared-key']);
        return <span data-testid="first-consumer">{String(data)}</span>;
      };

      const SecondConsumer = (): ReactNode => {
        const cacheInstance = useQueryCache();
        const data = cacheInstance.getQueryData(['shared-key']);
        return <span data-testid="second-consumer">{String(data)}</span>;
      };

      render(
        <QueryCacheProvider cache={cache}>
          <FirstConsumer />
          <SecondConsumer />
        </QueryCacheProvider>,
      );

      // Both consumers should see the same data
      expect(screen.getByTestId('first-consumer').textContent).toBe('shared-value');
      expect(screen.getByTestId('second-consumer').textContent).toBe('shared-value');
    });

    it('should allow consumers to modify shared cache', () => {
      const ModifyingConsumer = (): ReactNode => {
        const cache = useQueryCache();
        cache.setQueryData(['modified-key'], 'initial-value');
        cache.setQueryData(['modified-key'], 'updated-value');
        const data = cache.getQueryData(['modified-key']);
        return <span data-testid="modified-data">{String(data)}</span>;
      };

      render(
        <QueryCacheProvider>
          <ModifyingConsumer />
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('modified-data').textContent).toBe('updated-value');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined query data gracefully', () => {
      const UndefinedDataConsumer = (): ReactNode => {
        const cache = useQueryCache();
        const data = cache.getQueryData(['non-existent']);
        return <span data-testid="data-status">{data === undefined ? 'undefined' : 'exists'}</span>;
      };

      render(
        <QueryCacheProvider>
          <UndefinedDataConsumer />
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('data-status').textContent).toBe('undefined');
    });

    it('should handle empty children', () => {
      render(<QueryCacheProvider>{null}</QueryCacheProvider>);

      // Should render without errors
      expect(document.body).toBeTruthy();
    });

    it('should handle complex query keys', () => {
      const ComplexKeyConsumer = (): ReactNode => {
        const cache = useQueryCache();
        const complexKey = ['users', { page: 1, filters: { active: true } }, 'list'];
        cache.setQueryData(complexKey, 'complex-data');
        const data = cache.getQueryData(complexKey);
        return <span data-testid="complex-data">{String(data)}</span>;
      };

      render(
        <QueryCacheProvider>
          <ComplexKeyConsumer />
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('complex-data').textContent).toBe('complex-data');
    });

    it('should handle null data values', () => {
      const NullDataConsumer = (): ReactNode => {
        const cache = useQueryCache();
        cache.setQueryData(['nullable'], null);
        const data = cache.getQueryData(['nullable']);
        return <span data-testid="null-data">{data === null ? 'null' : 'not-null'}</span>;
      };

      render(
        <QueryCacheProvider>
          <NullDataConsumer />
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('null-data').textContent).toBe('null');
    });

    it('should maintain cache state across re-renders', () => {
      let renderCount = 0;

      const RerenderConsumer = (): ReactNode => {
        const cache = useQueryCache();
        renderCount++;

        if (renderCount === 1) {
          cache.setQueryData(['persistent'], 'first-render');
        }

        const data = cache.getQueryData(['persistent']);
        return <span data-testid="persistent-data">{String(data)}</span>;
      };

      const { rerender } = render(
        <QueryCacheProvider>
          <RerenderConsumer />
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('persistent-data').textContent).toBe('first-render');

      // Rerender
      rerender(
        <QueryCacheProvider>
          <RerenderConsumer />
        </QueryCacheProvider>,
      );

      // Data should persist across re-renders
      expect(screen.getByTestId('persistent-data').textContent).toBe('first-render');
    });
  });

  describe('nested providers', () => {
    it('should support nested providers with different caches', () => {
      const outerCache = new QueryCache();
      const innerCache = new QueryCache();

      outerCache.setQueryData(['scope'], 'outer');
      innerCache.setQueryData(['scope'], 'inner');

      const InnerConsumer = (): ReactNode => {
        const cache = useQueryCache();
        const data = cache.getQueryData(['scope']);
        return <span data-testid="inner-data">{String(data)}</span>;
      };

      const OuterConsumer = (): ReactNode => {
        const cache = useQueryCache();
        const data = cache.getQueryData(['scope']);
        return (
          <div>
            <span data-testid="outer-data">{String(data)}</span>
            <QueryCacheProvider cache={innerCache}>
              <InnerConsumer />
            </QueryCacheProvider>
          </div>
        );
      };

      render(
        <QueryCacheProvider cache={outerCache}>
          <OuterConsumer />
        </QueryCacheProvider>,
      );

      // Each consumer should see their respective cache
      expect(screen.getByTestId('outer-data').textContent).toBe('outer');
      expect(screen.getByTestId('inner-data').textContent).toBe('inner');
    });

    it('should use nearest provider in nested structure', () => {
      const parentCache = new QueryCache();
      const childCache = new QueryCache();

      parentCache.setQueryData(['test'], 'parent');
      childCache.setQueryData(['test'], 'child');

      const NestedConsumer = (): ReactNode => {
        const cache = useQueryCache();
        const data = cache.getQueryData(['test']);
        return <span data-testid="nested-data">{String(data)}</span>;
      };

      render(
        <QueryCacheProvider cache={parentCache}>
          <div>
            <QueryCacheProvider cache={childCache}>
              <NestedConsumer />
            </QueryCacheProvider>
          </div>
        </QueryCacheProvider>,
      );

      // Should use the nearest (child) provider
      expect(screen.getByTestId('nested-data').textContent).toBe('child');
    });
  });

  describe('integration with QueryCache features', () => {
    it('should support stale time configuration', () => {
      const StaleTimeConsumer = (): ReactNode => {
        const cache = useQueryCache();
        cache.setQueryData(['stale-test'], 'data', { staleTime: 1000 });
        const isStale = cache.isStale(['stale-test']);
        return <span data-testid="is-stale">{isStale ? 'true' : 'false'}</span>;
      };

      render(
        <QueryCacheProvider options={{ defaultStaleTime: 60000 }}>
          <StaleTimeConsumer />
        </QueryCacheProvider>,
      );

      // Should not be stale immediately after setting
      expect(screen.getByTestId('is-stale').textContent).toBe('false');
    });

    it('should support cache invalidation', () => {
      const InvalidationConsumer = (): ReactNode => {
        const cache = useQueryCache();
        cache.setQueryData(['invalidate-test'], 'data');
        cache.invalidateQuery(['invalidate-test']);
        const state = cache.getQueryState(['invalidate-test']);
        const isInvalidated = state?.isInvalidated === true;
        return <span data-testid="is-invalidated">{isInvalidated ? 'true' : 'false'}</span>;
      };

      render(
        <QueryCacheProvider>
          <InvalidationConsumer />
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('is-invalidated').textContent).toBe('true');
    });

    it('should support query removal', () => {
      const RemovalConsumer = (): ReactNode => {
        const cache = useQueryCache();
        cache.setQueryData(['remove-test'], 'data');
        const beforeRemoval = cache.hasQuery(['remove-test']);
        cache.removeQuery(['remove-test']);
        const afterRemoval = cache.hasQuery(['remove-test']);
        return (
          <div>
            <span data-testid="before-removal">{beforeRemoval ? 'true' : 'false'}</span>
            <span data-testid="after-removal">{afterRemoval ? 'true' : 'false'}</span>
          </div>
        );
      };

      render(
        <QueryCacheProvider>
          <RemovalConsumer />
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('before-removal').textContent).toBe('true');
      expect(screen.getByTestId('after-removal').textContent).toBe('false');
    });

    it('should support cache clearing', () => {
      const ClearConsumer = (): ReactNode => {
        const cache = useQueryCache();
        cache.setQueryData(['clear-test-1'], 'data1');
        cache.setQueryData(['clear-test-2'], 'data2');
        const beforeClear = cache.size;
        cache.clear();
        const afterClear = cache.size;
        return (
          <div>
            <span data-testid="before-clear">{beforeClear}</span>
            <span data-testid="after-clear">{afterClear}</span>
          </div>
        );
      };

      render(
        <QueryCacheProvider>
          <ClearConsumer />
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('before-clear').textContent).toBe('2');
      expect(screen.getByTestId('after-clear').textContent).toBe('0');
    });
  });

  describe('TypeScript types', () => {
    it('should accept ReactNode as children', () => {
      render(
        <QueryCacheProvider>
          <div>String child</div>
          {123}
          {true}
          {null}
          {undefined}
        </QueryCacheProvider>,
      );

      // Should render without type errors
      expect(document.body).toBeTruthy();
    });

    it('should accept all QueryCacheOptions properties', () => {
      const allOptions = {
        defaultStaleTime: 30000,
        defaultGcTime: 60000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: false,
      };

      render(
        <QueryCacheProvider options={allOptions}>
          <TestConsumer />
        </QueryCacheProvider>,
      );

      expect(screen.getByTestId('cache-exists').textContent).toBe('true');
    });
  });
});
