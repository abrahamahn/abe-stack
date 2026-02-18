// main/server/engine/src/cache/lru.ts
/**
 * Efficient LRU (Least Recently Used) Cache Implementation
 *
 * Provides O(1) get, set, and deletion operations using a combination
 * of Map and doubly-linked list. This is a backend-specific LRU with
 * per-entry TTL support and eviction reason tracking, used by the
 * MemoryCacheProvider.
 *
 * **Design decision**: This implementation is intentionally separate from
 * `@bslt/shared`'s LRU cache, which uses Map insertion order only.
 * The engine version uses a true doubly-linked list for:
 * - Per-entry TTL overrides (not just global TTL)
 * - Eviction reason callbacks (lru, expired, manual, clear)
 * - Deterministic LRU ordering independent of Map implementation details
 *
 * @complexity
 * - get: O(1)
 * - set: O(1)
 * - delete: O(1)
 * - has: O(1)
 * - clear: O(n) for eviction callbacks
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Reason for cache entry eviction.
 */
export type EvictionReason = 'expired' | 'lru' | 'manual' | 'clear';

/**
 * Callback invoked when an entry is evicted from the cache.
 *
 * @param key - The key of the evicted entry
 * @param value - The value of the evicted entry
 * @param reason - Why the entry was evicted
 */
export type EvictionCallback<K, V> = (key: K, value: V, reason: EvictionReason) => void;

/**
 * Options for creating an LRU cache.
 */
export interface LRUCacheOptions<K, V> {
  /** Maximum number of entries (required, must be > 0) */
  maxSize: number;
  /** Default TTL in milliseconds (0 = no expiration) */
  defaultTtl?: number;
  /** Callback invoked when entries are evicted */
  onEvict?: EvictionCallback<K, V>;
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Internal structure for doubly-linked list nodes.
 * @internal
 */
interface LRUNode<K, V> {
  key: K;
  value: V;
  expiresAt?: number;
  prev: LRUNode<K, V> | null;
  next: LRUNode<K, V> | null;
}

// ============================================================================
// LRU Cache Implementation
// ============================================================================

/**
 * LRU (Least Recently Used) Cache with O(1) operations.
 *
 * Uses a Map for O(1) key lookup and a doubly-linked list
 * for O(1) LRU ordering updates. Supports per-entry TTL overrides
 * and eviction reason callbacks.
 *
 * @example
 * ```ts
 * const cache = new LRUCache<string, User>({
 *   maxSize: 1000,
 *   defaultTtl: 60000,
 *   onEvict: (key, value, reason) => {
 *     console.log(`Evicted ${key}: ${reason}`);
 *   }
 * });
 *
 * cache.set('user:1', user);
 * const user = cache.get('user:1');
 * ```
 */
export class LRUCache<K, V> {
  private readonly cache: Map<K, LRUNode<K, V>>;
  private readonly maxSize: number;
  private readonly defaultTtl: number;
  private readonly onEvict: EvictionCallback<K, V> | undefined;

  /** Doubly-linked list head (most recently used) */
  private head: LRUNode<K, V> | null = null;
  /** Doubly-linked list tail (least recently used) */
  private tail: LRUNode<K, V> | null = null;

  /**
   * Creates a new LRU cache.
   *
   * @param options - Cache configuration options
   * @throws Error if maxSize is not a positive integer
   */
  constructor(options: LRUCacheOptions<K, V>) {
    if (options.maxSize <= 0 || !Number.isInteger(options.maxSize)) {
      throw new Error('maxSize must be a positive integer');
    }

    this.cache = new Map();
    this.maxSize = options.maxSize;
    this.defaultTtl = options.defaultTtl ?? 0;
    this.onEvict = options.onEvict;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Get a value from the cache.
   *
   * Moves the accessed entry to the head (most recently used).
   * Returns undefined if the key doesn't exist or has expired.
   *
   * @param key - The cache key
   * @returns The cached value or undefined
   * @complexity O(1)
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);
    if (node == null) {
      return undefined;
    }

    // Check if expired (lazy expiration)
    if (node.expiresAt != null && node.expiresAt <= Date.now()) {
      this.deleteNode(node, 'expired');
      return undefined;
    }

    // Move to front (most recently used)
    this.moveToHead(node);
    return node.value;
  }

  /**
   * Set a value in the cache.
   *
   * If the key already exists, updates the value and moves to head.
   * If at capacity, evicts the least recently used entry.
   *
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttlOverride - Optional TTL override in milliseconds
   * @complexity O(1)
   */
  set(key: K, value: V, ttlOverride?: number): void {
    const now = Date.now();
    const ttl = ttlOverride ?? this.defaultTtl;
    const expiresAt = ttl > 0 ? now + ttl : undefined;

    const existingNode = this.cache.get(key);
    if (existingNode != null) {
      // Update existing node
      existingNode.value = value;
      if (expiresAt !== undefined) {
        existingNode.expiresAt = expiresAt;
      } else {
        delete existingNode.expiresAt;
      }
      this.moveToHead(existingNode);
      return;
    }

    // Evict LRU entry if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictTail();
    }

    // Create and add new node
    const newNode: LRUNode<K, V> = {
      key,
      value,
      prev: null,
      next: this.head,
    };
    if (expiresAt !== undefined) {
      newNode.expiresAt = expiresAt;
    }

    if (this.head != null) {
      this.head.prev = newNode;
    }
    this.head = newNode;
    this.tail ??= newNode;

    this.cache.set(key, newNode);
  }

  /**
   * Delete a key from the cache.
   *
   * @param key - The cache key
   * @param reason - Eviction reason (default: 'manual')
   * @returns True if the key was deleted
   * @complexity O(1)
   */
  delete(key: K, reason: EvictionReason = 'manual'): boolean {
    const node = this.cache.get(key);
    if (node == null) {
      return false;
    }

    this.deleteNode(node, reason);
    return true;
  }

  /**
   * Check if a key exists in the cache.
   *
   * Performs lazy expiration check — removes expired entries.
   *
   * @param key - The cache key
   * @returns True if the key exists and is not expired
   * @complexity O(1)
   */
  has(key: K): boolean {
    const node = this.cache.get(key);
    if (node == null) {
      return false;
    }

    // Check if expired
    if (node.expiresAt != null && node.expiresAt <= Date.now()) {
      this.deleteNode(node, 'expired');
      return false;
    }

    return true;
  }

  /**
   * Clear all entries from the cache.
   *
   * Invokes the onEvict callback for each entry with reason 'clear'.
   *
   * @complexity O(n) where n is the number of entries (for callbacks)
   */
  clear(): void {
    if (this.onEvict != null) {
      for (const node of this.cache.values()) {
        this.onEvict(node.key, node.value, 'clear');
      }
    }

    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * Get the current number of entries in the cache.
   *
   * Note: May include expired entries (lazy expiration).
   *
   * @returns The number of entries
   * @complexity O(1)
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys in the cache.
   *
   * Cleans up expired entries before returning.
   *
   * @returns Array of keys
   * @complexity O(n)
   */
  keys(): K[] {
    this.cleanupExpired();
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values in the cache.
   *
   * Cleans up expired entries before returning.
   *
   * @returns Array of values
   * @complexity O(n)
   */
  values(): V[] {
    this.cleanupExpired();
    return Array.from(this.cache.values()).map((node) => node.value);
  }

  /**
   * Get all entries in the cache.
   *
   * Cleans up expired entries before returning.
   *
   * @returns Array of [key, value] tuples
   * @complexity O(n)
   */
  entries(): Array<[K, V]> {
    this.cleanupExpired();
    return Array.from(this.cache.entries()).map(([key, node]) => [key, node.value]);
  }

  /**
   * Iterate over all entries in LRU order (most recent first).
   *
   * @returns Iterator of [key, value] tuples
   * @complexity O(n) for full iteration
   */
  *[Symbol.iterator](): Iterator<[K, V]> {
    let current = this.head;
    const now = Date.now();

    while (current != null) {
      const next = current.next;

      // Skip expired entries
      if (current.expiresAt != null && current.expiresAt <= now) {
        this.deleteNode(current, 'expired');
      } else {
        yield [current.key, current.value];
      }

      current = next;
    }
  }

  // --------------------------------------------------------------------------
  // Private Methods: Linked List Operations
  // --------------------------------------------------------------------------

  /**
   * Remove a node from the linked list.
   * @internal
   */
  private unlinkNode(node: LRUNode<K, V>): void {
    if (node.prev != null) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next != null) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * Move a node to the head of the list.
   * @internal
   */
  private moveToHead(node: LRUNode<K, V>): void {
    if (node === this.head) {
      return;
    }

    // Remove from current position
    this.unlinkNode(node);

    // Add to head
    node.prev = null;
    node.next = this.head;

    if (this.head != null) {
      this.head.prev = node;
    }
    this.head = node;

    this.tail ??= node;
  }

  /**
   * Delete a node and invoke the eviction callback.
   * @internal
   */
  private deleteNode(node: LRUNode<K, V>, reason: EvictionReason): void {
    this.unlinkNode(node);
    this.cache.delete(node.key);
    this.onEvict?.(node.key, node.value, reason);
  }

  /**
   * Evict the tail (least recently used) entry.
   * @internal
   */
  private evictTail(): void {
    if (this.tail == null) {
      return;
    }

    this.deleteNode(this.tail, 'lru');
  }

  /**
   * Clean up all expired entries.
   * @internal
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const node of this.cache.values()) {
      if (node.expiresAt != null && node.expiresAt <= now) {
        this.deleteNode(node, 'expired');
      }
    }
  }
}
