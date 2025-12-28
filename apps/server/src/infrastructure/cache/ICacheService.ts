/**
 * Interface for cache service
 * Provides methods for interacting with application cache
 */
export interface ICacheService {
  /**
   * Initialize the cache service
   */
  initialize(): Promise<void>;

  /**
   * Shutdown the cache service
   */
  shutdown(): Promise<void>;

  /**
   * Get an item from the cache
   * @param key The key to fetch
   * @returns The cached value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set an item in the cache
   * @param key The key to store
   * @param value The value to store
   * @param ttl Time to live in seconds (optional)
   * @returns True if successful
   */
  set<T>(key: string, value: T, ttl?: number): Promise<boolean>;

  /**
   * Delete an item from the cache
   * @param key The key to delete
   * @returns True if successful
   */
  delete(key: string): Promise<boolean>;

  /**
   * Get multiple values from cache
   * @param keys Array of cache keys
   * @returns Object with key-value pairs
   */
  getMultiple<T>(keys: string[]): Promise<Record<string, T>>;

  /**
   * Set multiple values in cache
   * @param entries Object with key-value pairs
   * @param ttl Time to live in seconds (optional)
   */
  setMultiple<T>(entries: Record<string, T>, ttl?: number): Promise<boolean>;

  /**
   * Delete multiple values from cache
   * @param keys Array of cache keys
   */
  deleteMultiple(keys: string[]): Promise<boolean>;

  /**
   * Clear the entire cache
   * @returns True if successful
   */
  flush(): Promise<boolean>;

  /**
   * Alias for flush
   */
  clear(): Promise<boolean>;

  /**
   * Check if key exists in cache
   * @param key Cache key
   */
  has(key: string): Promise<boolean>;

  /**
   * Get all keys in the cache
   */
  keys(): string[];

  /**
   * Memoize a function by caching its results
   * @param fn Function to memoize
   * @param options Memoization options
   * @returns Memoized function that caches results
   */
  memoize<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    options?: {
      ttl?:
        | number
        | ((result: Awaited<ReturnType<T>>, executionTime: number) => number);
      keyFn?: (...args: unknown[]) => string;
    },
  ): T;

  /**
   * Get statistics about the cache
   * @returns Statistics object with hits, misses and size
   */
  getStats(): { hits: number; misses: number; size: number };
}
