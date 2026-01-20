// apps/server/src/infra/database/json-database.ts
/**
 * JSON File Database - Development/Prototyping Mock
 *
 * A simple in-memory database with optional JSON file persistence.
 * Implements a subset of the Drizzle ORM interface for compatibility.
 *
 * Features:
 * - In-memory storage for fast operations
 * - Optional JSON file persistence
 * - Basic CRUD operations
 * - Simple query support (where, limit, orderBy)
 * - Mutex-based write locking (prevents race conditions in-process)
 * - Transaction rollback support via snapshots
 * - Returns copies of data to prevent reference leaks
 *
 * Limitations (vs PostgreSQL):
 * - No complex queries (joins, aggregations)
 * - Single process only (mutex is in-memory, not cross-process)
 * - Limited query operators
 *
 * Use for: Quick prototyping, demos, testing
 * Do not use for: Production workloads
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { JsonDatabaseConfig } from '@config/database.config';

// =============================================================================
// Simple Mutex for Write Operations
// =============================================================================

/**
 * Simple in-process mutex for serializing write operations.
 * This prevents race conditions when multiple async operations try to write concurrently.
 */
class Mutex {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }

  /**
   * Execute a function while holding the lock
   */
  async withLock<T>(fn: () => T | Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

// =============================================================================
// Types
// =============================================================================

/** Generic record with string ID */
type DbRecord = Record<string, unknown> & { id: string };

/** Table data structure */
type TableData<T extends DbRecord = DbRecord> = T[];

/** Database schema - map of table names to arrays of records */
interface DatabaseSchema {
  users: TableData;
  refresh_tokens: TableData;
  refresh_token_families: TableData;
  login_attempts: TableData;
  password_reset_tokens: TableData;
  email_verification_tokens: TableData;
  security_events: TableData;
  [key: string]: TableData;
}

/** Query condition */
type WhereCondition<T> = Partial<T> | ((record: T) => boolean);

/** Query options */
interface QueryOptions<T> {
  where?: WhereCondition<T>;
  limit?: number;
  offset?: number;
  orderBy?: { field: keyof T; direction: 'asc' | 'desc' };
}

function isDrizzleSql(obj: unknown): obj is { queryChunks?: unknown[]; sql?: string } {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  return 'queryChunks' in obj || 'sql' in obj;
}

// =============================================================================
// JSON Database Implementation
// =============================================================================

export class JsonDatabase {
  private data: DatabaseSchema;
  private readonly filePath: string;
  private readonly persistOnWrite: boolean;
  private readonly writeMutex = new Mutex();

  constructor(config: JsonDatabaseConfig) {
    this.filePath = config.filePath;
    this.persistOnWrite = config.persistOnWrite;
    this.data = this.loadFromFile();
  }

  // ===========================================================================
  // File Operations
  // ===========================================================================

  private loadFromFile(): DatabaseSchema {
    const defaultSchema: DatabaseSchema = {
      users: [],
      refresh_tokens: [],
      refresh_token_families: [],
      login_attempts: [],
      password_reset_tokens: [],
      email_verification_tokens: [],
      security_events: [],
    };

    if (!existsSync(this.filePath)) {
      return defaultSchema;
    }

    try {
      const content = readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(content) as Record<string, TableData>;
      return { ...defaultSchema, ...parsed };
    } catch {
      return defaultSchema;
    }
  }

  private saveToFile(): void {
    if (!this.persistOnWrite) return;

    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  // ===========================================================================
  // Core Operations
  // ===========================================================================

  /**
   * Get all records from a table (returns a shallow copy to prevent reference leaks)
   */
  getAll<T extends DbRecord>(table: string): T[] {
    const tableData = this.data[table] || [];
    return [...tableData] as T[];
  }

  /**
   * Find records matching a condition
   */
  find<T extends DbRecord>(table: string, options: QueryOptions<T> = {}): T[] {
    let records = this.getAll<T>(table);

    // Apply where condition
    if (options.where) {
      if (typeof options.where === 'function') {
        records = records.filter(options.where);
      } else {
        const conditions = options.where;
        records = records.filter((record) =>
          Object.entries(conditions).every(([key, value]) => record[key as keyof T] === value),
        );
      }
    }

    // Apply orderBy
    if (options.orderBy) {
      const { field, direction } = options.orderBy;
      records = [...records].sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        const comparison = aVal < bVal ? -1 : 1;
        return direction === 'desc' ? -comparison : comparison;
      });
    }

    // Apply offset and limit
    if (options.offset !== undefined) {
      records = records.slice(options.offset);
    }
    if (options.limit !== undefined) {
      records = records.slice(0, options.limit);
    }

    return records;
  }

  /**
   * Find a single record
   */
  findFirst<T extends DbRecord>(table: string, options: QueryOptions<T> = {}): T | undefined {
    const results = this.find<T>(table, { ...options, limit: 1 });
    return results[0];
  }

  /**
   * Find a record by ID (returns a shallow copy to prevent reference leaks)
   */
  findById(table: string, id: string): DbRecord | undefined {
    const record = this.getAll<DbRecord>(table).find((record) => record.id === id);
    return record ? { ...record } : undefined;
  }

  /**
   * Insert a record (async to support mutex locking)
   */
  async insert<T extends DbRecord>(
    table: string,
    data: Omit<T, 'id'> & { id?: string },
  ): Promise<T> {
    return this.writeMutex.withLock(() => {
      const id = data.id || this.generateId();
      const record = { ...data, id } as T;

      if (!this.data[table]) {
        this.data[table] = [];
      }
      this.data[table].push(record as DbRecord);
      this.saveToFile();

      return record;
    });
  }

  /**
   * Insert multiple records (async to support mutex locking)
   */
  async insertMany<T extends DbRecord>(
    table: string,
    records: Array<Omit<T, 'id'> & { id?: string }>,
  ): Promise<T[]> {
    return this.writeMutex.withLock(() => {
      const inserted: T[] = [];
      for (const data of records) {
        const id = data.id || this.generateId();
        const record = { ...data, id } as T;

        if (!this.data[table]) {
          this.data[table] = [];
        }
        this.data[table].push(record as DbRecord);
        inserted.push(record);
      }
      this.saveToFile();
      return inserted;
    });
  }

  /**
   * Update records matching a condition (async to support mutex locking)
   */
  async update<T extends DbRecord>(
    table: string,
    data: Partial<T>,
    where: WhereCondition<T>,
  ): Promise<T[]> {
    return this.writeMutex.withLock(() => {
      const updated: T[] = [];
      const tableData = this.data[table] || [];

      tableData.forEach((record, i) => {
        const typedRecord = record as T;
        const matches =
          typeof where === 'function'
            ? where(typedRecord)
            : Object.entries(where).every(([key, value]) => typedRecord[key as keyof T] === value);

        if (matches) {
          const updatedRecord = { ...typedRecord, ...data } as T;
          (this.data[table] as T[])[i] = updatedRecord;
          updated.push(updatedRecord);
        }
      });

      if (updated.length > 0) {
        this.saveToFile();
      }

      return updated;
    });
  }

  /**
   * Update a record by ID (async to support mutex locking)
   */
  async updateById<T extends DbRecord>(
    table: string,
    id: string,
    data: Partial<T>,
  ): Promise<T | undefined> {
    const updated = await this.update<T>(table, data, { id } as Partial<T>);
    return updated[0];
  }

  /**
   * Delete records matching a condition (async to support mutex locking)
   */
  async delete<T extends DbRecord>(table: string, where: WhereCondition<T>): Promise<T[]> {
    return this.writeMutex.withLock(() => {
      const deleted: T[] = [];
      const tableData = this.data[table] || [];
      const remaining: DbRecord[] = [];

      for (const record of tableData) {
        const typedRecord = record as T;
        const matches =
          typeof where === 'function'
            ? where(typedRecord)
            : Object.entries(where).every(([key, value]) => typedRecord[key as keyof T] === value);

        if (matches) {
          deleted.push(typedRecord);
        } else {
          remaining.push(record);
        }
      }

      if (deleted.length > 0) {
        this.data[table] = remaining;
        this.saveToFile();
      }

      return deleted;
    });
  }

  /**
   * Delete a record by ID (async to support mutex locking)
   */
  async deleteById(table: string, id: string): Promise<DbRecord | undefined> {
    const deleted = await this.delete(table, { id });
    return deleted[0];
  }

  /**
   * Count records matching a condition
   */
  count(table: string, where?: WhereCondition<DbRecord>): number {
    const records = where ? this.find<DbRecord>(table, { where }) : this.getAll(table);
    return records.length;
  }

  /**
   * Clear all data from a table (async to support mutex locking)
   */
  async clearTable(table: string): Promise<void> {
    return this.writeMutex.withLock(() => {
      this.data[table] = [];
      this.saveToFile();
    });
  }

  /**
   * Clear all data from all tables (async to support mutex locking)
   */
  async clearAll(): Promise<void> {
    return this.writeMutex.withLock(() => {
      for (const table of Object.keys(this.data)) {
        this.data[table] = [];
      }
      this.saveToFile();
    });
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  private generateId(): string {
    // Simple UUID v4-like generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Execute a raw "SQL" query (no-op for JSON, returns empty)
   * This is for compatibility with health checks that do `db.execute(sql`SELECT 1
   */
  execute(): unknown[] {
    // Return a fake successful result for compatibility
    return [{ '?column?': 1 }];
  }

  /**
   * Get internal data (for debugging/testing) - returns a deep copy
   */
  getData(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data)) as DatabaseSchema;
  }

  /**
   * Create a snapshot of the current database state for rollback
   */
  createSnapshot(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data)) as DatabaseSchema;
  }

  /**
   * Restore database state from a snapshot
   */
  async restoreSnapshot(snapshot: DatabaseSchema): Promise<void> {
    return this.writeMutex.withLock(() => {
      this.data = JSON.parse(JSON.stringify(snapshot)) as DatabaseSchema;
      this.saveToFile();
    });
  }
}

// =============================================================================
// Drizzle-Compatible Wrapper
// =============================================================================

/**
 * Creates a Drizzle-compatible database client backed by JSON storage.
 *
 * This wrapper provides a subset of the Drizzle ORM interface that's compatible
 * with the application's usage patterns. It doesn't implement the full Drizzle
 * API, but covers the operations used in the auth module.
 */
export function createJsonDbClient(config: JsonDatabaseConfig): JsonDbClient {
  const db = new JsonDatabase(config);
  return new JsonDbClient(db);
}

/**
 * JSON Database Client with Drizzle-like interface
 */
export class JsonDbClient {
  private readonly db: JsonDatabase;

  constructor(db: JsonDatabase) {
    this.db = db;
  }

  /**
   * Get the underlying JsonDatabase instance (for snapshot/restore operations)
   */
  getDatabase(): JsonDatabase {
    return this.db;
  }

  /**
   * Select query builder
   */
  select<T extends DbRecord = DbRecord>(_columns?: Record<string, unknown>): JsonSelectBuilder<T> {
    return new JsonSelectBuilder<T>(this.db);
  }

  /**
   * Insert query builder
   */
  insert<T extends DbRecord = DbRecord>(
    table: { _: { name: string } } | string,
  ): JsonInsertBuilder<T> {
    const tableName = typeof table === 'string' ? table : table._.name;
    return new JsonInsertBuilder<T>(this.db, tableName);
  }

  /**
   * Update query builder
   */
  update<T extends DbRecord = DbRecord>(
    table: { _: { name: string } } | string,
  ): JsonUpdateBuilder<T> {
    const tableName = typeof table === 'string' ? table : table._.name;
    return new JsonUpdateBuilder<T>(this.db, tableName);
  }

  /**
   * Delete query builder
   */
  delete<T extends DbRecord = DbRecord>(
    table: { _: { name: string } } | string,
  ): JsonDeleteBuilder<T> {
    const tableName = typeof table === 'string' ? table : table._.name;
    return new JsonDeleteBuilder<T>(this.db, tableName);
  }

  /**
   * Execute raw query (for compatibility with health checks)
   */
  execute(query: unknown): Promise<unknown[]> {
    // Ignore the query, just return success
    void query;
    return Promise.resolve(this.db.execute());
  }

  /**
   * Query API (simplified)
   */
  get query(): JsonQueryApi {
    return new JsonQueryApi(this.db);
  }

  /**
   * Transaction with rollback support
   *
   * Creates a snapshot of the database before executing the callback.
   * If the callback throws an error, the database is restored to the snapshot.
   */
  async transaction<T>(callback: (tx: JsonDbClient) => Promise<T>, _options?: unknown): Promise<T> {
    // Create a snapshot before starting the transaction
    const snapshot = this.db.createSnapshot();

    try {
      // Execute the callback
      const result = await callback(this);
      return result;
    } catch (error) {
      // Rollback on error by restoring the snapshot
      await this.db.restoreSnapshot(snapshot);
      throw error;
    }
  }
}

// =============================================================================
// Query Builders
// =============================================================================

class JsonSelectBuilder<T extends DbRecord> {
  private db: JsonDatabase;
  private tableName: string | null = null;
  private whereCondition: WhereCondition<T> | null = null;
  private limitValue: number | undefined;
  private offsetValue: number | undefined;

  constructor(db: JsonDatabase) {
    this.db = db;
  }

  from(table: { _: { name: string } } | string): this {
    this.tableName = typeof table === 'string' ? table : table._.name;
    return this;
  }

  where(condition: unknown): this {
    // Convert Drizzle-style conditions to our format
    this.whereCondition = this.parseCondition(condition);
    return this;
  }

  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  offset(value: number): this {
    this.offsetValue = value;
    return this;
  }

  then<TResult>(
    resolve: (value: T[]) => TResult,
    reject?: (reason: unknown) => TResult,
  ): Promise<TResult> {
    try {
      if (!this.tableName) {
        throw new Error('Table not specified. Call .from() first.');
      }

      const results = this.db.find<T>(this.tableName, {
        where: this.whereCondition ?? undefined,
        limit: this.limitValue,
        offset: this.offsetValue,
      });

      return Promise.resolve(resolve(results));
    } catch (error) {
      if (reject) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }

  private parseCondition(condition: unknown): WhereCondition<T> | null {
    if (!condition) return null;

    if (isDrizzleSql(condition)) {
      return () => true;
    }

    if (typeof condition === 'object') {
      // Direct object condition
      return condition as Partial<T>;
    }

    return null;
  }
}

class JsonInsertBuilder<T extends DbRecord> {
  private db: JsonDatabase;
  private tableName: string;
  private data: Array<Omit<T, 'id'> & { id?: string }> = [];
  private shouldReturn = false;

  constructor(db: JsonDatabase, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  values(data: Omit<T, 'id'> | Array<Omit<T, 'id'>>): this {
    this.data = Array.isArray(data)
      ? (data as Array<Omit<T, 'id'> & { id?: string }>)
      : [data as Omit<T, 'id'> & { id?: string }];
    return this;
  }

  returning(): this {
    this.shouldReturn = true;
    return this;
  }

  async then<TResult>(
    resolve: (value: T[]) => TResult,
    reject?: (reason: unknown) => TResult,
  ): Promise<TResult> {
    try {
      const inserted = await this.db.insertMany<T>(this.tableName, this.data);
      return resolve(this.shouldReturn ? inserted : ([] as T[]));
    } catch (error) {
      if (reject) {
        return reject(error);
      }
      throw error;
    }
  }
}

class JsonUpdateBuilder<T extends DbRecord> {
  private db: JsonDatabase;
  private tableName: string;
  private updateData: Partial<T> = {};
  private whereCondition: WhereCondition<T> | null = null;
  private shouldReturn = false;

  constructor(db: JsonDatabase, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  set(data: Partial<T>): this {
    this.updateData = data;
    return this;
  }

  where(condition: unknown): this {
    // Simple condition parsing
    if (typeof condition === 'object' && condition !== null) {
      this.whereCondition = condition as Partial<T>;
    }
    return this;
  }

  returning(): this {
    this.shouldReturn = true;
    return this;
  }

  async then<TResult>(
    resolve: (value: T[]) => TResult,
    reject?: (reason: unknown) => TResult,
  ): Promise<TResult> {
    try {
      if (!this.whereCondition) {
        throw new Error('WHERE condition required for UPDATE');
      }
      const updated = await this.db.update<T>(this.tableName, this.updateData, this.whereCondition);
      return resolve(this.shouldReturn ? updated : ([] as T[]));
    } catch (error) {
      if (reject) {
        return reject(error);
      }
      throw error;
    }
  }
}

class JsonDeleteBuilder<T extends DbRecord> {
  private db: JsonDatabase;
  private tableName: string;
  private whereCondition: WhereCondition<T> | null = null;
  private shouldReturn = false;

  constructor(db: JsonDatabase, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  where(condition: unknown): this {
    if (typeof condition === 'object' && condition !== null) {
      this.whereCondition = condition as Partial<T>;
    }
    return this;
  }

  returning(): this {
    this.shouldReturn = true;
    return this;
  }

  async then<TResult>(
    resolve: (value: T[]) => TResult,
    reject?: (reason: unknown) => TResult,
  ): Promise<TResult> {
    try {
      if (!this.whereCondition) {
        throw new Error('WHERE condition required for DELETE');
      }
      const deleted = await this.db.delete<T>(this.tableName, this.whereCondition);
      return resolve(this.shouldReturn ? deleted : ([] as T[]));
    } catch (error) {
      if (reject) {
        return reject(error);
      }
      throw error;
    }
  }
}

// =============================================================================
// Query API (db.query.tableName.findFirst/findMany)
// =============================================================================

class JsonQueryApi {
  private db: JsonDatabase;

  constructor(db: JsonDatabase) {
    this.db = db;
  }

  // Dynamic table access
  get users(): JsonTableQuery {
    return new JsonTableQuery(this.db, 'users');
  }

  get refreshTokens(): JsonTableQuery {
    return new JsonTableQuery(this.db, 'refresh_tokens');
  }

  get refreshTokenFamilies(): JsonTableQuery {
    return new JsonTableQuery(this.db, 'refresh_token_families');
  }

  get loginAttempts(): JsonTableQuery {
    return new JsonTableQuery(this.db, 'login_attempts');
  }

  get passwordResetTokens(): JsonTableQuery {
    return new JsonTableQuery(this.db, 'password_reset_tokens');
  }

  get emailVerificationTokens(): JsonTableQuery {
    return new JsonTableQuery(this.db, 'email_verification_tokens');
  }

  get securityEvents(): JsonTableQuery {
    return new JsonTableQuery(this.db, 'security_events');
  }
}

class JsonTableQuery {
  private db: JsonDatabase;
  private tableName: string;

  constructor(db: JsonDatabase, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  findFirst(options?: {
    where?: unknown;
    columns?: Record<string, boolean>;
  }): DbRecord | undefined {
    const where = options?.where ? this.parseWhere(options.where) : undefined;
    return this.db.findFirst(this.tableName, { where });
  }

  findMany<T extends DbRecord>(options?: {
    where?: unknown;
    limit?: number;
    offset?: number;
    columns?: Record<string, boolean>;
  }): T[] {
    const where = options?.where ? this.parseWhere(options.where) : undefined;
    return this.db.find<T>(this.tableName, {
      where,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  private parseWhere<T>(where: unknown): WhereCondition<T> | undefined {
    if (!where) return undefined;

    if (isDrizzleSql(where)) {
      return undefined;
    }

    if (typeof where === 'object') {
      return where as Partial<T>;
    }

    return undefined;
  }
}
