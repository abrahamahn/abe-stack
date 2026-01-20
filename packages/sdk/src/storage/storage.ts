// packages/sdk/src/storage/storage.ts
/**
 * IndexedDB Storage Wrapper
 *
 * Uses native IndexedDB API for persistent storage.
 * Used by query persister and mutation queue.
 */

import { clear, createStore, del, get, keys, set } from './idb';

// ============================================================================
// Types
// ============================================================================

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  keys: () => Promise<string[]>;
}

// ============================================================================
// IndexedDB Storage
// ============================================================================

const STORE_NAME = 'abe-stack-cache';
const DB_NAME = 'abe-stack-db';

// Create a custom store for our app
const store = createStore(DB_NAME, STORE_NAME);

/**
 * IndexedDB storage adapter using idb-keyval
 */
export const idbStorage: StorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const value = await get<string>(key, store);
    return value ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    await set(key, value, store);
  },

  async removeItem(key: string): Promise<void> {
    await del(key, store);
  },

  async clear(): Promise<void> {
    await clear(store);
  },

  async keys(): Promise<string[]> {
    const allKeys = await keys<string>(store);
    return allKeys;
  },
};

// ============================================================================
// LocalStorage Fallback (for mutation queue - needs sync access)
// ============================================================================

const QUEUE_KEY = 'abe-stack-mutation-queue';

/**
 * Sync localStorage access for mutation queue
 * (needs to persist across page reloads immediately)
 */
export const localStorageQueue = {
  get(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(QUEUE_KEY);
  },

  set(value: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(QUEUE_KEY, value);
  },

  remove(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(QUEUE_KEY);
  },
};
