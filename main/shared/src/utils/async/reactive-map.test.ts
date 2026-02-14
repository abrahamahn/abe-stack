// main/shared/src/utils/async/reactive-map.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReactiveMap } from './reactive-map';

describe('ReactiveMap', () => {
  let map: ReactiveMap<string, number>;

  beforeEach(() => {
    map = new ReactiveMap<string, number>();
  });

  describe('Basic Map Operations', () => {
    it('should set and get values', () => {
      map.set('a', 1);
      expect(map.get('a')).toBe(1);
    });

    it('should check if key exists', () => {
      map.set('a', 1);
      expect(map.has('a')).toBe(true);
      expect(map.has('b')).toBe(false);
    });

    it('should delete values', () => {
      map.set('a', 1);
      map.delete('a');
      expect(map.has('a')).toBe(false);
      expect(map.get('a')).toBeUndefined();
    });

    it('should return correct size', () => {
      expect(map.size).toBe(0);
      map.set('a', 1);
      expect(map.size).toBe(1);
      map.set('b', 2);
      expect(map.size).toBe(2);
      map.delete('a');
      expect(map.size).toBe(1);
    });

    it('should get all keys', () => {
      map.set('a', 1);
      map.set('b', 2);
      expect(map.keys()).toEqual(['a', 'b']);
    });

    it('should get all values', () => {
      map.set('a', 1);
      map.set('b', 2);
      expect(map.values()).toEqual([1, 2]);
    });

    it('should get all entries', () => {
      map.set('a', 1);
      map.set('b', 2);
      expect(map.entries()).toEqual([
        ['a', 1],
        ['b', 2],
      ]);
    });

    it('should clear all entries', () => {
      map.set('a', 1);
      map.set('b', 2);
      map.clear();
      expect(map.size).toBe(0);
      expect(map.keys()).toEqual([]);
    });
  });

  describe('Subscriptions', () => {
    it('should notify subscribers on set', () => {
      const listener = vi.fn();
      map.subscribe('a', listener);

      map.set('a', 1);

      expect(listener).toHaveBeenCalledWith(1);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should notify subscribers on delete', () => {
      const listener = vi.fn();
      map.set('a', 1);
      map.subscribe('a', listener);

      map.delete('a');

      expect(listener).toHaveBeenCalledWith(undefined);
    });

    it('should not notify unrelated subscribers', () => {
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      map.subscribe('a', listenerA);
      map.subscribe('b', listenerB);

      map.set('a', 1);

      expect(listenerA).toHaveBeenCalledWith(1);
      expect(listenerB).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers for same key', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      map.subscribe('a', listener1);
      map.subscribe('a', listener2);

      map.set('a', 1);

      expect(listener1).toHaveBeenCalledWith(1);
      expect(listener2).toHaveBeenCalledWith(1);
    });

    it('should unsubscribe correctly', () => {
      const listener = vi.fn();
      const unsubscribe = map.subscribe('a', listener);

      map.set('a', 1);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      map.set('a', 2);
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should clean up listener set when all unsubscribed', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = map.subscribe('a', listener1);
      const unsub2 = map.subscribe('a', listener2);

      expect(map.listenerCount('a')).toBe(2);

      unsub1();
      expect(map.listenerCount('a')).toBe(1);

      unsub2();
      expect(map.listenerCount('a')).toBe(0);
    });
  });

  describe('Atomic Batch Writes', () => {
    it('should apply all writes before notifying', () => {
      const listener = vi.fn();
      map.subscribe('a', listener);
      map.subscribe('b', listener);

      map.write([
        { key: 'a', value: 1 },
        { key: 'b', value: 2 },
      ]);

      // Both values should be set when listeners are called
      expect(map.get('a')).toBe(1);
      expect(map.get('b')).toBe(2);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should handle undefined values as deletes', () => {
      map.set('a', 1);
      map.set('b', 2);

      map.write([
        { key: 'a', value: undefined },
        { key: 'b', value: 3 },
      ]);

      expect(map.has('a')).toBe(false);
      expect(map.get('b')).toBe(3);
    });

    it('should notify for all keys in batch', () => {
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      map.subscribe('a', listenerA);
      map.subscribe('b', listenerB);

      map.write([
        { key: 'a', value: 1 },
        { key: 'b', value: 2 },
      ]);

      expect(listenerA).toHaveBeenCalledWith(1);
      expect(listenerB).toHaveBeenCalledWith(2);
    });
  });

  describe('Clear Operation', () => {
    it('should notify all subscribers on clear', () => {
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      map.set('a', 1);
      map.set('b', 2);

      map.subscribe('a', listenerA);
      map.subscribe('b', listenerB);

      map.clear();

      expect(listenerA).toHaveBeenCalledWith(undefined);
      expect(listenerB).toHaveBeenCalledWith(undefined);
      expect(map.size).toBe(0);
    });
  });

  describe('Listener Counts', () => {
    it('should track listener count per key', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      expect(map.listenerCount('a')).toBe(0);

      map.subscribe('a', fn1);
      expect(map.listenerCount('a')).toBe(1);

      map.subscribe('a', fn2);
      expect(map.listenerCount('a')).toBe(2);
    });

    it('should track total listener count', () => {
      const fn = vi.fn();

      expect(map.totalListenerCount).toBe(0);

      map.subscribe('a', fn);
      expect(map.totalListenerCount).toBe(1);

      map.subscribe('b', fn);
      expect(map.totalListenerCount).toBe(2);

      // Subscribing same function to same key is deduplicated (Set behavior)
      map.subscribe('a', fn);
      expect(map.totalListenerCount).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle subscribing before value exists', () => {
      const listener = vi.fn();
      map.subscribe('a', listener);

      map.set('a', 1);

      expect(listener).toHaveBeenCalledWith(1);
    });

    it('should handle multiple sets to same key', () => {
      const listener = vi.fn();
      map.subscribe('a', listener);

      map.set('a', 1);
      map.set('a', 2);
      map.set('a', 3);

      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener).toHaveBeenNthCalledWith(1, 1);
      expect(listener).toHaveBeenNthCalledWith(2, 2);
      expect(listener).toHaveBeenNthCalledWith(3, 3);
    });

    it('should handle empty batch write', () => {
      const listener = vi.fn();
      map.subscribe('a', listener);

      map.write([]);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle complex value types', () => {
      const complexMap = new ReactiveMap<string, { id: string; data: number[] }>();
      const listener = vi.fn();

      complexMap.subscribe('a', listener);

      const value = { id: '1', data: [1, 2, 3] };
      complexMap.set('a', value);

      expect(listener).toHaveBeenCalledWith(value);
      expect(complexMap.get('a')).toEqual(value);
    });
  });
});
