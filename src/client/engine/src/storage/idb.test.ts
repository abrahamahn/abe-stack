// src/client/engine/src/storage/idb.test.ts
/**
 * IDB Tests
 *
 * Unit tests for the IndexedDB wrapper.
 * Tests the synchronous functions and types.
 *
 * Note: Full CRUD operations (get, set, del, clear, keys) require
 * actual IndexedDB and are better tested as integration tests.
 */
import { describe, expect, it } from 'vitest';

import { createStore } from './idb';

// ============================================================================
// createStore Tests
// ============================================================================

describe('idb', () => {
  describe('createStore', () => {
    it('should create store with provided names', () => {
      const result = createStore('my-db', 'my-store');

      expect(result.dbName).toBe('my-db');
      expect(result.storeName).toBe('my-store');
    });

    it('should return object with correct shape', () => {
      const result = createStore('test', 'store');

      expect(result).toHaveProperty('dbName');
      expect(result).toHaveProperty('storeName');
      expect(Object.keys(result)).toHaveLength(2);
    });

    it('should handle empty strings', () => {
      const result = createStore('', '');

      expect(result.dbName).toBe('');
      expect(result.storeName).toBe('');
    });

    it('should handle special characters in names', () => {
      const result = createStore('db-with-dashes', 'store_with_underscores');

      expect(result.dbName).toBe('db-with-dashes');
      expect(result.storeName).toBe('store_with_underscores');
    });

    it('should handle unicode characters in names', () => {
      const result = createStore('日本語db', '中文store');

      expect(result.dbName).toBe('日本語db');
      expect(result.storeName).toBe('中文store');
    });

    it('should create independent store objects', () => {
      const store1 = createStore('db1', 'store1');
      const store2 = createStore('db2', 'store2');

      expect(store1).not.toBe(store2);
      expect(store1.dbName).not.toBe(store2.dbName);
      expect(store1.storeName).not.toBe(store2.storeName);
    });

    it('should create stores with same names as separate objects', () => {
      const store1 = createStore('same-db', 'same-store');
      const store2 = createStore('same-db', 'same-store');

      expect(store1).not.toBe(store2);
      expect(store1.dbName).toBe(store2.dbName);
      expect(store1.storeName).toBe(store2.storeName);
    });

    it('should handle long names', () => {
      const longName = 'a'.repeat(1000);
      const result = createStore(longName, longName);

      expect(result.dbName).toBe(longName);
      expect(result.storeName).toBe(longName);
    });
  });

  describe('IDBStore type', () => {
    it('should have correct type structure', () => {
      const store = createStore('test-db', 'test-store');

      // Type assertions
      const _dbName: string = store.dbName;
      const _storeName: string = store.storeName;

      expect(typeof _dbName).toBe('string');
      expect(typeof _storeName).toBe('string');
    });
  });

  // ============================================================================
  // Note on CRUD Operations
  // ============================================================================
  // The following operations require actual IndexedDB:
  // - get(key, store): Get a value from the store
  // - set(key, value, store): Set a value in the store
  // - del(key, store): Delete a value from the store
  // - clear(store): Clear all values from the store
  // - keys(store): Get all keys from the store
  //
  // These are tested as integration tests with real IndexedDB
  // (e.g., in browser or with fake-indexeddb library).
});
