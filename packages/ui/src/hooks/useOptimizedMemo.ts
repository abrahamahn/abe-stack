// packages/ui/src/hooks/useOptimizedMemo.ts
/**
 * Optimized React Hooks
 *
 * Performance-optimized versions of React hooks with better memoization strategies.
 */

import { useCallback, useRef, useState, useEffect } from 'react';

// ============================================================================
// Deep Comparison Utilities
// ============================================================================

/**
 * Deep equality check for objects and arrays
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
 * Shallow equality check for objects
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
 * useMemo with deep equality comparison
 */
export function useDeepMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const ref = useRef<{ deps: React.DependencyList; value: T } | undefined>(undefined);

  if (ref.current === undefined || !deepEqual(ref.current.deps, deps)) {
    ref.current = { deps: [...deps], value: factory() };
  }

  return ref.current.value;
}

/**
 * useMemo with shallow equality comparison
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
 * useCallback with deep equality comparison
 */
export function useDeepCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: React.DependencyList,
): T {
  return useDeepMemo(() => callback, deps);
}

/**
 * useCallback with shallow equality comparison
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
 * useEffect that only runs when dependencies change deeply
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
 * useEffect that only runs when dependencies change shallowly
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
 * Efficient Map-based cache with TTL
 */
export class TTLCache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  private cleanupTimer?: ReturnType<typeof setTimeout>;

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
 * Efficient LRU Cache
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
      if (!firstKeyResult.done) {
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
 * Hook for TTL cache
 */
export function useTTLCache<T>(defaultTTL?: number): TTLCache<T> {
  const cacheRef = useRef<TTLCache<T> | undefined>(undefined);

  if (cacheRef.current === undefined) {
    cacheRef.current = new TTLCache<T>(defaultTTL);
  }

  // Cleanup on unmount
  useEffect(() => {
    const cache = cacheRef.current;
    return (): void => {
      cache?.clear();
    };
  }, []);

  return cacheRef.current;
}

/**
 * Hook for LRU cache
 */
export function useLRUCache<T>(maxSize: number): LRUCache<T> {
  const cacheRef = useRef<LRUCache<T> | undefined>(undefined);

  if (cacheRef.current === undefined) {
    cacheRef.current = new LRUCache<T>(maxSize);
  }

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
 * Memoization helper for expensive computations
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
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Expensive computation failed:', error);
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
 * Hook for debounced state updates
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
 * Hook for throttled callbacks
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
 * Hook for debounced callbacks
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
