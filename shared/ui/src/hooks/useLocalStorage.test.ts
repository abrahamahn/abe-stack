// shared/ui/src/hooks/useLocalStorage.test.ts
/**
 * Tests for useLocalStorage hook.
 *
 * Tests localStorage persistence with SSR safety and cross-tab sync.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should return initial value when key does not exist', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

      expect(result.current[0]).toBe('initial');
    });

    it('should return stored value when key exists', () => {
      localStorage.setItem('test-key', JSON.stringify('stored'));

      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

      expect(result.current[0]).toBe('stored');
    });

    it('should handle number values', () => {
      localStorage.setItem('number-key', JSON.stringify(42));

      const { result } = renderHook(() => useLocalStorage('number-key', 0));

      expect(result.current[0]).toBe(42);
    });

    it('should handle boolean values', () => {
      localStorage.setItem('bool-key', JSON.stringify(true));

      const { result } = renderHook(() => useLocalStorage('bool-key', false));

      expect(result.current[0]).toBe(true);
    });

    it('should handle object values', () => {
      const obj = { foo: 'bar', count: 42 };
      localStorage.setItem('obj-key', JSON.stringify(obj));

      const { result } = renderHook(() => useLocalStorage('obj-key', {}));

      expect(result.current[0]).toEqual(obj);
    });

    it('should handle array values', () => {
      const arr = [1, 2, 3, 4, 5];
      localStorage.setItem('arr-key', JSON.stringify(arr));

      const { result } = renderHook(() => useLocalStorage<number[]>('arr-key', []));

      expect(result.current[0]).toEqual(arr);
    });

    it('should handle null as initial value', () => {
      const { result } = renderHook(() => useLocalStorage<string | null>('null-key', null));

      expect(result.current[0]).toBeNull();
    });

    it('should return initial value when stored value is invalid JSON', () => {
      localStorage.setItem('invalid-key', 'not-json');

      const { result } = renderHook(() => useLocalStorage('invalid-key', 'fallback'));

      expect(result.current[0]).toBe('fallback');
    });
  });

  describe('setValue', () => {
    it('should update state and localStorage', async () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

      act(() => {
        result.current[1]('updated');
      });

      expect(result.current[0]).toBe('updated');

      // Wait for microtask to complete
      await waitFor(() => {
        expect(localStorage.getItem('test-key')).toBe(JSON.stringify('updated'));
      });
    });

    it('should handle function updates', async () => {
      const { result } = renderHook(() => useLocalStorage('counter', 0));

      act(() => {
        result.current[1]((prev) => prev + 1);
      });

      expect(result.current[0]).toBe(1);

      await waitFor(() => {
        expect(localStorage.getItem('counter')).toBe(JSON.stringify(1));
      });

      act(() => {
        result.current[1]((prev) => prev + 10);
      });

      expect(result.current[0]).toBe(11);

      await waitFor(() => {
        expect(localStorage.getItem('counter')).toBe(JSON.stringify(11));
      });
    });

    it('should handle object updates', async () => {
      const { result } = renderHook(() => useLocalStorage('user', { name: 'John', age: 30 }));

      act(() => {
        result.current[1]({ name: 'Jane', age: 25 });
      });

      expect(result.current[0]).toEqual({ name: 'Jane', age: 25 });

      await waitFor(() => {
        expect(localStorage.getItem('user')).toBe(JSON.stringify({ name: 'Jane', age: 25 }));
      });
    });

    it('should handle array updates', async () => {
      const { result } = renderHook(() => useLocalStorage<number[]>('numbers', [1, 2, 3]));

      act(() => {
        result.current[1]([4, 5, 6]);
      });

      expect(result.current[0]).toEqual([4, 5, 6]);

      await waitFor(() => {
        expect(localStorage.getItem('numbers')).toBe(JSON.stringify([4, 5, 6]));
      });
    });

    it('should handle multiple rapid updates', async () => {
      const { result } = renderHook(() => useLocalStorage('rapid', 0));

      act(() => {
        result.current[1](1);
        result.current[1](2);
        result.current[1](3);
      });

      expect(result.current[0]).toBe(3);

      await waitFor(() => {
        expect(localStorage.getItem('rapid')).toBe(JSON.stringify(3));
      });
    });

    it('should handle setting null', async () => {
      const { result } = renderHook(() => useLocalStorage<string | null>('nullable', 'value'));

      act(() => {
        result.current[1](null);
      });

      expect(result.current[0]).toBeNull();

      await waitFor(() => {
        expect(localStorage.getItem('nullable')).toBe(JSON.stringify(null));
      });
    });

    it('should handle setting undefined by storing null', async () => {
      const { result } = renderHook(() =>
        useLocalStorage<string | undefined>('maybe', 'value'),
      );

      act(() => {
        result.current[1](undefined);
      });

      expect(result.current[0]).toBeUndefined();

      await waitFor(() => {
        const stored = localStorage.getItem('maybe');
        expect(stored).toBeTruthy();
      });
    });
  });

  describe('cross-tab synchronization', () => {
    it('should update when storage event fires', () => {
      const { result } = renderHook(() => useLocalStorage('sync-key', 'initial'));

      expect(result.current[0]).toBe('initial');

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'sync-key',
          newValue: JSON.stringify('from-other-tab'),
          oldValue: JSON.stringify('initial'),
          storageArea: localStorage,
        });
        window.dispatchEvent(event);
      });

      expect(result.current[0]).toBe('from-other-tab');
    });

    it('should not update for different keys', () => {
      const { result } = renderHook(() => useLocalStorage('key-a', 'value-a'));

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'key-b',
          newValue: JSON.stringify('value-b'),
          storageArea: localStorage,
        });
        window.dispatchEvent(event);
      });

      expect(result.current[0]).toBe('value-a');
    });

    it('should ignore events with null newValue', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'test-key',
          newValue: null,
          oldValue: JSON.stringify('initial'),
          storageArea: localStorage,
        });
        window.dispatchEvent(event);
      });

      expect(result.current[0]).toBe('initial');
    });

    it('should ignore invalid JSON from other tabs', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'test-key',
          newValue: 'invalid-json',
          storageArea: localStorage,
        });
        window.dispatchEvent(event);
      });

      expect(result.current[0]).toBe('initial');
    });

    it('should handle complex objects from other tabs', () => {
      const { result } = renderHook(() => useLocalStorage('complex', { a: 1 }));

      const complexValue = { b: 2, c: { d: 3 } };

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'complex',
          newValue: JSON.stringify(complexValue),
          storageArea: localStorage,
        });
        window.dispatchEvent(event);
      });

      expect(result.current[0]).toEqual(complexValue);
    });
  });

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useLocalStorage('test-key', 'value'));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('should not respond to events after unmount', () => {
      const { result, unmount } = renderHook(() => useLocalStorage('test-key', 'initial'));

      unmount();

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'test-key',
          newValue: JSON.stringify('after-unmount'),
          storageArea: localStorage,
        });
        window.dispatchEvent(event);
      });

      // Value should not change
      expect(result.current[0]).toBe('initial');
    });
  });

  describe('error handling', () => {
    it('should handle localStorage.getItem errors', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      getItemSpy.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useLocalStorage('error-key', 'fallback'));

      expect(result.current[0]).toBe('fallback');

      getItemSpy.mockRestore();
    });

    it('should handle localStorage.setItem errors silently', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      setItemSpy.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useLocalStorage('error-key', 'initial'));

      act(() => {
        result.current[1]('new-value');
      });

      // State should still update even if localStorage fails
      expect(result.current[0]).toBe('new-value');

      await waitFor(() => {
        expect(setItemSpy).toHaveBeenCalled();
      });

      setItemSpy.mockRestore();
    });

    it('should handle JSON.parse errors in setValue', () => {
      // This shouldn't normally happen, but test defensive coding
      const { result } = renderHook(() => useLocalStorage('test', 'initial'));

      // Should not throw
      act(() => {
        result.current[1]('valid');
      });

      expect(result.current[0]).toBe('valid');
    });
  });

  describe('SSR safety', () => {
    it('should return initial value when window is undefined', () => {
      const originalWindow = global.window;

      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      const { result } = renderHook(() => useLocalStorage('ssr-key', 'ssr-value'));

      expect(result.current[0]).toBe('ssr-value');

      global.window = originalWindow;
    });

    it('should not call localStorage when window is undefined', () => {
      const originalWindow = global.window;
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      renderHook(() => useLocalStorage('ssr-key', 'ssr-value'));

      expect(getItemSpy).not.toHaveBeenCalled();

      global.window = originalWindow;
    });
  });

  describe('edge cases', () => {
    it('should handle empty string key', async () => {
      const { result } = renderHook(() => useLocalStorage('', 'value'));

      act(() => {
        result.current[1]('updated');
      });

      await waitFor(() => {
        expect(localStorage.getItem('')).toBe(JSON.stringify('updated'));
      });
    });

    it('should handle very long keys', async () => {
      const longKey = 'k'.repeat(1000);
      const { result } = renderHook(() => useLocalStorage(longKey, 'value'));

      act(() => {
        result.current[1]('updated');
      });

      await waitFor(() => {
        expect(localStorage.getItem(longKey)).toBe(JSON.stringify('updated'));
      });
    });

    it('should handle very large values', async () => {
      const largeValue = 'x'.repeat(10000);
      const { result } = renderHook(() => useLocalStorage('large', ''));

      act(() => {
        result.current[1](largeValue);
      });

      await waitFor(() => {
        expect(localStorage.getItem('large')).toBe(JSON.stringify(largeValue));
      });
    });

    it('should handle special characters in key', async () => {
      const specialKey = 'key!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
      const { result } = renderHook(() => useLocalStorage(specialKey, 'value'));

      act(() => {
        result.current[1]('updated');
      });

      await waitFor(() => {
        expect(localStorage.getItem(specialKey)).toBe(JSON.stringify('updated'));
      });
    });

    it('should handle unicode in values', async () => {
      const unicode = '你好世界 🌍 مرحبا بالعالم';
      const { result } = renderHook(() => useLocalStorage('unicode', ''));

      act(() => {
        result.current[1](unicode);
      });

      await waitFor(() => {
        expect(localStorage.getItem('unicode')).toBe(JSON.stringify(unicode));
      });
    });

    it('should handle changing keys', () => {
      const { result, rerender } = renderHook(({ key }) => useLocalStorage(key, 'value'), {
        initialProps: { key: 'key1' },
      });

      act(() => {
        result.current[1]('value1');
      });

      rerender({ key: 'key2' });

      expect(result.current[0]).toBe('value');
    });
  });

  describe('type safety', () => {
    it('should maintain type through updates', () => {
      interface User {
        name: string;
        age: number;
      }

      const { result } = renderHook(() =>
        useLocalStorage<User>('user', { name: 'John', age: 30 }),
      );

      act(() => {
        result.current[1]({ name: 'Jane', age: 25 });
      });

      expect(result.current[0].name).toBe('Jane');
      expect(result.current[0].age).toBe(25);
    });

    it('should handle union types', () => {
      const { result } = renderHook(() => useLocalStorage<string | number>('union', 'text'));

      act(() => {
        result.current[1](42);
      });

      expect(result.current[0]).toBe(42);

      act(() => {
        result.current[1]('back to string');
      });

      expect(result.current[0]).toBe('back to string');
    });
  });
});
