// main/client/engine/src/storage/RecordStorage.ts
/**
 * RecordStorage - Persistent IndexedDB storage for versioned records
 *
 * Provides:
 * - Generic typed record storage with table namespaces
 * - Version-based optimistic concurrency (only writes newer versions)
 * - Async CRUD operations with serialization
 * - Bulk operations for efficiency
 *
 * Based on chet-stack's RecordStorage pattern.
 */

import type { RecordPointer, VersionedRecord } from '@abe-stack/shared';

export type { RecordPointer, VersionedRecord };

// ============================================================================
// Types
// ============================================================================

/**
 * A record with its table context.
 */
export interface RecordWithTable<
  T extends string = string,
  R extends VersionedRecord = VersionedRecord,
> {
  table: T;
  id: string;
  record: R;
}

/**
 * Map of records organized by table and id.
 */
export type RecordMap<
  Tables extends string = string,
  R extends VersionedRecord = VersionedRecord,
> = {
  [T in Tables]?: {
    [id: string]: R | undefined;
  };
};

/**
 * Configuration options for RecordStorage.
 */
export interface RecordStorageOptions {
  /** IndexedDB database name */
  dbName?: string;
  /** IndexedDB object store name */
  storeName?: string;
  /** Current schema version for migrations */
  schemaVersion?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Storage event types for change notifications.
 */
export type RecordStorageEvent<
  T extends string = string,
  R extends VersionedRecord = VersionedRecord,
> = {
  type: 'write' | 'delete' | 'clear';
  table: T;
  id?: string;
  record?: R;
  previousRecord?: R;
};

/**
 * Listener function for storage events.
 */
export type RecordStorageListener<
  T extends string = string,
  R extends VersionedRecord = VersionedRecord,
> = (event: RecordStorageEvent<T, R>) => void;

/**
 * Error types for categorized error handling.
 */
export type RecordStorageErrorType =
  | 'QUOTA_EXCEEDED'
  | 'NOT_SUPPORTED'
  | 'TRANSACTION_ERROR'
  | 'SERIALIZATION_ERROR'
  | 'UNKNOWN';

/**
 * Custom error class for storage operations.
 * Provides categorized error handling for common storage issues.
 *
 * @example
 * ```ts
 * try {
 *   await storage.setRecord('user', record);
 * } catch (error) {
 *   if (error instanceof RecordStorageError && error.type === 'QUOTA_EXCEEDED') {
 *     // Handle quota exceeded - maybe clear old data
 *     await storage.clearTable('user');
 *   }
 * }
 * ```
 */
export class RecordStorageError extends Error {
  public readonly type: RecordStorageErrorType;
  public override readonly cause?: unknown;

  constructor(message: string, type: RecordStorageErrorType, cause?: unknown) {
    super(message);
    this.name = 'RecordStorageError';
    this.type = type;
    this.cause = cause;
  }
}

// ============================================================================
// Storage Key Utilities
// ============================================================================

/**
 * Create a storage key from table and id.
 */
function createKey(table: string, id: string): string {
  return `record:${table}:${id}`;
}

/**
 * Check if an error is a quota exceeded error.
 */
function isQuotaError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'QuotaExceededError' ||
      error.message.toLowerCase().includes('quota') ||
      error.message.toLowerCase().includes('storage')
    );
  }
  return false;
}

// ============================================================================
// Storage Backend Interface
// ============================================================================

interface StorageBackend {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  getAll<T>(prefix: string): Promise<T[]>;
  getAllKeys(prefix?: string): Promise<string[]>;
  clear(): Promise<void>;
  isAvailable(): boolean;
  getType(): 'indexeddb' | 'localstorage' | 'memory';
}

// ============================================================================
// IndexedDB Backend
// ============================================================================

class IndexedDBBackend implements StorageBackend {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private readonly dbName: string;
  private readonly storeName: string;

  constructor(dbName: string, storeName: string) {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  getType(): 'indexeddb' {
    return 'indexeddb';
  }

  private async openDB(): Promise<IDBDatabase> {
    if (this.db !== null) return this.db;
    if (this.dbPromise !== null) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = (): void => {
        this.dbPromise = null;
        const error = request.error;
        reject(
          new RecordStorageError(
            `Failed to open database: ${error?.message ?? 'Unknown error'}`,
            'TRANSACTION_ERROR',
            error,
          ),
        );
      };

      request.onsuccess = (): void => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (): void => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });

    return this.dbPromise;
  }

  private async withStore<T>(
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, mode);
      const store = tx.objectStore(this.storeName);
      const request = callback(store);

      request.onerror = (): void => {
        const error = request.error;
        if (isQuotaError(error)) {
          reject(
            new RecordStorageError(
              'Storage quota exceeded. Consider clearing old data.',
              'QUOTA_EXCEEDED',
              error,
            ),
          );
        } else {
          reject(
            new RecordStorageError(
              `Storage operation failed: ${error?.message ?? 'Unknown error'}`,
              'TRANSACTION_ERROR',
              error,
            ),
          );
        }
      };

      request.onsuccess = (): void => {
        resolve(request.result);
      };

      tx.onerror = (): void => {
        const error = tx.error;
        if (isQuotaError(error)) {
          reject(
            new RecordStorageError(
              'Storage quota exceeded. Consider clearing old data.',
              'QUOTA_EXCEEDED',
              error,
            ),
          );
        }
      };
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.withStore('readonly', (store) => store.get(key) as IDBRequest<T>);
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.withStore('readwrite', (store) => store.put(value, key));
  }

  async delete(key: string): Promise<void> {
    await this.withStore('readwrite', (store) => store.delete(key));
  }

  async getAll<T>(prefix: string): Promise<T[]> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.openCursor();
      const results: T[] = [];

      request.onerror = (): void => {
        const error = request.error;
        reject(
          new RecordStorageError(
            `Failed to iterate records: ${error?.message ?? 'Unknown error'}`,
            'TRANSACTION_ERROR',
            error,
          ),
        );
      };

      request.onsuccess = (): void => {
        const cursor = request.result;
        if (cursor !== null) {
          const key = cursor.key as string;
          if (key.startsWith(prefix)) {
            results.push(cursor.value as T);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }

  async getAllKeys(prefix?: string): Promise<string[]> {
    const allKeys = await this.withStore('readonly', (store) => store.getAllKeys());

    const stringKeys = allKeys.filter((k): k is string => typeof k === 'string');

    if (prefix !== undefined && prefix.length > 0) {
      return stringKeys.filter((k) => k.startsWith(prefix));
    }

    return stringKeys;
  }

  async clear(): Promise<void> {
    await this.withStore('readwrite', (store) => store.clear());
  }
}

// ============================================================================
// LocalStorage Backend (Fallback)
// ============================================================================

class LocalStorageBackend implements StorageBackend {
  private readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  isAvailable(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      const testKey = `${this.prefix}__test__`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  getType(): 'localstorage' {
    return 'localstorage';
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  get<T>(key: string): Promise<T | undefined> {
    const value = localStorage.getItem(this.getKey(key));
    if (value === null) return Promise.resolve(undefined);
    try {
      return Promise.resolve(JSON.parse(value) as T);
    } catch (error) {
      return Promise.reject(
        new RecordStorageError(
          `Failed to parse stored value for key "${key}"`,
          'SERIALIZATION_ERROR',
          error,
        ),
      );
    }
  }

  set(key: string, value: unknown): Promise<void> {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
      return Promise.resolve();
    } catch (error) {
      if (isQuotaError(error)) {
        return Promise.reject(
          new RecordStorageError(
            'Storage quota exceeded. Consider clearing old data.',
            'QUOTA_EXCEEDED',
            error,
          ),
        );
      }
      return Promise.reject(
        new RecordStorageError(
          `Failed to store value: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'TRANSACTION_ERROR',
          error,
        ),
      );
    }
  }

  delete(key: string): Promise<void> {
    localStorage.removeItem(this.getKey(key));
    return Promise.resolve();
  }

  getAll<T>(prefix: string): Promise<T[]> {
    const results: T[] = [];
    const fullPrefix = this.getKey(prefix);

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(fullPrefix) === true) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          try {
            results.push(JSON.parse(value) as T);
          } catch {
            // Skip malformed entries
          }
        }
      }
    }

    return Promise.resolve(results);
  }

  getAllKeys(prefix?: string): Promise<string[]> {
    const result: string[] = [];
    const basePrefix = this.getKey('');

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(basePrefix) === true) {
        const unprefixedKey = key.slice(basePrefix.length);
        if (prefix === undefined || prefix.length === 0 || unprefixedKey.startsWith(prefix)) {
          result.push(unprefixedKey);
        }
      }
    }

    return Promise.resolve(result);
  }

  clear(): Promise<void> {
    const keysToRemove: string[] = [];
    const basePrefix = this.getKey('');

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(basePrefix) === true) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }

    return Promise.resolve();
  }
}

// ============================================================================
// Memory Backend (Last Resort Fallback)
// ============================================================================

class MemoryBackend implements StorageBackend {
  private readonly storage = new Map<string, unknown>();

  isAvailable(): boolean {
    return true;
  }

  getType(): 'memory' {
    return 'memory';
  }

  get<T>(key: string): Promise<T | undefined> {
    return Promise.resolve(this.storage.get(key) as T | undefined);
  }

  set(key: string, value: unknown): Promise<void> {
    this.storage.set(key, value);
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.storage.delete(key);
    return Promise.resolve();
  }

  getAll<T>(prefix: string): Promise<T[]> {
    const results: T[] = [];
    for (const [key, value] of this.storage.entries()) {
      if (key.startsWith(prefix)) {
        results.push(value as T);
      }
    }
    return Promise.resolve(results);
  }

  getAllKeys(prefix?: string): Promise<string[]> {
    const allKeys = Array.from(this.storage.keys());
    if (prefix !== undefined && prefix.length > 0) {
      return Promise.resolve(allKeys.filter((k) => k.startsWith(prefix)));
    }
    return Promise.resolve(allKeys);
  }

  clear(): Promise<void> {
    this.storage.clear();
    return Promise.resolve();
  }
}

// ============================================================================
// RecordStorage Class
// ============================================================================

/**
 * Persistent storage for versioned records using IndexedDB with fallbacks.
 *
 * Features:
 * - Generic type safety for record tables
 * - Version-based optimistic concurrency
 * - IndexedDB primary storage with localStorage fallback
 * - In-memory fallback when no persistent storage is available
 * - Storage quota exceeded error handling
 * - Change event subscription
 *
 * @typeParam Tables - Union type of table names (e.g., 'user' | 'post')
 *
 * @example
 * ```ts
 * type MyTables = 'user' | 'post';
 * interface UserRecord extends VersionedRecord { name: string; }
 *
 * const storage = new RecordStorage<MyTables>({ dbName: 'myapp' });
 * await storage.ready();
 *
 * // Write a record
 * await storage.setRecord('user', { id: '1', version: 1, name: 'Alice' });
 *
 * // Read a record
 * const user = await storage.getRecord<UserRecord>({ table: 'user', id: '1' });
 * ```
 */
export class RecordStorage<Tables extends string = string> {
  private backend: StorageBackend;
  private readonly debug: boolean;
  private readonly listeners: Set<RecordStorageListener<Tables>>;
  private readonly readyPromise: Promise<void>;

  constructor(options: RecordStorageOptions = {}) {
    const { dbName = 'abe-stack-records', storeName = 'records', debug = false } = options;

    this.debug = debug;
    this.listeners = new Set();

    // Initialize backend with fallback chain
    this.backend = this.initializeBackend(dbName, storeName);

    // Initialize DB and run migrations
    this.readyPromise = this.initialize();
  }

  /**
   * Initialize storage backend with automatic fallback.
   */
  private initializeBackend(dbName: string, storeName: string): StorageBackend {
    // Try IndexedDB first
    const idbBackend = new IndexedDBBackend(dbName, storeName);
    if (idbBackend.isAvailable()) {
      this.log('Using IndexedDB backend');
      return idbBackend;
    }

    // Fall back to localStorage
    const lsBackend = new LocalStorageBackend(dbName);
    if (lsBackend.isAvailable()) {
      this.log('Using localStorage backend (IndexedDB not available)');
      return lsBackend;
    }

    // Last resort: in-memory storage
    this.log('Using in-memory backend (no persistent storage available)');
    return new MemoryBackend();
  }

  /**
   * Wait for storage to be ready.
   * Always call this before performing any operations.
   */
  async ready(): Promise<void> {
    await this.readyPromise;
  }

  /**
   * Initialize the database.
   */
  private async initialize(): Promise<void> {
    // Test that the backend is working
    try {
      await this.backend.getAllKeys();
      this.log('RecordStorage initialized');
    } catch (error) {
      this.log('Initialization error, falling back to memory:', error);
      this.backend = new MemoryBackend();
    }
  }

  /**
   * Debug logging helper.
   */
  private log(..._args: unknown[]): void {
    if (this.debug) {
      // Debug logging removed
    }
  }

  /**
   * Emit a storage event to all listeners.
   */
  private emit<R extends VersionedRecord>(event: RecordStorageEvent<Tables, R>): void {
    for (const listener of this.listeners) {
      try {
        listener(event as RecordStorageEvent<Tables>);
      } catch {
        // Listener error handled silently
      }
    }
  }

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  /**
   * Get a record by pointer.
   *
   * @param pointer - The record pointer containing table and id
   * @returns The record if found, undefined otherwise
   */
  async getRecord<R extends VersionedRecord = VersionedRecord>(
    pointer: RecordPointer<Tables>,
  ): Promise<R | undefined> {
    await this.readyPromise;

    const key = createKey(pointer.table, pointer.id);
    const value = await this.backend.get<R>(key);

    if (value !== undefined) {
      this.log('hit', pointer.table, pointer.id);
    } else {
      this.log('miss', pointer.table, pointer.id);
    }

    return value;
  }

  /**
   * Set a record. Only writes if version is newer than existing.
   *
   * @param table - The table name
   * @param record - The record to store (must have id and version)
   * @param force - If true, writes regardless of version
   * @returns true if the record was written, false if skipped due to version
   * @throws {RecordStorageError} If storage quota is exceeded
   */
  async setRecord(table: Tables, record: VersionedRecord, force = false): Promise<boolean> {
    await this.readyPromise;

    const key = createKey(table, record.id);

    // Read existing record to check version
    const existing = await this.backend.get<VersionedRecord>(key);

    // Skip if existing record has same or higher version (unless forced)
    if (!force && existing !== undefined && existing.version >= record.version) {
      this.log('skip (version)', table, record.id, existing.version, '>=', record.version);
      return false;
    }

    // Write the record
    await this.backend.set(key, record);

    this.log('write', table, record.id, `v${String(record.version)}`);
    this.emit({
      type: 'write',
      table,
      id: record.id,
      record,
      ...(existing !== undefined && { previousRecord: existing }),
    });

    return true;
  }

  /**
   * Delete a record by pointer.
   *
   * @param pointer - The record pointer containing table and id
   * @returns true if a record was deleted, false if not found
   */
  async deleteRecord(pointer: RecordPointer<Tables>): Promise<boolean> {
    await this.readyPromise;

    const key = createKey(pointer.table, pointer.id);

    // Check if record exists
    const existing = await this.backend.get<VersionedRecord>(key);

    if (existing === undefined) {
      this.log('delete (not found)', pointer.table, pointer.id);
      return false;
    }

    // Delete the record
    await this.backend.delete(key);

    this.log('delete', pointer.table, pointer.id);
    this.emit({ type: 'delete', table: pointer.table, id: pointer.id, previousRecord: existing });

    return true;
  }

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  /**
   * Write multiple records from a RecordMap.
   * Only writes records with newer versions than existing.
   *
   * @param recordMap - Map of records organized by table
   * @param force - If true, writes regardless of version
   * @returns Number of records written
   * @throws {RecordStorageError} If storage quota is exceeded
   */
  async writeRecordMap<R extends VersionedRecord = VersionedRecord>(
    recordMap: RecordMap<Tables, R>,
    force = false,
  ): Promise<number> {
    await this.readyPromise;

    let written = 0;

    for (const [table, records] of Object.entries(recordMap) as Array<
      [Tables, Record<string, R | undefined> | undefined]
    >) {
      if (records === undefined) continue;
      for (const record of Object.values(records)) {
        if (record !== undefined) {
          const wasWritten = await this.setRecord(table, record, force);
          if (wasWritten) written++;
        }
      }
    }

    return written;
  }

  /**
   * Get multiple records by pointers.
   */
  async getRecords<R extends VersionedRecord = VersionedRecord>(
    pointers: Array<RecordPointer<Tables>>,
  ): Promise<Array<R | undefined>> {
    await this.readyPromise;

    const results: Array<R | undefined> = [];
    for (const pointer of pointers) {
      const record = await this.getRecord<R>(pointer);
      results.push(record);
    }
    return results;
  }

  /**
   * Get all records in a table.
   *
   * @param table - The table name
   * @returns Array of all records in the table
   */
  async getAllRecords<R extends VersionedRecord = VersionedRecord>(table: Tables): Promise<R[]> {
    await this.readyPromise;

    const prefix = `record:${table}:`;
    return this.backend.getAll<R>(prefix);
  }

  // ==========================================================================
  // Query Helpers
  // ==========================================================================

  /**
   * Query records in a table with a filter function.
   */
  async queryRecords<R extends VersionedRecord = VersionedRecord>(
    table: Tables,
    predicate: (record: R) => boolean,
  ): Promise<R[]> {
    const allRecords = await this.getAllRecords<R>(table);
    return allRecords.filter(predicate);
  }

  /**
   * Find a single record in a table matching a predicate.
   */
  async findRecord<R extends VersionedRecord = VersionedRecord>(
    table: Tables,
    predicate: (record: R) => boolean,
  ): Promise<R | undefined> {
    const allRecords = await this.getAllRecords<R>(table);
    return allRecords.find(predicate);
  }

  /**
   * Count records in a table.
   */
  async countRecords(table: Tables): Promise<number> {
    const records = await this.getAllRecords(table);
    return records.length;
  }

  // ==========================================================================
  // Maintenance Operations
  // ==========================================================================

  /**
   * Clear all records from a specific table.
   *
   * @param table - The table name
   * @returns Number of records deleted
   */
  async clearTable(table: Tables): Promise<number> {
    await this.readyPromise;

    const prefix = `record:${table}:`;
    const keys = await this.backend.getAllKeys(prefix);

    for (const key of keys) {
      await this.backend.delete(key);
    }

    this.log('clearTable', table, keys.length, 'records');
    this.emit({ type: 'clear', table });

    return keys.length;
  }

  /**
   * Clear all records from all tables.
   */
  async reset(): Promise<void> {
    await this.readyPromise;
    await this.backend.clear();
    this.log('reset complete');
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Get the storage backend type currently in use.
   *
   * @returns 'indexeddb' | 'localstorage' | 'memory'
   */
  getBackendType(): 'indexeddb' | 'localstorage' | 'memory' {
    return this.backend.getType();
  }

  /**
   * Check if the storage is using persistent storage (not in-memory).
   *
   * @returns true if using IndexedDB or localStorage
   */
  isPersistent(): boolean {
    return this.backend.getType() !== 'memory';
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  /**
   * Subscribe to storage events.
   */
  subscribe(listener: RecordStorageListener<Tables>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new RecordStorage instance.
 */
export function createRecordStorage<Tables extends string = string>(
  options?: RecordStorageOptions,
): RecordStorage<Tables> {
  return new RecordStorage<Tables>(options);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Iterate over all records in a RecordMap.
 */
export function* iterateRecordMap<Tables extends string, R extends VersionedRecord>(
  recordMap: RecordMap<Tables, R>,
): Generator<RecordWithTable<Tables, R>> {
  for (const [table, records] of Object.entries(recordMap) as Array<
    [Tables, Record<string, R | undefined> | undefined]
  >) {
    if (records === undefined) continue;
    for (const [id, record] of Object.entries(records)) {
      if (record !== undefined) {
        yield { table, id, record };
      }
    }
  }
}

/**
 * Create a RecordMap from an array of records with table.
 */
export function createRecordMap<Tables extends string, R extends VersionedRecord>(
  records: Array<RecordWithTable<Tables, R>>,
): RecordMap<Tables, R> {
  // Use null-prototype object to prevent prototype pollution
  const map = Object.create(null) as RecordMap<Tables, R>;

  for (const { table, id, record } of records) {
    if (!Object.hasOwn(map, table)) {
      const tableMap = Object.create(null) as Record<string, R>;
      (map as Record<Tables, Record<string, R>>)[table] = tableMap;
    }
    (map[table] as Record<string, R>)[id] = record;
  }

  return map;
}
