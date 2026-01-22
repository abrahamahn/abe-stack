// packages/sdk/src/query/QueryCacheProvider.tsx
/**
 * QueryCacheProvider - React context for QueryCache.
 *
 * Provides a shared QueryCache instance to the component tree.
 */

import { createContext, useContext } from 'react';

import { QueryCache } from './QueryCache';

import type { QueryCacheOptions } from './QueryCache';
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
export function QueryCacheProvider({
  cache,
  options,
  children,
}: QueryCacheProviderProps): ReactNode {
  const cacheInstance = cache ?? new QueryCache(options);

  return <QueryCacheContext.Provider value={cacheInstance}>{children}</QueryCacheContext.Provider>;
}

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

  if (!cache) {
    throw new Error('useQueryCache must be used within a QueryCacheProvider');
  }

  return cache;
}
