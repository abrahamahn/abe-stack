// main/shared/src/utils/cache/lru.ts
/**
 * LRU Cache Implementation
 *
 * A variation of LRU cache that uses a Map's native insertion order
 * to track recency. This is O(1) for both reads and writes.
 *
 * TTL entries are lazily evicted on access and proactively evicted
 * during set() when the cache is full, ensuring expired entries
 * don't block fresh insertions.
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
  private readonly cache = new Map<K, { value: V; expiry: number | null }>();
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
   * @complexity O(1)
   */
  get(key: K): V | undefined {
    const item = this.cache.get(key);

    if (item === undefined) {
      return undefined;
    }

    // Check expiry
    if (item.expiry !== null && Date.now() > item.expiry) {
      this.evict(key, item.value);
      return undefined;
    }

    // Refresh: delete and re-set to move to end of Map (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.value;
  }

  /**
   * Adds or updates an item in the cache.
   * Evicts expired entries first when the cache is full, falling back
   * to the least recently used entry if no expired entries exist.
   *
   * @param key - The key to store
   * @param value - The value to store
   * @complexity O(1) amortized, O(n) worst case during expired-entry sweep
   */
  set(key: K, value: V): void {
    // If key exists, dispose and remove so it goes to the end
    if (this.cache.has(key)) {
      const oldItem = this.cache.get(key);
      if (oldItem !== undefined && this.dispose !== undefined) {
        this.dispose(key, oldItem.value);
      }
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      // Cache is full — try to evict an expired entry first
      if (!this.evictOneExpired()) {
        // No expired entries found — evict oldest (first item in Map)
        this.evictOldest();
      }
    }

    const expiry = this.ttl !== null ? Date.now() + this.ttl : null;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Checks if a key exists and is not expired.
   * This is a pure query — it does NOT mutate the cache.
   *
   * @param key - The key to check
   * @returns True if the key exists and is not expired
   * @complexity O(1)
   */
  has(key: K): boolean {
    const item = this.cache.get(key);
    if (item === undefined) return false;
    if (item.expiry !== null && Date.now() > item.expiry) {
      return false;
    }
    return true;
  }

  /**
   * Removes an item from the cache.
   *
   * @param key - The key to remove
   * @returns True if the item was removed
   * @complexity O(1)
   */
  delete(key: K): boolean {
    const item = this.cache.get(key);
    if (item !== undefined) {
      this.evict(key, item.value);
      return true;
    }
    return false;
  }

  /**
   * Clears all items from the cache, calling dispose for each.
   *
   * @complexity O(n)
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
   * Returns the number of non-expired items in the cache.
   * When TTL is not configured, this is O(1). With TTL,
   * this scans entries to exclude expired ones.
   *
   * @returns Accurate cache size excluding expired entries
   * @complexity O(1) without TTL, O(n) with TTL
   */
  size(): number {
    if (this.ttl === null) {
      return this.cache.size;
    }

    const now = Date.now();
    let count = 0;
    for (const item of this.cache.values()) {
      if (item.expiry === null || now <= item.expiry) {
        count++;
      }
    }
    return count;
  }

  /**
   * Returns the raw number of entries including expired ones.
   * Useful for diagnostics when you need the actual Map size.
   *
   * @returns Raw cache size including expired entries
   * @complexity O(1)
   */
  rawSize(): number {
    return this.cache.size;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Evict a single entry: call dispose and remove from the Map.
   */
  private evict(key: K, value: V): void {
    if (this.dispose !== undefined) {
      this.dispose(key, value);
    }
    this.cache.delete(key);
  }

  /**
   * Evict the oldest entry (first in Map insertion order).
   */
  private evictOldest(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey !== undefined) {
      const oldItem = this.cache.get(oldestKey);
      if (oldItem !== undefined) {
        this.evict(oldestKey, oldItem.value);
      }
    }
  }

  /**
   * Scan for and evict one expired entry.
   *
   * @returns true if an expired entry was found and evicted
   */
  private evictOneExpired(): boolean {
    if (this.ttl === null) return false;

    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (item.expiry !== null && now > item.expiry) {
        this.evict(key, item.value);
        return true;
      }
    }
    return false;
  }
}
