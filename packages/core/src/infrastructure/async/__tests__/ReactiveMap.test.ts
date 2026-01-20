// packages/core/src/async/__tests__/ReactiveMap.test.ts
import { describe, expect, it, vi } from 'vitest';

import { ReactiveMap } from '../ReactiveMap';

describe('ReactiveMap', () => {
  describe('basic operations', () => {
    it('should get and set values', () => {
      const map = new ReactiveMap<string, number>();

      map.set('a', 1);
      map.set('b', 2);

      expect(map.get('a')).toBe(1);
      expect(map.get('b')).toBe(2);
      expect(map.get('c')).toBeUndefined();
    });

    it('should check if key exists', () => {
      const map = new ReactiveMap<string, number>();

      map.set('a', 1);

      expect(map.has('a')).toBe(true);
      expect(map.has('b')).toBe(false);
    });

    it('should delete values', () => {
      const map = new ReactiveMap<string, number>();

      map.set('a', 1);
      expect(map.has('a')).toBe(true);

      map.delete('a');
      expect(map.has('a')).toBe(false);
      expect(map.get('a')).toBeUndefined();
    });

    it('should clear all values', () => {
      const map = new ReactiveMap<string, number>();

      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      map.clear();

      expect(map.size).toBe(0);
      expect(map.has('a')).toBe(false);
      expect(map.has('b')).toBe(false);
      expect(map.has('c')).toBe(false);
    });
  });

  describe('iteration', () => {
    it('should return all keys', () => {
      const map = new ReactiveMap<string, number>();

      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      expect(map.keys()).toEqual(['a', 'b', 'c']);
    });

    it('should return all values', () => {
      const map = new ReactiveMap<string, number>();

      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      expect(map.values()).toEqual([1, 2, 3]);
    });

    it('should return all entries', () => {
      const map = new ReactiveMap<string, number>();

      map.set('a', 1);
      map.set('b', 2);

      expect(map.entries()).toEqual([
        ['a', 1],
        ['b', 2],
      ]);
    });

    it('should track size', () => {
      const map = new ReactiveMap<string, number>();

      expect(map.size).toBe(0);

      map.set('a', 1);
      expect(map.size).toBe(1);

      map.set('b', 2);
      expect(map.size).toBe(2);

      map.delete('a');
      expect(map.size).toBe(1);
    });
  });

  describe('subscriptions', () => {
    it('should notify subscribers on set', () => {
      const map = new ReactiveMap<string, number>();
      const listener = vi.fn();

      map.subscribe('a', listener);
      map.set('a', 42);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(42);
    });

    it('should notify subscribers on delete', () => {
      const map = new ReactiveMap<string, number>();
      const listener = vi.fn();

      map.set('a', 1);
      map.subscribe('a', listener);
      map.delete('a');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(undefined);
    });

    it('should notify subscribers on clear', () => {
      const map = new ReactiveMap<string, number>();
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      map.set('a', 1);
      map.set('b', 2);

      map.subscribe('a', listenerA);
      map.subscribe('b', listenerB);

      map.clear();

      expect(listenerA).toHaveBeenCalledWith(undefined);
      expect(listenerB).toHaveBeenCalledWith(undefined);
    });

    it('should support multiple subscribers per key', () => {
      const map = new ReactiveMap<string, number>();
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      map.subscribe('a', listener1);
      map.subscribe('a', listener2);
      map.subscribe('a', listener3);

      map.set('a', 100);

      expect(listener1).toHaveBeenCalledWith(100);
      expect(listener2).toHaveBeenCalledWith(100);
      expect(listener3).toHaveBeenCalledWith(100);
    });

    it('should not notify unsubscribed listeners', () => {
      const map = new ReactiveMap<string, number>();
      const listener = vi.fn();

      const unsubscribe = map.subscribe('a', listener);
      unsubscribe();

      map.set('a', 42);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should only unsubscribe the specific listener', () => {
      const map = new ReactiveMap<string, number>();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = map.subscribe('a', listener1);
      map.subscribe('a', listener2);

      unsubscribe1();

      map.set('a', 42);

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith(42);
    });

    it('should not notify listeners for different keys', () => {
      const map = new ReactiveMap<string, number>();
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      map.subscribe('a', listenerA);
      map.subscribe('b', listenerB);

      map.set('a', 1);

      expect(listenerA).toHaveBeenCalledWith(1);
      expect(listenerB).not.toHaveBeenCalled();
    });
  });

  describe('batch writes', () => {
    it('should apply all writes before notifying', () => {
      const map = new ReactiveMap<string, number>();
      const results: Array<{ key: string; value: number | undefined }> = [];

      map.subscribe('a', (v) => results.push({ key: 'a', value: v }));
      map.subscribe('b', (v) => results.push({ key: 'b', value: v }));

      // In write callback, both values should already be set
      map.subscribe('a', () => {
        results.push({ key: 'check-b-during-a', value: map.get('b') });
      });

      map.write([
        { key: 'a', value: 1 },
        { key: 'b', value: 2 },
      ]);

      // Both values should be set before any notification
      expect(results).toContainEqual({ key: 'check-b-during-a', value: 2 });
    });

    it('should delete with undefined value in batch', () => {
      const map = new ReactiveMap<string, number>();
      const listener = vi.fn();

      map.set('a', 1);
      map.subscribe('a', listener);

      map.write([{ key: 'a', value: undefined }]);

      expect(map.has('a')).toBe(false);
      expect(listener).toHaveBeenCalledWith(undefined);
    });

    it('should handle mixed writes and deletes', () => {
      const map = new ReactiveMap<string, number>();

      map.set('a', 1);
      map.set('b', 2);

      map.write([
        { key: 'a', value: undefined }, // delete
        { key: 'b', value: 20 }, // update
        { key: 'c', value: 3 }, // insert
      ]);

      expect(map.has('a')).toBe(false);
      expect(map.get('b')).toBe(20);
      expect(map.get('c')).toBe(3);
    });
  });

  describe('listener tracking', () => {
    it('should track listener count per key', () => {
      const map = new ReactiveMap<string, number>();

      expect(map.listenerCount('a')).toBe(0);

      const unsub1 = map.subscribe('a', () => {});
      expect(map.listenerCount('a')).toBe(1);

      const unsub2 = map.subscribe('a', () => {});
      expect(map.listenerCount('a')).toBe(2);

      unsub1();
      expect(map.listenerCount('a')).toBe(1);

      unsub2();
      expect(map.listenerCount('a')).toBe(0);
    });

    it('should track total listener count', () => {
      const map = new ReactiveMap<string, number>();

      expect(map.totalListenerCount).toBe(0);

      const unsub1 = map.subscribe('a', () => {});
      const unsub2 = map.subscribe('b', () => {});
      const unsub3 = map.subscribe('a', () => {});

      expect(map.totalListenerCount).toBe(3);

      unsub1();
      expect(map.totalListenerCount).toBe(2);

      unsub2();
      unsub3();
      expect(map.totalListenerCount).toBe(0);
    });
  });

  describe('type safety', () => {
    it('should work with complex types', () => {
      interface User {
        id: string;
        name: string;
        email: string;
      }

      const map = new ReactiveMap<string, User>();
      const user: User = { id: '1', name: 'John', email: 'john@example.com' };

      map.set('user-1', user);

      const retrieved = map.get('user-1');
      expect(retrieved?.id).toBe('1');
      expect(retrieved?.name).toBe('John');
    });

    it('should work with numeric keys', () => {
      const map = new ReactiveMap<number, string>();

      map.set(1, 'one');
      map.set(2, 'two');

      expect(map.get(1)).toBe('one');
      expect(map.get(2)).toBe('two');
    });
  });

  describe('memory leak prevention', () => {
    it('should clean up listener Set when last listener unsubscribes', () => {
      const map = new ReactiveMap<string, number>();

      const unsub1 = map.subscribe('a', () => {});
      const unsub2 = map.subscribe('a', () => {});

      expect(map.listenerCount('a')).toBe(2);

      unsub1();
      expect(map.listenerCount('a')).toBe(1);

      unsub2();
      // After all listeners removed, the internal Set should be deleted
      expect(map.listenerCount('a')).toBe(0);
      expect(map.totalListenerCount).toBe(0);
    });

    it('should not leak memory during rapid subscribe/unsubscribe cycles', () => {
      const map = new ReactiveMap<string, number>();

      // Simulate rapid subscription cycling (e.g., React component mounts/unmounts)
      for (let i = 0; i < 1000; i++) {
        const unsub = map.subscribe('key', () => {});
        unsub();
      }

      expect(map.listenerCount('key')).toBe(0);
      expect(map.totalListenerCount).toBe(0);
    });

    it('should handle subscriptions to keys that are later deleted', () => {
      const map = new ReactiveMap<string, number>();
      const listener = vi.fn();

      map.set('a', 1);
      const unsub = map.subscribe('a', listener);

      // Delete the data
      map.delete('a');
      expect(listener).toHaveBeenCalledWith(undefined);

      // Listener is still attached even though data is gone
      expect(map.listenerCount('a')).toBe(1);

      // Unsubscribing should clean up properly
      unsub();
      expect(map.listenerCount('a')).toBe(0);
    });

    it('should handle subscriptions to non-existent keys', () => {
      const map = new ReactiveMap<string, number>();
      const listener = vi.fn();

      // Subscribe to key before it exists
      const unsub = map.subscribe('future-key', listener);
      expect(map.listenerCount('future-key')).toBe(1);

      // Set the value - should notify
      map.set('future-key', 42);
      expect(listener).toHaveBeenCalledWith(42);

      // Unsubscribe and verify cleanup
      unsub();
      expect(map.listenerCount('future-key')).toBe(0);
    });

    it('should not accumulate listeners across many keys', () => {
      const map = new ReactiveMap<string, number>();
      const unsubscribers: Array<() => void> = [];

      // Subscribe to many different keys
      for (let i = 0; i < 100; i++) {
        unsubscribers.push(map.subscribe(`key-${i}`, () => {}));
      }

      expect(map.totalListenerCount).toBe(100);

      // Unsubscribe from all
      for (const unsub of unsubscribers) {
        unsub();
      }

      expect(map.totalListenerCount).toBe(0);
    });

    it('should handle interleaved subscribe/unsubscribe on multiple keys', () => {
      const map = new ReactiveMap<string, number>();

      const unsub1 = map.subscribe('a', () => {});
      const unsub2 = map.subscribe('b', () => {});
      const unsub3 = map.subscribe('a', () => {});
      const unsub4 = map.subscribe('c', () => {});

      expect(map.totalListenerCount).toBe(4);
      expect(map.listenerCount('a')).toBe(2);
      expect(map.listenerCount('b')).toBe(1);
      expect(map.listenerCount('c')).toBe(1);

      // Unsubscribe in different order than subscribed
      unsub2();
      expect(map.totalListenerCount).toBe(3);
      expect(map.listenerCount('b')).toBe(0);

      unsub1();
      expect(map.totalListenerCount).toBe(2);
      expect(map.listenerCount('a')).toBe(1);

      unsub4();
      unsub3();
      expect(map.totalListenerCount).toBe(0);
    });

    it('should handle clear() with active listeners without memory leak', () => {
      const map = new ReactiveMap<string, number>();
      const listeners = [vi.fn(), vi.fn(), vi.fn()];
      const unsubscribers: Array<() => void> = [];

      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      unsubscribers.push(map.subscribe('a', listeners[0]));
      unsubscribers.push(map.subscribe('b', listeners[1]));
      unsubscribers.push(map.subscribe('c', listeners[2]));

      // Clear all data
      map.clear();

      // All listeners should have been notified
      expect(listeners[0]).toHaveBeenCalledWith(undefined);
      expect(listeners[1]).toHaveBeenCalledWith(undefined);
      expect(listeners[2]).toHaveBeenCalledWith(undefined);

      // Data should be cleared
      expect(map.size).toBe(0);

      // Listeners should still be active (clear doesn't unsubscribe)
      expect(map.totalListenerCount).toBe(3);

      // Manual unsubscribe should clean up
      for (const unsub of unsubscribers) {
        unsub();
      }
      expect(map.totalListenerCount).toBe(0);
    });

    it('should handle double unsubscribe gracefully', () => {
      const map = new ReactiveMap<string, number>();

      const unsub = map.subscribe('a', () => {});
      expect(map.listenerCount('a')).toBe(1);

      unsub();
      expect(map.listenerCount('a')).toBe(0);

      // Double unsubscribe should not throw or cause issues
      unsub();
      expect(map.listenerCount('a')).toBe(0);
      expect(map.totalListenerCount).toBe(0);
    });
  });
});
