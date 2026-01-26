// apps/server/src/infrastructure/cache/utils/lru-cache.ts
/**
 * Efficient LRU (Least Recently Used) Cache Implementation
 *
 * Provides O(1) get, set, and deletion operations using a combination
 * of Map and doubly-linked list.
 */

interface LRUCacheNode<TKey, TValue> {
  key: TKey;
  value: TValue;
  expiresAt?: number;
  lastAccessedAt: number;
  prev: LRUCacheNode<TKey, TValue> | null;
  next: LRUCacheNode<TKey, TValue> | null;
}

export class LRUCache<TKey, TValue> {
  private readonly cache: Map<TKey, LRUCacheNode<TKey, TValue>>;
  private readonly maxSize: number;
  private readonly defaultTtl?: number;

  // Doubly-linked list pointers
  private head: LRUCacheNode<TKey, TValue> | null = null;
  private tail: LRUCacheNode<TKey, TValue> | null = null;

  constructor(maxSize: number, defaultTtl?: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
  }

  get(key: TKey): TValue | undefined {
    const node = this.cache.get(key);
    if (!node) {
      return undefined;
    }

    // Check if expired
    if (node.expiresAt != null && node.expiresAt <= Date.now()) {
      this.delete(key);
      return undefined;
    }

    // Move to front (most recently used)
    this.moveToFront(node);
    node.lastAccessedAt = Date.now();
    return node.value;
  }

  set(key: TKey, value: TValue, ttlOverride?: number): void {
    const now = Date.now();
    const ttl = ttlOverride ?? this.defaultTtl;
    const expiresAt = ttl ? now + ttl : undefined;

    const existingNode = this.cache.get(key);
    if (existingNode) {
      // Update existing node
      existingNode.value = value;
      existingNode.expiresAt = expiresAt;
      existingNode.lastAccessedAt = now;
      this.moveToFront(existingNode);
    } else {
      // Remove oldest item if at capacity
      if (this.cache.size >= this.maxSize && this.tail) {
        const tailKey = this.tail.key;
        this.removeNode(this.tail);
        this.cache.delete(tailKey);
      }

      // Create and add new node
      const newNode: LRUCacheNode<TKey, TValue> = {
        key,
        value,
        expiresAt,
        lastAccessedAt: now,
        prev: null,
        next: this.head,
      };

      if (this.head) {
        this.head.prev = newNode;
      }
      this.head = newNode;

      if (!this.tail) {
        // This is the first node
        this.tail = newNode;
      }

      this.cache.set(key, newNode);
    }
  }

  delete(key: TKey): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.cache.delete(key);
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  has(key: TKey): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    // Check if expired
    if (node.expiresAt != null && node.expiresAt <= Date.now()) {
      this.delete(key);
      return false;
    }

    return true;
  }

  size(): number {
    // Clean up expired entries first
    this.cleanupExpired();
    return this.cache.size;
  }

  keys(): TKey[] {
    // Clean up expired entries first
    this.cleanupExpired();
    return Array.from(this.cache.keys());
  }

  values(): TValue[] {
    // Clean up expired entries first
    this.cleanupExpired();
    return Array.from(this.cache.values()).map((node) => node.value);
  }

  entries(): [TKey, TValue][] {
    // Clean up expired entries first
    this.cleanupExpired();
    return Array.from(this.cache.entries()).map(([key, node]) => [key, node.value]);
  }

  private removeNode(node: LRUCacheNode<TKey, TValue>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      // This is the head
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      // This is the tail
      this.tail = node.prev;
    }
  }

  private moveToFront(node: LRUCacheNode<TKey, TValue>): void {
    // If already at head, no need to move
    if (node === this.head) {
      return;
    }

    // Remove from current position
    this.removeNode(node);

    // Add to head
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    // Update tail if needed
    if (!this.head.next) {
      // If we just moved the previous tail to head, update tail reference
      if (this.tail === node.next) {
        this.tail = node;
      }
    }

    // If this is the first node, update tail
    if (!this.tail) {
      this.tail = node;
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, node] of this.cache.entries()) {
      if (node.expiresAt != null && node.expiresAt <= now) {
        this.delete(key);
      }
    }
  }
}
