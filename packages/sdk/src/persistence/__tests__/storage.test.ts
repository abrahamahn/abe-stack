// packages/sdk/src/persistence/__tests__/storage.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { localStorageQueue } from '@persistence/storage';

// Mock localStorage
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
    length: 0,
    key: () => null,
  };
};

describe('localStorageQueue', () => {
  let mockStorage: ReturnType<typeof createMockLocalStorage>;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  describe('get', () => {
    test('should return null when no data stored', () => {
      const result = localStorageQueue.get();
      expect(result).toBeNull();
    });

    test('should return stored value', () => {
      mockStorage.setItem('abe-stack-mutation-queue', 'test-value');
      const result = localStorageQueue.get();
      expect(result).toBe('test-value');
    });

    test('should handle undefined localStorage gracefully', () => {
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
    test('should store value in localStorage', () => {
      localStorageQueue.set('test-data');
      expect(mockStorage.setItem).toHaveBeenCalledWith('abe-stack-mutation-queue', 'test-data');
    });

    test('should handle undefined localStorage gracefully', () => {
      Object.defineProperty(globalThis, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      // Should not throw
      expect(() => localStorageQueue.set('test')).not.toThrow();
    });
  });

  describe('remove', () => {
    test('should remove value from localStorage', () => {
      mockStorage.setItem('abe-stack-mutation-queue', 'test');
      localStorageQueue.remove();
      expect(mockStorage.removeItem).toHaveBeenCalledWith('abe-stack-mutation-queue');
    });

    test('should handle undefined localStorage gracefully', () => {
      Object.defineProperty(globalThis, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      // Should not throw
      expect(() => localStorageQueue.remove()).not.toThrow();
    });
  });
});

// Note: idbStorage tests would require mocking IndexedDB which is more complex.
// These would typically be tested with a library like fake-indexeddb in integration tests.
