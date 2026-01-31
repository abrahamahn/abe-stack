// sdk/src/storage/idb.ts
/**
 * Minimal IndexedDB Wrapper
 *
 * Replaces idb-keyval with native IndexedDB API.
 * Provides simple key-value storage operations.
 */

// ============================================================================
// Types
// ============================================================================

export interface IDBStore {
  dbName: string;
  storeName: string;
}

// ============================================================================
// Store Creation
// ============================================================================

/**
 * Create a store reference for IndexedDB operations
 */
export function createStore(dbName: string, storeName: string): IDBStore {
  return { dbName, storeName };
}

// ============================================================================
// Database Connection
// ============================================================================

/**
 * Open IndexedDB connection and ensure object store exists
 */
function openDB(store: IDBStore): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(store.dbName, 1);

    request.onerror = (): void => {
      const error = request.error;
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    request.onsuccess = (): void => {
      resolve(request.result);
    };

    request.onupgradeneeded = (): void => {
      const db = request.result;
      if (!db.objectStoreNames.contains(store.storeName)) {
        db.createObjectStore(store.storeName);
      }
    };
  });
}

/**
 * Execute a transaction on the store
 */
async function withStore<T>(
  store: IDBStore,
  mode: IDBTransactionMode,
  callback: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB(store);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store.storeName, mode);
    const objectStore = tx.objectStore(store.storeName);
    const request = callback(objectStore);

    request.onerror = (): void => {
      const error = request.error;
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    request.onsuccess = (): void => {
      resolve(request.result);
    };

    tx.oncomplete = (): void => {
      db.close();
    };

    tx.onerror = (): void => {
      db.close();
      const error = tx.error;
      reject(error instanceof Error ? error : new Error(String(error)));
    };
  });
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get a value from the store
 */
export async function get<T>(key: string, store: IDBStore): Promise<T | undefined> {
  return withStore(store, 'readonly', (objectStore) => objectStore.get(key) as IDBRequest<T>);
}

/**
 * Set a value in the store
 */
export async function set(key: string, value: unknown, store: IDBStore): Promise<void> {
  await withStore(store, 'readwrite', (objectStore) => objectStore.put(value, key));
}

/**
 * Delete a value from the store
 */
export async function del(key: string, store: IDBStore): Promise<void> {
  await withStore(store, 'readwrite', (objectStore) => objectStore.delete(key));
}

/**
 * Clear all values from the store
 */
export async function clear(store: IDBStore): Promise<void> {
  await withStore(store, 'readwrite', (objectStore) => objectStore.clear());
}

/**
 * Get all keys from the store
 */
export async function keys<T extends IDBValidKey>(store: IDBStore): Promise<T[]> {
  return withStore(
    store,
    'readonly',
    (objectStore) => objectStore.getAllKeys() as unknown as IDBRequest<T[]>,
  );
}
