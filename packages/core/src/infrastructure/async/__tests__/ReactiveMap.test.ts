// packages/core/src/infrastructure/async/__tests__/ReactiveMap.test.ts
import { describe, expect, test, vi, beforeEach } from 'vitest';

import { ReactiveMap } from '../ReactiveMap';

describe('ReactiveMap', () => {
  let reactiveMap: ReactiveMap<string, number>;

  beforeEach(() => {
    reactiveMap = new ReactiveMap<string, number>();
  });

  describe('constructor', () => {
    test('should initialize an empty map', () => {
      expect(reactiveMap.size).toBe(0);
      expect(reactiveMap.keys()).toEqual([]);
      expect(reactiveMap.values()).toEqual([]);
      expect(reactiveMap.entries()).toEqual([]);
    });

    test('should initialize with initial values', () => {
      const initialEntries = [['key1', 1], ['key2', 2]] as [string, number][];
      const map = new ReactiveMap<string, number>(initialEntries);

      expect(map.size).toBe(2);
      expect(map.get('key1')).toBe(1);
      expect(map.get('key2')).toBe(2);
    });

    test('should handle empty initial array', () => {
      const map = new ReactiveMap<string, number>([]);
      
      expect(map.size).toBe(0);
    });
  });

  describe('get', () => {
    test('should return value for existing key', () => {
      reactiveMap.set('key1', 42);

      expect(reactiveMap.get('key1')).toBe(42);
    });

    test('should return undefined for non-existing key', () => {
      expect(reactiveMap.get('nonexistent')).toBeUndefined();
    });

    test('should handle falsy values', () => {
      const map = new ReactiveMap<string, number | string | null | boolean>();
      map.set('zero', 0);
      map.set('empty', '');
      map.set('null', null);
      map.set('false', false);

      expect(map.get('zero')).toBe(0);
      expect(map.get('empty')).toBe('');
      expect(map.get('null')).toBe(null);
      expect(map.get('false')).toBe(false);
    });

    test('should handle complex keys', () => {
      const complexKey = 'complex-key-with-special-chars!@#$%^&*()';
      reactiveMap.set(complexKey, 123);

      expect(reactiveMap.get(complexKey)).toBe(123);
    });
  });

  describe('set', () => {
    test('should add new key-value pair', () => {
      reactiveMap.set('newKey', 100);

      expect(reactiveMap.get('newKey')).toBe(100);
      expect(reactiveMap.size).toBe(1);
    });

    test('should update existing key-value pair', () => {
      reactiveMap.set('existingKey', 50);
      expect(reactiveMap.get('existingKey')).toBe(50);

      reactiveMap.set('existingKey', 75);
      expect(reactiveMap.get('existingKey')).toBe(75);
      expect(reactiveMap.size).toBe(1);
    });

    test('should return the map instance for chaining', () => {
      const result = reactiveMap.set('key', 1);
      
      expect(result).toBe(reactiveMap);
    });

    test('should handle multiple sets', () => {
      reactiveMap
        .set('key1', 1)
        .set('key2', 2)
        .set('key3', 3);

      expect(reactiveMap.size).toBe(3);
      expect(reactiveMap.get('key1')).toBe(1);
      expect(reactiveMap.get('key2')).toBe(2);
      expect(reactiveMap.get('key3')).toBe(3);
    });
  });

  describe('has', () => {
    test('should return true for existing key', () => {
      reactiveMap.set('existing', 1);

      expect(reactiveMap.has('existing')).toBe(true);
    });

    test('should return false for non-existing key', () => {
      expect(reactiveMap.has('nonexistent')).toBe(false);
    });

    test('should handle falsy values correctly', () => {
      reactiveMap.set('falsy', 0);

      expect(reactiveMap.has('falsy')).toBe(true);
    });
  });

  describe('delete', () => {
    test('should remove existing key', () => {
      reactiveMap.set('toBeDeleted', 999);

      const result = reactiveMap.delete('toBeDeleted');

      expect(result).toBe(true);
      expect(reactiveMap.has('toBeDeleted')).toBe(false);
      expect(reactiveMap.size).toBe(0);
    });

    test('should return false for non-existing key', () => {
      const result = reactiveMap.delete('nonexistent');

      expect(result).toBe(false);
      expect(reactiveMap.size).toBe(0);
    });

    test('should handle multiple deletions', () => {
      reactiveMap.set('key1', 1).set('key2', 2).set('key3', 3);

      expect(reactiveMap.delete('key2')).toBe(true);
      expect(reactiveMap.size).toBe(2);
      expect(reactiveMap.has('key2')).toBe(false);

      expect(reactiveMap.delete('key1')).toBe(true);
      expect(reactiveMap.size).toBe(1);
      expect(reactiveMap.has('key1')).toBe(false);

      expect(reactiveMap.delete('nonexistent')).toBe(false);
      expect(reactiveMap.size).toBe(1);
    });
  });

  describe('clear', () => {
    test('should remove all entries', () => {
      reactiveMap.set('key1', 1).set('key2', 2).set('key3', 3);

      reactiveMap.clear();

      expect(reactiveMap.size).toBe(0);
      expect(reactiveMap.has('key1')).toBe(false);
      expect(reactiveMap.has('key2')).toBe(false);
      expect(reactiveMap.has('key3')).toBe(false);
    });

    test('should work on empty map', () => {
      reactiveMap.clear();

      expect(reactiveMap.size).toBe(0);
    });

    test('should allow adding after clear', () => {
      reactiveMap.set('key1', 1);
      reactiveMap.clear();
      reactiveMap.set('key2', 2);

      expect(reactiveMap.size).toBe(1);
      expect(reactiveMap.get('key2')).toBe(2);
    });
  });

  describe('size', () => {
    test('should return correct size', () => {
      expect(reactiveMap.size).toBe(0);

      reactiveMap.set('key1', 1);
      expect(reactiveMap.size).toBe(1);

      reactiveMap.set('key2', 2);
      expect(reactiveMap.size).toBe(2);

      reactiveMap.delete('key1');
      expect(reactiveMap.size).toBe(1);

      reactiveMap.clear();
      expect(reactiveMap.size).toBe(0);
    });

    test('should not change when getting non-existent keys', () => {
      expect(reactiveMap.size).toBe(0);
      reactiveMap.get('nonexistent');
      expect(reactiveMap.size).toBe(0);
    });

    test('should not change when checking existence of non-existent keys', () => {
      expect(reactiveMap.size).toBe(0);
      reactiveMap.has('nonexistent');
      expect(reactiveMap.size).toBe(0);
    });
  });

  describe('keys', () => {
    test('should return array of all keys', () => {
      reactiveMap.set('key1', 1).set('key2', 2).set('key3', 3);

      const keys = reactiveMap.keys();

      expect(keys).toEqual(['key1', 'key2', 'key3']);
      expect(keys).toHaveLength(3);
    });

    test('should return empty array for empty map', () => {
      const keys = reactiveMap.keys();

      expect(keys).toEqual([]);
    });

    test('should update after modifications', () => {
      reactiveMap.set('key1', 1).set('key2', 2);
      expect(reactiveMap.keys()).toEqual(['key1', 'key2']);

      reactiveMap.delete('key1');
      expect(reactiveMap.keys()).toEqual(['key2']);

      reactiveMap.set('key3', 3);
      expect(reactiveMap.keys()).toEqual(['key2', 'key3']);
    });

    test('should handle key ordering', () => {
      reactiveMap.set('first', 1);
      reactiveMap.set('second', 2);
      reactiveMap.set('third', 3);

      // Should preserve insertion order
      expect(reactiveMap.keys()).toEqual(['first', 'second', 'third']);
    });
  });

  describe('values', () => {
    test('should return array of all values', () => {
      reactiveMap.set('key1', 10).set('key2', 20).set('key3', 30);

      const values = reactiveMap.values();

      expect(values).toEqual([10, 20, 30]);
      expect(values).toHaveLength(3);
    });

    test('should return empty array for empty map', () => {
      const values = reactiveMap.values();

      expect(values).toEqual([]);
    });

    test('should update after modifications', () => {
      reactiveMap.set('key1', 10).set('key2', 20);
      expect(reactiveMap.values()).toEqual([10, 20]);

      reactiveMap.delete('key1');
      expect(reactiveMap.values()).toEqual([20]);

      reactiveMap.set('key3', 30);
      expect(reactiveMap.values()).toEqual([20, 30]);
    });

    test('should preserve value ordering with key ordering', () => {
      reactiveMap.set('first', 100);
      reactiveMap.set('second', 200);
      reactiveMap.set('third', 300);

      const keys = reactiveMap.keys();
      const values = reactiveMap.values();

      // Values should correspond to keys in the same order
      expect(keys[0]).toBe('first');
      expect(values[0]).toBe(100);
      expect(keys[1]).toBe('second');
      expect(values[1]).toBe(200);
      expect(keys[2]).toBe('third');
      expect(values[2]).toBe(300);
    });
  });

  describe('entries', () => {
    test('should return array of key-value pairs', () => {
      reactiveMap.set('key1', 100).set('key2', 200).set('key3', 300);

      const entries = reactiveMap.entries();

      expect(entries).toEqual([
        ['key1', 100],
        ['key2', 200],
        ['key3', 300],
      ]);
      expect(entries).toHaveLength(3);
    });

    test('should return empty array for empty map', () => {
      const entries = reactiveMap.entries();

      expect(entries).toEqual([]);
    });

    test('should update after modifications', () => {
      reactiveMap.set('key1', 100).set('key2', 200);
      expect(reactiveMap.entries()).toEqual([
        ['key1', 100],
        ['key2', 200],
      ]);

      reactiveMap.delete('key1');
      expect(reactiveMap.entries()).toEqual([['key2', 200]]);

      reactiveMap.set('key3', 300);
      expect(reactiveMap.entries()).toEqual([
        ['key2', 200],
        ['key3', 300],
      ]);
    });

    test('should handle mixed value types', () => {
      reactiveMap.set('str', 'hello');
      reactiveMap.set('num', 42);
      reactiveMap.set('bool', true);
      reactiveMap.set('obj', { a: 1 });

      const entries = reactiveMap.entries();

      expect(entries).toEqual([
        ['str', 'hello'],
        ['num', 42],
        ['bool', true],
        ['obj', { a: 1 }],
      ]);
    });
  });

  describe('forEach', () => {
    test('should iterate over all entries', () => {
      reactiveMap.set('a', 1).set('b', 2).set('c', 3);

      const results: [string, number][] = [];
      reactiveMap.forEach((value, key) => {
        results.push([key, value]);
      });

      expect(results).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ]);
    });

    test('should pass the map as third argument to callback', () => {
      reactiveMap.set('key', 42);

      reactiveMap.forEach((value, key, map) => {
        expect(map).toBe(reactiveMap);
        expect(value).toBe(42);
        expect(key).toBe('key');
      });
    });

    test('should handle empty map', () => {
      const callback = vi.fn();
      reactiveMap.forEach(callback);

      expect(callback).not.toHaveBeenCalled();
    });

    test('should handle callback errors', () => {
      reactiveMap.set('key1', 1).set('key2', 2);

      const callback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      expect(() => reactiveMap.forEach(callback)).toThrow('Callback error');
      expect(callback).toHaveBeenCalledTimes(1); // Stops after first error
    });

    test('should iterate in insertion order', () => {
      reactiveMap.set('first', 1);
      reactiveMap.set('second', 2);
      reactiveMap.set('third', 3);

      const order: string[] = [];
      reactiveMap.forEach((_, key) => {
        order.push(key);
      });

      expect(order).toEqual(['first', 'second', 'third']);
    });
  });

  describe('iteration protocols', () => {
    test('should support for...of iteration', () => {
      reactiveMap.set('a', 1).set('b', 2);

      const entries: [string, number][] = [];
      for (const [key, value] of reactiveMap) {
        entries.push([key, value]);
      }

      expect(entries).toEqual([
        ['a', 1],
        ['b', 2],
      ]);
    });

    test('should support spread operator', () => {
      reactiveMap.set('x', 10).set('y', 20);

      const entries = [...reactiveMap];

      expect(entries).toEqual([
        ['x', 10],
        ['y', 20],
      ]);
    });

    test('should support destructuring', () => {
      reactiveMap.set('first', 1);

      const [[key, value]] = reactiveMap;
      expect(key).toBe('first');
      expect(value).toBe(1);
    });
  });

  describe('edge cases', () => {
    test('should handle very large keys and values', () => {
      const largeKey = 'k'.repeat(10000);
      const largeValue = { data: 'v'.repeat(10000) };
      const map = new ReactiveMap<string, { data: string }>();

      map.set(largeKey, largeValue);

      expect(map.get(largeKey)).toEqual(largeValue);
      expect(map.size).toBe(1);
    });

    test('should handle symbol keys', () => {
      const sym = Symbol('test');
      // @ts-expect-error - Testing with symbol key
      reactiveMap.set(sym, 123);

      // @ts-expect-error - Testing with symbol key
      expect(reactiveMap.get(sym)).toBe(123);
    });

    test('should handle null and undefined keys', () => {
      const map = new ReactiveMap<string | null | undefined, number>();
      map.set(null, 1);
      map.set(undefined, 2);

      expect(map.get(null)).toBe(1);
      expect(map.get(undefined)).toBe(2);
      expect(map.size).toBe(2);
    });

    test('should handle object values', () => {
      const objValue = { nested: { deep: 'value' }, arr: [1, 2, 3] };
      const map = new ReactiveMap<string, typeof objValue>();
      map.set('obj', objValue);

      const retrieved = map.get('obj');
      expect(retrieved).toEqual(objValue);
      expect(retrieved).toBe(objValue); // Objects should be stored by reference
    });

    test('should handle function values', () => {
      const fnValue = () => 'test';
      const map = new ReactiveMap<string, typeof fnValue>();
      map.set('fn', fnValue);

      const retrieved = map.get('fn');
      expect(retrieved).toBe(fnValue); // Functions should be stored by reference
    });
  });
});
