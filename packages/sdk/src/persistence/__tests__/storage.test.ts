// packages/sdk/src/persistence/__tests__/storage.test.ts
import { localStorageQueue } from '@persistence/storage';
import { beforeEach, describe, expect, test, vi } from 'vitest';

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
        return keys[index] || null;
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

// Note: idbStorage tests would require mocking IndexedDB which is more complex.
// These would typically be tested with a library like fake-indexeddb in integration tests.
