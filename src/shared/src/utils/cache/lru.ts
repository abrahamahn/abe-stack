// packages/shared/src/utils/cache/lru.ts
/**
 * LRU Cache Implementation
 *
 * A variation of LRU cache that uses a Map's native insertion order
 * to track recency. This is O(1) for both reads and writes.
 */

export interface LRUCacheOptions<K, V> {
  /** Maximum number of items to store */
  max: number;
  /** Optional function to call when an item is evicted */
  dispose?: (key: K, value: V) => void;
  /** Time to live in milliseconds (optional) */
  ttl?: number;
}

export class LRUCache<K, V> {
  private cache = new Map<K, { value: V; expiry: number | null }>();
  private readonly max: number;
  // Use explicit union with undefined for exactOptionalPropertyTypes compatibility
  private readonly dispose: ((key: K, value: V) => void) | undefined;
  private readonly ttl: number | null;

  constructor(options: LRUCacheOptions<K, V>) {
    this.max = options.max;
    // Explicitly handle undefined assignment if strict
    this.dispose = options.dispose;
    this.ttl = options.ttl ?? null;
  }

  /**
   * Retrieves an item from the cache.
   *
   * @param key - The key to look up
   * @returns The value if found and valid, otherwise undefined
   */
  get(key: K): V | undefined {
    const item = this.cache.get(key);

    if (item === undefined) {
      return undefined;
    }

    // Check expiry
    if (item.expiry !== null && Date.now() > item.expiry) {
      this.delete(key);
      return undefined;
    }

    // Refresh: delete and re-set to move to end of Map (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.value;
  }

  /**
   * Adds or updates an item in the cache.
   * Evicts the least recently used item if the cache is full.
   *
   * @param key - The key to store
   * @param value - The value to store
   */
  set(key: K, value: V): void {
    // If key exists, delete it first so it goes to the end
    if (this.cache.has(key)) {
      if (this.dispose !== undefined) {
        const oldItem = this.cache.get(key);
        if (oldItem !== undefined) {
          this.dispose(key, oldItem.value);
        }
      }
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      // Evict oldest (first item in Map)
      const iterator = this.cache.keys();
      const oldestKey = iterator.next().value;
      if (oldestKey !== undefined) {
        const oldItem = this.cache.get(oldestKey);
        if (oldItem !== undefined && this.dispose !== undefined) {
          this.dispose(oldestKey, oldItem.value);
        }
        this.cache.delete(oldestKey);
      }
    }

    const expiry = this.ttl !== null ? Date.now() + this.ttl : null;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Checks if a key exists in the cache.
   *
   * @param key - The key to check
   * @returns True if the key exists
   */
  has(key: K): boolean {
    if (!this.cache.has(key)) return false;

    const item = this.cache.get(key);
    if (item === undefined) return false;
    if (item.expiry !== null && Date.now() > item.expiry) {
      // Don't modify map in has(), just return false?
      // User prompt used "if... expired... delete... return false".
      // I'll stick to that behaviour as it lazy-cleans.
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Removes an item from the cache.
   *
   * @param key - The key to remove
   * @returns True if the item was removed
   */
  delete(key: K): boolean {
    const item = this.cache.get(key);
    if (item !== undefined) {
      if (this.dispose !== undefined) {
        this.dispose(key, item.value);
      }
      return this.cache.delete(key);
    }
    return false;
  }

  /**
   * Clears all items from the cache.
   */
  clear(): void {
    if (this.dispose !== undefined) {
      for (const [key, item] of this.cache) {
        this.dispose(key, item.value);
      }
    }
    this.cache.clear();
  }

  /**
   * Returns the number of items in the cache.
   * @returns Cache size
   */
  size(): number {
    return this.cache.size;
  }
}
