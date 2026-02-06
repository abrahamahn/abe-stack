// client/src/storage/storage.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { localStorageQueue } from '../storage';

// Mock localStorage
const createMockLocalStorage = (): {
  mockStorage: Storage;
  getItemMock: ReturnType<typeof vi.fn>;
  setItemMock: ReturnType<typeof vi.fn>;
  removeItemMock: ReturnType<typeof vi.fn>;
} => {
  let store: Record<string, string> = {};
  const getItemMock = vi.fn((key: string): string | null => store[key] ?? null);
  const setItemMock = vi.fn((key: string, value: string): void => {
    store[key] = value;
  });
  const removeItemMock = vi.fn((key: string): void => {
    const { [key]: _, ...rest } = store;
    store = rest;
  });

  return {
    mockStorage: {
      getItem: getItemMock,
      setItem: setItemMock,
      removeItem: removeItemMock,
      clear: (): void => {
        store = {};
      },
      length: 0,
      key: (index: number): string | null => {
        const keys = Object.keys(store);
        return keys[index] ?? null;
      },
    } as Storage,
    getItemMock,
    setItemMock,
    removeItemMock,
  };
};

describe('localStorageQueue', () => {
  let mockStorage: Storage;
  let setItemMock: ReturnType<typeof vi.fn>;
  let removeItemMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const {
      mockStorage: storage,
      setItemMock: setMock,
      removeItemMock: removeMock,
    } = createMockLocalStorage();
    mockStorage = storage;
    setItemMock = setMock;
    removeItemMock = removeMock;
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  describe('get', () => {
    test('should return null when no data stored', (): void => {
      const result = localStorageQueue.get();
      expect(result).toBeNull();
    });

    test('should return stored value', (): void => {
      mockStorage.setItem('abe-stack-mutation-queue', 'test-value');
      const result = localStorageQueue.get();
      expect(result).toBe('test-value');
    });

    test('should handle undefined localStorage gracefully', (): void => {
      Object.defineProperty(globalThis, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      const result = localStorageQueue.get();
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    test('should store value in localStorage', (): void => {
      localStorageQueue.set('test-data');
      expect(setItemMock).toHaveBeenCalledWith('abe-stack-mutation-queue', 'test-data');
    });

    test('should handle undefined localStorage gracefully', (): void => {
      Object.defineProperty(globalThis, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      // Should not throw
      expect(() => {
        localStorageQueue.set('test');
      }).not.toThrow();
    });
  });

  describe('remove', () => {
    test('should remove value from localStorage', (): void => {
      mockStorage.setItem('abe-stack-mutation-queue', 'test');
      localStorageQueue.remove();
      expect(removeItemMock).toHaveBeenCalledWith('abe-stack-mutation-queue');
    });

    test('should handle undefined localStorage gracefully', (): void => {
      Object.defineProperty(globalThis, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      // Should not throw
      expect(() => {
        localStorageQueue.remove();
      }).not.toThrow();
    });
  });
});

describe('idbStorage', () => {
  // Since idbStorage uses IndexedDB under the hood, and that requires
  // a browser environment, we mock the idb functions for unit testing
  // Full integration tests should use fake-indexeddb or run in browser

  // Testing the storage adapter interface behavior
  test('getItem returns null for missing keys in mock', async () => {
    // idbStorage is already exported, but needs IndexedDB
    // This is a behavioral test showing the expected interface
    const mockAdapter = {
      getItem: (key: string): Promise<string | null> => {
        if (key === 'exists') return Promise.resolve('value');
        return Promise.resolve(null);
      },
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      keys: vi.fn(),
    };

    expect(await mockAdapter.getItem('missing')).toBeNull();
    expect(await mockAdapter.getItem('exists')).toBe('value');
  });
});
