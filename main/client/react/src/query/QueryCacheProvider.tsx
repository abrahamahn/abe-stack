// main/client/react/src/query/QueryCacheProvider.tsx
/**
 * QueryCacheProvider - React context for QueryCache.
 *
 * Provides a shared QueryCache instance to the component tree.
 */

import { QueryCache } from '@abe-stack/client-engine';
import { createContext, useContext, useMemo } from 'react';

import type { QueryCacheOptions } from '@abe-stack/client-engine';
import type { ReactNode } from 'react';

// ============================================================================
// Context
// ============================================================================

const QueryCacheContext = createContext<QueryCache | null>(null);

// ============================================================================
// Provider
// ============================================================================

export interface QueryCacheProviderProps {
  /** Optional existing QueryCache instance */
  cache?: QueryCache;
  /** Options for creating a new QueryCache (if cache not provided) */
  options?: QueryCacheOptions;
  /** Children to render */
  children: ReactNode;
}

/**
 * Provider component for QueryCache.
 *
 * Either pass an existing cache instance or options to create one.
 *
 * @example
 * ```tsx
 * // With default options
 * <QueryCacheProvider>
 *   <App />
 * </QueryCacheProvider>
 *
 * // With custom options
 * <QueryCacheProvider options={{ defaultStaleTime: 60000 }}>
 *   <App />
 * </QueryCacheProvider>
 *
 * // With existing cache
 * const cache = new QueryCache();
 * <QueryCacheProvider cache={cache}>
 *   <App />
 * </QueryCacheProvider>
 * ```
 */
// React component - PascalCase is correct
export const QueryCacheProvider = ({
  cache,
  options,
  children,
}: QueryCacheProviderProps): ReactNode => {
  // Use useMemo to ensure the cache is only created once per provider instance
  // This prevents creating a new cache on every render when no cache prop is provided
  const cacheInstance = useMemo(
    () => cache ?? new QueryCache(options),
    // Dependencies: only recreate if cache prop changes
    [cache, options],
  );

  return <QueryCacheContext.Provider value={cacheInstance}>{children}</QueryCacheContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the QueryCache instance.
 *
 * @throws Error if used outside of QueryCacheProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const cache = useQueryCache();
 *   // Use cache methods directly
 *   const data = cache.getQueryData(['users']);
 * }
 * ```
 */
export function useQueryCache(): QueryCache {
  const cache = useContext(QueryCacheContext);

  if (cache === null) {
    throw new Error('useQueryCache must be used within a QueryCacheProvider');
  }

  return cache;
}
