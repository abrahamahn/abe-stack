// main/shared/src/system/jobs/reactive.map.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReactiveMap } from './reactive.map';

// ============================================================================
// Basic CRUD
// ============================================================================

describe('ReactiveMap — basic CRUD', () => {
  let map: ReactiveMap<string, number>;

  beforeEach(() => {
    map = new ReactiveMap<string, number>();
  });

  it('returns undefined for a key that has never been set', () => {
    expect(map.get('missing')).toBeUndefined();
  });

  it('has returns false for a key that has never been set', () => {
    expect(map.has('missing')).toBe(false);
  });

  it('stores and retrieves a value', () => {
    map.set('a', 1);
    expect(map.get('a')).toBe(1);
    expect(map.has('a')).toBe(true);
  });

  it('overwrites an existing value', () => {
    map.set('a', 1);
    map.set('a', 99);
    expect(map.get('a')).toBe(99);
  });

  it('delete removes a key', () => {
    map.set('a', 1);
    map.delete('a');
    expect(map.get('a')).toBeUndefined();
    expect(map.has('a')).toBe(false);
  });

  it('delete on a non-existent key is a no-op', () => {
    expect(() => map.delete('ghost')).not.toThrow();
    expect(map.size).toBe(0);
  });

  it('size reflects the number of stored entries', () => {
    expect(map.size).toBe(0);
    map.set('a', 1);
    expect(map.size).toBe(1);
    map.set('b', 2);
    expect(map.size).toBe(2);
    map.delete('a');
    expect(map.size).toBe(1);
  });

  it('keys returns all current keys', () => {
    map.set('x', 10);
    map.set('y', 20);
    expect(map.keys().sort()).toEqual(['x', 'y']);
  });

  it('keys returns an empty array when map is empty', () => {
    expect(map.keys()).toEqual([]);
  });

  it('values returns all current values', () => {
    map.set('x', 10);
    map.set('y', 20);
    expect(map.values().sort((a, b) => a - b)).toEqual([10, 20]);
  });

  it('values returns an empty array when map is empty', () => {
    expect(map.values()).toEqual([]);
  });

  it('entries returns all current key-value pairs', () => {
    map.set('x', 10);
    map.set('y', 20);
    const sorted = map.entries().sort(([a], [b]) => a.localeCompare(b));
    expect(sorted).toEqual([
      ['x', 10],
      ['y', 20],
    ]);
  });

  it('entries returns an empty array when map is empty', () => {
    expect(map.entries()).toEqual([]);
  });
});

// ============================================================================
// subscribe — basic notification
// ============================================================================

describe('ReactiveMap — subscribe', () => {
  let map: ReactiveMap<string, number>;

  beforeEach(() => {
    map = new ReactiveMap<string, number>();
  });

  it('listener is called with the new value when set is used', () => {
    const fn = vi.fn();
    map.subscribe('a', fn);
    map.set('a', 42);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith(42);
  });

  it('listener is called with undefined when delete is used', () => {
    const fn = vi.fn();
    map.set('a', 1);
    map.subscribe('a', fn);
    map.delete('a');
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith(undefined);
  });

  it('listener is NOT called for writes to a different key', () => {
    const fn = vi.fn();
    map.subscribe('a', fn);
    map.set('b', 99);
    expect(fn).not.toHaveBeenCalled();
  });

  it('listener is NOT called immediately on subscribe (no current-value emit)', () => {
    const fn = vi.fn();
    map.set('a', 1);
    map.subscribe('a', fn);
    expect(fn).not.toHaveBeenCalled();
  });

  it('multiple listeners on the same key are all notified', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const fn3 = vi.fn();
    map.subscribe('a', fn1);
    map.subscribe('a', fn2);
    map.subscribe('a', fn3);
    map.set('a', 7);
    expect(fn1).toHaveBeenCalledWith(7);
    expect(fn2).toHaveBeenCalledWith(7);
    expect(fn3).toHaveBeenCalledWith(7);
  });

  it('listener receives updated value on each successive write', () => {
    const received: number[] = [];
    map.subscribe('a', (v) => received.push(v as number));
    map.set('a', 1);
    map.set('a', 2);
    map.set('a', 3);
    expect(received).toEqual([1, 2, 3]);
  });
});

// ============================================================================
// unsubscribe
// ============================================================================

describe('ReactiveMap — unsubscribe', () => {
  let map: ReactiveMap<string, number>;

  beforeEach(() => {
    map = new ReactiveMap<string, number>();
  });

  it('unsubscribe stops the listener from receiving future notifications', () => {
    const fn = vi.fn();
    const unsub = map.subscribe('a', fn);
    map.set('a', 1);
    unsub();
    map.set('a', 2);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('unsubscribe is idempotent — calling it twice does not throw', () => {
    const fn = vi.fn();
    const unsub = map.subscribe('a', fn);
    unsub();
    expect(() => unsub()).not.toThrow();
  });

  it('calling unsubscribe twice does not corrupt the listener set for other listeners', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const unsub1 = map.subscribe('a', fn1);
    map.subscribe('a', fn2);
    unsub1();
    unsub1(); // idempotent second call
    map.set('a', 5);
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledWith(5);
  });

  it('unsubscribing the last listener removes the key from the internal listeners Map', () => {
    const unsub = map.subscribe('a', vi.fn());
    expect(map.listenerCount('a')).toBe(1);
    unsub();
    // The internal listeners entry should be gone — confirmed by listenerCount returning 0
    expect(map.listenerCount('a')).toBe(0);
    // totalListenerCount also reflects the cleanup
    expect(map.totalListenerCount).toBe(0);
  });

  it('unsubscribing one of two listeners leaves the other active', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const unsub1 = map.subscribe('a', fn1);
    map.subscribe('a', fn2);
    unsub1();
    map.set('a', 10);
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledWith(10);
    expect(map.listenerCount('a')).toBe(1);
  });

  it('unsubscribing all listeners of a key while leaving listeners on other keys intact', () => {
    const fnA = vi.fn();
    const fnB = vi.fn();
    const unsubA = map.subscribe('a', fnA);
    map.subscribe('b', fnB);
    unsubA();
    map.set('a', 1);
    map.set('b', 2);
    expect(fnA).not.toHaveBeenCalled();
    expect(fnB).toHaveBeenCalledWith(2);
    expect(map.listenerCount('a')).toBe(0);
    expect(map.listenerCount('b')).toBe(1);
  });
});

// ============================================================================
// write — atomicity
// ============================================================================

describe('ReactiveMap — write atomicity', () => {
  it('all writes are applied before any listener fires', () => {
    const map = new ReactiveMap<string, number>();
    const observedA: Array<number | undefined> = [];
    const observedB: Array<number | undefined> = [];

    // Inside the listener for 'a', read 'b' — it must already be updated
    map.subscribe('a', () => {
      observedA.push(map.get('a'));
      observedB.push(map.get('b'));
    });
    // Inside the listener for 'b', read 'a' — it must already be updated
    map.subscribe('b', () => {
      observedA.push(map.get('a'));
      observedB.push(map.get('b'));
    });

    map.write([
      { key: 'a', value: 10 },
      { key: 'b', value: 20 },
    ]);

    // Each listener was called once
    expect(observedA).toEqual([10, 10]); // both 'a' and 'b' listeners see a=10
    expect(observedB).toEqual([20, 20]); // both 'a' and 'b' listeners see b=20
  });

  it('a listener can read the state of any key that was co-written in the same batch', () => {
    const map = new ReactiveMap<string, string>();
    let seenDuring = '';

    map.subscribe('first', () => {
      seenDuring = map.get('second') ?? 'NOT_YET';
    });

    map.write([
      { key: 'first', value: 'A' },
      { key: 'second', value: 'B' },
    ]);

    expect(seenDuring).toBe('B');
  });

  it('a delete in a batch is visible to listeners for other keys in the same batch', () => {
    const map = new ReactiveMap<string, number>();
    map.set('victim', 99);
    let victimSeenFromListener: number | undefined = 999;

    map.subscribe('trigger', () => {
      victimSeenFromListener = map.get('victim');
    });

    map.write([
      { key: 'victim', value: undefined },
      { key: 'trigger', value: 1 },
    ]);

    expect(victimSeenFromListener).toBeUndefined();
  });
});

// ============================================================================
// write — error isolation
// ============================================================================

describe('ReactiveMap — write error isolation', () => {
  it('a throwing listener does not prevent subsequent listeners from being called', () => {
    const map = new ReactiveMap<string, number>();
    const fn2 = vi.fn();

    map.subscribe('a', () => {
      throw new Error('listener exploded');
    });
    map.subscribe('a', fn2);

    expect(() => map.set('a', 1)).not.toThrow();
    expect(fn2).toHaveBeenCalledWith(1);
  });

  it('a throwing listener does not corrupt the data store', () => {
    const map = new ReactiveMap<string, number>();

    map.subscribe('a', () => {
      throw new Error('boom');
    });

    map.set('a', 42);
    expect(map.get('a')).toBe(42);
  });

  it('multiple throwing listeners still allow non-throwing listeners to run', () => {
    const map = new ReactiveMap<string, number>();
    const survivor = vi.fn();

    map.subscribe('a', () => {
      throw new Error('one');
    });
    map.subscribe('a', () => {
      throw new Error('two');
    });
    map.subscribe('a', survivor);

    map.set('a', 7);
    expect(survivor).toHaveBeenCalledWith(7);
  });

  it('a throwing listener on key A does not affect listeners on key B in the same write batch', () => {
    const map = new ReactiveMap<string, number>();
    const fnB = vi.fn();

    map.subscribe('a', () => {
      throw new Error('key A exploded');
    });
    map.subscribe('b', fnB);

    map.write([
      { key: 'a', value: 1 },
      { key: 'b', value: 2 },
    ]);

    expect(fnB).toHaveBeenCalledWith(2);
  });
});

// ============================================================================
// clear
// ============================================================================

describe('ReactiveMap — clear', () => {
  let map: ReactiveMap<string, number>;

  beforeEach(() => {
    map = new ReactiveMap<string, number>();
  });

  it('removes all entries', () => {
    map.set('a', 1);
    map.set('b', 2);
    map.clear();
    expect(map.size).toBe(0);
    expect(map.keys()).toEqual([]);
  });

  it('notifies listeners for each cleared key with undefined', () => {
    const fnA = vi.fn();
    const fnB = vi.fn();
    map.set('a', 1);
    map.set('b', 2);
    map.subscribe('a', fnA);
    map.subscribe('b', fnB);
    map.clear();
    expect(fnA).toHaveBeenCalledWith(undefined);
    expect(fnB).toHaveBeenCalledWith(undefined);
  });

  it('does not notify listeners for keys not in the map at clear time', () => {
    const fn = vi.fn();
    map.subscribe('a', fn); // 'a' was never set
    map.set('b', 2);
    map.clear();
    expect(fn).not.toHaveBeenCalled();
  });

  it('clear on an empty map is a no-op and does not throw', () => {
    expect(() => map.clear()).not.toThrow();
    expect(map.size).toBe(0);
  });

  it('map is usable after clear', () => {
    map.set('a', 1);
    map.clear();
    map.set('a', 2);
    expect(map.get('a')).toBe(2);
    expect(map.size).toBe(1);
  });

  it('clear notifies all keys atomically — each listener sees fully-cleared state', () => {
    map.set('a', 1);
    map.set('b', 2);
    let aSeenDuringB: number | undefined = 999;

    map.subscribe('b', () => {
      aSeenDuringB = map.get('a');
    });

    map.clear();
    expect(aSeenDuringB).toBeUndefined();
  });
});

// ============================================================================
// listenerCount / totalListenerCount
// ============================================================================

describe('ReactiveMap — listener counts', () => {
  let map: ReactiveMap<string, number>;

  beforeEach(() => {
    map = new ReactiveMap<string, number>();
  });

  it('listenerCount returns 0 for a key with no subscribers', () => {
    expect(map.listenerCount('x')).toBe(0);
  });

  it('listenerCount increments for each subscriber on the same key', () => {
    map.subscribe('x', vi.fn());
    expect(map.listenerCount('x')).toBe(1);
    map.subscribe('x', vi.fn());
    expect(map.listenerCount('x')).toBe(2);
  });

  it('listenerCount decrements after unsubscribe', () => {
    const unsub = map.subscribe('x', vi.fn());
    map.subscribe('x', vi.fn());
    unsub();
    expect(map.listenerCount('x')).toBe(1);
  });

  it('listenerCount returns 0 after all subscribers for a key unsubscribe', () => {
    const unsub1 = map.subscribe('x', vi.fn());
    const unsub2 = map.subscribe('x', vi.fn());
    unsub1();
    unsub2();
    expect(map.listenerCount('x')).toBe(0);
  });

  it('totalListenerCount sums listeners across all keys', () => {
    map.subscribe('a', vi.fn());
    map.subscribe('a', vi.fn());
    map.subscribe('b', vi.fn());
    expect(map.totalListenerCount).toBe(3);
  });

  it('totalListenerCount is 0 when no subscribers exist', () => {
    expect(map.totalListenerCount).toBe(0);
  });

  it('totalListenerCount decreases when listeners are removed', () => {
    const unsub = map.subscribe('a', vi.fn());
    map.subscribe('b', vi.fn());
    expect(map.totalListenerCount).toBe(2);
    unsub();
    expect(map.totalListenerCount).toBe(1);
  });

  it('listenerCount for key A is unaffected by unsubscribing from key B', () => {
    map.subscribe('a', vi.fn());
    const unsubB = map.subscribe('b', vi.fn());
    unsubB();
    expect(map.listenerCount('a')).toBe(1);
    expect(map.listenerCount('b')).toBe(0);
  });
});

// ============================================================================
// write — edge cases
// ============================================================================

describe('ReactiveMap — write edge cases', () => {
  it('write with an empty array is a no-op', () => {
    const map = new ReactiveMap<string, number>();
    const fn = vi.fn();
    map.subscribe('a', fn);
    map.write([]);
    expect(map.size).toBe(0);
    expect(fn).not.toHaveBeenCalled();
  });

  it('write with value undefined deletes the key', () => {
    const map = new ReactiveMap<string, number>();
    map.set('a', 5);
    map.write([{ key: 'a', value: undefined }]);
    expect(map.has('a')).toBe(false);
    expect(map.get('a')).toBeUndefined();
  });

  it('write with duplicate keys — last write wins and listener fires for each occurrence', () => {
    const map = new ReactiveMap<string, number>();
    const received: Array<number | undefined> = [];
    map.subscribe('a', (v) => received.push(v));

    // Both entries target the same key; the first write sets 1, the second sets 2
    // Then listeners fire: first entry's listener sees whatever value the listener
    // gets passed (1), second entry's listener gets 2.
    map.write([
      { key: 'a', value: 1 },
      { key: 'a', value: 2 },
    ]);

    // After all writes: final value is 2 (second write wins)
    expect(map.get('a')).toBe(2);
    // Listener was notified twice (once per entry in the batch)
    expect(received).toEqual([1, 2]);
  });

  it('deleting a key that was just written in the same batch removes it and notifies with undefined', () => {
    const map = new ReactiveMap<string, number>();
    const fn = vi.fn();
    map.subscribe('a', fn);

    map.write([
      { key: 'a', value: 10 },
      { key: 'a', value: undefined },
    ]);

    expect(map.has('a')).toBe(false);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 10);
    expect(fn).toHaveBeenNthCalledWith(2, undefined);
  });
});

// ============================================================================
// Generic types
// ============================================================================

describe('ReactiveMap — generic types', () => {
  it('works with numeric keys', () => {
    const map = new ReactiveMap<number, string>();
    map.set(1, 'one');
    map.set(2, 'two');
    expect(map.get(1)).toBe('one');
    expect(map.get(2)).toBe('two');
    expect(map.size).toBe(2);
  });

  it('works with object values', () => {
    type User = { id: number; name: string };
    const map = new ReactiveMap<string, User>();
    const user: User = { id: 1, name: 'Alice' };
    map.set('alice', user);
    expect(map.get('alice')).toEqual({ id: 1, name: 'Alice' });
  });

  it('notifies with correct typed value for object values', () => {
    type Payload = { count: number };
    const map = new ReactiveMap<string, Payload>();
    const fn = vi.fn();
    map.subscribe('key', fn);
    map.set('key', { count: 42 });
    expect(fn).toHaveBeenCalledWith({ count: 42 });
  });

  it('subscribe to a key that has never been written — listener fires on first write', () => {
    const map = new ReactiveMap<string, number>();
    const fn = vi.fn();
    map.subscribe('never-set-before', fn);
    map.set('never-set-before', 100);
    expect(fn).toHaveBeenCalledWith(100);
  });

  it('uses default generic types (string key, unknown value)', () => {
    const map = new ReactiveMap();
    map.set('foo', 123);
    expect(map.get('foo')).toBe(123);
    map.set('bar', { nested: true });
    expect(map.get('bar')).toEqual({ nested: true });
  });
});

// ============================================================================
// Interaction: subscribe → write → unsubscribe → write
// ============================================================================

describe('ReactiveMap — subscriber lifecycle', () => {
  it('subscriber added after initial write only receives subsequent writes', () => {
    const map = new ReactiveMap<string, number>();
    map.set('a', 1); // written before subscribe
    const fn = vi.fn();
    map.subscribe('a', fn);
    map.set('a', 2);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2);
  });

  it('re-subscribing to a key after unsubscribe works correctly', () => {
    const map = new ReactiveMap<string, number>();
    const fn = vi.fn();
    const unsub = map.subscribe('a', fn);
    map.set('a', 1);
    unsub();
    map.set('a', 2); // should NOT reach fn

    const fn2 = vi.fn();
    map.subscribe('a', fn2);
    map.set('a', 3);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledWith(3);
  });

  it('subscribing with the same function reference adds it only once to the Set', () => {
    // JavaScript Set deduplicates by reference — subscribing the same fn twice
    // should result in only one notification per write.
    const map = new ReactiveMap<string, number>();
    const fn = vi.fn();
    map.subscribe('a', fn);
    map.subscribe('a', fn); // same reference
    map.set('a', 5);
    // Set semantics: fn is stored once, called once
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
