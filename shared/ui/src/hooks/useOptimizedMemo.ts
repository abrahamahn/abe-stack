// shared/ui/src/hooks/useOptimizedMemo.ts
/**
 * Optimized React Hooks
 *
 * Performance-optimized versions of React hooks with better memoization strategies.
 * These utilities are part of the public API and available for use throughout the application.
 *
 * This module provides:
 * - **Comparison utilities**: `deepEqual`, `shallowEqual` for custom equality checks
 * - **Optimized memo hooks**: `useDeepMemo`, `useShallowMemo` for smarter memoization
 * - **Optimized callback hooks**: `useDeepCallback`, `useShallowCallback`
 * - **Smart effect hooks**: `useDeepEffect`, `useShallowEffect` that skip unnecessary runs
 * - **Cache classes**: `TTLCache`, `LRUCache` for efficient data caching
 * - **React cache hooks**: `useTTLCache`, `useLRUCache` for component-scoped caches
 * - **Debounce/throttle hooks**: `useDebouncedState`, `useThrottle`, `useDebounce`
 * - **Computation helpers**: `useExpensiveComputation` for async/debounced calculations
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Deep Comparison Utilities
// ============================================================================

/**
 * Deep equality check for objects and arrays.
 *
 * This utility is part of the public API. Use it when you need to compare
 * complex nested objects or arrays for equality. Unlike reference equality (===),
 * this function recursively compares all properties and array elements.
 *
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns true if values are deeply equal
 *
 * @example Basic usage
 * ```typescript
 * deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }); // true
 * deepEqual([1, [2, 3]], [1, [2, 3]]); // true
 * deepEqual({ a: 1 }, { a: 2 }); // false
 * ```
 *
 * @remarks
 * Performance note: Deep comparison is O(n) where n is the total number of
 * properties/elements. For large objects, consider using `shallowEqual` instead.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!(key in objB)) return false;
      if (!deepEqual(objA[key], objB[key])) return false;
    }

    return true;
  }

  return false;
}

/**
 * Shallow equality check for objects.
 *
 * This utility is part of the public API. Use it when you need to compare
 * objects by their top-level properties only. More performant than `deepEqual`
 * but doesn't detect changes in nested objects.
 *
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns true if values are shallowly equal
 *
 * @example Basic usage
 * ```typescript
 * shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 }); // true
 * shallowEqual({ a: 1 }, { a: 2 }); // false
 *
 * const nested = { c: 3 };
 * shallowEqual({ a: nested }, { a: nested }); // true (same reference)
 * shallowEqual({ a: { c: 3 } }, { a: { c: 3 } }); // false (different references)
 * ```
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (typeof a !== 'object' || typeof b !== 'object') return a === b;

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!(key in objB) || objA[key] !== objB[key]) return false;
  }

  return true;
}

// ============================================================================
// Optimized useMemo
// ============================================================================

/**
 * useMemo with deep equality comparison.
 *
 * This hook is part of the public API. Use it instead of React's `useMemo` when your
 * dependencies are objects or arrays that may have the same values but different
 * references. This prevents unnecessary recalculations when deps are deeply equal.
 *
 * @param factory - Function that creates the memoized value
 * @param deps - Dependencies to compare (using deep equality)
 * @returns The memoized value
 *
 * @example Memoizing with object dependencies
 * ```typescript
 * const config = { sortBy: 'name', order: 'asc' };
 *
 * // With useMemo: recalculates every render (new object reference)
 * // With useDeepMemo: only recalculates when config values actually change
 * const sortedItems = useDeepMemo(
 *   () => sortItems(items, config),
 *   [items, config]
 * );
 * ```
 */
export function useDeepMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const ref = useRef<{ deps: React.DependencyList; value: T } | undefined>(undefined);

  if (ref.current === undefined || !deepEqual(ref.current.deps, deps)) {
    ref.current = { deps: [...deps], value: factory() };
  }

  return ref.current.value;
}

/**
 * useMemo with shallow equality comparison.
 *
 * This hook is part of the public API. Use it instead of React's `useMemo` when your
 * dependencies are flat objects (no nesting) that may have the same values but
 * different references. More performant than `useDeepMemo` for flat objects.
 *
 * @param factory - Function that creates the memoized value
 * @param deps - Dependencies to compare (using shallow equality)
 * @returns The memoized value
 *
 * @example Memoizing with flat object dependencies
 * ```typescript
 * const filters = { category: 'books', inStock: true };
 *
 * const filteredProducts = useShallowMemo(
 *   () => products.filter(p => matchesFilters(p, filters)),
 *   [products, filters]
 * );
 * ```
 */
export function useShallowMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const ref = useRef<{ deps: React.DependencyList; value: T } | undefined>(undefined);

  if (ref.current === undefined || !shallowEqual(ref.current.deps, deps)) {
    ref.current = { deps: [...deps], value: factory() };
  }

  return ref.current.value;
}

// ============================================================================
// Optimized useCallback
// ============================================================================

/**
 * useCallback with deep equality comparison.
 *
 * This hook is part of the public API. Use it instead of React's `useCallback` when your
 * dependencies are objects or arrays that may have the same values but different references.
 *
 * @param callback - The callback function to memoize
 * @param deps - Dependencies to compare (using deep equality)
 * @returns The memoized callback
 *
 * @example Stable callback with object dependencies
 * ```typescript
 * const options = { debounce: 300, validate: true };
 *
 * const handleSubmit = useDeepCallback(
 *   (data) => submitForm(data, options),
 *   [options]
 * );
 * ```
 */
export function useDeepCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: React.DependencyList,
): T {
  return useDeepMemo(() => callback, deps);
}

/**
 * useCallback with shallow equality comparison.
 *
 * This hook is part of the public API. Use it instead of React's `useCallback` when your
 * dependencies are flat objects that may have the same values but different references.
 *
 * @param callback - The callback function to memoize
 * @param deps - Dependencies to compare (using shallow equality)
 * @returns The memoized callback
 *
 * @example Stable callback with flat object dependencies
 * ```typescript
 * const config = { timeout: 5000, retries: 3 };
 *
 * const fetchData = useShallowCallback(
 *   () => api.fetch(url, config),
 *   [url, config]
 * );
 * ```
 */
export function useShallowCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: React.DependencyList,
): T {
  return useShallowMemo(() => callback, deps);
}

// ============================================================================
// Smart useEffect
// ============================================================================

/**
 * useEffect that only runs when dependencies change deeply.
 *
 * This hook is part of the public API. Use it instead of React's `useEffect` when your
 * dependencies are objects or arrays that may have the same values but different
 * references. This prevents unnecessary effect executions.
 *
 * @param effect - The effect function to run
 * @param deps - Dependencies to compare (using deep equality)
 *
 * @example Fetch only when query params actually change
 * ```typescript
 * const queryParams = { page: 1, sort: 'name', filters: { active: true } };
 *
 * useDeepEffect(() => {
 *   fetchData(queryParams);
 * }, [queryParams]);
 * ```
 */
export function useDeepEffect(effect: React.EffectCallback, deps: React.DependencyList): void {
  const ref = useRef<React.DependencyList | undefined>(undefined);

  useEffect(() => {
    if (ref.current === undefined || !deepEqual(ref.current, deps)) {
      ref.current = [...deps];
      return effect();
    }
    return undefined;
  }, [JSON.stringify(deps)]);
}

/**
 * useEffect that only runs when dependencies change shallowly.
 *
 * This hook is part of the public API. Use it instead of React's `useEffect` when your
 * dependencies are flat objects that may have the same values but different references.
 *
 * @param effect - The effect function to run
 * @param deps - Dependencies to compare (using shallow equality)
 *
 * @example Sync only when settings actually change
 * ```typescript
 * const settings = { theme: 'dark', language: 'en' };
 *
 * useShallowEffect(() => {
 *   syncSettings(settings);
 * }, [settings]);
 * ```
 */
export function useShallowEffect(effect: React.EffectCallback, deps: React.DependencyList): void {
  const ref = useRef<React.DependencyList | undefined>(undefined);

  useEffect(() => {
    if (ref.current === undefined || !shallowEqual(ref.current, deps)) {
      ref.current = [...deps];
      return effect();
    }
    return undefined;
  }, [JSON.stringify(deps)]);
}

// ============================================================================
// Efficient Data Structures
// ============================================================================

/**
 * Efficient Map-based cache with time-to-live (TTL) expiration.
 *
 * This class is part of the public API. Use it for caching data that should
 * automatically expire after a certain time. Includes automatic cleanup of
 * expired entries.
 *
 * @typeParam T - The type of cached values
 *
 * @example Basic usage
 * ```typescript
 * const cache = new TTLCache<User>(60000); // 1 minute default TTL
 *
 * cache.set('user-1', userData); // Uses default TTL
 * cache.set('user-2', userData, 30000); // Custom 30s TTL
 *
 * const user = cache.get('user-1'); // Returns user or undefined if expired
 * ```
 *
 * @example API response caching
 * ```typescript
 * const apiCache = new TTLCache<ApiResponse>(300000); // 5 minutes
 *
 * async function fetchWithCache(endpoint: string) {
 *   const cached = apiCache.get(endpoint);
 *   if (cached) return cached;
 *
 *   const response = await fetch(endpoint);
 *   const data = await response.json();
 *   apiCache.set(endpoint, data);
 *   return data;
 * }
 * ```
 */
export class TTLCache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  private cleanupTimer?: ReturnType<typeof setTimeout> | undefined;

  constructor(private defaultTTL: number = 300000) {} // 5 minutes default

  set(key: string, value: T, ttl?: number): void {
    const expires = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expires });

    // Schedule cleanup if not already scheduled
    if (this.cleanupTimer === undefined) {
      this.scheduleCleanup();
    }
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (entry === undefined) return undefined;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry === undefined) return false;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    if (this.cleanupTimer !== undefined) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Destroys the cache instance and clears the cleanup interval.
   *
   * Call this method when the cache instance is no longer needed to prevent
   * memory leaks from the cleanup timer. This is especially important when
   * the cache instance is replaced (e.g., in React effects with changing deps).
   *
   * @example Cleanup in React useEffect
   * ```typescript
   * useEffect(() => {
   *   const cache = new TTLCache(options.ttl);
   *   // ... use cache
   *   return () => cache.destroy(); // cleanup on unmount or dep change
   * }, [options.ttl]);
   * ```
   */
  destroy(): void {
    this.clear();
  }

  size(): number {
    this.cleanup(); // Clean expired entries
    return this.cache.size;
  }

  private scheduleCleanup(): void {
    if (this.cleanupTimer !== undefined) return;

    this.cleanupTimer = setTimeout(() => {
      this.cleanup();
      this.cleanupTimer = undefined;

      // Schedule next cleanup if cache is not empty
      if (this.cache.size > 0) {
        this.scheduleCleanup();
      }
    }, 60000); // Clean up every minute
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Efficient Least Recently Used (LRU) cache with fixed maximum size.
 *
 * This class is part of the public API. Use it when you need a cache with
 * a maximum size that automatically evicts the least recently accessed items
 * when full.
 *
 * @typeParam T - The type of cached values
 *
 * @example Basic usage
 * ```typescript
 * const cache = new LRUCache<ProcessedImage>(100); // Max 100 items
 *
 * cache.set('img-1', processedImage);
 * const image = cache.get('img-1'); // Marks as recently used
 *
 * // When cache exceeds 100 items, least recently used are evicted
 * ```
 *
 * @example Component data cache
 * ```typescript
 * const componentCache = new LRUCache<ComputedData>(50);
 *
 * function getComputedData(id: string, rawData: RawData) {
 *   const cached = componentCache.get(id);
 *   if (cached) return cached;
 *
 *   const computed = expensiveComputation(rawData);
 *   componentCache.set(id, computed);
 *   return computed;
 * }
 * ```
 */
export class LRUCache<T> {
  private cache = new Map<string, T>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKeyResult = this.cache.keys().next();
      if (firstKeyResult.done !== true) {
        this.cache.delete(firstKeyResult.value);
      }
    }

    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// React Hooks for Data Structures
// ============================================================================

/**
 * React hook for component-scoped TTL cache.
 *
 * This hook is part of the public API. Use it to create a TTL cache that is
 * automatically cleaned up when the component unmounts or when defaultTTL changes.
 *
 * @param defaultTTL - Default time-to-live in milliseconds (default: 5 minutes)
 * @returns A TTLCache instance scoped to the component lifecycle
 *
 * @example Caching API responses in a component
 * ```typescript
 * function ProductList() {
 *   const cache = useTTLCache<Product>(60000); // 1 minute TTL
 *
 *   const fetchProduct = async (id: string) => {
 *     const cached = cache.get(id);
 *     if (cached) return cached;
 *
 *     const product = await api.getProduct(id);
 *     cache.set(id, product);
 *     return product;
 *   };
 *
 *   // Cache is automatically cleared on unmount
 * }
 * ```
 */
export function useTTLCache<T>(defaultTTL?: number): TTLCache<T> {
  const cacheRef = useRef<TTLCache<T> | undefined>(undefined);
  const ttlRef = useRef<number | undefined>(defaultTTL);

  // Create new cache if defaultTTL changes or if cache doesn't exist
  if (cacheRef.current === undefined || ttlRef.current !== defaultTTL) {
    // Destroy old cache to clear cleanup interval (prevents memory leak)
    cacheRef.current?.destroy();
    cacheRef.current = new TTLCache<T>(defaultTTL);
    ttlRef.current = defaultTTL;
  }

  // Cleanup on unmount
  useEffect(() => {
    const cache = cacheRef.current;
    return (): void => {
      cache?.destroy();
    };
  }, []);

  return cacheRef.current;
}

/**
 * React hook for component-scoped LRU cache.
 *
 * This hook is part of the public API. Use it to create an LRU cache that
 * persists across renders but is scoped to the component lifecycle.
 *
 * @param maxSize - Maximum number of items in the cache
 * @returns An LRUCache instance scoped to the component lifecycle
 *
 * @example Caching computed results in a component
 * ```typescript
 * function DataGrid({ data }: Props) {
 *   const computeCache = useLRUCache<ComputedRow>(1000);
 *
 *   const getComputedRow = (row: Row) => {
 *     const cached = computeCache.get(row.id);
 *     if (cached) return cached;
 *
 *     const computed = expensiveRowComputation(row);
 *     computeCache.set(row.id, computed);
 *     return computed;
 *   };
 *
 *   return data.map(row => <Row data={getComputedRow(row)} />);
 * }
 * ```
 */
export function useLRUCache<T>(maxSize: number): LRUCache<T> {
  const cacheRef = useRef<LRUCache<T> | undefined>(undefined);

    cacheRef.current ??= new LRUCache<T>(maxSize);

  return cacheRef.current;
}

// ============================================================================
// Component Memoization Helpers
// ============================================================================

interface ExpensiveComputationOptions {
  debounceMs?: number;
  skipInitial?: boolean;
}

/**
 * React hook for expensive computations with optional debouncing.
 *
 * This hook is part of the public API. Use it when you have a computation that
 * is expensive and/or needs to be debounced based on rapidly changing dependencies.
 *
 * @param compute - The expensive computation function
 * @param deps - Dependencies that trigger recomputation
 * @param options - Configuration options
 * @param options.debounceMs - Delay before running computation (optional)
 * @param options.skipInitial - Skip initial computation (default: false)
 * @returns The computed result, or undefined if skipped/pending
 *
 * @example Debounced search computation
 * ```typescript
 * function SearchResults({ query, data }: Props) {
 *   const results = useExpensiveComputation(
 *     () => fuzzySearch(data, query),
 *     [query, data],
 *     { debounceMs: 300 }
 *   );
 *
 *   if (!results) return <Loading />;
 *   return <ResultsList results={results} />;
 * }
 * ```
 *
 * @example Skip initial expensive computation
 * ```typescript
 * const analysis = useExpensiveComputation(
 *   () => performDeepAnalysis(largeDataset),
 *   [largeDataset],
 *   { skipInitial: true } // Don't block initial render
 * );
 * ```
 */
export function useExpensiveComputation<T>(
  compute: () => T,
  deps: React.DependencyList,
  options: ExpensiveComputationOptions = {},
): T | undefined {
  const { debounceMs, skipInitial = false } = options;
  const [result, setResult] = useState<T | undefined>(skipInitial ? undefined : compute());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
    }

    const runComputation = (): void => {
      try {
        const newResult = compute();
        setResult(newResult);
      } catch {
        // Handle computation error silently
      }
    };

    if (debounceMs !== undefined && debounceMs > 0) {
      timeoutRef.current = setTimeout(runComputation, debounceMs);
    } else {
      runComputation();
    }

    return (): void => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [compute, debounceMs, ...deps]);

  return result;
}

/**
 * React hook for debounced state updates.
 *
 * This hook is part of the public API. Use it when you need both the immediate
 * value (for UI responsiveness) and a debounced value (for expensive operations
 * like API calls or heavy computations).
 *
 * @param initialValue - The initial state value
 * @param delay - Debounce delay in milliseconds
 * @returns Tuple of [debouncedValue, setValue, immediateValue]
 *
 * @example Search input with debounced API call
 * ```typescript
 * function SearchInput() {
 *   const [debouncedQuery, setQuery, immediateQuery] = useDebouncedState('', 300);
 *
 *   // immediateQuery updates instantly (responsive UI)
 *   // debouncedQuery updates after 300ms of no changes (API call)
 *
 *   useEffect(() => {
 *     if (debouncedQuery) {
 *       searchApi(debouncedQuery);
 *     }
 *   }, [debouncedQuery]);
 *
 *   return (
 *     <input
 *       value={immediateQuery}
 *       onChange={e => setQuery(e.target.value)}
 *     />
 *   );
 * }
 * ```
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number,
): [T, (value: T | ((prev: T) => T)) => void, T] {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return (): void => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return [debouncedValue, setValue, value];
}

/**
 * React hook for throttled callbacks.
 *
 * This hook is part of the public API. Use it to limit how often a callback
 * can be invoked. Unlike debouncing, throttling ensures the callback runs
 * at most once per interval (even during continuous calls).
 *
 * @param callback - The callback to throttle
 * @param delay - Minimum interval between calls in milliseconds
 * @returns A throttled version of the callback
 *
 * @example Throttled scroll handler
 * ```typescript
 * function ScrollableList() {
 *   const handleScroll = useThrottle((e: ScrollEvent) => {
 *     updateScrollPosition(e.target.scrollTop);
 *   }, 100); // At most once per 100ms
 *
 *   return <div onScroll={handleScroll}>...</div>;
 * }
 * ```
 *
 * @example Throttled resize handler
 * ```typescript
 * const handleResize = useThrottle(() => {
 *   recalculateLayout();
 * }, 200);
 *
 * useEffect(() => {
 *   window.addEventListener('resize', handleResize);
 *   return () => window.removeEventListener('resize', handleResize);
 * }, [handleResize]);
 * ```
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
): T {
  const lastCallRef = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        return callback(...args);
      }
      return undefined;
    }) as T,
    [callback, delay],
  );
}

/**
 * React hook for debounced callbacks.
 *
 * This hook is part of the public API. Use it to delay callback execution
 * until after a period of inactivity. Useful for search inputs, form validation,
 * or any action that shouldn't fire on every keystroke.
 *
 * @param callback - The callback to debounce
 * @param delay - Delay in milliseconds after last call before executing
 * @returns A debounced version of the callback
 *
 * @example Debounced input handler
 * ```typescript
 * function AutosaveForm() {
 *   const saveToServer = useDebounce((data: FormData) => {
 *     api.save(data);
 *   }, 1000); // Save 1s after user stops typing
 *
 *   return (
 *     <input onChange={e => saveToServer({ value: e.target.value })} />
 *   );
 * }
 * ```
 *
 * @example Debounced validation
 * ```typescript
 * const validateEmail = useDebounce(async (email: string) => {
 *   const isAvailable = await api.checkEmailAvailability(email);
 *   setEmailError(isAvailable ? null : 'Email already taken');
 * }, 500);
 * ```
 */
export function useDebounce<T extends (...args: unknown[]) => void>(callback: T, delay: number): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay],
  );
}
