// client/src/cache/RecordCache.ts

/**
 * A generic type-safe cache for records indexed by type and ID.
 * Supports optimistic updates with rollback capability.
 *
 * @example
 * ```typescript
 * interface User { id: string; name: string; version: number }
 * interface Post { id: string; title: string; version: number }
 *
 * type Tables = {
 *   user: User;
 *   post: Post;
 * };
 *
 * const cache = new RecordCache<Tables>();
 *
 * // Set a record
 * cache.set('user', 'u1', { id: 'u1', name: 'Alice', version: 1 });
 *
 * // Get a record
 * const user = cache.get('user', 'u1');
 *
 * // Optimistic update with rollback
 * const rollback = cache.optimisticUpdate('user', 'u1', { name: 'Bob' });
 * // If the server rejects, call rollback()
 * ```
 */

/**
 * A record pointer identifies a specific record by table and ID.
 */
export interface RecordPointer<T extends string = string> {
  table: T;
  id: string;
}

/**
 * Represents a change to a record, capturing before and after states.
 */
export interface RecordChange<TRecord = unknown> {
  table: string;
  id: string;
  before: TRecord | undefined;
  after: TRecord | undefined;
}

/**
 * Callback function for record change listeners.
 */
export type RecordChangeListener<TRecord = unknown> = (change: RecordChange<TRecord>) => void;

/**
 * Options for setting a record in the cache.
 */
export interface SetRecordOptions {
  /**
   * If true, always overwrite the existing record regardless of version.
   * Default: false (only update if new version is higher)
   */
  force?: boolean;

  /**
   * TTL (time-to-live) in milliseconds for this specific entry.
   * Overrides the default TTL if set.
   * Set to 0 or undefined to use the default TTL.
   * Set to Infinity for no expiration.
   */
  ttl?: number;
}

/**
 * Options for configuring the RecordCache.
 */
export interface RecordCacheOptions {
  /**
   * Function to extract version number from a record.
   * Used to determine if a record should be updated.
   * Default: checks for 'version' property
   */
  getVersion?: (record: unknown) => number | undefined;

  /**
   * Default TTL (time-to-live) in milliseconds for cache entries.
   * If not set, entries never expire.
   * Can be overridden per-entry via SetRecordOptions.
   */
  defaultTtl?: number;

  /**
   * Whether to track cache statistics (hits, misses, etc.).
   * Default: false (no overhead when disabled)
   */
  trackStats?: boolean;
}

/**
 * Cache statistics for monitoring and debugging.
 */
export interface CacheStats {
  /** Number of cache hits (record found) */
  hits: number;
  /** Number of cache misses (record not found) */
  misses: number;
  /** Number of records currently in cache */
  size: number;
  /** Number of expired entries that were evicted */
  evictions: number;
  /** Hit rate as a percentage (0-100) */
  hitRate: number;
}

/**
 * Type constraint for records that have an ID field.
 */
export interface IdentifiableRecord {
  id: string;
}

/**
 * Type constraint for the table map structure.
 * Each key is a table name, each value is the record type for that table.
 */
export type TableMap = Record<string, IdentifiableRecord>;

/**
 * Internal storage structure for a single record entry.
 */
interface CacheEntry<TRecord> {
  record: TRecord;
  version: number | undefined;
  /** Timestamp when this entry expires (undefined = never expires) */
  expiresAt: number | undefined;
}

/**
 * Internal storage structure for optimistic update state.
 */
interface OptimisticState<TRecord> {
  originalRecord: TRecord | undefined;
  originalVersion: number | undefined;
}

/**
 * A type-safe, generic cache for storing records by type and ID.
 *
 * Features:
 * - Generic type safety for record tables
 * - Version-based conflict resolution
 * - Optimistic updates with rollback support
 * - Change listeners for reactivity
 * - Bulk operations for efficiency
 *
 * @typeParam TTables - A map of table names to record types
 */
export class RecordCache<TTables extends TableMap = TableMap> {
  private readonly storage = new Map<string, Map<string, CacheEntry<unknown>>>();
  private readonly listeners = new Map<string, Set<RecordChangeListener>>();
  private readonly globalListeners = new Set<RecordChangeListener>();
  private readonly optimisticStates = new Map<string, OptimisticState<unknown>>();
  private readonly getVersion: (record: unknown) => number | undefined;
  private readonly defaultTtl: number | undefined;
  private readonly trackStats: boolean;
  private stats = { hits: 0, misses: 0, evictions: 0 };

  constructor(options: RecordCacheOptions = {}) {
    this.getVersion = options.getVersion ?? this.defaultGetVersion.bind(this);
    this.defaultTtl = options.defaultTtl;
    this.trackStats = options.trackStats ?? false;
  }

  private defaultGetVersion(record: unknown): number | undefined {
    if (
      record !== null &&
      typeof record === 'object' &&
      'version' in record &&
      typeof (record as { version: unknown }).version === 'number'
    ) {
      return (record as { version: number }).version;
    }
    return undefined;
  }

  private getCacheKey(table: string, id: string): string {
    return `${table}:${id}`;
  }

  private getTableStorage(table: string): Map<string, CacheEntry<unknown>> {
    let tableStorage = this.storage.get(table);
    if (tableStorage === undefined) {
      tableStorage = new Map();
      this.storage.set(table, tableStorage);
    }
    return tableStorage;
  }

  /**
   * Check if a cache entry has expired.
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    if (entry.expiresAt === undefined) return false;
    return Date.now() > entry.expiresAt;
  }

  /**
   * Calculate expiration timestamp from TTL.
   */
  private calculateExpiresAt(ttl: number | undefined): number | undefined {
    const effectiveTtl = ttl ?? this.defaultTtl;
    if (effectiveTtl === undefined || effectiveTtl === Infinity) {
      return undefined;
    }
    return Date.now() + effectiveTtl;
  }

  private notifyListeners<T extends keyof TTables & string>(
    change: RecordChange<TTables[T]>,
  ): void {
    const key = this.getCacheKey(change.table, change.id);

    // Notify specific listeners
    const specificListeners = this.listeners.get(key);
    if (specificListeners !== undefined) {
      for (const listener of specificListeners) {
        listener(change as RecordChange);
      }
    }

    // Notify global listeners
    for (const listener of this.globalListeners) {
      listener(change as RecordChange);
    }
  }

  /**
   * Get a record from the cache by table and ID.
   * Expired entries are automatically evicted on access.
   *
   * @param table - The table name
   * @param id - The record ID
   * @returns The record if found and not expired, undefined otherwise
   */
  get<T extends keyof TTables & string>(table: T, id: string): TTables[T] | undefined {
    const tableStorage = this.storage.get(table);
    if (tableStorage === undefined) {
      if (this.trackStats) this.stats.misses++;
      return undefined;
    }

    const entry = tableStorage.get(id);
    if (entry === undefined) {
      if (this.trackStats) this.stats.misses++;
      return undefined;
    }

    // Check expiration and evict if expired
    if (this.isExpired(entry)) {
      this.evictExpired(table, id, entry);
      if (this.trackStats) this.stats.misses++;
      return undefined;
    }

    if (this.trackStats) this.stats.hits++;
    return entry.record as TTables[T];
  }

  /**
   * Evict an expired entry and notify listeners.
   */
  private evictExpired(
    table: keyof TTables & string,
    id: string,
    entry: CacheEntry<unknown>,
  ): void {
    const tableStorage = this.storage.get(table);
    if (tableStorage === undefined) return;

    tableStorage.delete(id);

    // Clean up empty table storage
    if (tableStorage.size === 0) {
      this.storage.delete(table);
    }

    // Clear any optimistic state
    const key = this.getCacheKey(table, id);
    this.optimisticStates.delete(key);

    if (this.trackStats) this.stats.evictions++;

    this.notifyListeners({
      table,
      id,
      before: entry.record as TTables[keyof TTables & string],
      after: undefined,
    });
  }

  /**
   * Get a record from the cache using a pointer.
   *
   * @param pointer - The record pointer containing table and ID
   * @returns The record if found, undefined otherwise
   */
  getByPointer<T extends keyof TTables & string>(
    pointer: RecordPointer<T>,
  ): TTables[T] | undefined {
    return this.get(pointer.table, pointer.id);
  }

  /**
   * Set a record in the cache.
   * By default, only updates if the new record has a higher version.
   *
   * @param table - The table name
   * @param id - The record ID
   * @param record - The record to store
   * @param options - Options for setting the record (including optional TTL)
   * @returns true if the record was updated, false if skipped due to version
   */
  set<T extends keyof TTables & string>(
    table: T,
    id: string,
    record: TTables[T],
    options: SetRecordOptions = {},
  ): boolean {
    const tableStorage = this.getTableStorage(table);
    const existing = tableStorage.get(id);
    const newVersion = this.getVersion(record);

    // Check if existing entry is expired (treat as non-existent for version comparison)
    const existingNotExpired = existing !== undefined && !this.isExpired(existing);

    // Version check (unless forced)
    if (options.force !== true && existingNotExpired && newVersion !== undefined) {
      const existingVersion = existing.version;
      if (existingVersion !== undefined && existingVersion >= newVersion) {
        return false;
      }
    }

    const before = existingNotExpired ? (existing.record as TTables[T]) : undefined;

    tableStorage.set(id, {
      record,
      version: newVersion,
      expiresAt: this.calculateExpiresAt(options.ttl),
    });

    this.notifyListeners({
      table,
      id,
      before,
      after: record,
    });

    return true;
  }

  /**
   * Check if a record exists in the cache (and is not expired).
   *
   * @param table - The table name
   * @param id - The record ID
   * @returns true if the record exists and is not expired
   */
  has(table: keyof TTables & string, id: string): boolean {
    const tableStorage = this.storage.get(table);
    if (tableStorage === undefined) return false;

    const entry = tableStorage.get(id);
    if (entry === undefined) return false;

    // Check expiration
    if (this.isExpired(entry)) {
      this.evictExpired(table, id, entry);
      return false;
    }

    return true;
  }

  /**
   * Delete a record from the cache.
   *
   * @param table - The table name
   * @param id - The record ID
   * @returns The deleted record, or undefined if not found
   */
  delete<T extends keyof TTables & string>(table: T, id: string): TTables[T] | undefined {
    const tableStorage = this.storage.get(table);
    if (tableStorage === undefined) return undefined;

    const entry = tableStorage.get(id);
    if (entry === undefined) return undefined;

    tableStorage.delete(id);

    // Clean up empty table storage
    if (tableStorage.size === 0) {
      this.storage.delete(table);
    }

    // Clear any optimistic state
    const key = this.getCacheKey(table, id);
    this.optimisticStates.delete(key);

    const deletedRecord = entry.record as TTables[T];

    this.notifyListeners({
      table,
      id,
      before: deletedRecord,
      after: undefined,
    });

    return deletedRecord;
  }

  /**
   * Delete a record from the cache using a pointer.
   *
   * @param pointer - The record pointer containing table and ID
   * @returns The deleted record, or undefined if not found
   */
  deleteByPointer<T extends keyof TTables & string>(
    pointer: RecordPointer<T>,
  ): TTables[T] | undefined {
    return this.delete(pointer.table, pointer.id);
  }

  /**
   * Set multiple records at once.
   * More efficient than calling set() multiple times.
   *
   * @param records - Array of records with their table and ID
   * @param options - Options for setting records
   */
  setMany<T extends keyof TTables & string>(
    records: Array<{ table: T; id: string; record: TTables[T] }>,
    options: SetRecordOptions = {},
  ): void {
    for (const { table, id, record } of records) {
      this.set(table, id, record, options);
    }
  }

  /**
   * Delete multiple records at once.
   *
   * @param pointers - Array of record pointers to delete
   */
  deleteMany(pointers: Array<RecordPointer<keyof TTables & string>>): void {
    for (const pointer of pointers) {
      this.delete(pointer.table, pointer.id);
    }
  }

  /**
   * Perform an optimistic update on a record.
   * Returns a rollback function to restore the original state if needed.
   *
   * @param table - The table name
   * @param id - The record ID
   * @param updates - Partial record with the fields to update
   * @returns A rollback function, or undefined if the record doesn't exist
   *
   * @example
   * ```typescript
   * const rollback = cache.optimisticUpdate('user', 'u1', { name: 'New Name' });
   *
   * try {
   *   await api.updateUser('u1', { name: 'New Name' });
   *   // Success - optimistic update is now the truth
   * } catch (error) {
   *   // Failure - rollback to original state
   *   rollback?.();
   * }
   * ```
   */
  optimisticUpdate<T extends keyof TTables & string>(
    table: T,
    id: string,
    updates: Partial<TTables[T]>,
  ): (() => void) | undefined {
    const existing = this.get(table, id);
    if (existing === undefined) return undefined;

    const key = this.getCacheKey(table, id);
    const tableStorage = this.getTableStorage(table);
    const entry = tableStorage.get(id);

    // Store original state if not already in an optimistic update
    if (!this.optimisticStates.has(key)) {
      this.optimisticStates.set(key, {
        originalRecord: existing,
        originalVersion: entry?.version,
      });
    }

    // Apply the optimistic update
    const optimisticRecord = { ...existing, ...updates } as TTables[T];
    const currentVersion = entry?.version;
    const currentExpiresAt = entry?.expiresAt;

    tableStorage.set(id, {
      record: optimisticRecord,
      version: currentVersion,
      expiresAt: currentExpiresAt,
    });

    this.notifyListeners({
      table,
      id,
      before: existing,
      after: optimisticRecord,
    });

    // Return rollback function
    return () => {
      const state = this.optimisticStates.get(key);
      if (state === undefined) return;

      this.optimisticStates.delete(key);

      if (state.originalRecord === undefined) {
        // Record didn't exist before - delete it
        this.delete(table, id);
      } else {
        // Restore original record
        const currentRecord = this.get(table, id);
        const currentEntry = tableStorage.get(id);
        tableStorage.set(id, {
          record: state.originalRecord,
          version: state.originalVersion,
          expiresAt: currentEntry?.expiresAt,
        });

        this.notifyListeners({
          table,
          id,
          before: currentRecord,
          after: state.originalRecord as TTables[T],
        });
      }
    };
  }

  /**
   * Commit an optimistic update, clearing the rollback state.
   * Call this when the server confirms the update.
   *
   * @param table - The table name
   * @param id - The record ID
   */
  commitOptimisticUpdate(table: keyof TTables & string, id: string): void {
    const key = this.getCacheKey(table, id);
    this.optimisticStates.delete(key);
  }

  /**
   * Check if a record has a pending optimistic update.
   *
   * @param table - The table name
   * @param id - The record ID
   * @returns true if there's a pending optimistic update
   */
  hasOptimisticUpdate(table: keyof TTables & string, id: string): boolean {
    const key = this.getCacheKey(table, id);
    return this.optimisticStates.has(key);
  }

  /**
   * Subscribe to changes for a specific record.
   *
   * @param table - The table name
   * @param id - The record ID
   * @param listener - Callback function invoked on changes
   * @returns Unsubscribe function
   */
  subscribe<T extends keyof TTables & string>(
    table: T,
    id: string,
    listener: RecordChangeListener<TTables[T]>,
  ): () => void {
    const key = this.getCacheKey(table, id);

    let listeners = this.listeners.get(key);
    if (listeners === undefined) {
      listeners = new Set();
      this.listeners.set(key, listeners);
    }

    listeners.add(listener as RecordChangeListener);

    return () => {
      listeners.delete(listener as RecordChangeListener);
      if (listeners.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  /**
   * Subscribe to changes for a record using a pointer.
   *
   * @param pointer - The record pointer containing table and ID
   * @param listener - Callback function invoked on changes
   * @returns Unsubscribe function
   */
  subscribeByPointer<T extends keyof TTables & string>(
    pointer: RecordPointer<T>,
    listener: RecordChangeListener<TTables[T]>,
  ): () => void {
    return this.subscribe(pointer.table, pointer.id, listener);
  }

  /**
   * Subscribe to all changes in the cache.
   *
   * @param listener - Callback function invoked on any change
   * @returns Unsubscribe function
   */
  subscribeAll(listener: RecordChangeListener): () => void {
    this.globalListeners.add(listener);

    return () => {
      this.globalListeners.delete(listener);
    };
  }

  /**
   * Get all records from a specific table (excluding expired entries).
   *
   * @param table - The table name
   * @returns Array of all non-expired records in the table
   */
  getAll<T extends keyof TTables & string>(table: T): TTables[T][] {
    const tableStorage = this.storage.get(table);
    if (tableStorage === undefined) return [];

    const results: TTables[T][] = [];
    const expiredIds: string[] = [];

    for (const [id, entry] of tableStorage.entries()) {
      if (this.isExpired(entry)) {
        expiredIds.push(id);
      } else {
        results.push(entry.record as TTables[T]);
      }
    }

    // Clean up expired entries
    for (const id of expiredIds) {
      const entry = tableStorage.get(id);
      if (entry !== undefined) {
        this.evictExpired(table, id, entry);
      }
    }

    return results;
  }

  /**
   * Get all record IDs from a specific table (excluding expired entries).
   *
   * @param table - The table name
   * @returns Array of all non-expired record IDs in the table
   */
  getIds(table: keyof TTables & string): string[] {
    const tableStorage = this.storage.get(table);
    if (tableStorage === undefined) return [];

    const results: string[] = [];
    const expiredIds: string[] = [];

    for (const [id, entry] of tableStorage.entries()) {
      if (this.isExpired(entry)) {
        expiredIds.push(id);
      } else {
        results.push(id);
      }
    }

    // Clean up expired entries
    for (const id of expiredIds) {
      const entry = tableStorage.get(id);
      if (entry !== undefined) {
        this.evictExpired(table, id, entry);
      }
    }

    return results;
  }

  /**
   * Get the number of non-expired records in a table.
   *
   * @param table - The table name
   * @returns Number of non-expired records
   */
  count(table: keyof TTables & string): number {
    // Use getIds to get accurate count (filters expired)
    return this.getIds(table).length;
  }

  /**
   * Get all table names that have records.
   *
   * @returns Array of table names
   */
  getTables(): Array<keyof TTables & string> {
    return Array.from(this.storage.keys()) as Array<keyof TTables & string>;
  }

  /**
   * Clear all records from the cache.
   */
  clear(): void {
    // Notify listeners about all deletions
    for (const [table, tableStorage] of this.storage.entries()) {
      for (const [id, entry] of tableStorage.entries()) {
        this.notifyListeners({
          table,
          id,
          before: entry.record as TTables[typeof table],
          after: undefined,
        });
      }
    }

    this.storage.clear();
    this.optimisticStates.clear();
  }

  /**
   * Clear all records from a specific table.
   *
   * @param table - The table name to clear
   */
  clearTable(table: keyof TTables & string): void {
    const tableStorage = this.storage.get(table);
    if (tableStorage === undefined) return;

    // Notify listeners about all deletions
    for (const [id, entry] of tableStorage.entries()) {
      const key = this.getCacheKey(table, id);
      this.optimisticStates.delete(key);

      this.notifyListeners({
        table,
        id,
        before: entry.record as TTables[keyof TTables & string],
        after: undefined,
      });
    }

    this.storage.delete(table);
  }

  /**
   * Reset the cache, clearing all records and listeners.
   * Use with caution - this will remove all subscriptions.
   */
  reset(): void {
    this.storage.clear();
    this.listeners.clear();
    this.globalListeners.clear();
    this.optimisticStates.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Get cache statistics.
   * Only tracks stats if trackStats option was enabled.
   *
   * @returns Cache statistics including hits, misses, and hit rate
   */
  getStats(): CacheStats {
    let size = 0;
    for (const tableStorage of this.storage.values()) {
      size += tableStorage.size;
    }

    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size,
      evictions: this.stats.evictions,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Reset cache statistics.
   * Useful for starting a new measurement period.
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Manually prune all expired entries from the cache.
   * This is called automatically on get/has operations,
   * but can be called manually to proactively clean up.
   *
   * @returns Number of entries that were pruned
   */
  pruneExpired(): number {
    let pruned = 0;
    const now = Date.now();

    for (const [table, tableStorage] of this.storage.entries()) {
      const idsToRemove: string[] = [];

      for (const [id, entry] of tableStorage.entries()) {
        if (entry.expiresAt !== undefined && now > entry.expiresAt) {
          idsToRemove.push(id);
        }
      }

      for (const id of idsToRemove) {
        const entry = tableStorage.get(id);
        if (entry !== undefined) {
          tableStorage.delete(id);

          const key = this.getCacheKey(table, id);
          this.optimisticStates.delete(key);

          if (this.trackStats) this.stats.evictions++;
          pruned++;

          this.notifyListeners({
            table,
            id,
            before: entry.record as TTables[typeof table],
            after: undefined,
          });
        }
      }

      // Clean up empty table storage
      if (tableStorage.size === 0) {
        this.storage.delete(table);
      }
    }

    return pruned;
  }

  /**
   * Refresh the TTL for an existing cache entry.
   * Useful for extending the life of frequently accessed records.
   *
   * @param table - The table name
   * @param id - The record ID
   * @param ttl - New TTL in milliseconds (uses default if not provided)
   * @returns true if the entry was found and refreshed, false otherwise
   */
  refreshTtl(table: keyof TTables & string, id: string, ttl?: number): boolean {
    const tableStorage = this.storage.get(table);
    if (tableStorage === undefined) return false;

    const entry = tableStorage.get(id);
    if (entry === undefined) return false;

    // Don't refresh if already expired
    if (this.isExpired(entry)) {
      this.evictExpired(table, id, entry);
      return false;
    }

    entry.expiresAt = this.calculateExpiresAt(ttl);
    return true;
  }
}
